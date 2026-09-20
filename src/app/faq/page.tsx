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
      <path d="m19.07 4.93-1.41-1.41" />
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

  Plus: () => (
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),

  Minus: () => (
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
      <path d="M5 12h14" />
    </svg>
  ),
};

const FAQS = [
  {
    category: 'General',
    question: 'What is Tambayan SLU?',
    answer:
      'Tambayan SLU is an independent online community for Louisians. It provides spaces such as the Freedom Wall and Anonymous Chat where users can share thoughts, stories, questions, and conversations anonymously.',
  },
  {
    category: 'General',
    question: 'Is Tambayan affiliated with Saint Louis University?',
    answer:
      'No. Tambayan SLU is an independent student platform and is not affiliated with, associated with, authorized by, endorsed by, or officially connected with Saint Louis University or any of its offices.',
  },
  {
    category: 'General',
    question: 'Is Tambayan free to use?',
    answer:
      'Yes. Tambayan is free to use. The project may accept voluntary support or donations to help cover expenses such as the domain, database, hosting, and other infrastructure costs.',
  },
  {
    category: 'Privacy',
    question: 'Do I need an account?',
    answer:
      'No. Tambayan does not require a traditional account, real name, school ID, email address, or password to use its main anonymous community features.',
  },
  {
    category: 'Privacy',
    question: 'Am I really anonymous?',
    answer:
      'Tambayan does not require your real identity for its main anonymous features. The website uses anonymous identifiers to make certain features work. However, you can still reveal your identity through information you voluntarily share, so avoid posting personal or sensitive information if you want to remain anonymous.',
  },
  {
    category: 'Anonymous Chat',
    question: 'Are Anonymous Chat messages encrypted?',
    answer:
      'Yes. Anonymous Chat messages are encrypted so that conversations are not normally readable by Tambayan administrators. Messages are decrypted on the participants’ devices while they are using the chat.',
  },
  {
    category: 'Anonymous Chat',
    question: 'Can Tambayan admins read my chats?',
    answer:
      'Normally, no. Administrators do not normally have access to the readable contents of private chat conversations. If a participant reports a chatroom, however, a readable copy of the conversation may be submitted as evidence so moderators can investigate the report.',
  },
  {
    category: 'Anonymous Chat',
    question: 'What happens when I report a chatroom?',
    answer:
      'When you report a chatroom, the conversation may be decrypted on your device and a readable copy may be submitted to Tambayan moderators as evidence. Moderators can then review the reported conversation and take appropriate action when necessary.',
  },
  {
    category: 'Anonymous Chat',
    question: 'How long are chatrooms stored?',
    answer:
      'When a chatroom is closed, the chatroom and its associated conversation data are temporarily retained and are deleted after 24 hours.',
  },
  {
    category: 'Freedom Wall',
    question: 'Why is my Freedom Wall post not visible immediately?',
    answer:
      'Freedom Wall submissions go through manual moderation before appearing on the public feed. This helps prevent harassment, doxxing, harmful content, spam, and other violations of the Community Guidelines.',
  },
  {
    category: 'Freedom Wall',
    question: 'Can moderators reject my post?',
    answer:
      'Yes. A submission may be rejected if it violates Tambayan’s Community Guidelines or safety standards. Campus thoughts, stories, questions, confessions, and rants are welcome as long as they follow the community rules.',
  },
  {
    category: 'Safety',
    question: 'What content is not allowed?',
    answer:
      'Content involving targeted harassment, bullying, malicious attacks, doxxing, spam, or other violations of the Community Guidelines may be rejected or removed. Users should also avoid sharing sensitive personal information.',
  },
  {
    category: 'Safety',
    question: 'How do I report inappropriate content?',
    answer:
      'Use the available report option on supported Tambayan features. Reports help moderators review possible violations of the Community Guidelines and take appropriate action.',
  },
  {
    category: 'Features',
    question: 'What is the streak system?',
    answer:
      'The streak system tracks your daily activity on Tambayan using your anonymous user identifier. Maintaining a streak can unlock milestones and certain customization features.',
  },
  {
    category: 'Privacy',
    question: 'Does Tambayan store my IP address?',
    answer:
      'Tambayan does not intentionally save visitors’ IP addresses as user identities in its application database. However, third-party infrastructure providers may process IP addresses as part of normal network requests, security, hosting, diagnostics, or service operation.',
  },
  {
    category: 'General',
    question: 'Who can use Tambayan?',
    answer:
      'Tambayan is intended only for users who are 18 years old or older. By using its community features, users confirm that they meet this age requirement.',
  },
];

