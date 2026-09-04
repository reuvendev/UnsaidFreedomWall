'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  collection, query, where, getDocs, addDoc, 
  updateDoc, doc, serverTimestamp, onSnapshot, limit, deleteDoc, Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Icons = {
  Zap: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
};

export default function ChatQueuePage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState('Initializing secure queue...');
  const matchedRef = useRef(false);

  useEffect(() => {
    let activeUnsubscribe: (() => void) | null = null;
    let roomRefId: string | null = null;
    let isMounted = true;

    const startMatchmaking = async () => {
      let storedId = localStorage.getItem('unsaid_chat_user_id');
      if (!storedId) {
        storedId = 'user_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('unsaid_chat_user_id', storedId);
      }

      const nickname = localStorage.getItem('unsaid_chat_nickname') || 'Anonymous Louisian';
      const school = localStorage.getItem('unsaid_chat_school') || 'samcis';

      setStatusText('Scanning for available Louisian chatmates...');

      try {
        const roomsRef = collection(db, "chatRooms");

        // SAFETY CLEANUP: Delete any old waiting rooms created by this user previously
        const myOldRoomsQuery = query(roomsRef, where("hostId", "==", storedId), where("status", "==", "waiting"));
        const myOldSnap = await getDocs(myOldRoomsQuery);
        const cleanupPromises = myOldSnap.docs.map(oldDoc => deleteDoc(oldDoc.ref));
        await Promise.all(cleanupPromises);
        
        // Find waiting rooms created by other users
        const q = query(roomsRef, where("status", "==", "waiting"), limit(15));
        const querySnapshot = await getDocs(q);

        const now = Date.now();
        // Filter out own rooms AND filter out rooms older than 60 seconds (stale/ghost rooms)
        const availableRooms = querySnapshot.docs.filter(docSnap => {
          const data = docSnap.data();
          if (data.hostId === storedId) return false;

          // Check if room has a valid timestamp and is less than 60 seconds old
          if (data.createdAt && data.createdAt.toMillis) {
            const ageInMs = now - data.createdAt.toMillis();
            if (ageInMs > 60000) {
              // Optionally delete stale abandoned rooms in the background
              deleteDoc(docSnap.ref).catch(() => {});
              return false;
            }
          }
          return true;
        });

        if (availableRooms.length > 0) {
          // Pick the valid active room
          const targetRoomDoc = availableRooms[0];
          
          setStatusText('Match found! Connecting to secure room...');
          
          try {
            await updateDoc(doc(db, "chatRooms", targetRoomDoc.id), {
              status: "active",
              guestId: storedId,
              guestNickname: nickname,
              guestSchool: school,
            });

            if (isMounted) {
              matchedRef.current = true;
              router.push(`/chat/${targetRoomDoc.id}`);
              return;
            }
          } catch (updateErr) {
            console.warn("Race condition during matching, creating new room...", updateErr);
          }
        }

        // If no valid rooms available, create our own fresh waiting room
        if (!isMounted) return;
        setStatusText('Waiting for another student to join queue...');
        
        const newRoomRef = await addDoc(roomsRef, {
          hostId: storedId,
          hostNickname: nickname,
          hostSchool: school,
          guestId: null,
          guestNickname: null,
          guestSchool: null,
          status: "waiting",
          createdAt: serverTimestamp(),
        });

        roomRefId = newRoomRef.id;

        // Listen for a real guest to activate our room
        activeUnsubscribe = onSnapshot(doc(db, "chatRooms", newRoomRef.id), (docSnap) => {
          if (!docSnap.exists()) return;
          const data = docSnap.data();
          // Ensure a guest actually joined (guestId exists and is different from host)
          if (data && data.status === "active" && data.guestId && data.guestId !== storedId && isMounted) {
            if (activeUnsubscribe) activeUnsubscribe();
            matchedRef.current = true;
            setStatusText('Chatmate found! Entering room...');
            router.push(`/chat/${newRoomRef.id}`);
          }
        });

      } catch (error) {
        console.error("Matchmaking error:", error);
        if (isMounted) {
          setStatusText('Error connecting to queue. Please retry.');
        }
      }
    };

    startMatchmaking();

    return () => {
      isMounted = false;
      if (activeUnsubscribe) activeUnsubscribe();
      if (roomRefId && !matchedRef.current) {
        deleteDoc(doc(db, "chatRooms", roomRefId)).catch(() => {});
      }
    };
  }, [router]);

  const handleCancel = () => {
    matchedRef.current = false;
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            TAMBAYAN<span className="text-emerald-600">.</span>
          </Link>
          <span className="font-mono text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
            Queue Live
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-20 w-full flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-6 relative text-emerald-600">
          <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 animate-ping"></div>
          <Icons.Zap />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 mb-3">
          Finding Your Match
        </h1>

        <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-8 leading-relaxed max-w-xs">
          {statusText}
        </p>

        <div className="w-full bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs mb-8 space-y-3 text-left">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-neutral-400">Campus Network:</span>
            <span className="text-neutral-900 font-bold">Saint Louis University</span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-neutral-400">Encryption:</span>
            <span className="text-emerald-600 font-bold">1:1 Anonymous</span>
          </div>
        </div>

        <button
          onClick={handleCancel}
          className="px-6 py-3 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          Cancel & Return Home
        </button>
      </main>
    </div>
  );
}