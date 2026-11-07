'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePoll, api, Badge, ago, ErrorNote } from '../../components/kit';

const EXAMPLES = ['Research "Acme Corp" and report back', 'Summarize my inbox and draft replies', 'Create an Instagram reel script about coffee and schedule it', 'Remind me to follow up with Dana'];

export default function Dashboard() {
  const ov = usePoll<any>('/api/overview', 2500);
  const chat = usePoll<{ messages: any[] }>('/api/chat', 2500);
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [chat.data?.messages.length]);
  const send = async (t = text) => {
    if (!t.trim() || busy) return; setBusy(true); setErr(null);
    try { await api('/api/chat', 'POST', { instruction: t }); setText(''); await Promise.all([chat.reload(), ov.reload()]); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  const d = ov.data;
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="card flex h-[70vh] min-h-[420px] flex-col lg:h-[calc(100vh-4rem)]">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Command chat</h2>
          {d?.pendingApprovals > 0 && <Link href="/approvals" className="badge bg-amber-400 text-black">{d.pendingApprovals} awaiting approval</Link>}</div>
        <div ref={box} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {!chat.data?.messages.length && <div className="text-sm text-muted">Tell the Manager Agent what you need. It breaks the request into tasks and delegates to specialists. Anything consequential waits in the approval queue.
            <div className="mt-3 flex flex-wrap gap-2">{EXAMPLES.map((x) => <button key={x} className="btn text-left" onClick={() => send(x)}>{x}</button>)}</div></div>}
          {chat.data?.messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
              <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-accent text-[#0b0d12]' : 'bg-panel2'}`}>
                {m.content}{m.task_id && m.role === 'assistant' && <Link href={`/tasks?id=${m.task_id}`} className="mt-1 block text-xs text-accent underline">View task</Link>}</div></div>))}
        </div>
        <ErrorNote e={err} />
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input className="input" placeholder="Give a command…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          <button className="btn btn-primary" disabled={busy || !text.trim()}>{busy ? '…' : 'Send'}</button>
        </form>
      </section>
      <div className="min-w-0 space-y-4">
        <section className="card"><h2 className="mb-3 font-semibold">Agents</h2>
          <ul className="space-y-3">{d?.agents.map((a: any) => (
            <li key={a.id} className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="text-sm font-medium">{a.name}</div>
              <div className="truncate text-xs text-muted">{a.description} · {ago(a.lastActive)}</div></div><Badge s={a.status} /></li>))}</ul></section>
        <section className="card"><h2 className="mb-3 font-semibold">Integrations</h2>
          <div className="flex flex-wrap gap-2">{d?.integrations.map((i: any) => <span key={i.provider} className="text-xs">{i.provider} <Badge s={i.status} label={i.status === 'mock' ? 'mock data' : i.status.replace('_', ' ')} /></span>)}</div></section>
        <section className="card"><h2 className="mb-3 font-semibold">Activity feed</h2>
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">{d?.activity.length === 0 && <li className="text-muted">No activity yet.</li>}
            {d?.activity.map((l: any) => <li key={l.id}><Badge s={l.level} /> <span className="text-muted">{l.agent}</span> {l.message}<span className="ml-1 text-xs text-muted">{ago(l.created_at)}</span></li>)}</ul></section>
        <section className="card"><div className="mb-3 flex justify-between"><h2 className="font-semibold">Recent tasks</h2><Link href="/tasks" className="text-sm text-accent">All</Link></div>
          <ul className="space-y-2 text-sm">{d?.tasks.map((t: any) => <li key={t.id} className="flex items-center justify-between gap-2"><Link href={`/tasks?id=${t.id}`} className="truncate">{t.instruction}</Link><Badge s={t.status} /></li>)}</ul></section>
      </div>
    </div>);
}
