'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  setDoc,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Icons = {
  Loader: () => (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
  ),

  Sun: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),

  Moon: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
};

// Helper function to get recent matches and clean up entries older than 24 hours
function getRecentMatches(): string[] {
  try {
    const raw = localStorage.getItem('unsaid_chat_recent_matches');
    if (!raw) return [];

    const data: { id: string; timestamp: number }[] = JSON.parse(raw);
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    const validMatches = data.filter(
      (item) => now - item.timestamp < TWENTY_FOUR_HOURS
    );

    localStorage.setItem(
      'unsaid_chat_recent_matches',
      JSON.stringify(validMatches)
    );

    return validMatches.map((item) => item.id);
  } catch (e) {
    return [];
  }
}

// Helper function to add a new match to the 24-hour exclusion list
function addRecentMatch(peerId: string) {
  try {
    const raw = localStorage.getItem('unsaid_chat_recent_matches');
    const data: { id: string; timestamp: number }[] = raw
      ? JSON.parse(raw)
      : [];

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    const filtered = data.filter(
      (item) =>
        now - item.timestamp < TWENTY_FOUR_HOURS &&
        item.id !== peerId
    );

    filtered.push({
      id: peerId,
      timestamp: now,
    });

    localStorage.setItem(
      'unsaid_chat_recent_matches',
      JSON.stringify(filtered)
    );
  } catch (e) {}
}

