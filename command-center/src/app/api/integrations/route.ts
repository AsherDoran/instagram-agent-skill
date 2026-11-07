import { NextRequest } from 'next/server';
import { handler, ok } from '@/lib/http';
import { listIntegrations, saveSecret, recordTest, disconnect } from '@/lib/integrations/store';
import { testConnection } from '@/lib/integrations/registry';
import { PROVIDERS, provider } from '@/lib/integrations/providers';

export const GET = handler(async () => ok({
  integrations: listIntegrations().map((i) => ({ ...i, ...provider(i.provider)! })),
  googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
}));

export const POST = handler(async (req: NextRequest) => {
  const { provider: id, action, token } = await req.json();
  if (!PROVIDERS.some((p) => p.id === id)) throw new Error('Unknown provider');
  if (action === 'disconnect') { disconnect(id); return ok({ ok: true }); }
  if (action === 'save_token') {
    if (typeof token !== 'string' || token.length < 8) throw new Error('Token too short');
    saveSecret(id, { access_token: token, expires_at: Date.now() + 3600_000 }, provider(id)!.scopes);
    return ok({ ok: true });
  }
  if (action === 'test') {
    const r = await testConnection(id);
    recordTest(id, r.ok, r.note);
    return ok(r);
  }
  throw new Error('Unknown action');
});
