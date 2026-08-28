'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, orderBy, limit, startAfter, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp, where, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
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
  { id: 'life', label: 'City Life' },
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
};

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
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

  // Fetch / Listen to posts dynamically when category changes
  useEffect(() => {
    setLoading(true);
    setHasMore(true);

    let q;
    if (selectedCategory === "all") {
      q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(10));
    } else {
      q = query(
        collection(db, "posts"), 
        where("category", "==", selectedCategory), 
        orderBy("createdAt", "desc"), 
        limit(10)
      );
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
          authorAlias: data.authorAlias || "UNSAID #00000",
          content: data.content || "",
          category: data.category || "thoughts",
          createdAt: formattedDate,
          upvotes: data.upvotes || 0,
          replies: data.replies || 0,
          spotifyTrackId: data.spotifyTrackId || null,
          isDeveloperPost: data.isDeveloperPost || false,
        });
      });

      setPosts(fetchedPosts);
      
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        if (querySnapshot.docs.length < 10) {
          setHasMore(false);
        }
      } else {
        setLastVisible(null);
        setHasMore(false);
      }

      setLoading(false);
    }, (error) => {
      console.error("Error listening to posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedCategory]);

  const loadMorePosts = async () => {
    if (!lastVisible || loadingMore) return;

    setLoadingMore(true);
    try {
      let nextQuery;
      if (selectedCategory === "all") {
        nextQuery = query(
          collection(db, "posts"),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(10)
        );
      } else {
        nextQuery = query(
          collection(db, "posts"),
          where("category", "==", selectedCategory),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(10)
        );
      }

      const querySnapshot = await getDocs(nextQuery);
      
      if (querySnapshot.empty) {
        setHasMore(false);
        setLoadingMore(false);
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
          authorAlias: data.authorAlias || "UNSAID #00000",
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
        await navigator.share({ title: 'UNSAID Freedom Wall Entry', url: postUrl });
        return;
      } catch (err) {}
    }
    navigator.clipboard.writeText(postUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Search filtering on top of fetched category posts
  const filteredPosts = posts.filter((post) => {
    return searchQuery.trim() === "" || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.authorAlias.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white relative">
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            UNSAID.
          </Link>
          <nav className="flex items-center gap-5 font-mono text-[11px] font-bold tracking-widest text-neutral-500 uppercase">
            <Link href="/about" className="hover:text-neutral-900 transition-colors">About</Link>
            <Link href="/guidelines" className="hover:text-neutral-900 transition-colors">Guidelines</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-12">
          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Freedom Wall
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-neutral-900">
            Say what you<br />can't say.
          </h1>
          <p className="text-base text-neutral-600 leading-relaxed max-w-md mb-8">
            An open space for thoughts, confessions, and stories. Share what's on your mind entirely without identity.
          </p>
          <Link 
            href="/post" 
            className="inline-flex items-center gap-2 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded hover:bg-neutral-800 transition-all active:scale-95 shadow-sm"
          >
            <Icons.Pen />
            <span>Say Something</span>
          </Link>
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
            placeholder="Search entries, keywords, or alias tags..."
            className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all font-mono"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 border-b border-neutral-200 hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider rounded whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Minimalist Articles Link */}
        <div className="flex items-center justify-between mb-8 px-1">
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-400">
            Looking for deeper reads?
          </span>
          <Link
            href="/articles"
            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-emerald-700 transition-colors group"
          >
            <span>Explore Articles Archive</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>

        {/* Feed List */}
        {loading ? (
          <div className="py-16 text-center font-mono text-sm text-neutral-400 animate-pulse">
            Connecting to live feed...
          </div>
        ) : (
          <div className="space-y-8">
            {filteredPosts.map((post) => {
              const hasVoted = votedPosts[post.id];
              const isLocked = votingLocked[post.id];
              const isReported = reportedPosts[post.id];
              const isDev = post.isDeveloperPost;

              return (
                <article 
                  key={post.id} 
                  className={`p-6 rounded-lg transition-all relative ${
                    isDev 
                      ? "bg-emerald-50/40 border-2 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20" 
                      : "bg-white border border-neutral-200 shadow-2xs hover:border-neutral-300"
                  }`}
                >
                  {isDev && (
                    <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase tracking-widest rounded-full shadow-xs">
                      <Icons.ShieldCheck />
                      <span>Official Announcement</span>
                    </div>
                  )}

                  <div className={`flex items-center justify-between mb-3 ${isDev ? 'mt-1' : ''}`}>
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
                      <span className={`font-bold ${isDev ? 'text-emerald-900' : 'text-neutral-900'}`}>
                        {post.authorAlias}
                      </span>
                      <span className="text-neutral-300">•</span>
                      <span className="text-neutral-400">{post.createdAt}</span>
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded ${
                      isDev ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {post.category}
                    </span>
                  </div>
                  
                  <p className={`text-lg md:text-xl font-medium mb-6 leading-relaxed ${
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
                        className="rounded-lg border border-neutral-100"
                      />
                    </div>
                  )}

                  <div className={`flex items-center justify-between pt-4 border-t ${isDev ? 'border-emerald-200/60' : 'border-neutral-100'}`}>
                    <div className="flex items-center gap-6 font-mono text-xs font-semibold">
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
            
            {filteredPosts.length === 0 && (
              <div className="py-12 text-center font-mono text-sm text-neutral-400">
                {searchQuery ? `No entries found matching "${searchQuery}"` : "No entries found in this category. Be the first to post!"}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && searchQuery.trim() === "" && (
              <div className="pt-6 text-center">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-neutral-900">Report Entry</h3>
              <button onClick={() => setActiveReportPostId(null)} className="text-neutral-400 hover:text-neutral-900 transition-colors p-1">
                <Icons.Close />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-mono text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Select Reason
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 font-mono focus:outline-none focus:border-neutral-900"
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any extra context for moderators..."
                  rows={3}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 font-mono focus:outline-none focus:border-neutral-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setActiveReportPostId(null)}
                  className="px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2 rounded bg-rose-600 text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-rose-700 transition-colors disabled:opacity-50"
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