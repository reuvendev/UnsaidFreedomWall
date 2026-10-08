import { redirect } from 'next/navigation';
import { getServerTeamSession } from '@/lib/team/team-server';
import { listTeamMembers } from '../member-actions';
import MemberManager from './member-manager';
export const dynamic = 'force-dynamic';
export default async function TeamMembersPage() {
  const user = await getServerTeamSession();
  if (!user) redirect('/team');
  if (user.role !== 'owner') return <main className="min-h-screen bg-neutral-950 p-8 text-white">You do not have permission to manage accounts.</main>;
  const members = await listTeamMembers();
  return <MemberManager initialMembers={members} />;
}
