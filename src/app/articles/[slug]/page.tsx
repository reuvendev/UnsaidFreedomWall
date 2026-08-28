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

// Simple parser to convert custom markdown text blocks into styled JSX elements
function renderMarkdownContent(content: string) {
  if (!content) return null;

  const lines = content.split('\n');
  return lines.map((line, index) => {
    const trimmed = line.trim();

    // Headings (### Heading)
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={index} className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900 mt-8 mb-4">
          {formatInlineStyles(trimmed.replace('### ', ''))}
        </h3>
      );
    }

    // Blockquotes (> Quote)
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote key={index} className="border-l-2 border-neutral-900 pl-4 my-6 italic text-neutral-700 font-medium text-lg">
          {formatInlineStyles(trimmed.replace('> ', ''))}
        </blockquote>
      );
    }

    // Bullet Lists (- Item)
    if (trimmed.startsWith('- ')) {
      return (
        <ul key={index} className="list-disc list-inside my-2 space-y-1 text-neutral-800">
          <li>{formatInlineStyles(trimmed.replace('- ', ''))}</li>
        </ul>
      );
    }

    // Empty lines act as natural paragraph spacing
    if (trimmed === '') {
      return <div key={index} className="h-4" />;
    }

    // Regular paragraphs
    return (
      <p key={index} className="leading-relaxed mb-4 text-neutral-800">
        {formatInlineStyles(line)}
      </p>
    );
  });
}

// Helper to handle inline bold (**text**), italics (*text*), and links ([text](url))
function formatInlineStyles(text: string) {
  // Replace links first: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <a 
        key={match.index} 
        href={match[2]} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="underline text-emerald-700 hover:text-emerald-900 font-semibold"
      >
        {match[1]}
      </a>
    );
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // Next, map through text pieces to handle bold and italics safely
  return parts.map((part, i) => {
    if (typeof part !== 'string') return part;

    // Split by bold (**...**) and italic (*...*) tokens
    const tokens = part.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return tokens.map((token, j) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={j} className="font-bold text-neutral-900">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('*') && token.endsWith('*')) {
        return <em key={j} className="italic">{token.slice(1, -1)}</em>;
      }
      return token;
    });
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

        {/* Article Body Typography (Parsed Markdown) */}
        <article className="prose prose-neutral max-w-none text-base md:text-lg leading-relaxed">
          {renderMarkdownContent(article.content)}
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