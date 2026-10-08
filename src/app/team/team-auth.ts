import 'server-only';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export type TeamRole = 'owner' | 'admin' | 'moderator' | 'developer' | 'writer' | 'social' | 'community' | 'qa' | 'designer';
export type TeamSession = { username: string; role: TeamRole };
const cookieName = 'tambayanslu_team_session';
const maxAge = 60 * 60 * 12;
function secret() { const s = process.env.TEAM_SESSION_SECRET; if (!s || s.length < 32) throw new Error('Configure TEAM_SESSION_SECRET (32+ characters)'); return s; }
function db() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    initializeApp({ credential: raw ? cert(JSON.parse(raw)) : applicationDefault() });
  }
  return getFirestore();
}
export async function findMember(username: string) {
  const snapshot = await db().collection('tambayanslu_team_members').doc(username).get();
  return snapshot.exists ? snapshot.data() as { passwordHash: string; role: TeamRole; disabled?: boolean; sessionVersion?: number } : null;
}
export function verifyPassword(password: string, stored: string) {
  try {
    const [algorithm,salt,hex] = stored.split(':');
    if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hex)) return false;
    const expected = Buffer.from(hex, 'hex');
    return timingSafeEqual(scryptSync(password, Buffer.from(salt,'hex'),64),expected);
  } catch { return false; }
}
function sign(payload: string) { return createHmac('sha256',secret()).update(payload).digest('base64url'); }
export async function startSession(username: string, role: TeamRole, version: number) {
  const payload = Buffer.from(JSON.stringify({u:username,r:role,v:version,exp:Date.now()+maxAge*1000,nonce:randomBytes(8).toString('hex')})).toString('base64url');
  (await cookies()).set(cookieName, `${payload}.${sign(payload)}`, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/', maxAge });
}
export async function currentSession(): Promise<TeamSession | null> {
  try {
    const value = (await cookies()).get(cookieName)?.value;
    if (!value) return null;
    const [payload,mac,extra] = value.split('.');
    if (extra || !payload || !mac || !timingSafeEqual(Buffer.from(sign(payload)),Buffer.from(mac))) return null;
    const data = JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if (!data.u || !Number.isFinite(data.exp) || Date.now() > data.exp) return null;
    const record = await findMember(data.u);
    if (!record || record.disabled || record.role !== data.r || (record.sessionVersion || 0) !== data.v) return null;
    return {username:data.u,role:record.role};
  } catch { return null; }
}
export async function endSession() { (await cookies()).delete(cookieName); }
export async function requireTeamRole(roles: TeamRole[]) {
  const session = await currentSession();
  if (!session || !roles.includes(session.role)) throw new Error('Unauthorized');
  return session;
}
