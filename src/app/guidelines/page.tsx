'use client';

import React from 'react';
import Link from 'next/link';

export default function GuidelinesPage() {
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
            Community Standards
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
            Platform Guidelines
          </h1>
        </div>

        <div className="space-y-8 text-neutral-700 leading-relaxed">
          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              01. Absolute Anonymity & Privacy
            </h2>
            <p className="text-sm md:text-base">
              Every post and reply is completely dissociated from personal identities and assigned automated alias codes (e.g., <code className="font-mono text-xs bg-white px-2 py-0.5 border border-neutral-200 rounded">UNSAID #48291</code>). Do not post real names, contact numbers, or specific house addresses.
            </p>
          </section>

          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              02. Zero Tolerance for Harassment & Hate Speech
            </h2>
            <p className="text-sm md:text-base">
              While rants and confessions are welcome, we enforce a strict <strong>zero-tolerance policy</strong> for targeted bullying, hate speech, discrimination, malicious defamation, or harmful threats against specific individuals. Violating content is permanently removed.
            </p>
          </section>

          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              03. Open Expression
            </h2>
            <p className="text-sm md:text-base">
             This space is built for sharing thoughts, campus experiences, daily musings, or secret admirations freely in a secure and open environment.
            </p>
          </section>

           <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              04. No Spam or Promotional Content
            </h2>
            <p className="text-sm md:text-base">
              Avoid posting commercial advertisements, spam links, self-promotion, or repetitive junk content that disrupts the feed.
            </p>
          </section>

          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              05. Content Moderation & Reporting
            </h2>
            <p className="text-sm md:text-base">
              Our platform utilizes built-in user reporting tools and administrative moderation queues. Flagged posts are actively reviewed and scrubbed from the database to maintain a safe community standard.
            </p>
          </section>

          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              06. Respect Privacy and Data Protection
            </h2>
            <p className="text-sm md:text-base">
              Never share private chat logs, or confidential information belonging to others. Protect your own digital footprint—do not share sensitive credentials, financial details, or private personal data anywhere on the platform.
            </p>
          </section>

          <div className="pt-6 border-t border-neutral-200 flex items-center justify-between">
            <span className="font-mono text-xs text-neutral-400">
              Maintained anonymously for the community.
            </span>
            <Link
              href="/"
              className="px-5 py-2.5 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition-all active:scale-95 shadow-sm"
            >
              Return to Feed
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}