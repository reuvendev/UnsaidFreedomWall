'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
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


const QUEUE_HEARTBEAT_INTERVAL = 10_000;
const QUEUE_OFFLINE_TIMEOUT = 30_000;

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
    let ownRoomRef: ReturnType<typeof doc> | null = null;
    let unsubscribeRoom: (() => void) | null = null;
    let unsubscribeQueue: (() => void) | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let cleanupTimeout: ReturnType<typeof setTimeout> | null = null;
    let shareModalTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;
    let scanning = false;
    let scanAgain = false;
    let queuePaused = false;
    let latestWaitingRooms: Array<{
      id: string;
      hostId: string;
      lastSeenAt: number;
    }> = [];

    const clearQueueTimers = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (cleanupTimeout) clearTimeout(cleanupTimeout);
      if (shareModalTimeout) clearTimeout(shareModalTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);
      if (countdownInterval) clearInterval(countdownInterval);
      heartbeatInterval = null;
      cleanupTimeout = null;
      shareModalTimeout = null;
      retryTimeout = null;
      countdownInterval = null;
    };

    // Never delete a matched room. Delete only an abandoned waiting room.
    const deleteWaitingRoom = async (roomRef: ReturnType<typeof doc>) => {
      return runTransaction(db, async (transaction) => {
        const snap = await transaction.get(roomRef);
        if (!snap.exists()) return false;
        const data = snap.data();
        if (data.status !== 'waiting' || data.guestId) return false;
        transaction.delete(roomRef);
        return true;
      });
    };

    const retryLater = (message: string, delayMs = 5000) => {
      if (!isMounted || hasHandledMatch || retryTimeout) return;
      setStatusText(message);
      retryTimeout = setTimeout(() => {
        retryTimeout = null;
        if (isMounted && !hasHandledMatch) {
          setRetryKey((value) => value + 1);
        }
      }, delayMs);
    };

    const setupMatchmaking = async () => {
      // Web Crypto is unavailable over ordinary HTTP LAN addresses on phones.
      // Do not create a room if it cannot later establish an E2EE session.
      if (!window.isSecureContext || !window.crypto?.subtle) {
        setStatusText(
          'Encrypted chat needs HTTPS. Open Tambayan using an HTTPS link on your phone.'
        );
        return;
      }

      let userId = localStorage.getItem(STREAK_USER_KEY);
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem(STREAK_USER_KEY, userId);
      }

      try {
        const banSnap = await getDoc(doc(db, 'bannedUsers', userId));
        if (!isMounted) return;
        if (banSnap.exists()) {
          setStatusText('Access denied: This account has been suspended.');
          alert('Your account has been suspended due to community guideline violations.');
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Error checking ban status:', error);
        // Preserve the existing behavior; secure bans must be enforced server-side.
      }

      if (!isMounted) return;
      const nickname = localStorage.getItem('unsaid_chat_nickname');
      const school = localStorage.getItem('unsaid_chat_school');
      if (!nickname || !school) {
        alert('Please set up your profile first.');
        router.push('/chat/setup');
        return;
      }

      let blockedUsers: string[] = [];
      try {
        const parsed = JSON.parse(localStorage.getItem('unsaid_chat_blocked') || '[]');
        blockedUsers = Array.isArray(parsed) ? parsed : [];
      } catch { /* Malformed local preference should not break matchmaking. */ }
      const recentMatches = getRecentMatches();
      const roomsRef = collection(db, 'chatRooms');
      let cachedStreak: number | null = null;

      const getStreak = async () => {
        if (cachedStreak !== null) return cachedStreak;
        try {
          cachedStreak = await updateUserStreak(userId);
        } catch (error) {
          console.error('Error updating streak:', error);
          cachedStreak = 1;
        }
        return cachedStreak;
      };

      const enterAsGuest = async (roomId: string, hostId: string) => {
        if (!isMounted || hasHandledMatch) return;
        hasHandledMatch = true;
        clearQueueTimers();
        unsubscribeQueue?.();
        unsubscribeRoom?.();
        addRecentMatch(hostId);
        // Claiming the other room has already succeeded. Clean up our unused
        // waiting room separately so a denied delete cannot undo the match.
        const abandonedRoom = ownRoomRef;
        ownRoomRef = null;
        if (abandonedRoom) {
          void deleteWaitingRoom(abandonedRoom).catch((error) => {
            console.warn('Could not clean up previous waiting room:', error);
          });
        }
        setCurrentRoomId(null);
        setShowShareModal(false);
        setStatusText('Match found! Entering secure chat...');

        // The count is only incremented for the person who claims the room.
        void setDoc(doc(db, 'counters', 'system'), {
          totalCreated: increment(1),
        }, { merge: true }).catch((error) => {
          console.error('Error updating system counter:', error);
        });
        router.push(`/chat/${roomId}`);
      };

      const enterAsHost = async (roomRef: ReturnType<typeof doc>, guestId: string) => {
        if (!isMounted || hasHandledMatch) return;
        hasHandledMatch = true;
        clearQueueTimers();
        unsubscribeQueue?.();
        unsubscribeRoom?.();
        addRecentMatch(guestId);
        setShowShareModal(false);
        setStatusText('Peer connected! Entering secure chat...');

        const streak = await getStreak();
        if (!isMounted) return;
        try {
          await updateDoc(roomRef, { hostStreak: streak });
        } catch (error) {
          console.error('Error saving streak to room:', error);
        }
        if (isMounted) router.push(`/chat/${roomRef.id}`);
      };

      const claimRoom = async (targetId: string, streak: number) => {
        const targetRef = doc(db, 'chatRooms', targetId);
        const myWaitingRoom = ownRoomRef;
        return runTransaction(db, async (transaction) => {
          // All transaction reads occur before any writes.
          const targetSnap = await transaction.get(targetRef);
          const ownSnap = myWaitingRoom
            ? await transaction.get(myWaitingRoom)
            : null;

          if (!targetSnap.exists()) return false;
          const target = targetSnap.data();
          const lastSeen = target.hostLastSeenAt?.toMillis?.() ?? 0;
          if (
            target.status !== 'waiting' ||
            target.guestId ||
            target.hostId === userId ||
            !lastSeen ||
            Date.now() - lastSeen > QUEUE_OFFLINE_TIMEOUT
          ) return false;

          // If both users created rooms simultaneously, one deterministic
          // ordering ensures that they join the SAME room, not each other.
          if (myWaitingRoom) {
            if (targetId >= myWaitingRoom.id) return false;
            if (!ownSnap?.exists()) return false;
            const own = ownSnap.data();
            if (own.status !== 'waiting' || own.guestId || own.hostId !== userId) {
              return false;
            }
          }

          transaction.update(targetRef, {
            guestId: userId,
            guestNickname: nickname,
            guestSchool: school,
            guestStreak: streak,
            guestLastSeenAt: serverTimestamp(),
            status: 'active',
          });
          // Do not delete our waiting room in the same transaction: some
          // Firestore rules permit claiming but reject deleting chat rooms.
          // Deleting in the transaction would roll back the match itself.
          return true;
        });
      };

      const createWaitingRoom = async () => {
        if (!isMounted || hasHandledMatch || ownRoomRef) return;
        setStatusText('Waiting for someone to join...');
        const roomRef = await addDoc(roomsRef, {
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
          // Essential: without the first heartbeat, other devices consider
          // a newly created room offline for its first ten seconds.
          hostLastSeenAt: serverTimestamp(),
        });

        if (!isMounted || hasHandledMatch) {
          void deleteWaitingRoom(roomRef).catch(console.error);
          return;
        }

        ownRoomRef = roomRef;
        setCurrentRoomId(roomRef.id);

        unsubscribeRoom = onSnapshot(roomRef, (snap) => {
          if (!isMounted || hasHandledMatch) return;
          if (!snap.exists()) {
            if (queuePaused) return;
            retryLater('Waiting room expired. Reconnecting...', 1500);
            return;
          }
          const room = snap.data();
          if (room.status === 'active' && room.guestId) {
            void enterAsHost(roomRef, room.guestId);
          }
        }, (error) => {
          console.error('Waiting room listener error:', error);
          retryLater('Connection lost. Retrying...');
        });

        heartbeatInterval = setInterval(() => {
          if (!isMounted || hasHandledMatch) return;
          void updateDoc(roomRef, {
            hostLastSeenAt: serverTimestamp(),
          }).catch((error) => console.warn('Queue heartbeat failed:', error));
        }, QUEUE_HEARTBEAT_INTERVAL);

        shareModalTimeout = setTimeout(() => {
          if (isMounted && !hasHandledMatch) setShowShareModal(true);
        }, 60_000);

        cleanupTimeout = setTimeout(async () => {
          if (!isMounted || hasHandledMatch) return;
          queuePaused = true;
          try {
            const deleted = await deleteWaitingRoom(roomRef);
            if (!isMounted || hasHandledMatch) return;
            if (!deleted) {
              queuePaused = false;
              return;
            }
            ownRoomRef = null;
            setCurrentRoomId(null);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            heartbeatInterval = null;
            if (unsubscribeRoom) unsubscribeRoom();
            unsubscribeRoom = null;
            let remaining = 5;
            setStatusText(`Queue timed out. Re-queueing in ${remaining}s...`);
            countdownInterval = setInterval(() => {
              remaining -= 1;
              if (remaining > 0) {
                setStatusText(`Queue timed out. Re-queueing in ${remaining}s...`);
              } else {
                if (countdownInterval) clearInterval(countdownInterval);
                countdownInterval = null;
                if (isMounted) setRetryKey((value) => value + 1);
              }
            }, 1000);
          } catch (error) {
            console.error('Queue timeout cleanup failed:', error);
            queuePaused = false;
            retryLater('Could not refresh queue. Retrying...');
          }
        }, 180_000);
      };

      // Queue updates are live: two devices that BOTH initially see an empty
      // queue can still find each other after they create their rooms.
      const processQueue = async () => {
        if (scanning) {
          scanAgain = true;
          return;
        }
        scanning = true;
        try {
          do {
            scanAgain = false;
            if (!isMounted || hasHandledMatch || queuePaused) return;

            // Firestore document IDs provide a stable tie-break across devices.
            // Only the larger ID may claim the smaller ID's waiting room.
            const candidates = [...latestWaitingRooms].sort((a, b) =>
              a.id < b.id ? -1 : a.id > b.id ? 1 : 0
            );
            let claimError: string | null = null;
            for (const candidate of candidates) {
              if (!isMounted || hasHandledMatch) return;
              if (
                candidate.hostId === userId ||
                blockedUsers.includes(candidate.hostId) ||
                recentMatches.includes(candidate.hostId) ||
                (ownRoomRef && candidate.id >= ownRoomRef.id) ||
                !candidate.lastSeenAt ||
                Date.now() - candidate.lastSeenAt > QUEUE_OFFLINE_TIMEOUT
              ) continue;

              setStatusText('Match found! Connecting...');
              const streak = await getStreak();
              if (!isMounted || hasHandledMatch) return;
              try {
                if (await claimRoom(candidate.id, streak)) {
                  await enterAsGuest(candidate.id, candidate.hostId);
                  return;
                }
              } catch (error) {
                console.warn('Could not claim waiting room:', error);
                const code = error && typeof error === 'object' && 'code' in error
                  ? String(error.code) : 'unknown';
                claimError = code;
              }
            }

            if (!ownRoomRef && !hasHandledMatch) {
              await createWaitingRoom();
            } else if (ownRoomRef && !hasHandledMatch) {
              setStatusText(claimError === 'permission-denied'
                ? 'Match blocked by Firestore permissions. Check browser console.'
                : claimError
                  ? `Match could not connect (${claimError}). Check browser console.`
                  : 'Waiting for someone to join...');
            }
          } while (scanAgain && isMounted && !hasHandledMatch && !queuePaused);
        } catch (error) {
          console.error('Queue matchmaking error:', error);
          retryLater('Connection error. Retrying in 5s...');
        } finally {
          scanning = false;
        }
      };

      setStatusText('Scanning for available chatmates...');
      unsubscribeQueue = onSnapshot(
        query(roomsRef, where('status', '==', 'waiting')),
        (snapshot) => {
          if (!isMounted || hasHandledMatch) return;
          latestWaitingRooms = snapshot.docs.map((entry) => {
            const room = entry.data();
            return {
              id: entry.id,
              hostId: String(room.hostId || ''),
              lastSeenAt: room.hostLastSeenAt?.toMillis?.() ?? 0,
            };
          });
          void processQueue();
        },
        (error) => {
          console.error('Queue listener failed:', error);
          retryLater('Unable to load queue. Retrying in 5s...');
        }
      );
    };

    void setupMatchmaking();

    return () => {
      isMounted = false;
      unsubscribeQueue?.();
      unsubscribeRoom?.();
      clearQueueTimers();
      // Remove only waiting rooms on cancellation/navigation; active chats stay.
      if (ownRoomRef && !hasHandledMatch) {
        void deleteWaitingRoom(ownRoomRef).catch((error) => {
          console.warn('Could not remove abandoned queue room:', error);
        });
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