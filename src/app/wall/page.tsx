'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { toBlob } from 'html-to-image';
import Link from 'next/link';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  where,
  DocumentData,
  QueryDocumentSnapshot,
  QuerySnapshot,
  Query,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PostProps {
  id: string;
  userId?: string;
  authorAlias: string;
  content: string;
  category: string;
  createdAt: string;
  upvotes: number;
  replies: number;
  spotifyTrackId?: string;
  imageUrl?: string;
  isDeveloperPost?: boolean;
  isPinned?: boolean;
  cardTheme?: {
  background: string;
  border: string;
};
}

const CATEGORIES = [
  { id: 'all', label: 'All Entries' },
  { id: 'thoughts', label: 'Thoughts' },
  { id: 'love', label: 'Love & Connections' },
  { id: 'rants', label: 'Rants' },
  { id: 'advice', label: 'Advice' },
  { id: 'others', label: 'Others' },
];

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech or discriminatory content',
  'Explicit or inappropriate content',
  'Doxxing or personal information',
  'Spam or misleading information',
  'Other violation',
];

const CHARACTER_LIMIT = 280;

const CARD_BACKGROUNDS = [
  {
    id: 'default',
    label: 'Default',
    light: '#ffffff',
    dark: '#171717',
    borderLight: '#d4d4d4',
    borderDark: '#525252',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    light: '#f5f3ff',
    dark: '#292342',
    borderLight: '#c4b5fd',
    borderDark: '#7c6bb5',
  },
  {
    id: 'blue',
    label: 'Blue',
    light: '#eff6ff',
    dark: '#1e293b',
    borderLight: '#93c5fd',
    borderDark: '#5b7fb3',
  },
  {
    id: 'green',
    label: 'Green',
    light: '#f0fdf4',
    dark: '#1f3025',
    borderLight: '#86efac',
    borderDark: '#5b9b6d',
  },
  {
    id: 'rose',
    label: 'Rose',
    light: '#fff1f2',
    dark: '#332126',
    borderLight: '#F79ac0',
    borderDark: '#F79ac0',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    light: '#fefce8',
    dark: '#302d1b',
    borderLight: '#fde68a',
    borderDark: '#a18a43',
  },
];

const CARD_BORDERS = [
  {
    id: 'solid',
    label: 'Solid',
    style: 'solid',
  },
  {
    id: 'dashed',
    label: 'Dashed',
    style: 'dashed',
  },
  {
    id: 'dotted',
    label: 'Dotted',
    style: 'dotted',
  },
];

interface CardTheme {
  background: string;
  border: string;
}

interface CommunityPollOption {
  id: string;
  text: string;
  votes: number;
}

interface CommunityPoll {
  id: string;
  question: string;
  description?: string;
  options: CommunityPollOption[];
  active: boolean;
  status?: 'active' | 'closed';
}

interface StreakData {
  current: number;
  longest: number;
  lastActiveDate: string | null;
}

const STREAK_MILESTONES = [
  { days: 1, title: 'Enrolled' },
  { days: 3, title: 'Good Standing' },
  { days: 7, title: 'Academic Scholar' },
  { days: 14, title: "Dean's Lister" },
  { days: 30, title: 'Cum Laude' },
  { days: 60, title: 'Magna Cum Laude' },
  { days: 100, title: 'Summa Cum Laude' },
];

const getPhilippineDate = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

const getDateDifference = (
  date1: string,
  date2: string
): number => {
  const first = new Date(`${date1}T00:00:00`);
  const second = new Date(`${date2}T00:00:00`);

  return Math.round(
    (second.getTime() - first.getTime()) /
      (1000 * 60 * 60 * 24)
  );
};

const getEffectiveStreak = (
  streakData: StreakData
): number => {
  if (!streakData.lastActiveDate) {
    return 0;
  }

  const today = getPhilippineDate();

  const difference = getDateDifference(
    streakData.lastActiveDate,
    today
  );

  if (difference <= 1) {
    return streakData.current;
  }

  return 0;
};

const getStreakMilestone = (
  streak: number
) => {
  let currentMilestone =
    STREAK_MILESTONES[0];

  for (const milestone of STREAK_MILESTONES) {
    if (streak >= milestone.days) {
      currentMilestone = milestone;
    } else {
      break;
    }
  }

  return currentMilestone;
};

/*
 * IMPORTANT:
 * This function ONLY reads the existing anonymous chat ID.
 *
 * It does NOT create a new ID.
 *
 * The ID should already be created by the chat system.
 */
const getAnonymousUserId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem('unsaid_chat_user_id');
  } catch (error) {
    console.error(
      'Failed to get anonymous user ID:',
      error
    );
    return null;
  }
};

