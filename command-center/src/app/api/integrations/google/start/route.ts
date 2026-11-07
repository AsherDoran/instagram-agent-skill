import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { googleAuthUrl } from '@/lib/integrations/google';
import { provider } from '@/lib/integrations/providers';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('provider') || '';
  if (provider(id)?.group !== 'google') return NextResponse.json({ error: 'Unknown Google provider' }, { status: 400 });
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.json({ error: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first' }, { status: 400 });
  const state = `${id}.${randomBytes(16).toString('hex')}`;
  const res = NextResponse.redirect(googleAuthUrl(id, state));
  res.cookies.set('cc_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/api/integrations/google', maxAge: 600 });
  return res;
}
