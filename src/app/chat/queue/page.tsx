'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, 
  getDocs, getDoc, query, where, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Icons = {
  Loader: () => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
  )
};

export default function ChatQueuePage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState('Initializing secure matchmaking...');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeRoom: (() => void) | null = null;
    let cleanupTimeout: NodeJS.Timeout | null = null;

    const setupMatchmaking = async () => {
      let userId = localStorage.getItem('unsaid_chat_user_id');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('unsaid_chat_user_id', userId);
      }

      // 1. Check if user is globally banned by an admin
      try {
        const banSnap = await getDoc(doc(db, "bannedUsers", userId));
        if (banSnap.exists()) {
          if (!isMounted) return;
          setStatusText('Access Denied: Your account has been globally banned.');
          alert('Your account has been suspended due to community guideline violations.');
          router.push('/');
          return;
        }
      } catch (err) {
        console.error("Error checking ban status:", err);
      }

      const nickname = localStorage.getItem('unsaid_chat_nickname');
      const school = localStorage.getItem('unsaid_chat_school');

      if (!nickname || !school) {
        alert('Please set up your profile first.');
        router.push('/chat/setup');
        return;
      }

      const blockedUsers: string[] = JSON.parse(localStorage.getItem('unsaid_chat_blocked') || '[]');

      setStatusText('Scanning for available chatmates...');

      try {
        const roomsRef = collection(db, "chatRooms");
        const q = query(roomsRef, where("status", "==", "waiting"));

        const snapshot = await getDocs(q);
        let matchedRoomId: string | null = null;

        const waitingRooms = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as any[];

        waitingRooms.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeA - timeB;
        });

        // 2. Find a room to join as a guest (ensuring host isn't blocked)
        for (const roomData of waitingRooms) {
          const hostId = roomData.hostId;

          // Skip own rooms or blocked hosts
          if (hostId === userId || blockedUsers.includes(hostId)) {
            continue;
          }

          const createdAt = roomData.createdAt?.toDate ? roomData.createdAt.toDate() : new Date();
          const isStale = (Date.now() - createdAt.getTime()) > 60000;
          if (isStale) {
            await deleteDoc(doc(db, "chatRooms", roomData.id)).catch(() => {});
            continue;
          }

          matchedRoomId = roomData.id;
          break;
        }

        if (!isMounted) return;

        if (matchedRoomId) {
          setStatusText('Match found! Connecting to secure room...');
          const roomRef = doc(db, "chatRooms", matchedRoomId);
          
          await updateDoc(roomRef, {
            guestId: userId,
            guestNickname: nickname,
            guestSchool: school,
            status: 'active'
          });

          router.push(`/chat/${matchedRoomId}`);
        } else {
          // 3. Create our own waiting room
          setStatusText('No match found instantly. Waiting for someone to join...');
          
          const newRoomRef = await addDoc(collection(db, "chatRooms"), {
            hostId: userId,
            hostNickname: nickname,
            hostSchool: school,
            guestId: null,
            guestNickname: null,
            guestSchool: null,
            status: 'waiting',
            createdAt: serverTimestamp(),
          });

          if (!isMounted) return;
          setCurrentRoomId(newRoomRef.id);

          // Real-time listener: Check if a guest joins
          unsubscribeRoom = onSnapshot(newRoomRef, async (docSnap) => {
            if (!isMounted) return;
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.status === 'active' && data.guestId) {
                // STRICT BLOCK CHECK: If a blocked user tries to join your room, delete it entirely
                if (blockedUsers.includes(data.guestId)) {
                  setStatusText('Skipped blocked user. Re-queueing...');
                  try {
                    await deleteDoc(newRoomRef);
                  } catch (e) {}
                  
                  setTimeout(() => {
                    if (isMounted) window.location.reload();
                  }, 1000);
                  return;
                }

                setStatusText('Peer connected! Entering chat...');
                router.push(`/chat/${newRoomRef.id}`);
              }
            }
          });

          cleanupTimeout = setTimeout(async () => {
            if (isMounted) {
              try {
                await deleteDoc(doc(db, "chatRooms", newRoomRef.id));
              } catch (e) {}
              setStatusText('Queue timed out. Click below to try again.');
              setCurrentRoomId(null);
            }
          }, 45000);
        }
      } catch (err) {
        console.error("Queue matchmaking error:", err);
        if (isMounted) {
          setStatusText('Connection error. Please try again.');
        }
      }
    };

    setupMatchmaking();

    return () => {
      isMounted = false;
      if (unsubscribeRoom) unsubscribeRoom();
      if (cleanupTimeout) clearTimeout(cleanupTimeout);
    };
  }, [router]);

  const handleCancel = async () => {
    if (currentRoomId) {
      try {
        await deleteDoc(doc(db, "chatRooms", currentRoomId));
      } catch (e) {
        console.error("Error cleaning up room on cancel:", e);
      }
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/85">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            TAMBAYAN<span className="text-emerald-600">.</span>
          </Link>
          <span className="font-mono text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
            Matchmaking Queue
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-20 w-full flex-1 flex flex-col items-center justify-center text-center space-y-8">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-emerald-500/10 rounded-full animate-ping"></div>
          <div className="relative w-20 h-20 bg-white border border-neutral-200 rounded-2xl shadow-sm flex items-center justify-center text-emerald-600">
            <Icons.Loader />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Finding your match
          </h1>
          <p className="font-mono text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
            {statusText}
          </p>
        </div>

        <div className="w-full pt-4">
          <button
            onClick={handleCancel}
            className="w-full py-3.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            Cancel & Return Home
          </button>
        </div>
      </main>
    </div>
  );
}