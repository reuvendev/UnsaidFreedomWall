'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CATEGORIES = [
  { id: 'thoughts', label: 'Thoughts' },
  { id: 'love', label: 'Love & Connections' },
  { id: 'rants', label: 'Rants' },
  { id: 'life', label: 'City Life' },
  { id: 'others', label: 'Others' },
];

const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
};

// Robust Doxxing Detection Utility
const PHONE_REGEX = /(?:(?:\+|00)?63[\s.-]?|0)?[1-9]\d{1,2}[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{10,11}\b|(\d[^\w\d]*){10,12}/i;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const SOCIAL_REGEX = /(?:facebook\.com|fb\.com|instagram\.com|ig\.me|t\.me|twitter\.com|x\.com)(?:[\s\S]*?\/|\s+[a-zA-Z0-9._-]+)/i;
const SPECIFIC_ADDRESS_PATTERNS = /(house|lot|unit|street|st\.|purok|barangay|bgy\.)\s+[0-9a-zA-Z\s,]+/i;

function checkForDoxxing(content: string) {
  const matches: string[] = [];

  if (PHONE_REGEX.test(content)) {
    matches.push("Phone number detected");
  }
  if (EMAIL_REGEX.test(content)) {
    matches.push("Email address detected");
  }
  if (SOCIAL_REGEX.test(content)) {
    matches.push("Social media link detected");
  }
  if (SPECIFIC_ADDRESS_PATTERNS.test(content)) {
    matches.push("Specific residential address detected");
  }

  return {
    hasPotentialDoxx: matches.length > 0,
    matchedPatterns: matches,
  };
}

export default function PostPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('thoughts');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const adContainerRef = useRef<HTMLDivElement>(null);

  // Sandboxed iframe ad injector hook
  useEffect(() => {
    if (!adContainerRef.current) return;
    const container = adContainerRef.current;

    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.style.width = '320px';
    iframe.style.height = '50px';
    iframe.style.border = '0';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('scrolling', 'no');
    container.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: transparent;
            }
          </style>
        </head>
        <body>
          <script>
            atOptions = {
              'key': 'f05afa052d7f89c5f20d0d9629dfb72f',
              'format': 'iframe',
              'height': 50,
              'width': 320,
              'params': {}
            };
          </script>
          <script src="https://plentyhelium.com/f05afa052d7f89c5f20d0d9629dfb72f/invoke.js"></script>
        </body>
      </html>
    `);
    iframeDoc.close();

    return () => {
      container.innerHTML = '';
    };
  }, []);

  const generateAlias = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `UNSAID #${randomNum}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Please write something before publishing.');
      return;
    }

    // Check for sensitive personal info (doxxing)
    const doxxCheck = checkForDoxxing(content);
    if (doxxCheck.hasPotentialDoxx) {
      setError(`Post blocked for privacy safety: ${doxxCheck.matchedPatterns.join(', ')}. Please remove personal info.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const authorAlias = generateAlias();
      
      await addDoc(collection(db, 'posts'), {
        content: content.trim(),
        category,
        authorAlias,
        upvotes: 0,
        replies: 0,
        createdAt: serverTimestamp(),
      });

      router.push('/');
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to publish entry. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors uppercase tracking-wider">
            <Icons.ArrowLeft />
            <span>Back to Feed</span>
          </Link>
          <span className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest">New Entry</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-neutral-900">
            Publish Anonymously.
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Your identity is completely protected. A random secure alias tag will be generated for your entry.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block font-mono text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
              Select Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider rounded border text-left transition-all ${
                    category === cat.id
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="content" className="block font-mono text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
              Your Message or Story
            </label>
            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? Share your thoughts, rants, or stories..."
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Ad Placement: 320x50 Banner with an "Ad" label */}
          <div className="my-6 flex flex-col items-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 mb-1">
              Advertisement
            </span>
            <div
              ref={adContainerRef}
              className="w-[320px] h-[50px] flex items-center justify-center bg-neutral-50/50 border border-neutral-100 rounded overflow-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-neutral-200">
            <Link
              href="/"
              className="px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-2 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded hover:bg-neutral-800 transition-all active:scale-95 shadow-sm ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Icons.Send />
              <span>{loading ? 'Publishing...' : 'Publish Entry'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}