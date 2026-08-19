// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-a1poP080VNeUqSloekjYZ7AumPbnbDE",
  authDomain: "unsaid-2263d.firebaseapp.com",
  projectId: "unsaid-2263d",
  storageBucket: "unsaid-2263d.firebasestorage.app",
  messagingSenderId: "989514520605",
  appId: "1:989514520605:web:3a92942d65740700e68ef4",
  measurementId: "G-XVR0SB7YX0"
};

// Initialize Firebase (prevents duplicate initialization errors in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);