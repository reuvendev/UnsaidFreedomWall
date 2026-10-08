'use server';

import { adminDb } from '@/lib/team/firebase-admin';
import { requireTeamRole } from '@/lib/team/team-server';
import { FieldValue } from 'firebase-admin/firestore';

const roles = ['owner', 'admin', 'moderator'] as const;
const db = () => adminDb();

export type ModerationItem = {
  id: string; type: 'pending' | 'post-report' | 'chat-report' | 'appeal';
  content: string; author: string; reason?: string; details?: string;
  postId?: string; replyId?: string; roomId?: string; reportedUserId?: string;
  userId?: string; category?: string; imageUrl?: string;
  evidence?: { messages?: { messageId?: string; senderNickname?: string; senderId?: string; text?: string }[] };
  createdAt?: string; status?: string;
};

const str = (v: unknown) => typeof v === 'string' ? v : '';
function dateValue(v: unknown): string {
  if (v && typeof v === 'object' && 'toDate' in v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return '';
}
function assertId(v: string) {
  if (!v || v.length > 300 || v.includes('/')) throw new Error('Invalid document ID');
}

export async function listTeamModeration(): Promise<ModerationItem[]> {
  await requireTeamRole(roles);
  // Moderate-size, server-side reads; pagination should be added if volumes grow.
  const [posts, reports, appeals] = await Promise.all([
    db().collection('posts').where('status', '==', 'pending').limit(100).get(),
    db().collection('reports').limit(150).get(),
    db().collection('appeals').where('status', '==', 'pending').limit(100).get(),
  ]);
  const items: ModerationItem[] = posts.docs.map(d => {
    const p = d.data();
    return { id:d.id, type:'pending', content:str(p.content), author:str(p.authorAlias) || 'Anonymous Louisian', category:str(p.category), imageUrl:str(p.imageUrl || p.image), createdAt:dateValue(p.createdAt) };
  });
  for (const d of reports.docs) {
    const r = d.data();
    const roomId = str(r.roomId);
    if (roomId) {
      items.push({ id:d.id, type:'chat-report', content:str(r.reason), author:str(r.reportedUserNickname || r.reportedUserId) || 'Unknown', reason:str(r.reason), details:str(r.details), roomId, reportedUserId:str(r.reportedUserId), evidence:r.evidence && typeof r.evidence === 'object' ? {messages: Array.isArray(r.evidence.messages) ? r.evidence.messages.slice(0,100).map((m: Record<string,unknown>) => ({messageId:str(m.messageId),senderNickname:str(m.senderNickname),senderId:str(m.senderId),text:str(m.text)})) : []} : undefined, createdAt:dateValue(r.createdAt) });
    } else {
      items.push({id:d.id,type:'post-report',content:str(r.contentSnippet),author:str(r.authorAlias) || 'Anonymous Louisian',reason:str(r.reason),details:str(r.details),postId:str(r.postId),replyId:str(r.replyId),createdAt:dateValue(r.createdAt)});
    }
  }
  for (const d of appeals.docs) {
    const a = d.data();
    items.push({id:d.id,type:'appeal',content:str(a.message),author:str(a.userId),userId:str(a.userId),status:str(a.status),createdAt:dateValue(a.createdAt)});
  }
  // Load original reported content where possible, without depending on public Firestore access.
  await Promise.all(items.filter(i=>i.type==='post-report' && i.postId).map(async i=>{
    try {
      const ref = i.replyId ? db().collection('posts').doc(i.postId!).collection('replies').doc(i.replyId) : db().collection('posts').doc(i.postId!);
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data()!;
        i.content = str(data.content) || i.content;
        i.author = str(data.authorAlias) || i.author;
        i.imageUrl = str(data.imageUrl || data.image);
      }
    } catch { /* Keep the stored report snippet if original is unavailable. */ }
  }));
  return items.sort((a,b)=>(b.createdAt || '').localeCompare(a.createdAt || ''));
}

export type ModAction = 'approve-post'|'reject-post'|'save-post'|'dismiss-report'|'delete-reported-content'|'ban-chat-user'|'approve-appeal'|'deny-appeal';
export async function performTeamModeration(input: {action: ModAction; id: string; content?: string; note?: string}) {
  const member = await requireTeamRole(roles);
  const {action,id} = input;
  assertId(id);
  const now = FieldValue.serverTimestamp();
  if (['approve-post','reject-post','save-post'].includes(action)) {
    const ref = db().collection('posts').doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.get('status') !== 'pending') throw new Error('Post is no longer pending. Refresh.');
    const data = snap.data()!;
    if (action==='reject-post') await ref.delete();
    else {
      const content = action==='save-post' || input.content !== undefined ? str(input.content).trim() : str(data.content);
      if (!content && !data.imageUrl && !data.image && !data.spotifyTrackId) throw new Error('Post cannot be empty.');
      await ref.update({content, moderationOriginalContent: str(data.moderationOriginalContent || data.content), moderationEdited: content !== str(data.moderationOriginalContent || data.content), moderationEditedAt:now, ...(action==='approve-post'?{status:'approved',moderatedAt:now}:{}), moderatedBy:member.uid});
    }
    return {ok:true};
  }
  if (['dismiss-report','delete-reported-content','ban-chat-user'].includes(action)) {
    const ref=db().collection('reports').doc(id);
    const snap=await ref.get();
    if(!snap.exists) throw new Error('Report no longer exists. Refresh.');
    const r=snap.data()!;
    const batch=db().batch();
    if(action==='delete-reported-content') {
      const postId=str(r.postId); assertId(postId);
      if (str(r.roomId)) throw new Error('This is a chat report.');
      if(str(r.contentType)==='reply' && str(r.replyId)) {
        assertId(r.replyId);
        batch.delete(db().collection('posts').doc(postId).collection('replies').doc(r.replyId));
        batch.update(db().collection('posts').doc(postId), {replies:FieldValue.increment(-1)});
      } else batch.delete(db().collection('posts').doc(postId));
    }
    if(action==='ban-chat-user') {
      if (!str(r.roomId)) throw new Error('This is not a chat report.');
      const userId=str(r.reportedUserId); assertId(userId);
      batch.set(db().collection('bannedUsers').doc(userId),{bannedAt:now,nickname:str(r.reportedUserNickname)||'Unknown',reason:'Admin review from campus chat safety report',moderatedBy:member.uid});
    }
    batch.delete(ref);
    await batch.commit();
    return {ok:true};
  }
  if(action==='approve-appeal'||action==='deny-appeal') {
    const ref=db().collection('appeals').doc(id);
    const snap=await ref.get();
    if(!snap.exists || snap.get('status') !== 'pending') throw new Error('Appeal is no longer pending. Refresh.');
    const userId=str(snap.get('userId')); assertId(userId);
    const batch=db().batch();
    if(action==='approve-appeal') batch.delete(db().collection('bannedUsers').doc(userId));
    batch.update(ref,{status:action==='approve-appeal'?'approved':'denied',moderatorNote:str(input.note).slice(0,2000),reviewedAt:now,reviewedBy:member.uid});
    await batch.commit();
    return {ok:true};
  }
  throw new Error('Unsupported moderation action.');
}
