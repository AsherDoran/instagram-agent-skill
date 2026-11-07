'use client';
import { useState } from 'react';
import { usePoll, api, Badge, ago, Title, ErrorNote } from '../../../components/kit';

export default function Approvals() {
  const { data, error, reload } = usePoll<{ approvals: any[] }>('/api/approvals', 3000);
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setBusy(id); setErr(null);
    try { await api(`/api/approvals/${id}`, 'POST', { decision }); await reload(); } catch (e: any) { setErr(e.message); }
    setBusy(null);
  };
  const pending = data?.approvals.filter((a) => a.status === 'pending') ?? []; const past = data?.approvals.filter((a) => a.status !== 'pending') ?? [];
  return (
    <div className="mx-auto max-w-4xl"><Title sub="Consequential actions (sending, publishing, modifying external data) never run until you approve them here.">Approval queue</Title>
      <ErrorNote e={error ?? err} />
      {pending.length === 0 && <p className="mb-6 text-sm text-muted">Nothing waiting for approval.</p>}
      <div className="space-y-3">{pending.map((a) => (
        <div key={a.id} className="card border-amber-500/40"><div className="flex items-center justify-between gap-2"><div className="font-semibold">{a.title}</div><Badge s="pending" /></div>
          <div className="text-xs text-muted">{a.agent}.{a.action} · {ago(a.created_at)}</div>
          <pre className="my-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-bg p-2 text-xs">{JSON.stringify(a.payload, null, 2)}</pre>
          <div className="flex gap-2"><button className="btn btn-primary flex-1" disabled={busy === a.id} onClick={() => decide(a.id, 'approved')}>Approve</button>
            <button className="btn btn-danger flex-1" disabled={busy === a.id} onClick={() => decide(a.id, 'rejected')}>Reject</button></div></div>))}</div>
      {past.length > 0 && <><h2 className="mb-2 mt-8 font-semibold">History</h2><ul className="space-y-2 text-sm">{past.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"><span className="truncate">{a.title}</span><span className="flex items-center gap-2"><span className="text-xs text-muted">{ago(a.decided_at)}</span><Badge s={a.status} /></span></li>)}</ul></>}
    </div>);
}
