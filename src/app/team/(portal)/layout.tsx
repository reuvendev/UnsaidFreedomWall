import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getServerTeamSession } from '@/lib/team/team-server';
import { TeamShell } from '../components/TeamShell';

export const dynamic = 'force-dynamic';

export default async function TeamPortalLayout({ children }: { children: ReactNode }) {
  const session = await getServerTeamSession();
  if (!session) redirect('/team/login');
  return <TeamShell member={{ displayName: session.displayName, role: session.role }}>{children}</TeamShell>;
}
