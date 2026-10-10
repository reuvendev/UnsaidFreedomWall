'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-admin/auth';
import { adminAuth, adminDb } from '@/lib/team/firebase-admin';
import { getServerTeamSession, requireTeamRole, TEAM_COOKIE } from '@/lib/team/team-server';
import { isTeamRole, TeamRole, TeamStatus } from '@/lib/team/types';

const SESSION_MAX_AGE = 60 * 60 * 24 * 5;

function cleanDisplayName(value: unknown) {
  const displayName = String(value || '').trim().replace(/\s+/g, ' ');
  if (displayName.length < 2 || displayName.length > 50) throw new Error('Display name must be 2 to 50 characters.');
  return displayName;
}

function publicProfile(displayName: string, role: TeamRole, verified: boolean) {
  return { displayName, role, verified, updatedAt: FieldValue.serverTimestamp() };
}

export async function createTeamSession(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const forwardedFor = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimitKey = crypto.createHash('sha256').update(`${process.env.RATE_LIMIT_SALT || 'team-login'}:${forwardedFor}:${normalizedEmail}`).digest('hex');
  const rateLimitRef = adminDb().collection('teamLoginLimits').doc(rateLimitKey);
  try {
    await adminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(rateLimitRef);
      const data = snapshot.data(); const now = Date.now(); const windowStarted = data?.windowStarted?.toMillis?.() || 0;
      const withinWindow = now - windowStarted < 15 * 60 * 1000;
      const attempts = withinWindow ? Number(data?.attempts) || 0 : 0;
      if (attempts >= 5) throw new Error('Too many sign-in attempts. Try again in 15 minutes.');
      transaction.set(rateLimitRef, { attempts: attempts + 1, windowStarted: withinWindow ? data!.windowStarted : Timestamp.fromMillis(now), expiresAt: Timestamp.fromMillis(now + 60 * 60 * 1000) });
    });
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) throw new Error('Firebase Authentication is not configured.');
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password, returnSecureToken: true }),
      cache: 'no-store',
    });
    if (!response.ok) return { success: false, error: 'Unable to sign in. Check your email and password.' };
    const authResult = await response.json() as { idToken?: string };
    if (!authResult.idToken) return { success: false, error: 'Firebase did not return a valid sign-in token.' };
    const idToken = authResult.idToken;
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    const memberRef = adminDb().collection('teamMembers').doc(decoded.uid);
    const memberSnapshot = await memberRef.get();
    const member = memberSnapshot.data();

    if (!memberSnapshot.exists || member?.status !== 'active' || member?.verified !== true || !isTeamRole(member?.role)) {
      return { success: false, error: 'This account does not have active TambayanSLU Team access.' };
    }
    const displayName = typeof member.displayName === 'string' && member.displayName.trim()
      ? member.displayName.trim()
      : typeof member.username === 'string' && member.username.trim()
        ? member.username.trim()
        : '';
    const memberEmail = typeof member.email === 'string' && member.email.trim()
      ? member.email.trim().toLowerCase()
      : typeof decoded.email === 'string'
        ? decoded.email.toLowerCase()
        : '';
    if (!displayName || !memberEmail) {
      return { success: false, error: 'This Team profile is incomplete. Add displayName and email to its teamMembers record.' };
    }

    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE * 1000 });
    cookies().set(TEAM_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    const profileBatch = adminDb().batch();
    profileBatch.set(memberRef, { displayName, email: memberEmail, lastLoginAt: FieldValue.serverTimestamp() }, { merge: true });
    profileBatch.set(adminDb().collection('teamPublicProfiles').doc(decoded.uid), publicProfile(displayName, member.role, true), { merge: true });
    await profileBatch.commit();
    await rateLimitRef.delete().catch(() => undefined);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error && error.message.startsWith('Too many') ? error.message : 'Unable to sign in. Check your credentials and try again.' };
  }
}

export async function logoutTeam() {
  cookies().set(TEAM_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0, sameSite: 'lax' });
  redirect('/team/login');
}

