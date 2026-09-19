'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const Icons = {
  Sun: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  Moon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
};

const freedomSteps = [
  ['01', 'Write your entry', 'Share a thought, question, story, confession, rant, or experience you want to post on the Freedom Wall.'],
  ['02', 'Choose a category', 'Select the category that best describes your entry so people can more easily find relevant conversations.'],
  ['03', 'Submit anonymously', 'Your public name is not required on the Freedom Wall. The platform uses an anonymous Louisian identity for community participation.'],
  ['04', 'Wait for moderation', 'Submissions may be reviewed before publication to check whether they follow the Community Guidelines.'],
  ['05', 'Approved entries appear on the wall', 'If approved, your entry becomes visible on the Freedom Wall where other users can read and interact with it.'],
  ['06', 'Report problems', 'Published content can be reported when a user believes it violates the Community Guidelines. Reports can then be reviewed by moderation.'],
];

const chatSteps = [
  ['01', 'Enter Anonymous Chat', 'Open the chat feature when you want to have an anonymous conversation with another user.'],
  ['02', 'Get matched', 'The chat system connects you with another available anonymous user.'],
  ['03', 'Start a conversation', 'Talk without needing to publicly display your real name or social media profile.'],
  ['04', 'Leave when you want', 'You can end the conversation when you are finished or if you no longer want to continue chatting.'],
];

