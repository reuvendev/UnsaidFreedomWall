'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loginAdmin, logoutAdmin, checkAdminAuth } from '../../actions';

const Icons = {
  Back: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ),
  ShieldCheck: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  ),
  Bold: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>,
  Italic: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>,
  Heading: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h12"></path><path d="M6 4v16"></path><path d="M18 4v16"></path></svg>,
  Quote: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 3-2 5-5 5v1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 3-2 5-5 5v1z"></path></svg>,
  List: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  Link: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
};

export default function AdminNewArticlePage() {
  const router = useRouter();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string>("");

  // Article form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Editorial');
  const [readTime, setReadTime] = useState('4 min read');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verify server-side authentication status on mount
  useEffect(() => {
    async function verify() {
      const authed = await checkAdminAuth();
      setIsAuthenticated(authed);
    }
    verify();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);
    
    const result = await loginAdmin(formData);
    if (result.success) {
      setIsAuthenticated(true);
    } else {
      setAuthError(result.error || "Authentication failed");
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  // Auto-generate slug from title if user hasn't typed a custom slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-');
    setSlug(generatedSlug);
  };

  // Helper to insert Markdown tags around selection or at cursor position
  const insertFormatting = (syntaxType: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let replacement = '';
    let cursorOffset = 0;

    switch (syntaxType) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? replacement.length : 1;
        break;
      case 'heading':
        replacement = `\n### ${selectedText || 'Heading Title'}\n`;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || 'Blockquote or highlighted statement...'}\n`;
        break;
      case 'list':
        replacement = `\n- ${selectedText || 'List item'}\n`;
        break;
      case 'link':
        replacement = `[${selectedText || 'link text'}](https://example.com)`;
        break;
      default:
        return;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    // Reset cursor position focus smoothly
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !slug.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'articles'), {
        title: title.trim(),
        slug: slug.trim(),
        category: category.trim(),
        readTime: readTime.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        createdAt: serverTimestamp(),
        author: 'UNSAID Team'
      });

      alert('Article published successfully!');
      router.push(`/articles/${slug.trim()}`);
    } catch (err) {
      console.error('Error publishing article:', err);
      alert('Failed to publish article. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while checking auth cookie
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center font-mono text-sm">
        Verifying security clearance...
      </div>
    );
  }

  // 1. Gatekeeper Login View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-rose-500 uppercase tracking-widest font-bold">Encrypted Gateway</span>
            <h1 className="text-2xl font-black tracking-tight text-white">Admin Login</h1>
            <p className="text-xs font-mono text-neutral-400">Environment-secured authentication required.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                name="password"
                placeholder="Enter admin password..."
                className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder:text-neutral-600 font-mono focus:outline-none focus:border-rose-500 transition-all"
                autoFocus
                required
              />
              {authError && (
                <p className="font-mono text-xs text-rose-500 mt-2">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-neutral-100 hover:bg-white text-neutral-900 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              Authenticate Session
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="font-mono text-xs text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-wider">
              ← Return to Main App
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Protected Form View
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans selection:bg-neutral-100 selection:text-neutral-900 pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-neutral-900/85 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors">
            <Icons.Back />
            <span>Exit Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="font-mono text-xs text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider"
            >
              Destroy Session
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold uppercase rounded-full">
              <Icons.ShieldCheck />
              <span>Publisher Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Form Container */}
      <main className="max-w-3xl mx-auto px-6 pt-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Create New Article</h1>
          <p className="text-sm text-neutral-400 font-mono">Publish official announcements, editorials, or guides directly to the platform.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Article Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g., Behind UNSAID: The Philosophy of Anonymous Expression"
              required
              className="w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-medium text-lg focus:outline-none focus:border-neutral-500 transition-colors"
            />
          </div>

          {/* Slug & Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                URL Slug *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., philosophy-of-anonymous-expression"
                required
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono text-sm focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                Category Tag
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono text-sm focus:outline-none focus:border-neutral-500"
              >
                <option value="Editorial" className="bg-neutral-900">Editorial</option>
                <option value="Announcement" className="bg-neutral-900">Announcement</option>
                <option value="Guide" className="bg-neutral-900">Guide</option>
                <option value="Update" className="bg-neutral-900">Update</option>
              </select>
            </div>
          </div>

          {/* Read Time */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Estimated Read Time
            </label>
            <input
              type="text"
              value={readTime}
              onChange={(e) => setReadTime(e.target.value)}
              placeholder="e.g., 4 min read"
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono text-sm focus:outline-none focus:border-neutral-500"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Short Excerpt / Summary *
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              placeholder="A short hook or introduction summarizing the article..."
              required
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 text-sm focus:outline-none focus:border-neutral-500 resize-none"
            />
          </div>

          {/* Content Body with Editor Toolbar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-300">
                Main Content *
              </label>
              <span className="font-mono text-[11px] text-neutral-500">Highlight text & click buttons to format</span>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 p-2 bg-neutral-950 border border-neutral-800 border-b-0 rounded-t-lg">
              <button
                type="button"
                onClick={() => insertFormatting('bold')}
                title="Bold (**text**)"
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              >
                <Icons.Bold />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('italic')}
                title="Italic (*text*)"
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              >
                <Icons.Italic />
              </button>
              <div className="w-px h-4 bg-neutral-800 mx-1"></div>
              <button
                type="button"
                onClick={() => insertFormatting('heading')}
                title="Subheading (### Heading)"
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              >
                <Icons.Heading />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('quote')}
                title="Blockquote (> Quote)"
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              >
                <Icons.Quote />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('list')}
                title="Bullet List (- Item)"
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              >
                <Icons.List />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('link')}
                title="Hyperlink ([Text](URL))"
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              >
                <Icons.Link />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="Write your article here. Use the formatting bar above to style text like an actual professional article editor."
              required
              className="w-full p-4 bg-neutral-950 border border-neutral-800 rounded-b-lg text-neutral-100 font-sans text-base leading-relaxed focus:outline-none focus:border-neutral-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-neutral-100 hover:bg-white text-neutral-900 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? 'Publishing Article...' : 'Publish Article'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}