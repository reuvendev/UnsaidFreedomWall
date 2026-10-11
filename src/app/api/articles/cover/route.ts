import { randomUUID, createHash } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Timestamp } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/app/admin/actions';
import { adminDb } from '@/lib/team/firebase-admin';
import { r2Bucket, r2Client, r2PublicDomain } from '@/lib/r2';
import { InvalidArticleCover, MAX_ARTICLE_COVER_BYTES, optimizeArticleCover } from '@/lib/article-cover-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60_000;

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function allowUpload(session: string): Promise<boolean> {
  const id = createHash('sha256').update(session).digest('hex');
  const ref = adminDb().collection('rate_limits').doc(`article-cover-${id}`);
  return adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = Date.now();
    const started = snapshot.data()?.windowStartedAt?.toMillis?.() ?? 0;
    const active = now - started < WINDOW_MS;
    const attempts = active ? Number(snapshot.data()?.attempts) || 0 : 0;
    if (attempts >= 10) return false;
    transaction.set(ref, {
      attempts: attempts + 1,
      windowStartedAt: Timestamp.fromMillis(active ? started : now),
      expiresAt: Timestamp.fromMillis(now + WINDOW_MS),
    });
    return true;
  });
}

export async function POST(request: Request) {
  if (!(await checkAdminAuth())) return failure('Admin sign-in required.', 401);
  if (!r2Bucket || !r2PublicDomain || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return failure('Article image storage is not configured.', 503);
  }
  if (new URL(r2PublicDomain).protocol !== 'https:') return failure('Article image delivery must use HTTPS.', 503);

  const length = Number(request.headers.get('content-length'));
  if (length > 900_000) return failure('Compressed cover exceeds the upload limit.', 413);

  try {
    const form = await request.formData();
    const file = form.get('cover');
    if (!(file instanceof Blob) || file.type !== 'image/webp' || file.size < 32 || file.size > MAX_ARTICLE_COVER_BYTES) {
      return failure('Upload a compressed WebP cover smaller than 600 KB.', 400);
    }
    const session = cookies().get('unsaid_admin_session')?.value || '';
    if (!session || !(await allowUpload(session))) return failure('Upload limit reached. Try again later.', 429);

    const bytes = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeArticleCover(bytes);

    const now = new Date();
    const key = `article/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.webp`;
    await r2Client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: optimized,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return NextResponse.json({ url: `${r2PublicDomain}/${key}` });
  } catch (error) {
    if (error instanceof InvalidArticleCover) return failure(error.message, 400);
    console.error('Article cover upload failed:', error);
    return failure('Could not upload the cover image. Try again.', 500);
  }
}
