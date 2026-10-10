import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './firebase-admin';
import { isTeamRole, isTeamStatus, TeamRole, TeamSession } from './types';

export type { TeamRole, TeamSession } from './types';

export const TEAM_COOKIE = 'tambayan_team_session';
export async function getServerTeamSession(): Promise<TeamSession | null> {
  const token = cookies().get(TEAM_COOKIE)?.value;
  if (!token) return null;
  try {
    // checkRevoked catches users disabled or tokens revoked after account changes.
    const decoded = await adminAuth().verifySessionCookie(token, true);
    const doc = await adminDb().collection('teamMembers').doc(decoded.uid).get();
    if (!doc.exists) return null;
    const member = doc.data()!;
    const displayName = typeof member.displayName === 'string' && member.displayName.trim()
      ? member.displayName.trim()
      : typeof member.username === 'string' && member.username.trim()
        ? member.username.trim()
        : '';
    const email = typeof member.email === 'string' && member.email.trim()
      ? member.email.trim().toLowerCase()
      : typeof decoded.email === 'string'
        ? decoded.email.toLowerCase()
        : '';
    if (
      member.status !== 'active' ||
      member.verified !== true ||
      !isTeamRole(member.role) ||
      !isTeamStatus(member.status) ||
      !displayName ||
      !email
    ) return null;
    return {
      uid: decoded.uid,
      displayName,
      email,
      role: member.role,
      status: member.status,
    };
  } catch { return null; }
}
export async function requireTeamRole(roles: readonly TeamRole[]): Promise<TeamSession> {
  const session = await getServerTeamSession();
  if (!session || !roles.includes(session.role)) throw new Error('Not authorized');
  return session;
}
