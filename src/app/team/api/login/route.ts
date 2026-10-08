import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/team/firebase-admin';
import { TEAM_COOKIE, internalTeamEmail, validTeamUsername, isTeamRole } from '@/lib/team/team-server';

export const runtime = 'nodejs';
const SESSION_LENGTH_MS = 1000 * 60 * 60 * 24 * 5;
export async function POST(req: NextRequest) {
  // IMPORTANT: Put an IP/username based rate limit on this route at Cloudflare or
  // via a shared persistent store before public deployment. No open registration.
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const size = Number(req.headers.get('content-length') || 0);
  if (size > 4096) return NextResponse.json({ error: 'Invalid request.' }, { status: 413 });
  let body: { username?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const username = String(body.username || '').trim().toLowerCase();
  const password = body.password;
  if (!validTeamUsername(username) || typeof password !== 'string' || password.length > 256 || !password) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) throw new Error('Missing Firebase web API key');
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ email: internalTeamEmail(username), password, returnSecureToken: true }),
    });
    if (!response.ok) return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    const result = await response.json() as { idToken: string; localId: string };
    const decoded = await adminAuth().verifyIdToken(result.idToken);
    if (decoded.auth_time * 1000 < Date.now() - 5 * 60 * 1000) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const member = await adminDb().collection('teamMembers').doc(decoded.uid).get();
    const data = member.data();
    if (!data || data.active !== true || !isTeamRole(data.role) || data.username !== username) {
      return NextResponse.json({ error: 'Account not authorized.' }, { status: 403 });
    }
    const cookie = await adminAuth().createSessionCookie(result.idToken, { expiresIn: SESSION_LENGTH_MS });
    const out = NextResponse.json({ member: { uid: decoded.uid, username, role: data.role } });
    out.cookies.set(TEAM_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_LENGTH_MS / 1000 });
    out.headers.set('Cache-Control', 'no-store');
    return out;
  } catch (error) {
    console.error('Team login error', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Unable to sign in.' }, { status: 500 });
  }
}
