'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { checkForDoxxing } from '@/lib/antiDoxx';
import { censorText } from '@/lib/moderation';
import { adminDb } from '@/lib/team/firebase-admin';
import { getServerTeamSession } from '@/lib/team/team-server';

const WALL_CATEGORY_IDS = new Set(['thoughts', 'love', 'rants', 'advice', 'others']);

function requiredContent(value: unknown, maxLength: number) {
  const content = String(value || '').trim();
  if (!content || content.length > maxLength) throw new Error(`Content must be between 1 and ${maxLength} characters.`);
  const doxxing = checkForDoxxing(content);
  if (doxxing.hasPotentialDoxx) throw new Error('Remove personal information before publishing.');
  return censorText(content);
}

export async function getCurrentTeamIdentity() {
  const session = await getServerTeamSession();
  return session ? { displayName: session.displayName, role: session.role } : null;
}

export async function createOfficialTeamPost(input: {
  content: string;
  category: string;
  cardTheme?: { background: string; border: string };
  spotifyTrackId?: string;
  imageUrl?: string;
}) {
  const session = await getServerTeamSession();
  if (!session) return { success: false, error: 'Sign in to your Team account again.' };
  try {
    const content = requiredContent(input.content, 5000);
    if (!WALL_CATEGORY_IDS.has(input.category)) return { success: false, error: 'Invalid post category.' };
    const post = {
      content,
      category: input.category,
      authorAlias: session.displayName,
      teamAuthorId: session.uid,
      isStaffPost: true,
      staffRole: session.role,
      cardTheme: input.cardTheme || { background: 'default', border: 'solid' },
      upvotes: 0,
      replies: 0,
      status: 'approved',
      createdAt: FieldValue.serverTimestamp(),
      ...(input.spotifyTrackId ? { spotifyTrackId: input.spotifyTrackId } : {}),
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    };
    const db = adminDb();
    const ref = db.collection('posts').doc();
    const auditRef = db.collection('teamAuditLogs').doc();
    const batch = db.batch();
    batch.create(ref, post);
    batch.create(auditRef, {
      action: 'official_post_created', actorUid: session.uid, actorDisplayName: session.displayName,
      targetId: ref.id, createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { success: true, postId: ref.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not publish the official post.' };
  }
}

export async function createOfficialTeamReply(input: {
  postId: string;
  content: string;
  imageUrl?: string;
  parentReplyId?: string;
}) {
  const session = await getServerTeamSession();
  if (!session) return { success: false, error: 'Sign in to your Team account again.' };
  try {
    const content = requiredContent(input.content, 300);
    const postRef = adminDb().collection('posts').doc(input.postId);
    const replyRef = postRef.collection('replies').doc();
    const auditRef = adminDb().collection('teamAuditLogs').doc();
    await adminDb().runTransaction(async (transaction) => {
      const parentRef = input.parentReplyId ? postRef.collection('replies').doc(input.parentReplyId) : null;
      const [postSnapshot, parentSnapshot] = await Promise.all([
        transaction.get(postRef),
        parentRef ? transaction.get(parentRef) : Promise.resolve(null),
      ]);
      if (!postSnapshot.exists) throw new Error('Post not found. Verify that the Firebase Admin service account uses the same project as the public Firebase configuration.');
      const postStatus = postSnapshot.data()?.status;
      if (postStatus !== 'approved' && postStatus !== 'active') throw new Error('This post is not publicly available.');
      if (parentRef && !parentSnapshot?.exists) throw new Error('The reply you are responding to no longer exists.');
      const parent = parentSnapshot?.data();
      const quotedContent = String(parent?.content || '').slice(0, 300);
      transaction.create(replyRef, {
        content,
        authorAlias: session.displayName,
        teamAuthorId: session.uid,
        isStaffReply: true,
        staffRole: session.role,
        createdAt: FieldValue.serverTimestamp(),
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
        ...(input.parentReplyId ? {
          parentReplyId: input.parentReplyId,
          replyingToAlias: String(parent?.authorAlias || 'Louisian').slice(0, 80),
          replyingToContent: checkForDoxxing(quotedContent).hasPotentialDoxx ? '' : quotedContent,
        } : {}),
      });
      transaction.update(postRef, { replies: FieldValue.increment(1) });
      transaction.create(auditRef, {
        action: 'official_reply_created', actorUid: session.uid, actorDisplayName: session.displayName,
        targetId: replyRef.id, postId: input.postId, createdAt: FieldValue.serverTimestamp(),
      });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not publish the official reply.' };
  }
}
