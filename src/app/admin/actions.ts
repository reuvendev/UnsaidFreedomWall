'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const COOKIE_NAME = "unsaid_admin_session";

function validAdminSession() {
  const value = cookies().get(COOKIE_NAME)?.value || '';
  const [nonce, signature] = value.split('.');
  if (!ADMIN_PASSWORD || !nonce || !signature || !/^[a-f0-9]{64}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac('sha256', ADMIN_PASSWORD).update(nonce).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

export async function loginAdmin(formData: FormData) {
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD environment variable is not set.");
  }

  const password = formData.get("password");

  if (password === ADMIN_PASSWORD) {
    // Generate a secure, cryptographically random session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Set a secure HTTP-only cookie lasting 1 day with the unique token
    const signature = crypto.createHmac('sha256', ADMIN_PASSWORD).update(sessionToken).digest('hex');
    cookies().set(COOKIE_NAME, `${sessionToken}.${signature}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: "strict",
    });
    
    return { success: true };
  }

  return { success: false, error: "Invalid admin password." };
}

export async function logoutAdmin() {
  cookies().set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

export async function checkAdminAuth() {
  return validAdminSession();
}

export async function requireAdminAuth() {
  if (!validAdminSession()) throw new Error('Admin sign-in required.');
}
