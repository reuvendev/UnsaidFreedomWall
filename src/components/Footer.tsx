'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function Footer() {
  const pathname = usePathname();
  const [totalPosts, setTotalPosts] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Hide the footer entirely on chat room routes (e.g. /chat/room_id)
  if (pathname?.includes('/chat/')) {
    return null;
  }

  useEffect(() => {
    // Function to check and update theme from localStorage
    const checkTheme = () => {
      try {
        const storedTheme = localStorage.getItem('unsaid_dark_mode');
        if (storedTheme !== null) {
          setIsDarkMode(JSON.parse(storedTheme));
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setIsDarkMode(true);
        }
      } catch (e) {
        // Ignore
      }
    };

    // Initial check
    checkTheme();

    // Listen to custom or storage events to sync instantly across components
    window.addEventListener('storage', checkTheme);
    
    // Custom event listener if your toggle updates state in the same window without a storage event trigger
    const interval = setInterval(checkTheme, 300);

    return () => {
      window.removeEventListener('storage', checkTheme);
      clearInterval(interval);
    };
  }, []);

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
    <footer className={`border-t mt-auto transition-colors duration-300 ${isDarkMode ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-neutral-200 bg-neutral-50/50 text-neutral-900'}`}>
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className={`flex items-center gap-2 font-mono text-xs font-bold tracking-tighter ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              <span>Tambayan.</span>
              <span className={isDarkMode ? 'text-neutral-700' : 'text-neutral-300'}>•</span>
              <span className={`font-normal ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Freedom Wall</span>
            </div>
            <p className={`font-mono text-[11px] ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {totalPosts !== null ? `${totalPosts} total anonymous stories published.` : 'An uninhibited space for expression.'}
            </p>
          </div>

          <div className={`flex flex-wrap items-center gap-6 font-mono text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
            <Link href="/" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-neutral-900'}`}>Feed</Link>
            <Link href="/about" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-neutral-900'}`}>About</Link>
            <Link href="/guidelines" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-neutral-900'}`}>Guidelines</Link>
            <Link href="/privacy" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-neutral-900'}`}>Privacy</Link>
            <Link href="/contact" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-neutral-900'}`}>Contact</Link>
            <Link href="/credits" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-neutral-900'}`}>Credits</Link>
            <Link href="/post" className={`transition-opacity ${isDarkMode ? 'text-white hover:opacity-70' : 'text-neutral-900 hover:opacity-70'}`}>Submit +</Link>
          </div>
        </div>

        {/* Non-Affiliation Disclaimer */}
        <div className={`border-t pt-6 ${isDarkMode ? 'border-neutral-900' : 'border-neutral-200/60'}`}>
          <p className={`font-mono text-[10px] leading-relaxed text-center md:text-left max-w-2xl ${isDarkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
            <strong className={`font-semibold ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>Disclaimer:</strong> We are an independent student platform and are not officially affiliated, associated, authorized, endorsed by, or in any way connected with <span className={`font-medium ${isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}`}>Saint Louis University (SLU)</span> or any of its offices.
          </p>
        </div>

      </div>
    </footer>
  );
}