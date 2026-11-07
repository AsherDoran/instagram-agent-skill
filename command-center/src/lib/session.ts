// Web-Crypto based so it works in both Node routes and Edge middleware.
export const COOKIE = 'cc_session';
const TTL_MS = 1000 * 60 * 60 * 12;

async function hmac(data: string, secret: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
  return Buffer.from(sig).toString('base64url');
}

export async function createSession(secret = process.env.SESSION_SECRET || ''): Promise<string> {
  if (secret.length < 16) throw new Error('SESSION_SECRET missing/too short');
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${await hmac(exp, secret)}`;
}

export async function verifySession(token: string | undefined, secret = process.env.SESSION_SECRET || ''): Promise<boolean> {
  if (!token || secret.length < 16) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = await hmac(exp, secret);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
