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

export default function ContactPage() {
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

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 pt-14 pb-24">
        {/* Intro */}
        <section className="mb-12">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Get in Touch
          </p>

          <h1
            className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6 ${heading}`}
          >
            Contact Tambayan
          </h1>

          <div
            className={`space-y-4 text-base leading-relaxed ${body}`}
          >
            <p>
              Have a question, concern, suggestion, or problem
              while using Tambayan? You can contact the project
              administrator directly.
            </p>

            <p>
              You can also reach out regarding privacy concerns,
              content removal requests, moderation decisions,
              safety issues, technical problems, or other matters
              related to the platform.
            </p>
          </div>
        </section>

        <div className="space-y-5">
          {/* Email */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${card}`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              Email
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
            >
              Contact the administrator
            </h2>

            <p
              className={`text-sm sm:text-base leading-relaxed mb-5 ${body}`}
            >
              For general inquiries, support, feedback, privacy
              concerns, or platform-related issues, send an email
              to:
            </p>

            <a
              href="mailto:unsaideselyu@gmail.com"
              className={`inline-flex items-center px-5 py-3 rounded-lg border font-mono text-sm font-bold transition-colors ${
                isDarkMode
                  ? 'bg-neutral-950 border-neutral-800 text-white hover:bg-neutral-800'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              unsaideselyu@gmail.com
            </a>
          </section>

          {/* Reasons */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${card}`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              What You Can Contact Us About
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-5 ${heading}`}
            >
              We&apos;re here for platform-related concerns.
            </h2>

            <div className="space-y-5">
              <div>
                <h3 className={`font-bold mb-1 ${heading}`}>
                  Content & Moderation
                </h3>

                <p
                  className={`text-sm leading-relaxed ${body}`}
                >
                  Questions about a Freedom Wall submission,
                  reported content, moderation decisions, or
                  content that may violate the Community
                  Guidelines.
                </p>
              </div>

              <div>
                <h3 className={`font-bold mb-1 ${heading}`}>
                  Privacy & Personal Information
                </h3>

                <p
                  className={`text-sm leading-relaxed ${body}`}
                >
                  Contact us if you believe your personal
                  information has been shared through Tambayan,
                  have a question about our privacy practices,
                  or want to raise a privacy concern.
                </p>
              </div>

              <div>
                <h3 className={`font-bold mb-1 ${heading}`}>
                  Content Removal
                </h3>

                <p
                  className={`text-sm leading-relaxed ${body}`}
                >
                  If content published on Tambayan involves you
                  and you believe it should be reviewed or
                  removed, you may contact the administrator
                  with the relevant details.
                </p>
              </div>

              <div>
                <h3 className={`font-bold mb-1 ${heading}`}>
                  Technical Support
                </h3>

                <p
                  className={`text-sm leading-relaxed ${body}`}
                >
                  Report broken features, errors, problems with
                  the Freedom Wall or Anonymous Chat, or other
                  technical issues.
                </p>
              </div>

              <div>
                <h3 className={`font-bold mb-1 ${heading}`}>
                  Feedback & Suggestions
                </h3>

                <p
                  className={`text-sm leading-relaxed ${body}`}
                >
                  Suggestions for improving Tambayan and its
                  community features are also welcome.
                </p>
              </div>
            </div>
          </section>

          {/* Removal Requests */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${card}`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              Content Removal Requests
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
            >
              Help us locate the content.
            </h2>

            <div
              className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}
            >
              <p>
                When requesting a review or removal of content,
                please provide enough information for us to find
                the relevant post, reply, or other material.
              </p>

              <p>
                This may include the post number, a link to the
                content, a screenshot, the approximate date it
                was posted, and a short explanation of your
                concern.
              </p>

              <p>
                Please do not send passwords, school account
                credentials, financial information, or other
                unnecessary sensitive information by email.
              </p>
            </div>
          </section>

          {/* Safety */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${
              isDarkMode
                ? 'bg-emerald-950/20 border-emerald-900/50'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              Safety Notice
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
            >
              Tambayan is not an emergency service.
            </h2>

            <p
              className={`text-sm sm:text-base leading-relaxed ${body}`}
            >
              The contact email and reporting tools are intended
              for matters involving Tambayan. They should not be
              relied upon for emergencies or situations requiring
              immediate assistance.
            </p>
          </section>

          {/* Independent */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${card}`}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              Independent Community
            </p>

            <p
              className={`text-sm sm:text-base leading-relaxed ${body}`}
            >
              Tambayan SLU is an independent student platform.
              It is not affiliated with, associated with,
              authorized by, endorsed by, or officially
              connected with Saint Louis University (SLU) or
              any of its offices.
            </p>
          </section>
        </div>

        {/* Related Pages */}
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
            You may also find the information you need in our
            community and privacy pages.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/guidelines"
              className="px-5 py-3.5 rounded-lg bg-neutral-900 dark:bg-emerald-600 text-white text-center font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              Community Guidelines
            </Link>

            <Link
              href="/privacy"
              className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-200'
                  : 'border-neutral-200 bg-white text-neutral-800'
              }`}
            >
              Privacy Policy
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
              href="/about"
              className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-200'
                  : 'border-neutral-200 bg-white text-neutral-800'
              }`}
            >
              About Tambayan
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}