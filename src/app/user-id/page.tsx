'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function UserIdPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const storedUserId = localStorage.getItem('unsaid_chat_user_id');
      setUserId(storedUserId);

      const storedTheme = localStorage.getItem('unsaid_dark_mode');

      if (storedTheme !== null) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        setIsDarkMode(true);
      }
    } catch (error) {
      console.error('Failed to load local settings:', error);
    }
  }, []);

  const handleCopy = async () => {
    if (!userId) return;

    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy user ID:', error);
    }
  };

  return (
    <main
      className={`min-h-screen px-4 transition-colors duration-200 ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center">
        <div className="w-full">

          {/* Branding */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-black tracking-tight">
                TAMBAYAN
                <span className="text-emerald-600">SLU</span>
              </h1>
            </Link>

            <p
              className={`mt-2 text-sm ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              Your little corner of the Louisian community.
            </p>
          </div>

          {/* Card */}
          <div
            className={`rounded-3xl border p-6 shadow-sm transition-colors ${
              isDarkMode
                ? 'border-neutral-800 bg-neutral-900'
                : 'border-neutral-200 bg-white'
            }`}
          >
            <div className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-500">
                Anonymous Chat
              </p>

              <h2 className="text-2xl font-bold">
                Your user ID
              </h2>

              <p
                className={`mt-2 text-sm leading-relaxed ${
                  isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
                }`}
              >
                This is the anonymous ID assigned to your browser.
              </p>
            </div>

            {userId ? (
              <div
                className={`rounded-2xl border p-4 ${
                  isDarkMode
                    ? 'border-neutral-800 bg-neutral-950'
                    : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <p className="mb-2 text-xs font-medium text-neutral-500">
                  Your user id is:
                </p>

                <div className="flex items-center gap-2">
                  <div
                    className={`min-w-0 flex-1 break-all rounded-xl border px-4 py-3 font-mono text-sm font-medium ${
                      isDarkMode
                        ? 'border-neutral-800 bg-neutral-900 text-neutral-200'
                        : 'border-neutral-200 bg-white text-neutral-800'
                    }`}
                  >
                    {userId}
                  </div>

                  <button
                    onClick={handleCopy}
                    className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : isDarkMode
                          ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                          : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-2xl p-5 text-center ${
                  isDarkMode ? 'bg-neutral-950' : 'bg-neutral-50'
                }`}
              >
                <p
                  className={`text-sm ${
                    isDarkMode
                      ? 'text-neutral-400'
                      : 'text-neutral-500'
                  }`}
                >
                  No user ID found on this device.
                </p>

                <Link
                  href="/chat"
                  className="mt-4 inline-block rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  Go to chat
                </Link>
              </div>
            )}

            {/* Privacy note */}
            <div
              className={`mt-6 rounded-2xl p-4 ${
                isDarkMode
                  ? 'bg-emerald-950/40'
                  : 'bg-emerald-50'
              }`}
            >
              <p
                className={`text-xs leading-relaxed ${
                  isDarkMode
                    ? 'text-emerald-300'
                    : 'text-emerald-800'
                }`}
              >
                Your user ID is stored locally on this device.
                Clearing your browser's local storage may remove it.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}