'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../actions';

const CATEGORIES = [
  { id: 'thoughts', label: 'Thoughts' },
  { id: 'love', label: 'Love & Connections' },
  { id: 'rants', label: 'Rants' },
  { id: 'advice', label: 'Advice' },
  { id: 'others', label: 'Others' },
] as const;

type ExportCategory = 'all' | (typeof CATEGORIES)[number]['id'];

const portals = [
  {
    title: 'Announcements',
    description: 'Create and manage site-wide announcements.',
    href: '/admin/announce',
    icon: '📢',
  },
  {
    title: 'Appeals',
    description: 'Review and manage submitted appeals.',
    href: '/admin/appeals',
    icon: '⚖️',
  },
  {
    title: 'Articles',
    description: 'Create, edit, and manage articles.',
    href: '/admin/articles/new',
    icon: '📰',
  },
  {
    title: 'Chat Reports',
    description: 'Review reports submitted from anonymous chats.',
    href: '/admin/chatreports',
    icon: '💬',
  },
  {
    title: 'Cleanup',
    description: 'Access database cleanup and maintenance tools.',
    href: '/admin/cleanup',
    icon: '🧹',
  },
  {
    title: 'Posts',
    description: 'Review and manage Freedom Wall posts.',
    href: '/admin/posts',
    icon: '📝',
  },
  {
    title: 'Reports',
    description: 'Review reported posts and moderation reports.',
    href: '/admin/reports',
    icon: '🚩',
  },
  {
    title: 'Polls',
    description: 'Create, manage, and control live community polls.',
    href: '/admin/polls',
    icon: '📊',
  },
];

