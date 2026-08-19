'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            UNSAID.
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
            About UNSAI D.
          </h1>
        </div>

        <div className="space-y-6 text-neutral-700 leading-relaxed text-base">
          <p>
            <strong className="text-neutral-900">UNSAID</strong> is a modern, uninhibited digital freedom wall tailored for navigating life, studies, and everyday experiences. 
          </p>
          <p>
            Built as a minimalist platform to let people express thoughts, anonymous confessions, academic rants, and personal stories without the friction of social media identity markers. Every thought published is randomized with a secure tracking tag.
          </p>

          <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3 mt-8">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              Tech Stack
            </h2>
            <ul className="space-y-2 text-sm font-mono text-neutral-600">
              <li>• Framework: Next.js (App Router)</li>
              <li>• Styling: Tailwind CSS</li>
              <li>• Database & Real-time Sync: Firebase Firestore</li>
            </ul>
          </div>

          <div className="pt-6 border-t border-neutral-200 flex items-center justify-between">
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
        </div>
      </main>
    </div>
  );
}