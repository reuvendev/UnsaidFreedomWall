'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ArticleData {
  title: string;
  slug: string;
  category: string;
  readTime: string;
  excerpt: string;
  content: string;
  createdAt: Timestamp | null;
  author: string;
}

const Icons = {
  Back: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ),
};

function formatArticleDate(timestamp: Timestamp | null): string {
  if (!timestamp) return "Recently";
  return timestamp.toDate().toLocaleDateString([], { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export default function ArticlePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function fetchArticle() {
      try {
        const q = query(collection(db, "articles"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data() as ArticleData;
          setArticle(docData);
        } else {
          setArticle(null);
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-sm text-neutral-400 animate-pulse">
        Loading article...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <h1 className="text-xl font-mono font-bold mb-2">Article not found</h1>
        <p className="text-sm text-neutral-500 mb-6">The article you are looking for doesn't exist or has been removed.</p>
        <Link href="/" className="px-4 py-2 bg-neutral-900 text-white font-mono text-xs uppercase rounded">
          Return to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors">
            <Icons.Back />
            <span>Back to Feed</span>
          </Link>
          <Link href="/" className="font-mono text-xl font-black tracking-tighter">
            UNSAID.
          </Link>
        </div>
      </header>

      {/* Article Content */}
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        {/* Article Header Metadata */}
        <div className="mb-8">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neutral-400 mb-4">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">{article.category}</span>
            <span>•</span>
            <span>{formatArticleDate(article.createdAt)}</span>
            <span>•</span>
            <span>{article.readTime}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-neutral-900">
            {article.title}
          </h1>
          
          <p className="text-lg text-neutral-600 leading-relaxed font-normal">
            {article.excerpt}
          </p>
        </div>

        {/* Divider */}
        <hr className="border-neutral-200 mb-10" />

        {/* Article Body Typography */}
        <article className="prose prose-neutral max-w-none space-y-6 text-neutral-800 text-base md:text-lg leading-relaxed whitespace-pre-line">
          {article.content}
        </article>

        {/* Article Footer / Author Tag */}
        <div className="mt-16 pt-8 border-t border-neutral-200 flex items-center justify-between font-mono text-xs text-neutral-500">
          <div>
            <p className="font-bold text-neutral-900 uppercase">Written by {article.author}</p>
            <p className="text-[11px] text-neutral-400">UNSAID Operations</p>
          </div>
          <Link href="/" className="hover:text-neutral-900 uppercase font-bold tracking-wider">
            Explore Feed →
          </Link>
        </div>
      </main>
    </div>
  );
}