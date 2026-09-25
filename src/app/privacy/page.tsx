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

export default function PrivacyPolicyPage() {
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

  const heading = isDarkMode ? 'text-white' : 'text-neutral-900';
  const body = isDarkMode ? 'text-neutral-400' : 'text-neutral-600';
  const card = isDarkMode
    ? 'bg-neutral-900/60 border-neutral-800'
    : 'bg-white border-neutral-200/80';

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

            <button type="button" onClick={toggleDarkMode} aria-label="Toggle dark mode" className={`p-2 rounded-xl border ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'}`}>
              {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-14 pb-24">
        <section className="mb-12">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Privacy & Transparency
          </p>
          <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4 ${heading}`}>
            Privacy & Cookie Policy
          </h1>
          <p className="font-mono text-[11px] text-neutral-500 mb-6">
            Last updated: September 23, 2026
          </p>

          <div className={`space-y-4 text-base leading-relaxed ${body}`}>
            <p>
              This Privacy Policy explains what information Tambayan SLU processes when you use the
              Freedom Wall, Anonymous Chat, and other features of the website, why that information
              is used, and the choices available to you.
            </p>
            <p>
              Tambayan is designed for anonymous community participation. You do not need to create
              a public profile or provide your real name or email address to use the main community
              features.
            </p>
            <p>
              Tambayan is intended only for users who are 18 years old or
              older. By using the website's community features, you
              confirm that you meet this age requirement.
            </p>
          </div>
        </section>

        <div className="space-y-5">
          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">01 · Information We Process</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>What Tambayan handles</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Tambayan does not require a traditional user account for its main anonymous features.
                We do not ask you to provide a real name, school ID number, email address, or public
                profile in order to post on the Freedom Wall.
              </p>
              <p>Depending on the feature you use, Tambayan may process information such as:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>the text and category of a Freedom Wall submission;</li>
                <li>images or other content you voluntarily attach to a submission;</li>
                <li>replies, reactions, votes, and reports associated with community content;</li>
                <li>anonymous identifiers used by the application to distinguish users or devices;</li>
                <li>encrypted anonymous chat messages and information required for chat matching and operation, with readable conversation evidence provided to moderators when a chatroom is reported;</li>
                <li>timestamps and basic metadata required to operate, moderate, and display content; and</li>
                <li>preferences stored in your browser, such as dark mode and certain interaction states.</li>
              </ul>
              <p>
                Do not include information in a post, image, report, or chat message that you do not
                want other users or the service to process.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              02 · Anonymous User Identification
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
            >
              How Tambayan identifies users without requiring an account
            </h2>

            <div
              className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}
            >
              <p>
                Tambayan does not require users to create a traditional account
                using a real name, email address, school ID, or password for its
                main anonymous community features.
              </p>

              <p>
                For Anonymous Chat, Tambayan uses an anonymous user ID associated
                with the user&apos;s browser. This identifier is stored locally in
                the browser using <code>localStorage</code> under the application&apos;s
                user ID storage key.
              </p>

              <p>
                The anonymous user ID allows Tambayan to distinguish one chat user
                from another and support features such as chat sessions and
                matching without requiring users to publicly identify themselves.
              </p>

              <p>
                The identifier itself is not intended to contain your real name,
                email address, school ID, or other directly identifying profile
                information. Clearing your browser&apos;s local storage may remove
                the identifier and may cause Tambayan to treat the browser as a
                different anonymous user.
              </p>

              <p>
                Anonymous identification does not prevent users from identifying
                themselves through information they voluntarily share. Avoid
                including personal or sensitive information in posts or
                conversations if you want to remain anonymous.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">03 · IP Addresses</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Tambayan does not intentionally store IP addresses in its application database</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Tambayan does not use IP addresses as user identities and does not intentionally save
                visitors&apos; IP addresses as part of Freedom Wall posts, anonymous user profiles, or
                chat identities in its application database.
              </p>
              <p>
                However, Tambayan relies on third-party infrastructure and service providers to deliver
                the website and its features. Those providers may independently receive or process
                technical information, including IP addresses, as part of normal network requests,
                security, fraud prevention, diagnostics, hosting, or service operation. Their handling
                of that information is governed by their own policies.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">04 · Browser Storage</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Local storage and preferences</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Tambayan uses browser storage such as <code className={`font-mono text-xs px-2 py-0.5 border rounded ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-200' : 'bg-neutral-50 border-neutral-200 text-neutral-800'}`}>localStorage</code> to remember certain preferences and interaction states.
              </p>
              <p>
                Examples may include dark mode, anonymous identifiers, voting or reporting states,
                streak information, and other settings needed to make features work consistently on
                the same browser or device.
              </p>
              <p>
                Some values remain only in your browser, while an anonymous identifier may be used in
                requests to Tambayan&apos;s backend so the application can associate permitted actions
                with the same anonymous user or device. Clearing browser data may reset some of these
                preferences or identifiers.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">05 · User-Submitted Content</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Posts, images, replies, and reports</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Information you voluntarily submit through Tambayan may be stored so the requested
                feature can operate. This can include pending and approved Freedom Wall posts, images,
                replies, reactions, reports, moderation information, and related timestamps or metadata.
              </p>
              <p>
                Approved Freedom Wall content is intended to be publicly visible. Do not submit private
                information, confidential material, or content that you do not have permission to share.
              </p>
              <p>
                Submitted content may be reviewed for moderation and may be rejected, restricted, or
                removed when it violates the Community Guidelines.
              </p>
            </div>
            <Link href="/guidelines" className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500">
              Read Community Guidelines →
            </Link>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              06 · Anonymous Chat
            </p>

            <h2
              className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
            >
              Encrypted and anonymous conversations
            </h2>

            <div
              className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}
            >
              <p>
                Anonymous Chat uses an anonymous user ID stored in the user's
                browser to distinguish users without requiring a traditional
                account, real name, email address, or school ID.
              </p>

              <p>
                Chat messages are encrypted so that conversations are not normally
                readable by administrators. Messages are decrypted on the
                participants' devices while they are using the chat.
              </p>

              <p>
                If a user reports a chatroom, the conversation may be decrypted on
                the reporting user's device and a copy of the conversation may
                be submitted as evidence for moderation. Tambayan administrators
                can then review the reported conversation to investigate possible
                violations of the Community Guidelines.
              </p>

              <p>
                Administrators do not normally have access to the readable contents
                of private chat conversations. A readable copy becomes available
                for moderation when a participant chooses to report the chatroom.
              </p>

              <p>
                Tambayan may still process information necessary to operate
                Anonymous Chat, such as anonymous user IDs, encrypted message data,
                chatroom information, timestamps, and matching information.
              </p>

              <p>
                When a chatroom is closed, the chatroom and its associated
                conversation data are retained temporarily and are deleted after
                24 hours.
              </p>

              <p>
                Users should not share passwords, home addresses, financial
                information, school credentials, or other sensitive personal
                information with people they meet through Anonymous Chat.
                Information you voluntarily reveal during a conversation may allow
                another user to identify you.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">07 · How Information Is Used</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Why the service processes this information</h2>
            <p className={`text-sm sm:text-base leading-relaxed mb-4 ${body}`}>Information may be used to:</p>
            <ul className={`list-disc pl-5 space-y-2 text-sm sm:text-base leading-relaxed ${body}`}>
              <li>provide and maintain the Freedom Wall and Anonymous Chat;</li>
              <li>display submitted and approved community content;</li>
              <li>generate or maintain anonymous identities and session functionality;</li>
              <li>process reactions, replies, reports, and other requested interactions;</li>
              <li>moderate submissions and investigate reported content;</li>
              <li>protect the service from abuse, spam, or misuse; and</li>
              <li>maintain, troubleshoot, and improve Tambayan&apos;s functionality.</li>
            </ul>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">08 · Service Providers</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Third-party infrastructure</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Tambayan relies on third-party services for parts of its infrastructure, such as
                database storage, application hosting, content delivery, and other technical functions.
                Information needed to provide these services may therefore be processed by the relevant
                provider.
              </p>
              <p>
                Tambayan currently uses technologies and infrastructure that may include Firebase /
                Google Cloud services and Vercel. If additional providers are introduced for features
                such as media storage, analytics, security, or advertising, this policy may be updated
                to reflect those changes.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">09 · Advertising & Cookies</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Google AdSense and advertising technologies</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Tambayan has applied to participate in Google AdSense. If advertising is enabled,
                Google and its advertising partners may use cookies, web beacons, device identifiers,
                or similar technologies to provide, measure, personalize, and protect advertising,
                subject to applicable consent requirements and Google&apos;s policies.
              </p>
              <p>
                Advertising providers may process information independently under their own privacy
                policies. Tambayan does not control the information that Google or other third-party
                providers receive directly through their technologies.
              </p>
              <p>
                Where required, users may be provided with choices regarding personalized advertising
                or consent for advertising technologies. Advertising practices on this page will be
                updated as the site&apos;s advertising implementation changes.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">10 · Data Retention & Removal</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>How long information may remain</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Content and related information may be retained for as long as needed to operate the
                relevant feature, maintain the community, handle moderation or reports, prevent abuse,
                comply with applicable obligations, or resolve technical issues.
              </p>
              <p>
                Public posts may remain available until they are removed by moderation or through an
                available removal process. Because Tambayan does not require a traditional account,
                verifying ownership of an anonymous submission may be limited by the information or
                identifiers available to the service.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">11 · Your Privacy Choices</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Controls available to you</h2>
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                You can choose not to submit personal information through posts or chat, clear
                Tambayan-related browser storage through your browser settings, stop using the
                service, or contact Tambayan regarding a privacy concern or content-removal request.
              </p>
              <p>
                Clearing local browser data can remove locally stored preferences and may create a new
                anonymous identifier the next time you use the service.
              </p>
            </div>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
              12 · Philippine Data Privacy Act
            </p>

            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>
              Your rights under Philippine data privacy law
            </h2>

            <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
              <p>
                Tambayan recognizes the principles and requirements of Republic Act
                No. 10173, also known as the Data Privacy Act of 2012, its Implementing
                Rules and Regulations, and applicable issuances of the National Privacy
                Commission (NPC).
              </p>

              <p>
                Personal data processed through Tambayan is handled in accordance with
                the principles of transparency, legitimate purpose, and proportionality.
                Tambayan aims to process only information reasonably necessary to
                operate, moderate, secure, and improve the service.
              </p>

              <p>
                Where applicable under Philippine data privacy law, data subjects may
                exercise rights including the right to be informed, access personal
                data, object to certain processing, request correction, request erasure
                or blocking, obtain data portability where applicable, claim damages,
                and file a complaint with the National Privacy Commission.
              </p>

              <p>
                Because Tambayan primarily operates through anonymous identifiers rather
                than traditional user accounts, fulfilling certain requests may require
                enough information to reasonably identify the relevant data without
                compromising the privacy of other users.
              </p>

              <p>
                Tambayan takes reasonable organizational and technical measures to
                protect personal data against unauthorized access, disclosure,
                alteration, loss, or other unlawful processing. However, no online
                service or method of electronic storage can guarantee absolute security.
              </p>
            </div>

            <a
              href="https://privacy.gov.ph/data-privacy-act/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
            >
              Learn about the Data Privacy Act →
            </a>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">13 · Contact</p>
            <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>Questions or privacy concerns</h2>
            <p className={`text-sm sm:text-base leading-relaxed ${body}`}>
              If you have a question about this Privacy Policy, believe content exposes your personal
              information, or want to raise a privacy concern, please use Tambayan&apos;s contact page.
            </p>
            <Link href="/contact" className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500">
              Contact Tambayan →
            </Link>
          </section>

        <section
          className={`rounded-2xl border p-6 sm:p-8 ${
            isDarkMode
              ? 'bg-amber-950/20 border-amber-900/50'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-3">
            Age Requirement
          </p>

          <h2
            className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
          >
            Tambayan is for users aged 18 and above
          </h2>

          <div
            className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}
          >
            <p>
              Tambayan is intended only for individuals who are at least
              18 years old. By using the Freedom Wall, Anonymous Chat, or
              other community features, you confirm that you are 18 years
              old or older.
            </p>

            <p>
              Tambayan does not knowingly provide its community features
              to individuals under the age of 18. If we become aware that
              an underage person is using the service, appropriate action
              may be taken to restrict access or remove relevant content
              where necessary.
            </p>

            <p>
              Because Tambayan does not require a traditional account,
              the service generally relies on users to truthfully confirm
              that they meet the age requirement.
            </p>
          </div>
        </section>


          <section className={`rounded-2xl border p-6 sm:p-8 ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">Independent Community</p>
            <p className={`text-sm sm:text-base leading-relaxed ${body}`}>
              Tambayan SLU is an independent student platform and is not affiliated with, associated
              with, authorized by, endorsed by, or officially connected with Saint Louis University
              or any of its offices.
            </p>
          </section>
        </div>

        <section className={`mt-10 pt-8 border-t ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <h2 className={`text-xl font-bold mb-2 ${heading}`}>Related information</h2>
          <p className={`text-sm leading-relaxed mb-5 ${body}`}>
            Learn more about Tambayan&apos;s community rules and how its anonymous features work.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/guidelines" className="px-5 py-3.5 rounded-lg bg-neutral-900 dark:bg-emerald-600 text-white text-center font-mono text-[11px] font-bold uppercase tracking-wider">
              Community Guidelines
            </Link>
            <Link href="/how-it-works" className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-neutral-200 bg-white text-neutral-800'}`}>
              How It Works
            </Link>
            <Link href="/about" className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-neutral-200 bg-white text-neutral-800'}`}>
              About Tambayan
            </Link>
            <Link href="/wall" className={`px-5 py-3.5 rounded-lg border text-center font-mono text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-neutral-800 bg-neutral-900 text-neutral-200' : 'border-neutral-200 bg-white text-neutral-800'}`}>
              Freedom Wall
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
