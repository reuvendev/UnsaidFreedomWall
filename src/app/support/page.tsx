'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const Icons = {
  Coffee: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>,
};

const PAYMENT_CHANNELS = [
  {
    id: 'gcash',
    name: 'GCash',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    activeColor: 'bg-blue-600 text-white shadow-sm',
    accountName: 'Re***n J',
    qrImage: '/images/gcash-qr.jpg',
  },
  {
    id: 'maya',
    name: 'Maya',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    activeColor: 'bg-emerald-600 text-white shadow-sm',
    accountName: 'Re***n J',
    qrImage: '/images/maya-qr.jpg',
  },
  {
    id: 'gotyme',
    name: 'GoTyme',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
    activeColor: 'bg-cyan-600 text-white shadow-sm',
    accountName: 'Re***n J',
    qrImage: '/images/gotyme-qr.jpg', 
  },
];

export default function SupportPage() {
  const [selectedTab, setSelectedTab] = useState<string>('gcash');

  const activeChannel = PAYMENT_CHANNELS.find((c) => c.id === selectedTab) || PAYMENT_CHANNELS[0];

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-2xs">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            TAMBAYAN<span className="text-emerald-600">.</span>
          </Link>
          <Link 
            href="/" 
            className="font-mono text-xs font-bold text-neutral-500 hover:text-neutral-900 uppercase tracking-widest transition-colors"
          >
            ← Back to Feed
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-14 sm:py-20 w-full flex-1 flex flex-col items-center text-center">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100/80 text-emerald-800 font-mono text-[11px] font-bold uppercase tracking-widest rounded-full mb-4 border border-emerald-200/60 shadow-2xs">
            <Icons.Coffee />
            <span>Keep The Servers Running</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 mb-3">
            Support This Project
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-mono max-w-md mx-auto">
            I’m just a solo developer building and maintaining Tambayan Eselyu for Louisians. If you want to help me cover server and domain costs to keep this website running, any support is deeply appreciated!
          </p>
        </div>

        {/* Channel Selector Tabs */}
        <div className="flex items-center justify-center gap-2 mb-6 w-full">
          {PAYMENT_CHANNELS.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedTab(channel.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border transition-all ${
                selectedTab === channel.id
                  ? channel.activeColor
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              {channel.name}
            </button>
          ))}
        </div>

        {/* QR Code Card Container */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-52 h-52 sm:w-60 sm:h-60 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-300 flex items-center justify-center relative overflow-hidden group">
            <img src={activeChannel.qrImage} alt={`${activeChannel.name} QR Code`} className="object-contain w-full h-full p-2" />
          </div>

          <div className="w-full pt-4 border-t border-neutral-100 font-mono text-xs text-neutral-600">
            <div className="flex justify-between items-center bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200/60">
              <span className="text-neutral-500">Account Name:</span>
              <span className="font-bold text-neutral-800">{activeChannel.accountName}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
          >
            <span>Return to Freedom Wall</span>
          </Link>
        </div>
      </main>

    </div>
  );
}