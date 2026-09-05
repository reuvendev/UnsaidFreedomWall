'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  collection, onSnapshot, query, orderBy, limit, startAfter, 
  getDocs, doc, updateDoc, increment, addDoc, serverTimestamp, 
  where, DocumentData, QueryDocumentSnapshot, Query
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PostProps {
  id: string;
  authorAlias: string;
  content: string;
  category: string;
  createdAt: string;
  upvotes: number;
  replies: number;
  spotifyTrackId?: string;
  isDeveloperPost?: boolean;
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

const Icons = {
  Heart: ({ filled }: { filled?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transform active:scale-125">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Message: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Pen: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Share: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>,
  Close: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  ShieldCheck: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  ),
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Coffee: () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>,
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
};

export default function HomePage() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  
  const [rawPosts, setRawPosts] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [votedPosts, setVotedPosts] = useState<Record<string, boolean>>({});
  const [votingLocked, setVotingLocked] = useState<Record<string, boolean>>({});
  const [reportedPosts, setReportedPosts] = useState<Record<string, boolean>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  const [activeReportPostId, setActiveReportPostId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState<string>("");
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Load localStorage states on mount
  useEffect(() => {
    try {
      const storedVotes = localStorage.getItem('unsaid_voted_posts');
      if (storedVotes) setVotedPosts(JSON.parse(storedVotes));
      const storedReports = localStorage.getItem('unsaid_reported_posts');
      if (storedReports) setReportedPosts(JSON.parse(storedReports));
      const storedTheme = localStorage.getItem('unsaid_dark_mode');
      if (storedTheme) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    try {
      localStorage.setItem('unsaid_dark_mode', JSON.stringify(nextMode));
    } catch (e) {}
  };

  // Search Debounce Handler
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper builder for standard Firestore queries
  const buildQuery = useCallback((category: string, limitCount: number, startAfterDoc: QueryDocumentSnapshot<DocumentData> | null = null) => {
    const postsRef = collection(db, "posts");
    const constraints: any[] = [where("status", "==", "approved"), orderBy("createdAt", "desc")];

    if (category !== "all") {
      constraints.unshift(where("category", "==", category));
    }
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    constraints.push(limit(limitCount));

    return query(postsRef, ...constraints);
  }, []);

  // Formatter for raw documents
  const formatPosts = (querySnapshot: any): PostProps[] => {
    const fetched: PostProps[] = [];
    querySnapshot.forEach((docSnap: any) => {
      const data = docSnap.data();
      let formattedDate = "Just now";
      if (data.createdAt) {
        const dateObj = data.createdAt.toDate();
        formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      fetched.push({
        id: docSnap.id,
        authorAlias: data.authorAlias || "Anonymous Louisian",
        content: data.content || "",
        category: data.category || "thoughts",
        createdAt: formattedDate,
        upvotes: data.upvotes || 0,
        replies: data.replies || 0,
        spotifyTrackId: data.spotifyTrackId || null,
        isDeveloperPost: data.isDeveloperPost || false,
      });
    });
    return fetched;
  };

  // Real-time Feed Listener
  useEffect(() => {
    setLoading(true);
    setHasMore(true);

    const fetchLimit = debouncedSearch !== "" ? 50 : 10;
    const q = buildQuery(selectedCategory, fetchLimit);
      
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const formatted = formatPosts(querySnapshot);

      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        if (querySnapshot.docs.length < fetchLimit || debouncedSearch !== "") {
          setHasMore(false);
        }
      } else {
        setLastVisible(null);
        setHasMore(false);
      }

      setRawPosts(formatted);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedCategory, debouncedSearch, buildQuery]);

  // Memoized filter calculation for search keywords
  const posts = useMemo(() => {
    if (!debouncedSearch) return rawPosts;
    const queryLower = debouncedSearch.toLowerCase();
    return rawPosts.filter(
      (post) => 
        post.content.toLowerCase().includes(queryLower) ||
        post.authorAlias.toLowerCase().includes(queryLower)
    );
  }, [rawPosts, debouncedSearch]);

  const loadMorePosts = async () => {
    if (!lastVisible || loadingMore || !hasMore || debouncedSearch !== "") return;

    setLoadingMore(true);
    try {
      const nextQuery = buildQuery(selectedCategory, 10, lastVisible);
      const querySnapshot = await getDocs(nextQuery);
       
      if (querySnapshot.empty) {
        setHasMore(false);
        return;
      }

      const morePosts = formatPosts(querySnapshot);
      setRawPosts((prev) => [...prev, ...morePosts]);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);

      if (querySnapshot.docs.length < 10) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleVoteToggle = async (id: string) => {
    if (votingLocked[id]) return;
    setVotingLocked((prev) => ({ ...prev, [id]: true }));

    const hasVoted = votedPosts[id];
    const voteChange = hasVoted ? -1 : 1;

    try {
      const postRef = doc(db, "posts", id);
      await updateDoc(postRef, { upvotes: increment(voteChange) });
       
      const updatedVotes = { ...votedPosts };
      if (hasVoted) delete updatedVotes[id];
      else updatedVotes[id] = true;

      setVotedPosts(updatedVotes);
      localStorage.setItem('unsaid_voted_posts', JSON.stringify(updatedVotes));
    } catch (error) {
      console.error("Error updating vote:", error);
    } finally {
      setVotingLocked((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReportPostId || isSubmittingReport) return;

    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, "reports"), {
        postId: activeReportPostId,
        reason: selectedReason,
        details: reportDetails.trim(),
        createdAt: serverTimestamp(),
        status: "pending"
      });

      const updatedReports = { ...reportedPosts, [activeReportPostId]: true };
      setReportedPosts(updatedReports);
      localStorage.setItem('unsaid_reported_posts', JSON.stringify(updatedReports));
       
      setActiveReportPostId(null);
      setReportDetails("");
      setSelectedReason(REPORT_REASONS[0]);
      alert("Thank you. Your report has been sent to the moderators.");
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleShare = async (id: string) => {
    const postUrl = `${window.location.origin}/post/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Tambayan Eselyu Entry', url: postUrl });
        return;
      } catch (err) {}
    }
    navigator.clipboard.writeText(postUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedPosts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-neutral-900 selection:text-white relative ${isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50/50 text-neutral-900'}`}>
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b shadow-2xs ${isDarkMode ? 'bg-neutral-900/95 border-neutral-800' : 'bg-white/95 border-neutral-200/80'}`}>
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter">
            TAMBAYAN<span className="text-emerald-600">.</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-5 font-mono text-[11px] font-bold tracking-widest uppercase">
            <Link href="/about" className={isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}>About</Link>
            <Link href="/guidelines" className={isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}>Guidelines</Link>
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle Dark Mode"
              className={`p-2 rounded-xl border cursor-pointer ${
                isDarkMode 
                  ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' 
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-10">
          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SLU Freedom Wall
          </p>
          <h1 className={`text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
            Tambayan <br />Eselyu
          </h1>
          <p className={`text-base leading-relaxed max-w-md mb-8 ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
            A safe space for Louisian thoughts, confessions, rants, and stories you can't say out loud.
          </p>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <Link href="/post" className="inline-flex items-center gap-2 bg-neutral-900 dark:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg active:scale-95 shadow-sm">
              <Icons.Pen />
              <span>Say Something</span>
            </Link>
            <Link href="/chat/setup" className={`inline-flex items-center gap-2 border font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg active:scale-95 shadow-2xs ${isDarkMode ? 'bg-neutral-900 text-white border-neutral-800 hover:bg-neutral-800' : 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-100'}`}>
              <Icons.Users />
              <span>Find Chatmate</span>
            </Link>
            <Link href="/support" className={`inline-flex items-center gap-2 border font-mono text-xs font-bold uppercase tracking-wider px-5 py-3.5 rounded-lg active:scale-95 shadow-2xs ${isDarkMode ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50 hover:bg-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
              <Icons.Coffee />
              <span>Support This Project</span>
            </Link>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Icons.Search />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries, keywords, or campus alias..."
            className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm font-mono focus:outline-none shadow-2xs ${
              isDarkMode 
                ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-emerald-500' 
                : 'bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
            }`}
          />
        </div>

        <div className={`flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b hide-scrollbar ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200/80'}`}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider rounded-lg whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-neutral-900 dark:bg-emerald-600 text-white shadow-sm"
                  : isDarkMode
                    ? "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
                    : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={`py-20 text-center font-mono text-sm border border-dashed rounded-2xl ${isDarkMode ? 'border-neutral-800 bg-neutral-900/50 text-neutral-400' : 'border-neutral-200 bg-white/50 text-neutral-400'}`}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mx-auto mb-3"></div>
            Connecting to live campus feed...
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => {
              const hasVoted = votedPosts[post.id];
              const isLocked = votingLocked[post.id];
              const isReported = reportedPosts[post.id];
              const isDev = post.isDeveloperPost;
               
              const isLongContent = post.content.length > CHARACTER_LIMIT;
              const isExpanded = expandedPosts[post.id];
              const displayContent = isLongContent && !isExpanded 
                ? `${post.content.slice(0, CHARACTER_LIMIT)}...` 
                : post.content;

              return (
                <article 
                  key={post.id} 
                  className={`p-5 sm:p-6 rounded-2xl relative group hover:-translate-y-1 hover:shadow-xl ${
                    isDev 
                      ? isDarkMode 
                        ? "bg-emerald-950/20 border-2 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/10" 
                        : "bg-emerald-50/50 border-2 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20"
                      : isDarkMode
                        ? "bg-neutral-900 border border-neutral-800 shadow-xs hover:border-neutral-700"
                        : "bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300"
                  }`}
                >
                  {isDev && (
                    <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase tracking-widest rounded-full shadow-xs">
                      <Icons.ShieldCheck />
                      <span>Official Announcement</span>
                    </div>
                  )}

                  <div className={`flex flex-wrap items-center justify-between gap-y-2 mb-3 ${isDev ? 'mt-1' : ''}`}>
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider min-w-0">
                      <span className={`px-2.5 py-1 rounded-md border font-bold truncate max-w-[150px] sm:max-w-none ${
                        isDev 
                          ? isDarkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100/80 text-emerald-900 border-emerald-200'
                          : isDarkMode ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-neutral-100 text-neutral-800 border-neutral-200/60'
                      }`}>
                        {post.authorAlias}
                      </span>
                      <span className="text-neutral-500 shrink-0">•</span>
                      <span className="text-neutral-400 text-[10px] shrink-0">{post.createdAt}</span>
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md shrink-0 ${
                      isDev 
                        ? 'bg-emerald-100 text-emerald-800 font-bold' 
                        : isDarkMode ? 'bg-neutral-800 text-neutral-400 border border-neutral-700/50' : 'bg-neutral-100/80 text-neutral-600 border border-neutral-200/40'
                    }`}>
                      {post.category}
                    </span>
                  </div>
                   
                  <div className="mb-6">
                    <p className={`text-base sm:text-lg md:text-xl font-normal leading-relaxed break-words whitespace-pre-wrap ${
                      isDev 
                        ? isDarkMode ? 'text-emerald-200 font-semibold' : 'text-emerald-950 font-semibold' 
                        : isDarkMode ? 'text-neutral-200' : 'text-neutral-800'
                    }`}>
                      {displayContent}
                    </p>

                    {isLongContent && (
                      <button
                        onClick={() => toggleExpand(post.id)}
                        className="mt-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400 inline-block focus:outline-none"
                      >
                        {isExpanded ? 'See less' : 'See more'}
                      </button>
                    )}
                  </div>

                  {post.spotifyTrackId && (
                    <div className="mb-6">
                      <iframe
                        src={`https://open.spotify.com/embed/track/${post.spotifyTrackId}?utm_source=generator&theme=${isDarkMode ? '1' : '0'}`}
                        width="100%"
                        height="80"
                        frameBorder="0"
                        allow="encrypted-media"
                        className={`rounded-xl border shadow-2xs ${isDarkMode ? 'border-neutral-800' : 'border-neutral-100'}`}
                      />
                    </div>
                  )}

                  <div className={`flex flex-wrap items-center justify-between gap-y-3 pt-4 border-t ${
                    isDev 
                      ? isDarkMode ? 'border-emerald-900/40' : 'border-emerald-200/60' 
                      : isDarkMode ? 'border-neutral-800' : 'border-neutral-100'
                  }`}>
                    <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs font-semibold">
                      <button 
                        onClick={() => handleVoteToggle(post.id)}
                        disabled={isLocked}
                        className={`flex items-center gap-2 ${
                          isLocked ? "opacity-50 cursor-not-allowed" : ""
                        } ${
                          hasVoted 
                            ? "text-rose-500 hover:text-rose-600" 
                            : isDev ? "text-emerald-600 hover:text-rose-500" : isDarkMode ? "text-neutral-400 hover:text-rose-500" : "text-neutral-500 hover:text-rose-500"
                        }`}
                      >
                        <Icons.Heart filled={hasVoted} />
                        <span>{post.upvotes}</span>
                      </button>
                      <Link 
                        href={`/post/${post.id}`}
                        className={`flex items-center gap-2 ${isDev ? 'text-emerald-600 hover:text-emerald-400' : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        <Icons.Message />
                        <span>{post.replies} Replies</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-4">
                      {!isDev && (
                        <button
                          onClick={() => setActiveReportPostId(post.id)}
                          disabled={isReported}
                          className="font-mono text-[11px] text-neutral-400 hover:text-rose-600 uppercase tracking-wider disabled:opacity-50"
                        >
                          {isReported ? 'Reported' : 'Report'}
                        </button>
                      )}

                      <button
                        onClick={() => handleShare(post.id)}
                        className={`flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                          isDev ? 'text-emerald-600 hover:text-emerald-400' : isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'
                        }`}
                      >
                        <Icons.Share />
                        <span>{copiedId === post.id ? 'Copied!' : 'Share'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
             
            {posts.length === 0 && (
              <div className={`py-16 text-center font-mono text-sm border border-dashed rounded-2xl ${isDarkMode ? 'border-neutral-800 bg-neutral-900/50 text-neutral-400' : 'border-neutral-200 bg-white/50 text-neutral-400'}`}>
                {searchQuery ? `No entries found matching "${searchQuery}"` : "No entries found in this category. Be the first to share your thoughts!"}
              </div>
            )}

            {hasMore && searchQuery.trim() === "" && (
              <div className="pt-6 text-center">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className={`px-6 py-3 border font-mono text-xs font-bold uppercase tracking-wider rounded-xl disabled:opacity-50 shadow-2xs ${
                    isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {loadingMore ? 'Loading more...' : 'Load More Entries'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {activeReportPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl shadow-xl border overflow-hidden ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200/80 text-neutral-900'
          }`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-neutral-800' : 'border-neutral-100'}`}>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest">
                Report Entry
              </h3>
              <button 
                onClick={() => setActiveReportPostId(null)} 
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <Icons.Close />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="p-6 space-y-5">
              <div>
                <label className="block font-mono text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Select Reason
                </label>
                <div className="relative">
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className={`w-full p-3 border rounded-xl text-xs font-mono focus:outline-none appearance-none cursor-pointer ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500' : 'bg-neutral-50 border-neutral-200 text-neutral-900 focus:border-neutral-900'
                    }`}
                  >
                    {REPORT_REASONS.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Additional Details <span className="text-neutral-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any extra context for moderators..."
                  rows={3}
                  className={`w-full p-3 border rounded-xl text-xs placeholder:text-neutral-500 font-mono focus:outline-none resize-none shadow-2xs ${
                    isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500' : 'bg-neutral-50 border-neutral-200 text-neutral-900 focus:border-neutral-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReportPostId(null)}
                  className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider disabled:opacity-50 shadow-sm"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}