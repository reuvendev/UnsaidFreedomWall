'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AppealPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [appealMessage, setAppealMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const storedTheme =
        localStorage.getItem('unsaid_dark_mode');

      const storedUserId =
        localStorage.getItem('unsaid_chat_user_id');

      setUserId(storedUserId);

      if (storedTheme !== null) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (
        window.matchMedia &&
        window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches
      ) {
        setIsDarkMode(true);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!userId) {
      setError(
        'No anonymous user ID was found in this browser.'
      );
      return;
    }

    const message = appealMessage.trim();

    if (message.length < 20) {
      setError(
        'Please provide a little more information about your appeal.'
      );
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'appeals'), {
        userId,
        message,

        status: 'pending',

        createdAt: serverTimestamp(),
        reviewedAt: null,
        moderatorNote: null,
      });

      setAppealMessage('');
      setSubmitted(true);
    } catch (error) {
      console.error(
        'Failed to submit appeal:',
        error
      );

      setError(
        'Unable to submit your appeal. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      {/* HEADER */}
      <header
        className={`border-b ${
          isDarkMode
            ? 'border-neutral-800 bg-neutral-900/95'
            : 'border-neutral-200 bg-white/95'
        }`}
      >
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-xl font-black tracking-tighter"
          >
            TAMBAYAN
            <span className="text-emerald-600">
              .
            </span>
          </Link>

          <Link
            href="/"
            className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
              isDarkMode
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Back Home
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-16">
        {/* INTRO */}
        <div className="mb-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Moderation Appeal
          </p>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Appeal a restriction
          </h1>

          <p
            className={`text-sm leading-relaxed ${
              isDarkMode
                ? 'text-neutral-400'
                : 'text-neutral-600'
            }`}
          >
            If your access to Tambayan has been
            restricted and you believe the decision
            should be reviewed, you may submit an
            appeal.
          </p>
        </div>

        {submitted ? (
          /* SUCCESS */
          <div
            className={`rounded-2xl border p-7 ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-white border-neutral-200'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-5 font-bold">
              ✓
            </div>

            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">
              Appeal Submitted
            </p>

            <h2 className="text-xl font-bold mb-3">
              Your appeal has been received.
            </h2>

            <p
              className={`text-sm leading-relaxed ${
                isDarkMode
                  ? 'text-neutral-400'
                  : 'text-neutral-600'
              }`}
            >
              A moderator can review your appeal.
              Submitting an appeal does not guarantee
              that a restriction will be removed.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex font-mono text-xs font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
            >
              Return Home →
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={`rounded-2xl border p-6 sm:p-8 ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-white border-neutral-200'
            }`}
          >
            {/* USER ID */}
            <div className="mb-6">
              <label
                className={`block font-mono text-[11px] font-bold uppercase tracking-wider mb-2 ${
                  isDarkMode
                    ? 'text-neutral-300'
                    : 'text-neutral-700'
                }`}
              >
                Anonymous User ID
              </label>

              {userId ? (
                <div
                  className={`px-4 py-3 rounded-xl border font-mono text-xs break-all ${
                    isDarkMode
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                  }`}
                >
                  {userId}
                </div>
              ) : (
                <div
                  className={`px-4 py-3 rounded-xl border font-mono text-xs ${
                    isDarkMode
                      ? 'bg-rose-950/20 border-rose-900/50 text-rose-300'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  No chat user ID found on this
                  browser.
                </div>
              )}

              <p
                className={`mt-2 text-[10px] font-mono ${
                  isDarkMode
                    ? 'text-neutral-600'
                    : 'text-neutral-400'
                }`}
              >
                This ID is automatically retrieved
                from this browser.
              </p>
            </div>

            {/* APPEAL */}
            <div>
              <label
                className={`block font-mono text-[11px] font-bold uppercase tracking-wider mb-2 ${
                  isDarkMode
                    ? 'text-neutral-300'
                    : 'text-neutral-700'
                }`}
              >
                Why are you appealing?
              </label>

              <textarea
                value={appealMessage}
                onChange={(e) => {
                  setAppealMessage(e.target.value);

                  if (error) {
                    setError('');
                  }
                }}
                placeholder="Explain what happened and why you believe the restriction should be reviewed..."
                rows={6}
                maxLength={1000}
                className={`w-full p-4 rounded-xl border text-sm resize-none focus:outline-none ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-emerald-500'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900'
                }`}
              />

              <div
                className={`mt-2 text-right font-mono text-[10px] ${
                  isDarkMode
                    ? 'text-neutral-600'
                    : 'text-neutral-400'
                }`}
              >
                {appealMessage.length}/1000
              </div>
            </div>

            {error && (
              <div
                className={`mt-4 p-3 rounded-xl border font-mono text-xs ${
                  isDarkMode
                    ? 'bg-rose-950/30 border-rose-900 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {error}
              </div>
            )}

            <div
              className={`mt-6 p-4 rounded-xl border ${
                isDarkMode
                  ? 'bg-neutral-950 border-neutral-800'
                  : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <p
                className={`font-mono text-[10px] leading-relaxed ${
                  isDarkMode
                    ? 'text-neutral-500'
                    : 'text-neutral-500'
                }`}
              >
                Please provide an honest and clear
                explanation. Submitting an appeal
                does not automatically remove a ban
                or restriction.
              </p>
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !userId ||
                appealMessage.trim().length < 20
              }
              className="mt-6 w-full py-3.5 rounded-xl bg-neutral-900 dark:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              {isSubmitting
                ? 'Submitting...'
                : 'Submit Appeal'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}