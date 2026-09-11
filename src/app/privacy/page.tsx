'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const Icons = {
  Sun: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),

  Moon: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
};

export default function PrivacyPolicyPage() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Load dark mode preference from localStorage
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
      // Ignore localStorage errors
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
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  return (
    <div
      className={`min-h-screen font-sans selection:bg-neutral-900 selection:text-white ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-white text-neutral-900'
      }`}
    >
      {/* Header */}
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
            className={`font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity ${
              isDarkMode ? 'text-white' : 'text-neutral-900'
            }`}
          >
            TAMBAYAN.
          </Link>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-4 font-mono text-[11px] font-bold tracking-widest uppercase">
              <Link
                href="/guidelines"
                className={`transition-colors ${
                  isDarkMode
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Guidelines
              </Link>

              <Link
                href="/"
                className={`transition-colors ${
                  isDarkMode
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Feed →
              </Link>
            </nav>

            <button
              onClick={toggleDarkMode}
              aria-label="Toggle Dark Mode"
              className={`p-2 rounded-xl border cursor-pointer transition-colors ${
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

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24 space-y-8">
        {/* Page Header */}
        <div>
          <p
            className={`font-mono text-[11px] font-bold tracking-widest uppercase mb-4 ${
              isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
            }`}
          >
            Legal & Compliance
          </p>

          <h1
            className={`text-3xl md:text-4xl font-extrabold tracking-tight mb-4 ${
              isDarkMode ? 'text-white' : 'text-neutral-900'
            }`}
          >
            Privacy Policy
          </h1>

          <p className="text-sm font-mono text-neutral-500">
            Last updated: August 2026
          </p>
        </div>

        {/* Privacy Policy Content */}
        <div
          className={`space-y-6 text-sm md:text-base leading-relaxed ${
            isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
          }`}
        >
          {/* Section 1 */}
          <section
            className={`p-6 border rounded-lg space-y-3 ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <h2
              className={`font-mono text-sm font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              1. Complete Anonymity & No Personal Tracking
            </h2>

            <p>
              <strong
                className={isDarkMode ? 'text-white' : 'text-neutral-900'}
              >
                Tambayan
              </strong>{' '}
              is built on a privacy-first foundation. We do not collect, store,
              require, or track any personal user information. There are no user
              accounts, registration forms, or login requirements.
            </p>

            <p>
              When you submit a post or a thought to the wall, it is published
              completely anonymously under an assigned alias code. We do not
              track your real identity, email address, or personal profile data.
            </p>
          </section>

          {/* Section 2 */}
          <section
            className={`p-6 border rounded-lg space-y-3 ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <h2
              className={`font-mono text-sm font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              2. Local Device Storage
            </h2>

            <p>
              To improve your user experience, such as remembering which posts
              you have upvoted or reported, our application utilizes your
              browser&apos;s local storage (
              <code
                className={`font-mono text-xs px-2 py-0.5 border rounded ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-800 text-neutral-200'
                    : 'bg-white border-neutral-200 text-neutral-800'
                }`}
              >
                localStorage
              </code>
              ). This data stays entirely on your local device and is never
              transmitted to or stored on our servers.
            </p>
          </section>

          {/* Section 3 */}
          <section
            className={`p-6 border rounded-lg space-y-3 ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <h2
              className={`font-mono text-sm font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              3. Advertising & Third-Party Cookies
            </h2>

            <p>
              To support the future hosting and maintenance of Tambayan, we have
              applied for Google AdSense integration, which is currently pending
              review and approval.
            </p>

            <ul
              className={`list-disc pl-5 space-y-2 font-mono text-xs ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              <li>
                Once approved, Google as a third-party vendor may use cookies to
                serve ads on our site.
              </li>

              <li>
                Google&apos;s use of advertising cookies enables it and its
                partners to serve ads to users based on their visits to this
                site and/or other sites on the Internet.
              </li>

              <li>
                Users may opt out of personalized advertising by visiting{' '}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline font-bold transition-colors ${
                    isDarkMode
                      ? 'text-white hover:text-neutral-300'
                      : 'text-neutral-900 hover:text-neutral-600'
                  }`}
                >
                  Google Ads Settings
                </a>
                .
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section
            className={`p-6 border rounded-lg space-y-3 ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <h2
              className={`font-mono text-sm font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              4. Content Moderation
            </h2>

            <p>
              All public contributions are{' '}
              <strong
                className={isDarkMode ? 'text-white' : 'text-neutral-900'}
              >
                manually reviewed and vetted by administrators before publishing
              </strong>{' '}
              to ensure compliance with our safety guidelines. Only the public
              text content and metadata associated with approved posts are stored
              in the public database.
            </p>
          </section>

          {/* Section 5 */}
          <section
            className={`p-6 border rounded-lg space-y-3 ${
              isDarkMode
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <h2
              className={`font-mono text-sm font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-white' : 'text-neutral-900'
              }`}
            >
              5. Contact
            </h2>

            <p>
              If you have any questions regarding our privacy practices or this
              policy, you may reach out through our project development channels.
            </p>
          </section>

          {/* Footer */}
          <div
            className={`pt-6 border-t flex items-center justify-between ${
              isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
            }`}
          >
            <span
              className={`font-mono text-xs ${
                isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              Privacy-first by design.
            </span>

            <Link
              href="/"
              className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded transition-all active:scale-95 shadow-sm cursor-pointer ${
                isDarkMode
                  ? 'bg-neutral-100 text-neutral-950 hover:bg-white'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              Return to Feed
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}