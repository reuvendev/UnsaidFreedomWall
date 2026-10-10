import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TeamRoleBadge } from '@/components/TeamRoleBadge';
import { VerifiedIcon } from '@/components/VerifiedIcon';
import { adminDb } from '@/lib/team/firebase-admin';
import { getServerTeamSession } from '@/lib/team/team-server';
import { canModerate } from '@/lib/team/types';

export default async function TeamDashboardPage() {
  const session = await getServerTeamSession();
  if (!session) redirect('/team/login');
  const announcementsSnapshot = await adminDb().collection('teamAnnouncements').orderBy('createdAt', 'desc').limit(5).get().catch(() => null);
  const announcements = announcementsSnapshot?.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: String(data.title || 'Team announcement'),
      message: String(data.message || ''),
      date: data.createdAt?.toDate?.().toLocaleDateString('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }) || 'Recently',
    };
  }) || [];

  return (
    <div className="mx-auto max-w-5xl">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">Team Portal</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Welcome, {session.displayName}</h1>
        <VerifiedIcon className="h-6 w-6 text-blue-500" />
        <TeamRoleBadge role={session.role} />
      </div>
      <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">Your TambayanSLU Team account is active and verified.</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/wall" className="rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-emerald-400 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600">Community</p>
          <h2 className="mt-3 text-lg font-bold">Freedom Wall</h2>
          <p className="mt-2 text-sm text-neutral-500">Read the community and choose when to respond with your official profile.</p>
        </Link>
        {canModerate(session.role) && <Link href="/team/moderation" className="rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-emerald-400 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-600">Authorized</p>
          <h2 className="mt-3 text-lg font-bold">Moderation workspace</h2>
          <p className="mt-2 text-sm text-neutral-500">Review pending posts, reports, decisions, and moderation guidance.</p>
        </Link>}
        <Link href="/team/settings" className="rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-emerald-400 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-600">Account</p>
          <h2 className="mt-3 text-lg font-bold">Profile settings</h2>
          <p className="mt-2 text-sm text-neutral-500">Update your public display name and review your Team access.</p>
        </Link>
      </div>

      <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Recent team announcements</h2><span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Internal</span></div>
        {announcements.length ? <div className="mt-5 divide-y divide-neutral-200 dark:divide-neutral-800">{announcements.map((announcement) => <article key={announcement.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{announcement.title}</h3><time className="font-mono text-[10px] text-neutral-400">{announcement.date}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-500 dark:text-neutral-400">{announcement.message}</p></article>)}</div> : <p className="mt-5 rounded-xl bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500 dark:bg-neutral-950">No team announcements yet.</p>}
      </section>
    </div>
  );
}
