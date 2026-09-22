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

const rules = [
  {
    number: '01',
    title: 'Anonymous Participation & Moderation',
    content: (
      <>
        Freedom Wall posts use an automated Louisian alias instead of publicly displaying the
        poster's real name. Submissions are reviewed before publication to help keep the
        community safe and organized. Anonymity should not be treated as permission to violate
        these guidelines or harm another person.
      </>
    ),
  },
  {
    number: '02',
    title: 'No Harassment or Bullying',
    content: (
      <>
        Do not use Tambayan to target, humiliate, threaten, intimidate, or repeatedly attack
        another person. Campus rants, disagreements, confessions, and criticism may be shared,
        but targeted bullying, hate speech, malicious personal attacks, and harassment may be
        rejected or removed.
      </>
    ),
  },
  {
    number: '03',
    title: 'Protect Personal Information',
    content: (
      <>
        Do not share private or sensitive information that could expose or identify another
        person without their consent. This includes home addresses, phone numbers, private
        contact details, account credentials, identification numbers, or similar sensitive
        information. Nicknames or public social media handles may be mentioned when doing so
        does not expose sensitive information, facilitate harassment, or put someone at risk.
      </>
    ),
  },
  {
    number: '04',
    title: 'No Threats or Promotion of Harm',
    content: (
      <>
        Content that contains credible threats, encourages violence, promotes self-harm toward
        another person, or calls for someone to be physically harmed is not allowed. If a post
        appears to present an immediate safety concern, it may be removed or withheld from
        publication.
      </>
    ),
  },
  {
    number: '05',
    title: 'No Hate Speech or Discriminatory Attacks',
    content: (
      <>
        Do not attack or degrade people based on protected or personal characteristics. Content
        that promotes hatred, dehumanization, exclusion, or violence against a person or group
        may be rejected or removed.
      </>
    ),
  },
  {
    number: '06',
    title: 'No Sexual Exploitation or Non-Consensual Content',
    content: (
      <>
        Sexual exploitation, sexual content involving minors, non-consensual intimate material,
        requests for exploitative sexual content, or attempts to distribute such material are
        prohibited. Do not upload or link to intimate material involving another person without
        their consent.
      </>
    ),
  },
  {
    number: '07',
    title: 'No Impersonation or Deceptive Identity Claims',
    content: (
      <>
        Do not pretend to be another student, faculty member, organization, school office, or
        other person in a way that is intended to deceive or harm others. Anonymous participation
        is allowed, but impersonation is not.
      </>
    ),
  },
  {
    number: '08',
    title: 'No Spam, Scams, or Malicious Links',
    content: (
      <>
        Repetitive junk posts, scams, phishing attempts, suspicious downloads, malicious links,
        and misleading promotions are not allowed. Commercial advertising or repeated
        self-promotion may also be rejected when it disrupts the purpose of the community.
      </>
    ),
  },
  {
    number: '09',
    title: 'Share Responsibly',
    content: (
      <>
        Tambayan welcomes campus experiences, academic struggles, questions, confessions,
        relationships, opinions, stories, and everyday thoughts. Before submitting something,
        consider whether it unnecessarily exposes, targets, or harms another person. You are
        responsible for the content you choose to submit.
      </>
    ),
  },
    {
    number: '09',
    title: 'Share Responsibly',
    content: (
      <>
        Tambayan welcomes campus experiences, academic struggles, questions,
        confessions, relationships, opinions, stories, and everyday thoughts.
        Before submitting something, consider whether it unnecessarily exposes,
        targets, or harms another person. You are responsible for the content
        you choose to submit.
      </>
    ),
  },
  {
    number: '10',
    title: 'No Sexual Harassment',
    content: (
      <>
        Do not use Tambayan to make targeted unwanted sexual remarks, sexual
        threats, repeated sexual advances, or other forms of sexual harassment
        toward another person. Discussions about relationships, attraction,
        dating, or sexual topics may be allowed when they do not target,
        exploit, or harass another person.
      </>
    ),
  },
  {
    number: '11',
    title: 'No Illegal or Harmful Activity',
    content: (
      <>
        Do not use Tambayan to facilitate scams, exploitation, unauthorized
        access to accounts or systems, distribution of unlawfully obtained
        private information, or other unlawful activities. Content may be
        rejected or removed when there is a reasonable basis to believe that
        its publication would violate applicable law or create a serious safety
        risk.
      </>
    ),
  },
  {
    number: '12',
    title: 'Zero Tolerance for Sexual Exploitation of Minors',
    content: (
      <>
        Sexual content involving anyone under 18, including sexual images,
        videos, solicitation, grooming, exploitation, or attempts to obtain or
        distribute such material, is strictly prohibited. Tambayan may remove
        such content and take appropriate action when necessary to protect users
        or comply with applicable law.
      </>
    ),
  },
  {
    number: '13',
    title: 'Respect Copyright & Other People’s Content',
    content: (
      <>
        Do not upload or distribute content that you do not have the right or
        permission to share. Tambayan may remove material when appropriate,
        including following a legitimate complaint from a rights holder.
      </>
    ),
  },
  {
    number: '14',
    title: 'Philippine Law Still Applies',
    content: (
      <>
        Tambayan is an anonymous community, but anonymity does not exempt users
        from applicable Philippine law. Content may be restricted, preserved,
        or removed when reasonably necessary to protect users, enforce these
        guidelines, comply with applicable legal obligations, or respond to
        valid lawful requests from competent authorities.
      </>
    ),
  },
];