export default function FAQPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
      {/* HEADER */}
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

      <main className="max-w-2xl mx-auto px-6 pt-14 pb-24">
        {/* INTRO */}
        <section className="mb-12">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Help & Information
          </p>

          <h1
            className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4 ${heading}`}
          >
            Frequently Asked Questions
          </h1>

          <p
            className={`text-base leading-relaxed ${body}`}
          >
            Quick answers about Tambayan, anonymity, the
            Freedom Wall, Anonymous Chat, privacy, and
            community safety.
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className={`rounded-xl border overflow-hidden transition-colors ${card}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenIndex(isOpen ? null : index)
                  }
                  className="w-full flex items-center justify-between gap-5 p-5 sm:p-6 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-2">
                      {faq.category}
                    </p>

                    <h2
                      className={`text-sm sm:text-base font-bold leading-snug ${heading}`}
                    >
                      {faq.question}
                    </h2>
                  </div>

                  <span
                    className={`shrink-0 ${
                      isDarkMode
                        ? 'text-neutral-500'
                        : 'text-neutral-400'
                    }`}
                  >
                    {isOpen ? (
                      <Icons.Minus />
                    ) : (
                      <Icons.Plus />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div
                    className={`px-5 sm:px-6 pb-5 sm:pb-6 text-sm leading-relaxed ${body}`}
                  >
                    <div
                      className={`pt-4 border-t ${
                        isDarkMode
                          ? 'border-neutral-800'
                          : 'border-neutral-100'
                      }`}
                    >
                      {faq.answer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* STILL NEED HELP */}
        <section
          className={`mt-10 rounded-2xl border p-6 sm:p-8 ${
            isDarkMode
              ? 'bg-emerald-950/20 border-emerald-900/50'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Still Have Questions?
          </p>

          <h2
            className={`text-2xl font-extrabold tracking-tight mb-3 ${heading}`}
          >
            We&apos;re here to help.
          </h2>

          <p
            className={`text-sm leading-relaxed mb-5 ${body}`}
          >
            If your question isn&apos;t answered here, you can
            contact Tambayan or read the Community Guidelines
            for more information.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="px-5 py-3 rounded-lg bg-neutral-900 dark:bg-emerald-600 text-white text-center font-mono text-[10px] font-bold uppercase tracking-wider"
            >
              Contact Tambayan
            </Link>

            <Link
              href="/guidelines"
              className={`px-5 py-3 rounded-lg border text-center font-mono text-[10px] font-bold uppercase tracking-wider ${
                isDarkMode
                  ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                  : 'border-neutral-300 text-neutral-700 hover:bg-white'
              }`}
            >
              Community Guidelines
            </Link>
          </div>
        </section>

        {/* RELATED */}
        <section
          className={`mt-10 pt-8 border-t ${
            isDarkMode
              ? 'border-neutral-800'
              : 'border-neutral-200'
          }`}
        >
          <h2
            className={`text-xl font-bold mb-2 ${heading}`}
          >
            Related information
          </h2>

          <p
            className={`text-sm leading-relaxed mb-5 ${body}`}
          >
            Learn more about Tambayan&apos;s privacy practices,
            community rules, and anonymous features.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/privacy"
              className="px-5 py-3.5 rounded-lg bg-neutral-900 dark:bg-emerald-600 text-white text-center font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              Privacy Policy
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
              href="/wall"
              className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-200'
                  : 'border-neutral-200 bg-white text-neutral-800'
              }`}
            >
              Freedom Wall
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}