'use client';

import React from 'react';
import Link from 'next/link';

const Icons = {
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Bot: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>,
  Code: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Server: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            TAMBAYAN.
          </Link>
          <Link 
            href="/" 
            className="font-mono text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-wider"
          >
            ← Back to Feed
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <div className="mb-10">
          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-2">
            Project Overview
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
            About TAMBAYAN.
          </h1>
        </div>

        <div className="space-y-6 text-neutral-700 leading-relaxed text-base mb-10">
          <p>
            <strong className="text-neutral-900">TAMBAYAN</strong> is a modern, uninhibited digital student hangout and freedom wall tailored for navigating campus life, studies, rants, and everyday experiences. 
          </p>
          <p>
            Built as a minimalist platform to let people express thoughts, anonymous confessions, academic updates, and personal stories without the friction of social media identity markers. Every thought published goes through manual moderation and is tagged securely.
          </p>
        </div>

        <div className="space-y-6">
          {/* Section: Creator & Developer */}
          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center gap-2.5 font-mono text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
              <Icons.User />
              <span>Created & Developed By</span>
            </div>
            <div className="font-mono text-sm font-semibold text-neutral-900">
              Nevz
            </div>
            <p className="text-xs text-neutral-500 mt-1 font-mono">
            </p>
          </section>

          {/* Section: Core Stack */}
          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center gap-2.5 font-mono text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
              <Icons.Code />
              <span>Framework & Libraries</span>
            </div>
            <ul className="space-y-3 font-mono text-xs text-neutral-600">
              <li className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                <span className="font-semibold text-neutral-800">Next.js (App Router)</span>
                <span className="text-neutral-400">React Framework</span>
              </li>
              <li className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                <span className="font-semibold text-neutral-800">Tailwind CSS</span>
                <span className="text-neutral-400">Styling & Design System</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">TypeScript</span>
                <span className="text-neutral-400">Type Safety</span>
              </li>
            </ul>
          </section>

          {/* Section: Backend & Infrastructure */}
          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center gap-2.5 font-mono text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
              <Icons.Server />
              <span>Backend & Hosting</span>
            </div>
            <ul className="space-y-3 font-mono text-xs text-neutral-600">
              <li className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                <span className="font-semibold text-neutral-800">Firebase Firestore</span>
                <span className="text-neutral-400">Realtime NoSQL Database</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">Vercel</span>
                <span className="text-neutral-400">Deployment & Edge Network</span>
              </li>
            </ul>
          </section>

          {/* Section: Design Inspiration */}
          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center gap-2.5 font-mono text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
              <Icons.Sparkles />
              <span>Design & Philosophy</span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Inspired by brutalist typography, monochrome UI aesthetics, and secure anonymous student hangouts.
            </p>
          </section>
        </div>

        <div className="pt-8 mt-8 border-t border-neutral-200 flex items-center justify-between">
          <Link
            href="/guidelines"
            className="font-mono text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-wider"
          >
            View Guidelines →
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition-all active:scale-95 shadow-sm"
          >
            Explore Feed
          </Link>
        </div>
      </main>
    </div>
  );
}