const Icons = {
  Heart: ({ filled }: { filled?: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transform active:scale-125"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),

  Message: () => (
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),

  Pen: () => (
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),

  Search: () => (
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),

  Share: () => (
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
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
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

  ShieldCheck: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
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

  Pin: (
    props: React.SVGProps<SVGSVGElement>
  ) => (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5" />
      <path d="M5 9l3-3 1-4h6l1 4 3 3" />
      <path d="M5 9h14" />
      <path d="M8 9v4l-2 2h12l-2-2V9" />
    </svg>
  ),
};

export default function WallPage() {
  const [streak, setStreak] =
    useState<StreakData>({
      current: 0,
      longest: 0,
      lastActiveDate: null,
    });

  const [streakLoading, setStreakLoading] =
    useState<boolean>(true);

  const [streakDetailsOpen, setStreakDetailsOpen] =
    useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] =
    useState<string>('all');

  const [searchQuery, setSearchQuery] =
    useState<string>('');

  const [debouncedSearch, setDebouncedSearch] =
    useState<string>('');

  const [searchingOlder, setSearchingOlder] = useState(false);
  const [searchChecked, setSearchChecked] = useState(0);
  const [searchError, setSearchError] = useState('');
  const [searchRetry, setSearchRetry] = useState(0);
  const feedGeneration = useRef(0);

  const [pinnedPosts, setPinnedPosts] =
    useState<PostProps[]>([]);

  const [rawPosts, setRawPosts] =
    useState<PostProps[]>([]);

  /* TEMP: COMMUNITY FAVORITES HIDDEN
  const [topPosts, setTopPosts] =
    useState<PostProps[]>([]);
  */

  const [loading, setLoading] =
    useState<boolean>(true);

  const [loadingMore, setLoadingMore] =
    useState<boolean>(false);

  const [hasMore, setHasMore] =
    useState<boolean>(true);

  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(
      null
    );

  const [copiedId, setCopiedId] =
    useState<string | null>(null);

  const [shareCardPost, setShareCardPost] =
  useState<PostProps | null>(null);

  const [shareCardBusy, setShareCardBusy] =
    useState<boolean>(false);

  const [shareCardMessage, setShareCardMessage] =
    useState<string>('');

  const shareCardRef =
    useRef<HTMLDivElement | null>(null);

  const [votedPosts, setVotedPosts] =
    useState<Record<string, boolean>>({});

  const [votingLocked, setVotingLocked] =
    useState<Record<string, boolean>>({});

  const [reportedPosts, setReportedPosts] =
    useState<Record<string, boolean>>({});

  const [expandedPosts, setExpandedPosts] =
    useState<Record<string, boolean>>({});

  const [activeReportPostId, setActiveReportPostId] =
    useState<string | null>(null);

  const [selectedReason, setSelectedReason] =
    useState<string>(REPORT_REASONS[0]);

  const [reportDetails, setReportDetails] =
    useState<string>('');

  const [isSubmittingReport, setIsSubmittingReport] =
    useState<boolean>(false);

  const [isDarkMode, setIsDarkMode] =
  useState<boolean>(false);

  /* COMMUNITY POLL */
  const [activePoll, setActivePoll] =
    useState<CommunityPoll | null>(null);

  const [pollLoading, setPollLoading] =
    useState<boolean>(true);

  const [pollVoting, setPollVoting] =
    useState<boolean>(false);

  const [pollVotedOptionId, setPollVotedOptionId] =
    useState<string | null>(null);

  const [pollError, setPollError] =
    useState<string>('');

  /* TEMP: LETTER IN A BOTTLE START */
  const [bottleLetterOpen, setBottleLetterOpen] =
    useState<boolean>(false);
  /* TEMP: LETTER IN A BOTTLE END */



useEffect(() => {
  try {
    const storedTheme =
      localStorage.getItem('unsaid_dark_mode');

    if (storedTheme !== null) {
      setIsDarkMode(JSON.parse(storedTheme));
    } else if (
      window.matchMedia &&
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
    ) {
      setIsDarkMode(true);
    }
  } catch (error) {
    console.error(
      'Failed to load dark mode:',
      error
    );
  }
}, []);

useEffect(() => {
  const loadStreak = async () => {
    const anonymousUserId =
      getAnonymousUserId();

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
      const userRef = doc(
        db,
        'users',
        anonymousUserId
      );

      const userSnapshot =
        await getDoc(userRef);

      if (userSnapshot.exists()) {
        const data =
          userSnapshot.data();

        const streakData =
          data.streak || {};

        setStreak({
          current:
            typeof streakData.current ===
            'number'
              ? streakData.current
              : 0,

          longest:
            typeof streakData.longest ===
            'number'
              ? streakData.longest
              : 0,

          lastActiveDate:
            typeof streakData.lastActiveDate ===
            'string'
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
      console.error(
        'Failed to load streak:',
        error
      );

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

useEffect(() => {
  try {
    const storedVotes =
      localStorage.getItem('unsaid_voted_posts');

    if (storedVotes) {
      const parsedVotes =
        JSON.parse(storedVotes);

      if (
        parsedVotes &&
        typeof parsedVotes === 'object'
      ) {
        setVotedPosts(parsedVotes);
      }
    }
  } catch (error) {
    console.error(
      'Failed to load voted posts:',
      error
    );

    setVotedPosts({});
  }
}, []);

useEffect(() => {
  try {
    const storedReports =
      localStorage.getItem('unsaid_reported_posts');

    if (storedReports) {
      const parsedReports =
        JSON.parse(storedReports);

      if (
        parsedReports &&
        typeof parsedReports === 'object'
      ) {
        setReportedPosts(parsedReports);
      }
    }
  } catch (error) {
    console.error(
      'Failed to load reported posts:',
      error
    );

    setReportedPosts({});
  }
}, []);


  /* =========================================================
     FORMAT POSTS
  ========================================================= */

  const formatPosts = (
    querySnapshot: any
  ): PostProps[] => {
    const fetched: PostProps[] = [];

    querySnapshot.forEach(
      (
        docSnap: QueryDocumentSnapshot<DocumentData>
      ) => {
        const data = docSnap.data();

        let formattedDate = 'Just now';

        if (data.createdAt?.toDate) {
          const dateObj =
            data.createdAt.toDate();

          formattedDate =
            dateObj.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }) +
            ' at ' +
            dateObj.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
        }

        fetched.push({
          id: docSnap.id,

          userId:
            data.userId ||
            undefined,

          authorAlias:
            data.authorAlias ||
            'Louisian',

          content:
            data.content || '',

          category:
            data.category ||
            'thoughts',

          createdAt:
            formattedDate,

          upvotes:
            data.upvotes || 0,

          replies:
            data.replies || 0,

          spotifyTrackId:
            data.spotifyTrackId ||
            undefined,

          imageUrl:
            data.imageUrl ||
            undefined,

          isDeveloperPost:
            data.isDeveloperPost ||
            false,

          isPinned:
            data.isPinned === true,

          cardTheme:
            data.cardTheme &&
            typeof data.cardTheme.background === 'string' &&
            typeof data.cardTheme.border === 'string'
              ? {
                  background: data.cardTheme.background,
                  border: data.cardTheme.border,
                }
              : undefined,
        });
      }
    );

    return fetched;
  };

  /* =========================================================
     FIRESTORE POSTS QUERY
  ========================================================= */

  const buildQuery = useCallback(
    (
      category: string,
      limitCount: number,
      startAfterDoc:
        | QueryDocumentSnapshot<DocumentData>
        | null = null
    ): Query => {
      const postsRef =
        collection(db, 'posts');

      const constraints: any[] = [
        where(
          'status',
          '==',
          'approved'
        ),
        orderBy(
          'createdAt',
          'desc'
        ),
      ];

      if (category !== 'all') {
        constraints.push(
          where(
            'category',
            '==',
            category
          )
        );
      }

      if (startAfterDoc) {
        constraints.push(
          startAfter(startAfterDoc)
        );
      }

      constraints.push(
        limit(limitCount)
      );

      return query(
        postsRef,
        ...constraints
      );
    },
    []
  );


  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(
        searchQuery.trim()
      );
    }, 600);

    return () =>
      clearTimeout(timer);
  }, [searchQuery]);


  useEffect(() => {
    const generation = ++feedGeneration.current;
    let cancelled = false;
    setSearchingOlder(false);
    setSearchChecked(0);
    setSearchError('');
    setLoadingMore(false);
    setLoading(true);
    setHasMore(true);
    setRawPosts([]);
    setPinnedPosts([]);
    setLastVisible(null);

    // Search every approved page, without attaching a collection-wide listener.
    // Keep only matches in memory. Cleanup prevents superseded requests writing state.
    if (debouncedSearch) {
      setHasMore(false);
      setSearchingOlder(true);
      const searchText = debouncedSearch.toLowerCase();
      const searchAllPages = async () => {
        const batchSize = 100;
        let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
        let checked = 0;
        const matches = new Map<string, PostProps>();
        try {
          while (!cancelled) {
            const snapshot: QuerySnapshot<DocumentData> = await getDocs(
              buildQuery(selectedCategory, batchSize, cursor)
            );
            if (cancelled || generation !== feedGeneration.current) return;
            checked += snapshot.size;
            for (const post of formatPosts(snapshot)) {
              if (post.content.toLowerCase().includes(searchText) ||
                  post.authorAlias.toLowerCase().includes(searchText)) {
                matches.set(post.id, post);
              }
            }
            setRawPosts(Array.from(matches.values()));
            setSearchChecked(checked);
            setLoading(false);
            if (snapshot.size < batchSize) break;
            cursor = snapshot.docs[snapshot.docs.length - 1];
          }
        } catch (error) {
          if (!cancelled && generation === feedGeneration.current) {
            console.error('Error searching older entries:', error);
            setSearchError('Search could not finish. Some older entries may be missing.');
          }
        } finally {
          if (!cancelled && generation === feedGeneration.current) {
            setSearchingOlder(false);
            setLoading(false);
          }
        }
      };
      void searchAllPages();
      return () => { cancelled = true; };
    }

    const savedCount = Number(
      sessionStorage.getItem(
        'tambayan_wall_loaded_count'
      ) || '10'
    );

    const fetchLimit = Number.isFinite(savedCount)
      ? Math.max(10, savedCount)
      : 10;

    const postsRef =
      collection(db, 'posts');

    const normalQuery = buildQuery(
      selectedCategory,
      fetchLimit
    );

    const unsubscribeNormal =
      onSnapshot(
        normalQuery,
        (querySnapshot) => {
          const formatted =
            formatPosts(
              querySnapshot
            );

          if (
            querySnapshot.docs.length >
            0
          ) {
            setLastVisible(
              querySnapshot.docs[
                querySnapshot.docs.length -
                  1
              ]
            );

            if (
              querySnapshot.docs.length <
                fetchLimit
            ) {
              setHasMore(false);
            } else {
              setHasMore(true);
            }
          } else {
            setLastVisible(null);
            setHasMore(false);
          }

          setRawPosts(formatted);
          setLoading(false);
        },
        (error) => {
          console.error(
            'Error listening to normal posts:',
            error
          );

          setLoading(false);
        }
      );

    const pinnedConstraints: any[] = [
      where(
        'status',
        '==',
        'approved'
      ),
      where(
        'isPinned',
        '==',
        true
      ),
      orderBy(
        'createdAt',
        'desc'
      ),
    ];

    /*
     * If a category is selected, insert the category
     * condition between status and isPinned.
     */
    if (
      selectedCategory !== 'all'
    ) {
      pinnedConstraints.splice(
        1,
        0,
        where(
          'category',
          '==',
          selectedCategory
        )
      );
    }

    const pinnedQuery = query(
      postsRef,
      ...pinnedConstraints
    );

    const unsubscribePinned =
      onSnapshot(
        pinnedQuery,
        (querySnapshot) => {
          const formatted =
            formatPosts(
              querySnapshot
            );

          setPinnedPosts(
            formatted
          );
        },
        (error) => {
          console.error(
            'Error listening to pinned posts:',
            error
          );

          setPinnedPosts([]);
        }
      );

    return () => {
      cancelled = true;
      unsubscribeNormal();
      unsubscribePinned();
    };
  }, [
    selectedCategory,
    debouncedSearch,
    searchRetry,
    buildQuery,
  ]);

  /* =========================================================
   TEMP: COMMUNITY FAVORITES HIDDEN
   The old Top 5 Firestore listener is intentionally disabled
   so hidden content does not keep generating reads.
========================================================= */

  /* =========================================================
     COMMUNITY POLL
  ========================================================= */

  useEffect(() => {
    const pollsRef = collection(db, 'polls');

    const activePollQuery = query(
      pollsRef,
      where('active', '==', true),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      activePollQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setActivePoll(null);
          setPollVotedOptionId(null);
          setPollLoading(false);
          return;
        }

        const pollDoc = snapshot.docs[0];
        const data = pollDoc.data();

        const options: CommunityPollOption[] =
          Array.isArray(data.options)
            ? data.options.map((option: any) => ({
                id: String(option.id),
                text: String(option.text || ''),
                votes:
                  typeof option.votes === 'number'
                    ? option.votes
                    : 0,
              }))
            : [];

        const nextPoll: CommunityPoll = {
          id: pollDoc.id,
          question: data.question || 'Community Poll',
          description: data.description || '',
          options,
          active: data.active === true,
          status: data.status || 'active',
        };

        setActivePoll(nextPoll);

        try {
          const storedVote = localStorage.getItem(
            `tambayan_poll_vote_${pollDoc.id}`
          );

          setPollVotedOptionId(storedVote);
        } catch {
          setPollVotedOptionId(null);
        }

        setPollLoading(false);
      },
      (error) => {
        console.error('Error loading active poll:', error);
        setPollError('Could not load the community poll.');
        setPollLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handlePollVote = async (
    optionId: string
  ) => {
    if (
      !activePoll ||
      pollVoting ||
      pollVotedOptionId
    ) {
      return;
    }

    setPollVoting(true);
    setPollError('');

    try {
      const pollRef = doc(
        db,
        'polls',
        activePoll.id
      );

      await runTransaction(
        db,
        async (transaction) => {
          const pollSnapshot =
            await transaction.get(pollRef);

          if (!pollSnapshot.exists()) {
            throw new Error('Poll no longer exists.');
          }

          const data = pollSnapshot.data();

          if (
            data.active !== true ||
            data.status === 'closed'
          ) {
            throw new Error('This poll is already closed.');
          }

          const options = Array.isArray(data.options)
            ? data.options
            : [];

          const optionExists = options.some(
            (option: any) =>
              String(option.id) === optionId
          );

          if (!optionExists) {
            throw new Error('Poll option not found.');
          }

          const updatedOptions = options.map(
            (option: any) => ({
              ...option,
              votes:
                String(option.id) === optionId
                  ? (Number(option.votes) || 0) + 1
                  : Number(option.votes) || 0,
            })
          );

          transaction.update(
            pollRef,
            {
              options: updatedOptions,
            }
          );
        }
      );

      localStorage.setItem(
        `tambayan_poll_vote_${activePoll.id}`,
        optionId
      );

      setPollVotedOptionId(optionId);
    } catch (error: any) {
      console.error(
        'Error submitting poll vote:',
        error
      );

      setPollError(
        error?.message ||
          'Could not submit your vote.'
      );
    } finally {
      setPollVoting(false);
    }
  };

  const pollTotalVotes =
    activePoll?.options.reduce(
      (total, option) =>
        total + option.votes,
      0
    ) || 0;

  /* =========================================================
     DARK MODE
  ========================================================= */

  const toggleDarkMode = () => {
    const nextMode =
      !isDarkMode;

    setIsDarkMode(
      nextMode
    );

    try {
      localStorage.setItem(
        'unsaid_dark_mode',
        JSON.stringify(
          nextMode
        )
      );
    } catch (e) {}
  };

  /* =========================================================
     COMBINE POSTS
  ========================================================= */

  const posts = useMemo(() => {
    const uniquePosts = new Map<string, PostProps>();
    // Separate pinned listener wins when the normal feed contains the same post.
    for (const post of [...pinnedPosts, ...rawPosts]) {
      if (!uniquePosts.has(post.id)) uniquePosts.set(post.id, post);
    }
    const searchText = debouncedSearch.toLowerCase();
    const filteredPosts = Array.from(uniquePosts.values()).filter((post) =>
      !searchText || post.content.toLowerCase().includes(searchText) ||
      post.authorAlias.toLowerCase().includes(searchText)
    );
    return [
      ...filteredPosts.filter((post) => post.isPinned),
      ...filteredPosts.filter((post) => !post.isPinned),
    ];
  }, [
    rawPosts,
    pinnedPosts,
    debouncedSearch,
  ]);

  /* =========================================================
     RESTORE WALL POSITION
  ========================================================= */

  useEffect(() => {
    if (loading) {
      return;
    }

    const returnPostId = sessionStorage.getItem(
      'tambayan_wall_return_post'
    );

    if (!returnPostId) {
      return;
    }

    const timeout = setTimeout(() => {
      const postElement = document.getElementById(
        `post-${returnPostId}`
      );

      if (!postElement) {
        return;
      }

      postElement.scrollIntoView({
        behavior: 'auto',
        block: 'center',
      });

      sessionStorage.removeItem(
        'tambayan_wall_return_post'
      );
    }, 100);

    return () => clearTimeout(timeout);
  }, [loading, posts]);

  /* =========================================================
     LOAD MORE
  ========================================================= */

  const loadMorePosts =
    async () => {
      if (
        !lastVisible ||
        loadingMore ||
        !hasMore ||
        debouncedSearch !== ''
      ) {
        return;
      }

      const generation = feedGeneration.current;
      setLoadingMore(true);

      try {
        const nextQuery =
          buildQuery(
            selectedCategory,
            10,
            lastVisible
          );

        const querySnapshot =
          await getDocs(
            nextQuery
          );

        if (generation !== feedGeneration.current) return;

        if (
          querySnapshot.empty
        ) {
          setHasMore(false);
          return;
        }

        const morePosts =
          formatPosts(
            querySnapshot
          );

        setRawPosts(
          (prev) => {
            const existingIds =
              new Set(
                prev.map(
                  (post) =>
                    post.id
                )
              );

            const uniquePosts =
              morePosts.filter(
                (post) =>
                  !existingIds.has(
                    post.id
                  )
              );

            return [
              ...prev,
              ...uniquePosts,
            ];
          }
        );

        setLastVisible(
          querySnapshot.docs[
            querySnapshot.docs.length -
              1
          ]
        );

        if (
          querySnapshot.docs.length <
          10
        ) {
          setHasMore(false);
        }
      } catch (error) {
        console.error(
          'Error loading more posts:',
          error
        );
      } finally {
        if (generation === feedGeneration.current) setLoadingMore(false);
      }
    };

  /* =========================================================
     VOTING
  ========================================================= */

  const handleVoteToggle =
    async (id: string) => {
      if (
        votingLocked[id]
      ) {
        return;
      }

      setVotingLocked(
        (prev) => ({
          ...prev,
          [id]: true,
        })
      );

      const hasVoted =
        votedPosts[id];

      const voteChange =
        hasVoted ? -1 : 1;

      try {
        const postRef =
          doc(
            db,
            'posts',
            id
          );

        await updateDoc(
          postRef,
          {
            upvotes:
              increment(
                voteChange
              ),
          }
        );

        const updatedVotes = {
          ...votedPosts,
        };

        if (hasVoted) {
          delete updatedVotes[
            id
          ];
        } else {
          updatedVotes[id] =
            true;
        }

        setVotedPosts(
          updatedVotes
        );

        localStorage.setItem(
          'unsaid_voted_posts',
          JSON.stringify(
            updatedVotes
          )
        );
      } catch (error) {
        console.error(
          'Error updating vote:',
          error
        );
      } finally {
        setVotingLocked(
          (prev) => ({
            ...prev,
            [id]: false,
          })
        );
      }
    };

  /* =========================================================
     REPORT
  ========================================================= */

  const handleReportSubmit =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (
        !activeReportPostId ||
        isSubmittingReport
      ) {
        return;
      }

      setIsSubmittingReport(
        true
      );

      try {
        await addDoc(
          collection(
            db,
            'reports'
          ),
          {
            postId:
              activeReportPostId,

            reason:
              selectedReason,

            details:
              reportDetails.trim(),

            createdAt:
              serverTimestamp(),

            status:
              'pending',
          }
        );

        const updatedReports =
          {
            ...reportedPosts,
            [activeReportPostId]:
              true,
          };

        setReportedPosts(
          updatedReports
        );

        localStorage.setItem(
          'unsaid_reported_posts',
          JSON.stringify(
            updatedReports
          )
        );

        setActiveReportPostId(
          null
        );

        setReportDetails('');

        setSelectedReason(
          REPORT_REASONS[0]
        );

        alert(
          'Thank you. Your report has been sent to the moderators.'
        );
      } catch (error) {
        console.error(
          'Error submitting report:',
          error
        );

        alert(
          'Failed to submit report. Please try again.'
        );
      } finally {
        setIsSubmittingReport(
          false
        );
      }
    };

/* =========================================================
   SHARE CARD
========================================================= */

const getCategoryLabel = (
  categoryId: string
): string => {
  return (
    CATEGORIES.find(
      (category) =>
        category.id === categoryId
    )?.label || categoryId
  );
};

const openShareCard = (
  post: PostProps
) => {
  setShareCardMessage('');
  setShareCardPost(post);
};

const closeShareCard = () => {
  if (shareCardBusy) {
    return;
  }

  setShareCardPost(null);
  setShareCardMessage('');
};

const createShareCardBlob =
  async (): Promise<Blob> => {
    if (!shareCardRef.current) {
      throw new Error(
        'Share card is not ready.'
      );
    }

    /*
     * Wait for the website fonts to finish loading.
     * This helps make the exported image match
     * the preview exactly.
     */
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const node =
      shareCardRef.current;

    /*
     * Automatically calculate the pixel ratio
     * required to export the card at 1080px wide.
     *
     * Since the card is 4:5, this also gives us
     * 1080 × 1350.
     */
    const pixelRatio =
      1080 /
      node.getBoundingClientRect().width;

    const blob =
      await toBlob(node, {
        pixelRatio,
        cacheBust: true,

        /*
         * Don't let browser scaling alter
         * the appearance of the card.
         */
        width:
          node.getBoundingClientRect().width,

        height:
          node.getBoundingClientRect().height,
      });

    if (!blob) {
      throw new Error(
        'Failed to create share card.'
      );
    }

    return blob;
  };

const downloadShareCard =
  async (
    post: PostProps
  ) => {
    if (shareCardBusy) {
      return;
    }

    setShareCardBusy(true);

    setShareCardMessage(
      'Creating your story...'
    );

    try {
      const blob =
        await createShareCardBlob();

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          'a'
        );

      anchor.href =
        objectUrl;

      anchor.download =
        `tambayanslu-${post.id}.png`;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        objectUrl
      );

      setShareCardMessage(
        'Story downloaded! You can now upload it to IG, Facebook, or Messenger.'
      );
    } catch (error) {
      console.error(
        'Failed to download share card:',
        error
      );

      setShareCardMessage(
        'Could not create the story. Please try again.'
      );
    } finally {
      setShareCardBusy(false);
    }
  };

const shareCardImage =
  async (
    post: PostProps
  ) => {
    if (shareCardBusy) {
      return;
    }

    setShareCardBusy(true);

    setShareCardMessage(
      'Creating your story...'
    );

    try {
      const blob = 
        await createShareCardBlob();

      const file =
        new File(
          [blob],
          `tambayanslu-${post.id}.png`,
          {
            type: 'image/png',
          }
        );

      /*
       * Mobile browsers can usually send this
       * directly to the native share sheet.
       */
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [file],
        })
      ) {
        await navigator.share({
          files: [file],
          title:
            'TambayanSLU Entry',
          text:
            'Shared from TambayanSLU',
        });

        setShareCardMessage(
          'Shared!'
        );

        return;
      }

      /*
       * Desktop/fallback:
       * automatically download the image.
       */
      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          'a'
        );

      anchor.href =
        objectUrl;

      anchor.download =
        `tambayanslu-${post.id}.png`;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        objectUrl
      );

      setShareCardMessage(
        'Your browser cannot share images directly, so the story was downloaded instead.'
      );
    } catch (error: any) {
      /*
       * Don't show an error when the user simply
       * closes the native share sheet.
       */
      if (
        error?.name !==
        'AbortError'
      ) {
        console.error(
          'Failed to share card:',
          error
        );

        setShareCardMessage(
          'Could not share the story. Please try again.'
        );
      }
    } finally {
      setShareCardBusy(false);
    }
  };

