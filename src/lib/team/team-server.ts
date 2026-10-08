import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './firebase-admin';

export const TEAM_COOKIE = 'tambayan_team_session';
export const TEAM_ROLES = ['owner', 'admin', 'developer', 'moderator', 'social', 'writer', 'community', 'qa', 'designer'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export type TeamSession = { uid: string; username: string; role: TeamRole };
export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === 'string' && (TEAM_ROLES as readonly string[]).includes(value);
}
export async function getServerTeamSession(): Promise<TeamSession | null> {
  const token = (await cookies()).get(TEAM_COOKIE)?.value;
  if (!token) return null;
  try {
    // checkRevoked catches users disabled or tokens revoked after account changes.
    const decoded = await adminAuth().verifySessionCookie(token, true);
    const doc = await adminDb().collection('teamMembers').doc(decoded.uid).get();
    if (!doc.exists) return null;
    const member = doc.data()!;
    if (member.active !== true || !isTeamRole(member.role) || typeof member.username !== 'string') return null;
    return { uid: decoded.uid, username: member.username, role: member.role };
  } catch { return null; }
}
export async function requireTeamRole(roles: readonly TeamRole[]): Promise<TeamSession> {
  const session = await getServerTeamSession();
  if (!session || !roles.includes(session.role)) throw new Error('Not authorized');
  return session;
}
export const internalTeamEmail = (username: string) => `${username}@tambayanslu.com`;
export const validTeamUsername = (value: string) => /^[a-z0-9_]{3,30}$/.test(value);
