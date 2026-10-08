'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {listTeamModeration,performTeamModeration,type ModerationItem,type ModAction} from './moderation-actions';

type Section = 'pending'|'post-report'|'chat-report'|'appeal';
const sections:{id:Section;label:string}[]=[{id:'pending',label:'Pending posts'},{id:'post-report',label:'Post reports'},{id:'chat-report',label:'Chat reports'},{id:'appeal',label:'Ban appeals'}];
const btn='rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40';
const primary='rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40';
export default function ModerationWorkspace(){
  const [section,setSection]=useState<Section>('pending');
  const [items,setItems]=useState<ModerationItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [edits,setEdits]=useState<Record<string,string>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});
  const refresh=useCallback(async()=>{
    setLoading(true);setError('');
    try { setItems(await listTeamModeration()); }
    catch(e){setError(e instanceof Error?e.message:'Could not load moderation items.');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const counts=useMemo(()=>Object.fromEntries(sections.map(s=>[s.id,items.filter(i=>i.type===s.id).length])),[items]);
  const visible=items.filter(i=>i.type===section);
  async function act(item:ModerationItem,action:ModAction){
    const destructive=['reject-post','delete-reported-content','ban-chat-user','approve-appeal','deny-appeal'].includes(action);
    if(destructive && !window.confirm(`Confirm ${action.replaceAll('-',' ')}?`))return;
    setWorking(item.id);setError('');setMessage('');
    try{
      await performTeamModeration({action,id:item.id,content:edits[item.id],note:notes[item.id]});
      setMessage('Action completed.');
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Action failed.');}
    finally{setWorking(null);}
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Moderation workspace</h3><p className="text-sm text-neutral-400">Review TambayanSLU posts, reports, and appeals within the team dashboard.</p></div><button onClick={()=>void refresh()} className={btn} disabled={loading}>Refresh</button></div>
    <div className="flex flex-wrap gap-2">{sections.map(s=><button key={s.id} onClick={()=>setSection(s.id)} className={`rounded-xl border px-3 py-2 text-sm ${section===s.id?'border-emerald-600 bg-emerald-500/15 text-emerald-300':'border-neutral-800 text-neutral-400 hover:text-white'}`}>{s.label} <span className="ml-1 opacity-70">{counts[s.id]||0}</span></button>)}</div>
    {error&&<p role="alert" className="rounded-lg border border-red-800 p-3 text-sm text-red-300">{error}</p>}
    {message&&<p role="status" className="text-sm text-emerald-300">{message}</p>}
    {loading?<p className="py-8 text-sm text-neutral-400">Loading moderation queue…</p>:visible.length===0?<p className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">Nothing to review here.</p>:<div className="space-y-4">{visible.map(item=><article key={item.type+item.id} className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><span className="text-sm font-semibold">{item.author}</span>{item.category&&<span className="ml-2 text-xs text-neutral-500">{item.category}</span>}</div><span className="text-xs text-neutral-500">{item.createdAt?new Date(item.createdAt).toLocaleString():''}</span></div>
      {item.reason&&<p className="mb-2 text-xs font-semibold text-rose-300">Reason: {item.reason}</p>}
      {item.details&&<p className="mb-2 whitespace-pre-wrap rounded-lg bg-neutral-950 p-3 text-xs text-neutral-400">{item.details}</p>}
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-neutral-200">{item.content||'(No text content)'}</p>
      {item.imageUrl&&<a href={item.imageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-emerald-300 underline">View attached image</a>}
      {item.postId&&<a href={`/post/${encodeURIComponent(item.postId)}`} target="_blank" rel="noreferrer" className="ml-3 text-xs text-emerald-300 underline">View post</a>}
      {item.type==='pending'&&<><textarea className="mt-4 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm" aria-label="Edit pending post" rows={3} value={edits[item.id]??item.content} onChange={e=>setEdits(old=>({...old,[item.id]:e.target.value}))}/><div className="mt-3 flex flex-wrap gap-2"><button className={primary} disabled={working!==null} onClick={()=>void act(item,'approve-post')}>Approve</button><button className={btn} disabled={working!==null} onClick={()=>void act(item,'save-post')}>Save edits</button><button className={`${btn} text-rose-300`} disabled={working!==null} onClick={()=>void act(item,'reject-post')}>Reject and delete</button></div></>}
      {item.type==='post-report'&&<div className="mt-4 flex flex-wrap gap-2"><button className={btn} disabled={working!==null} onClick={()=>void act(item,'dismiss-report')}>Dismiss report</button><button className={`${btn} text-rose-300`} disabled={working!==null||!item.postId} onClick={()=>void act(item,'delete-reported-content')}>Delete reported {item.replyId?'reply':'post'}</button></div>}
      {item.type==='chat-report'&&<><p className="mt-3 break-all text-xs text-neutral-500">Room: {item.roomId} · User ID: {item.reportedUserId}</p>{item.evidence?.messages?.length?<div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-neutral-800 p-3">{item.evidence.messages.map((m,index)=><div key={m.messageId||index} className="text-xs"><span className="font-semibold text-neutral-400">{m.senderNickname||m.senderId||'Unknown'}: </span><span className="whitespace-pre-wrap break-words text-neutral-200">{m.text}</span></div>)}</div>:<p className="mt-3 text-xs text-neutral-500">No submitted conversation evidence.</p>}<div className="mt-4 flex gap-2"><button className={btn} disabled={working!==null} onClick={()=>void act(item,'dismiss-report')}>Dismiss report</button><button className={`${btn} text-rose-300`} disabled={working!==null||!item.reportedUserId} onClick={()=>void act(item,'ban-chat-user')}>Global ban user</button></div></>}
      {item.type==='appeal'&&<><textarea className="mt-4 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm" aria-label="Moderator note" rows={2} placeholder="Optional moderator note" value={notes[item.id]||''} onChange={e=>setNotes(old=>({...old,[item.id]:e.target.value}))}/><div className="mt-3 flex gap-2"><button className={primary} disabled={working!==null} onClick={()=>void act(item,'approve-appeal')}>Approve and unban</button><button className={`${btn} text-rose-300`} disabled={working!==null} onClick={()=>void act(item,'deny-appeal')}>Deny appeal</button></div></>}
    </article>)}</div>}
    <p className="text-xs text-neutral-600">Moderation actions use your individual team account and are checked server-side.</p>
  </div>;
}
