'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CATEGORIES = [
  { id: 'thoughts', label: 'Thoughts' },
  { id: 'love', label: 'Love & Connections' },
  { id: 'rants', label: 'Rants' },
  { id: 'life', label: 'City Life' },
  { id: 'advice', label: 'advice' },
  { id: 'others', label: 'Others' },
];

const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Music: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
};

// Robust Doxxing Detection Utility
const PHONE_REGEX = /(?:(?:\+|00)?63[\s.-]?|0)?[1-9]\d{1,2}[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{10,11}\b|(\d[^\w\d]*){10,12}/i;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const SOCIAL_REGEX = /(?:facebook\.com|fb\.com|instagram\.com|ig\.me|t\.me|twitter\.com|x\.com)(?:[\s\S]*?\/|\s+[a-zA-Z0-9._-]+)/i;
const SPECIFIC_ADDRESS_PATTERNS = /(house|lot|unit|street|st\.|purok|barangay|bgy\.)\s+[0-9a-zA-Z\s,]+/i;

function checkForDoxxing(content: string) {
  const matches: string[] = [];

  if (PHONE_REGEX.test(content)) {
    matches.push("Phone number detected");
  }
  if (EMAIL_REGEX.test(content)) {
    matches.push("Email address detected");
  }
  if (SOCIAL_REGEX.test(content)) {
    matches.push("Social media link detected");
  }
  if (SPECIFIC_ADDRESS_PATTERNS.test(content)) {
    matches.push("Specific residential address detected");
  }

  return {
    hasPotentialDoxx: matches.length > 0,
    matchedPatterns: matches,
  };
}

export default function PostPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('thoughts');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Spotify integration state
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [spotifyTrackId, setSpotifyTrackId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInputError, setModalInputError] = useState('');

  const generateAlias = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `UNSAID #${randomNum}`;
  };

  // Helper to extract Spotify Track ID from normal URLs or URI strings
  const extractSpotifyId = (url: string) => {
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/(?:track\/|spotify:track:)([a-zA-Z0-9]{22})/);
    return match ? match[1] : null;
  };

  const handleSaveSpotifyTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setModalInputError('');

    const trackId = extractSpotifyId(spotifyUrl);
    if (!trackId) {
      setModalInputError('Invalid Spotify track link. Please copy a valid song link from Spotify.');
      return;
    }

    setSpotifyTrackId(trackId);
    setIsModalOpen(false);
    setSpotifyUrl('');
  };

  const handleRemoveSpotifyTrack = () => {
    setSpotifyTrackId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Please write something before publishing.');
      return;
    }

    // Check for sensitive personal info (doxxing)
    const doxxCheck = checkForDoxxing(content);
    if (doxxCheck.hasPotentialDoxx) {
      setError(`Post blocked for privacy safety: ${doxxCheck.matchedPatterns.join(', ')}. Please remove personal info.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const authorAlias = generateAlias();
      
      const postData: any = {
        content: content.trim(),
        category,
        authorAlias,
        upvotes: 0,
        replies: 0,
        createdAt: serverTimestamp(),
      };

      if (spotifyTrackId) {
        postData.spotifyTrackId = spotifyTrackId;
      }

      await addDoc(collection(db, 'posts'), postData);

      router.push('/');
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to publish entry. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white relative">
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors uppercase tracking-wider">
            <Icons.ArrowLeft />
            <span>Back to Feed</span>
          </Link>
          <span className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest">New Entry</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-neutral-900">
            Publish Anonymously.
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Your identity is completely protected. A random secure alias tag will be generated for your entry.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block font-mono text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
              Select Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider rounded border text-left transition-all ${
                    category === cat.id
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="content" className="block font-mono text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
              Your Message or Story
            </label>
            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? Share your thoughts, rants, or stories..."
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Optional Music Attachment Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block font-mono text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Soundtrack <span className="text-neutral-300 font-normal">(Optional)</span>
              </label>
            </div>

            {!spotifyTrackId ? (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg font-mono text-xs font-semibold text-neutral-700 transition-colors"
              >
                <Icons.Music />
                <span>Add Spotify Track</span>
              </button>
            ) : (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Attached Spotify Player Preview</span>
                  <button
                    type="button"
                    onClick={handleRemoveSpotifyTrack}
                    className="inline-flex items-center gap-1 text-xs font-mono text-rose-500 hover:text-rose-700 transition-colors"
                  >
                    <Icons.Trash />
                    <span>Remove</span>
                  </button>
                </div>
                <iframe
                  src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="encrypted-media"
                  className="rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-neutral-200">
            <Link
              href="/"
              className="px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-2 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded hover:bg-neutral-800 transition-all active:scale-95 shadow-sm ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Icons.Send />
              <span>{loading ? 'Publishing...' : 'Publish Entry'}</span>
            </button>
          </div>
        </form>
      </main>

      {/* Spotify URL Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl max-w-md w-full p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-neutral-900 uppercase tracking-wider">
                <Icons.Music />
                <span>Attach Spotify Song</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              Open Spotify, go to the track you want, click <strong className="text-neutral-800">Share</strong>, and choose <strong className="text-neutral-800">Copy Song Link</strong>. Paste it below.
            </p>

            <form onSubmit={handleSaveSpotifyTrack} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={spotifyUrl}
                  onChange={(e) => {
                    setSpotifyUrl(e.target.value);
                    if (modalInputError) setModalInputError('');
                  }}
                  placeholder="https://open.spotify.com/track/..."
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
                  autoFocus
                />
                {modalInputError && (
                  <p className="mt-2 text-[11px] font-mono text-rose-600">{modalInputError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-mono text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition-all shadow-sm"
                >
                  Attach Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}