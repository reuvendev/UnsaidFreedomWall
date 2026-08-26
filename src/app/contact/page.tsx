'use client';

import React from 'react';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white flex flex-col">
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
      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24 flex-1 w-full">
        <div className="mb-10">
          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-2">
            Get in Touch
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
            Contact Support
          </h1>
        </div>

        <div className="space-y-8 text-neutral-700 leading-relaxed">
          <section className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg space-y-4">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-900">
              Administrative Inquiries & Support
            </h2>
            <p className="text-sm md:text-base">
              For any questions, concerns, or feedback regarding the platform, please reach out via email:
            </p>
            <div className="pt-2">
              <a 
                href="mailto:your-email@gmail.com" 
                className="font-mono text-xs font-bold bg-white px-4 py-3 border border-neutral-200 rounded text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors inline-block shadow-sm"
              >
                reuvendev@proton.me
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}