'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const Icons = {
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Bot: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>,
  Code: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Server: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
};

export default function AboutPage() {
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
            Project Overview
          </p>
          <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
            About TAMBAYAN.
          </h1>
        </div>

        <div className={`space-y-6 leading-relaxed text-base mb-10 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
          <p>
            <strong className={isDarkMode ? 'text-white' : 'text-neutral-900'}>TAMBAYAN ESELYU</strong> is an online space for students to share their thoughts, experiences, rants, and stories about campus life and studies.
          </p>
          <p>
            It is a simple platform where people can post anonymous confessions, academic updates, and personal stories without showing their identity. Posts are reviewed through manual moderation before being published to help keep the community safe and organized.
          </p>
          <p>
            Disclaimer: We are an independent student platform and are not officially affiliated, associated, authorized, endorsed by, or in any way connected with Saint Louis University (SLU) or any of its offices.
          </p>
        </div>

        <div className="space-y-6">
          {/* Section: Creator & Developer */}
          <section className={`p-6 border rounded-lg ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className={`flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              <Icons.User />
              <span>Created & Developed By</span>
            </div>
            <div className={`font-mono text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              Nevz
            </div>
            <p className="text-xs text-neutral-500 mt-1 font-mono">
            </p>
          </section>

          {/* Section: Core Stack */}
          <section className={`p-6 border rounded-lg ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className={`flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              <Icons.Code />
              <span>Framework & Libraries</span>
            </div>
            <ul className={`space-y-3 font-mono text-xs ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
              <li className={`flex items-center justify-between border-b pb-2 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200/60'}`}>
                <span className={`font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>Next.js (App Router)</span>
                <span className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}>React Framework</span>
              </li>
              <li className={`flex items-center justify-between border-b pb-2 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200/60'}`}>
                <span className={`font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>Tailwind CSS</span>
                <span className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}>Styling & Design System</span>
              </li>
              <li className="flex items-center justify-between">
                <span className={`font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>TypeScript</span>
                <span className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}>Type Safety</span>
              </li>
            </ul>
          </section>

          {/* Section: Backend & Infrastructure */}
          <section className={`p-6 border rounded-lg ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className={`flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              <Icons.Server />
              <span>Backend & Hosting</span>
            </div>
            <ul className={`space-y-3 font-mono text-xs ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
              <li className={`flex items-center justify-between border-b pb-2 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200/60'}`}>
                <span className={`font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>Firebase Firestore</span>
                <span className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}>Realtime NoSQL Database</span>
              </li>
              <li className="flex items-center justify-between">
                <span className={`font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>Vercel</span>
                <span className={isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}>Deployment & Edge Network</span>
              </li>
            </ul>
          </section>

          {/* Section: Design Inspiration */}
          <section className={`p-6 border rounded-lg ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <div className={`flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              <Icons.Sparkles />
              <span>Design & Philosophy</span>
            </div>
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Inspired by brutalist typography, monochrome UI aesthetics, and secure anonymous student hangouts.
            </p>
          </section>
        </div>

        <div className={`pt-8 mt-8 border-t flex items-center justify-between ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <Link
            href="/guidelines"
            className={`font-mono text-xs font-semibold transition-colors uppercase tracking-wider ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            View Guidelines →
          </Link>
          <Link
            href="/"
            className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded transition-all active:scale-95 shadow-sm cursor-pointer ${
              isDarkMode 
                ? 'bg-neutral-100 text-neutral-950 hover:bg-white' 
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            Explore Feed
          </Link>
        </div>
      </main>
    </div>
  );
}