export default function GuidelinesPage() {
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
          <Link href="/" className="font-mono text-xl font-black tracking-tighter">
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
            Community Standards & Safety
          </p>

          <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6 ${heading}`}>
            Community Guidelines
          </h1>
          <p className="font-mono text-[11px] text-neutral-500 mb-6">
            Last updated: September 23, 2026
          </p>

          <div className={`space-y-4 text-base leading-relaxed ${body}`}>
            <p>
              Tambayan is a space for Louisians to share thoughts, stories, questions,
              experiences, and conversations anonymously. These guidelines explain what is
              expected from everyone who uses the platform.
            </p>

            <p>
              Being anonymous does not remove responsibility. Content may be reviewed,
              rejected, reported, or removed when it violates these guidelines. The goal is to
              allow open expression while protecting the privacy and safety of other members of
              the community.
            </p>

            <p>
              Anonymous Chat is available only to users who are at least
              18 years old. By entering Anonymous Chat, you confirm that
              you meet this age requirement.
            </p>

          </div>
        </section>

        {/* AGE REQUIREMENT */}
        <section className="mb-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2">
            18+ Community
          </p>

          <h2
            className={`text-xl font-extrabold tracking-tight mb-3 ${heading}`}
          >
            You must be at least 18 years old to use Tambayan.
          </h2>

          <p
            className={`text-sm sm:text-base leading-relaxed ${body}`}
          >
            Tambayan&apos;s Freedom Wall, Anonymous Chat, and other
            community features are intended only for users who are
            18 years old or older. By using these features, you confirm
            that you meet this age requirement.
          </p>
        </section>

        <section
          className={`rounded-2xl border p-6 sm:p-8 mb-5 ${
            isDarkMode
              ? 'bg-emerald-950/20 border-emerald-900/50'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Before You Post
          </p>
          <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>
            Express yourself without putting someone else at risk.
          </h2>
          <p className={`text-sm sm:text-base leading-relaxed ${body}`}>
            You can share difficult experiences, disagreements, frustrations, and personal
            stories. Focus on the experience or issue instead of using anonymity to expose,
            threaten, humiliate, or organize harassment against another person.
          </p>
        </section>

        <div className="space-y-5">
          {rules.map((rule) => (
            <section key={rule.number} className={`rounded-2xl border p-6 sm:p-8 ${card}`}>
              <div className="flex gap-4">
                <span className="shrink-0 font-mono text-xs font-black text-emerald-600 pt-1">
                  {rule.number}
                </span>

                <div>
                  <h2 className={`text-lg font-bold tracking-tight mb-3 ${heading}`}>
                    {rule.title}
                  </h2>
                  <p className={`text-sm sm:text-base leading-relaxed ${body}`}>
                    {rule.content}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* PHILIPPINE LAW & SAFETY */}
        <section
          className={`rounded-2xl border p-6 sm:p-8 mt-5 ${
            isDarkMode
              ? 'bg-blue-950/20 border-blue-900/50'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-3">
            Philippine Law & Safety
          </p>

          <h2
            className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}
          >
            These guidelines work alongside applicable Philippine laws.
          </h2>

          <div
            className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}
          >
            <p>
              Depending on the circumstances, relevant laws may include the
              Data Privacy Act of 2012 (RA 10173), Cybercrime Prevention Act
              of 2012 (RA 10175), Safe Spaces Act (RA 11313), Anti-Photo and
              Video Voyeurism Act of 2009 (RA 9995), and laws protecting
              children from online sexual abuse and exploitation.
            </p>

            <p>
              Tambayan may remove, restrict, or preserve content when reasonably
              necessary to enforce these guidelines, protect the community,
              comply with applicable legal obligations, or respond to valid
              lawful requests from competent authorities.
            </p>

            <p className={`font-semibold ${heading}`}>
              Being anonymous on Tambayan does not provide immunity from
              applicable law.
            </p>
          </div>

          <Link
            href="/privacy"
            className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-500"
          >
            Read Privacy Policy →
          </Link>
        </section>

        <section className={`rounded-2xl border p-6 sm:p-8 mt-5 ${card}`}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Reporting Content
          </p>

          <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>
            See something that breaks the rules?
          </h2>

          <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
            <p>
              Freedom Wall posts include a reporting feature. If you believe a published post
              violates these guidelines, submit a report so it can be brought to the attention
              of moderation.
            </p>

            <p>
              A report does not automatically mean that content will be removed. Reports may be
              reviewed based on the content and context of the post. Content found to violate
              these guidelines may be removed or otherwise restricted.
            </p>
          </div>

          <Link
            href="/wall"
            className="inline-flex mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500"
          >
            Visit Freedom Wall →
          </Link>
        </section>

        <section className={`rounded-2xl border p-6 sm:p-8 mt-5 ${card}`}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Moderation Decisions
          </p>

          <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>
            Why a submission may not appear
          </h2>

          <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${body}`}>
            <p>
              Submitting an entry does not guarantee publication. A submission may be rejected
              when it violates these guidelines, contains sensitive personal information,
              appears to be spam, creates a significant safety concern, or is otherwise
              unsuitable for the community.
            </p>

            <p>
              Moderation cannot guarantee that every violation will be identified immediately.
              Published content can therefore still be reported for another review.
            </p>
          </div>
        </section>

        <section className={`rounded-2xl border p-6 sm:p-8 mt-5 ${card}`}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3">
            Anonymous Chat
          </p>

          <h2 className={`text-2xl font-extrabold tracking-tight mb-4 ${heading}`}>
            The same basic standards apply to conversations.
          </h2>

          <p className={`text-sm sm:text-base leading-relaxed ${body}`}>
            Anonymous Chat should not be used for harassment, threats, scams, exploitation,
            malicious links, or attempts to obtain another user&apos;s sensitive information.
            Users should be careful about voluntarily sharing identifying or private information
            with someone they meet through anonymous chat.
          </p>
        </section>

        <section
          className={`mt-10 pt-8 border-t ${
            isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        >
          <h2 className={`text-xl font-bold mb-2 ${heading}`}>
            Learn more
          </h2>

          <p className={`text-sm leading-relaxed mb-5 ${body}`}>
            Read more about how Tambayan works, how information is handled, or return to the
            Freedom Wall.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/wall"
              className="px-5 py-3.5 rounded-lg bg-neutral-900 dark:bg-emerald-600 text-white text-center font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              Freedom Wall
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

        <p className={`font-mono text-[10px] leading-relaxed mt-8 text-center ${isDarkMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
          Tambayan SLU is an independent student platform and is not officially affiliated with
          or endorsed by Saint Louis University.
        </p>
      </main>
    </div>
  );
}