const copyPostLink =
  async (
    id: string
  ) => {
    const postUrl =
      `${window.location.origin}/post/${id}`;

    try {
      await navigator.clipboard.writeText(
        postUrl
      );

      setCopiedId(id);

      setShareCardMessage(
        'Post link copied!'
      );

      setTimeout(
        () => {
          setCopiedId(null);
        },
        2000
      );
    } catch (error) {
      console.error(
        'Failed to copy post link:',
        error
      );

      setShareCardMessage(
        'Could not copy the link.'
      );
    }
  };

  /* =========================================================
     EXPAND POST
  ========================================================= */

  const toggleExpand = (
    id: string
  ) => {
    setExpandedPosts(
      (prev) => ({
        ...prev,
        [id]: !prev[id],
      })
    );
  };

  /* =========================================================
     STREAK DISPLAY
  ========================================================= */

  const effectiveStreak =
    getEffectiveStreak(streak);

  const currentMilestone =
    getStreakMilestone(effectiveStreak);

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
              href="/"
              className={
                isDarkMode
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-500 hover:text-neutral-900'
              }
            >
              Home
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

        {/* FREEDOM WALL HEADER */}
        <section className="mb-8 sm:mb-10">

          {/* STREAK */}
          {!streakLoading && (
            <button
              type="button"
              onClick={() => setStreakDetailsOpen(true)}
              className={`mb-7 mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full px-3 py-1.5 font-mono text-[10px] sm:text-xs transition-all active:scale-[0.98] ${
                isDarkMode
                  ? 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  : 'bg-white text-neutral-500 border border-neutral-200 hover:border-neutral-300 hover:text-neutral-700'
              }`}
            >
              <span className="streak-fire inline-flex text-orange-500">
                <Icons.Flame />
              </span>

              {effectiveStreak > 0 ? (
                <>
                  <span>
                    {effectiveStreak} day{effectiveStreak !== 1 ? 's' : ''} streak
                  </span>
                  <span className={isDarkMode ? 'text-neutral-700' : 'text-neutral-300'}>•</span>
                  <span className="font-bold text-emerald-600">
                    {currentMilestone.title}
                  </span>
                </>
              ) : (
                <span>Start your streak</span>
              )}

              <span className="font-bold text-emerald-600">
                View
              </span>
            </button>
          )}

          <div className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 ${
            isDarkMode
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-neutral-200'
          }`}>
            <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">

                  <h1 className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${
                    isDarkMode ? 'text-white' : 'text-neutral-900'
                  }`}>
                    What&apos;s on your mind?
                  </h1>

                </div>

                <Link
                  href="/post"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-transform active:scale-95 dark:bg-emerald-600"
                >
                  <Icons.Pen />
                  Say Something
                </Link>

                <Link
                  href="/entries"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-transform active:scale-95 dark:bg-emerald-600"
                >
                  My entries
                </Link>
              </div>

              <div className={`mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 font-mono text-[9px] uppercase tracking-wider ${
                isDarkMode
                  ? 'border-neutral-800 text-neutral-500'
                  : 'border-neutral-100 text-neutral-400'
              }`}>
                <span>Anonymous aliases</span>
                <span>•</span>
                <span>Community moderated</span>
                <span>•</span>
                <Link
                  href="/guidelines"
                  className="font-bold text-emerald-600 hover:text-emerald-500"
                >
                  Read guidelines
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* DISCOVERY */}
        <section className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
                isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
              }`}>
                Explore the wall
              </p>
              <h2 className={`mt-1 text-lg font-bold ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}>
                Find something worth reading.
              </h2>
            </div>

          </div>

          {/* SEARCH */}
          <div className="relative mb-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
              <Icons.Search />
            </div>

            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries or aliases..."
              aria-label="Search Freedom Wall entries"
              className={`w-full rounded-xl border py-3.5 pl-10 pr-11 text-sm font-mono shadow-2xs focus:outline-none ${
                isDarkMode
                  ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-emerald-500'
                  : 'bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
              }`}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className={`absolute inset-y-0 right-0 flex w-11 items-center justify-center text-lg ${
                  isDarkMode
                    ? 'text-neutral-600 hover:text-neutral-200'
                    : 'text-neutral-400 hover:text-neutral-800'
                }`}
              >
                ×
              </button>
            )}
          </div>

          {/* CATEGORIES */}
          <div className="relative">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={selectedCategory === cat.id}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    selectedCategory === cat.id
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm dark:border-emerald-600 dark:bg-emerald-600'
                      : isDarkMode
                        ? 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-white'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            COMMUNITY POLL
            Replaces Community Favorites temporarily.
        ====================================================== */}
        {!pollLoading && activePoll && (
          <section
            className={`mb-10 overflow-hidden rounded-2xl border ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-white border-neutral-200'
            }`}
          >
            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    Community Poll
                  </p>

                  <h2
                    className={`text-xl font-extrabold tracking-tight sm:text-2xl ${
                      isDarkMode
                        ? 'text-white'
                        : 'text-neutral-900'
                    }`}
                  >
                    {activePoll.question}
                  </h2>

                  {activePoll.description && (
                    <p
                      className={`mt-2 text-sm leading-relaxed ${
                        isDarkMode
                          ? 'text-neutral-400'
                          : 'text-neutral-600'
                      }`}
                    >
                      {activePoll.description}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  Live
                </span>
              </div>

              <div className="space-y-2.5">
                {activePoll.options.map((option) => {
                  const hasVoted =
                    Boolean(pollVotedOptionId);

                  const isSelected =
                    pollVotedOptionId === option.id;

                  const percentage =
                    pollTotalVotes > 0
                      ? Math.round(
                          (option.votes /
                            pollTotalVotes) *
                            100
                        )
                      : 0;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={
                        hasVoted ||
                        pollVoting
                      }
                      onClick={() =>
                        handlePollVote(option.id)
                      }
                      className={`relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all ${
                        hasVoted
                          ? isSelected
                            ? isDarkMode
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-emerald-300 bg-emerald-50'
                            : isDarkMode
                              ? 'border-neutral-800 bg-neutral-950/40'
                              : 'border-neutral-200 bg-neutral-50'
                          : isDarkMode
                            ? 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-700 hover:bg-neutral-800/60'
                            : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-neutral-100'
                      } disabled:cursor-default`}
                    >
                      {hasVoted && (
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                            isSelected
                              ? isDarkMode
                                ? 'bg-emerald-500/10'
                                : 'bg-emerald-100/70'
                              : isDarkMode
                                ? 'bg-neutral-800/60'
                                : 'bg-neutral-200/50'
                          }`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      )}

                      <div className="relative flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : isDarkMode
                                  ? 'border-neutral-600'
                                  : 'border-neutral-300'
                            }`}
                          >
                            {isSelected && (
                              <span className="text-[10px]">
                                ✓
                              </span>
                            )}
                          </span>

                          <span
                            className={`text-sm font-semibold ${
                              isDarkMode
                                ? 'text-neutral-200'
                                : 'text-neutral-800'
                            }`}
                          >
                            {option.text}
                          </span>
                        </div>

                        {hasVoted && (
                          <span
                            className={`shrink-0 font-mono text-xs font-bold ${
                              isSelected
                                ? 'text-emerald-600'
                                : isDarkMode
                                  ? 'text-neutral-400'
                                  : 'text-neutral-500'
                            }`}
                          >
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                className={`mt-4 flex items-center justify-between gap-3 border-t pt-4 font-mono text-[9px] uppercase tracking-wider ${
                  isDarkMode
                    ? 'border-neutral-800 text-neutral-500'
                    : 'border-neutral-100 text-neutral-400'
                }`}
              >
                <span>
                  {pollVotedOptionId
                    ? `${pollTotalVotes} ${
                        pollTotalVotes === 1
                          ? 'vote'
                          : 'votes'
                      }`
                    : 'Vote to reveal results'}
                </span>

                {pollVotedOptionId && (
                  <span className="font-bold text-emerald-600">
                    Vote recorded
                  </span>
                )}
              </div>

              {pollError && (
                <p className="mt-3 text-xs text-rose-500">
                  {pollError}
                </p>
              )}
            </div>
          </section>
        )}

        {/* TEMP: COMMUNITY FAVORITES HIDDEN
            The previous "Community Favorites / Most Upvoted"
            UI was removed from rendering while the poll is active.
            Its Top 5 Firestore listener is also disabled above.
        */}

        {/* LATEST FEED HEADER */}
        <section className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
              isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
            }`}>
              {selectedCategory === 'all'
                ? 'Latest entries'
                : getCategoryLabel(selectedCategory)}
            </p>
            <h2 className={`mt-1 text-xl font-extrabold tracking-tight ${
              isDarkMode ? 'text-white' : 'text-neutral-900'
            }`}>
              {debouncedSearch
                ? `Results for “${debouncedSearch}”`
                : 'Fresh from the wall'}
            </h2>
          </div>

        </section>

        {debouncedSearch && (
          <div role="status" aria-live="polite" className="mb-4 text-sm text-neutral-500">
            {searchingOlder
              ? `Searching older entries… ${searchChecked} checked so far.`
              : searchError || `Search complete. ${searchChecked} entries checked.`}
            {searchError && (
              <button type="button" onClick={() => setSearchRetry((value) => value + 1)}
                className="ml-2 underline font-semibold">
                Retry search
              </button>
            )}
          </div>
        )}

        {/* POSTS */}
        {loading ? (
          <div className="space-y-4" aria-label="Loading Freedom Wall entries">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className={`animate-pulse rounded-2xl border p-5 sm:p-6 ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-800'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`h-6 w-32 rounded-md ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`} />
                  <div className={`h-6 w-20 rounded-md ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`} />
                </div>
                <div className={`mt-5 h-4 w-full rounded ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`} />
                <div className={`mt-2 h-4 w-[88%] rounded ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`} />
                <div className={`mt-2 h-4 w-[62%] rounded ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`} />
                <div className={`mt-6 h-px w-full ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`} />
                <div className="mt-4 flex gap-4">
                  <div className={`h-5 w-14 rounded ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`} />
                  <div className={`h-5 w-20 rounded ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-100'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">

            {posts.map(
              (post) => {
                const hasVoted =
                  votedPosts[
                    post.id
                  ];

                const isLocked =
                  votingLocked[
                    post.id
                  ];

                const isReported =
                  reportedPosts[
                    post.id
                  ];

                const isDev =
                  post.isDeveloperPost;

                const selectedBackground =
                  CARD_BACKGROUNDS.find(
                    (item) => item.id === post.cardTheme?.background
                  ) || CARD_BACKGROUNDS[0];

                const selectedBorder =
                  CARD_BORDERS.find(
                    (item) => item.id === post.cardTheme?.border
                  ) || CARD_BORDERS[0];

                const isLongContent =
                  post.content.length >
                  CHARACTER_LIMIT;

                const isExpanded =
                  expandedPosts[
                    post.id
                  ];

                const displayContent =
                  isLongContent &&
                  !isExpanded
                    ? `${post.content.slice(
                        0,
                        CHARACTER_LIMIT
                      )}...`
                    : post.content;

                return (
                  <article
                    id={`post-${post.id}`}
                    key={post.id}
                    className={`p-5 sm:p-6 rounded-2xl relative group transition-all duration-200 sm:hover:-translate-y-0.5 hover:shadow-lg ${
                      isDev
                        ? isDarkMode
                          ? 'bg-emerald-950/20 border-2 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/10'
                          : 'bg-emerald-50/50 border-2 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20'
                        : post.isPinned
                          ? isDarkMode
                            ? 'bg-amber-950/20 border-2 border-amber-500/50 shadow-md ring-1 ring-amber-500/10'
                            : 'bg-amber-50/60 border-2 border-amber-400/60 shadow-md ring-1 ring-amber-400/20'
                          : 'shadow-xs'
                    }`}
                    style={
                      !isDev && !post.isPinned
                        ? {
                            backgroundColor: isDarkMode
                              ? selectedBackground.dark
                              : selectedBackground.light,
                            borderStyle: selectedBorder.style,
                            borderWidth: '2px',
                            borderColor: isDarkMode
                              ? selectedBackground.borderDark
                              : selectedBackground.borderLight,
                          }
                        : undefined
                    }
                  >

                    {/* OFFICIAL BADGE */}
                    {isDev && (
                      <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase tracking-widest rounded-full shadow-xs">
                        <Icons.ShieldCheck />
                        <span>
                          Official Announcement
                        </span>
                      </div>
                    )}

                    {/* PINNED BADGE */}
                    {post.isPinned && (
                      <div className="absolute -top-3 right-6 inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 text-white rounded-full shadow-xs">
                        <Icons.Pin className="w-3 h-3" />
                        <span className="text-[9px] font-semibold tracking-wide">
                          PINNED
                        </span>
                      </div>
                    )}

                    {/* POST HEADER */}
                    <div
                      className={`mb-4 ${
                        isDev ? 'mt-1' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">

                        {/* AUTHOR + DATE */}
                        <div className="min-w-0 flex-1">

                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-2.5 py-1 rounded-md border font-bold font-mono text-[11px] uppercase tracking-wider whitespace-nowrap ${
                                isDev
                                  ? isDarkMode
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-emerald-100/80 text-emerald-900 border-emerald-200'
                                  : isDarkMode
                                    ? 'bg-black/30 text-white border-white/30'
                                    : 'bg-white/60 text-neutral-950 border-black/15'
                              }`}
                            >
                              {post.authorAlias}
                            </span>
                          </div>

                          {/* DATE */}
                          <div
                            className={`mt-1.5 flex items-center gap-1.5 font-mono text-[10px] ${
                              isDev
                                ? 'text-neutral-400'
                                : isDarkMode
                                  ? 'text-white/60'
                                  : 'text-neutral-600'
                            }`}
                          >
                            <span>•</span>
                            <span>{post.createdAt}</span>
                          </div>

                        </div>

                        {/* CATEGORY */}
                        <span
                          className={`shrink-0 max-w-[45%] truncate text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md ${
                            isDev
                              ? 'bg-emerald-100 text-emerald-800 font-bold'
                              : isDarkMode
                                ? 'bg-black/30 text-white border border-white/30'
                                : 'bg-white/60 text-neutral-950 border border-black/15'
                          }`}
                        >
                          {getCategoryLabel(post.category)}
                        </span>

                      </div>
                    </div>

                    {/* CONTENT */}
                    <div className="mb-6">

                      <p
                        className={`text-base sm:text-lg md:text-xl font-normal leading-relaxed break-words whitespace-pre-wrap ${
                          isDev
                            ? isDarkMode
                              ? 'text-emerald-200 font-semibold'
                              : 'text-emerald-950 font-semibold'
                            : isDarkMode
                              ? 'text-white'
                              : 'text-neutral-950'
                        }`}
                      >
                        {
                          displayContent
                        }
                      </p>

                      {isLongContent && (
                        <button
                          onClick={() =>
                            toggleExpand(
                              post.id
                            )
                          }
                          className="mt-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400 inline-block focus:outline-none"
                        >
                          {isExpanded
                            ? 'See less'
                            : 'See more'}
                        </button>
                      )}

                    </div>

                    {/* IMAGE ATTACHMENT */}
                    {post.imageUrl && (
                      <div className="mb-6 overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950">
                        <img
                          src={
                            post.imageUrl
                          }
                          alt="Attached image"
                          loading="lazy"
                          className="w-full max-h-[600px] object-contain"
                        />
                      </div>
                    )}

                    {/* SPOTIFY */}
                    {post.spotifyTrackId && (
                      <div className="mb-6">
                        <iframe
                          src={`https://open.spotify.com/embed/track/${post.spotifyTrackId}?utm_source=generator&theme=${isDarkMode ? '1' : '0'}`}
                          width="100%"
                          height="80"
                          frameBorder="0"
                          allow="encrypted-media"
                          className={`rounded-xl border shadow-2xs ${
                            isDarkMode
                              ? 'border-neutral-800'
                              : 'border-neutral-100'
                          }`}
                        />
                      </div>
                    )}

                    {/* ACTIONS */}
                    <div
                      className={`flex flex-wrap items-center justify-between gap-y-3 pt-4 border-t ${
                        isDev
                          ? isDarkMode
                            ? 'border-emerald-900/40'
                            : 'border-emerald-200/60'
                          : isDarkMode
                            ? 'border-white/30'
                            : 'border-black/20'
                      }`}
                    >

                      <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs font-semibold">

                        {/* LIKE */}
                        <button
                          onClick={() =>
                            handleVoteToggle(
                              post.id
                            )
                          }
                          disabled={
                            isLocked
                          }
                          className={`flex items-center gap-2 ${
                            isLocked
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          } ${
                            hasVoted
                              ? 'text-rose-500 hover:text-rose-600'
                              : isDev
                                ? 'text-emerald-600 hover:text-rose-500'
                                : isDarkMode
                                  ?'text-white/80 hover:text-rose-500'
                                  : 'text-neutral-800 hover:text-rose-500'
                          }`}
                        >
                          <Icons.Heart filled={hasVoted} />

                          <span>
                            {
                              post.upvotes
                            }
                          </span>
                        </button>

                        {/* REPLIES */}
                        <Link
                            href={`/post/${post.id}`}
                            onClick={() => {
                              sessionStorage.setItem(
                                'tambayan_wall_return_post',
                                post.id
                              );

                              sessionStorage.setItem(
                                'tambayan_wall_loaded_count',
                                rawPosts.length.toString()
                              );
                            }}
                          className={`flex items-center gap-2 cursor-pointer ${
                            isDev
                              ? 'text-emerald-600 hover:text-emerald-400'
                              : isDarkMode
                                ? 'text-white/80 hover:text-white'
                                : 'text-neutral-800 hover:text-neutral-950'
                          }`}
                        >
                          <Icons.Message />

                          <span>
                            {
                              post.replies
                            }{' '}
                            {post.replies === 1 ? 'Reply' : 'Replies'}
                          </span>
                        </Link>

                      </div>

                      <div className="flex items-center gap-4">

                        {/* REPORT */}
                        {!isDev && (
                          <button
                            onClick={() =>
                              setActiveReportPostId(
                                post.id
                              )
                            }
                            disabled={
                              isReported
                            }
                            className={`font-mono text-[11px] uppercase tracking-wider disabled:opacity-50 ${
                              isDarkMode
                                ? 'text-white/70 hover:text-rose-400'
                                : 'text-neutral-700 hover:text-rose-600'
                            }`}
                          >
                            {isReported
                              ? 'Reported'
                              : 'Report'}
                          </button>
                        )}

                        {/* SHARE */}
                        <button
                          type="button"
                          onClick={() =>
                            openShareCard(post)
                          }
                          className={`flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-opacity hover:opacity-70 ${
                            isDev
                              ? 'text-emerald-600'
                              : isDarkMode
                                ? 'text-white/80'
                                : 'text-neutral-800'
                          }`}
                        >
                          <Icons.Share />

                          <span>
                            Share
                          </span>
                        </button>

                      </div>
                    </div>

                  </article>
                );
              }
            )}

            {/* NO POSTS */}
            {posts.length === 0 && !searchingOlder && !searchError && (
              <div
                className={`rounded-2xl border border-dashed px-6 py-14 text-center ${
                  isDarkMode
                    ? 'border-neutral-800 bg-neutral-900/50'
                    : 'border-neutral-200 bg-white/70'
                }`}
              >
                <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border ${
                  isDarkMode
                    ? 'border-neutral-800 bg-neutral-950 text-neutral-500'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-400'
                }`}>
                  <Icons.Search />
                </div>

                <h3 className={`mt-4 text-lg font-bold ${
                  isDarkMode ? 'text-white' : 'text-neutral-900'
                }`}>
                  {searchQuery
                    ? 'Nothing matched that search.'
                    : 'Quiet here for now.'}
                </h3>

                <p className={`mx-auto mt-2 max-w-sm text-sm leading-relaxed ${
                  isDarkMode ? 'text-neutral-500' : 'text-neutral-500'
                }`}>
                  {searchQuery
                    ? `No entries matched “${debouncedSearch}” in this category. Try another keyword or reset the filters.`
                    : 'There are no approved entries in this category yet. You can be the first to leave something on the wall.'}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {(searchQuery || selectedCategory !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className={`rounded-xl border px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        isDarkMode
                          ? 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      Reset filters
                    </button>
                  )}

                  <Link
                    href="/post"
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-500"
                  >
                    Say something →
                  </Link>
                </div>
              </div>
            )}

            {/* LOAD MORE */}
            {hasMore &&
              searchQuery.trim() ===
                '' && (
                <div className="pt-6 text-center">

                  <button
                    onClick={
                      loadMorePosts
                    }
                    disabled={
                      loadingMore
                    }
                    className={`px-6 py-3.5 border font-mono text-[10px] font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 shadow-2xs transition-colors ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {loadingMore
                      ? 'Loading more…'
                      : 'Show more entries'}
                  </button>

                </div>
              )}

          </div>
        )}
      </main>


{/* =========================================================
    SHARE CARD MODAL
========================================================= */}

{shareCardPost && (
  <div
    className="
      fixed inset-0 z-[100]
      bg-neutral-950/80
      backdrop-blur-md
      flex items-end sm:items-center
      justify-center
      overflow-hidden
      sm:p-6
    "
    onClick={closeShareCard}
  >
    <div
      onClick={(event) => event.stopPropagation()}
      className={`w-full max-h-[92dvh] sm:max-w-lg sm:max-h-[95vh] overflow-y-auto overscroll-contain rounded-t-[28px] sm:rounded-3xl border shadow-2xl ${
        isDarkMode
          ? 'bg-neutral-900 border-neutral-800'
          : 'bg-white border-neutral-200'
      }`}
    >
      {/* HEADER */}
      <div
        className={`sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 border-b backdrop-blur-xl ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800'
            : 'bg-white/95 border-neutral-100'
        }`}
      >
        <div className="min-w-0">
          <p
            className={`font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.16em] ${
              isDarkMode
                ? 'text-emerald-400'
                : 'text-emerald-600'
            }`}
          >
            Share outside Tambayan
          </p>

          <h3
            className={`mt-0.5 text-base sm:text-lg font-black tracking-tight ${
              isDarkMode
                ? 'text-white'
                : 'text-neutral-900'
            }`}
          >
            Share as Post
          </h3>
        </div>

        <button
          type="button"
          onClick={closeShareCard}
          disabled={shareCardBusy}
          aria-label="Close share card"
          className={`shrink-0 p-2 rounded-xl transition-colors disabled:opacity-40 ${
            isDarkMode
              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <Icons.Close />
        </button>
      </div>

      {/* CONTENT */}
      <div className="px-4 pt-4 pb-6 sm:p-6">
        {/* SHARE CARD PREVIEW */}
        <div className="mx-auto w-full max-w-[330px] min-[390px]:max-w-[350px] sm:max-w-[380px]">
          <div
            ref={shareCardRef}
            className="
              relative
              w-full
              aspect-[4/5]
              overflow-hidden
              rounded-[22px]
              sm:rounded-[28px]
              border
              border-white/10
              bg-neutral-950
              shadow-xl
              sm:shadow-2xl
            "
          >
            {/* BACKGROUND GLOWS */}
            <div className="absolute -top-20 -right-20 w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-emerald-500/10 blur-3xl" />

            {/* CARD CONTENT */}
            <div className="relative h-full flex flex-col p-5 min-[390px]:p-6 sm:p-7">
              {/* BRAND */}
              <div className="shrink-0">
                <p className="text-white text-base sm:text-lg font-black tracking-tight">
                  TAMBAYAN
                  <span className="text-emerald-500">.</span>
                </p>

                <p className="mt-0.5 text-[7px] sm:text-[9px] text-neutral-500 font-mono">
                  SLU Freedom Wall
                </p>
              </div>

              {/* POST */}
              {(() => {
                const normalizedContent =
                  shareCardPost.content
                    .replace(/\s+/g, ' ')
                    .trim();

                const maxCharacters = 125;

                const isTruncated =
                  normalizedContent.length > maxCharacters;

                let displayContent =
                  normalizedContent;

                if (isTruncated) {
                  const roughCut =
                    normalizedContent.slice(
                      0,
                      maxCharacters
                    );

                  const lastSpace =
                    roughCut.lastIndexOf(' ');

                  const safeCut =
                    lastSpace >
                    maxCharacters * 0.7
                      ? lastSpace
                      : maxCharacters;

                  displayContent =
                    `${roughCut
                      .slice(0, safeCut)
                      .trim()}...`;
                }

                const visibleLength =
                  displayContent.length;

                let textClass =
                  'text-[16px] min-[390px]:text-[17px] sm:text-[18px] leading-[1.45]';

                if (visibleLength <= 55) {
                  textClass =
                    'text-[22px] min-[390px]:text-[24px] sm:text-[26px] leading-[1.32]';
                } else if (
                  visibleLength <= 90
                ) {
                  textClass =
                    'text-[19px] min-[390px]:text-[20px] sm:text-[22px] leading-[1.38]';
                }

                return (
                  <div className="flex-1 min-h-0 flex flex-col py-4 sm:py-5 overflow-hidden">
                    {/* POST META */}
                    <div className="shrink-0">
                      <span
                        className="
                          inline-flex
                          px-2 py-1
                          sm:px-2.5
                          rounded-md
                          sm:rounded-lg
                          border
                          border-emerald-500/20
                          bg-emerald-500/10
                          text-emerald-400
                          font-mono
                          text-[7px]
                          sm:text-[8px]
                          font-bold
                          uppercase
                          tracking-wider
                        "
                      >
                        {getCategoryLabel(
                          shareCardPost.category
                        )}
                      </span>

                      <p className="mt-2 sm:mt-3 text-[8px] sm:text-[9px] font-mono font-semibold text-neutral-500 truncate">
                        {shareCardPost.authorAlias}
                      </p>
                    </div>

                    {/* ENTRY */}
                    <div className="mt-3 sm:mt-5 min-h-0 overflow-hidden">
                      <p
                        className={`
                          ${textClass}
                          font-semibold
                          text-neutral-50
                          break-words
                          [overflow-wrap:anywhere]
                        `}
                      >
                        {displayContent}
                      </p>
                    </div>

                    {/* READ MORE */}
                    {isTruncated && (
                      <div className="mt-3 sm:mt-4 shrink-0">
                        <p className="font-mono text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-400">
                          Read more at tambayanslu.com →
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* FOOTER */}
              <div className="shrink-0 border-t border-white/10 pt-3 sm:pt-5">
                <p className="text-[8px] sm:text-[10px] font-semibold text-neutral-300">
                  Got something to say?
                </p>

                <p className="mt-1 text-[7px] sm:text-[8px] leading-relaxed text-neutral-500">
                  Share it anonymously with fellow Louisians.
                </p>

                <div className="mt-3 sm:mt-5 flex items-end justify-between gap-3">
                  <p className="text-[9px] sm:text-[11px] font-black text-emerald-500">
                    tambayanslu.com
                  </p>

                  <p className="text-[5px] sm:text-[6px] leading-relaxed text-neutral-600 text-right">
                    Anonymous.
                    <br />
                    Louisian.
                    <br />
                    Tambayan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p
            className={`mt-2.5 text-center font-mono text-[8px] sm:text-[9px] ${
              isDarkMode
                ? 'text-neutral-600'
                : 'text-neutral-400'
            }`}
          >
            1080 × 1350 • Share Card
          </p>
        </div>

        {/* ACTIONS */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-2.5">
          {/* SHARE */}
          <button
            type="button"
            onClick={() =>
              shareCardImage(
                shareCardPost
              )
            }
            disabled={shareCardBusy}
            className="
              col-span-2
              w-full
              flex items-center
              justify-center
              gap-2
              rounded-xl
              bg-emerald-600
              hover:bg-emerald-500
              active:scale-[0.98]
              disabled:opacity-50
              disabled:cursor-not-allowed
              px-4
              py-3
              sm:py-3.5
              text-white
              font-mono
              text-[10px]
              sm:text-[11px]
              font-black
              uppercase
              tracking-wider
              transition-all
            "
          >
            <Icons.Share />

            {shareCardBusy
              ? 'Creating Card...'
              : 'Share Card'}
          </button>

          {/* DOWNLOAD */}
          <button
            type="button"
            onClick={() =>
              downloadShareCard(
                shareCardPost
              )
            }
            disabled={shareCardBusy}
            className={`w-full rounded-xl border px-3 sm:px-4 py-3 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
              isDarkMode
                ? 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Download
          </button>

          {/* COPY LINK */}
          <button
            type="button"
            onClick={() =>
              copyPostLink(
                shareCardPost.id
              )
            }
            disabled={shareCardBusy}
            className={`w-full rounded-xl border px-3 sm:px-4 py-3 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
              copiedId === shareCardPost.id
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : isDarkMode
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            {copiedId ===
            shareCardPost.id
              ? 'Link Copied!'
              : 'Copy Link'}
          </button>
        </div>

        {/* STATUS */}
        {shareCardMessage && (
          <div
            className={`mt-3 sm:mt-4 px-3 sm:px-4 py-3 rounded-xl border text-center font-mono text-[9px] sm:text-[10px] leading-relaxed ${
              isDarkMode
                ? 'bg-neutral-950 border-neutral-800 text-neutral-400'
                : 'bg-neutral-50 border-neutral-200 text-neutral-500'
            }`}
          >
            {shareCardMessage}
          </div>
        )}
      </div>
    </div>
  </div>
)}

{/* REPORT MODAL */}
      {activeReportPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">

          <div
            className={`w-full max-w-md rounded-2xl shadow-xl border overflow-hidden ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800 text-white'
                : 'bg-white border-neutral-200/80 text-neutral-900'
            }`}
          >

            <div
              className={`flex items-center justify-between px-6 py-4 border-b ${
                isDarkMode
                  ? 'border-neutral-800'
                  : 'border-neutral-100'
              }`}
            >

              <h3 className="font-mono text-xs font-bold uppercase tracking-widest">
                Report Entry
              </h3>

              <button
                type="button"
                onClick={() =>
                  setActiveReportPostId(
                    null
                  )
                }
                aria-label="Close report dialog"
                className={`p-2 rounded-lg ${
                  isDarkMode
                    ? 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                    : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Icons.Close />
              </button>

            </div>

            <form
              onSubmit={
                handleReportSubmit
              }
              className="p-6 space-y-5"
            >

              {/* REASON */}
              <div>

                <label className="block font-mono text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Select Reason
                </label>

                <select
                  value={
                    selectedReason
                  }
                  onChange={(e) =>
                    setSelectedReason(
                      e.target.value
                    )
                  }
                  className={`w-full p-3 border rounded-xl text-xs font-mono focus:outline-none appearance-none cursor-pointer ${
                    isDarkMode
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 focus:border-neutral-900'
                  }`}
                >

                  {REPORT_REASONS.map(
                    (reason) => (
                      <option
                        key={reason}
                        value={
                          reason
                        }
                      >
                        {
                          reason
                        }
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* DETAILS */}
              <div>

                <label className="block font-mono text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Additional Details{' '}
                  <span className="text-neutral-500 font-normal">
                    (Optional)
                  </span>
                </label>

                <textarea
                  value={
                    reportDetails
                  }
                  onChange={(e) =>
                    setReportDetails(
                      e.target.value
                    )
                  }
                  placeholder="Provide any extra context for moderators..."
                  rows={3}
                  className={`w-full p-3 border rounded-xl text-xs placeholder:text-neutral-500 font-mono focus:outline-none resize-none shadow-2xs ${
                    isDarkMode
                      ? 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 focus:border-neutral-900'
                  }`}
                />

              </div>

              {/* BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setActiveReportPostId(
                      null
                    )
                  }
                  className={`px-4 py-2.5 border rounded-xl font-mono text-xs uppercase font-bold tracking-wider ${
                    isDarkMode
                      ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                      : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmittingReport
                  }
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-mono text-xs uppercase font-bold tracking-wider disabled:opacity-50 shadow-sm"
                >
                  {isSubmittingReport
                    ? 'Submitting...'
                    : 'Submit Report'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

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
