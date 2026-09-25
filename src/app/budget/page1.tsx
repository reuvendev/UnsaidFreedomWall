'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/* =========================================================
   CONFIG
========================================================= */

const COMMUNITY_BUDGET = 1_000_000_000;
const USER_BUDGET = 10_000_000;

const CATEGORIES = [
  {
    id: 'education',
    label: 'Education',
    icon: 'education',
    description:
      'Schools, classrooms, learning resources, scholarships, and education programs.',
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    icon: 'healthcare',
    description:
      'Hospitals, health centres, medical equipment, and public health services.',
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
    icon: 'agriculture',
    description:
      'Support for farmers, food production, irrigation, and agricultural programs.',
  },
  {
    id: 'floodControl',
    label: 'Flood Control',
    icon: 'flood',
    description:
      'Drainage, flood mitigation, waterways, and related infrastructure.',
  },
  {
    id: 'transportation',
    label: 'Public Transport',
    icon: 'transport',
    description:
      'Public transportation, mobility, roads, and commuter infrastructure.',
  },
  {
    id: 'housing',
    label: 'Housing',
    icon: 'housing',
    description:
      'Affordable housing, shelters, and community development.',
  },
  {
    id: 'scienceTechnology',
    label: 'Science & Technology',
    icon: 'science',
    description:
      'Research, innovation, digital infrastructure, and technology programs.',
  },
  {
    id: 'disasterPreparedness',
    label: 'Disaster Preparedness',
    icon: 'disaster',
    description:
      'Emergency response, disaster preparedness, warning systems, and resilience.',
  },
] as const;

type UIIconName =
  | 'sun'
  | 'moon'
  | 'peso'
  | 'flag'
  | 'check'
  | 'arrowLeft'
  | 'arrowRight'
  | 'users'
  | 'receipt';

function UIIcon({
  name,
  className = 'w-5 h-5',
}: {
  name: UIIconName;
  className?: string;
}) {
  const commonProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (name) {
    case 'sun':
      return (
        <svg {...commonProps}>
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
      );

    case 'moon':
      return (
        <svg {...commonProps}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      );

    case 'peso':
      return (
        <svg {...commonProps}>
          <path d="M7 21V3" />
          <path d="M7 4h6a5 5 0 0 1 0 10H7" />
          <path d="M4 8h13" />
          <path d="M4 11h13" />
        </svg>
      );

    case 'flag':
      return (
        <svg {...commonProps}>
          <path d="M5 22V3" />
          <path d="M5 4h11l-2 4 2 4H5" />
        </svg>
      );

    case 'check':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );

    case 'arrowLeft':
      return (
        <svg {...commonProps}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );

    case 'arrowRight':
      return (
        <svg {...commonProps}>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      );

    case 'users':
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case 'receipt':
      return (
        <svg {...commonProps}>
          <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
          <path d="M9 9h6" />
          <path d="M9 13h6" />
          <path d="M9 17h3" />
        </svg>
      );
  }
}

type CategoryId =
  (typeof CATEGORIES)[number]['id'];

type AllocationState = Record<
  CategoryId,
  number
>;

type CommunityTotals = AllocationState & {
  participants: number;
  totalAllocated: number;
};

const createEmptyAllocation =
  (): AllocationState => ({
    education: 0,
    healthcare: 0,
    agriculture: 0,
    floodControl: 0,
    transportation: 0,
    housing: 0,
    scienceTechnology: 0,
    disasterPreparedness: 0,
  });

const createEmptyCommunityTotals =
  (): CommunityTotals => ({
    ...createEmptyAllocation(),
    participants: 0,
    totalAllocated: 0,
  });

/* =========================================================
   HELPERS
========================================================= */

const formatPeso = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompactPeso = (amount: number) => {
  if (amount >= 1_000_000_000) {
    return `₱${(
      amount / 1_000_000_000
    ).toFixed(
      amount % 1_000_000_000 === 0
        ? 0
        : 1
    )}B`;
  }

  if (amount >= 1_000_000) {
    return `₱${(
      amount / 1_000_000
    ).toFixed(
      amount % 1_000_000 === 0
        ? 0
        : 1
    )}M`;
  }

  if (amount >= 1_000) {
    return `₱${(
      amount / 1_000
    ).toFixed(0)}K`;
  }

  return `₱${amount}`;
};

