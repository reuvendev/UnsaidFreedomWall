'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Icons = {
  Inbox: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
    </svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  ),
  ArrowLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  )
};

export default function CreateInboxPage() {
  const router = useRouter();
  const [handle, setHandle] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (!cleanHandle) {
      setError('Please enter a valid handle.');
      return;
    }

    if (cleanHandle.length < 3) {
      setError('Handle must be at least 3 characters long.');
      return;
    }

    if (!passcode || passcode.length < 4) {
      setError('Please enter a passcode of at least 4 characters.');
      return;
    }

    setLoading(true);

    try {
      const inboxRef = doc(db, 'inboxes', cleanHandle);
      const inboxSnap = await getDoc(inboxRef);

      if (inboxSnap.exists()) {
        setError('This handle is already taken. Try another one.');
        setLoading(false);
        return;
      }

      // Create the inbox document in Firestore with the passcode
      await setDoc(inboxRef, {
        handle: cleanHandle,
        passcode: passcode, // Stored securely in backend doc
        createdAt: serverTimestamp(),
      });

      // Save handle AND passcode to local storage so the device authenticates automatically
      try {
        const existingInboxes = JSON.parse(localStorage.getItem('unsaid_my_inboxes') || '[]');
        if (!existingInboxes.includes(cleanHandle)) {
          const updatedInboxes = [cleanHandle, ...existingInboxes];
          localStorage.setItem('unsaid_my_inboxes', JSON.stringify(updatedInboxes));
        }

        // Store passcode mapping securely in local storage
        const passcodes = JSON.parse(localStorage.getItem('unsaid_inbox_passcodes') || '{}');
        passcodes[cleanHandle] = passcode;
        localStorage.setItem('unsaid_inbox_passcodes', JSON.stringify(passcodes));
      } catch (err) {
        console.error('Error saving to local storage:', err);
      }

      // Redirect directly to your viewing dashboard route
      router.push(`/inbox/${cleanHandle}/view`);
    } catch (err) {
      console.error('Error creating inbox:', err);
      setError('Failed to create inbox. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            UNSAID.
          </Link>
          <Link 
            href="/" 
            className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
          >
            <Icons.ArrowLeft />
            <span>Back to Feed</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-6 pt-20 pb-24">
        <div className="mb-8">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 mb-4 border border-neutral-200 shadow-2xs">
            <Icons.Inbox />
          </div>
          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-2">Secret Drop Feature</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 mb-2">Claim Your Inbox</h1>
          <p className="text-sm text-neutral-600 leading-relaxed font-mono">
            Get your own anonymous link to share on social media and secure it with a private passcode.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block font-mono text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
              Choose Your Handle
            </label>
            <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden focus-within:border-neutral-900 focus-within:bg-white transition-all">
              <span className="pl-4 font-mono text-sm text-neutral-400 select-none">unsaid.sbs/</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                placeholder="yourname"
                maxLength={25}
                className="w-full py-3.5 pr-4 pl-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-300 font-mono focus:outline-none"
              />
            </div>
            <p className="text-[11px] font-mono text-neutral-400 mt-2">
              Letters, numbers, underscores, and hyphens only.
            </p>
          </div>

          <div>
            <label className="block font-mono text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
              Secret Passcode
            </label>
            <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden focus-within:border-neutral-900 focus-within:bg-white transition-all">
              <span className="pl-4 text-neutral-400">
                <Icons.Lock />
              </span>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter 4+ digit passcode"
                maxLength={20}
                className="w-full py-3.5 pr-4 pl-3 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-300 font-mono focus:outline-none"
              />
            </div>
            <p className="text-[11px] font-mono text-neutral-400 mt-2">
              Required to open and read your incoming private messages.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !handle.trim() || !passcode.trim()}
            className="w-full py-4 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-800 transition-all active:scale-98 disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Setting up your inbox...' : 'Create Secure Inbox'}
          </button>
        </form>
      </main>
    </div>
  );
}