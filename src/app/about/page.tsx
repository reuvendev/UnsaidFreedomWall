'use client';

import React, { useEffect, useState } from 'react';
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

export default function AboutPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');
      if (storedTheme !== null) {
        setIsDarkMode(JSON.parse(storedTheme));
      } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
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
      localStorage.setItem('unsaid_dark_mode', JSON.stringify(nextMode));
    } catch (error) {
      console.error('Failed to save dark mode:', error);
    }
  };

  const card = isDarkMode
    ? 'bg-neutral-900/60 border-neutral-800'
    : 'bg-white border-neutral-200/80';

  const body = isDarkMode ? 'text-neutral-400' : 'text-neutral-600';
  const heading = isDarkMode ? 'text-white' : 'text-neutral-900';

  return (
    <div className={`min-h-screen font-sans selection:bg-neutral-900 selection:text-white ${isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50/50 text-neutral-900'}`}>
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${isDarkMode ? 'bg-neutral-900/95 border-neutral-800' : 'bg-white/95 border-neutral-200/80'}`}>
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter">
            TAMBAYAN<span className="text-emerald-600">.</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/" className={`font-mono text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}>
              ← Back Home
            </Link>
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className={`p-2 rounded-xl border ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'}`}
            >
              {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-14 pb-24">
        <section className="mb-12">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">About Tambayan</p>
          <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6 ${heading}`}>
            A community space built for Louisians.
          </h1>
        </section>

        <div className="space-y-5">

        <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              About the Project
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
            >
              An independently developed student project.
            </h2>

            <div
              className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}
            >
              <p>
               Tambayan started as a student-built web project focused on creating a simple online community space for Louisians. The platform is independently developed and maintained as its features and community continue to grow.
              </p>

              <p>
                The project was created and developed by a Bachelor of Science in Information Technology (BSIT) student from Saint Louis University’s School of Accountancy, Management, Computing and Information Studies (SAMCIS).
              </p>

              <p>
                Tambayan also serves as a practical application of the knowledge and skills learned through studying Information Technology. It puts concepts from web development, programming, databases, user interface design, and system development into practice by building and maintaining a real platform used by a student community.
              </p>

              <p>
                Tambayan is a personal and independent student project and is not an official project, service, or platform of Saint Louis University or SAMCIS.
              </p>

              <div
                className={`pt-4 border-t ${
                  isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
                }`}
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                  Created & Developed By
                </p>

                <p className={`font-mono text-sm font-bold ${heading}`}>
                  Nevz
                </p>

                <p className="font-mono text-[11px] text-neutral-500 mt-1">
                  BS Information Technology · SLU SAMCIS
                </p>
              </div>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">Why Tambayan Exists</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Not every thought belongs on a personal account.</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Students sometimes want to share a concern, ask a question, tell a story, release a rant, or talk about an experience without attaching their public social media identity to it.
              </p>
              <p>
                Tambayan was created to provide a dedicated space for those conversations while still having community rules and moderation. The goal is not simply to collect anonymous posts, but to give Louisians a place where they can share and connect with other members of the community.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">The Freedom Wall</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Share something without putting your name on it.</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                The Freedom Wall lets users submit anonymous entries about campus life, academics, relationships, personal experiences, questions, advice, rants, and other topics relevant to the community.
              </p>
              <p>
                Instead of displaying a public identity, posts use an anonymous Louisian alias. Submissions may be reviewed before publication, and approved entries can appear on the Freedom Wall where other users can read and interact with them.
              </p>
            </div>
            <Link href="/wall" className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500">
              Explore Freedom Wall →
            </Link>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">Anonymous Chat</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Talk without making your identity the conversation.</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Tambayan also provides an anonymous chat feature where users can enter the chat system and be matched with another anonymous user for a private conversation.
              </p>
              <p>
                It is intended for casual conversations and meeting people in the community without requiring users to publicly share their identity. Users should still avoid sharing sensitive personal information with people they do not know.
              </p>
            </div>
            <Link href="/chat/setup" className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500">
              Find a Chatmate →
            </Link>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">Moderation</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Anonymity still comes with community rules.</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Tambayan uses moderation and reporting tools to help prevent harassment, bullying, doxxing, hate speech, spam, and other content that violates the community guidelines.
              </p>
              <p>
                Freedom Wall submissions may be reviewed before they are published. Users can also report published content for additional review. Content that violates the guidelines may be rejected or removed.
              </p>
            </div>
            <Link href="/guidelines" className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500">
              Read Community Guidelines →
            </Link>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">Privacy & Anonymity</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Designed for anonymous participation.</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Tambayan is designed so community participation does not require users to publicly display their identity. However, users should avoid posting information that could identify themselves or another person.
              </p>
              <p>
                The Privacy Policy explains the information the service processes, how it is used, and how third-party services may be involved in operating Tambayan.
              </p>
            </div>
            <Link href="/privacy" className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500">
              Read Privacy Policy →
            </Link>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">Independent Community</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Tambayan is independently operated.</h2>
            <p className={`text-sm sm:text-base leading-relaxed ${body}`}>
              Tambayan SLU is an independent student platform. It is not affiliated with, associated with, authorized by, endorsed by, or officially connected with Saint Louis University (SLU) or any of its offices.
            </p>
          </section>
        </div>

        <section className={`mt-10 pt-8 border-t ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <p className={`text-sm leading-relaxed mb-5 ${body}`}>
            Want to learn more about using Tambayan? Read the community rules and privacy information, or visit the Freedom Wall.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/wall" className="px-5 py-3.5 rounded-lg bg-neutral-900 dark:bg-emerald-600 text-white text-center font-mono text-[11px] font-bold uppercase tracking-wider">
              Freedom Wall
            </Link>
            <Link href="/guidelines" className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-neutral-200 bg-white text-neutral-800'}`}>
              Community Guidelines
            </Link>
            <Link href="/privacy" className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-neutral-200 bg-white text-neutral-800'}`}>
              Privacy Policy
            </Link>
            <Link href="/chat/setup" className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-neutral-200 bg-white text-neutral-800'}`}>
              Anonymous Chat
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
