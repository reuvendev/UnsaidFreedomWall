'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { logoutTeam, getTeamSession, type TeamSession } from './team-actions';
import ModerationWorkspace from './moderation-workspace';

type Tab = 'overview' | 'tasks' | 'social' | 'content' | 'moderation' | 'team';
type TaskStatus = 'todo' | 'progress' | 'done';
type Task = { id: string; title: string; assignee: string; status: TaskStatus; createdAt: string };
type CampaignStatus = 'idea' | 'draft' | 'ready' | 'published';
type Campaign = { id: string; title: string; platform: string; caption: string; date: string; status: CampaignStatus; createdAt: string };
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◫' }, { id: 'tasks', label: 'Task board', icon: '☷' },
  { id: 'social', label: 'Social media', icon: '◎' }, { id: 'content', label: 'Content', icon: '▤' },
  { id: 'moderation', label: 'Moderation', icon: '◇' }, { id: 'team', label: 'Team', icon: '♧' },
];
const taskStatuses: TaskStatus[] = ['todo', 'progress', 'done'];
const campaignStatuses: CampaignStatus[] = ['idea', 'draft', 'ready', 'published'];
const statusLabel: Record<TaskStatus, string> = { todo: 'To do', progress: 'In progress', done: 'Done' };
const campaignLabel: Record<CampaignStatus, string> = { idea: 'Idea', draft: 'Draft', ready: 'Ready', published: 'Published' };
const inputClass = 'w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-500 placeholder:text-neutral-600';
const buttonClass = 'rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50';
const panelClass = 'rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5';
const makeId = () => crypto.randomUUID();

