'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const STREAK_STORAGE_KEY = 'unsaid_chat_user_id';

const STREAK_MILESTONES = [
  { days: 1, title: 'Enrolled' },
  { days: 3, title: 'Good Standing' },
  { days: 7, title: 'Academic Scholar' },
  { days: 14, title: "Dean's Lister" },
  { days: 30, title: 'Cum Laude' },
  { days: 60, title: 'Magna Cum Laude' },
  { days: 100, title: 'Summa Cum Laude' },
];

interface StreakData {
  current: number;
  longest: number;
  lastActiveDate: string | null;
}

const getAnonymousUserId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(STREAK_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to get anonymous user ID:', error);
    return null;
  }
};

const getPhilippineDate = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

const getDateDifference = (date1: string, date2: string): number => {
  const first = new Date(`${date1}T00:00:00`);
  const second = new Date(`${date2}T00:00:00`);

  return Math.round(
    (second.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
  );
};

const getEffectiveStreak = (streakData: StreakData): number => {
  if (!streakData.lastActiveDate) {
    return 0;
  }

  const today = getPhilippineDate();
  const difference = getDateDifference(streakData.lastActiveDate, today);

  if (difference <= 1) {
    return streakData.current;
  }

  return 0;
};

const getStreakMilestone = (streak: number) => {
  let currentMilestone = STREAK_MILESTONES[0];

  for (const milestone of STREAK_MILESTONES) {
    if (streak >= milestone.days) {
      currentMilestone = milestone;
    } else {
      break;
    }
  }

  return currentMilestone;
};

const Icons = {
  MessageSquare: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  ),

  Close: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),

  Users: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),

  Coffee: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
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

  Flame: () => (
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
      <path d="M12 3c.5 3.5-2 5.5-2 8a2 2 0 0 0 4 0c0-1.5-.5-2.5-1-3.5C16 9 18 12 18 15a6 6 0 0 1-12 0c0-4 2.5-6.5 6-12Z" />
    </svg>
  ),
};

