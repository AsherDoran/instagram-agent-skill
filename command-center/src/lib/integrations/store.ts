import { getDb, now } from '../db';
import { decrypt, encrypt } from '../crypto';
import { PROVIDERS } from './providers';
import type { IntegrationStatus } from '../types';

export interface IntegrationRow {
  provider: string; status: IntegrationStatus; scopes: string | null; last_tested_at: number | null;
  last_test_ok: number | null; note: string | null; updated_at: number; has_secret: boolean;
}

export function listIntegrations(): IntegrationRow[] {
  const rows = getDb().prepare('SELECT * FROM integrations').all() as any[];
  return PROVIDERS.map((p) => {
    const r = rows.find((x) => x.provider === p.id);
    return r
      ? { provider: p.id, status: r.status, scopes: r.scopes, last_tested_at: r.last_tested_at, last_test_ok: r.last_test_ok, note: r.note, updated_at: r.updated_at, has_secret: !!r.secret }
      : { provider: p.id, status: 'mock' as const, scopes: null, last_tested_at: null, last_test_ok: null, note: null, updated_at: 0, has_secret: false };
  });
}

export function getStatus(provider: string): IntegrationStatus {
  const r = getDb().prepare('SELECT status FROM integrations WHERE provider=?').get(provider) as any;
  return r?.status ?? 'mock';
}

export function saveSecret(provider: string, secret: object, scopes: string[]) {
  getDb().prepare(`INSERT INTO integrations(provider,status,scopes,secret,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(provider) DO UPDATE SET status='connected_untested', scopes=excluded.scopes, secret=excluded.secret,
    last_test_ok=NULL, note='Credentials saved. Run a connection test before use.', updated_at=excluded.updated_at`)
    .run(provider, 'connected_untested', scopes.join(' '), encrypt(JSON.stringify(secret)), now());
}

export function readSecret<T = any>(provider: string): T | null {
  const r = getDb().prepare('SELECT secret FROM integrations WHERE provider=?').get(provider) as any;
  return r?.secret ? (JSON.parse(decrypt(r.secret)) as T) : null;
}

export function recordTest(provider: string, ok: boolean, note: string) {
  getDb().prepare('UPDATE integrations SET status=?, last_tested_at=?, last_test_ok=?, note=?, updated_at=? WHERE provider=?')
    .run(ok ? 'verified' : 'error', now(), ok ? 1 : 0, note, now(), provider);
}

export function disconnect(provider: string) {
  getDb().prepare('DELETE FROM integrations WHERE provider=?').run(provider);
}
