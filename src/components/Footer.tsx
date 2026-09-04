'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function Footer() {
  const [totalPosts, setTotalPosts] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCount() {
      try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        setTotalPosts(querySnapshot.size);
      } catch (error) {
        // Fallback silently if offline
      }
    }
    fetchCount();
  }, []);

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50/50 mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-tighter text-neutral-900">
              <span>Tambayan.</span>
              <span className="text-neutral-300">•</span>
              <span className="text-neutral-500 font-normal">Freedom Wall</span>
            </div>
            <p className="font-mono text-[11px] text-neutral-400">
              {totalPosts !== null ? `${totalPosts} total anonymous stories published.` : 'An uninhibited space for expression.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-mono text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            <Link href="/" className="hover:text-neutral-900 transition-colors">Feed</Link>
            <Link href="/about" className="hover:text-neutral-900 transition-colors">About</Link>
            <Link href="/guidelines" className="hover:text-neutral-900 transition-colors">Guidelines</Link>
            <Link href="/privacy" className="hover:text-neutral-900 transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-neutral-900 transition-colors">Contact</Link>
            <Link href="/credits" className="hover:text-neutral-900 transition-colors">Credits</Link>
            <Link href="/post" className="text-neutral-900 hover:opacity-70 transition-opacity">Submit +</Link>
          </div>
        </div>

        {/* Non-Affiliation Disclaimer */}
        <div className="border-t border-neutral-200/60 pt-6">
          <p className="font-mono text-[10px] text-neutral-400 leading-relaxed text-center md:text-left max-w-2xl">
            <strong className="text-neutral-600 font-semibold">Disclaimer:</strong> We are an independent student platform and are not officially affiliated, associated, authorized, endorsed by, or in any way connected with <span className="text-neutral-700 font-medium">Saint Louis University (SLU)</span> or any of its offices.
          </p>
        </div>

      </div>
    </footer>
  );
}