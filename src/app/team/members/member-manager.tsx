'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { changeTeamMemberRole, createTeamMember, resetTeamMemberPassword, setTeamMemberActive, type MemberSummary } from '../member-actions';

const roles = [ ['admin','Team Admin'],['developer','Developer'],['moderator','Moderator'],['social','Social Media Manager'],['writer','Content Writer'],['community','Community Manager'],['qa','QA Tester'],['designer','Designer'] ] as const;
const field = 'w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none';
export default function MemberManager({ initialMembers }: {initialMembers: MemberSummary[]}) {
  const router = useRouter();
  const [username,setUsername] = useState('');
  const [password,setPassword] = useState('');
  const [role,setRole] = useState('social');
  const [message,setMessage] = useState('');
  const [busy,start] = useTransition();
  const [selectedRoles,setSelectedRoles] = useState<Record<string,string>>({});
  const [resets,setResets] = useState<Record<string,string>>({});
  function run(operation: () => Promise<{ok:boolean;message:string}>, after?:()=>void) {
    setMessage('');
    start(async () => {
      try { const result = await operation(); setMessage(result.message); if (result.ok) { after?.(); router.refresh(); } }
      catch { setMessage('Operation failed. Check your session and server configuration.'); }
    });
  }
  return <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-10 sm:px-8">
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><Link href="/team" className="text-xs text-emerald-400 hover:underline">← Team dashboard</Link><p className="mt-3 text-xs font-semibold uppercase tracking-widest text-emerald-400">TambayanSLU</p><h1 className="mt-1 text-3xl font-bold">Team Members</h1><p className="mt-2 text-sm text-neutral-400">Create accounts and manage team access. Owner only.</p></div>
        <span className="rounded-xl border border-neutral-800 px-4 py-2 text-sm">{initialMembers.length} members</span>
      </header>
      {message && <p role="status" className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-sm">{message}</p>}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Create team member</h2>
        <p className="mt-1 text-sm text-neutral-400">No public signups. Give each recruit a unique password through a private channel.</p>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={e=>{e.preventDefault();run(()=>createTeamMember({username,password,role}),()=>{setUsername('');setPassword('');});}}>
          <label className="space-y-2 text-sm">Username<input className={field} value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} required pattern="[a-z0-9_]{3,30}" placeholder="social01" autoComplete="off"/></label>
          <label className="space-y-2 text-sm">Temporary password<input className={field} value={password} onChange={e=>setPassword(e.target.value)} minLength={12} maxLength={128} required type="password" autoComplete="new-password" placeholder="At least 12 characters"/></label>
          <label className="space-y-2 text-sm">Assign role<select className={field} value={role} onChange={e=>setRole(e.target.value)}>{roles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <div className="flex items-end"><button disabled={busy} className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50">{busy?'Working…':'Create account'}</button></div>
        </form>
      </section>
      <section className="space-y-4"><h2 className="text-lg font-semibold">Existing members</h2>
        {initialMembers.map(member=><article key={member.uid} className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">@{member.username}</p><p className="mt-1 text-xs text-neutral-500">{member.role} · {member.active?'Active':'Disabled'}</p></div><span className={`rounded-full px-3 py-1 text-xs ${member.active?'bg-emerald-500/10 text-emerald-400':'bg-red-500/10 text-red-400'}`}>{member.active?'Active':'Disabled'}</span></div>
          {member.role !== 'owner' && <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2"><select aria-label={`Role for ${member.username}`} className={`${field} sm:w-56`} value={selectedRoles[member.uid]??member.role} onChange={e=>setSelectedRoles(x=>({...x,[member.uid]:e.target.value}))}>{roles.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><button disabled={busy} onClick={()=>run(()=>changeTeamMemberRole(member.uid,selectedRoles[member.uid]??member.role))} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm disabled:opacity-50">Save role</button><button disabled={busy} onClick={()=>{if(window.confirm(`${member.active?'Disable':'Enable'} @${member.username}?`))run(()=>setTeamMemberActive(member.uid,!member.active));}} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm disabled:opacity-50">{member.active?'Disable':'Enable'}</button></div>
            <div className="flex flex-wrap gap-2"><input aria-label={`New password for ${member.username}`} type="password" minLength={12} placeholder="New password (12+ chars)" value={resets[member.uid]??''} onChange={e=>setResets(x=>({...x,[member.uid]:e.target.value}))} className={`${field} sm:w-60`}/><button disabled={busy || (resets[member.uid]??'').length<12} onClick={()=>{if(window.confirm(`Reset password for @${member.username}?`))run(()=>resetTeamMemberPassword(member.uid,resets[member.uid]||''),()=>setResets(x=>({...x,[member.uid]:''})));}} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm disabled:opacity-50">Reset password</button></div>
          </div>}
        </article>)}
      </section>
    </div>
  </main>;
}