const getAnonymousUserId = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const existingId =
      localStorage.getItem(
        'unsaid_chat_user_id'
      );

    if (existingId) {
      return existingId;
    }

    const newId =
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID ===
        'function'
        ? crypto.randomUUID()
        : `tambayan_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;

    localStorage.setItem(
      'unsaid_chat_user_id',
      newId
    );

    return newId;
  } catch {
    return null;
  }
};

type CategoryIconName =
  | 'education'
  | 'healthcare'
  | 'agriculture'
  | 'flood'
  | 'transport'
  | 'housing'
  | 'science'
  | 'disaster';

function CategoryIcon({
  name,
  className = 'w-5 h-5',
}: {
  name: CategoryIconName;
  className?: string;
}) {
  const commonProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (name) {
    case 'education':
      return (
        <svg {...commonProps}>
          <path d="m2 10 10-5 10 5-10 5Z" />
          <path d="M6 12v5c3 2 9 2 12 0v-5" />
          <path d="M22 10v6" />
        </svg>
      );

    case 'healthcare':
      return (
        <svg {...commonProps}>
          <path d="M12 21s-7-4.6-9.3-9C.8 8.3 3 4.5 6.8 4.2c2-.2 3.8.8 5.2 2.5 1.4-1.7 3.2-2.7 5.2-2.5C21 4.5 23.2 8.3 21.3 12 19 16.4 12 21 12 21Z" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      );

    case 'agriculture':
      return (
        <svg {...commonProps}>
          <path d="M12 22V10" />
          <path d="M12 14c-4 0-7-2.5-7-6 4 0 7 2.5 7 6Z" />
          <path d="M12 10c4 0 7-2.5 7-6-4 0-7 2.5-7 6Z" />
          <path d="M8 22h8" />
        </svg>
      );

    case 'flood':
      return (
        <svg {...commonProps}>
          <path d="M3 8h18" />
          <path d="M5 5h14" />
          <path d="M7 2h10" />
          <path d="M3 14c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
          <path d="M3 19c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
        </svg>
      );

    case 'transport':
      return (
        <svg {...commonProps}>
          <rect x="5" y="3" width="14" height="15" rx="3" />
          <path d="M5 11h14" />
          <path d="M8 7h8" />
          <path d="M8 18v3" />
          <path d="M16 18v3" />
          <circle cx="8.5" cy="14.5" r=".7" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="14.5" r=".7" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'housing':
      return (
        <svg {...commonProps}>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v11h14V10" />
          <path d="M9 21v-7h6v7" />
        </svg>
      );

    case 'science':
      return (
        <svg {...commonProps}>
          <path d="M9 3h6" />
          <path d="M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" />
          <path d="M7.5 15h9" />
          <circle cx="10" cy="17.5" r=".7" fill="currentColor" stroke="none" />
          <circle cx="14" cy="18" r=".7" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'disaster':
      return (
        <svg {...commonProps}>
          <path d="M12 3a6 6 0 0 0-6 6v4l-2 4h16l-2-4V9a6 6 0 0 0-6-6Z" />
          <path d="M9 21h6" />
          <path d="M3 9H1" />
          <path d="M23 9h-2" />
          <path d="m5 3-1.5-1.5" />
          <path d="M19 3l1.5-1.5" />
        </svg>
      );
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function BudgetPage() {
  const [isDarkMode, setIsDarkMode] =
    useState(false);

  const [allocations, setAllocations] =
    useState<AllocationState>(
      createEmptyAllocation()
    );

  const [
    communityTotals,
    setCommunityTotals,
  ] = useState<CommunityTotals>(
    createEmptyCommunityTotals()
  );

  const [
    hasSubmitted,
    setHasSubmitted,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    showAllCommunity,
    setShowAllCommunity,
  ] = useState(false);

  /* =========================================================
     DARK MODE
  ========================================================= */

  useEffect(() => {
    try {
      const storedTheme =
        localStorage.getItem(
          'unsaid_dark_mode'
        );

      if (storedTheme !== null) {
        setIsDarkMode(
          JSON.parse(storedTheme)
        );
      } else if (
        window.matchMedia?.(
          '(prefers-color-scheme: dark)'
        ).matches
      ) {
        setIsDarkMode(true);
      }
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;

    setIsDarkMode(next);

    try {
      localStorage.setItem(
        'unsaid_dark_mode',
        JSON.stringify(next)
      );
    } catch {}
  };

  /* =========================================================
     CHECK USER SUBMISSION
  ========================================================= */

  useEffect(() => {
    const checkSubmission = async () => {
      const userId =
        getAnonymousUserId();

      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const submissionRef = doc(
          db,
          'budgetRounds',
          'round001',
          'allocations',
          userId
        );

        const snapshot =
          await getDoc(submissionRef);

        if (snapshot.exists()) {
          const data = snapshot.data();

          const saved =
            createEmptyAllocation();

          CATEGORIES.forEach(
            (category) => {
              saved[category.id] =
                typeof data.allocations?.[
                  category.id
                ] === 'number'
                  ? data.allocations[
                      category.id
                    ]
                  : 0;
            }
          );

          setAllocations(saved);
          setHasSubmitted(true);
        }
      } catch (err) {
        console.error(
          'Failed to check budget submission:',
          err
        );
      } finally {
        setLoading(false);
      }
    };

    checkSubmission();
  }, []);

  /* =========================================================
     LIVE COMMUNITY TOTALS
  ========================================================= */

  useEffect(() => {
    const totalsRef = doc(
      db,
      'budgetRounds',
      'round001'
    );

    const unsubscribe = onSnapshot(
      totalsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setCommunityTotals(
            createEmptyCommunityTotals()
          );
          return;
        }

        const data = snapshot.data();

        const next =
          createEmptyCommunityTotals();

        CATEGORIES.forEach(
          (category) => {
            next[category.id] =
              typeof data.rawTotals?.[
                category.id
              ] === 'number'
                ? data.rawTotals[
                    category.id
                  ]
                : 0;
          }
        );

        next.participants =
          typeof data.participants ===
          'number'
            ? data.participants
            : 0;

        next.totalAllocated =
          typeof data.totalPreferenceWeight === 'number'
            ? data.totalPreferenceWeight
            : 0;

        setCommunityTotals(next);
      },
      (err) => {
        console.error(
          'Failed to listen to budget:',
          err
        );

        setError(
          `Budget listener error: ${
            err.code ?? err.message
          }`
        );
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================================================
     USER TOTAL
  ========================================================= */

  const userTotal = useMemo(() => {
    return Object.values(
      allocations
    ).reduce(
      (sum, amount) => sum + amount,
      0
    );
  }, [allocations]);

  const remaining =
    USER_BUDGET - userTotal;

  const communityBudgetDistribution = useMemo(() => {
    const totalPreferenceWeight =
      communityTotals.totalAllocated;

    const distribution =
      createEmptyAllocation();

    if (totalPreferenceWeight <= 0) {
      return distribution;
    }

    CATEGORIES.forEach((category) => {
      const categoryWeight =
        communityTotals[category.id];

      distribution[category.id] =
        (categoryWeight /
          totalPreferenceWeight) *
        COMMUNITY_BUDGET;
    });

    return distribution;
  }, [communityTotals]);

  /* =========================================================
     UPDATE ALLOCATION
  ========================================================= */

  const updateAllocation = (
    category: CategoryId,
    amount: number
  ) => {
    if (hasSubmitted) return;

    const safeAmount = Math.max(
      0,
      Math.min(USER_BUDGET, amount)
    );

    const otherTotal =
      userTotal - allocations[category];

    if (
      otherTotal + safeAmount >
      USER_BUDGET
    ) {
      return;
    }

    setAllocations((prev) => ({
      ...prev,
      [category]: safeAmount,
    }));
  };

  const addAmount = (
    category: CategoryId,
    amount: number
  ) => {
    updateAllocation(
      category,
      allocations[category] + amount
    );
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async () => {
    if (submitting || hasSubmitted) {
      return;
    }

    setError(null);

    if (userTotal !== USER_BUDGET) {
      setError(
        `Allocate the full ${formatPeso(
          USER_BUDGET
        )} before locking it in.`
      );

      return;
    }

    const userId =
      getAnonymousUserId();

    if (!userId) {
      setError(
        'Unable to create your anonymous Tambayan ID. Please refresh and try again.'
      );

      return;
    }

    console.log(
      '[BUDGET] Submitting...',
      {
        userId,
        userTotal,
        allocations,
      }
    );

    setSubmitting(true);

    try {
      const roundRef = doc(
        db,
        'budgetRounds',
        'round001'
      );

      const submissionRef = doc(
        db,
        'budgetRounds',
        'round001',
        'allocations',
        userId
      );

      await runTransaction(
        db,
        async (transaction) => {
          const roundSnapshot =
            await transaction.get(roundRef);

          const submissionSnapshot =
            await transaction.get(submissionRef);

          if (
            submissionSnapshot.exists()
          ) {
            throw new Error(
              'ALREADY_SUBMITTED'
            );
          }

          const currentRound =
            roundSnapshot.exists()
              ? roundSnapshot.data()
              : {};

          const newTotals: Record<
            string,
            number
          > = {};

          CATEGORIES.forEach(
            (category) => {
             const current =
              typeof currentRound.rawTotals?.[
                category.id
              ] === 'number'
                ? currentRound.rawTotals[
                    category.id
                  ]
                : 0;

              newTotals[category.id] =
                current +
                allocations[
                  category.id
                ];
            }
          );

          transaction.set(
            roundRef,
            {
              name:
                'Tambayan ₱1B Community Budget',
              round: 1,

              totalBudget:
                COMMUNITY_BUDGET,

              perUserBudget:
                USER_BUDGET,

              totalPreferenceWeight:
                (typeof currentRound.totalPreferenceWeight === 'number'
                  ? currentRound.totalPreferenceWeight
                  : 0) + USER_BUDGET,

              participants:
                (typeof currentRound
                  .participants ===
                'number'
                  ? currentRound.participants
                  : 0) + 1,

              rawTotals: newTotals,

              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );

          transaction.set(
            submissionRef,
            {
              userId,
              allocations,
              total:
                USER_BUDGET,
              createdAt:
                serverTimestamp(),
            }
          );
        }
      );

      console.log(
        '[BUDGET] Firestore transaction committed successfully.'
      );

      setHasSubmitted(true);
        } catch (err: unknown) {
          console.error(
            'Budget submission failed:',
            err
          );

          if (
            err instanceof Error &&
            err.message === 'ALREADY_SUBMITTED'
          ) {
            setError(
              'You already submitted your allocation for this round.'
            );

            setHasSubmitted(true);
          } else {
            const firebaseError =
              err as {
                code?: string;
                message?: string;
              };

            console.error(
              'FIREBASE CODE:',
              firebaseError?.code
            );

            console.error(
              'FIREBASE MESSAGE:',
              firebaseError?.message
            );

            setError(
              firebaseError?.code
                ? `${firebaseError.code}: ${
                    firebaseError.message ??
                    'Submission failed.'
                  }`
                : firebaseError?.message ??
                    'Something went wrong while submitting your budget.'
            );
          }
        } finally {
          setSubmitting(false);
        }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center font-mono ${
          isDarkMode
            ? 'bg-neutral-950 text-neutral-400'
            : 'bg-neutral-50 text-neutral-500'
        }`}
      >
        Loading community budget...
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className={`min-h-screen ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-neutral-50/50 text-neutral-900'
      }`}
    >
      {/* HEADER */}

      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800'
            : 'bg-white/95 border-neutral-200'
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

          <div className="flex items-center gap-4">
            <Link
              href="/wall"
              className={`font-mono text-[11px] font-bold uppercase tracking-widest ${
                isDarkMode
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Wall
            </Link>

            <button
              type="button"
              onClick={toggleDarkMode}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                isDarkMode
                  ? 'bg-neutral-800 border-neutral-700'
                  : 'bg-neutral-100 border-neutral-200'
              }`}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <UIIcon
                  name="sun"
                  className="w-4 h-4 text-amber-400"
                />
              ) : (
                <UIIcon
                  name="moon"
                  className="w-4 h-4"
                />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">

        {/* INTRO */}

        <section className="mb-10">

        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
            isDarkMode
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          }`}
        >
          <UIIcon
            name="peso"
            className="w-6 h-6"
          />
        </div>

          <p className="font-mono text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-4">
            Tambayan Experiment #001
          </p>

          <h1
            className={`text-4xl sm:text-5xl font-black tracking-tight leading-[1.05] ${
              isDarkMode
                ? 'text-white'
                : 'text-neutral-900'
            }`}
          >
            Spend the
            <br />
            ₱1 Billion.
          </h1>

          <p
            className={`mt-5 text-base sm:text-lg leading-relaxed max-w-xl ${
              isDarkMode
                ? 'text-neutral-400'
                : 'text-neutral-600'
            }`}
          >
            Congrats! May ₱1B public
            budget ang Tambayan.
            Fictional lang, syempre.
          </p>

          <p
            className={`mt-2 text-sm leading-relaxed ${
              isDarkMode
                ? 'text-neutral-500'
                : 'text-neutral-500'
            }`}
          >
            Every participant gets
            ₱10 million to allocate.
            Collectively, Louisians decide
            where the ₱1 billion goes.
          </p>

        </section>

        {/* COMMUNITY STATUS */}

        <section
          className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 mb-8 ${
            isDarkMode
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-neutral-200'
          }`}
        >
          {/* PH ACCENT */}
          <div className="absolute top-0 left-0 right-0 h-1 flex">
            <div className="flex-1 bg-blue-600" />
            <div className="w-12 bg-yellow-400" />
            <div className="flex-1 bg-red-600" />
          </div>

          <div className="flex items-start justify-between gap-5 mt-1">

            <div>
              <p
                className={`font-mono text-[9px] uppercase tracking-widest ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-400'
                }`}
              >
                Community Budget
              </p>

              <p className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
                ₱1 Billion
              </p>

              <p
                className={`text-xs mt-2 ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-500'
                }`}
              >
                Shaped collectively by Louisians.
              </p>
            </div>

            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                isDarkMode
                  ? 'bg-neutral-800 text-yellow-400'
                  : 'bg-yellow-50 text-yellow-600'
              }`}
            >
              <UIIcon
                name="users"
                className="w-5 h-5"
              />
            </div>

          </div>

          <div
            className={`mt-5 pt-4 border-t flex items-center justify-between ${
              isDarkMode
                ? 'border-neutral-800'
                : 'border-neutral-100'
            }`}
          >
            <span
              className={`font-mono text-[9px] uppercase tracking-widest ${
                isDarkMode
                  ? 'text-neutral-600'
                  : 'text-neutral-400'
              }`}
            >
              Participants
            </span>

            <span className="font-mono text-sm font-black text-emerald-600">
              {communityTotals.participants.toLocaleString(
                'en-PH'
              )}{' '}
              Louisian
              {communityTotals.participants === 1
                ? ''
                : 's'}
            </span>
          </div>

          <p
            className={`font-mono text-[9px] mt-3 ${
              isDarkMode
                ? 'text-neutral-600'
                : 'text-neutral-400'
            }`}
          >
            The ₱1B distribution updates as more
            Louisians submit their choices.
          </p>
        </section>

{/* COMMUNITY RESULTS */}

<section className="mt-10">
  {/* HEADER */}
  <div className="flex items-end justify-between gap-4 mb-6">
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>

        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600">
          Live Community Budget
        </p>
      </div>

      <h2 className="text-2xl font-black tracking-tight">
        Where Louisians put the ₱1B.
      </h2>

      <p
        className={`text-xs mt-2 ${
          isDarkMode
            ? 'text-neutral-500'
            : 'text-neutral-500'
        }`}
      >
        Updated live as more Louisians submit
        their choices.
      </p>
    </div>

    {communityTotals.participants > 0 && (
      <div className="text-right shrink-0">
        <p
          className={`font-mono text-[9px] uppercase tracking-widest ${
            isDarkMode
              ? 'text-neutral-600'
              : 'text-neutral-400'
          }`}
        >
          Participants
        </p>

        <p className="font-mono text-sm font-black text-emerald-600">
          {communityTotals.participants.toLocaleString(
            'en-PH'
          )}
        </p>
      </div>
    )}
  </div>

  {communityTotals.participants === 0 ? (
    /* EMPTY STATE */
    <div
      className={`rounded-2xl border px-5 py-10 text-center ${
        isDarkMode
          ? 'bg-neutral-900 border-neutral-800'
          : 'bg-white border-neutral-200'
      }`}
    >
      <div
        className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
          isDarkMode
            ? 'bg-neutral-800 text-neutral-500'
            : 'bg-neutral-100 text-neutral-400'
        }`}
      >
        <UIIcon
          name="users"
          className="w-5 h-5"
        />
      </div>

      <h3 className="font-bold mt-4">
        Wala pang allocation.
      </h3>

      <p
        className={`text-xs mt-2 ${
          isDarkMode
            ? 'text-neutral-500'
            : 'text-neutral-500'
        }`}
      >
        Be the first Louisian to shape the
        community budget.
      </p>
    </div>
  ) : (
    <>
{/* MOBILE — COMPACT RESULTS */}
<div className="sm:hidden">
  <div
    className={`overflow-hidden rounded-2xl border ${
      isDarkMode
        ? 'bg-neutral-900 border-neutral-800'
        : 'bg-white border-neutral-200'
    }`}
  >
    {[...CATEGORIES]
      .sort(
        (a, b) =>
          communityBudgetDistribution[b.id] -
          communityBudgetDistribution[a.id]
      )
      .slice(
        0,
        showAllCommunity
          ? CATEGORIES.length
          : 4
      )
      .map((category, index) => {
        const amount =
          communityBudgetDistribution[
            category.id
          ];

        const percentage =
          COMMUNITY_BUDGET > 0
            ? (amount / COMMUNITY_BUDGET) * 100
            : 0;

        return (
          <div
            key={category.id}
            className={`px-4 py-3 ${
              index !== 0
                ? isDarkMode
                  ? 'border-t border-neutral-800'
                  : 'border-t border-neutral-100'
                : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {/* RANK */}
              <span
                className={`w-5 shrink-0 font-mono text-[9px] font-bold ${
                  index === 0
                    ? 'text-emerald-600'
                    : isDarkMode
                    ? 'text-neutral-600'
                    : 'text-neutral-400'
                }`}
              >
                {String(index + 1).padStart(
                  2,
                  '0'
                )}
              </span>

              {/* ICON */}
              <div
                className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-neutral-800 text-emerald-400'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <CategoryIcon
                  name={category.icon}
                  className="w-4 h-4"
                />
              </div>

              {/* NAME */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">
                  {category.label}
                </p>

                <div
                  className={`h-1 rounded-full overflow-hidden mt-1.5 ${
                    isDarkMode
                      ? 'bg-neutral-800'
                      : 'bg-neutral-100'
                  }`}
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        percentage,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* VALUE */}
              <div className="text-right shrink-0">
                <p className="font-mono text-[11px] font-black">
                  {formatCompactPeso(amount)}
                </p>

                <p
                  className={`font-mono text-[8px] ${
                    isDarkMode
                      ? 'text-neutral-600'
                      : 'text-neutral-400'
                  }`}
                >
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        );
      })}

    {/* SHOW MORE */}
    <button
      type="button"
      onClick={() =>
        setShowAllCommunity(
          (current) => !current
        )
      }
      className={`w-full py-3 font-mono text-[9px] font-bold uppercase tracking-widest border-t transition-colors ${
        isDarkMode
          ? 'border-neutral-800 text-neutral-500 hover:bg-neutral-800'
          : 'border-neutral-100 text-neutral-500 hover:bg-neutral-50'
      }`}
    >
      {showAllCommunity
        ? 'Show less'
        : `Show all ${CATEGORIES.length} categories`}
    </button>
  </div>
</div>

{/* DESKTOP / TABLET — FULL GRID */}
<div className="hidden sm:grid sm:grid-cols-2 gap-3">
  {[...CATEGORIES]
    .sort(
      (a, b) =>
        communityBudgetDistribution[b.id] -
        communityBudgetDistribution[a.id]
    )
    .map((category, index) => {
      const amount =
        communityBudgetDistribution[
          category.id
        ];

      const percentage =
        COMMUNITY_BUDGET > 0
          ? (amount / COMMUNITY_BUDGET) * 100
          : 0;

      return (
        <div
          key={category.id}
          className={`relative overflow-hidden rounded-xl border p-4 ${
            isDarkMode
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-neutral-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-neutral-800 text-emerald-400'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <CategoryIcon
                  name={category.icon}
                  className="w-4 h-4"
                />
              </div>

              <div className="min-w-0">
                <p
                  className={`font-mono text-[8px] uppercase tracking-widest ${
                    index === 0
                      ? 'text-emerald-600'
                      : isDarkMode
                      ? 'text-neutral-600'
                      : 'text-neutral-400'
                  }`}
                >
                  #{String(index + 1).padStart(
                    2,
                    '0'
                  )}
                </p>

                <h3 className="text-xs font-bold truncate mt-0.5">
                  {category.label}
                </h3>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="font-mono text-sm font-black">
                {formatCompactPeso(amount)}
              </p>

              <p
                className={`font-mono text-[9px] mt-0.5 ${
                  isDarkMode
                    ? 'text-neutral-600'
                    : 'text-neutral-400'
                }`}
              >
                {percentage.toFixed(1)}%
              </p>
            </div>
          </div>

          <div
            className={`h-1.5 rounded-full overflow-hidden mt-4 ${
              isDarkMode
                ? 'bg-neutral-800'
                : 'bg-neutral-100'
            }`}
          >
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  percentage,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      );
    })}
</div>

      {/* TOTAL */}
      <div
        className={`mt-5 pt-5 border-t ${
          isDarkMode
            ? 'border-neutral-800'
            : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`font-mono text-[9px] uppercase tracking-widest ${
              isDarkMode
                ? 'text-neutral-500'
                : 'text-neutral-400'
            }`}
          >
            Community Budget
          </span>

          <span className="font-mono text-sm font-black">
            ₱1,000,000,000
          </span>
        </div>

        <p
          className={`font-mono text-[9px] leading-relaxed mt-2 ${
            isDarkMode
              ? 'text-neutral-600'
              : 'text-neutral-400'
          }`}
        >
          Based on allocations from{' '}
          {communityTotals.participants.toLocaleString(
            'en-PH'
          )}{' '}
          Louisian
          {communityTotals.participants === 1
            ? ''
            : 's'}
          .
        </p>
      </div>
    </>
  )}

  {/* CTA */}
  {!hasSubmitted && (
    <button
      type="button"
      onClick={() => {
        document
          .getElementById('your-budget')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
      }}
      className={`w-full mt-7 rounded-xl border p-4 flex items-center justify-between gap-4 text-left transition-all active:scale-[0.99] ${
        isDarkMode
          ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15'
          : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
      }`}
    >
      <div>
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-600">
          Your Turn
        </p>

        <p className="text-sm font-black mt-1">
          How would you spend your ₱10M?
        </p>

        <p
          className={`text-[11px] mt-1 ${
            isDarkMode
              ? 'text-neutral-500'
              : 'text-neutral-500'
          }`}
        >
          Make your allocation and shape the
          community budget.
        </p>
      </div>

      <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 text-white flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </svg>
      </div>
    </button>
  )}
</section>

        {/* YOUR BUDGET */}

        <div
          id="your-budget"
          className="scroll-mt-24 flex items-end justify-between mb-4"
        >

          <div>
            <p className="font-mono text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
              Your Turn
            </p>

            <h2 className="text-2xl font-black tracking-tight mt-1">
              Your ₱10 Million
            </h2>
          </div>

          {!hasSubmitted && (
            <div className="text-right">
              <p
                className={`font-mono text-[9px] uppercase ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-400'
                }`}
              >
                Remaining
              </p>

              <p
                className={`font-mono text-sm font-black ${
                  remaining === 0
                    ? 'text-emerald-600'
                    : ''
                }`}
              >
                {formatCompactPeso(
                  remaining
                )}
              </p>
            </div>
          )}

        </div>

        {/* CATEGORIES */}

        <div className="space-y-3">

          {CATEGORIES.map(
            (category) => {
              const amount =
                allocations[
                  category.id
                ];

              const percentage =
                USER_BUDGET > 0
                  ? (amount /
                      USER_BUDGET) *
                    100
                  : 0;

              return (
                <div
                  key={category.id}
                  className={`rounded-2xl border p-4 sm:p-5 ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-800'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <div className="flex items-start gap-3">

                    <div
                      className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
                        isDarkMode
                          ? 'bg-neutral-800 text-emerald-400'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <CategoryIcon
                        name={category.icon}
                        className="w-5 h-5"
                      />
                    </div>

                    <div className="flex-1 min-w-0">

                      <div className="flex items-center justify-between gap-3">

                        <h3 className="font-bold">
                          {category.label}
                        </h3>

                        <span className="font-mono text-sm font-black">
                          {formatCompactPeso(
                            amount
                          )}
                        </span>

                      </div>

                      <p
                        className={`text-xs leading-relaxed mt-1 ${
                          isDarkMode
                            ? 'text-neutral-500'
                            : 'text-neutral-500'
                        }`}
                      >
                        {
                          category.description
                        }
                      </p>

                      <div
                        className={`h-1.5 rounded-full overflow-hidden mt-4 ${
                          isDarkMode
                            ? 'bg-neutral-800'
                            : 'bg-neutral-100'
                        }`}
                      >
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      {!hasSubmitted && (
                        <div className="flex flex-wrap gap-2 mt-4">

                          <button
                            type="button"
                            onClick={() =>
                              addAmount(
                                category.id,
                                1_000_000
                              )
                            }
                            disabled={
                              remaining <
                              1_000_000
                            }
                            className={`px-3 py-2 rounded-lg font-mono text-[10px] font-bold border disabled:opacity-30 ${
                              isDarkMode
                                ? 'border-neutral-700 hover:bg-neutral-800'
                                : 'border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            + ₱1M
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              addAmount(
                                category.id,
                                -1_000_000
                              )
                            }
                            disabled={
                              amount <
                              1_000_000
                            }
                            className={`px-3 py-2 rounded-lg font-mono text-[10px] font-bold border disabled:opacity-30 ${
                              isDarkMode
                                ? 'border-neutral-700 hover:bg-neutral-800'
                                : 'border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            − ₱1M
                          </button>

                          {remaining > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                addAmount(
                                  category.id,
                                  remaining
                                )
                              }
                              className={`px-3 py-2 rounded-lg font-mono text-[10px] font-bold border ${
                                isDarkMode
                                  ? 'border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                                  : 'border-neutral-200 text-neutral-500 hover:bg-neutral-100'
                              }`}
                            >
                              Put remaining
                            </button>
                          )}

                        </div>
                      )}

                    </div>

                  </div>
                </div>
              );
            }
          )}

        </div>

        {/* SUBMIT */}

        {!hasSubmitted && (
  <section className="mt-6">
    {error && (
      <div
        className={`mb-4 rounded-xl border px-4 py-3 font-mono text-xs ${
          isDarkMode
            ? 'bg-red-950/30 border-red-900/50 text-red-300'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}
      >
        {error}
      </div>
    )}

    <button
      type="button"
      onClick={handleSubmit}
      disabled={
        submitting ||
        userTotal !== USER_BUDGET
      }
      className={`w-full rounded-xl py-4 px-5 font-mono text-xs font-black uppercase tracking-widest transition-all ${
        submitting ||
        userTotal !== USER_BUDGET
          ? isDarkMode
            ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
            : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
          : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99]'
      }`}
    >
      {submitting
        ? 'Locking it in...'
        : remaining === 0
        ? 'Lock In My ₱10M'
        : `${formatCompactPeso(
            remaining
          )} left to allocate`}
    </button>

    <p
      className={`font-mono text-[9px] text-center mt-3 ${
        isDarkMode
          ? 'text-neutral-600'
          : 'text-neutral-400'
      }`}
    >
      Once submitted, your allocation cannot
      be changed for this round.
    </p>
  </section>
)}

        {hasSubmitted && (
          <section
  className={`mt-6 relative overflow-hidden rounded-2xl border ${
    isDarkMode
      ? 'bg-neutral-900 border-neutral-800'
      : 'bg-white border-neutral-200'
  }`}
>
  {/* PH accent */}
  <div className="h-1 flex">
    <div className="flex-1 bg-blue-600" />
    <div className="w-12 bg-yellow-400" />
    <div className="flex-1 bg-red-600" />
  </div>

  <div className="p-6 sm:p-8">
    {/* Success */}
    <div className="flex items-start gap-4">
      <div
        className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${
          isDarkMode
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        <UIIcon
          name="check"
          className="w-5 h-5"
        />
      </div>

      <div>
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-600">
          Allocation Submitted
        </p>

        <h3 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
          Your ₱10M is locked in.
        </h3>

        <p
          className={`text-sm leading-relaxed mt-2 ${
            isDarkMode
              ? 'text-neutral-400'
              : 'text-neutral-600'
          }`}
        >
          Your choices are now part of
          Tambayan&apos;s ₱1 billion community
          budget.
        </p>
      </div>
    </div>

    {/* Allocation receipt */}
    <div
      className={`mt-6 pt-5 border-t ${
        isDarkMode
          ? 'border-neutral-800'
          : 'border-neutral-100'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <UIIcon
          name="receipt"
          className={`w-4 h-4 ${
            isDarkMode
              ? 'text-neutral-500'
              : 'text-neutral-400'
          }`}
        />

        <p
          className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
            isDarkMode
              ? 'text-neutral-500'
              : 'text-neutral-400'
          }`}
        >
          Your Budget Receipt
        </p>
      </div>

      <div className="space-y-3">
        {CATEGORIES
          .filter(
            (category) =>
              allocations[category.id] > 0
          )
          .sort(
            (a, b) =>
              allocations[b.id] -
              allocations[a.id]
          )
          .map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isDarkMode
                      ? 'bg-neutral-800 text-neutral-400'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  <CategoryIcon
                    name={category.icon}
                    className="w-3.5 h-3.5"
                  />
                </div>

                <span className="text-xs font-medium truncate">
                  {category.label}
                </span>
              </div>

              <span className="font-mono text-xs font-black shrink-0">
                {formatCompactPeso(
                  allocations[category.id]
                )}
              </span>
            </div>
          ))}
      </div>

      <div
        className={`flex items-center justify-between mt-5 pt-4 border-t ${
          isDarkMode
            ? 'border-neutral-800'
            : 'border-neutral-100'
        }`}
      >
        <span
          className={`font-mono text-[9px] uppercase tracking-widest ${
            isDarkMode
              ? 'text-neutral-500'
              : 'text-neutral-400'
          }`}
        >
          Total
        </span>

        <span className="font-mono text-sm font-black">
          ₱10,000,000
        </span>
      </div>
    </div>

    {/* Strong message */}
    <div
      className={`mt-6 rounded-xl p-5 ${
        isDarkMode
          ? 'bg-neutral-950 border border-neutral-800'
          : 'bg-neutral-50 border border-neutral-100'
      }`}
    >
      <p className="text-lg sm:text-xl font-black tracking-tight leading-snug">
        You just decided where public money
        should go.
      </p>

      <p
        className={`text-sm leading-relaxed mt-3 ${
          isDarkMode
            ? 'text-neutral-400'
            : 'text-neutral-600'
        }`}
      >
        Sa game, ₱10 million lang ang
        pinagdesisyunan mo. In real life,
        public budgets affect millions of
        people.
      </p>

      <p
        className={`text-sm leading-relaxed mt-3 ${
          isDarkMode
            ? 'text-neutral-400'
            : 'text-neutral-600'
        }`}
      >
        Kaya huwag lang tanungin kung
        <strong
          className={
            isDarkMode
              ? 'text-white'
              : 'text-neutral-900'
          }
        >
          {' '}
          magkano ang ginastos
        </strong>
        . Tanungin din kung
        <strong
          className={
            isDarkMode
              ? 'text-white'
              : 'text-neutral-900'
          }
        >
          {' '}
          saan napunta, bakit doon napunta,
          at ano ang naging resulta.
        </strong>
      </p>

      <div
        className={`mt-5 pt-4 border-t ${
          isDarkMode
            ? 'border-neutral-800'
            : 'border-neutral-200'
        }`}
      >
        <p className="font-mono text-[10px] font-black uppercase tracking-widest text-emerald-600">
          Budget locked. Stay curious.
        </p>

        <p
          className={`font-mono text-[9px] mt-1 ${
            isDarkMode
              ? 'text-neutral-600'
              : 'text-neutral-400'
          }`}
        >
          Sana may resibo lahat.
        </p>
      </div>
    </div>
  </div>
</section>
        )}

        {/* CIVIC CONTEXT */}

        <section
          className={`mt-16 rounded-2xl border p-6 sm:p-8 ${
            isDarkMode
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-neutral-200'
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isDarkMode
                ? 'bg-neutral-800 text-emerald-400'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            <UIIcon
              name="flag"
              className="w-5 h-5"
            />
          </div>

          <h2 className="text-2xl font-black tracking-tight mt-4">
            This is just a game.
            <br />
            The idea isn&apos;t.
          </h2>

          <p
            className={`mt-4 text-sm leading-relaxed ${
              isDarkMode
                ? 'text-neutral-400'
                : 'text-neutral-600'
            }`}
          >
            Public budgets affect
            education, healthcare,
            infrastructure,
            transportation, agriculture,
            disaster preparedness, and
            everyday life.
          </p>

          <p
            className={`mt-3 text-sm leading-relaxed ${
              isDarkMode
                ? 'text-neutral-400'
                : 'text-neutral-600'
            }`}
          >
            Don&apos;t stop at asking how
            much was spent. Ask where it
            went, what it was for, and
            what evidence shows it
            delivered.
          </p>

          <div
            className={`mt-6 pt-5 border-t font-mono text-[9px] leading-relaxed ${
              isDarkMode
                ? 'border-neutral-800 text-neutral-600'
                : 'border-neutral-100 text-neutral-400'
            }`}
          >
            This is a fictional community
            experiment. Allocations shown
            here are created by Tambayan
            users and do not represent
            actual Philippine government
            budgets, spending, agencies,
            projects, or policy positions.
          </div>

        </section>

        {/* BACK */}

        <Link
          href="/wall"
          className={`mt-8 flex items-center justify-center font-mono text-[10px] font-bold uppercase tracking-widest ${
            isDarkMode
              ? 'text-neutral-500 hover:text-white'
              : 'text-neutral-400 hover:text-neutral-900'
          }`}
        >
          ← Back to Freedom Wall
        </Link>

      </main>
    </div>
  );
}