export default function TeamPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [member, setMember] = useState<TeamSession | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [platform, setPlatform] = useState('Facebook');
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true;
    getTeamSession().then(result => { if (alive) { setMember(result); setAuthenticated(Boolean(result)); if (result?.role === 'moderator') setTab('moderation'); } }).catch(() => { if (alive) setAuthenticated(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    try {
      const t = JSON.parse(localStorage.getItem('tambayanslu_team_tasks_v1') || '[]');
      const c = JSON.parse(localStorage.getItem('tambayanslu_social_campaigns_v1') || '[]');
      setTasks(Array.isArray(t) ? t : []);
      setCampaigns(Array.isArray(c) ? c : []);
    } catch { setTasks([]); setCampaigns([]); }
    setLoaded(true);
  }, [authenticated]);
  useEffect(() => { if (authenticated && loaded) localStorage.setItem('tambayanslu_team_tasks_v1', JSON.stringify(tasks)); }, [tasks, authenticated, loaded]);
  useEffect(() => { if (authenticated && loaded) localStorage.setItem('tambayanslu_social_campaigns_v1', JSON.stringify(campaigns)); }, [campaigns, authenticated, loaded]);
  const taskCounts = useMemo(() => ({ open: tasks.filter(x => x.status !== 'done').length, done: tasks.filter(x => x.status === 'done').length }), [tasks]);
  const planned = campaigns.filter(x => x.status !== 'published').length;
  function addTask(e: React.FormEvent) {
    e.preventDefault(); if (!taskTitle.trim()) return;
    setTasks(current => [{ id: makeId(), title: taskTitle.trim(), assignee: assignee.trim() || 'Unassigned', status: 'todo', createdAt: new Date().toISOString() }, ...current]);
    setTaskTitle(''); setAssignee('');
  }
  function addCampaign(e: React.FormEvent) {
    e.preventDefault(); if (!campaignTitle.trim()) return;
    setCampaigns(current => [{ id: makeId(), title: campaignTitle.trim(), platform, caption: caption.trim(), date, status: 'idea', createdAt: new Date().toISOString() }, ...current]);
    setCampaignTitle(''); setCaption(''); setDate('');
  }
  async function copyCaption(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice('Caption copied.'); } catch { setNotice('Could not copy caption.'); }
  }
  if (authenticated === null) return <main className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-400 text-sm">Checking team session…</main>;
  if (!authenticated) return <main className="min-h-screen grid place-items-center bg-neutral-950 p-6 text-neutral-100"><div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">TAMBAYANSLU · TEAM ACCESS</p><h1 className="mt-3 text-3xl font-bold">Welcome back.</h1><p className="mt-2 text-sm text-neutral-400">Sign in with your personal team username and password.</p><TeamLogin onSuccess={session => { setMember(session); setAuthenticated(true); if (session.role === 'moderator') setTab('moderation'); }} /></div></main>;
  const visibleTabs = tabs.filter(t => member?.role !== 'moderator' || t.id === 'moderation').filter(t => t.id !== 'team' || member?.role === 'owner' || member?.role === 'admin').filter(t => t.id !== 'moderation' || ['owner','admin','moderator'].includes(member?.role || '')).filter(t => t.id !== 'social' || ['owner','admin','social','community'].includes(member?.role || '')).filter(t => t.id !== 'content' || ['owner','admin','writer','social','community'].includes(member?.role || ''));
  return <div className="min-h-screen bg-neutral-950 text-neutral-100 lg:flex">
    <aside className="border-b border-neutral-800 bg-neutral-900/60 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="px-5 py-6"><p className="text-xs font-semibold uppercase tracking-[.2em] text-emerald-400">TAMBAYANSLU</p><h1 className="mt-1 text-xl font-bold">Team Workspace</h1><p className="mt-1 text-xs text-neutral-500">TambayanSLU · {member?.role}</p></div>
      <nav aria-label="Team sections" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
        {visibleTabs.map(item => <button key={item.id} type="button" onClick={() => { setTab(item.id); setNotice(''); }} className={`shrink-0 rounded-xl px-4 py-3 text-left text-sm transition lg:w-full ${tab === item.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}><span className="mr-3" aria-hidden="true">{item.icon}</span>{item.label}</button>)}
      </nav><div className="hidden border-t border-neutral-800 p-5 text-xs text-neutral-500 lg:block">{member?.username} · {member?.role}</div>
    </aside>
    <main className="w-full min-w-0 flex-1 px-4 py-7 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl"><header className="mb-8 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-neutral-500">Internal operations</p><h2 className="mt-1 text-3xl font-bold">{visibleTabs.find(x => x.id === tab)?.label || 'Overview'}</h2></div><div className="flex flex-wrap gap-2">{member?.role === 'owner' && <Link href="/team/members" className="rounded-xl border border-emerald-700 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-950">Manage members</Link>}<Link href="/" className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500">View TambayanSLU ↗</Link><button onClick={async () => { await logoutTeam(); setMember(null); setAuthenticated(false); setLoaded(false); }} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-300">Log out</button></div></header>
      {notice && <div role="status" className="mb-5 rounded-xl border border-neutral-700 px-4 py-3 text-sm text-neutral-300">{notice}</div>}
      {tab === 'overview' && member?.role !== 'moderator' && <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-3">{[{ label:'Open tasks', value: taskCounts.open }, { label:'Completed tasks', value: taskCounts.done }, { label:'Social posts planned', value: planned }].map(x => <div key={x.label} className={panelClass}><p className="text-sm text-neutral-400">{x.label}</p><p className="mt-3 text-4xl font-bold">{x.value}</p></div>)}</div><div className={panelClass}><h3 className="font-semibold">Your team tools</h3><p className="mt-2 text-sm leading-6 text-neutral-400">Plan tasks, collect social media content ideas, draft captions, and track what was published. Data in this MVP is saved only in this browser, not shared between members.</p><div className="mt-5 flex flex-wrap gap-2"><button className={buttonClass} onClick={() => setTab('tasks')}>Open task board</button>{visibleTabs.some(t => t.id === 'social') && <button className="rounded-xl border border-neutral-700 px-4 py-2.5 text-sm" onClick={() => setTab('social')}>Open social media planner</button>}</div></div></div>}
      {tab === 'tasks' && member?.role !== 'moderator' && <div className="space-y-5"><form onSubmit={addTask} className={`${panelClass} grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end`}><label className="text-xs text-neutral-400">Task name<input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} maxLength={120} required placeholder="Fix mobile layout" className={`mt-2 ${inputClass}`}/></label><label className="text-xs text-neutral-400">Assigned to<input value={assignee} onChange={e=>setAssignee(e.target.value)} maxLength={60} placeholder="Team member" className={`mt-2 ${inputClass}`}/></label><button type="submit" className={buttonClass}>Add task</button></form><div className="grid gap-4 xl:grid-cols-3">{taskStatuses.map(status => <section key={status} className={panelClass}><h3 className="mb-4 font-semibold">{statusLabel[status]} <span className="text-sm font-normal text-neutral-500">({tasks.filter(x=>x.status===status).length})</span></h3><div className="space-y-3">{tasks.filter(x=>x.status===status).map(task => <article key={task.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"><p className="break-words text-sm font-medium">{task.title}</p><p className="mt-2 text-xs text-neutral-500">{task.assignee}</p><div className="mt-4 flex gap-2"><select aria-label={`Status for ${task.title}`} className={`${inputClass} !py-1.5`} value={task.status} onChange={e=>setTasks(old=>old.map(x=>x.id===task.id?{...x,status:e.target.value as TaskStatus}:x))}>{taskStatuses.map(s=><option key={s} value={s}>{statusLabel[s]}</option>)}</select><button title="Delete task" aria-label={`Delete ${task.title}`} className="rounded-lg border border-neutral-800 px-3 text-neutral-400 hover:text-red-300" onClick={()=>setTasks(old=>old.filter(x=>x.id!==task.id))}>×</button></div></article>)}{!tasks.some(x=>x.status===status) && <p className="text-sm text-neutral-600">No tasks yet.</p>}</div></section>)}</div></div>}
      {tab === 'social' && visibleTabs.some(t => t.id === 'social') && <div className="space-y-5"><div className={panelClass}><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Social Media Planner</h3><p className="mt-1 text-sm text-neutral-400">Plan Facebook, TikTok and Instagram content. Posting is manual for now.</p></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">{planned} planned</span></div><form onSubmit={addCampaign} className="mt-5 grid gap-3"><div className="grid gap-3 md:grid-cols-2"><label className="text-xs text-neutral-400">Campaign / post title<input required maxLength={120} value={campaignTitle} onChange={e=>setCampaignTitle(e.target.value)} placeholder="Anonymous chat feature spotlight" className={`mt-2 ${inputClass}`} /></label><label className="text-xs text-neutral-400">Platform<select className={`mt-2 ${inputClass}`} value={platform} onChange={e=>setPlatform(e.target.value)}><option>Facebook</option><option>TikTok</option><option>Instagram</option><option>Other</option></select></label></div><label className="text-xs text-neutral-400">Caption draft<textarea maxLength={3000} rows={4} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Write a caption here…" className={`mt-2 ${inputClass}`} /></label><div className="flex flex-wrap items-end gap-3"><label className="text-xs text-neutral-400">Target publishing date<input type="date" value={date} onChange={e=>setDate(e.target.value)} className={`mt-2 ${inputClass}`} /></label><button type="submit" className={buttonClass}>Save post idea</button></div></form></div><div className="grid gap-3">{campaigns.map(c => <article key={c.id} className={panelClass}><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs text-emerald-400">{c.platform}{c.date ? ` · ${c.date}` : ''}</span><h4 className="mt-1 font-semibold">{c.title}</h4></div><select aria-label={`Publication status for ${c.title}`} value={c.status} onChange={e=>setCampaigns(old=>old.map(x=>x.id===c.id?{...x,status:e.target.value as CampaignStatus}:x))} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs">{campaignStatuses.map(s=><option key={s} value={s}>{campaignLabel[s]}</option>)}</select></div>{c.caption && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-300">{c.caption}</p>}<div className="mt-4 flex flex-wrap gap-2"><button disabled={!c.caption} onClick={()=>void copyCaption(c.caption)} className="rounded-lg border border-neutral-700 px-3 py-2 text-xs disabled:opacity-40">Copy caption</button><button onClick={()=>setCampaigns(old=>old.filter(x=>x.id!==c.id))} className="rounded-lg border border-neutral-800 px-3 py-2 text-xs text-red-300">Delete</button></div></article>)}{campaigns.length===0 && <p className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">No campaign ideas yet. Create the first one above.</p>}</div></div>}
      {tab === 'content' && visibleTabs.some(t => t.id === 'content') && <div className={panelClass}><h3 className="font-semibold">Content writing</h3><p className="mt-2 text-sm text-neutral-400">Article drafting and publishing permissions will be integrated with the existing TambayanSLU article editor in a later version.</p></div>}
      {tab === 'moderation' && visibleTabs.some(t => t.id === 'moderation') && <ModerationWorkspace />}
      {tab === 'team' && visibleTabs.some(t => t.id === 'team') && <div className={panelClass}><h3 className="font-semibold">Team access</h3><Link href="/team/members" className="mt-3 inline-block rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black">Manage members</Link><p className="mt-2 text-sm text-neutral-400">Team members use individual Firebase Authentication accounts. The Owner can create and manage accounts under /team/members. Tasks and social media drafts are still saved only in this browser.</p></div>}
      <p className="mt-8 text-xs text-neutral-600">TambayanSLU Team Portal · Firebase Authentication · Browser-local task data</p></div>
    </main>
  </div>;
}

function TeamLogin({ onSuccess }: { onSuccess: (session: TeamSession) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/team/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({username,password}) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'Could not sign in.'); return; }
      onSuccess(result.member);
    } catch { setError('Network error. Please try again.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-6 space-y-4">
    <label className="block text-xs text-neutral-400">Username<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className={`mt-2 ${inputClass}`} placeholder="yourusername" /></label>
    <label className="block text-xs text-neutral-400">Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={`mt-2 ${inputClass}`} placeholder="Your password" /></label>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <button className={`w-full ${buttonClass}`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </form>;
}
