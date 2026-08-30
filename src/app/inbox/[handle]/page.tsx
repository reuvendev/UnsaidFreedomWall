'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { censorText } from '@/lib/moderation';

export default function PublicInboxPage() {
  const params = useParams();
  const handle = params.handle as string;

  const [inboxExists, setInboxExists] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [spotifyTrackId, setSpotifyTrackId] = useState('');
  const [showSpotifyInput, setShowSpotifyInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkInbox() {
      if (!handle) return;
      const snap = await getDoc(doc(db, 'inboxes', handle));
      setInboxExists(snap.exists());
    }
    checkInbox();
  }, [handle]);

  const extractSpotifyId = (url: string) => {
    const match = url.trim().match(/(?:track\/|spotify:track:)([a-zA-Z0-9]{22})/);
    return match ? match[1] : null;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError('');

    try {
      const sanitized = censorText(message.trim());

      await addDoc(collection(db, 'inboxes', handle, 'messages'), {
        content: sanitized,
        spotifyTrackId: spotifyTrackId || null,
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      setMessage('');
      setSpotifyTrackId('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send anonymous message.');
    } finally {
      setLoading(false);
    }
  };

  if (inboxExists === false) {
    return (
      <div className="min-h-screen bg-white text-neutral-900 font-sans flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full p-8 border border-neutral-200 rounded-2xl bg-neutral-50/50 space-y-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-neutral-200/60 text-neutral-600 rounded-full">
            404 Error
          </span>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Inbox Not Found</h1>
          <p className="text-xs font-mono text-neutral-500">
            The secret inbox <code className="text-neutral-900 font-bold">@{handle}</code> does not exist or has been removed.
          </p>
          <div className="pt-2">
            <Link 
              href="/inbox/create" 
              className="inline-block w-full py-3 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-800 transition-all"
            >
              Claim this handle
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-tighter text-neutral-900">
          <span>UNSAID.</span>
          <span className="text-neutral-300">•</span>
          <span className="text-neutral-500 font-normal">@{handle}</span>
        </div>
        <Link 
          href="/inbox/create" 
          className="font-mono text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 uppercase tracking-wider transition-colors"
        >
          Create Yours +
        </Link>
      </header>

      {/* Main Form Container */}
      <main className="max-w-xl mx-auto px-6 py-16 w-full flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Secret Drop Inbox
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-4 mb-2 text-neutral-900">
            Leave an anonymous note.
          </h1>
          <p className="text-xs font-mono text-neutral-500">
            Your identity is completely encrypted and hidden from <span className="text-neutral-900 font-bold">@{handle}</span>.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            {/* Success Card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto font-bold text-lg">✓</div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">Successfully Delivered</h2>
              <p className="text-xs font-mono text-neutral-600 max-w-xs mx-auto">
                Your confidential message has safely reached <span className="text-neutral-900 font-bold">@{handle}</span>'s archive.
              </p>
              
              <div className="pt-2">
                <button
                  onClick={() => setSuccess(false)}
                  className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95"
                >
                  Send Another Note
                </button>
              </div>
            </div>

            {/* Create Your Own Inbox Card */}
            <div className="bg-white border-2 border-neutral-900 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-neutral-900 text-white font-mono text-[10px] font-bold uppercase px-3 py-1 rounded-bl-xl tracking-widest">
                Feature
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                  Want your own inbox?
                </span>
                <h3 className="font-bold text-base text-neutral-900">Get anonymous messages like this!</h3>
                <p className="text-xs text-neutral-500 font-mono mt-1">
                  Claim your custom link and share it on Instagram, Twitter, or TikTok to collect secrets.
                </p>
              </div>

              <Link
                href="/inbox/create"
                className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <span>Create Your Own Inbox +</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-6">
            <div className="space-y-2">
              <label className="block font-mono text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Message Content
              </label>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Drop a confession, constructive critique, or an anonymous thought..."
                className="w-full p-4 bg-neutral-50/50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-all resize-none placeholder:text-neutral-400"
                required
              />
            </div>

            {/* Optional Spotify track section */}
            <div className="p-4 bg-neutral-50/50 border border-neutral-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Spotify Track <span className="text-neutral-400 font-normal lowercase">(Optional)</span>
                </span>
                {!showSpotifyInput && (
                  <button
                    type="button"
                    onClick={() => setShowSpotifyInput(true)}
                    className="font-mono text-xs text-neutral-900 font-semibold hover:underline"
                  >
                    + Attach Song
                  </button>
                )}
              </div>

              {showSpotifyInput && (
                <div className="space-y-3 pt-1">
                  <input
                    type="text"
                    placeholder="Paste Spotify track URL here..."
                    onChange={(e) => setSpotifyTrackId(extractSpotifyId(e.target.value) || '')}
                    className="w-full p-3 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:border-neutral-900"
                  />
                  {spotifyTrackId && (
                    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                      <iframe
                        src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
                        width="100%"
                        height="80"
                        frameBorder="0"
                        allow="encrypted-media"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Encrypting & Sending...' : 'Send Secret Message 🤫'}
            </button>
          </form>
        )}
      </main>

    </div>
  );
}