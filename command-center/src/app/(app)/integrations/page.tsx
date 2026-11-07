'use client';
import { useEffect, useState } from 'react';
import { usePoll, api, Badge, ago, Title, ErrorNote } from '../../../components/kit';

export default function Integrations() {
  const { data, error, reload } = usePoll<any>('/api/integrations', 5000);
  const [err, setErr] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);
  const [tok, setTok] = useState<Record<string, string>>({}); const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { const q = new URLSearchParams(location.search); if (q.get('error')) setErr(`OAuth failed: ${q.get('error')}`); if (q.get('connected')) setNote(`Credentials saved for ${q.get('connected')}. Run "Test connection" before it is used.`); }, []);
  const act = async (provider: string, action: string, extra: object = {}) => {
    setBusy(provider + action); setErr(null); setNote(null);
    try { const r = await api('/api/integrations', 'POST', { provider, action, ...extra }); if (action === 'test') setNote(`${provider}: ${r.ok ? '✓' : '✗'} ${r.note}`); await reload(); } catch (e: any) { setErr(e.message); }
    setBusy(null);
  };
  return (
    <div className="mx-auto max-w-4xl"><Title sub="Agents run on clearly-labelled MOCK data until a real connection is saved AND passes a connection test.">Integrations</Title>
      <ErrorNote e={error ?? err} />{note && <div className="mb-3 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-sky-200">{note}</div>}
      <div className="grid gap-3 md:grid-cols-2">{data?.integrations.map((i: any) => (
        <div key={i.provider} className="card space-y-3"><div className="flex items-center justify-between"><div className="font-semibold">{i.name}</div>
          <Badge s={i.status} label={i.status === 'mock' ? 'using mock data' : i.status === 'verified' ? 'verified' : i.status === 'connected_untested' ? 'saved – untested' : 'test failed'} /></div>
          <div className="break-words text-xs text-muted">Least-privilege scopes: {i.scopes.join(', ')}</div>
          {i.note && <div className="text-xs">{i.note} {i.last_tested_at && <span className="text-muted">({ago(i.last_tested_at)})</span>}</div>}
          {i.adapter === 'not_implemented' && <div className="text-xs text-violet-300">No live adapter implemented yet for this platform — it remains on mock data even if a token is saved.</div>}
          {i.group === 'google' && i.status === 'mock' && (data.googleConfigured
            ? <a className="btn btn-primary w-full" href={`/api/integrations/google/start?provider=${i.provider}`}>Connect with Google OAuth</a>
            : <div className="text-xs text-amber-300">Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.local to enable OAuth.</div>)}
          {i.group === 'social' && i.status === 'mock' && <div className="flex gap-2"><input className="input" type="password" placeholder="API access token" value={tok[i.provider] ?? ''} onChange={(e) => setTok({ ...tok, [i.provider]: e.target.value })} />
            <button className="btn" disabled={!tok[i.provider]} onClick={() => act(i.provider, 'save_token', { token: tok[i.provider] })}>Save</button></div>}
          {i.status !== 'mock' && <div className="flex gap-2"><button className="btn flex-1" disabled={busy === i.provider + 'test'} onClick={() => act(i.provider, 'test')}>Test connection</button><button className="btn btn-danger" onClick={() => act(i.provider, 'disconnect')}>Disconnect</button></div>}
        </div>))}</div></div>);
}
