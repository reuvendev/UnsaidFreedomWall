import { NextRequest, NextResponse } from 'next/server';
import { findMember, startSession, verifyPassword } from '../../team-auth';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get('content-length') || '0') > 4096) return NextResponse.json({error:'Invalid request'}, {status:400});
    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!/^[a-z0-9_]{3,30}$/.test(username) || !password || password.length > 256) return NextResponse.json({error:'Invalid username or password'}, {status:401});
    const member = await findMember(username);
    if (!member || member.disabled || !verifyPassword(password, member.passwordHash)) return NextResponse.json({error:'Invalid username or password'}, {status:401});
    await startSession(username,member.role,member.sessionVersion || 0);
    return NextResponse.json({member:{username,role:member.role}});
  } catch (error) { console.error('Team login error',error); return NextResponse.json({error:'Login temporarily unavailable'}, {status:500}); }
}
