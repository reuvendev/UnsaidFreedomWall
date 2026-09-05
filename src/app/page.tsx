'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  collection, onSnapshot, query, orderBy, limit, startAfter, 
  getDocs, doc, updateDoc, increment, addDoc, serverTimestamp, 
  where, DocumentData, QueryDocumentSnapshot 
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

const Icons = {
  Heart: ({ filled }: { filled?: boolean }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill={filled ? "currentColor" : "none"} 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="transform transition-transform active:scale-125"
    >
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
};

export default function HomePage() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [votedPosts, setVotedPosts] = useState<Record<string, boolean>>({});
  const [votingLocked, setVotingLocked] = useState<Record<string, boolean>>({});
  const [reportedPosts, setReportedPosts] = useState<Record<string, boolean>>({});

  // Report Modal States
  const [activeReportPostId, setActiveReportPostId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState<string>("");
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedVotes = localStorage.getItem('unsaid_voted_posts');
      if (storedVotes) setVotedPosts(JSON.parse(storedVotes));
      const storedReports = localStorage.getItem('unsaid_reported_posts');
      if (storedReports) setReportedPosts(JSON.parse(storedReports));
    } catch (e) {
      // Ignore
    }
  }, []);

  // Debounce search input so it doesn't query on every single keystroke instantly
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Main Feed & Database Search Listener Effect
  useEffect(() => {
    setLoading(true);
    setHasMore(true);

    let q;
    const postsRef = collection(db, "posts");

    if (debouncedSearch !== "") {
      // Search query mode (queries the database by keyword or alias)
      // Note: Firestore text queries work best with lowercase equality/ranges or fetching recent posts to filter server-side.
      // Here we query approved items ordered by date to match keywords securely from the database collection.
      if (selectedCategory === "all") {
        q = query(
          postsRef, 
          where("status", "==", "approved"),
          orderBy("createdAt", "desc"),
          limit(50) // Fetch a larger batch for server-side search matching
        );
      } else {
        q = query(
          postsRef, 
          where("status", "==", "approved"),
          where("category", "==", selectedCategory), 
          orderBy("createdAt", "desc"), 
          limit(50)
        );
      }
    } else {
      // Standard category feed pagination mode
      if (selectedCategory === "all") {
        q = query(
          postsRef, 
          where("status", "==", "approved"),
          orderBy("createdAt", "desc"), 
          limit(10)
        );
      } else {
        q = query(
          postsRef, 
          where("status", "==", "approved"),
          where("category", "==", selectedCategory), 
          orderBy("createdAt", "desc"), 
          limit(10)
        );
      }
    }
      
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPosts: PostProps[] = [];
       
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let formattedDate = "Just now";
        if (data.createdAt) {
          const dateObj = data.createdAt.toDate();
          formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        fetchedPosts.push({
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

      // If user is searching, filter the fetched database documents by content or alias
      let finalPosts = fetchedPosts;
      if (debouncedSearch !== "") {
        const queryLower = debouncedSearch.toLowerCase();
        finalPosts = fetchedPosts.filter(
          (post) => 
            post.content.toLowerCase().includes(queryLower) ||
            post.authorAlias.toLowerCase().includes(queryLower)
        );
        setHasMore(false); // Disable pagination during active search results
      } else {
        if (querySnapshot.docs.length > 0) {
          setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
          if (querySnapshot.docs.length < 10) {
            setHasMore(false);
          }
        } else {
          setLastVisible(null);
          setHasMore(false);
        }
      }

      setPosts(finalPosts);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedCategory, debouncedSearch]);

  const loadMorePosts = async () => {
    if (!lastVisible || loadingMore || !hasMore || debouncedSearch !== "") return;

    setLoadingMore(true);
    try {
      let nextQuery;
      if (selectedCategory === "all") {
        nextQuery = query(
          collection(db, "posts"),
          where("status", "==", "approved"),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(10)
        );
      } else {
        nextQuery = query(
          collection(db, "posts"),
          where("status", "==", "approved"),
          where("category", "==", selectedCategory),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(10)
        );
      }

      const querySnapshot = await getDocs(nextQuery);
       
      if (querySnapshot.empty) {
        setHasMore(false);
        return;
      }

      const morePosts: PostProps[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let formattedDate = "Just now";
        if (data.createdAt) {
          const dateObj = data.createdAt.toDate();
          formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        morePosts.push({
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

      setPosts((prevPosts) => [...prevPosts, ...morePosts]);
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

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white relative">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-2xs">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            TAMBAYAN<span className="text-emerald-600">.</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-5 font-mono text-[11px] font-bold tracking-widest text-neutral-500 uppercase">
            <Link href="/about" className="hover:text-neutral-900 transition-colors">About</Link>
            <Link href="/guidelines" className="hover:text-neutral-900 transition-colors">Guidelines</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-10">
          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SLU Freedom Wall
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-neutral-900">
            Tambayan <br />Eselyu
          </h1>
          <p className="text-base text-neutral-600 leading-relaxed max-w-md mb-8">
            A safe space for Louisian thoughts, confessions, rants, and stories you can't say out loud.
          </p>
           
          {/* Main Action Buttons including Support */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <Link 
              href="/post" 
              className="inline-flex items-center gap-2 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg hover:bg-neutral-800 transition-all active:scale-95 shadow-sm"
            >
              <Icons.Pen />
              <span>Say Something</span>
            </Link>

            <Link 
              href="/chat/setup" 
              className="inline-flex items-center gap-2 bg-white text-neutral-900 border border-neutral-200 font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg hover:bg-neutral-100 transition-all active:scale-95 shadow-2xs"
            >
              <Icons.Users />
              <span>Find Chatmate</span>
            </Link>

            <Link 
              href="/support" 
              className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs font-bold uppercase tracking-wider px-5 py-3.5 rounded-lg hover:bg-emerald-100 transition-all active:scale-95 shadow-2xs"
            >
              <Icons.Coffee />
              <span>Support This Project</span>
            </Link>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Icons.Search />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries, keywords, or campus alias..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-mono shadow-2xs"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-neutral-200/80 hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider rounded-lg whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Feed List */}
        {loading ? (
          <div className="py-20 text-center font-mono text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-2xl bg-white/50">
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

              return (
                <article 
                  key={post.id} 
                  className={`p-5 sm:p-6 rounded-2xl transition-all duration-300 relative group hover:-translate-y-1 hover:shadow-xl ${
                    isDev 
                      ? "bg-emerald-50/50 border-2 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20" 
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
                          ? 'bg-emerald-100/80 text-emerald-900 border-emerald-200' 
                          : 'bg-neutral-100 text-neutral-800 border-neutral-200/60'
                      }`}>
                        {post.authorAlias}
                      </span>
                      <span className="text-neutral-300 shrink-0">•</span>
                      <span className="text-neutral-400 text-[10px] shrink-0">{post.createdAt}</span>
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md shrink-0 ${
                      isDev ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-neutral-100/80 text-neutral-600 border border-neutral-200/40'
                    }`}>
                      {post.category}
                    </span>
                  </div>
                   
                  <p className={`text-base sm:text-lg md:text-xl font-normal mb-6 leading-relaxed break-words ${
                    isDev ? 'text-emerald-950 font-semibold' : 'text-neutral-800'
                  }`}>
                    {post.content}
                  </p>

                  {post.spotifyTrackId && (
                    <div className="mb-6">
                      <iframe
                        src={`https://open.spotify.com/embed/track/${post.spotifyTrackId}?utm_source=generator&theme=0`}
                        width="100%"
                        height="80"
                        frameBorder="0"
                        allow="encrypted-media"
                        className="rounded-xl border border-neutral-100 shadow-2xs"
                      />
                    </div>
                  )}

                  <div className={`flex flex-wrap items-center justify-between gap-y-3 pt-4 border-t ${isDev ? 'border-emerald-200/60' : 'border-neutral-100'}`}>
                    <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs font-semibold">
                      <button 
                        onClick={() => handleVoteToggle(post.id)}
                        disabled={isLocked}
                        className={`flex items-center gap-2 transition-colors ${
                          isLocked ? "opacity-50 cursor-not-allowed" : ""
                        } ${
                          hasVoted 
                            ? "text-rose-500 hover:text-rose-600" 
                            : isDev ? "text-emerald-700 hover:text-rose-500" : "text-neutral-500 hover:text-rose-500"
                        }`}
                      >
                        <Icons.Heart filled={hasVoted} />
                        <span>{post.upvotes}</span>
                      </button>
                      <Link 
                        href={`/post/${post.id}`}
                        className={`flex items-center gap-2 transition-colors ${isDev ? 'text-emerald-800 hover:text-emerald-950' : 'text-neutral-500 hover:text-neutral-900'}`}
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
                          className="font-mono text-[11px] text-neutral-400 hover:text-rose-600 transition-colors uppercase tracking-wider disabled:opacity-50"
                        >
                          {isReported ? 'Reported' : 'Report'}
                        </button>
                      )}

                      <button
                        onClick={() => handleShare(post.id)}
                        className={`flex items-center gap-1.5 font-mono text-[11px] font-semibold transition-colors uppercase tracking-wider ${
                          isDev ? 'text-emerald-800 hover:text-emerald-950' : 'text-neutral-400 hover:text-neutral-900'
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
              <div className="py-16 text-center font-mono text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-2xl bg-white/50">
                {searchQuery ? `No entries found matching "${searchQuery}"` : "No entries found in this category. Be the first to share your thoughts!"}
              </div>
            )}

            {hasMore && searchQuery.trim() === "" && (
              <div className="pt-6 text-center">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shadow-2xs"
                >
                  {loadingMore ? 'Loading more...' : 'Load More Entries'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Inline Report Modal */}
      {activeReportPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
                Report Entry
              </h3>
              <button 
                onClick={() => setActiveReportPostId(null)} 
                className="text-neutral-400 hover:text-neutral-900 transition-colors p-1 rounded-lg hover:bg-neutral-100"
              >
                <Icons.Close />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="p-6 space-y-5">
              <div>
                <label className="block font-mono text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Select Reason
                </label>
                <div className="relative">
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 font-mono focus:outline-none focus:border-neutral-900 transition-all appearance-none cursor-pointer"
                  >
                    {REPORT_REASONS.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Additional Details <span className="text-neutral-300 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any extra context for moderators..."
                  rows={3}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 font-mono focus:outline-none focus:border-neutral-900 transition-all resize-none shadow-2xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReportPostId(null)}
                  className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm active:scale-95"
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