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
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ),
  ArrowRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  )
};

function formatArticleDate(timestamp: Timestamp | null): string {
  if (!timestamp) return "Recently";
  return timestamp.toDate().toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export default function ArticlesIndexPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // 1. Initial Fetch (First 10 items)
  useEffect(() => {
    async function fetchInitialArticles() {
      try {
        const q = query(
          collection(db, "articles"), 
          orderBy("createdAt", "desc"), 
          limit(PAGE_SIZE)
        );
        const querySnapshot = await getDocs(q);
        
        const fetched: ArticleSummary[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetched.push({
            id: docSnap.id,
            title: data.title || "Untitled",
            slug: data.slug || "#",
            category: data.category || "Editorial",
            readTime: data.readTime || "3 min read",
            excerpt: data.excerpt || "",
            createdAt: data.createdAt || null,
            author: data.author || "UNSAID Team"
          });
        });

        setArticles(fetched);

        // Store the last document snapshot for cursor pagination
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastDoc(lastVisible || null);

        // If returned items are less than PAGE_SIZE, we reached the end
        if (querySnapshot.docs.length < PAGE_SIZE) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialArticles();
  }, []);

  // 2. Fetch Next 10 Items using startAfter
  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "articles"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const querySnapshot = await getDocs(q);
      const fetched: ArticleSummary[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          title: data.title || "Untitled",
          slug: data.slug || "#",
          category: data.category || "Editorial",
          readTime: data.readTime || "3 min read",
          excerpt: data.excerpt || "",
          createdAt: data.createdAt || null,
          author: data.author || "UNSAID Team"
        });
      });

      // Append new articles to current list
      setArticles((prev) => [...prev, ...fetched]);

      // Update cursor reference
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastDoc(lastVisible || null);

      // If fetched items are less than PAGE_SIZE, disable load more
      if (querySnapshot.docs.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more articles:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors">
            <Icons.Back />
            <span>Back to Feed</span>
          </Link>
          <Link href="/" className="font-mono text-xl font-black tracking-tighter">
            UNSAID.
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-12">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Editorials & Guides
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-4 mb-3 text-neutral-900">
            The Archive
          </h1>
          <p className="text-neutral-500 font-mono text-sm">
            Official announcements, deep-dives, and thoughts behind the platform.
          </p>
        </div>

        <hr className="border-neutral-200 mb-10" />

        {/* Initial Loading State */}
        {loading && (
          <div className="py-20 text-center font-mono text-sm text-neutral-400 animate-pulse">
            Loading articles...
          </div>
        )}

        {/* Empty State */}
        {!loading && articles.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <p className="font-mono text-sm text-neutral-400">No articles published yet.</p>
          </div>
        )}

        {/* Articles List */}
        {!loading && articles.length > 0 && (
          <div className="space-y-8">
            {articles.map((article) => (
              <article 
                key={article.id}
                className="group p-6 bg-white border border-neutral-200 rounded-xl hover:border-neutral-900 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-neutral-400 mb-3">
                  <span className="font-bold text-emerald-700">{article.category}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatArticleDate(article.createdAt)}</span>
                    <span>•</span>
                    <span>{article.readTime}</span>
                  </div>
                </div>

                <Link href={`/articles/${article.slug}`}>
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900 group-hover:text-emerald-700 transition-colors mb-2">
                    {article.title}
                  </h2>
                </Link>

                <p className="text-neutral-600 text-base leading-relaxed mb-6">
                  {article.excerpt}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100 font-mono text-xs">
                  <span className="text-neutral-400 uppercase">By {article.author}</span>
                  <Link 
                    href={`/articles/${article.slug}`}
                    className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-neutral-900 group-hover:translate-x-1 transition-transform"
                  >
                    <span>Read Article</span>
                    <Icons.ArrowRight />
                  </Link>
                </div>
              </article>
            ))}

            {/* Load More Archives Button */}
            {hasMore && (
              <div className="pt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  {loadingMore ? 'Loading Archives...' : 'Load More Archives'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}