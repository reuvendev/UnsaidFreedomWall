'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const Icons = {
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
};

export default function GuidelinesPage() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Initialize Dark Mode state from localStorage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');
      if (storedTheme) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    try {
      localStorage.setItem('unsaid_dark_mode', JSON.stringify(nextMode));
    } catch (e) {}
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-neutral-900 selection:text-white ${isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-white text-neutral-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${isDarkMode ? 'bg-neutral-900/85 border-neutral-800' : 'bg-white/85 border-neutral-200'}`}>
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className={`font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
            TAMBAYAN.
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className={`font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              ← Back to Feed
            </Link>

            <button
              onClick={toggleDarkMode}
              aria-label="Toggle Dark Mode"
              className={`p-2 rounded-xl border cursor-pointer ${
                isDarkMode 
                  ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' 
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <div className="mb-10">
          <p className={`font-mono text-[11px] font-bold tracking-widest uppercase mb-2 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
            Community Standards & Safety
          </p>
          <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
            Guidelines
          </h1>
        </div>

        <div className={`space-y-8 leading-relaxed ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
          <section className={`p-6 border rounded-lg space-y-3 ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <h2 className={`font-mono text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              01. Absolute Anonymity & Manual Review
            </h2>
            <p className="text-sm md:text-base">
              Every post is assigned an automated Louisian alias (e.g., <code className={`font-mono text-xs px-2 py-0.5 border rounded ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200'}`}>Louisian #48291</code>). To keep the community safe, all entries undergo <strong className={isDarkMode ? 'text-white' : 'text-neutral-900'}>manual moderation review</strong> by administrators before going live on the public feed.
            </p>
          </section>

          <section className={`p-6 border rounded-lg space-y-3 ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <h2 className={`font-mono text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              02. Zero Tolerance for Harassment & Bullying
            </h2>
            <p className="text-sm md:text-base">
              While campus rants, confessions, and thoughts are welcome, we enforce a strict <strong className={isDarkMode ? 'text-white' : 'text-neutral-900'}>zero-tolerance policy</strong> for targeted bullying, hate speech, malicious defamation, or personal attacks against fellow Louisians or faculty members. Violating submissions are permanently rejected.
            </p>
          </section>

          <section className={`p-6 border rounded-lg space-y-3 ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <h2 className={`font-mono text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              03. Protection Against Doxxing
            </h2>
            <p className="text-sm md:text-base">
              Do not post real names, contact numbers, specific residential addresses, or direct social media links of any individual. Our submission system actively filters out potential doxxing attempts to protect student privacy.
            </p>
          </section>

          <section className={`p-6 border rounded-lg space-y-3 ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <h2 className={`font-mono text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              04. Open Campus Expression
            </h2>
            <p className="text-sm md:text-base">
              This space is built for Louisians to share academic struggles, campus experiences, secret admirations, or daily musings freely in a secure and respectful environment.
            </p>
          </section>

          <section className={`p-6 border rounded-lg space-y-3 ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <h2 className={`font-mono text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              05. No Spam or Commercial Promotions
            </h2>
            <p className="text-sm md:text-base">
              Avoid posting commercial advertisements, spam links, business self-promotion, or repetitive junk content that disrupts the campus feed.
            </p>
          </section>

          <div className={`pt-6 border-t flex items-center justify-between ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <span className={`font-mono text-xs ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Maintained safely for the Louisian community.
            </span>

            <Link
              href="/"
              className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded transition-all active:scale-95 shadow-sm cursor-pointer ${
                isDarkMode 
                  ? 'bg-neutral-100 text-neutral-950 hover:bg-white' 
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              Return to Feed
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}