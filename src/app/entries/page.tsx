'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PostData {
  id: string;
  authorAlias: string;
  content: string;
  category: string;
  status: string;
  upvotes: number;
  repliesCount: number;
  createdAt: string;
  createdAtMs: number;
  imageUrl?: string;
  spotifyTrackId?: string;
}

const Icons = {
  Heart: () => (
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

  Plus: () => (
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

function formatDate(timestamp: any): string {
  if (!timestamp) return 'Recently';

  try {
    const date = timestamp.toDate();

    return (
      date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' at ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  } catch {
    return 'Recently';
  }
}

export default function MyEntriesPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Load theme
  useEffect(() => {
    const checkTheme = () => {
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
      } catch {
        // Ignore
      }
    };

    checkTheme();

    window.addEventListener('storage', checkTheme);

    const interval = setInterval(checkTheme, 300);

    return () => {
      window.removeEventListener('storage', checkTheme);
      clearInterval(interval);
    };
  }, []);

  // Load user's saved entries
  useEffect(() => {
  const loadMyPosts = async () => {
    try {
      const userId = localStorage.getItem('unsaid_chat_user_id');

      if (!userId) {
        setLoading(false);
        return;
      }

      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(postsQuery);

      const loadedPosts: PostData[] = [];

      snapshot.forEach((postDoc) => {
        const data = postDoc.data();
        const createdAtMs = data.createdAt?.toMillis?.() || 0;

        loadedPosts.push({
          id: postDoc.id,
          authorAlias:
            data.authorAlias || 'Louisian #00000',
          content: data.content || '',
          category: data.category || 'thoughts',
          status: data.status || 'pending',
          upvotes: data.upvotes || 0,
          repliesCount: data.replies || 0,
          createdAt: formatDate(data.createdAt),
          createdAtMs,
          imageUrl: data.imageUrl,
          spotifyTrackId: data.spotifyTrackId,
        });
      });

      // Newest first
      loadedPosts.sort((a, b) => b.createdAtMs - a.createdAtMs);

      setPosts(loadedPosts);
    } catch (error) {
      console.error('Error loading your entries:', error);
    } finally {
      setLoading(false);
    }
  };

  loadMyPosts();
}, []);

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center font-mono text-xs ${
          isDarkMode
            ? 'bg-neutral-950 text-neutral-500'
            : 'bg-white text-neutral-400'
        }`}
      >
        Loading your entries...
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen font-sans ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100 selection:bg-neutral-100 selection:text-neutral-950'
          : 'bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white'
      }`}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${
          isDarkMode
            ? 'bg-neutral-950/85 border-neutral-800'
            : 'bg-white/85 border-neutral-200'
        }`}
      >
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className={`font-mono text-xl font-black tracking-tighter hover:opacity-75 ${
              isDarkMode
                ? 'text-white'
                : 'text-neutral-900'
            }`}
          >
            TAMBAYAN.
          </Link>

          <Link
            href="/"
            className={`font-mono text-xs font-semibold uppercase tracking-wider ${
              isDarkMode
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            ← Back to Feed
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8 pb-24">
        {/* Page Header */}
        <div className="mt-4 mb-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className={`text-3xl font-extrabold tracking-tight ${
                  isDarkMode
                    ? 'text-white'
                    : 'text-neutral-900'
                }`}
              >
                My Entries
              </h1>

              <p
                className={`text-sm mt-2 leading-relaxed ${
                  isDarkMode
                    ? 'text-neutral-400'
                    : 'text-neutral-600'
                }`}
              >
                Your anonymous entries posted from this
                browser.
              </p>
            </div>

            <Link
              href="/post"
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                isDarkMode
                  ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              <Icons.Plus />
              <span>New Entry</span>
            </Link>
          </div>
        </div>

        {/* Entry Count */}
        {posts.length > 0 && (
          <div
            className={`font-mono text-[10px] uppercase tracking-widest pb-3 mb-5 border-b ${
              isDarkMode
                ? 'text-neutral-500 border-neutral-800'
                : 'text-neutral-400 border-neutral-200'
            }`}
          >
            Your Entries ({posts.length})
          </div>
        )}

        {/* Empty State */}
        {posts.length === 0 && (
          <div
            className={`border rounded-lg p-8 text-center ${
              isDarkMode
                ? 'bg-neutral-900/50 border-neutral-800'
                : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <h2
              className={`font-semibold text-lg mb-2 ${
                isDarkMode
                  ? 'text-white'
                  : 'text-neutral-900'
              }`}
            >
              Nothing here yet.
            </h2>

            <p
              className={`text-sm mb-6 ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
              }`}
            >
              The anonymous entries you create will appear
              here.
            </p>

            <Link
              href="/post"
              className={`inline-flex items-center gap-2 px-5 py-3 rounded font-mono text-xs font-bold uppercase tracking-wider ${
                isDarkMode
                  ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              <Icons.Plus />
              Create an Entry
            </Link>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-5">
          {posts.slice(0, visibleCount).map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className={`block p-6 border rounded-lg transition-all ${
                isDarkMode
                  ? 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                  : 'bg-white border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {/* Top */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider min-w-0">
                  <span
                    className={`font-bold truncate ${
                      isDarkMode
                        ? 'text-white'
                        : 'text-neutral-900'
                    }`}
                  >
                    {post.authorAlias}
                  </span>

                  <span
                    className={
                      isDarkMode
                        ? 'text-neutral-700'
                        : 'text-neutral-300'
                    }
                  >
                    •
                  </span>

                  <span
                    className={`truncate ${
                      isDarkMode
                        ? 'text-neutral-500'
                        : 'text-neutral-400'
                    }`}
                  >
                    {post.createdAt}
                  </span>
                </div>

                {/* Status */}
                <span
                  className={`shrink-0 text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded ${
                    post.status === 'approved'
                      ? isDarkMode
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : post.status === 'pending'
                      ? isDarkMode
                        ? 'bg-amber-950/40 text-amber-400 border border-amber-900'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                      : isDarkMode
                      ? 'bg-rose-950/40 text-rose-400 border border-rose-900'
                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                >
                  {post.status}
                </span>
              </div>

              {/* Category */}
              <div className="mb-4">
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded ${
                    isDarkMode
                      ? 'bg-neutral-800 text-neutral-300'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {post.category}
                </span>
              </div>

              {/* Content */}
              <p
                className={`text-lg md:text-xl font-medium leading-relaxed mb-5 line-clamp-4 ${
                  isDarkMode
                    ? 'text-neutral-100'
                    : 'text-neutral-900'
                }`}
              >
                {post.content}
              </p>

              {/* Image Preview */}
              {post.imageUrl && (
                <div className="mb-5 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <img
                    src={post.imageUrl}
                    alt="Attached image"
                    className="w-full max-h-[350px] object-contain"
                  />
                </div>
              )}

              {/* Spotify */}
              {post.spotifyTrackId && (
                <div className="mb-5">
                  <iframe
                    src={`https://open.spotify.com/embed/track/${post.spotifyTrackId}?utm_source=generator&theme=${
                      isDarkMode ? '1' : '0'
                    }`}
                    width="100%"
                    height="80"
                    frameBorder="0"
                    allow="encrypted-media"
                    className={`rounded-lg border ${
                      isDarkMode
                        ? 'border-neutral-800'
                        : 'border-neutral-100'
                    }`}
                  />
                </div>
              )}

              {/* Stats */}
              <div
                className={`flex items-center gap-6 font-mono text-xs font-semibold pt-4 border-t ${
                  isDarkMode
                    ? 'border-neutral-800 text-neutral-400'
                    : 'border-neutral-100 text-neutral-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icons.Heart />

                  <span>
                    {post.upvotes}{' '}
                    {post.upvotes === 1
                      ? 'Upvote'
                      : 'Upvotes'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Icons.Message />

                  <span>
                    {post.repliesCount}{' '}
                    {post.repliesCount === 1
                      ? 'Reply'
                      : 'Replies'}
                  </span>
                </div>

                <span
                  className={`ml-auto text-[10px] uppercase tracking-wider ${
                    isDarkMode
                      ? 'text-neutral-600'
                      : 'text-neutral-400'
                  }`}
                >
                  View Entry →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Load More */}
{visibleCount < posts.length && (
  <div className="flex justify-center mt-8">
    <button
      onClick={() =>
        setVisibleCount((prev) => prev + 10)
      }
      className={`px-5 py-3 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
        isDarkMode
          ? 'bg-neutral-800 text-white hover:bg-neutral-700'
          : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'
      }`}
    >
      Load More
    </button>
  </div>
)}

        {/* Privacy Note */}
        {posts.length > 0 && (
          <div
            className={`mt-10 pt-6 border-t ${
              isDarkMode
                ? 'border-neutral-800'
                : 'border-neutral-200'
            }`}
          >
            <p
              className={`font-mono text-[10px] leading-relaxed ${
                isDarkMode
                  ? 'text-neutral-600'
                  : 'text-neutral-400'
              }`}
            >
              Your entries are saved to this browser so you can
              easily find them again. Clearing your browser data
              may remove them from this page.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}