import { TeamRoleBadge } from '@/components/TeamRoleBadge';
import { VerifiedIcon } from '@/components/VerifiedIcon';
import { redirect } from 'next/navigation';
import { getServerTeamSession } from '@/lib/team/team-server';
import { logoutTeam } from '../../actions';
import { SettingsForm } from '../../components/SettingsForm';

export default async function TeamSettingsPage() {
  const session = await getServerTeamSession();
  if (!session) redirect('/team/login');
  return <div className="mx-auto max-w-2xl">
    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-600">Account</p><h1 className="mt-3 text-3xl font-black tracking-tight">Team settings</h1>
    <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{session.displayName}</span><VerifiedIcon className="h-4 w-4 text-blue-500" /><TeamRoleBadge role={session.role} /><span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Active</span></div>
      <p className="mt-2 text-sm text-neutral-500">{session.email}</p><SettingsForm displayName={session.displayName} />
    </section>
    <section className="mt-5 rounded-2xl border border-rose-200 bg-white p-6 dark:border-rose-950 dark:bg-neutral-900"><h2 className="font-bold">Session</h2><p className="mt-1 text-sm text-neutral-500">Sign out of the TambayanSLU Team Portal on this device.</p><form action={logoutTeam} className="mt-4"><button className="rounded-xl border border-rose-300 px-4 py-2.5 font-mono text-xs font-bold uppercase text-rose-700 dark:border-rose-900 dark:text-rose-300">Sign out</button></form></section>
  </div>;
}
