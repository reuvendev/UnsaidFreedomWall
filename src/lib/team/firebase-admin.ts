import 'server-only';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const credentials = JSON.parse(json);
    return initializeApp({ credential: cert(credentials), projectId: credentials.project_id });
  }
  return initializeApp({ credential: applicationDefault(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
}
export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
