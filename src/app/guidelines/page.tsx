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
            Community Standards & Safety
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
            Guidelines
          </h1>
        </div>

        <div className="space-y-8 text-neutral-700 leading-relaxed">
          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              01. Absolute Anonymity & Manual Review
            </h2>
            <p className="text-sm md:text-base">
              Every post is assigned an automated Louisian alias (e.g., <code className="font-mono text-xs bg-white px-2 py-0.5 border border-neutral-200 rounded">Louisian #48291</code>). To keep the community safe, all entries undergo <strong>manual moderation review</strong> by administrators before going live on the public feed.
            </p>
          </section>

          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              02. Zero Tolerance for Harassment & Bullying
            </h2>
            <p className="text-sm md:text-base">
              While campus rants, confessions, and thoughts are welcome, we enforce a strict <strong>zero-tolerance policy</strong> for targeted bullying, hate speech, malicious defamation, or personal attacks against fellow Louisians or faculty members. Violating submissions are permanently rejected.
            </p>
          </section>

          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              03. Protection Against Doxxing
            </h2>
            <p className="text-sm md:text-base">
              Do not post real names, contact numbers, specific residential addresses, or direct social media links of any individual. Our submission system actively filters out potential doxxing attempts to protect student privacy.
            </p>
          </section>

           <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              04. Open Campus Expression
            </h2>
            <p className="text-sm md:text-base">
             This space is built for Louisians to share academic struggles, campus experiences, secret admirations, or daily musings freely in a secure and respectful environment.
            </p>
          </section>

          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              05. No Spam or Commercial Promotions
            </h2>
            <p className="text-sm md:text-base">
              Avoid posting commercial advertisements, spam links, business self-promotion, or repetitive junk content that disrupts the campus feed.
            </p>
          </section>

          <div className="pt-6 border-t border-neutral-200 flex items-center justify-between">
            <span className="font-mono text-xs text-neutral-400">
              Maintained safely for the Louisian community.
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