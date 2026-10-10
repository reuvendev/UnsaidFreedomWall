import { roleLabel, TeamRole } from '@/lib/team/types';

const colors: Record<TeamRole, string> = {
  owner: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  admin: 'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  moderator: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  marketing: 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300',
};

export function TeamRoleBadge({ role }: { role: TeamRole }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${colors[role]}`}>
      {roleLabel(role)}
    </span>
  );
}