export default function ChatQueuePage() {
  const router = useRouter();

  const [statusText, setStatusText] = useState(
    'Initializing secure matchmaking...'
  );

  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const [retryKey, setRetryKey] = useState<number>(0);

  // Initialize Dark Mode state
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');

      if (storedTheme) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        setIsDarkMode(true);
      }
    } catch (e) {}
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;

    setIsDarkMode(nextMode);

    try {
      localStorage.setItem(
        'unsaid_dark_mode',
        JSON.stringify(nextMode)
      );
    } catch (e) {}
  };

  // Matchmaking Effect
  useEffect(() => {
    let isMounted = true;

    let unsubscribeRoom: (() => void) | null = null;

    let cleanupTimeout: NodeJS.Timeout | null = null;

    let countdownInterval: NodeJS.Timeout | null = null;

    const setupMatchmaking = async () => {
      let userId = localStorage.getItem(
        'unsaid_chat_user_id'
      );

      if (!userId) {
        userId =
          'user_' +
          Math.random().toString(36).substring(2, 11);

        localStorage.setItem(
          'unsaid_chat_user_id',
          userId
        );
      }

      try {
        const banSnap = await getDoc(
          doc(db, 'bannedUsers', userId)
        );

        if (banSnap.exists()) {
          if (!isMounted) return;

          setStatusText(
            'Access Denied: Your account has been globally banned.'
          );

          alert(
            'Your account has been suspended due to community guideline violations.'
          );

          router.push('/');

          return;
        }
      } catch (err) {
        console.error(
          'Error checking ban status:',
          err
        );
      }

      const nickname = localStorage.getItem(
        'unsaid_chat_nickname'
      );

      const school = localStorage.getItem(
        'unsaid_chat_school'
      );

      if (!nickname || !school) {
        alert(
          'Please set up your profile first.'
        );

        router.push('/chat/setup');

        return;
      }

      const blockedUsers: string[] = JSON.parse(
        localStorage.getItem(
          'unsaid_chat_blocked'
        ) || '[]'
      );

      const recentMatches = getRecentMatches();

      setStatusText(
        'Scanning for available chatmates...'
      );

      try {
        const roomsRef = collection(
          db,
          'chatRooms'
        );

        const q = query(
          roomsRef,
          where('status', '==', 'waiting')
        );

        const snapshot = await getDocs(q);

        let matchedRoomId: string | null = null;

        let matchedHostId: string | null = null;

        const waitingRooms = snapshot.docs.map(
          (docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })
        ) as any[];

        waitingRooms.sort((a, b) => {
          const timeA = a.createdAt?.toMillis
            ? a.createdAt.toMillis()
            : 0;

          const timeB = b.createdAt?.toMillis
            ? b.createdAt.toMillis()
            : 0;

          return timeA - timeB;
        });

        // Skip own rooms, blocked users,
        // and anyone matched within the last 24 hours
        for (const roomData of waitingRooms) {
          const hostId = roomData.hostId;

          if (
            hostId === userId ||
            blockedUsers.includes(hostId) ||
            recentMatches.includes(hostId)
          ) {
            continue;
          }

          const createdAt =
            roomData.createdAt?.toDate
              ? roomData.createdAt.toDate()
              : new Date();

          const isStale =
            Date.now() - createdAt.getTime() >
            60000;

          if (isStale) {
            await deleteDoc(
              doc(
                db,
                'chatRooms',
                roomData.id
              )
            ).catch(() => {});

            continue;
          }

          matchedRoomId = roomData.id;
          matchedHostId = hostId;

          break;
        }

        if (!isMounted) return;

        // Immediate match found
        if (
          matchedRoomId &&
          matchedHostId
        ) {
          setStatusText(
            'Match found! Connecting to secure room...'
          );

          const roomRef = doc(
            db,
            'chatRooms',
            matchedRoomId
          );

          await updateDoc(roomRef, {
            guestId: userId,
            guestNickname: nickname,
            guestSchool: school,
            status: 'active',
          });

          // Add to 24-hour exclusion list
          addRecentMatch(
            matchedHostId
          );

          try {
            await setDoc(
              doc(
                db,
                'counters',
                'system'
              ),
              {
                totalCreated: increment(1),
              },
              { merge: true }
            );
          } catch (e) {
            console.error(
              'Error updating system counter:',
              e
            );
          }

          router.push(
            `/chat/${matchedRoomId}`
          );
        } else {
          setStatusText(
            'No match found instantly. Waiting for someone to join...'
          );

          const newRoomRef = await addDoc(
            collection(db, 'chatRooms'),
            {
              hostId: userId,
              hostNickname: nickname,
              hostSchool: school,
              guestId: null,
              guestNickname: null,
              guestSchool: null,
              status: 'waiting',
              createdAt: serverTimestamp(),
            }
          );

          if (!isMounted) return;

          setCurrentRoomId(
            newRoomRef.id
          );

          unsubscribeRoom = onSnapshot(
            newRoomRef,
            async (docSnap) => {
              if (!isMounted) return;

              if (docSnap.exists()) {
                const data =
                  docSnap.data();

                if (
                  data.status === 'active' &&
                  data.guestId
                ) {
                  // Check if guest is blocked
                  // or matched within the last 24 hours
                  if (
                    blockedUsers.includes(
                      data.guestId
                    ) ||
                    recentMatches.includes(
                      data.guestId
                    )
                  ) {
                    setStatusText(
                      'Skipped recent match. Re-queueing...'
                    );

                    try {
                      await deleteDoc(
                        newRoomRef
                      );
                    } catch (e) {}

                    setTimeout(() => {
                      if (isMounted) {
                        setRetryKey(
                          (prev) =>
                            prev + 1
                        );
                      }
                    }, 1000);

                    return;
                  }

                  // Add to 24-hour exclusion list
                  addRecentMatch(
                    data.guestId
                  );

                  setStatusText(
                    'Peer connected! Entering chat...'
                  );

                  router.push(
                    `/chat/${newRoomRef.id}`
                  );
                }
              }
            }
          );

          // Queue lasts 3 minutes
          cleanupTimeout = setTimeout(
            async () => {
              if (isMounted) {
                try {
                  await deleteDoc(
                    doc(
                      db,
                      'chatRooms',
                      newRoomRef.id
                    )
                  );
                } catch (e) {}

                setCurrentRoomId(
                  null
                );

                // Start 5-second countdown
                let timeLeft = 5;

                setStatusText(
                  `Queue timed out. Re-queueing in ${timeLeft}s...`
                );

                countdownInterval =
                  setInterval(() => {
                    timeLeft -= 1;

                    if (timeLeft > 0) {
                      if (isMounted) {
                        setStatusText(
                          `Queue timed out. Re-queueing in ${timeLeft}s...`
                        );
                      }
                    } else {
                      if (
                        countdownInterval
                      ) {
                        clearInterval(
                          countdownInterval
                        );
                      }

                      if (isMounted) {
                        setRetryKey(
                          (prev) =>
                            prev + 1
                        );
                      }
                    }
                  }, 1000);
              }
            },
            180000
          );
        }
      } catch (err) {
        console.error(
          'Queue matchmaking error:',
          err
        );

        if (isMounted) {
          setStatusText(
            'Connection error. Retrying in 5s...'
          );

          let timeLeft = 5;

          countdownInterval =
            setInterval(() => {
              timeLeft -= 1;

              if (timeLeft > 0) {
                if (isMounted) {
                  setStatusText(
                    `Connection error. Retrying in ${timeLeft}s...`
                  );
                }
              } else {
                if (
                  countdownInterval
                ) {
                  clearInterval(
                    countdownInterval
                  );
                }

                if (isMounted) {
                  setRetryKey(
                    (prev) => prev + 1
                  );
                }
              }
            }, 1000);
        }
      }
    };

    setupMatchmaking();

    return () => {
      isMounted = false;

      if (unsubscribeRoom) {
        unsubscribeRoom();
      }

      if (cleanupTimeout) {
        clearTimeout(
          cleanupTimeout
        );
      }

      if (countdownInterval) {
        clearInterval(
          countdownInterval
        );
      }
    };
  }, [router, retryKey]);

  const handleCancel = async () => {
    if (currentRoomId) {
      try {
        await deleteDoc(
          doc(
            db,
            'chatRooms',
            currentRoomId
          )
        );
      } catch (e) {
        console.error(
          'Error cleaning up room on cancel:',
          e
        );
      }
    }

    router.push('/');
  };

  return (
    <div
      className={`min-h-screen font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800'
            : 'bg-white/95 border-neutral-200/85'
        }`}
      >
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-xl font-black tracking-tighter hover:opacity-70"
          >
            TAMBAYAN
            <span className="text-emerald-600">
              .
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle Dark Mode"
              className={`p-2 rounded-xl border cursor-pointer ${
                isDarkMode
                  ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {isDarkMode ? (
                <Icons.Sun />
              ) : (
                <Icons.Moon />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-12 w-full flex-1 flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-emerald-500/10 rounded-full animate-ping"></div>

          <div
            className={`relative w-20 h-20 border rounded-2xl shadow-sm flex items-center justify-center ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800 text-emerald-400'
                : 'bg-white border-neutral-200 text-emerald-600'
            }`}
          >
            <Icons.Loader />
          </div>
        </div>

        <div className="space-y-3">
          <h1
            className={`text-2xl font-extrabold tracking-tight ${
              isDarkMode
                ? 'text-white'
                : 'text-neutral-900'
            }`}
          >
            Finding your match
          </h1>

          <p
            className={`font-mono text-xs max-w-xs mx-auto leading-relaxed ${
              isDarkMode
                ? 'text-neutral-400'
                : 'text-neutral-500'
            }`}
          >
            {statusText}
          </p>
        </div>

        <div className="w-full pt-2">
          <button
            onClick={handleCancel}
            className={`w-full py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-2xs cursor-pointer active:scale-98 border ${
              isDarkMode
                ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800'
                : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
            }`}
          >
            Cancel & Return Home
          </button>
        </div>
      </main>
    </div>
  );
}