'use client';
import { useEffect, useState } from 'react';
import { usePoll, api, Badge, ago, Title, ErrorNote } from '../../../components/kit';

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, error } = usePoll<any>(`/api/tasks/${id}`, 2000);
  if (!data) return <div className="card text-sm text-muted">{error ?? 'Loading…'}</div>;
  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-2"><div><div className="font-semibold">{data.task.instruction}</div><div className="mt-1"><Badge s={data.task.status} /></div></div><button className="btn" onClick={onClose}>Close</button></div>
      <div className="space-y-3">{data.steps.map((s: any) => (
        <div key={s.id} className="rounded-lg border border-line p-3">
          <div className="flex items-center justify-between gap-2 text-sm"><span className="font-medium">{s.idx + 1}. {s.agent}.{s.action}</span><Badge s={s.status} /></div>
          {s.attempts > 1 && <div className="text-xs text-amber-300">{s.attempts} attempts</div>}
          {s.error && <div className="mt-1 text-xs text-red-300">{s.error}</div>}
          {s.output != null && <details className="mt-2"><summary className="cursor-pointer text-xs text-accent">Output</summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-bg p-2 text-xs">{typeof (s.output as any).markdown === 'string' ? (s.output as any).markdown : JSON.stringify(s.output, null, 2)}</pre></details>}
        </div>))}</div>
      <div><h3 className="mb-1 text-sm font-semibold">Log</h3><ul className="max-h-48 space-y-1 overflow-auto text-xs">{data.logs.map((l: any) => <li key={l.id}><Badge s={l.level} /> {l.agent}: {l.message}</li>)}</ul></div>
    </div>);
}

export default function Tasks() {
  const { data, error } = usePoll<{ tasks: any[] }>('/api/tasks', 3000);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { setSel(new URLSearchParams(location.search).get('id')); }, []);
  return (
    <div className="mx-auto max-w-5xl"><Title sub="Every instruction, how it was delegated, and what came back.">Task history</Title><ErrorNote e={error} />
      {sel && <div className="mb-4"><Detail id={sel} onClose={() => setSel(null)} /></div>}
      <div className="space-y-2">{data?.tasks.length === 0 && <p className="text-sm text-muted">No tasks yet — give a command from the dashboard.</p>}
        {data?.tasks.map((t) => (
          <button key={t.id} onClick={() => setSel(t.id)} className="card block w-full text-left hover:border-accent/50">
            <div className="flex items-center justify-between gap-2"><span className="truncate font-medium">{t.instruction}</span><Badge s={t.status} /></div>
            <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted">{t.steps.map((s: any) => <span key={s.id}>{s.agent}.{s.action}·{s.status}</span>)}<span>· {ago(t.created_at)}</span></div>
          </button>))}</div></div>);
}
