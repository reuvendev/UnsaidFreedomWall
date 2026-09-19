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

  Heart: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),

  Code: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),

  Server: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),

  User: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

export default function CreditsPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');

      if (storedTheme !== null) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (
        window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ) {
        setIsDarkMode(true);
      }
    } catch (error) {
      console.error('Failed to load dark mode:', error);
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
    } catch (error) {
      console.error('Failed to save dark mode:', error);
    }
  };

  const heading = isDarkMode
    ? 'text-white'
    : 'text-neutral-900';

  const body = isDarkMode
    ? 'text-neutral-400'
    : 'text-neutral-600';

  const card = isDarkMode
    ? 'bg-neutral-900/60 border-neutral-800'
    : 'bg-white border-neutral-200/80';

  return (
    <div
      className={`min-h-screen font-sans selection:bg-neutral-900 selection:text-white ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-neutral-50/50 text-neutral-900'
      }`}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800'
            : 'bg-white/95 border-neutral-200/80'
        }`}
      >
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-xl font-black tracking-tighter"
          >
            TAMBAYAN
            <span className="text-emerald-600">.</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`font-mono text-[11px] font-bold uppercase tracking-widest ${
                isDarkMode
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              ← Back Home
            </Link>

            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className={`p-2 rounded-xl border ${
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

      <main className="max-w-2xl mx-auto px-6 pt-14 pb-24">
        {/* Intro */}
        <section className="mb-12">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Project Credits
          </p>

          <h1
            className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6 ${heading}`}
          >
            Behind Tambayan.
          </h1>

          <div
            className={`space-y-4 text-base leading-relaxed ${body}`}
          >
            <p>
              Tambayan is an independently developed student
              project built to create an anonymous online
              community space for Louisians.
            </p>

            <p>
              The project combines what is learned in Information
              Technology with practical web development,
              database management, interface design, moderation,
              privacy, and maintaining a real platform used by a
              student community.
            </p>
          </div>
        </section>

        <div className="space-y-5">
          {/* Developer */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${card}`}
          >
            <div className="flex items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-4">
              <Icons.User />
              <span>Created & Developed By</span>
            </div>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-2 ${heading}`}
            >
              Nevz
            </h2>

            <p
              className={`font-mono text-xs mb-5 ${
                isDarkMode
                  ? 'text-neutral-500'
                  : 'text-neutral-400'
              }`}
            >
              BS Information Technology · SLU SAMCIS
            </p>

            <div
              className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}
            >
              <p>
                Tambayan was created and developed by a Bachelor
                of Science in Information Technology (BSIT)
                student from Saint Louis University&apos;s School
                of Accountancy, Management, Computing and
                Information Studies (SAMCIS).
              </p>

              <p>
                The project serves as a practical application of
                concepts and skills learned while studying
                Information Technology. It provides an
                opportunity to apply classroom knowledge to the
                development and maintenance of a real web
                platform.
              </p>
            </div>
          </section>

          {/* Learning */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${
              isDarkMode
                ? 'bg-emerald-950/20 border-emerald-900/50'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              Learning Through Building
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
            >
              From classroom concepts to a working platform.
            </h2>

            <p
              className={`text-sm sm:text-base leading-relaxed ${body}`}
            >
              Developing Tambayan puts concepts such as
              programming, web development, databases, data
              structures, user interface design, system
              development, privacy, security, and software
              maintenance into practice. As the platform grows,
              it also provides opportunities to learn from real
              technical challenges and user feedback.
            </p>
          </section>

          {/* Framework */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${card}`}
          >
            <div className="flex items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-5">
              <Icons.Code />
              <span>Framework & Libraries</span>
            </div>

            <div className="space-y-4">
              <div
                className={`pb-4 border-b ${
                  isDarkMode
                    ? 'border-neutral-800'
                    : 'border-neutral-200'
                }`}
              >
                <h3 className={`font-bold ${heading}`}>
                  Next.js
                </h3>

                <p className={`text-sm mt-1 ${body}`}>
                  React framework used to build the website and
                  application routes.
                </p>
              </div>

              <div
                className={`pb-4 border-b ${
                  isDarkMode
                    ? 'border-neutral-800'
                    : 'border-neutral-200'
                }`}
              >
                <h3 className={`font-bold ${heading}`}>
                  TypeScript
                </h3>

                <p className={`text-sm mt-1 ${body}`}>
                  Used throughout the project to build more
                  structured and maintainable application code.
                </p>
              </div>

              <div>
                <h3 className={`font-bold ${heading}`}>
                  Tailwind CSS
                </h3>

                <p className={`text-sm mt-1 ${body}`}>
                  Used to build Tambayan&apos;s responsive user
                  interface and visual design.
                </p>
              </div>
            </div>
          </section>

          {/* Infrastructure */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${card}`}
          >
            <div className="flex items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-5">
              <Icons.Server />
              <span>Backend & Infrastructure</span>
            </div>

            <div className="space-y-4">
              <div
                className={`pb-4 border-b ${
                  isDarkMode
                    ? 'border-neutral-800'
                    : 'border-neutral-200'
                }`}
              >
                <h3 className={`font-bold ${heading}`}>
                  Firebase Firestore
                </h3>

                <p className={`text-sm mt-1 ${body}`}>
                  Used as part of Tambayan&apos;s database
                  infrastructure for storing and managing
                  application data.
                </p>
              </div>

              <div>
                <h3 className={`font-bold ${heading}`}>
                  Vercel
                </h3>

                <p className={`text-sm mt-1 ${body}`}>
                  Used to deploy and host the Tambayan web
                  application.
                </p>
              </div>
            </div>
          </section>

          {/* Design */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${card}`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              Design
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
            >
              Simple, readable, and community-focused.
            </h2>

            <p
              className={`text-sm sm:text-base leading-relaxed ${body}`}
            >
              Tambayan uses a minimal interface intended to keep
              attention on community conversations rather than
              complicated profiles or unnecessary visual
              elements. The design continues to evolve as the
              platform and its features are improved.
            </p>
          </section>

          {/* Independent */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${card}`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              Independent Student Project
            </p>

            <p
              className={`text-sm sm:text-base leading-relaxed ${body}`}
            >
              Tambayan SLU is independently developed and
              operated. Although its developer is a student of
              Saint Louis University, Tambayan is not an
              official academic project, service, or platform of
              Saint Louis University, SAMCIS, or any university
              office. It is not affiliated with, authorized by,
              or endorsed by Saint Louis University.
            </p>
          </section>
        </div>

        {/* Related */}
        <section
          className={`mt-10 pt-8 border-t ${
            isDarkMode
              ? 'border-neutral-800'
              : 'border-neutral-200'
          }`}
        >
          <p
            className={`text-sm leading-relaxed mb-5 ${body}`}
          >
            Learn more about the project, community, and how
            Tambayan works.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/about"
              className="px-5 py-3.5 rounded-lg bg-neutral-900 dark:bg-emerald-600 text-white text-center font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              About Tambayan
            </Link>

            <Link
              href="/how-it-works"
              className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-200'
                  : 'border-neutral-200 bg-white text-neutral-800'
              }`}
            >
              How It Works
            </Link>

            <Link
              href="/guidelines"
              className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-200'
                  : 'border-neutral-200 bg-white text-neutral-800'
              }`}
            >
              Community Guidelines
            </Link>

            <Link
              href="/contact"
              className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-200'
                  : 'border-neutral-200 bg-white text-neutral-800'
              }`}
            >
              Contact
            </Link>
          </div>
        </section>

        <div
          className={`mt-10 pt-6 border-t flex items-center justify-center ${
            isDarkMode
              ? 'border-neutral-800'
              : 'border-neutral-200'
          }`}
        >
          <p
            className={`flex items-center gap-1.5 font-mono text-[11px] ${
              isDarkMode
                ? 'text-neutral-500'
                : 'text-neutral-400'
            }`}
          >
            Crafted with <Icons.Heart /> for the Louisian
            community.
          </p>
        </div>
      </main>
    </div>
  );
}