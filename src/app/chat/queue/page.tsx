'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  setDoc,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const STREAK_USER_KEY = 'unsaid_chat_user_id';

const Icons = {
  Loader: () => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
  ),
  Sun: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
};

function getPhilippineDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getYesterday(date: string): string {
  const [year, month, day] = date.split('-').map(Number);

  const yesterday = new Date(
    Date.UTC(year, month - 1, day - 1)
  );

  return yesterday.toISOString().split('T')[0];
}

async function updateUserStreak(userId: string): Promise<number> {
  const userRef = doc(db, 'users', userId);
  const today = getPhilippineDate();

  return await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      transaction.set(userRef, {
        streak: {
          current: 1,
          longest: 1,
          lastActiveDate: today,
        },
      });

      return 1;
    }

    const userData = userSnapshot.data();
    const existingStreak = userData.streak;

    if (!existingStreak) {
      transaction.update(userRef, {
        streak: {
          current: 1,
          longest: 1,
          lastActiveDate: today,
        },
      });

      return 1;
    }

    if (existingStreak.lastActiveDate === today) {
      return existingStreak.current || 1;
    }

    const yesterday = getYesterday(today);
    let newCurrent = 1;

    if (existingStreak.lastActiveDate === yesterday) {
      newCurrent = (existingStreak.current || 0) + 1;
    }

    const newLongest = Math.max(
      existingStreak.longest || 0,
      newCurrent
    );

    transaction.update(userRef, {
      'streak.current': newCurrent,
      'streak.longest': newLongest,
      'streak.lastActiveDate': today,
    });

    return newCurrent;
  });
}

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
  const [showShareModal, setShowShareModal] = useState(false);

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

  useEffect(() => {
    let isMounted = true;
    let hasHandledMatch = false;

    let unsubscribeRoom: (() => void) | null = null;
    let cleanupTimeout: NodeJS.Timeout | null = null;
    let countdownInterval: NodeJS.Timeout | null = null;
    let shareModalTimeout: NodeJS.Timeout | null = null;

    const setupMatchmaking = async () => {
      let userId = localStorage.getItem(STREAK_USER_KEY);

      if (!userId) {
        userId =
          'user_' +
          Math.random().toString(36).substring(2, 11);

        localStorage.setItem(
          STREAK_USER_KEY,
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
            180000;

          if (isStale) {
            const staleRoomRef = doc(
              db,
              'chatRooms',
              roomData.id
            );

            try {
              await runTransaction(
                db,
                async (transaction) => {
                  const latest =
                    await transaction.get(staleRoomRef);

                  if (!latest.exists()) return;

                  const latestData = latest.data();

                  if (
                    latestData.status === 'waiting' &&
                    !latestData.guestId
                  ) {
                    transaction.delete(staleRoomRef);
                  }
                }
              );
            } catch (error) {
              console.error(
                'Stale cleanup failed:',
                error
              );
            }

            continue;
          }

          matchedRoomId = roomData.id;
          matchedHostId = hostId;

          break;
        }

        if (!isMounted) return;

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

          let currentStreak = 1;

          try {
            currentStreak =
              await updateUserStreak(userId);
          } catch (streakError) {
            console.error(
              'Error updating streak:',
              streakError
            );
          }

          let claimedRoom = false;

          try {
            claimedRoom = await runTransaction(
              db,
              async (transaction) => {
                const roomSnap =
                  await transaction.get(roomRef);

                if (!roomSnap.exists()) {
                  return false;
                }

                const roomData = roomSnap.data();

                if (
                  roomData.status !== 'waiting' ||
                  roomData.guestId
                ) {
                  return false;
                }

                transaction.update(roomRef, {
                  guestId: userId,
                  guestNickname: nickname,
                  guestSchool: school,
                  guestStreak: currentStreak,
                  status: 'active',
                });

                return true;
              }
            );
          } catch (error) {
            console.error(
              'Failed to claim room:',
              error
            );
          }

          if (!claimedRoom) {
            setStatusText(
              'Someone got there first. Finding another match...'
            );

            setTimeout(() => {
              if (isMounted) {
                setRetryKey((prev) => prev + 1);
              }
            }, 500);

            return;
          }

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
              hostStreak: null,
              guestId: null,
              guestNickname: null,
              guestSchool: null,
              guestStreak: null,
              status: 'waiting',
              createdAt: serverTimestamp(),
            }
          );

          if (!isMounted) return;

          setCurrentRoomId(
            newRoomRef.id
          );

          shareModalTimeout = setTimeout(() => {
            if (isMounted) {
              setShowShareModal(true);
            }
          }, 60000);

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
                  if (hasHandledMatch) return;

                  hasHandledMatch = true;

                  if (cleanupTimeout) {
                    clearTimeout(cleanupTimeout);
                    cleanupTimeout = null;
                  }

                  if (shareModalTimeout) {
                    clearTimeout(shareModalTimeout);
                    shareModalTimeout = null;
                  }

                  if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                  }

                  setShowShareModal(false);

                  let currentStreak = 1;

                  try {
                    currentStreak =
                      await updateUserStreak(userId);
                  } catch (streakError) {
                    console.error(
                      'Error updating streak:',
                      streakError
                    );
                  }

                  try {
                    await updateDoc(
                      newRoomRef,
                      {
                        hostStreak:
                          currentStreak,
                      }
                    );
                  } catch (streakRoomError) {
                    console.error(
                      'Error saving streak to room:',
                      streakRoomError
                    );
                  }

                  addRecentMatch(
                    data.guestId
                  );

                  setStatusText(
                    'Peer connected! Entering chat...'
                  );

                  setShowShareModal(false);

                  router.push(
                    `/chat/${newRoomRef.id}`
                  );
                }
              }
            }
          );

        cleanupTimeout = setTimeout(
          async () => {
            if (!isMounted) return;

            let roomWasDeleted = false;

            try {
              await runTransaction(
                db,
                async (transaction) => {
                  const latest =
                    await transaction.get(newRoomRef);

                  if (!latest.exists()) {
                    return;
                  }

                  const data = latest.data();

                  // Only delete if the room is STILL waiting.
                  if (
                    data.status === 'waiting' &&
                    !data.guestId
                  ) {
                    transaction.delete(newRoomRef);
                    roomWasDeleted = true;
                  }
                }
              );
            } catch (error) {
              console.error(
                'Queue timeout cleanup failed:',
                error
              );

              return;
            }

            // If someone already joined, do nothing.
            if (!roomWasDeleted) {
              return;
            }

            if (!isMounted) return;

            setCurrentRoomId(null);

            let timeLeft = 5;

            setStatusText(
              `Queue timed out. Re-queueing in ${timeLeft}s...`
            );

            countdownInterval = setInterval(() => {
              timeLeft -= 1;

              if (timeLeft > 0) {
                if (isMounted) {
                  setStatusText(
                    `Queue timed out. Re-queueing in ${timeLeft}s...`
                  );
                }
              } else {
                if (countdownInterval) {
                  clearInterval(countdownInterval);
                  countdownInterval = null;
                }

                if (isMounted) {
                  setRetryKey((prev) => prev + 1);
                }
              }
            }, 1000);
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

      if (shareModalTimeout) {
        clearTimeout(shareModalTimeout);
      }
    };
  }, [router, retryKey]);

  const handleShare = async () => {
    const shareData = {
      title: 'Tambayan SLU',
      text: 'Tara sa Tambayan! Join the anonymous chat for Louisians.',
      url: 'https://tambayanslu.com/',
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copied!');
      }
    } catch (error) {
      // User cancelled sharing
    }
  };

  const handleCancel = async () => {
    if (currentRoomId) {
      const roomRef = doc(
        db,
        'chatRooms',
        currentRoomId
      );

      try {
        await runTransaction(
          db,
          async (transaction) => {
            const roomSnap =
              await transaction.get(roomRef);

            if (!roomSnap.exists()) {
              return;
            }

            const data = roomSnap.data();

            // Only delete an unmatched waiting room.
            if (
              data.status === 'waiting' &&
              !data.guestId
            ) {
              transaction.delete(roomRef);
            }
          }
        );
      } catch (error) {
        console.error(
          'Error cleaning up room on cancel:',
          error
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
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm rounded-2xl border p-6 text-left shadow-2xl ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-white border-neutral-200'
            }`}
          >
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              Still queueing...
            </p>

            <h2
              className={`text-xl font-extrabold ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              How about sharing Tambayan?
            </h2>

            <p
              className={`mt-2 text-sm leading-relaxed ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              While waiting, invite your friends or share Tambayan to your groups.
              More people online means more chances to find a chatmate.
            </p>

            <div className="mt-5 space-y-2">
              <button
                onClick={handleShare}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-700 active:scale-[0.98]"
              >
                Share Tambayan
              </button>

              <button
                onClick={() => setShowShareModal(false)}
                className={`w-full rounded-xl px-4 py-3 font-mono text-xs font-bold ${
                  isDarkMode
                    ? 'text-neutral-400 hover:bg-neutral-800'
                    : 'text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                Maybe later
              </button>
            </div>

            <p
              className={`mt-4 text-center font-mono text-[10px] ${
                isDarkMode ? 'text-neutral-600' : 'text-neutral-400'
              }`}
            >
              You're still in the queue while this is open.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}