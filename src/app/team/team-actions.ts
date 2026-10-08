'use server';
import { cookies } from 'next/headers';
import { TEAM_COOKIE, getServerTeamSession, type TeamSession } from '@/lib/team/team-server';
export type { TeamSession };
export async function getTeamSession(): Promise<TeamSession | null> {
  return getServerTeamSession();
}
export async function logoutTeam(): Promise<void> {
  (await cookies()).delete(TEAM_COOKIE);
}
