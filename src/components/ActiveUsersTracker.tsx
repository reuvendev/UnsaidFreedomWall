'use client';

import { useEffect, useState } from 'react';
import { doc, setFieldValue, serverTimestamp, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ActiveUsersTracker() {
  const [activeCount, setActiveCount] = useState<number>(1);

  useEffect(() => {
    // Generate a unique session ID for this browser tab
    const sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
    const presenceRef = doc(db, 'activePresence', sessionId);

    // 1. Register presence on mount
    const updatePresence = async () => {
      try {
        await setFieldValue(presenceRef, {
          lastSeen: serverTimestamp(),
        });
      } catch (err) {
        // Fallback or handle error silently if offline
      }
    };

    updatePresence();

    // 2. Heartbeat interval to keep the session alive every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    // 3. Remove presence doc cleanly when user leaves or closes tab
    const handleUnload = () => {
      deleteDoc(presenceRef).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);

    // 4. Listen to active sessions (users active in the last 60 seconds)
    // Note: For a production-ready query, you can count documents where lastSeen > (now - 60s)
    const presenceQuery = query(collection(db, 'activePresence'));
    const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
      const now = Date.now();
      let count = 0;
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.lastSeen) {
          const lastSeenTime = data.lastSeen.toMillis ? data.lastSeen.toMillis() : new Date(data.lastSeen).getTime();
          // Consider active if they pinged within the last 60 seconds
          if (now - lastSeenTime < 60000) {
            count++;
          }
        }
      });

      setActiveCount(Math.max(1, count)); // Always show at least 1 (the current user)
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      deleteDoc(presenceRef).catch(() => {});
      unsubscribe();
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-[11px] border bg-neutral-900/40 border-neutral-800 text-neutral-300">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span><strong className="text-white">{activeCount}</strong> online now</span>
    </div>
  );
}