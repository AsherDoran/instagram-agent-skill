import { tickRecurring } from './lib/manager';
// Recurring workflows: check once a minute. Consequential steps still need approval.
setInterval(() => { tickRecurring().catch(() => {}); }, 60_000).unref?.();
