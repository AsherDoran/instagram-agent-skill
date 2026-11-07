'use client';
import { useState } from 'react';
import { api } from '@/components/kit';
export default function Login() {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/auth/login', 'POST', { password: pw }); location.href = '/'; } catch (x: any) { setErr(x.message); setBusy(false); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="text-center"><div className="text-2xl font-bold">⌘ Command Center</div><p className="text-sm text-muted">Sign in to continue</p></div>
        <input className="input" type="password" autoComplete="current-password" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && <p className="text-sm text-red-300">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy || !pw}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>);
}
