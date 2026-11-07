import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/integrations/google';
import { saveSecret } from '@/lib/integrations/store';
import { provider } from '@/lib/integrations/providers';

export async function GET(req: NextRequest) {
  const base = process.env.APP_URL || req.nextUrl.origin;
  const state = req.nextUrl.searchParams.get('state') || '';
  const code = req.nextUrl.searchParams.get('code');
  const [id] = state.split('.');
  const back = (q: string) => NextResponse.redirect(`${base}/integrations?${q}`);
  if (!code || state !== req.cookies.get('cc_oauth_state')?.value || !provider(id)) return back('error=oauth_state');
  try { saveSecret(id, await exchangeCode(code), provider(id)!.scopes); } catch { return back('error=oauth_exchange'); }
  return back(`connected=${id}`);
}
