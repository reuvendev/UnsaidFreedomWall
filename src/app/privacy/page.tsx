import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            UNSAID.
          </Link>
          <nav className="flex items-center gap-5 font-mono text-[11px] font-bold tracking-widest text-neutral-500 uppercase">
            <Link href="/about" className="hover:text-neutral-900 transition-colors">About</Link>
            <Link href="/guidelines" className="hover:text-neutral-900 transition-colors">Guidelines</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24 space-y-8">
        <div>
          <p className="font-mono text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-4">
            Legal & Compliance
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-neutral-900">
            Privacy Policy
          </h1>
          <p className="text-sm font-mono text-neutral-500">
            Last updated: August 2026
          </p>
        </div>

        <div className="space-y-6 text-neutral-700 text-sm md:text-base leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-neutral-900">
              1. Complete Anonymity & No Data Collection
            </h2>
            <p>
              <strong>Unsaid</strong> is built on a strict privacy-first foundation. We do not collect, store, require, or track any personal user information. There are no user accounts, registration forms, or login requirements. 
            </p>
            <p>
              When you submit a post or a thought to the wall, it is published completely anonymously. We do not track your real identity, email address, or personal profile data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-neutral-900">
              2. Local Device Storage
            </h2>
            <p>
              To improve your user experience (such as remembering which posts you have upvoted or reported), our application utilizes your browser&apos;s local storage (`localStorage`). This data stays entirely on your local device and is never transmitted to or stored on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-neutral-900">
              3. Google AdSense & Third-Party Cookies
            </h2>
            <p>
              To support the hosting and maintenance of Unsaid, we display advertisements via Google AdSense. 
            </p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-xs text-neutral-600">
              <li>Google, as a third-party vendor, uses cookies to serve ads on our site.</li>
              <li>Google&apos;s use of advertising cookies enables it and its partners to serve ads to our users based on their visits to this site and/or other sites on the Internet.</li>
              <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="underline text-neutral-900 font-bold">Google Ads Settings</a>.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-neutral-900">
              4. Content Moderation
            </h2>
            <p>
              All public contributions are vetted via automated filters and community reports. When a post is reported, only the public text content and metadata associated with that specific post are reviewed by moderators to ensure compliance with our safety guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-neutral-900">
              5. Contact
            </h2>
            <p>
              If you have any questions regarding our privacy practices or this policy, you may reach out through our project development channels.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}