'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  runTransaction,
} from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { db } from '@/lib/firebase';
import { censorText } from '@/lib/moderation';
import { getPresignedUploadUrl } from '@/app/actions/r2-upload';

const CATEGORIES = [
  { id: 'thoughts', label: 'Thoughts' },
  { id: 'love', label: 'Love & Connections' },
  { id: 'rants', label: 'Rants' },
  { id: 'advice', label: 'Advice' },
  { id: 'others', label: 'Others' },
];

const Icons = {
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Music: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41-1.41"/></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
};

// Anonymous user ID shared with the chat system
const STREAK_USER_KEY = 'unsaid_chat_user_id';

function getAnonymousUserId(): string {
  let userId = localStorage.getItem(STREAK_USER_KEY);

  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem(STREAK_USER_KEY, userId);
  }

  return userId;
}

// Get today's date using Philippine time
function getPhilippineDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Get yesterday from YYYY-MM-DD
function getYesterday(date: string): string {
  const [year, month, day] = date.split('-').map(Number);

  const yesterday = new Date(
    Date.UTC(year, month - 1, day - 1)
  );

  return yesterday.toISOString().split('T')[0];
}

// Update user's daily streak
async function updateUserStreak(userId: string) {
  const userRef = doc(db, 'users', userId);
  const today = getPhilippineDate();

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    // First-ever activity
    if (!userSnapshot.exists()) {
      transaction.set(userRef, {
        streak: {
          current: 1,
          longest: 1,
          lastActiveDate: today,
        },
      });

      return;
    }

    const userData = userSnapshot.data();
    const existingStreak = userData.streak;

    // User document exists but streak does not
    if (!existingStreak) {
      transaction.update(userRef, {
        streak: {
          current: 1,
          longest: 1,
          lastActiveDate: today,
        },
      });

      return;
    }

    // Already active today
    if (existingStreak.lastActiveDate === today) {
      return;
    }

    const yesterday = getYesterday(today);

    let newCurrent = 1;

    // Active yesterday, continue streak
    if (existingStreak.lastActiveDate === yesterday) {
      newCurrent = (existingStreak.current || 0) + 1;
    }

    const newLongest = Math.max(
      existingStreak.longest || 0,
      newCurrent
    );

    transaction.update(userRef, {
      'streak.current': newCurrent,
      'streak.longest': newLongest,
      'streak.lastActiveDate': today,
    });
  });
}

