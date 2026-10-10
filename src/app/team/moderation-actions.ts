'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/team/firebase-admin';
import { requireTeamRole } from '@/lib/team/team-server';
import { checkForDoxxing } from '@/lib/antiDoxx';

const MODERATOR_ROLES = ['owner', 'admin', 'moderator'] as const;

function text(formData: FormData, key: string, max = 1000) {
  return String(formData.get(key) || '').trim().slice(0, max);
}

function sensitiveReason(reason: string) {
  return /doxx|personal info|allegation|threat|self-harm|minor/i.test(reason) || checkForDoxxing(reason).hasPotentialDoxx;
}

function logData(session: Awaited<ReturnType<typeof requireTeamRole>>, action: string, target: Record<string, unknown>) {
  return { action, actorUid: session.uid, actorDisplayName: session.displayName, actorRole: session.role, ...target, createdAt: FieldValue.serverTimestamp() };
}

export async function approvePendingPost(formData: FormData) {
  const session = await requireTeamRole(MODERATOR_ROLES);
  const postId = text(formData, 'postId', 200); const editedContent = text(formData, 'content', 5000);
  if (!postId || !editedContent) return { success: false, error: 'Post content is required.' };
  try {
    const db = adminDb(); const postRef = db.collection('posts').doc(postId); const memberRef = db.collection('teamMembers').doc(session.uid); const logRef = db.collection('moderation_logs').doc();
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(postRef); const post = snapshot.data();
      if (!snapshot.exists || post?.status !== 'pending') throw new Error('This post has already been reviewed.');
      const original = String(post.content || '');
      transaction.update(postRef, { content: editedContent, status: 'approved', moderationEdited: editedContent !== original, moderationOriginalContent: post.moderationOriginalContent || original, moderatedAt: FieldValue.serverTimestamp(), moderatedBy: session.uid });
      transaction.set(logRef, logData(session, 'post_approved', { postId, summary: editedContent.slice(0, 160) }));
      transaction.update(memberRef, { 'activity.reviewedPosts': FieldValue.increment(1), 'activity.approvedPosts': FieldValue.increment(1) });
    });
    revalidatePath('/team/moderation'); return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not approve the post.' }; }
}

export async function rejectPendingPost(formData: FormData) {
  const session = await requireTeamRole(MODERATOR_ROLES);
  const postId = text(formData, 'postId', 200); const reason = text(formData, 'reason', 500) || 'Did not meet community guidelines';
  if (!postId) return { success: false, error: 'Post not found.' };
  try {
    const db = adminDb(); const postRef = db.collection('posts').doc(postId); const memberRef = db.collection('teamMembers').doc(session.uid); const logRef = db.collection('moderation_logs').doc();
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(postRef); const post = snapshot.data();
      if (!snapshot.exists || post?.status !== 'pending') throw new Error('This post has already been reviewed.');
      transaction.delete(postRef);
      transaction.set(logRef, logData(session, 'post_rejected', { postId, reason, summary: String(post.content || '').slice(0, 160) }));
      transaction.update(memberRef, { 'activity.reviewedPosts': FieldValue.increment(1), 'activity.rejectedPosts': FieldValue.increment(1) });
    });
    revalidatePath('/team/moderation'); return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not reject the post.' }; }
}

export async function escalateReport(formData: FormData) {
  const session = await requireTeamRole(MODERATOR_ROLES);
  const reportId = text(formData, 'reportId', 200); const note = text(formData, 'note', 500);
  const ref = adminDb().collection('reports').doc(reportId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { success: false, error: 'This report is no longer pending.' };
  const batch = adminDb().batch();
  batch.update(ref, { escalated: true, escalationNote: note, escalatedAt: FieldValue.serverTimestamp(), escalatedBy: session.uid });
  batch.create(adminDb().collection('moderation_logs').doc(), logData(session, 'report_escalated', { reportId, note }));
  await batch.commit();
  revalidatePath('/team/moderation'); return { success: true };
}

export async function resolveContentReport(formData: FormData) {
  const session = await requireTeamRole(MODERATOR_ROLES);
  const reportId = text(formData, 'reportId', 200); const decision = text(formData, 'decision', 20);
  if (!['dismiss', 'remove'].includes(decision)) return { success: false, error: 'Invalid moderation decision.' };
  try {
    const db = adminDb(); const reportRef = db.collection('reports').doc(reportId); const memberRef = db.collection('teamMembers').doc(session.uid); const logRef = db.collection('moderation_logs').doc();
    let removedPostRef: FirebaseFirestore.DocumentReference | null = null;
    await db.runTransaction(async (transaction) => {
      const reportSnapshot = await transaction.get(reportRef); const report = reportSnapshot.data();
      if (!reportSnapshot.exists || !report?.postId || report?.roomId) throw new Error('This report is no longer pending.');
      const contentType = report.contentType === 'reply' && report.replyId ? 'reply' : 'post';
      const postRef = db.collection('posts').doc(String(report.postId));
      const contentRef = contentType === 'reply' ? postRef.collection('replies').doc(String(report.replyId)) : postRef;
      const [postSnapshot, contentSnapshot] = contentType === 'reply'
        ? await Promise.all([transaction.get(postRef), transaction.get(contentRef)])
        : [await transaction.get(postRef), null];
      const contentData = contentType === 'reply' ? contentSnapshot?.data() : postSnapshot.data();
      const sensitivityInput = [report.reason, report.details, report.contentSnippet, contentData?.content].map((value) => String(value || '')).join(' ');
      if (session.role === 'moderator' && (report.escalated === true || sensitiveReason(sensitivityInput))) throw new Error('This sensitive report must be escalated to an Admin.');
      if (decision === 'remove') {
        if (contentType === 'reply') {
          if (contentSnapshot?.exists) transaction.delete(contentRef);
          if (postSnapshot.exists) transaction.update(postRef, { replies: Math.max(0, Number(postSnapshot.data()?.replies) || 0) - (contentSnapshot?.exists ? 1 : 0) });
        } else {
          transaction.delete(postRef);
          removedPostRef = postRef;
        }
      }
      transaction.delete(reportRef);
      transaction.set(logRef, logData(session, decision === 'remove' ? `${contentType}_removed` : 'report_dismissed', { reportId, postId: String(report.postId), replyId: report.replyId || null, reason: String(report.reason || '').slice(0, 300) }));
      transaction.update(memberRef, { 'activity.reportsResolved': FieldValue.increment(1) });
    });
    if (removedPostRef) await db.recursiveDelete(removedPostRef).catch(() => undefined);
    revalidatePath('/team/moderation'); return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not resolve the report.' }; }
}
