// Real Google adapters (server-side only, tokens decrypted per call).
// UNVERIFIED until a user connects real credentials and the "Test connection" check passes.
import { readSecret, saveSecret } from './store';
import { PROVIDERS } from './providers';
import type { InboxMessage, CalEvent } from './mock';

interface Tokens { access_token: string; refresh_token?: string; expires_at: number }

async function token(provider: string): Promise<string> {
  const t = readSecret<Tokens>(provider);
  if (!t) throw new Error(`${provider}: not connected`);
  if (t.expires_at > Date.now() + 30_000) return t.access_token;
  if (!t.refresh_token) throw new Error(`${provider}: token expired, reconnect`);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', refresh_token: t.refresh_token, grant_type: 'refresh_token' }),
  });
  if (!r.ok) throw new Error(`${provider}: refresh failed (${r.status})`);
  const j: any = await r.json();
  const next = { ...t, access_token: j.access_token, expires_at: Date.now() + j.expires_in * 1000 };
  saveSecret(provider, next, (PROVIDERS.find((p) => p.id === provider)?.scopes) ?? []);
  return next.access_token;
}

async function g(provider: string, url: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${await token(provider)}`, 'content-type': 'application/json' } });
  if (!r.ok) throw new Error(`Google API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json() as Promise<any>;
}

export function googleAuthUrl(provider: string, state: string): string {
  const p = PROVIDERS.find((x) => x.id === provider)!;
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '', redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/integrations/google/callback`,
    response_type: 'code', access_type: 'offline', prompt: 'consent', scope: p.scopes.join(' '), state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export async function exchangeCode(code: string): Promise<Tokens> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/integrations/google/callback`, grant_type: 'authorization_code' }),
  });
  if (!r.ok) throw new Error(`Token exchange failed (${r.status})`);
  const j: any = await r.json();
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + j.expires_in * 1000 };
}

export const gmail = {
  mock: false,
  async test() { const j = await g('gmail', 'https://gmail.googleapis.com/gmail/v1/users/me/profile'); return `Connected as ${j.emailAddress}`; },
  async listInbox(): Promise<InboxMessage[]> {
    const list = await g('gmail', 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&labelIds=INBOX');
    return Promise.all((list.messages ?? []).map(async (m: any) => {
      const d = await g('gmail', `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
      const h = (n: string) => d.payload?.headers?.find((x: any) => x.name === n)?.value ?? '';
      return { id: m.id, from: h('From'), subject: h('Subject'), snippet: d.snippet ?? '', receivedAt: h('Date') };
    }));
  },
  async send(to: string, subject: string, body: string) {
    const raw = Buffer.from(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`).toString('base64url');
    const j = await g('gmail', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', body: JSON.stringify({ raw }) });
    return { id: j.id, to, subject, delivered: true, note: 'Sent via Gmail API' };
  },
};

export const calendar = {
  mock: false,
  async test() { const j = await g('google_calendar', 'https://www.googleapis.com/calendar/v3/calendars/primary'); return `Connected to calendar "${j.summary}"`; },
  async listEvents(): Promise<CalEvent[]> {
    const j = await g('google_calendar', `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(new Date().toISOString())}`);
    return (j.items ?? []).map((e: any) => ({ id: e.id, title: e.summary ?? '(no title)', start: e.start?.dateTime ?? e.start?.date, end: e.end?.dateTime ?? e.end?.date }));
  },
  async createEvent(e: { title: string; start: string; end: string }) {
    const j = await g('google_calendar', 'https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', body: JSON.stringify({ summary: e.title, start: { dateTime: e.start }, end: { dateTime: e.end } }) });
    return { id: j.id, ...e, note: 'Created via Google Calendar API' };
  },
};

export const sheets = {
  mock: false,
  async test() { await token('google_sheets'); return 'Token valid (spreadsheet access is checked per-sheet on first use)'; },
  async appendRows(sheetId: string, rows: unknown[][]) {
    await g('google_sheets', `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/A1:append?valueInputOption=USER_ENTERED`, { method: 'POST', body: JSON.stringify({ values: rows }) });
    return { sheet: sheetId, appended: rows.length, note: 'Appended via Google Sheets API' };
  },
};