// Component to handle third-party ad banner injection safely with a labeled header
function BannerAd({ isDarkMode }: { isDarkMode: boolean }) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bannerRef.current) return;
    
    // Clear container to avoid duplicate scripts on re-renders
    bannerRef.current.innerHTML = '';

    // Create configuration script
    const confScript = document.createElement('script');
    confScript.text = `
      atOptions = {
        'key' : '2c7e18080e4e82b954dd29fff1dc3355',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;

    // Create invocation script
    const invokeScript = document.createElement('script');
    invokeScript.src = 'https://plentyhelium.com/2c7e18080e4e82b954dd29fff1dc3355/invoke.js';
    invokeScript.async = true;

    bannerRef.current.appendChild(confScript);
    bannerRef.current.appendChild(invokeScript);
  }, []);

  return (
    <div className="my-4 w-full flex flex-col items-center">
      <div className={`font-mono text-[9px] uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
        Advertisement
      </div>
      <div className="overflow-hidden w-full flex justify-center">
        <div ref={bannerRef} className="min-w-[320px] min-h-[50px] flex items-center justify-center" />
      </div>
    </div>
  );
}

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
  const [successMessage, setSuccessMessage] = useState(false);

  // Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Spotify integration state
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [spotifyTrackId, setSpotifyTrackId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInputError, setModalInputError] = useState('');

  // Image Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Initialize Dark Mode state from localStorage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');

      if (storedTheme) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
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
      localStorage.setItem(
        'unsaid_dark_mode',
        JSON.stringify(nextMode)
      );
    } catch (e) {}
  };

  const generateAlias = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `Louisian #${randomNum}`;
  };

  // Helper to extract Spotify Track ID from normal URLs or URI strings
  const extractSpotifyId = (url: string) => {
    const cleanUrl = url.trim();

    const match = cleanUrl.match(
      /(?:track\/|spotify:track:)([a-zA-Z0-9]{22})/
    );

    return match ? match[1] : null;
  };

  const handleSaveSpotifyTrack = (e: React.FormEvent) => {
    e.preventDefault();

    setModalInputError('');

    const trackId = extractSpotifyId(spotifyUrl);

    if (!trackId) {
      setModalInputError(
        'Invalid Spotify track link. Please copy a valid song link from Spotify.'
      );

      return;
    }

    setSpotifyTrackId(trackId);
    setIsModalOpen(false);
    setSpotifyUrl('');
  };

  const handleRemoveSpotifyTrack = () => {
    setSpotifyTrackId('');
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      setError(
        `Post blocked for privacy safety: ${doxxCheck.matchedPatterns.join(', ')}. Please remove personal info.`
      );

      return;
    }

    setLoading(true);
    setError('');

    try {
      let imageUrl: string | null = null;

      // Process and upload photo if attached
      if (imageFile) {
        // 1. Compress image in browser before uploading
        const compressionOptions = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp',
        };

        const compressedBlob = await imageCompression(
          imageFile,
          compressionOptions
        );

        const compressedFile = new File(
          [compressedBlob],
          imageFile.name.replace(/\.[^/.]+$/, '') + '.webp',
          { type: compressedBlob.type }
        );

        // 2. Request presigned upload URL from Cloudflare R2
        const urlRes = await getPresignedUploadUrl(
          compressedFile.name,
          compressedFile.type
        );

        if (
          !urlRes.success ||
          !urlRes.signedUrl ||
          !urlRes.publicUrl
        ) {
          setError(
            urlRes.error || 'Failed to authorize image upload.'
          );

          setLoading(false);
          return;
        }

        // 3. Upload directly to Cloudflare R2 bucket
        const uploadRes = await fetch(urlRes.signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': compressedFile.type,
          },
          body: compressedFile,
        });

        if (!uploadRes.ok) {
          throw new Error(
            'Failed to upload image to Cloudflare R2.'
          );
        }

        imageUrl = urlRes.publicUrl;
      }

      const authorAlias = generateAlias();

      // Apply automatic censorship to English and Tagalog bad words
      const sanitizedContent = censorText(content.trim());

      const postData: any = {
        content: sanitizedContent,
        category,
        authorAlias,
        upvotes: 0,
        replies: 0,
        createdAt: serverTimestamp(),
        status: 'pending',
      };

      if (spotifyTrackId) {
        postData.spotifyTrackId = spotifyTrackId;
      }

      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      // Create post
      await addDoc(collection(db, 'posts'), postData);

      // Get the same anonymous ID used by the chat system
      const userId = getAnonymousUserId();

      // Update daily streak after successful post creation
      try {
        await updateUserStreak(userId);
      } catch (streakError) {
        // Do not fail the post if streak update fails
        console.error(
          'Error updating streak:',
          streakError
        );
      }

      setSuccessMessage(true);

      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err) {
      console.error('Error creating post:', err);

      setError(
        'Failed to submit entry. Please check your connection.'
      );

      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen font-sans selection:bg-neutral-900 selection:text-white relative ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-white text-neutral-900'
      }`}
    >
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${
          isDarkMode
            ? 'bg-neutral-900/85 border-neutral-800'
            : 'bg-white/85 border-neutral-200'
        }`}
      >
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 font-mono text-xs font-bold transition-colors uppercase tracking-wider ${
              isDarkMode
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Icons.ArrowLeft />
            <span>Back to Feed</span>
          </Link>

          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-xs font-bold uppercase tracking-widest ${
                isDarkMode
                  ? 'text-neutral-500'
                  : 'text-neutral-400'
              }`}
            >
              New Entry
            </span>

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

      <main className="max-w-2xl mx-auto px-6 pt-8 pb-24">
        {/* Labeled Ad Banner
        <BannerAd isDarkMode={isDarkMode} /> */}

        <div className="mb-8 mt-4">
          <h1
            className={`text-3xl font-extrabold tracking-tight mb-3 ${
              isDarkMode
                ? 'text-white'
                : 'text-neutral-900'
            }`}
          >
            Publish Anonymously.
          </h1>

          <p
            className={`text-sm leading-relaxed ${
              isDarkMode
                ? 'text-neutral-400'
                : 'text-neutral-600'
            }`}
          >
            Your identity is completely protected. All entries
            are manually reviewed by moderators before being
            published to the feed.
          </p>
        </div>

        {error && (
          <div
            className={`mb-6 p-4 border rounded-lg text-xs font-mono ${
              isDarkMode
                ? 'bg-rose-950/40 border-rose-900/50 text-rose-400'
                : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            className={`mb-6 p-4 border rounded-lg text-xs font-mono ${
              isDarkMode
                ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            Entry submitted successfully! It is now pending
            manual review and will appear on the feed once
            approved. Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label
              className={`block font-mono text-xs font-bold uppercase tracking-wider mb-3 ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
              }`}
            >
              Select Category
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider rounded border text-left transition-all cursor-pointer ${
                    category === cat.id
                      ? isDarkMode
                        ? 'bg-neutral-100 text-neutral-950 border-neutral-100 shadow-xs'
                        : 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                      : isDarkMode
                        ? 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="content"
              className={`block font-mono text-xs font-bold uppercase tracking-wider mb-3 ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
              }`}
            >
              Your Message or Story
            </label>

            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? Share your thoughts, rants, or stories..."
              className={`w-full p-4 border rounded-lg text-base transition-all resize-none font-sans leading-relaxed focus:outline-none ${
                isDarkMode
                  ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-100 focus:bg-neutral-950'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white'
              }`}
            />
          </div>

          {/* Optional Attachments Section */}
          <div className="space-y-6">

            {/* Photo Attachment */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className={`block font-mono text-xs font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? 'text-neutral-400'
                      : 'text-neutral-500'
                  }`}
                >
                  Photo Attachment{' '}
                  <span
                    className={`font-normal ${
                      isDarkMode
                        ? 'text-neutral-600'
                        : 'text-neutral-400'
                    }`}
                  >
                    (Optional)
                  </span>
                </label>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              {!imagePreview ? (
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg font-mono text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}
                >
                  <Icons.Image />
                  <span>Attach Image</span>
                </button>
              ) : (
                <div
                  className={`p-3 border rounded-lg space-y-3 ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-800'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider ${
                        isDarkMode
                          ? 'text-neutral-500'
                          : 'text-neutral-400'
                      }`}
                    >
                      Attached Photo Preview
                    </span>

                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className={`inline-flex items-center gap-1 text-xs font-mono transition-colors cursor-pointer ${
                        isDarkMode
                          ? 'text-rose-400 hover:text-rose-300'
                          : 'text-rose-500 hover:text-rose-700'
                      }`}
                    >
                      <Icons.Trash />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="relative max-h-64 overflow-hidden rounded-md border border-neutral-800/50 flex items-center justify-center bg-black/20">
                    <img
                      src={imagePreview}
                      alt="Upload preview"
                      className="max-h-64 w-auto object-contain rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Optional Music Attachment Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className={`block font-mono text-xs font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? 'text-neutral-400'
                      : 'text-neutral-500'
                  }`}
                >
                  Soundtrack{' '}
                  <span
                    className={`font-normal ${
                      isDarkMode
                        ? 'text-neutral-600'
                        : 'text-neutral-400'
                    }`}
                  >
                    (Optional)
                  </span>
                </label>
              </div>

              {!spotifyTrackId ? (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg font-mono text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}
                >
                  <Icons.Music />
                  <span>Add Spotify Track</span>
                </button>
              ) : (
                <div
                  className={`p-3 border rounded-lg space-y-3 ${
                    isDarkMode
                      ? 'bg-neutral-900 border-neutral-800'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider ${
                        isDarkMode
                          ? 'text-neutral-500'
                          : 'text-neutral-400'
                      }`}
                    >
                      Attached Spotify Player Preview
                    </span>

                    <button
                      type="button"
                      onClick={handleRemoveSpotifyTrack}
                      className={`inline-flex items-center gap-1 text-xs font-mono transition-colors cursor-pointer ${
                        isDarkMode
                          ? 'text-rose-400 hover:text-rose-300'
                          : 'text-rose-500 hover:text-rose-700'
                      }`}
                    >
                      <Icons.Trash />
                      <span>Remove</span>
                    </button>
                  </div>

                  <iframe
                    src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=${isDarkMode ? '1' : '0'}`}
                    width="100%"
                    height="80"
                    frameBorder="0"
                    allow="encrypted-media"
                    className="rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          <div
            className={`pt-4 border-t space-y-4 ${
              isDarkMode
                ? 'border-neutral-800'
                : 'border-neutral-200'
            }`}
          >
            <p
              className={`text-[11px] leading-relaxed ${
                isDarkMode
                  ? 'text-neutral-500'
                  : 'text-neutral-400'
              }`}
            >
              By submitting an entry, you agree to our{' '}
              <Link
                href="/guidelines"
                className={`underline transition-colors font-medium ${
                  isDarkMode
                    ? 'hover:text-white'
                    : 'hover:text-neutral-900'
                }`}
              >
                Community Guidelines
              </Link>{' '}
              and safety standards. All entries undergo manual
              review before publication.
            </p>

            <div className="flex items-center justify-end gap-4">
              <Link
                href="/"
                className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                  isDarkMode
                    ? 'text-neutral-500 hover:text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={loading || successMessage}
                className={`inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded transition-all active:scale-95 shadow-sm cursor-pointer ${
                  isDarkMode
                    ? 'bg-neutral-100 text-neutral-950 hover:bg-white'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                } ${
                  loading || successMessage
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <Icons.Send />

                <span>
                  {loading
                    ? 'Submitting...'
                    : successMessage
                      ? 'Submitted!'
                      : 'Submit for Review'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Spotify URL Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`border rounded-xl max-w-md w-full p-6 shadow-xl animate-fadeIn ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800 text-white'
                : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider ${
                  isDarkMode
                    ? 'text-white'
                    : 'text-neutral-900'
                }`}
              >
                <Icons.Music />
                <span>Attach Spotify Song</span>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Icons.X />
              </button>
            </div>

            <p
              className={`text-xs mb-4 leading-relaxed ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
              }`}
            >
              Open Spotify, go to the track you want, click{' '}
              <strong
                className={
                  isDarkMode
                    ? 'text-white'
                    : 'text-neutral-800'
                }
              >
                Share
              </strong>
              , and choose{' '}
              <strong
                className={
                  isDarkMode
                    ? 'text-white'
                    : 'text-neutral-800'
                }
              >
                Copy Song Link
              </strong>
              . Paste it below.
            </p>

            <form
              onSubmit={handleSaveSpotifyTrack}
              className="space-y-4"
            >
              <div>
                <input
                  type="text"
                  value={spotifyUrl}
                  onChange={(e) => {
                    setSpotifyUrl(e.target.value);

                    if (modalInputError) {
                      setModalInputError('');
                    }
                  }}
                  placeholder="https://open.spotify.com/track/..."
                  className={`w-full p-3 border rounded-lg text-xs font-mono transition-all focus:outline-none ${
                    isDarkMode
                      ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-100'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white'
                  }`}
                  autoFocus
                />

                {modalInputError && (
                  <p
                    className={`mt-2 text-[11px] font-mono ${
                      isDarkMode
                        ? 'text-rose-400'
                        : 'text-rose-600'
                    }`}
                  >
                    {modalInputError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 font-mono text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded transition-all shadow-sm cursor-pointer ${
                    isDarkMode
                      ? 'bg-neutral-100 text-neutral-950 hover:bg-white'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
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