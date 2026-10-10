'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { createTeamSession } from '../actions';

export default function TeamLoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await createTeamSession(String(form.get('email')), String(form.get('password')));
      if (!result.success) {
        setError(result.error || 'Access denied.');
        return;
      }
      window.location.assign('/team');
    } catch {
      setError('Unable to sign in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-12 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <section className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-xl shadow-neutral-200/40 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/20 sm:p-9">
        <div className="mb-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">TambayanSLU Team</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Team sign in</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">Private access for authorized TambayanSLU Team members. Public registration is not available.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="team-email" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">Email</label>
            <input id="team-email" name="email" type="email" autoComplete="email" required className="w-full rounded-xl border border-neutral-300 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-neutral-700" />
          </div>
          <div>
            <label htmlFor="team-password" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">Password</label>
            <input id="team-password" name="password" type="password" autoComplete="current-password" required className="w-full rounded-xl border border-neutral-300 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-neutral-700" />
          </div>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-emerald-300">
            {loading ? 'Signing in...' : 'Sign in securely'}
          </button>
        </form>
        <Link href="/" className="mt-6 block text-center font-mono text-[10px] uppercase tracking-wider text-neutral-500 hover:text-emerald-600">Back to TambayanSLU</Link>
      </section>
    </main>
  );
}
