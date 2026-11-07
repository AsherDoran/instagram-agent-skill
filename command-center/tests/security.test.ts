import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@/lib/crypto';
import { createSession, verifySession } from '@/lib/session';
import { resetDbForTests } from '@/lib/db';
import { saveSecret, readSecret, listIntegrations } from '@/lib/integrations/store';

describe('encryption', () => {
  it('round-trips and is non-deterministic', () => {
    const a = encrypt('secret'), b = encrypt('secret');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('secret');
  });
  it('detects tampering', () => {
    const parts = encrypt('secret').split('.');
    parts[3] = Buffer.from('xxxxxx').toString('base64url');
    expect(() => decrypt(parts.join('.'))).toThrow();
  });
});

describe('session cookie', () => {
  it('accepts valid, rejects forged/expired/missing', async () => {
    const t = await createSession();
    expect(await verifySession(t)).toBe(true);
    expect(await verifySession(t.slice(0, -2) + 'zz')).toBe(false);
    expect(await verifySession(`1.${t.split('.')[1]}`)).toBe(false);
    expect(await verifySession(undefined)).toBe(false);
  });
});

describe('integration secret storage', () => {
  it('stores credentials encrypted at rest and never lists them', () => {
    const db = resetDbForTests();
    saveSecret('gmail', { access_token: 'tok-123' }, ['a']);
    const raw = (db.prepare('SELECT secret FROM integrations').get() as any).secret as string;
    expect(raw).not.toContain('tok-123');
    expect(readSecret('gmail')).toEqual({ access_token: 'tok-123' });
    const row = listIntegrations().find((i) => i.provider === 'gmail')!;
    expect(row.status).toBe('connected_untested');
    expect(JSON.stringify(row)).not.toContain('tok-123');
  });
});
