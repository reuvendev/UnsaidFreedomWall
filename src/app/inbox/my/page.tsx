'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MyInboxesPage() {
  const [savedInboxes, setSavedInboxes] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('unsaid_my_inboxes');
      if (stored) {
        setSavedInboxes(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const removeInbox = (handleToRemove: string) => {
    try {
      const updated = savedInboxes.filter(h => h !== handleToRemove);
      setSavedInboxes(updated);
      localStorage.setItem('unsaid_my_inboxes', JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            UNSAID.
          </Link>
          <Link href="/" className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors">
            ← Back to Feed
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-8">
          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-2">Device Storage</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 mb-2">Your Secret Inboxes</h1>
          <p className="text-sm text-neutral-600 font-mono">
            Manage and check messages for the secret inboxes you've created on this browser.
          </p>
        </div>

        {savedInboxes.length === 0 ? (
          <div className="p-12 border border-dashed border-neutral-300 rounded-xl text-center space-y-4 bg-neutral-50/50">
            <p className="text-sm font-mono text-neutral-500">No secret inboxes found on this browser yet.</p>
            <Link
              href="/inbox/create"
              className="inline-block px-6 py-3 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition-colors shadow-sm"
            >
              Create Your First Inbox
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {savedInboxes.map((handle) => (
              <div key={handle} className="p-4 border border-neutral-200 rounded-lg flex items-center justify-between bg-neutral-50 hover:border-neutral-300 transition-all">
                <div>
                  <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest block mb-0.5">Handle</span>
                  <span className="font-mono text-sm font-bold text-neutral-900">@{handle}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Links directly to your existing view page */}
                  <Link
                    href={`/inbox/${handle}/view`}
                    className="px-4 py-2 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition-colors shadow-2xs"
                  >
                    View Messages →
                  </Link>
                  <button
                    onClick={() => removeInbox(handle)}
                    title="Remove from device list"
                    className="p-2 text-neutral-400 hover:text-rose-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}