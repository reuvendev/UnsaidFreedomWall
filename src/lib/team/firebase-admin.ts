import 'server-only';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  const existing = getApps().find((app) => app.name === 'tambayan-team-admin');
  if (existing) return existing;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const credentials = JSON.parse(json);
    return initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, 'tambayan-team-admin');
  }
  return initializeApp({ credential: applicationDefault(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }, 'tambayan-team-admin');
}
export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
