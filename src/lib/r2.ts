import 'server-only';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const r2Bucket = process.env.R2_BUCKET_NAME || '';
export const r2PublicDomain = (process.env.R2_PUBLIC_DOMAIN || '').replace(/\/$/, '');

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID || ''}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export function articleCoverKey(url: string): string | null {
  if (!r2PublicDomain || !url.startsWith(`${r2PublicDomain}/article/`)) return null;
  const key = url.slice(r2PublicDomain.length + 1);
  return /^article\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.webp$/.test(key) ? key : null;
}

export async function verifyArticleCover(url: string): Promise<boolean> {
  const key = articleCoverKey(url);
  if (!key || !r2Bucket) return false;
  try {
    const object = await r2Client.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
    return object.ContentType === 'image/webp' && !!object.ContentLength && object.ContentLength <= 600_000;
  } catch {
    return false;
  }
}
