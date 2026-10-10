'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { logoutTeam } from '../actions';
import { TeamRoleBadge } from '@/components/TeamRoleBadge';
import { VerifiedIcon } from '@/components/VerifiedIcon';
import { canManageMembers, canModerate, TeamRole } from '@/lib/team/types';

type Props = { children: ReactNode; member: { displayName: string; role: TeamRole } };

export function TeamShell({ children, member }: Props) {
  const pathname = usePathname();
  const links = [
    { href: '/team', label: 'Dashboard', show: true },
    { href: '/team/moderation', label: 'Moderation', show: canModerate(member.role) },
    { href: '/team/members', label: 'Members', show: canManageMembers(member.role) },
    { href: '/team/settings', label: 'Settings', show: true },
  ].filter((link) => link.show);

  return (
    <div className="min-h-screen bg-stone-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-stone-50/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90 lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/team" className="font-black tracking-tight">TambayanSLU <span className="text-emerald-600">Team</span></Link>
          <div className="flex items-center gap-2"><VerifiedIcon className="h-4 w-4 text-blue-500" /><TeamRoleBadge role={member.role} /></div>
        </div>
        <nav className="flex overflow-x-auto border-t border-neutral-200 px-2 dark:border-neutral-800">
          {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} className={`whitespace-nowrap border-b-2 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-wider ${pathname === link.href ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-neutral-500'}`}>{link.label}</Link>)}
        </nav>
      </header>
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 lg:flex">
          <Link href="/team" className="text-xl font-black tracking-tight">TambayanSLU <span className="text-emerald-600 dark:text-emerald-400">Team</span></Link>
          <div className="mt-8 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center gap-2 font-semibold"><span className="truncate">{member.displayName}</span><VerifiedIcon className="h-4 w-4 shrink-0 text-blue-500" /></div>
            <div className="mt-2"><TeamRoleBadge role={member.role} /></div>
          </div>
          <nav className="mt-8 space-y-1">
            {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition ${pathname === link.href ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white'}`}>{link.label}</Link>)}
          </nav>
          <div className="mt-auto space-y-2">
            <Link href="/wall" className="block rounded-lg px-3 py-2 text-sm text-neutral-500 hover:text-emerald-600">Open Freedom Wall</Link>
            <form action={logoutTeam}><button className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">Sign out</button></form>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
