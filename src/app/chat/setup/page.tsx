'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ChatMaintenancePage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');

      if (storedTheme) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        setIsDarkMode(true);
      }
    } catch {}
  }, []);

  return (
    <main
      className={`min-h-[100dvh] flex items-center justify-center px-6 transition-colors ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      <div className="w-full max-w-md text-center">

        {/* Status */}
        <div
          className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ${
            isDarkMode
              ? 'border-neutral-800 bg-neutral-900'
              : 'border-neutral-200 bg-white'
          }`}
        >
          <span className="text-2xl">🔧</span>
        </div>

        {/* Label */}
        <div
          className={`mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${
            isDarkMode
              ? 'text-amber-400'
              : 'text-amber-600'
          }`}
        >
          Temporarily Unavailable
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Anonymous Chat is under maintenance.
        </h1>

        <h1 className="text-2xl sm:text-3xl tracking-tight">
          Balik kayo mamaya pls pls
        </h1>

        {/* Description */}
        <p
          className={`mt-4 text-sm leading-relaxed ${
            isDarkMode
              ? 'text-neutral-400'
              : 'text-neutral-600'
          }`}
        >
          We&apos;re currently fixing an issue with the chat system
          to make conversations more stable and reliable.
        </p>

        <p
          className={`mt-3 font-mono text-[11px] ${
            isDarkMode
              ? 'text-neutral-500'
              : 'text-neutral-400'
          }`}
        >
          We&apos;ll be back soon. Thanks for your patience!
        </p>

        {/* Divider */}
        <div
          className={`my-7 h-px ${
            isDarkMode ? 'bg-neutral-800' : 'bg-neutral-200'
          }`}
        />

        {/* Back */}
        <Link
          href="/"
          className={`inline-flex items-center justify-center rounded-xl px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
            isDarkMode
              ? 'bg-white text-neutral-900 hover:bg-neutral-200'
              : 'bg-neutral-900 text-white hover:bg-neutral-800'
          }`}
        >
          ← Back to Tambayan
        </Link>

        {/* Footer */}
        <p
          className={`mt-8 font-mono text-[9px] uppercase tracking-widest ${
            isDarkMode
              ? 'text-neutral-700'
              : 'text-neutral-300'
          }`}
        >
          TambayanSLU.com
        </p>
      </div>
    </main>
  );
}