export default function HowItWorksPage() {
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

  const heading = isDarkMode ? 'text-white' : 'text-neutral-900';
  const body = isDarkMode ? 'text-neutral-400' : 'text-neutral-600';
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
            TAMBAYAN<span className="text-emerald-600">.</span>
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
        <section className="mb-12">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            How Tambayan Works
          </p>

          <h1
            className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6 ${heading}`}
          >
            Share, connect, and stay anonymous.
          </h1>

          <div className={`space-y-4 text-base leading-relaxed ${body}`}>
            <p>
              Tambayan SLU is built around two main community features:
              the Freedom Wall and Anonymous Chat. Both are designed to
              give Louisians a space to express themselves and connect
              without requiring a public identity.
            </p>

            <p>
              Anonymity does not mean there are no rules. Freedom Wall
              submissions may go through moderation, published content
              can be reported, and users are expected to follow the
              Community Guidelines while using the platform.
            </p>
          </div>
        </section>

        <section className={`rounded-2xl border p-6 sm:p-8 mb-5 ${card}`}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Freedom Wall
          </p>

          <h2 className={`text-2xl font-extrabold tracking-tight mb-3 ${heading}`}>
            How posting works
          </h2>

          <p className={`text-sm sm:text-base leading-relaxed mb-8 ${body}`}>
            The Freedom Wall is where community members can anonymously
            share entries and read what other Louisians are talking about.
          </p>

          <div className="space-y-7">
            {freedomSteps.map(([number, title, description]) => (
              <div key={number} className="flex gap-4">
                <div className="shrink-0 font-mono text-xs font-black text-emerald-600 pt-1">
                  {number}
                </div>

                <div>
                  <h3 className={`font-bold mb-1 ${heading}`}>
                    {title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${body}`}>
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/wall"
            className="inline-flex mt-8 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
          >
            Visit Freedom Wall →
          </Link>
        </section>

        <section className={`rounded-2xl border p-6 sm:p-8 mb-5 ${card}`}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Anonymous Identity
          </p>

          <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>
            What anonymous means on Tambayan
          </h2>

          <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
            <p>
              Tambayan is designed so that participating in community
              features does not require you to publicly display your real
              name on your Freedom Wall posts or anonymous conversations.
            </p>

            <p>
              However, anonymous does not mean that users should share
              private information freely. Anything you voluntarily include
              in a post or conversation could reveal information about you.
              Avoid sharing details such as passwords, home addresses,
              private contact information, or other sensitive information.
            </p>

            <p>
              Like most websites, Tambayan may also process technical
              information needed to operate its features and may use
              third-party services. Details about information processing
              are provided in the Privacy Policy.
            </p>
          </div>

          <Link
            href="/privacy"
            className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
          >
            Read Privacy Policy →
          </Link>
        </section>

        <section className={`rounded-2xl border p-6 sm:p-8 mb-5 ${card}`}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Anonymous Chat
          </p>

          <h2 className={`text-2xl font-extrabold tracking-tight mb-3 ${heading}`}>
            How anonymous conversations work
          </h2>

          <p className={`text-sm sm:text-base leading-relaxed mb-8 ${body}`}>
            Anonymous Chat provides a separate space for one-to-one
            conversations without requiring users to publicly exchange
            their identities.
          </p>

          <div className="space-y-7">
            {chatSteps.map(([number, title, description]) => (
              <div key={number} className="flex gap-4">
                <div className="shrink-0 font-mono text-xs font-black text-emerald-600 pt-1">
                  {number}
                </div>

                <div>
                  <h3 className={`font-bold mb-1 ${heading}`}>
                    {title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${body}`}>
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            className={`mt-8 rounded-xl border p-4 ${
              isDarkMode
                ? 'bg-neutral-950/60 border-neutral-800'
                : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <p className={`text-sm leading-relaxed ${body}`}>
              <strong className={heading}>Chat safely:</strong> You do not
              need to share your real name, passwords, address, phone
              number, school credentials, or other sensitive information
              with someone you meet through anonymous chat.
            </p>
          </div>

          <Link
            href="/chat/setup"
            className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
          >
            Enter Anonymous Chat →
          </Link>
        </section>

        <section className={`rounded-2xl border p-6 sm:p-8 mb-5 ${card}`}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Moderation
          </p>

          <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>
            How we keep the community moderated
          </h2>

          <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
            <p>
              Freedom Wall submissions may be reviewed before publication.
              Moderation helps prevent content such as harassment, bullying,
              doxxing, hate speech, spam, malicious links, and other
              material that violates the Community Guidelines.
            </p>

            <p>
              A submission may be rejected when it does not follow the
              guidelines. Published content may also be reported by users
              and reviewed again. Content that violates the rules may be
              removed.
            </p>

            <p>
              Moderation cannot guarantee that every inappropriate post or
              interaction will be detected immediately. Community reports
              help bring potentially harmful content to the attention of
              moderators.
            </p>
          </div>

          <Link
            href="/guidelines"
            className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
          >
            Read Community Guidelines →
          </Link>
        </section>

        <section
          className={`rounded-2xl border p-6 sm:p-8 mb-5 ${
            isDarkMode
              ? 'bg-emerald-950/20 border-emerald-900/50'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Your Responsibility
          </p>

          <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>
            Help keep Tambayan safe.
          </h2>

          <p className={`text-sm sm:text-base leading-relaxed mb-5 ${body}`}>
            Everyone using Tambayan has a role in keeping the community
            useful and respectful. Before posting or chatting, avoid
            sharing content that could harm another person or expose
            private information.
          </p>

          <ul className={`space-y-3 text-sm leading-relaxed ${body}`}>
            {[
              'Do not expose another person’s private or identifying information.',
              'Do not use the platform to harass, threaten, bully, or impersonate others.',
              'Do not share passwords, account credentials, home addresses, or other sensitive information.',
              'Do not distribute spam, scams, malicious links, or prohibited content.',
              'Use the report feature when you encounter Freedom Wall content that may violate the guidelines.',
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Independent Community
          </p>

          <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>
            Tambayan is independently operated.
          </h2>

          <p className={`text-sm sm:text-base leading-relaxed ${body}`}>
            Tambayan SLU is an independent student platform. It is not
            affiliated with, associated with, authorized by, endorsed by,
            or officially connected with Saint Louis University (SLU) or
            any of its offices.
          </p>
        </section>

        <section
          className={`mt-10 pt-8 border-t ${
            isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        >
          <h2 className={`text-xl font-bold mb-2 ${heading}`}>
            Learn more about Tambayan
          </h2>

          <p className={`text-sm leading-relaxed mb-5 ${body}`}>
            These pages provide more information about the community,
            its rules, and how your information is handled.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/wall"
              className="px-5 py-3.5 rounded-lg bg-neutral-900 dark:bg-emerald-600 text-white text-center font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              Freedom Wall
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
