'use client';

import React, { useState, useEffect } from 'react';
import type { Metadata } from "next";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

function Footer() {
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
      <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-tighter text-neutral-900">
            <span>UNSAID.</span>
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
          <Link href="/credits" className="hover:text-neutral-900 transition-colors">Credits</Link>
          <Link href="/post" className="text-neutral-900 hover:opacity-70 transition-opacity">Submit +</Link>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen flex flex-col bg-white text-neutral-900`}>
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}