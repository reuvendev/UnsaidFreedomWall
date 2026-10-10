'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ArticleData } from './types';

const Icons = {
  Back: () => (
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
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
};

function formatArticleDate(timestamp: number | null): string {
  if (timestamp === null) return 'Recently';

  return new Date(timestamp).toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  });
}

function isSafeLink(href: string): boolean {
  const clean = href.trim();
  return /^(https?:\/\/|mailto:|tel:|#)/i.test(clean) ||
    (clean.startsWith('/') && !clean.startsWith('//'));
}

function formatInlineStyles(text: string, isDarkMode: boolean) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    parts.push(isSafeLink(match[2]) ? (
      <a
        key={`link-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-semibold underline underline-offset-2 transition-colors ${
          isDarkMode
            ? 'text-emerald-400 hover:text-emerald-300'
            : 'text-emerald-700 hover:text-emerald-900'
        }`}
      >
        {match[1]}
      </a>
    ) : match[1]);

    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.map((part, i) => {
    if (typeof part !== 'string') return part;

    const tokens = part.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return tokens.map((token, j) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong
            key={`${i}-${j}`}
            className={isDarkMode ? 'font-bold text-white' : 'font-bold text-neutral-900'}
          >
            {token.slice(2, -2)}
          </strong>
        );
      }

      if (token.startsWith('*') && token.endsWith('*')) {
        return (
          <em key={`${i}-${j}`} className="italic">
            {token.slice(1, -1)}
          </em>
        );
      }

      return token;
    });
  });
}

function renderMarkdownContent(content: string, isDarkMode: boolean) {
  if (!content) return null;

  const lines = content.split('\n');

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      return (
        <h3
          key={index}
          className={`mt-9 mb-4 text-xl font-bold tracking-tight md:text-2xl ${
            isDarkMode ? 'text-white' : 'text-neutral-900'
          }`}
        >
          {formatInlineStyles(trimmed.replace('### ', ''), isDarkMode)}
        </h3>
      );
    }

    if (trimmed.startsWith('> ')) {
      return (
        <blockquote
          key={index}
          className={`my-6 border-l-2 pl-4 text-lg font-medium italic ${
            isDarkMode
              ? 'border-emerald-700 text-neutral-300'
              : 'border-emerald-600 text-neutral-700'
          }`}
        >
          {formatInlineStyles(trimmed.replace('> ', ''), isDarkMode)}
        </blockquote>
      );
    }

    if (trimmed.startsWith('- ')) {
      return (
        <ul
          key={index}
          className={`my-2 list-disc pl-5 ${
            isDarkMode ? 'text-neutral-300' : 'text-neutral-800'
          }`}
        >
          <li className="leading-7">
            {formatInlineStyles(trimmed.replace('- ', ''), isDarkMode)}
          </li>
        </ul>
      );
    }

    if (trimmed === '') {
      return <div key={index} className="h-3" />;
    }

    return (
      <p
        key={index}
        className={`mb-4 leading-7 ${
          isDarkMode ? 'text-neutral-300' : 'text-neutral-800'
        }`}
      >
        {formatInlineStyles(line, isDarkMode)}
      </p>
    );
  });
}

export default function ArticleClient({ article }: { article: ArticleData }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Client-only preference. HTML is rendered with the article content immediately.
  useEffect(() => {
    const syncDarkMode = () => {
      setIsDarkMode(localStorage.getItem('unsaid_dark_mode') === 'true');
    };

    syncDarkMode();
    window.addEventListener('storage', syncDarkMode);
    return () => window.removeEventListener('storage', syncDarkMode);
  }, []);

  return (
    <div
      className={`min-h-screen ${
        isDarkMode
          ? 'bg-[#09090b] text-neutral-100'
          : 'bg-[#fafafa] text-neutral-900'
      }`}
    >
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          isDarkMode
            ? 'border-neutral-800 bg-[#09090b]/90'
            : 'border-neutral-200/80 bg-white/90'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link
            href="/articles"
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
              isDarkMode
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Icons.Back />
            <span>All articles</span>
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

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
        <header className="mb-9">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-1 font-semibold ${
                isDarkMode
                  ? 'bg-emerald-950/50 text-emerald-400'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {article.category}
            </span>

            <span className={isDarkMode ? 'text-neutral-700' : 'text-neutral-300'}>
              •
            </span>

            <span className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}>
              {formatArticleDate(article.createdAt)}
            </span>

            <span className={isDarkMode ? 'text-neutral-700' : 'text-neutral-300'}>
              •
            </span>

            <span className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}>
              {article.readTime}
            </span>
          </div>

          <h1
            className={`mb-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl ${
              isDarkMode ? 'text-white' : 'text-neutral-900'
            }`}
          >
            {article.title}
          </h1>

          {article.excerpt && (
            <p
              className={`max-w-2xl text-base leading-7 sm:text-lg ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              {article.excerpt}
            </p>
          )}
        </header>

        <div
          className={`mb-10 border-t ${
            isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        />

        <article className="max-w-none text-base sm:text-[17px]">
          {renderMarkdownContent(article.content, isDarkMode)}
        </article>

        <footer
          className={`mt-14 flex flex-col gap-5 border-t pt-7 sm:flex-row sm:items-center sm:justify-between ${
            isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        >
          <div>
            <p
              className={`text-sm font-semibold ${
                isDarkMode ? 'text-neutral-200' : 'text-neutral-900'
              }`}
            >
              Written by {article.author}
            </p>

            <p
              className={`mt-1 text-xs ${
                isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              Tambayan Reads
            </p>
          </div>

          <Link
            href="/"
            className={`text-sm font-semibold transition-colors ${
              isDarkMode
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            Back to Tambayan →
          </Link>
        </footer>
      </main>
    </div>
  );
}
