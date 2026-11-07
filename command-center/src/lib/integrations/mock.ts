// Deterministic mock adapters. Everything returned here is SAMPLE DATA and is flagged `mock: true`.
export interface InboxMessage { id: string; from: string; subject: string; snippet: string; receivedAt: string; category?: string }
export interface CalEvent { id: string; title: string; start: string; end: string; attendees?: string[] }

export const mockEmail = {
  mock: true,
  async listInbox(): Promise<InboxMessage[]> {
    return [
      { id: 'm1', from: 'Dana Ortiz <dana@example.com>', subject: 'Quote request for Q1 project', snippet: 'Could you send pricing for the Q1 rollout?', receivedAt: '2026-11-06T09:12:00Z' },
      { id: 'm2', from: 'Billing <billing@vendor.example>', subject: 'Invoice #1042 due Friday', snippet: 'Your invoice is due on Friday.', receivedAt: '2026-11-06T11:40:00Z' },
      { id: 'm3', from: 'Newsletter <news@digest.example>', subject: 'This week in automation', snippet: 'Top 10 workflow tips...', receivedAt: '2026-11-05T07:00:00Z' },
      { id: 'm4', from: 'Sam Lee <sam@example.org>', subject: 'Re: Intro call next week?', snippet: 'Tuesday or Wednesday works for me.', receivedAt: '2026-11-07T08:05:00Z' },
    ];
  },
  async send(to: string, subject: string, _body: string) { return { id: 'mock-sent-' + Date.now(), to, subject, delivered: false, note: 'MOCK: nothing was actually sent' }; },
};

export const mockCalendar = {
  mock: true,
  async listEvents(): Promise<CalEvent[]> {
    return [
      { id: 'e1', title: 'Team standup', start: '2026-11-09T09:00:00Z', end: '2026-11-09T09:15:00Z' },
      { id: 'e2', title: 'Client review', start: '2026-11-10T15:00:00Z', end: '2026-11-10T16:00:00Z', attendees: ['dana@example.com'] },
    ];
  },
  async createEvent(e: { title: string; start: string; end: string }) { return { id: 'mock-ev-' + Date.now(), ...e, note: 'MOCK: no calendar was modified' }; },
};

export const mockSheets = {
  mock: true,
  async appendRows(sheet: string, rows: unknown[][]) { return { sheet, appended: rows.length, note: 'MOCK: no spreadsheet was modified' }; },
};

export const mockSocial = {
  mock: true,
  async schedulePost(platform: string, text: string, when: string) { return { id: 'mock-post-' + Date.now(), platform, text, when, published: false, note: 'MOCK: nothing was published' }; },
  async analytics(platform: string) {
    return { platform, period: 'last 7 days (sample data)', followers: 1280, reach: 9400, engagementRate: 0.047, topPost: 'Behind-the-scenes reel' };
  },
};

export const mockResearch = {
  mock: true,
  async lookup(subject: string) {
    return {
      subject,
      sections: [
        { heading: 'Overview', body: `Sample overview for "${subject}". Replace with a real research provider to get live public data.` },
        { heading: 'Products & services', body: 'Sample: core offering, pricing tiers, target customers.' },
        { heading: 'Recent news', body: 'Sample: no live web access in mock mode.' },
      ],
      sources: [{ title: 'Sample source (mock – not a real citation)', url: null as string | null }],
    };
  },
};
