'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../../actions';

const DRAFT_KEY = 'tambayan_article_draft';

type EditorMode = 'write' | 'preview';

interface DraftData {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  author: string;
}

const Icons = {
  Back: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  Bold: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  ),
  Italic: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  ),
  Heading: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h12" />
      <path d="M6 4v16" />
      <path d="M18 4v16" />
    </svg>
  ),
  Quote: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 3-2 5-5 5v1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 3-2 5-5 5v1z" />
    </svg>
  ),
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  Link: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  ),
  Save: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  ),
  External: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  ),
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function countWords(value: string) {
  const clean = value.trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

function estimateReadTime(value: string) {
  const words = countWords(value);
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function formatInlineStyles(text: string) {
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
        key={`link-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
      >
        {match[1]}
      </a>
    );

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
          <strong key={`${i}-${j}`} className="font-bold text-white">
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

function renderPreview(content: string) {
  if (!content.trim()) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-neutral-600">
        Start writing to see the preview.
      </div>
    );
  }

  const lines = content.split('\n');

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={index} className="mb-4 mt-8 text-2xl font-bold tracking-tight text-white">
          {formatInlineStyles(trimmed.replace('### ', ''))}
        </h3>
      );
    }

    if (trimmed.startsWith('> ')) {
      return (
        <blockquote key={index} className="my-6 border-l-2 border-emerald-700 pl-4 text-lg italic text-neutral-300">
          {formatInlineStyles(trimmed.replace('> ', ''))}
        </blockquote>
      );
    }

    if (trimmed.startsWith('- ')) {
      return (
        <ul key={index} className="my-2 list-disc pl-6 text-neutral-300">
          <li className="leading-7">
            {formatInlineStyles(trimmed.replace('- ', ''))}
          </li>
        </ul>
      );
    }

    if (!trimmed) {
      return <div key={index} className="h-3" />;
    }

    return (
      <p key={index} className="mb-4 leading-7 text-neutral-300">
        {formatInlineStyles(line)}
      </p>
    );
  });
}

export default function AdminNewArticlePage() {
  const router = useRouter();
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState('Guide');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('TambayanSLU');
  const [editorMode, setEditorMode] = useState<EditorMode>('write');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [draftStatus, setDraftStatus] = useState('Draft autosaves locally');

  const wordCount = useMemo(() => countWords(content), [content]);
  const readTime = useMemo(() => estimateReadTime(content), [content]);
  const excerptCount = excerpt.length;

  useEffect(() => {
    async function verify() {
      const authed = await checkAdminAuth();
      setIsAuthenticated(authed);
    }

    verify();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;

    try {
      const draft = JSON.parse(saved) as Partial<DraftData>;
      setTitle(draft.title || '');
      setSlug(draft.slug || '');
      setCategory(draft.category || 'Guide');
      setExcerpt(draft.excerpt || '');
      setContent(draft.content || '');
      setAuthor(draft.author || 'TambayanSLU');
      if (draft.slug) setSlugTouched(true);
      setDraftStatus('Local draft restored');
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = window.setTimeout(() => {
      const draft: DraftData = {
        title,
        slug,
        category,
        excerpt,
        content,
        author,
      };

      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftStatus('Saved locally');
    }, 500);

    return () => window.clearTimeout(timer);
  }, [title, slug, category, excerpt, content, author]);

  useEffect(() => {
    if (!slug.trim()) {
      setSlugAvailable(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCheckingSlug(true);

      try {
        const slugQuery = query(
          collection(db, 'articles'),
          where('slug', '==', slug.trim()),
          limit(1)
        );

        const snapshot = await getDocs(slugQuery);
        setSlugAvailable(snapshot.empty);
      } catch (error) {
        console.error('Error checking article slug:', error);
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [slug]);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');

    const formData = new FormData(e.currentTarget);
    const result = await loginAdmin(formData);

    if (result.success) {
      setIsAuthenticated(true);
    } else {
      setAuthError(result.error || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);

    if (!slugTouched) {
      setSlug(makeSlug(value));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    setSlug(makeSlug(e.target.value));
  };

  const insertFormatting = (
    type: 'bold' | 'italic' | 'heading' | 'quote' | 'list' | 'link'
  ) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    let replacement = '';
    let selectionStart = start;
    let selectionEnd = start;

    switch (type) {
      case 'bold': {
        const value = selected || 'bold text';
        replacement = `**${value}**`;
        selectionStart = start + 2;
        selectionEnd = selectionStart + value.length;
        break;
      }

      case 'italic': {
        const value = selected || 'italic text';
        replacement = `*${value}*`;
        selectionStart = start + 1;
        selectionEnd = selectionStart + value.length;
        break;
      }

      case 'heading': {
        const value = selected || 'Section heading';
        replacement = `${start > 0 && content[start - 1] !== '\n' ? '\n' : ''}### ${value}\n`;
        const prefix = replacement.indexOf(value);
        selectionStart = start + prefix;
        selectionEnd = selectionStart + value.length;
        break;
      }

      case 'quote': {
        const value = selected || 'Quoted text';
        replacement = `${start > 0 && content[start - 1] !== '\n' ? '\n' : ''}> ${value}\n`;
        const prefix = replacement.indexOf(value);
        selectionStart = start + prefix;
        selectionEnd = selectionStart + value.length;
        break;
      }

      case 'list': {
        const value = selected || 'List item';
        const listText = value
          .split('\n')
          .map((item) => `- ${item.replace(/^-\s*/, '')}`)
          .join('\n');

        replacement = `${start > 0 && content[start - 1] !== '\n' ? '\n' : ''}${listText}\n`;
        selectionStart = start + replacement.length;
        selectionEnd = selectionStart;
        break;
      }

      case 'link': {
        const value = selected || 'link text';
        replacement = `[${value}](https://example.com)`;
        const urlStart = replacement.indexOf('https://');
        selectionStart = start + urlStart;
        selectionEnd = start + replacement.length - 1;
        break;
      }
    }

    const next =
      content.substring(0, start) + replacement + content.substring(end);

    setContent(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;

    const key = e.key.toLowerCase();

    if (key === 'b') {
      e.preventDefault();
      insertFormatting('bold');
    }

    if (key === 'i') {
      e.preventDefault();
      insertFormatting('italic');
    }

    if (key === 'k') {
      e.preventDefault();
      insertFormatting('link');
    }

    if (key === 's') {
      e.preventDefault();
      saveDraftNow();
    }
  };

  const saveDraftNow = () => {
    const draft: DraftData = {
      title,
      slug,
      category,
      excerpt,
      content,
      author,
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftStatus('Saved just now');
  };

  const clearDraft = () => {
    const confirmed = window.confirm(
      'Clear this draft? This only removes the local draft and does not affect published articles.'
    );

    if (!confirmed) return;

    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setCategory('Guide');
    setExcerpt('');
    setContent('');
    setAuthor('TambayanSLU');
    setSlugAvailable(null);

    localStorage.removeItem(DRAFT_KEY);
    setDraftStatus('Draft cleared');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !slug.trim() || !excerpt.trim() || !content.trim()) {
      alert('Please complete the title, slug, excerpt, and article body.');
      return;
    }

    if (slugAvailable === false) {
      alert('That URL slug is already in use. Please choose another one.');
      return;
    }

    setIsSubmitting(true);

    try {
      const slugQuery = query(
        collection(db, 'articles'),
        where('slug', '==', slug.trim()),
        limit(1)
      );

      const existing = await getDocs(slugQuery);

      if (!existing.empty) {
        setSlugAvailable(false);
        alert('That URL slug is already in use. Please choose another one.');
        return;
      }

      await addDoc(collection(db, 'articles'), {
        title: title.trim(),
        slug: slug.trim(),
        category: category.trim(),
        readTime,
        excerpt: excerpt.trim(),
        content: content.trim(),
        createdAt: serverTimestamp(),
        author: author.trim() || 'TambayanSLU',
      });

      localStorage.removeItem(DRAFT_KEY);
      router.push(`/articles/${slug.trim()}`);
    } catch (error) {
      console.error('Error publishing article:', error);
      alert('Failed to publish article. Check the console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-sm text-neutral-500">
        Checking admin access...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-5 text-neutral-100">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-[#111113] p-6 shadow-2xl sm:p-8">
          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Icons.ShieldCheck />
              Tambayan Admin
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Sign in to publish
            </h1>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Admin access is required to manage Tambayan Reads.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Admin password
              </label>

              <input
                type="password"
                name="password"
                placeholder="Enter password"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-emerald-800"
                autoFocus
                required
              />

              {authError && (
                <p className="mt-2 text-xs text-rose-400">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              Sign in
            </button>
          </form>

          <Link
            href="/"
            className="mt-6 block text-center text-xs text-neutral-500 transition-colors hover:text-neutral-300"
          >
            ← Back to Tambayan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] pb-28 text-neutral-100">
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-[#09090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/central"
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
            >
              <Icons.Back />
              <span className="hidden sm:inline">Admin</span>
            </Link>

            <div className="hidden h-5 w-px bg-neutral-800 sm:block" />

            <div>
              <p className="text-sm font-bold text-white">Tambayan Reads</p>
              <p className="hidden text-[11px] text-neutral-500 sm:block">
                Article editor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveDraftNow}
              className="hidden items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 sm:inline-flex"
            >
              <Icons.Save />
              Save draft
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-rose-400"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="min-w-0">
              <div className="mb-7">
                <p className="mb-2 text-sm font-medium text-emerald-400">
                  New article
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Write something worth reading.
                </h1>
              </div>

              <div className="space-y-5">
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Article title"
                    className="w-full border-0 bg-transparent px-0 text-3xl font-bold leading-tight tracking-tight text-white outline-none placeholder:text-neutral-700 sm:text-4xl"
                    required
                  />
                </div>

                <div>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value.slice(0, 220))}
                    rows={2}
                    placeholder="Write a short description of the article..."
                    className="w-full resize-none border-0 bg-transparent px-0 text-base leading-7 text-neutral-400 outline-none placeholder:text-neutral-700 sm:text-lg"
                    required
                  />
                  <div className="mt-1 text-right text-[11px] text-neutral-600">
                    {excerptCount}/220
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#111113]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <button type="button" onClick={() => insertFormatting('bold')} title="Bold (Ctrl/Cmd + B)" className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white">
                        <Icons.Bold />
                      </button>
                      <button type="button" onClick={() => insertFormatting('italic')} title="Italic (Ctrl/Cmd + I)" className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white">
                        <Icons.Italic />
                      </button>

                      <div className="mx-1 h-5 w-px bg-neutral-800" />

                      <button type="button" onClick={() => insertFormatting('heading')} title="Section heading" className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white">
                        <Icons.Heading />
                      </button>
                      <button type="button" onClick={() => insertFormatting('quote')} title="Quote" className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white">
                        <Icons.Quote />
                      </button>
                      <button type="button" onClick={() => insertFormatting('list')} title="Bulleted list" className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white">
                        <Icons.List />
                      </button>
                      <button type="button" onClick={() => insertFormatting('link')} title="Link (Ctrl/Cmd + K)" className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white">
                        <Icons.Link />
                      </button>
                    </div>

                    <div className="flex rounded-lg bg-neutral-950 p-1">
                      <button
                        type="button"
                        onClick={() => setEditorMode('write')}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          editorMode === 'write'
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        <Icons.Edit />
                        Write
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditorMode('preview')}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          editorMode === 'preview'
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        <Icons.Eye />
                        Preview
                      </button>
                    </div>
                  </div>

                  {editorMode === 'write' ? (
                    <textarea
                      ref={contentRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      rows={22}
                      placeholder={`Start writing your article...

Use the toolbar for headings, bold text, quotes, lists, and links.`}
                      required
                      spellCheck
                      className="min-h-[520px] w-full resize-y bg-transparent p-5 text-[16px] leading-8 text-neutral-200 outline-none placeholder:text-neutral-700 sm:p-6"
                    />
                  ) : (
                    <div className="min-h-[520px] p-5 sm:p-8">
                      <div className="mx-auto max-w-2xl">
                        {title && (
                          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                            {title}
                          </h1>
                        )}

                        {excerpt && (
                          <p className="mb-8 text-lg leading-7 text-neutral-400">
                            {excerpt}
                          </p>
                        )}

                        <div className="border-t border-neutral-800 pt-2">
                          {renderPreview(content)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 px-4 py-3 text-[11px] text-neutral-500">
                    <span>{wordCount.toLocaleString()} words · {readTime}</span>
                    <span>{draftStatus}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 lg:hidden">
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 px-4 py-3 text-sm font-medium text-neutral-400 transition-colors hover:border-rose-900 hover:bg-rose-950/20 hover:text-rose-400"
                  >
                    <Icons.Trash />
                    Clear
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || slugAvailable === false}
                    className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish article'}
                  </button>
                </div>
              </div>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-neutral-800 bg-[#111113] p-5">
                <h2 className="mb-5 text-sm font-semibold text-white">
                  Article settings
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-neutral-400">
                      URL slug
                    </label>

                    <input
                      type="text"
                      value={slug}
                      onChange={handleSlugChange}
                      placeholder="article-url"
                      required
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-200 outline-none transition-colors placeholder:text-neutral-700 focus:border-emerald-900"
                    />

                    <div className="mt-2 min-h-4 text-[11px]">
                      {checkingSlug && (
                        <span className="text-neutral-500">Checking URL...</span>
                      )}

                      {!checkingSlug && slug && slugAvailable === true && (
                        <span className="text-emerald-400">URL is available</span>
                      )}

                      {!checkingSlug && slug && slugAvailable === false && (
                        <span className="text-rose-400">This URL is already used</span>
                      )}
                    </div>

                    {slug && (
                      <p className="mt-1 break-all text-[11px] text-neutral-600">
                        /articles/{slug}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-neutral-400">
                      Category
                    </label>

                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-200 outline-none focus:border-emerald-900"
                    >
                      <option value="Guide">Guide</option>
                      <option value="Student Life">Student Life</option>
                      <option value="Baguio">Baguio</option>
                      <option value="Online Safety">Online Safety</option>
                      <option value="Tambayan">Tambayan</option>
                      <option value="Update">Update</option>
                      <option value="Announcement">Announcement</option>
                      <option value="Editorial">Editorial</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-neutral-400">
                      Author
                    </label>

                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="TambayanSLU"
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-emerald-900"
                    />
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                    <p className="text-xs font-medium text-neutral-300">
                      Reading estimate
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                      <span>{wordCount.toLocaleString()} words</span>
                      <span>{readTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden rounded-2xl border border-neutral-800 bg-[#111113] p-4 lg:block">
                <button
                  type="submit"
                  disabled={isSubmitting || slugAvailable === false}
                  className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish article'}
                </button>

                <button
                  type="button"
                  onClick={saveDraftNow}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-800 px-4 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
                >
                  <Icons.Save />
                  Save draft
                </button>

                <button
                  type="button"
                  onClick={clearDraft}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-neutral-500 transition-colors hover:bg-rose-950/20 hover:text-rose-400"
                >
                  <Icons.Trash />
                  Clear draft
                </button>
              </div>

              {slug && (
                <Link
                  href={`/articles/${slug}`}
                  target="_blank"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-800 px-4 py-3 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-neutral-300"
                >
                  <Icons.External />
                  Open article URL
                </Link>
              )}
            </aside>
          </div>
        </main>
      </form>
    </div>
  );
}
