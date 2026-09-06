'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const Icons = {
  Coffee: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>,
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
};

const PAYMENT_CHANNELS = [
  {
    id: 'gcash',
    name: 'GCash',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    darkModeColor: 'bg-blue-950/40 text-blue-400 border-blue-900/60 hover:bg-blue-900/50',
    activeColor: 'bg-blue-600 text-white shadow-sm',
    accountName: 'Re***n J',
    qrImage: '/images/gcash-qr.jpg',
  },
  {
    id: 'maya',
    name: 'Maya',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    darkModeColor: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60 hover:bg-emerald-900/50',
    activeColor: 'bg-emerald-600 text-white shadow-sm',
    accountName: 'Re***n J',
    qrImage: '/images/maya-qr.jpg',
  },
  {
    id: 'gotyme',
    name: 'GoTyme',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
    darkModeColor: 'bg-cyan-950/40 text-cyan-400 border-cyan-900/60 hover:bg-cyan-900/50',
    activeColor: 'bg-cyan-600 text-white shadow-sm',
    accountName: 'Re***n J',
    qrImage: '/images/gotyme-qr.jpg', 
  },
];

export default function SupportPage() {
  const [selectedTab, setSelectedTab] = useState<string>('gcash');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Initialize Dark Mode state from localStorage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');
      if (storedTheme) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    try {
      localStorage.setItem('unsaid_dark_mode', JSON.stringify(nextMode));
    } catch (e) {}
  };

  const activeChannel = PAYMENT_CHANNELS.find((c) => c.id === selectedTab) || PAYMENT_CHANNELS[0];

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white ${isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50/50 text-neutral-900'}`}>
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b shadow-2xs ${isDarkMode ? 'bg-neutral-900/85 border-neutral-800' : 'bg-white/95 border-neutral-200/80'}`}>
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className={`font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
            TAMBAYAN<span className="text-emerald-500">.</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className={`font-mono text-xs font-bold uppercase tracking-widest transition-colors ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              ← Back to Feed
            </Link>

            <button
              onClick={toggleDarkMode}
              aria-label="Toggle Dark Mode"
              className={`p-2 rounded-xl border cursor-pointer ${
                isDarkMode 
                  ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' 
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-14 sm:py-20 w-full flex-1 flex flex-col items-center text-center">
        <div className="mb-8">
          <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest rounded-full mb-4 border shadow-2xs ${
            isDarkMode 
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/80' 
              : 'bg-emerald-100/80 text-emerald-800 border-emerald-200/60'
          }`}>
            <Icons.Coffee />
            <span>Keep The Servers Running</span>
          </div>
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
            Support This Project
          </h1>
          <p className={`text-sm sm:text-base leading-relaxed font-mono max-w-md mx-auto ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
            I’m just a solo developer building and maintaining Tambayan Eselyu for Louisians. If you want to help me cover server and domain costs to keep this website running, any support is deeply appreciated!
          </p>
        </div>

        {/* Channel Selector Tabs */}
        <div className="flex items-center justify-center gap-2 mb-6 w-full">
          {PAYMENT_CHANNELS.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedTab(channel.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                selectedTab === channel.id
                  ? channel.activeColor
                  : isDarkMode
                    ? `${channel.darkModeColor} border-neutral-800`
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              {channel.name}
            </button>
          ))}
        </div>

        {/* QR Code Card Container */}
        <div className={`w-full p-6 sm:p-8 rounded-2xl border shadow-sm flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95 duration-200 ${
          isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200/80'
        }`}>
          <div className={`w-52 h-52 sm:w-60 sm:h-60 rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden group ${
            isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-300'
          }`}>
            <img src={activeChannel.qrImage} alt={`${activeChannel.name} QR Code`} className="object-contain w-full h-full p-2" />
          </div>

          <div className={`w-full pt-4 border-t font-mono text-xs ${isDarkMode ? 'border-neutral-800 text-neutral-400' : 'border-neutral-100 text-neutral-600'}`}>
            <div className={`flex justify-between items-center px-4 py-3 rounded-xl border ${
              isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200/60'
            }`}>
              <span className={isDarkMode ? 'text-neutral-500' : 'text-neutral-500'}>Account Name:</span>
              <span className={`font-bold ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>{activeChannel.accountName}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer ${
              isDarkMode 
                ? 'bg-neutral-100 text-neutral-950 hover:bg-white' 
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            <span>Return to Freedom Wall</span>
          </Link>
        </div>
      </main>
    </div>
  );
}