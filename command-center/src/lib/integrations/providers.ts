import type { ProviderInfo } from '../types';

export const PROVIDERS: ProviderInfo[] = [
  { id: 'gmail', name: 'Gmail', group: 'google', adapter: 'implemented',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'] },
  { id: 'google_calendar', name: 'Google Calendar', group: 'google', adapter: 'implemented',
    scopes: ['https://www.googleapis.com/auth/calendar.events'] },
  { id: 'google_sheets', name: 'Google Sheets', group: 'google', adapter: 'implemented',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'] },
  { id: 'instagram', name: 'Instagram', group: 'social', adapter: 'not_implemented', scopes: ['instagram_basic', 'instagram_content_publish'] },
  { id: 'linkedin', name: 'LinkedIn', group: 'social', adapter: 'not_implemented', scopes: ['w_member_social'] },
  { id: 'x', name: 'X (Twitter)', group: 'social', adapter: 'not_implemented', scopes: ['tweet.read', 'tweet.write', 'users.read'] },
];
export const provider = (id: string) => PROVIDERS.find((p) => p.id === id);
