import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/crypto';
import { COOKIE, createSession } from '@/lib/session';

const fails = new Map<string, { n: number; t: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  const f = fails.get(ip);
  if (f && Date.now() - f.t < 60_000 && f.n >= 5) return NextResponse.json({ error: 'Too many attempts. Wait a minute.' }, { status: 429 });
  const expected = process.env.ADMIN_PASSWORD || '';
  if (expected.length < 8) return NextResponse.json({ error: 'Server not configured: set ADMIN_PASSWORD (8+ chars) in .env.local' }, { status: 500 });
  const { password } = await req.json().catch(() => ({ password: '' }));
  if (typeof password !== 'string' || !safeEqual(password, expected)) {
    fails.set(ip, { n: (f && Date.now() - f.t < 60_000 ? f.n : 0) + 1, t: Date.now() });
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  fails.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createSession(), { httpOnly: true, sameSite: 'lax', secure: (process.env.APP_URL || '').startsWith('https'), path: '/', maxAge: 43200 });
  return res;
}
