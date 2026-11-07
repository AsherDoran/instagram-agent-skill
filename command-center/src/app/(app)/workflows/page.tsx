'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePoll, api, Badge, ago, Title, ErrorNote } from '../../../components/kit';

export default function Workflows() {
  const cat = usePoll<{ agents: any[] }>('/api/catalog', 60000);
  const wfs = usePoll<{ workflows: any[] }>('/api/workflows', 5000);
  const [name, setName] = useState(''); const [rec, setRec] = useState('none'); const [steps, setSteps] = useState<any[]>([]);
  const [pick, setPick] = useState('email.triage'); const [params, setParams] = useState('');
  const [err, setErr] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null);
  const actions = cat.data?.agents.flatMap((a) => a.actions.map((x: any) => ({ ...x, key: `${a.id}.${x.id}`, agent: a.id, agentName: a.name }))) ?? [];
  const add = () => {
    const a = actions.find((x) => x.key === pick); if (!a) return;
    let input: any = {};
    if (params.trim()) { try { input = JSON.parse(params); } catch { input = { text: params.trim(), subject: params.trim(), topic: params.trim(), title: params.trim() }; } }
    setSteps([...steps, { agent: a.agent, action: a.id, input }]); setParams('');
  };
  const save = async () => { setErr(null); try { await api('/api/workflows', 'POST', { name, steps, recurrence: rec }); setName(''); setSteps([]); setRec('none'); await wfs.reload(); } catch (e: any) { setErr(e.message); } };
  const run = async (id: string) => { setErr(null); setMsg(null); try { const r = await api(`/api/workflows/${id}/run`, 'POST'); setMsg(`Run started: ${r.task.status}. See Tasks / Approvals.`); await wfs.reload(); } catch (e: any) { setErr(e.message); } };
  const del = async (id: string) => { await api(`/api/workflows?id=${id}`, 'DELETE'); await wfs.reload(); };
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      <section className="card space-y-3"><Title sub="Chain agent actions into a reusable automation.">Workflow builder</Title>
        <input className="input" placeholder="Workflow name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="space-y-2">{steps.length === 0 && <p className="text-sm text-muted">No steps yet.</p>}
          {steps.map((s, i) => <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"><span className="min-w-0 truncate">{i + 1}. {s.agent}.{s.action} <span className="text-xs text-muted">{Object.keys(s.input).length ? JSON.stringify(s.input) : ''}</span></span>
            <button className="btn" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>✕</button></div>)}</div>
        <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>{actions.map((a) => <option key={a.key} value={a.key}>{a.agentName}: {a.label}{a.consequential ? ' (needs approval)' : ''}</option>)}</select>
        <input className="input" placeholder='Params: plain text or JSON, e.g. {"platform":"linkedin"}' value={params} onChange={(e) => setParams(e.target.value)} />
        <button className="btn w-full" onClick={add}>+ Add step</button>
        <label className="block text-sm text-muted">Recurrence<select className="input mt-1" value={rec} onChange={(e) => setRec(e.target.value)}><option value="none">Manual only</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
        <ErrorNote e={err} /><button className="btn btn-primary w-full" disabled={!name.trim() || !steps.length} onClick={save}>Save workflow</button>
      </section>
      <section className="space-y-3"><Title sub="Recurring runs still stop at the approval queue for consequential steps.">Saved workflows</Title>
        {msg && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{msg} <Link href="/approvals" className="underline">Approvals</Link></div>}
        {wfs.data?.workflows.length === 0 && <p className="text-sm text-muted">None saved yet.</p>}
        {wfs.data?.workflows.map((w) => (
          <div key={w.id} className="card"><div className="flex items-center justify-between gap-2"><div className="font-semibold">{w.name}</div>{w.recurrence !== 'none' && <Badge s="running" label={w.recurrence} />}</div>
            <div className="my-2 text-xs text-muted">{w.steps.map((s: any) => `${s.agent}.${s.action}`).join(' → ')}<br />Last run: {ago(w.last_run_at)}{w.next_run_at ? ` · next ${new Date(w.next_run_at).toLocaleString()}` : ''}</div>
            <div className="flex gap-2"><button className="btn btn-primary flex-1" onClick={() => run(w.id)}>Run now</button><button className="btn btn-danger" onClick={() => del(w.id)}>Delete</button></div></div>))}
      </section></div>);
}
