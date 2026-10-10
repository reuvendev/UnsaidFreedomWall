import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/team/firebase-admin';
import { getServerTeamSession } from '@/lib/team/team-server';
import { canManageMembers, isTeamRole, isTeamStatus } from '@/lib/team/types';
import { ManagedMember, MemberManager } from '../../components/MemberManager';

export default async function TeamMembersPage() {
  const session = await getServerTeamSession();
  if (!session) redirect('/team/login');
  if (!canManageMembers(session.role)) redirect('/team');
  const snapshot = await adminDb().collection('teamMembers').orderBy('createdAt', 'asc').get();
  const members: ManagedMember[] = snapshot.docs.flatMap((doc) => { const data = doc.data(); if (!isTeamRole(data.role) || !isTeamStatus(data.status)) return []; return [{ uid: doc.id, displayName: String(data.displayName || 'Team member'), email: String(data.email || ''), role: data.role, status: data.status, lastLogin: data.lastLoginAt?.toDate?.().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) || 'Never', activity: { reviewedPosts: Number(data.activity?.reviewedPosts) || 0, approvedPosts: Number(data.activity?.approvedPosts) || 0, rejectedPosts: Number(data.activity?.rejectedPosts) || 0, reportsResolved: Number(data.activity?.reportsResolved) || 0 } }]; });
  return <div className="mx-auto max-w-6xl"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-600">Founder / Admin</p><h1 className="mt-3 text-3xl font-black tracking-tight">Team management</h1><p className="mt-2 text-sm text-neutral-500">Create accounts and control TambayanSLU Team access. Account changes are audited.</p><div className="mt-8"><MemberManager members={members} /></div></div>;
}