const ShieldIcon = () => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default function AdminCentralPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [exportCategory, setExportCategory] = useState<ExportCategory>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    async function verifySession() {
      try {
        const authed = await checkAdminAuth();
        setIsAuthenticated(authed);
      } catch (error) {
        console.error('Admin auth check failed:', error);
        setIsAuthenticated(false);
      }
    }

    verifySession();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setAuthError('');
    setIsLoggingIn(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await loginAdmin(formData);

      if (result.success) {
        setIsAuthenticated(true);
      } else {
        setAuthError(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Admin login failed:', error);
      setAuthError('Authentication failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } finally {
      setIsAuthenticated(false);
    }
  };

  const handleWeeklyExport = async () => {
    setExportError('');
    setExportMessage('');
    setIsExporting(true);

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      // Only filter by date in Firestore so a composite index is not required.
      // Category filtering is done below in the browser.
      const weeklyQuery = query(
        collection(db, 'posts'),
        where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
      );

      const snapshot = await getDocs(weeklyQuery);

      const weeklyPosts = snapshot.docs
        .map((doc) => {
          const data = doc.data();

          const category = String(data.category ?? 'others').toLowerCase();
          const content = String(
            data.content ?? data.text ?? data.message ?? ''
          ).trim();

          const status = String(data.status ?? '').toLowerCase();

          // Skip entries that are clearly not public/published.
          // If your posts collection does not use these fields, this still works.
          const isUnpublished =
            ['pending', 'rejected', 'draft', 'deleted'].includes(status) ||
            data.approved === false ||
            data.published === false;

          const createdAtDate =
            data.createdAt?.toDate?.() instanceof Date
              ? data.createdAt.toDate()
              : null;

          return {
            id: doc.id,
            category,
            content,
            createdAt: createdAtDate
              ? createdAtDate.toISOString()
              : null,
            isUnpublished,
          };
        })
        .filter((post) => !post.isUnpublished)
        .filter((post) => post.content.length > 0)
        .filter(
          (post) =>
            exportCategory === 'all' || post.category === exportCategory
        )
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        })
        .map(({ isUnpublished, ...post }) => post);

      if (weeklyPosts.length === 0) {
        setExportMessage('No matching posts found from the last 7 days.');
        return;
      }

      const categoryLabel =
        exportCategory === 'all'
          ? 'all-categories'
          : CATEGORIES.find((category) => category.id === exportCategory)
              ?.label.toLowerCase().replace(/[^a-z0-9]+/g, '-') ??
            exportCategory;

      const exportData = {
        exportedAt: now.toISOString(),
        period: {
          from: sevenDaysAgo.toISOString(),
          to: now.toISOString(),
        },
        category:
          exportCategory === 'all'
            ? 'All Categories'
            : CATEGORIES.find((category) => category.id === exportCategory)
                ?.label ?? exportCategory,
        totalPosts: weeklyPosts.length,
        posts: weeklyPosts,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = `tambayanslu-weekly-${categoryLabel}-${now
        .toISOString()
        .slice(0, 10)}.json`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setExportMessage(
        `Exported ${weeklyPosts.length} post${
          weeklyPosts.length === 1 ? '' : 's'
        }.`
      );
    } catch (error) {
      console.error('Weekly export failed:', error);
      setExportError(
        'Export failed. Check the Firestore collection/field names and your read permissions.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Check the existing server-side admin session first.
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-neutral-700 border-t-neutral-200 animate-spin" />
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
            Verifying security clearance...
          </p>
        </div>
      </div>
    );
  }

  // Login gate. Uses the same loginAdmin action/session as the existing admin pages.
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center p-5 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
              <ShieldIcon />
            </div>

            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-rose-500">
              Encrypted Gateway
            </p>

            <h1 className="text-2xl font-black tracking-tight text-white">
              Admin Central
            </h1>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Authenticate to access TambayanSLU administration tools.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500"
              >
                Admin Password
              </label>

              <input
                id="admin-password"
                type="password"
                name="password"
                placeholder="Enter admin password..."
                autoComplete="current-password"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 font-mono text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                autoFocus
                required
              />

              {authError && (
                <p className="mt-2 font-mono text-xs text-rose-500">
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-neutral-100 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoggingIn ? 'Authenticating...' : 'Authenticate Session'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="font-mono text-[11px] uppercase tracking-wider text-neutral-600 transition hover:text-neutral-300"
            >
              ← Return to Main App
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Authenticated Admin Central.
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-neutral-300">
            <ShieldIcon />
            <span>Admin Central</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px] sm:text-xs">
            <button
              onClick={handleLogout}
              className="uppercase tracking-wider text-rose-400 transition hover:text-rose-300"
            >
              Destroy Session
            </button>

            <Link
              href="/"
              className="hidden text-neutral-500 transition hover:text-white sm:inline"
            >
              Exit →
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="mb-8 sm:mb-10">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500">
            TambayanSLU Administration
          </p>

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Admin Central
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Moderation, content management, reports, and platform maintenance in
            one place.
          </p>
        </section>

        <section
          aria-label="Admin portals"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        >
          {portals.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              className="group relative flex min-h-[165px] flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-700 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-600"
            >
              <div>
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-xl shadow-sm">
                    <span aria-hidden="true">{portal.icon}</span>
                  </div>

                  <span
                    aria-hidden="true"
                    className="text-xl text-neutral-700 transition-all group-hover:translate-x-1 group-hover:text-neutral-300"
                  >
                    →
                  </span>
                </div>

                <h2 className="text-base font-bold text-neutral-100">
                  {portal.title}
                </h2>

                <p className="mt-1.5 text-sm leading-5 text-neutral-500">
                  {portal.description}
                </p>
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500">
                Weekly Content Export
              </p>

              <h2 className="text-xl font-black tracking-tight text-white">
                Freedom Wall — Last 7 Days
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Export published Freedom Wall posts for weekly article analysis.
                The file only includes the post ID, category, content, and
                creation date.
              </p>
            </div>

            <div className="w-full lg:max-w-sm">
              <label
                htmlFor="weekly-export-category"
                className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500"
              >
                Category
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  id="weekly-export-category"
                  value={exportCategory}
                  onChange={(event) =>
                    setExportCategory(event.target.value as ExportCategory)
                  }
                  className="min-h-11 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-200 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                >
                  <option value="all">All Categories</option>

                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleWeeklyExport}
                  disabled={isExporting}
                  className="min-h-11 rounded-xl bg-neutral-100 px-4 font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isExporting ? 'Exporting...' : 'Export JSON'}
                </button>
              </div>

              {exportMessage && (
                <p className="mt-2 font-mono text-[11px] text-emerald-400">
                  {exportMessage}
                </p>
              )}

              {exportError && (
                <p className="mt-2 font-mono text-[11px] text-rose-400">
                  {exportError}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mt-10 flex items-center justify-between border-t border-neutral-900 pt-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-700">
            Authenticated admin session
          </p>

          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 transition hover:text-neutral-300 sm:hidden"
          >
            Exit →
          </Link>
        </div>
      </div>
    </main>
  );
}
