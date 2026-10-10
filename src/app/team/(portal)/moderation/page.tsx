import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/team/firebase-admin';
import { getServerTeamSession } from '@/lib/team/team-server';
import { canModerate } from '@/lib/team/types';
import { HistoryItem, ModerationWorkspace, PendingItem, ReportItem } from '../../components/ModerationWorkspace';

const date = (value: any) => value?.toDate?.().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) || 'Unknown';

export default async function TeamModerationPage() {
  const session = await getServerTeamSession();
  if (!session) redirect('/team/login');
  if (!canModerate(session.role)) redirect('/team');
  const db = adminDb();
  const [pendingSnapshot, reportsSnapshot, historySnapshot, memberSnapshot] = await Promise.all([
    db.collection('posts').where('status', '==', 'pending').orderBy('createdAt', 'desc').limit(50).get(),
    db.collection('reports').orderBy('createdAt', 'desc').limit(100).get(),
    db.collection('moderation_logs').orderBy('createdAt', 'desc').limit(100).get(),
    db.collection('teamMembers').doc(session.uid).get(),
  ]);
  const pending: PendingItem[] = pendingSnapshot.docs.map((doc) => { const data=doc.data(); return { id:doc.id, content:String(data.content||''), category:String(data.category||'others'), createdAt:date(data.createdAt), imageUrl:typeof data.imageUrl==='string'?data.imageUrl:undefined }; });
  const reportDocs = reportsSnapshot.docs.filter((doc) => { const data=doc.data(); return typeof data.postId==='string' && !data.roomId; });
  const contentSnapshots = await Promise.all(reportDocs.map(async (doc) => { const data=doc.data(); if(data.contentType==='reply'&&data.replyId) return db.collection('posts').doc(data.postId).collection('replies').doc(data.replyId).get(); return db.collection('posts').doc(data.postId).get(); }));
  const reports: ReportItem[] = reportDocs.map((doc,index)=>{const data=doc.data();const content=contentSnapshots[index].data();return{id:doc.id,postId:String(data.postId),replyId:typeof data.replyId==='string'?data.replyId:undefined,contentType:data.contentType==='reply'&&data.replyId?'reply':'post',reason:String(data.reason||'No reason specified'),details:String(data.details||data.contentSnippet||''),content:String(content?.content||data.contentSnippet||''),createdAt:date(data.createdAt),escalated:data.escalated===true};});
  const history: HistoryItem[] = historySnapshot.docs.map((doc)=>{const data=doc.data();return{id:doc.id,action:String(data.action||'moderation_action'),moderator:String(data.actorDisplayName||'Team member'),date:date(data.createdAt),reason:typeof data.reason==='string'?data.reason:undefined,summary:typeof data.summary==='string'?data.summary:undefined};});
  const activity=memberSnapshot.data()?.activity||{}; const stats={reviewedPosts:Number(activity.reviewedPosts)||0,approvedPosts:Number(activity.approvedPosts)||0,rejectedPosts:Number(activity.rejectedPosts)||0,reportsResolved:Number(activity.reportsResolved)||0};
  return <div className="mx-auto max-w-6xl"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-600">Authorized workspace</p><h1 className="mt-3 text-3xl font-black tracking-tight">Moderation</h1><p className="mt-2 text-sm text-neutral-500">Review community content without exposing anonymous identifiers or private chat data.</p><div className="mt-8"><ModerationWorkspace pending={pending} reports={reports} history={history} stats={stats} canResolveSensitive={session.role==='owner'||session.role==='admin'} /></div></div>;
}
