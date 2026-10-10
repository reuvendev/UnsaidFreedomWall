'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOwnTeamProfile } from '../actions';

export function SettingsForm({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const result = await updateOwnTeamProfile(new FormData(event.currentTarget));
      if (result.success) { setMessage('Display name updated.'); router.refresh(); }
      else setError(result.error || 'Could not update your profile.');
    } catch { setError('Could not update your profile.'); }
    finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="mt-6 space-y-4">
    <div><label htmlFor="displayName" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">Display name</label><input id="displayName" name="displayName" defaultValue={displayName} minLength={2} maxLength={50} required className="w-full rounded-xl border border-neutral-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-neutral-700" /></div>
    <p className="text-xs leading-5 text-neutral-500">This name appears beside the verified checkmark on official posts and replies. Your role and verification cannot be edited here.</p>
    {message && <p role="status" className="text-sm text-emerald-600">{message}</p>}{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    <button disabled={loading} className="rounded-xl bg-neutral-950 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50 dark:bg-white dark:text-neutral-950">{loading ? 'Saving...' : 'Save changes'}</button>
  </form>;
}
