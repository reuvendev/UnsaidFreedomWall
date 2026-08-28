'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
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
      <main className="max-w-2xl mx-auto px-6 py-24 text-center my-auto">
        <p className="font-mono text-xs font-bold text-neutral-400 tracking-widest uppercase mb-4">
          Error 404
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-neutral-900">
          Page not found.
        </h1>
        <p className="text-base text-neutral-600 max-w-sm mx-auto mb-10 leading-relaxed">
          The entry or link you are looking for might have been removed, or never existed in the first place.
        </p>
        
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3.5 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition-all active:scale-95 shadow-sm"
        >
          Return to Freedom Wall
        </Link>
      </main>
      
    </div>
  );
}