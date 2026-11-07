'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { usePoll, api } from './kit';

const NAV = [
  { href: '/', label: 'Dashboard', icon: '◧' }, { href: '/tasks', label: 'Tasks', icon: '☰' },
  { href: '/approvals', label: 'Approvals', icon: '✓' }, { href: '/logs', label: 'Logs', icon: '≣' },
  { href: '/workflows', label: 'Workflows', icon: '⛓' }, { href: '/integrations', label: 'Integrations', icon: '⚙' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  const { data } = usePoll<{ pendingApprovals: number }>('/api/overview', 5000);
  const pending = data?.pendingApprovals ?? 0;
  const active = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  const logout = async () => { await api('/api/auth/logout', 'POST'); router.push('/login'); };
  const Link2 = ({ n, onClick }: { n: (typeof NAV)[number]; onClick?: () => void }) => (
    <Link href={n.href} onClick={onClick} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${active(n.href) ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-panel2 hover:text-white'}`}>
      <span className="w-5 text-center">{n.icon}</span><span>{n.label}</span>
      {n.href === '/approvals' && pending > 0 && <span className="ml-auto rounded-full bg-amber-400 px-2 text-xs font-bold text-black">{pending}</span>}
    </Link>);
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-panel p-4 md:flex">
        <div className="mb-6 px-3 text-lg font-bold tracking-tight">⌘ Command Center</div>
        <nav className="flex flex-1 flex-col gap-1">{NAV.map((n) => <Link2 key={n.href} n={n} />)}</nav>
        <button className="btn mt-4" onClick={logout}>Sign out</button>
      </aside>
      <header className="pt-safe sticky top-0 z-30 flex items-center justify-between border-b border-line bg-panel/95 px-4 py-3 backdrop-blur md:hidden">
        <span className="font-bold">⌘ Command Center</span>
        <button className="btn" aria-label="Menu" onClick={() => setOpen(!open)}>☰ Menu</button>
      </header>
      {open && <div className="fixed inset-0 z-20 bg-black/60 pt-16 md:hidden" onClick={() => setOpen(false)}>
        <div className="mx-3 rounded-xl border border-line bg-panel p-3" onClick={(e) => e.stopPropagation()}>
          {NAV.map((n) => <Link2 key={n.href} n={n} onClick={() => setOpen(false)} />)}
          <button className="btn mt-2 w-full" onClick={logout}>Sign out</button></div></div>}
      <main className="min-w-0 flex-1 px-4 py-5 pb-28 md:px-8 md:pb-8">{children}</main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-panel/95 backdrop-blur md:hidden">
        {NAV.filter((n) => n.href !== '/logs').map((n) => (
          <Link key={n.href} href={n.href} className={`relative flex flex-col items-center py-2 text-[11px] ${active(n.href) ? 'text-accent' : 'text-muted'}`}>
            <span className="text-lg leading-none">{n.icon}</span>{n.label}
            {n.href === '/approvals' && pending > 0 && <span className="absolute right-4 top-1 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-black">{pending}</span>}
          </Link>))}
      </nav>
    </div>
  );
}
