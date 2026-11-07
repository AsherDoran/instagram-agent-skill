import { getStatus } from './store';
import * as mock from './mock';
import * as google from './google';

/** Real adapters are used ONLY once the integration passed its connection test; otherwise mocks. */
const real = (p: string) => getStatus(p) === 'verified';

export const integrations = {
  email: () => (real('gmail') ? google.gmail : mock.mockEmail),
  calendar: () => (real('google_calendar') ? google.calendar : mock.mockCalendar),
  sheets: () => (real('google_sheets') ? google.sheets : mock.mockSheets),
  social: () => mock.mockSocial, // no real social adapter is implemented yet
  research: () => mock.mockResearch, // no real research provider yet
};

export async function testConnection(providerId: string): Promise<{ ok: boolean; note: string }> {
  try {
    if (providerId === 'gmail') return { ok: true, note: await google.gmail.test() };
    if (providerId === 'google_calendar') return { ok: true, note: await google.calendar.test() };
    if (providerId === 'google_sheets') return { ok: true, note: await google.sheets.test() };
    return { ok: false, note: 'No adapter implemented for this platform yet; it stays on mock data.' };
  } catch (e: any) {
    return { ok: false, note: String(e.message || e) };
  }
}
