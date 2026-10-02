'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  excerpt: string;
  createdAt: Timestamp | null;
  author: string;
}

const PAGE_SIZE = 10;

const Icons = {
  Back: () => (
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
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),

  ArrowRight: () => (
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
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),

  Book: () => (
    <svg
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),

  Sparkle: () => (
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
      <path d="m12 3-1.9 5.1a3 3 0 0 1-1.8 1.8L3 12l5.3 2.1a3 3 0 0 1 1.8 1.8L12 21l1.9-5.1a3 3 0 0 1 1.8-1.8L21 12l-5.3-2.1a3 3 0 0 1-1.8-1.8L12 3Z" />
    </svg>
  )
};

function formatArticleDate(timestamp: Timestamp | null): string {
  if (!timestamp) return 'Recently';

  return timestamp.toDate().toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function ArticlesIndexPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Match TambayanSLU's saved dark-mode preference.
  useEffect(() => {
    const syncDarkMode = () => {
      setIsDarkMode(localStorage.getItem('unsaid_dark_mode') === 'true');
    };

    syncDarkMode();

    // Keep this page in sync if the preference changes in another tab/window.
    window.addEventListener('storage', syncDarkMode);

    return () => {
      window.removeEventListener('storage', syncDarkMode);
    };
  }, []);

  useEffect(() => {
    async function fetchInitialArticles() {
      try {
        const q = query(
          collection(db, 'articles'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );

        const querySnapshot = await getDocs(q);

        const fetched: ArticleSummary[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();

          fetched.push({
            id: docSnap.id,
            title: data.title || 'Untitled',
            slug: data.slug || '#',
            category: data.category || 'Tambayan Guide',
            readTime: data.readTime || '3 min read',
            excerpt: data.excerpt || '',
            createdAt: data.createdAt || null,
            author: data.author || 'TambayanSLU'
          });
        });

        setArticles(fetched);

        const lastVisible =
          querySnapshot.docs[querySnapshot.docs.length - 1];

        setLastDoc(lastVisible || null);

        if (querySnapshot.docs.length < PAGE_SIZE) {
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialArticles();
  }, []);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;

    setLoadingMore(true);

    try {
      const q = query(
        collection(db, 'articles'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const querySnapshot = await getDocs(q);

      const fetched: ArticleSummary[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();

        fetched.push({
          id: docSnap.id,
          title: data.title || 'Untitled',
          slug: data.slug || '#',
          category: data.category || 'Tambayan Guide',
          readTime: data.readTime || '3 min read',
          excerpt: data.excerpt || '',
          createdAt: data.createdAt || null,
          author: data.author || 'TambayanSLU'
        });
      });

      setArticles((prev) => [...prev, ...fetched]);

      const lastVisible =
        querySnapshot.docs[querySnapshot.docs.length - 1];

      setLastDoc(lastVisible || null);

      if (querySnapshot.docs.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more articles:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div
      data-article-theme={isDarkMode ? 'dark' : 'light'}
      className={`min-h-screen selection:bg-emerald-200 ${
        isDarkMode
          ? 'bg-[#09090b] text-neutral-100 selection:bg-emerald-800'
          : 'bg-[#fafafa] text-neutral-900'
      }`}
    >

      {/* Header */}
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          isDarkMode
            ? 'border-neutral-800 bg-[#09090b]/90'
            : 'border-neutral-200/80 bg-white/90'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 sm:px-6">

          <Link
            href="/"
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
              isDarkMode
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Icons.Back />
            <span className="hidden sm:inline">Back to Tambayan</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <Link
            href="/"
            className={`text-lg font-black tracking-tight ${
              isDarkMode ? 'text-white' : 'text-neutral-900'
            }`}
          >
            Tambayan<span className="text-emerald-600">.</span>
          </Link>

        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">

        {/* Hero */}
        <section
          className={`relative mb-12 overflow-hidden rounded-3xl border bg-gradient-to-br px-6 py-9 sm:px-10 sm:py-12 ${
            isDarkMode
              ? 'border-emerald-900/40 from-emerald-950/30 via-[#111113] to-[#0c1712]'
              : 'border-emerald-100 from-emerald-50 via-white to-green-50'
          }`}
        >

          <div className="relative">
            <p className={`mb-3 text-sm font-semibold ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
            }`}>
              Tambayan Reads
            </p>

            <h1 className={`max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl ${
              isDarkMode ? 'text-white' : 'text-neutral-900'
            }`}>
              The Tambayan Journal
            </h1>

            <p className={`mt-3 max-w-xl text-sm leading-6 sm:text-base ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              Stories, tips, and updates from around the Tambayan.
            </p>
          </div>
        </section>

        {/* Section title */}
        <section className="mb-6 flex items-end justify-between">
          <div>
            <p className={`mb-1 text-xs font-semibold uppercase tracking-widest ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              Latest
            </p>

            <h2
              className={`text-2xl font-bold tracking-tight ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              From the Tambayan
            </h2>
          </div>

          {!loading && articles.length > 0 && (
            <span className={`hidden text-xs sm:block ${
              isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
            }`}>
              {articles.length} article{articles.length !== 1 ? 's' : ''}
            </span>
          )}
        </section>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`animate-pulse rounded-2xl border p-6 ${
                  isDarkMode
                    ? 'border-neutral-800 bg-[#111113]'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <div className={`mb-4 h-3 w-24 rounded ${
                  isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200'
                }`} />
                <div className={`mb-3 h-6 w-3/4 rounded ${
                  isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200'
                }`} />
                <div className={`h-4 w-full rounded ${
                  isDarkMode ? 'bg-neutral-800/70' : 'bg-neutral-100'
                }`} />
                <div className={`mt-2 h-4 w-2/3 rounded ${
                  isDarkMode ? 'bg-neutral-800/70' : 'bg-neutral-100'
                }`} />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && articles.length === 0 && (
          <div className={`rounded-3xl border border-dashed px-6 py-16 text-center ${
            isDarkMode
              ? 'border-neutral-700 bg-[#111113]'
              : 'border-neutral-300 bg-white'
          }`}>
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
              isDarkMode
                ? 'bg-emerald-950/50 text-emerald-400'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Icons.Book />
            </div>

            <h3 className={`font-semibold ${isDarkMode ? " text-neutral-200" : " text-neutral-800"}`}>
              Wala pang articles.
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              May ilalagay din dito. Balik ka soon.
            </p>
          </div>
        )}

        {/* Articles */}
        {!loading && articles.length > 0 && (
          <div className="space-y-4">

            {articles.map((article) => (
              <Link
                href={`/articles/${article.slug}`}
                key={article.id}
                className="group block"
              >
                <article className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-6 ${
                  isDarkMode
                    ? 'border-neutral-800 bg-[#111113] hover:border-emerald-800/70 hover:bg-[#141416] hover:shadow-black/20'
                    : 'border-neutral-200 bg-white hover:border-emerald-200 hover:shadow-neutral-200/50'
                }`}>

                  {/* Metadata */}
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">

                    <span className={`rounded-full px-2.5 py-1 font-semibold ${
                      isDarkMode
                        ? 'bg-emerald-950/50 text-emerald-400'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {article.category}
                    </span>

                    <span className={isDarkMode ? "text-neutral-700" : "text-neutral-300"}>•</span>

                    <span className={isDarkMode ? "text-neutral-500" : "text-neutral-400"}>
                      {formatArticleDate(article.createdAt)}
                    </span>

                    <span className={isDarkMode ? "text-neutral-700" : "text-neutral-300"}>•</span>

                    <span className={isDarkMode ? "text-neutral-500" : "text-neutral-400"}>
                      {article.readTime}
                    </span>

                  </div>

                  {/* Title */}
                  <h3 className={`text-xl font-bold leading-snug tracking-tight transition-colors sm:text-2xl ${
                    isDarkMode
                      ? 'text-neutral-100 group-hover:text-emerald-400'
                      : 'text-neutral-900 group-hover:text-emerald-700'
                  }`}>
                    {article.title}
                  </h3>

                  {/* Excerpt */}
                  {article.excerpt && (
                    <p className={`mt-2 line-clamp-3 text-sm leading-6 sm:text-[15px] ${
                      isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                    }`}>
                      {article.excerpt}
                    </p>
                  )}

                  {/* Footer */}
                  <div className={`mt-5 flex items-center justify-between border-t pt-4 ${
                    isDarkMode ? 'border-neutral-800' : 'border-neutral-100'
                  }`}>

                    <span className={`text-xs ${
                      isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
                    }`}>
                      By{' '}
                      <span className={`font-medium ${
                          isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
                        }`}>
                        {article.author}
                      </span>
                    </span>

                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                    }`}>
                      Read article

                      <span className="transition-transform group-hover:translate-x-1">
                        <Icons.ArrowRight />
                      </span>
                    </div>

                  </div>

                </article>
              </Link>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="pt-7 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className={`rounded-xl border px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDarkMode
                      ? 'border-neutral-800 bg-[#111113] text-neutral-300 hover:border-emerald-800 hover:bg-emerald-950/30 hover:text-emerald-400'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  {loadingMore ? 'Loading...' : 'Load more articles'}
                </button>
              </div>
            )}

          </div>
        )}

        {/* About section */}
        <section className={`mt-16 rounded-2xl border p-6 sm:p-8 ${
          isDarkMode
            ? 'border-neutral-800 bg-[#111113]'
            : 'border-neutral-200 bg-white'
        }`}>
          <p className={`text-xs font-semibold uppercase tracking-widest ${
            isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
          }`}>
            About Tambayan Reads
          </p>

          <h2 className={`mt-2 text-xl font-bold tracking-tight ${isDarkMode ? " text-neutral-100" : " text-neutral-900"}`}>
            More than just a freedom wall.
          </h2>

          <p className={`mt-3 max-w-2xl text-sm leading-6 ${isDarkMode ? " text-neutral-400" : " text-neutral-600"}`}>
            Tambayan Reads is where we share useful guides, stories,
            platform updates, and resources made with students in mind.
            It&apos;s part of TambayanSLU&apos;s goal of creating a useful
            online space for the student community.
          </p>

          <p className={`mt-4 text-xs leading-5 ${
            isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
          }`}>
            TambayanSLU is an independently operated student project and is
            not officially affiliated with Saint Louis University.
          </p>
        </section>

      </main>
    </div>
  );
}
