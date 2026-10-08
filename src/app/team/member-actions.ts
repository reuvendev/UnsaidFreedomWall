'use server';
import { revalidatePath } from 'next/cache';
import { adminAuth, adminDb } from '@/lib/team/firebase-admin';
import { internalTeamEmail, requireTeamRole, validTeamUsername, isTeamRole, type TeamRole } from '@/lib/team/team-server';

export type MemberSummary = { uid: string; username: string; role: TeamRole; active: boolean; createdAt: string };
export type Result = { ok: boolean; message: string };
const assignable: TeamRole[] = ['admin','developer','moderator','social','writer','community','qa','designer'];
export async function listTeamMembers(): Promise<MemberSummary[]> {
  await requireTeamRole(['owner']);
  const snap = await adminDb().collection('teamMembers').limit(200).get();
  return snap.docs.map(d => ({
    uid: d.id, username: String(d.data().username || ''), role: d.data().role as TeamRole,
    active: d.data().active === true, createdAt: String(d.data().createdAt || ''),
  })).sort((a,b) => a.username.localeCompare(b.username));
}
export async function createTeamMember(input: {username: string; password: string; role: string}): Promise<Result> {
  await requireTeamRole(['owner']);
  const username = (input.username || '').trim().toLowerCase();
  if (!validTeamUsername(username)) return { ok: false, message: 'Username must be 3–30 lowercase letters, numbers or underscores.' };
  if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128) return { ok: false, message: 'Password must be 12–128 characters.' };
  if (!assignable.includes(input.role as TeamRole)) return { ok: false, message: 'Invalid role.' };
  const usernameRef = adminDb().collection('teamUsernames').doc(username);
  // Reserve username before creation to prevent two owners picking the same username.
  try { await usernameRef.create({ status: 'creating', createdAt: new Date().toISOString() }); }
  catch { return { ok: false, message: 'Username is already taken.' }; }
  let uid: string | undefined;
  try {
    const user = await adminAuth().createUser({ email: internalTeamEmail(username), password: input.password, emailVerified: true, disabled: false, displayName: username });
    uid = user.uid;
    await adminDb().collection('teamMembers').doc(uid).create({ username, role: input.role, active: true, createdAt: new Date().toISOString() });
    await usernameRef.set({ uid, status: 'active' });
    revalidatePath('/team/members');
    return { ok: true, message: `Created @${username}. Share credentials privately.` };
  } catch (err) {
    console.error('createTeamMember failed', err instanceof Error ? err.message : err);
    if (uid) { try { await adminAuth().deleteUser(uid); } catch {} }
    await usernameRef.delete().catch(() => {});
    return { ok: false, message: 'Could not create account. Check Firebase configuration.' };
  }
}
export async function setTeamMemberActive(uid: string, active: boolean): Promise<Result> {
  const owner = await requireTeamRole(['owner']);
  if (uid === owner.uid) return { ok: false, message: 'You cannot disable your own account.' };
  const ref = adminDb().collection('teamMembers').doc(uid);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.role === 'owner') return { ok: false, message: 'Account cannot be modified.' };
  await adminAuth().updateUser(uid, { disabled: !active });
  await adminAuth().revokeRefreshTokens(uid);
  await ref.update({ active });
  revalidatePath('/team/members');
  return { ok: true, message: active ? 'Member enabled.' : 'Member disabled.' };
}
export async function changeTeamMemberRole(uid: string, role: string): Promise<Result> {
  const owner = await requireTeamRole(['owner']);
  if (!assignable.includes(role as TeamRole)) return { ok: false, message: 'Invalid role.' };
  if (uid === owner.uid) return { ok: false, message: 'Cannot change your own role.' };
  const ref = adminDb().collection('teamMembers').doc(uid);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.role === 'owner') return { ok: false, message: 'Account cannot be modified.' };
  await ref.update({ role });
  revalidatePath('/team/members');
  return { ok: true, message: 'Role updated.' };
}
export async function resetTeamMemberPassword(uid: string, newPassword: string): Promise<Result> {
  const owner = await requireTeamRole(['owner']);
  if (uid === owner.uid) return { ok: false, message: 'Use Firebase Console to change your owner password.' };
  if (newPassword.length < 12 || newPassword.length > 128) return { ok: false, message: 'Password must be 12–128 characters.' };
  const doc = await adminDb().collection('teamMembers').doc(uid).get();
  if (!doc.exists || doc.data()?.role === 'owner') return { ok: false, message: 'Account cannot be modified.' };
  await adminAuth().updateUser(uid, { password: newPassword });
  await adminAuth().revokeRefreshTokens(uid);
  return { ok: true, message: 'Password reset and existing sessions revoked.' };
}