export async function createTeamMember(formData: FormData) {
  const actor = await requireTeamRole(['owner', 'admin']);
  const displayName = cleanDisplayName(formData.get('displayName'));
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const temporaryPassword = String(formData.get('temporaryPassword') || '');
  const roleValue = formData.get('role');

  if (!/^\S+@\S+\.\S+$/.test(email)) return { success: false, error: 'Enter a valid email address.' };
  if (temporaryPassword.length < 12) return { success: false, error: 'Temporary password must be at least 12 characters.' };
  if (!isTeamRole(roleValue) || roleValue === 'owner') return { success: false, error: 'The Founder role cannot be assigned here.' };

  let user: UserRecord | undefined;
  try {
    const createdUser = await adminAuth().createUser({ email, password: temporaryPassword, displayName, disabled: false });
    user = createdUser;
    const now = FieldValue.serverTimestamp();
    await adminDb().runTransaction(async (transaction) => {
      transaction.create(adminDb().collection('teamMembers').doc(createdUser.uid), {
        uid: createdUser.uid,
        displayName,
        email,
        role: roleValue,
        status: 'active',
        verified: true,
        createdAt: now,
        createdBy: actor.uid,
        updatedAt: now,
        activity: { reviewedPosts: 0, approvedPosts: 0, rejectedPosts: 0, reportsResolved: 0 },
      });
      transaction.set(adminDb().collection('teamPublicProfiles').doc(createdUser.uid), publicProfile(displayName, roleValue, true));
    });
    await adminDb().collection('teamAuditLogs').add({
      action: 'member_created', actorUid: actor.uid, actorDisplayName: actor.displayName,
      targetUid: createdUser.uid, targetDisplayName: displayName, createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    if (user) {
      await Promise.all([
        adminAuth().deleteUser(user.uid).catch(() => undefined),
        adminDb().collection('teamMembers').doc(user.uid).delete().catch(() => undefined),
        adminDb().collection('teamPublicProfiles').doc(user.uid).delete().catch(() => undefined),
      ]);
    }
    const message = error instanceof Error && error.message.includes('email-already-exists')
      ? 'A Firebase account already uses that email.'
      : 'The team account could not be created.';
    return { success: false, error: message };
  }
}

export async function updateTeamMember(formData: FormData) {
  const actor = await requireTeamRole(['owner', 'admin']);
  const uid = String(formData.get('uid') || '');
  const roleValue = formData.get('role');
  const statusValue = String(formData.get('status') || '') as TeamStatus;
  if (!uid || uid === actor.uid) return { success: false, error: 'You cannot change your own access here.' };
  if (!isTeamRole(roleValue) || roleValue === 'owner') return { success: false, error: 'The Founder role cannot be assigned here.' };
  if (!['active', 'suspended', 'revoked'].includes(statusValue)) return { success: false, error: 'Invalid account status.' };

  try {
    const db = adminDb(); const memberRef = db.collection('teamMembers').doc(uid); const actorRef = db.collection('teamMembers').doc(actor.uid);
    await db.runTransaction(async (transaction) => {
      const [actorSnapshot, memberSnapshot] = await Promise.all([transaction.get(actorRef), transaction.get(memberRef)]);
      const currentActor = actorSnapshot.data(); const member = memberSnapshot.data();
      if (!actorSnapshot.exists || currentActor?.status !== 'active' || !['owner', 'admin'].includes(currentActor?.role)) throw new Error('Your account can no longer manage members.');
      if (!memberSnapshot.exists) throw new Error('Team member not found.');
      if (member?.role === 'owner') throw new Error('The Founder account cannot be changed here.');
      if (member?.status === 'revoked') throw new Error('Revoked access cannot be reactivated. Create a new account after Founder review.');
      const now = FieldValue.serverTimestamp();
      transaction.update(memberRef, { role: roleValue, status: statusValue, verified: statusValue === 'active', updatedAt: now, updatedBy: actor.uid });
      const publicRef = db.collection('teamPublicProfiles').doc(uid);
      if (statusValue === 'active') transaction.set(publicRef, publicProfile(String(member?.displayName || 'Team member'), roleValue, true));
      else transaction.delete(publicRef);
      transaction.create(db.collection('teamAuditLogs').doc(), {
        action: statusValue === 'revoked' ? 'access_revoked' : 'member_updated',
        actorUid: actor.uid, actorDisplayName: actor.displayName, targetUid: uid,
        targetDisplayName: String(member?.displayName || 'Team member'), role: roleValue, status: statusValue, createdAt: now,
      });
    });
    await adminAuth().updateUser(uid, { disabled: statusValue !== 'active' });
    if (statusValue !== 'active') await adminAuth().revokeRefreshTokens(uid);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'The member could not be updated.' };
  }
}

export async function updateOwnTeamProfile(formData: FormData) {
  const session = await getServerTeamSession();
  if (!session) return { success: false, error: 'Your session has expired.' };
  const displayName = cleanDisplayName(formData.get('displayName'));
  const memberRef = adminDb().collection('teamMembers').doc(session.uid);
  await adminDb().runTransaction(async (transaction) => {
    transaction.update(memberRef, { displayName, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(
      adminDb().collection('teamPublicProfiles').doc(session.uid),
      publicProfile(displayName, session.role, true)
    );
  });
  await adminAuth().updateUser(session.uid, { displayName });
  return { success: true, displayName };
}