export default function HomePage() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [streak, setStreak] = useState<StreakData>({
    current: 0,
    longest: 0,
    lastActiveDate: null,
  });
  const [streakLoading, setStreakLoading] = useState<boolean>(true);
  const [streakDetailsOpen, setStreakDetailsOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');

      if (storedTheme !== null) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        setIsDarkMode(true);
      }
    } catch (error) {
      console.error('Failed to load dark mode:', error);
    }
  }, []);

  useEffect(() => {
    const loadStreak = async () => {
      const anonymousUserId = getAnonymousUserId();

      if (!anonymousUserId) {
        setStreak({
          current: 0,
          longest: 0,
          lastActiveDate: null,
        });
        setStreakLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', anonymousUserId);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const data = userSnapshot.data();
          const streakData = data.streak || {};

          setStreak({
            current:
              typeof streakData.current === 'number' ? streakData.current : 0,
            longest:
              typeof streakData.longest === 'number' ? streakData.longest : 0,
            lastActiveDate:
              typeof streakData.lastActiveDate === 'string'
                ? streakData.lastActiveDate
                : null,
          });
        } else {
          setStreak({
            current: 0,
            longest: 0,
            lastActiveDate: null,
          });
        }
      } catch (error) {
        console.error('Failed to load streak:', error);
        setStreak({
          current: 0,
          longest: 0,
          lastActiveDate: null,
        });
      } finally {
        setStreakLoading(false);
      }
    };

    loadStreak();
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);

    try {
      localStorage.setItem('unsaid_dark_mode', JSON.stringify(nextMode));
    } catch (error) {
      console.error('Failed to save dark mode:', error);
    }
  };

  const effectiveStreak = getEffectiveStreak(streak);
  const currentMilestone = getStreakMilestone(effectiveStreak);

  return (
    <div
      className={`min-h-screen font-sans selection:bg-neutral-900 selection:text-white relative ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-neutral-50/50 text-neutral-900'
      }`}
    >
      {/* HEADER */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b shadow-2xs ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800'
            : 'bg-white/95 border-neutral-200/80'
        }`}
      >
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-xl font-black tracking-tighter"
          >
            TAMBAYAN
            <span className="text-emerald-600">
              .
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-5 font-mono text-[11px] font-bold tracking-widest uppercase">
            <Link
              href="/about"
              className={
                isDarkMode
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-500 hover:text-neutral-900'
              }
            >
              About
            </Link>

            <Link
              href="/guidelines"
              className={
                isDarkMode
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-500 hover:text-neutral-900'
              }
            >
              Guidelines
            </Link>

            <button
              onClick={
                toggleDarkMode
              }
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
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24">

{/* WORLD PHARMACISTS DAY */}
<div
  className={`mb-8 rounded-xl border p-4 text-center ${
    isDarkMode
      ? 'bg-emerald-950/20 border-emerald-900/50'
      : 'bg-emerald-50 border-emerald-200'
  }`}
>
  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600">
    💊 World Pharmacists Day
  </p>

  <h2
    className={`mt-2 text-xl font-bold ${
      isDarkMode ? 'text-white' : 'text-neutral-900'
    }`}
  >
    Happy World Pharmacists Day!
  </h2>

  <p
    className={`mt-2 text-sm ${
      isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
    }`}
  >
    Celebrating our future pharmacists and their commitment to healthier communities. 💚
  </p>
</div>

        {/* HERO */}
        <div className="mb-10">

          {/* STREAK */}
          {!streakLoading && (
            <button
              type="button"
              onClick={() => setStreakDetailsOpen(true)}
              className={`mb-8 mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[10px] sm:text-xs transition-opacity hover:opacity-70 active:scale-[0.98] cursor-pointer ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
              }`}
            >
              <span className="streak-fire inline-flex">
                <Icons.Flame />
              </span>

              {effectiveStreak > 0 ? (
                <>
                  <span>
                    {effectiveStreak}{' '}
                    day
                    {effectiveStreak !== 1
                      ? 's'
                      : ''}{' '}
                    streak
                  </span>

                  <span className="text-neutral-300">
                    •
                  </span>

                  <span className="font-bold text-emerald-600">
                    {currentMilestone.title}
                  </span>
                </>
              ) : (
                <span>
                  Start your streak
                </span>
              )}

              <span
                className={`ml-1 underline underline-offset-2 ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-400'
                }`}
              >
                View streak
              </span>
            </button>
          )}

          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SLU Freedom Wall
          </p>

          <h1
            className={`text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight ${
              isDarkMode
                ? 'text-white'
                : 'text-neutral-900'
            }`}
          >
            Tambayan
            <br />
            Eselyu
          </h1>

<div className="relative max-w-md mb-8 pt-14">

  {/* FRIENDLY SEAL */}
  <div
    className="absolute right-2 sm:right-5 top-0 z-0 select-none"
    aria-label="Friendly Seal saying hello there"
  >
    {/* SPEECH BUBBLE */}
    <div
      className={`
        absolute
        right-[82px]
        top-0
        w-max
        rounded-xl
        border
        px-3
        py-2
        shadow-sm
        ${
          isDarkMode
            ? 'bg-neutral-900 border-neutral-700'
            : 'bg-white border-neutral-200'
        }
      `}
    >
      <p
        className={`font-mono text-[8px] font-bold uppercase tracking-widest ${
          isDarkMode
            ? 'text-emerald-400'
            : 'text-emerald-600'
        }`}
      >
        Friendly Seal
      </p>

      <p
        className={`mt-0.5 font-mono text-[10px] font-bold ${
          isDarkMode
            ? 'text-neutral-200'
            : 'text-neutral-700'
        }`}
      >
        hello there!
      </p>

      {/* Bubble tail */}
      <span
        className={`
          absolute
          -right-[5px]
          bottom-3
          h-2.5
          w-2.5
          rotate-45
          border-r
          border-t
          ${
            isDarkMode
              ? 'bg-neutral-900 border-neutral-700'
              : 'bg-white border-neutral-200'
          }
        `}
      />
    </div>

    {/* SEAL */}
    <div className="relative w-[92px] h-[78px]">

      {/* LEFT FLIPPER */}
      <div
        className={`
          absolute
          left-[-7px]
          bottom-[4px]
          w-[30px]
          h-[18px]
          rounded-[80%_30%_70%_40%]
          -rotate-[28deg]
          border
          ${
            isDarkMode
              ? 'bg-neutral-600 border-neutral-500'
              : 'bg-[#d9dde0] border-[#b9bec2]'
          }
        `}
      />

      {/* RIGHT FLIPPER */}
      <div
        className={`
          absolute
          right-[-7px]
          bottom-[4px]
          w-[30px]
          h-[18px]
          rounded-[30%_80%_40%_70%]
          rotate-[28deg]
          border
          ${
            isDarkMode
              ? 'bg-neutral-600 border-neutral-500'
              : 'bg-[#d9dde0] border-[#b9bec2]'
          }
        `}
      />

      {/* HEAD */}
      <div
        className={`
          absolute
          inset-x-0
          top-0
          mx-auto
          w-[86px]
          h-[76px]
          overflow-visible
          rounded-[48%_48%_44%_44%]
          border
          shadow-sm
          ${
            isDarkMode
              ? 'bg-neutral-600 border-neutral-500'
              : 'bg-[#d9dde0] border-[#b9bec2]'
          }
        `}
      >
        {/* FACE LIGHT AREA */}
        <div
          className={`
            absolute
            left-1/2
            top-[31px]
            -translate-x-1/2
            w-[52px]
            h-[32px]
            rounded-[50%]
            ${
              isDarkMode
                ? 'bg-neutral-500'
                : 'bg-[#eef0f1]'
            }
          `}
        />

{/* PHARMACIST CAP - TEMP */}
<div
  className={`
    absolute
    left-1/2
    -top-[12px]
    z-20
    -translate-x-1/2
    w-[52px]
    h-[22px]
    rounded-t-lg
    border
    ${
      isDarkMode
        ? 'bg-neutral-100 border-neutral-300'
        : 'bg-white border-neutral-200'
    }
  `}
>
  {/* GREEN CROSS */}
  <div className="absolute left-1/2 top-[9px] -translate-x-1/2 -translate-y-1/2">
    <span className="absolute left-1/2 top-1/2 h-[4px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-emerald-600" />

    <span className="absolute left-1/2 top-1/2 h-[14px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-emerald-600" />
  </div>

  {/* CAP BOTTOM */}
  <div
    className={`
      absolute
      left-1/2
      -bottom-[4px]
      h-[6px]
      w-[62px]
      -translate-x-1/2
      rounded-full
      border
      ${
        isDarkMode
          ? 'bg-neutral-200 border-neutral-300'
          : 'bg-white border-neutral-200'
      }
    `}
  />
</div>

        {/* LEFT EYE */}
        <div className="absolute left-[22px] top-[25px] w-[8px] h-[10px] rounded-full bg-neutral-900">
          <span className="absolute left-[2px] top-[2px] w-[2.5px] h-[2.5px] rounded-full bg-white" />
        </div>

        {/* RIGHT EYE */}
        <div className="absolute right-[22px] top-[25px] w-[8px] h-[10px] rounded-full bg-neutral-900">
          <span className="absolute left-[2px] top-[2px] w-[2.5px] h-[2.5px] rounded-full bg-white" />
        </div>

        {/* LEFT MUZZLE */}
        <div
          className={`
            absolute
            left-[27px]
            top-[39px]
            w-[19px]
            h-[15px]
            rounded-full
            ${
              isDarkMode
                ? 'bg-neutral-400'
                : 'bg-white'
            }
          `}
        />

        {/* RIGHT MUZZLE */}
        <div
          className={`
            absolute
            right-[27px]
            top-[39px]
            w-[19px]
            h-[15px]
            rounded-full
            ${
              isDarkMode
                ? 'bg-neutral-400'
                : 'bg-white'
            }
          `}
        />

        {/* NOSE */}
        <div
          className="
            absolute
            left-1/2
            top-[38px]
            z-10
            -translate-x-1/2
            w-[10px]
            h-[7px]
            rounded-[50%_50%_65%_65%]
            bg-neutral-900
          "
        />

        {/* MOUTH */}
        <div className="absolute left-1/2 top-[45px] z-10 -translate-x-1/2">
          <span className="absolute right-[-1px] top-0 w-[9px] h-[7px] rounded-full border-b border-neutral-700" />
          <span className="absolute left-[-1px] top-0 w-[9px] h-[7px] rounded-full border-b border-neutral-700" />
        </div>

        {/* LEFT WHISKERS */}
        <div className="absolute left-[3px] top-[43px]">
          <span className="absolute w-[22px] h-px bg-neutral-500 -rotate-[10deg]" />
          <span className="absolute top-[6px] w-[23px] h-px bg-neutral-500 rotate-[3deg]" />
          <span className="absolute top-[12px] w-[21px] h-px bg-neutral-500 rotate-[12deg]" />
        </div>

        {/* RIGHT WHISKERS */}
        <div className="absolute right-[3px] top-[43px]">
          <span className="absolute right-0 w-[22px] h-px bg-neutral-500 rotate-[10deg]" />
          <span className="absolute right-0 top-[6px] w-[23px] h-px bg-neutral-500 -rotate-[3deg]" />
          <span className="absolute right-0 top-[12px] w-[21px] h-px bg-neutral-500 -rotate-[12deg]" />
        </div>

        {/* LITTLE HEAD HIGHLIGHT */}
        <div
          className={`
            absolute
            left-[24px]
            top-[9px]
            w-[20px]
            h-[8px]
            -rotate-12
            rounded-full
            opacity-40
            ${
              isDarkMode ? 'bg-neutral-400' : 'bg-white'
            }
          `}
        />

      </div>
    </div>
  </div>

  {/* DESCRIPTION / HIDING EDGE */}
  <div
    className={`
      relative
      z-10
      pt-5
      pr-10
      ${
        isDarkMode
          ? 'bg-neutral-950'
          : 'bg-neutral-50'
      }
    `}
  >
    <p
      className={`text-base leading-relaxed ${
        isDarkMode
          ? 'text-neutral-400'
          : 'text-neutral-600'
      }`}
    >
      A safe space for Louisian thoughts, confessions, rants, and stories you can't say out loud.
    </p>
  </div>

</div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">

            <Link
              href="/wall"
              className="inline-flex items-center gap-2 bg-neutral-900 dark:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg active:scale-95 shadow-sm"
            >
              <Icons.MessageSquare />
              <span>
                Freedom Wall
              </span>
            </Link>

            <Link
              href="/chat/setup"
              className={`inline-flex items-center gap-2 border font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg active:scale-95 shadow-2xs ${
                isDarkMode
                  ? 'bg-neutral-900 text-white border-neutral-800 hover:bg-neutral-800'
                  : 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <Icons.Users />
              <span>
                Find Chatmate
              </span>
            </Link>

            <Link
              href="/support"
              className={`inline-flex items-center gap-2 border font-mono text-xs font-bold uppercase tracking-wider px-5 py-3.5 rounded-lg active:scale-95 shadow-2xs ${
                isDarkMode
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50 hover:bg-emerald-900/40'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Icons.Coffee />
              <span>
                Support This Project
              </span>
            </Link>

          </div>
        </div>

        {/* ABOUT TAMBAYAN */}
        <section className="mb-14">
          <div
            className={`rounded-2xl border p-6 sm:p-8 ${
              isDarkMode
                ? 'bg-neutral-900/50 border-neutral-800'
                : 'bg-white border-neutral-200/80'
            }`}
          >
            <p
              className={`font-mono text-[10px] font-bold uppercase tracking-widest mb-3 ${
                isDarkMode ? 'text-emerald-500' : 'text-emerald-600'
              }`}
            >
              About Tambayan
            </p>

            <h2
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-4 ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              A place to share, connect, and be heard.
            </h2>

            <p
              className={`text-sm sm:text-base leading-relaxed mb-4 ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              Tambayan SLU is an independent online community for Louisians.
              It gives students a space to share thoughts, confessions, rants,
              questions, stories, and experiences anonymously.
            </p>

            <p
              className={`text-sm sm:text-base leading-relaxed ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              Whether you want to say something you cannot say out loud,
              read what other students are going through, or simply have
              an anonymous conversation, Tambayan is made to give Louisians
              a place to connect.
            </p>

            <div
              className={`mt-5 pt-5 border-t text-[11px] font-mono ${
                isDarkMode
                  ? 'border-neutral-800 text-neutral-500'
                  : 'border-neutral-100 text-neutral-400'
              }`}
            >
              <span className="text-emerald-600 font-bold">
                Independent community
              </span>
              {' '}· Not affiliated with or endorsed by Saint Louis University
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="mb-14">
          <div className="mb-5">
            <p
              className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
                isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              What you can do
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mt-2 ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              More than just a freedom wall.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* FREEDOM WALL */}
            <div
              className={`rounded-2xl border p-5 ${
                isDarkMode
                  ? 'bg-neutral-900 border-neutral-800'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />

                <p className="font-mono text-xs font-bold uppercase tracking-wider">
                  Freedom Wall
                </p>
              </div>

              <h3
                className={`text-lg font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-neutral-900'
                }`}
              >
                Say what you want to say.
              </h3>

              <p
                className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                }`}
              >
                Share your thoughts, confessions, rants, questions,
                advice, and stories anonymously. Browse entries from
                other Louisians and join the conversation through replies.
              </p>

              <Link
                href="/wall"
                className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
              >
                Enter →
              </Link>
            </div>

            {/* ANONYMOUS CHAT */}
            <div
              className={`rounded-2xl border p-5 ${
                isDarkMode
                  ? 'bg-neutral-900 border-neutral-800'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />

                <p className="font-mono text-xs font-bold uppercase tracking-wider">
                  Anonymous Chat
                </p>
              </div>

              <h3
                className={`text-lg font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-neutral-900'
                }`}
              >
                Talk to someone anonymously.
              </h3>

              <p
                className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                }`}
              >
                Get matched with another anonymous user for a private
                conversation. No need to publicly share your identity
                just to have someone to talk to.
              </p>

              <Link
                href="/chat/setup"
                className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
              >
                Find a chatmate →
              </Link>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mb-14">
          <div className="mb-5">
            <p
              className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
                isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              How it works
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mt-2 ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              Simple, anonymous, community-driven.
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                number: '01',
                title: 'Choose what you want to do',
                text: 'Post something on the Freedom Wall or start an anonymous chat.',
              },
              {
                number: '02',
                title: 'Stay anonymous',
                text: 'Your posts use an anonymous Louisian alias instead of requiring you to publicly identify yourself.',
              },
              {
                number: '03',
                title: 'Connect with other Louisians',
                text: 'Read community entries, leave replies, or have an anonymous conversation.',
              },
              {
                number: '04',
                title: 'Help keep Tambayan safe',
                text: 'Report content that violates the community guidelines so it can be reviewed by the moderators.',
              },
            ].map((item) => (
              <div
                key={item.number}
                className={`flex gap-4 rounded-xl border p-4 ${
                  isDarkMode
                    ? 'bg-neutral-900/50 border-neutral-800'
                    : 'bg-white border-neutral-200/80'
                }`}
              >
                <span className="shrink-0 font-mono text-xs font-bold text-emerald-600 pt-0.5">
                  {item.number}
                </span>

                <div>
                  <h3
                    className={`font-mono text-xs font-bold uppercase tracking-wider mb-1 ${
                      isDarkMode ? 'text-neutral-200' : 'text-neutral-800'
                    }`}
                  >
                    {item.title}
                  </h3>

                  <p
                    className={`text-sm leading-relaxed ${
                      isDarkMode ? 'text-neutral-500' : 'text-neutral-600'
                    }`}
                  >
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link
                href="/how-it-works"
                className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
              >
                See more →
              </Link>
        </section>

        {/* COMMUNITY SAFETY */}
        <section className="mb-14">
          <div
            className={`rounded-2xl border p-6 ${
              isDarkMode
                ? 'bg-emerald-950/20 border-emerald-900/50'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />

              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Community safety
              </p>
            </div>

            <h2
              className={`text-xl font-bold mb-3 ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              Help keep Tambayan a safe space.
            </h2>

            <p
              className={`text-sm leading-relaxed mb-4 ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              Tambayan uses moderation and reporting tools to help
              prevent harmful content. Posts may be reviewed before
              appearing on the Freedom Wall, and users can report
              content that violates the community guidelines.
            </p>

            <Link
              href="/guidelines"
              className="inline-flex font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
            >
              Read Community Guidelines →
            </Link>
          </div>
        </section>


        {/* FAQ */}
        <section className="mb-14">
          <div
            className={`rounded-2xl border p-6 sm:p-8 ${
              isDarkMode
                ? 'bg-neutral-900/50 border-neutral-800'
                : 'bg-white border-neutral-200/80'
            }`}
          >
            <p
              className={`font-mono text-[10px] font-bold uppercase tracking-widest mb-3 ${
                isDarkMode
                  ? 'text-neutral-500'
                  : 'text-neutral-400'
              }`}
            >
              Questions?
            </p>

            <h2
              className={`text-xl font-bold mb-3 ${
                isDarkMode
                  ? 'text-white'
                  : 'text-neutral-900'
              }`}
            >
              Learn more about Tambayan.
            </h2>

            <p
              className={`text-sm leading-relaxed mb-5 ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-600'
              }`}
            >
              Find answers about anonymity, encrypted chats,
              moderation, privacy, streaks, and how Tambayan works.
            </p>

            <Link
              href="/faq"
              className="inline-flex font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
            >
              Frequently Asked Questions →
            </Link>
          </div>
        </section>
      </main>

{/* STREAK DETAILS MODAL */}
{streakDetailsOpen && (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/60 backdrop-blur-sm"
    onClick={() => setStreakDetailsOpen(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className={`w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-xl border overflow-hidden ${
        isDarkMode
          ? 'bg-neutral-900 border-neutral-800 text-white'
          : 'bg-white border-neutral-200 text-neutral-900'
      }`}
    >
      {/* HEADER - FIXED */}
      <div
        className={`shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b ${
          isDarkMode
            ? 'border-neutral-800'
            : 'border-neutral-100'
        }`}
      >
        <div className="min-w-0 pr-3">
          <h3 className="font-mono text-xs font-bold uppercase tracking-widest">
            Your Streak
          </h3>

          <p
            className={`mt-1 font-mono text-[9px] sm:text-[10px] ${
              isDarkMode
                ? 'text-neutral-500'
                : 'text-neutral-400'
            }`}
          >
            Post or get matched to keep your streak going.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStreakDetailsOpen(false)}
          aria-label="Close streak details"
          className={`shrink-0 p-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'text-neutral-500 hover:text-white hover:bg-neutral-800'
              : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <Icons.Close />
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 sm:p-6">

          {/* CURRENT + LONGEST */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-5 sm:mb-6">
            <div
              className={`rounded-xl border p-3 sm:p-4 text-center ${
                isDarkMode
                  ? 'bg-neutral-950 border-neutral-800'
                  : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <div className="flex justify-center mb-1.5 sm:mb-2">
                <span className="streak-fire inline-flex text-orange-500">
                  <Icons.Flame />
                </span>
              </div>

              <p className="font-mono text-xl sm:text-2xl font-bold">
                {effectiveStreak}
              </p>

              <p
                className={`mt-1 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-400'
                }`}
              >
                Current streak
              </p>
            </div>

            <div
              className={`rounded-xl border p-3 sm:p-4 text-center ${
                isDarkMode
                  ? 'bg-neutral-950 border-neutral-800'
                  : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <div className="mb-1.5 sm:mb-2 text-emerald-600 font-mono text-[10px] sm:text-sm font-bold">
                BEST
              </div>

              <p className="font-mono text-xl sm:text-2xl font-bold">
                {Math.max(
                  streak.longest,
                  effectiveStreak
                )}
              </p>

              <p
                className={`mt-1 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-400'
                }`}
              >
                Longest streak
              </p>
            </div>
          </div>

          {/* HOW STREAK WORKS */}
          <div
            className={`mb-5 rounded-xl border px-4 py-3 ${
              isDarkMode
                ? 'bg-neutral-950 border-neutral-800'
                : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <p
              className={`font-mono text-[10px] sm:text-xs leading-relaxed text-center ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
              }`}
            >
              Your streak goes up when you{' '}
              <span className="font-bold text-emerald-600">
                post
              </span>{' '}
              on the Freedom Wall or{' '}
              <span className="font-bold text-emerald-600">
                get matched
              </span>{' '}
              in the anonymous chat.
            </p>
          </div>

          {/* CURRENT TITLE / NEW USER */}
          {effectiveStreak > 0 ? (
            <div
              className={`mb-5 rounded-xl border p-3 sm:p-4 text-center ${
                isDarkMode
                  ? 'bg-emerald-950/20 border-emerald-900/50'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <p
                className={`font-mono text-[9px] sm:text-[10px] uppercase tracking-widest mb-1 ${
                  isDarkMode
                    ? 'text-emerald-500'
                    : 'text-emerald-600'
                }`}
              >
                Current title
              </p>

              <p className="font-mono text-sm font-bold">
                {currentMilestone.title}
              </p>

              <p
                className={`mt-1 font-mono text-[9px] sm:text-[10px] ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-400'
                }`}
              >
                {effectiveStreak} day
                {effectiveStreak !== 1
                  ? 's'
                  : ''}{' '}
                reached
              </p>
            </div>
          ) : (
            <div
              className={`mb-5 rounded-xl border p-4 sm:p-5 text-center ${
                isDarkMode
                  ? 'bg-orange-950/20 border-orange-900/40'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex justify-center mb-2">
                <span className="streak-fire inline-flex text-orange-500">
                  <Icons.Flame />
                </span>
              </div>

              <p className="font-mono text-sm font-bold">
                Start your streak
              </p>

              <p
                className={`mt-1 font-mono text-[10px] leading-relaxed ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-500'
                }`}
              >
                Post on the Freedom Wall or get matched
                in anonymous chat to start building your
                streak.
              </p>
            </div>
          )}

          {/* MILESTONES */}
          <div>
            <p
              className={`mb-3 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${
                isDarkMode
                  ? 'text-neutral-500'
                  : 'text-neutral-400'
              }`}
            >
              Streak titles
            </p>

            <div className="space-y-1.5 sm:space-y-2">
              {STREAK_MILESTONES.map((milestone) => {
                const reached =
                  effectiveStreak >= milestone.days;

                const current =
                  effectiveStreak > 0 &&
                  currentMilestone.days === milestone.days;

                return (
                  <div
                    key={milestone.days}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 ${
                      current
                        ? isDarkMode
                          ? 'border-emerald-800 bg-emerald-950/30'
                          : 'border-emerald-200 bg-emerald-50'
                        : isDarkMode
                          ? 'border-neutral-800'
                          : 'border-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <span
                        className={`shrink-0 font-mono text-xs font-bold ${
                          reached
                            ? 'text-emerald-600'
                            : isDarkMode
                              ? 'text-neutral-700'
                              : 'text-neutral-300'
                        }`}
                      >
                        {reached ? '✓' : '○'}
                      </span>

                      <div className="min-w-0">
                        <p
                          className={`font-mono text-[10px] sm:text-xs font-bold truncate ${
                            reached
                              ? isDarkMode
                                ? 'text-neutral-100'
                                : 'text-neutral-900'
                              : isDarkMode
                                ? 'text-neutral-600'
                                : 'text-neutral-400'
                          }`}
                        >
                          {milestone.title}
                        </p>

                        <p
                          className={`font-mono text-[9px] ${
                            isDarkMode
                              ? 'text-neutral-600'
                              : 'text-neutral-400'
                          }`}
                        >
                          {milestone.days} day
                          {milestone.days !== 1
                            ? 's'
                            : ''}
                        </p>
                      </div>
                    </div>

                    {current && (
                      <span className="shrink-0 font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                        Current
                      </span>
                    )}

                    {!current && reached && (
                      <span
                        className={`shrink-0 font-mono text-[8px] sm:text-[9px] uppercase tracking-wider ${
                          isDarkMode
                            ? 'text-neutral-600'
                            : 'text-neutral-400'
                        }`}
                      >
                        Reached
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* EXTRA BOTTOM SPACE FOR MOBILE SCROLLING */}
          <div className="h-2 sm:h-0" />
        </div>
      </div>

      {/* FOOTER - FIXED */}
      <div
        className={`shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t ${
          isDarkMode
            ? 'border-neutral-800'
            : 'border-neutral-100'
        }`}
      >
        <button
          type="button"
          onClick={() => setStreakDetailsOpen(false)}
          className={`w-full px-4 py-2.5 rounded-xl border font-mono text-[10px] sm:text-xs uppercase font-bold tracking-wider transition-colors ${
            isDarkMode
              ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
              : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
