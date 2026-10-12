'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { teamGroups } from './team-data';

function SunIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export default function TeamPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('unsaid_dark_mode');
      setIsDarkMode(
        storedTheme !== null
          ? JSON.parse(storedTheme)
          : window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
      );
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
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${isDarkMode ? 'bg-neutral-900/95 border-neutral-800' : 'bg-white/95 border-neutral-200/80'}`}>
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter">
            TAMBAYAN<span className="text-emerald-600">.</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className={`font-mono text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}>
              ← Back Home
            </Link>
            <button type="button" onClick={toggleDarkMode} aria-label="Toggle dark mode" className={`rounded-xl border p-2 ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'}`}>
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-14">
        <section className="mb-12">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600">Our Team</p>
          <h1 className={`mb-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl ${heading}`}>Meet the TambayanSLU Team</h1>
          <p className={`max-w-2xl text-base leading-relaxed sm:text-lg ${body}`}>
            TambayanSLU is developed and maintained by the TambayanSLU Team. We work together to keep the platform running and improve the experience for our community.
          </p>
        </section>

        <div className="space-y-8">
          {teamGroups.map((group) => (
            <section key={group.name} aria-labelledby={`${group.name.toLowerCase()}-team`}>
              <div className="mb-4">
                <h2 id={`${group.name.toLowerCase()}-team`} className={`text-2xl font-extrabold tracking-tight ${heading}`}>{group.name}</h2>
                <p className={`mt-1 text-sm leading-relaxed ${body}`}>{group.description}</p>
              </div>
              {group.members.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.members.map((member) => (
                    <article key={`${group.name}-${member.fullName}`} className={`rounded-2xl border p-5 sm:p-6 ${card}`}>
                      <h3 className={`text-lg font-bold ${heading}`}>{member.fullName}</h3>
                      <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600">{member.role}</p>
                      {member.description && <p className={`mt-3 text-sm leading-relaxed ${body}`}>{member.description}</p>}
                    </article>
                  ))}
                </div>
              ) : (
                <div className={`rounded-2xl border px-5 py-6 ${card}`}>
                  <p className={`text-sm ${body}`}>Member details will be added after full names and roles are confirmed.</p>
                </div>
              )}
            </section>
          ))}
        </div>

        <section className={`mt-10 rounded-2xl border p-6 sm:p-8 ${card}`}>
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600">Independent Student Project</p>
          <p className={`text-sm leading-relaxed sm:text-base ${body}`}>
            TambayanSLU is an independent, student-led project. It is not officially affiliated with, associated with, authorized by, endorsed by, or connected with Saint Louis University or any of its offices.
          </p>
        </section>

        <div className={`mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-8 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <Link href="/about" className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-500">About TambayanSLU →</Link>
        </div>
      </main>
    </div>
  );
}
