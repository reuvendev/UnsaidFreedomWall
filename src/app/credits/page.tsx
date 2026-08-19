'use client';

import React from 'react';
import Link from 'next/link';

const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Heart: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Code: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Server: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Bot: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M9 13v2"/><path d="M15 13v2"/></svg>
};

export default function CreditsPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors uppercase tracking-wider">
            <Icons.ArrowLeft />
            <span>Back to Feed</span>
          </Link>
          <span className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest">Credits</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <div className="mb-12">
          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-3">
            Acknowledgments
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-neutral-900">
            Behind the Wall.
          </h1>
          <p className="text-base text-neutral-600 leading-relaxed">
            UNSAID is built on open technologies, minimalist principles, and a deep appreciation for digital safe spaces.
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
              Reuven Jimenez
            </div>
            <p className="text-xs text-neutral-500 mt-1 font-mono">
              BSIT Student
            </p>
          </section>

          {/* Section: Collaboration / AI Assistant */}
          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center gap-2.5 font-mono text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
              <Icons.Bot />
              <span>Engineering Support</span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-3">
              Co-developed and structured with assistance from <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-neutral-900 underline underline-offset-4 hover:text-neutral-600 transition-colors">gemini.google.com</a>.
            </p>
            <span className="inline-block font-mono text-[10px] uppercase tracking-wider bg-neutral-200/60 text-neutral-600 px-2 py-0.5 rounded">
              AI Collaborative Partner
            </span>
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
              Inspired by brutalist typography, monochrome UI aesthetics, and anonymous bulletin boards.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-neutral-400">
          <p className="flex items-center gap-1.5">
            Crafted with <Icons.Heart /> for the community.
          </p>
          <Link href="/" className="font-bold text-neutral-900 hover:underline uppercase tracking-wider">
            Return Home →
          </Link>
        </div>
      </main>
    </div>
  );
}