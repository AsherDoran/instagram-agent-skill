'use client';
import { useCallback, useEffect, useState } from 'react';

export function usePoll<T>(url: string, ms = 3000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      const r = await fetch(url);
      if (r.status === 401) { location.href = '/login'; return; }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error); setData(j); setError(null);
    } catch (e: any) { setError(e.message); }
  }, [url]);
  useEffect(() => { reload(); const t = setInterval(reload, ms); return () => clearInterval(t); }, [reload, ms]);
  return { data, error, reload };
}

export async function api<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}

const COLORS: Record<string, string> = {
  done: 'bg-emerald-500/15 text-emerald-300', approved: 'bg-emerald-500/15 text-emerald-300', verified: 'bg-emerald-500/15 text-emerald-300', idle: 'bg-slate-500/15 text-slate-300',
  running: 'bg-sky-500/15 text-sky-300', working: 'bg-sky-500/15 text-sky-300', planning: 'bg-sky-500/15 text-sky-300',
  awaiting_approval: 'bg-amber-500/15 text-amber-300', pending: 'bg-amber-500/15 text-amber-300', 'waiting for approval': 'bg-amber-500/15 text-amber-300', connected_untested: 'bg-amber-500/15 text-amber-300',
  failed: 'bg-red-500/15 text-red-300', error: 'bg-red-500/15 text-red-300', rejected: 'bg-red-500/15 text-red-300', cancelled: 'bg-slate-500/15 text-slate-400',
  mock: 'bg-violet-500/15 text-violet-300', needs_clarification: 'bg-amber-500/15 text-amber-300', skipped: 'bg-slate-500/15 text-slate-400', warn: 'bg-amber-500/15 text-amber-300', info: 'bg-slate-500/15 text-slate-300',
};
export const Badge = ({ s, label }: { s: string; label?: string }) => <span className={`badge ${COLORS[s] ?? COLORS.idle}`}>{(label ?? s).replace(/_/g, ' ')}</span>;
export const ago = (t: number | null) => { if (!t) return '—'; const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; };
export const Title = ({ children, sub }: { children: React.ReactNode; sub?: string }) => <div className="mb-4"><h1 className="text-xl font-semibold">{children}</h1>{sub && <p className="text-sm text-muted">{sub}</p>}</div>;
export const ErrorNote = ({ e }: { e: string | null }) => e ? <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{e}</div> : null;
