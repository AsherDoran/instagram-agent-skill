'use client';
import { useState } from 'react';
import { usePoll, Badge, Title, ErrorNote } from '../../../components/kit';

export default function Logs() {
  const { data, error } = usePoll<{ logs: any[] }>('/api/logs?limit=300', 3000);
  const [f, setF] = useState('all');
  const logs = (data?.logs ?? []).filter((l) => f === 'all' || l.level === f || l.agent === f);
  return (
    <div className="mx-auto max-w-5xl"><Title sub="Every action, output, error and retry from every agent.">Agent logs</Title><ErrorNote e={error} />
      <div className="mb-3 flex flex-wrap gap-2">{['all', 'error', 'warn', 'manager', 'email', 'social', 'research', 'scheduler'].map((x) => <button key={x} onClick={() => setF(x)} className={`btn ${f === x ? 'btn-primary' : ''}`}>{x}</button>)}</div>
      <div className="card divide-y divide-line p-0">{logs.length === 0 && <p className="p-4 text-sm text-muted">No log entries.</p>}
        {logs.map((l) => (<div key={l.id} className="px-4 py-2 text-sm"><div className="flex flex-wrap items-center gap-2"><Badge s={l.level} /><span className="font-medium">{l.agent}</span><span className="text-xs text-muted">{new Date(l.created_at).toLocaleString()}</span></div>
          <div className="mt-1 break-words">{l.message}</div>{l.data && <pre className="mt-1 overflow-auto text-xs text-muted">{l.data}</pre>}</div>))}</div></div>);
}
