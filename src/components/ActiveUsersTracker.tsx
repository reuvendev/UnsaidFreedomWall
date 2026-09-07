'use client';

import { useEffect, useState } from 'react';
import { doc, setDoc, serverTimestamp, onSnapshot, collection, query, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ActiveUsersTracker() {
  const [activeCount, setActiveCount] = useState<number>(1);

  useEffect(() => {
    const sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
    const presenceRef = doc(db, 'activePresence', sessionId);

    const updatePresence = async () => {
      try {
        await setDoc(presenceRef, {
          lastSeen: serverTimestamp(),
        }, { merge: true });
      } catch (err) {}
    };

    updatePresence();
    const heartbeatInterval = setInterval(updatePresence, 30000);

    const handleUnload = () => {
      deleteDoc(presenceRef).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);

    const presenceQuery = query(collection(db, 'activePresence'));
    const unsubscribePresence = onSnapshot(presenceQuery, (snapshot) => {
      const now = Date.now();
      let count = 0;
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.lastSeen) {
          const lastSeenTime = data.lastSeen.toMillis ? data.lastSeen.toMillis() : new Date(data.lastSeen).getTime();
          if (now - lastSeenTime < 60000) {
            count++;
          }
        }
      });

      setActiveCount(Math.max(1, count));
    }, (error) => {
      console.error("Presence snapshot error:", error);
    });

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleUnload);
      deleteDoc(presenceRef).catch(() => {});
      unsubscribePresence();
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider border bg-white border-neutral-200 text-neutral-800 shadow-sm">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span><strong>{activeCount}</strong> online</span>
    </div>
  );
}