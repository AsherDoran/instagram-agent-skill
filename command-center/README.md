# ⌘ Command Center

A local-first, mobile-friendly dashboard where you give natural-language commands to a **Manager Agent**, which plans the work and delegates it to specialist agents (Email, Social Media, Research, Scheduling). Anything consequential waits in an **approval queue**.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS · SQLite (`better-sqlite3`) · Vitest.

## Honest status

| Area | State |
|---|---|
| Dashboard, chat, task history, logs, approvals, workflow builder | Working, tested |
| Manager planner | Working. Default is a free rule-based planner; optional LLM planner (see *AI provider*) |
| Specialist agents | Working **on mock data** (clearly labelled `mock data` in the UI and logs) |
| Gmail / Google Calendar / Google Sheets adapters | Code written (OAuth + REST), **not tested against real accounts**. Only used after you connect *and* pass "Test connection"; otherwise mocks are used |
| Instagram / LinkedIn / X | **No live adapter yet.** Tokens can be stored encrypted, but agents stay on mock data |
| Research | Mock provider only (no live web access); sample sources are labelled as non-citations |

Nothing is ever sent, published, scheduled or modified externally without you clicking **Approve**. Even then, with mock adapters nothing leaves your machine.

## Setup

```bash
cd command-center
npm install
cp .env.example .env.local
npm run gen-secrets        # paste the 3 lines it prints into .env.local
npm run dev                # http://localhost:3000  (sign in with ADMIN_PASSWORD)
```

Production: `npm run build && npm start`. Tests: `npm test`. Types: `npm run typecheck`.

### Environment variables (`.env.example`)

- `ADMIN_PASSWORD`, `SESSION_SECRET`, `ENCRYPTION_KEY` – required (generate with `npm run gen-secrets`).
- `DATABASE_PATH` – SQLite file (default `./data/command-center.db`).
- `AI_PROVIDER` – `rules` (default, free) or `anthropic` (**paid API**; also needs `ANTHROPIC_API_KEY`). Leave on `rules` unless you deliberately opt in. Invalid/failed LLM output falls back to rules.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL` – for Google OAuth.

### Connecting Google (optional)
1. Google Cloud Console → create a Web OAuth client; add redirect URI `http://localhost:3000/api/integrations/google/callback`.
2. Put the client id/secret in `.env.local`, restart.
3. Integrations page → *Connect with Google OAuth* → then **Test connection**. Only a passing test switches that agent from mock to live.
4. Scopes are per-integration and minimal (Gmail: read + send; Calendar: events; Sheets: spreadsheets). Sending/creating still requires approval in the queue.

## Architecture

```
src/lib/
  manager.ts       Manager Agent: plan → delegate → approval gate → retries → summary; workflows + recurring ticker
  planner.ts       rulePlan() (default) and optional Anthropic planner (zod-validated, falls back)
  agents/index.ts  Agent interface + Email/Social/Research/Scheduler actions (ActionDef.consequential ⇒ approval)
  integrations/    providers, encrypted store, mock adapters, Google adapters, registry (mock vs verified-live)
  crypto.ts        AES-256-GCM for stored credentials
  session.ts       HMAC-signed httpOnly session cookie (Web Crypto; used by middleware)
  db.ts / repo.ts  SQLite schema and queries
src/app/api/*      Server-side route handlers (all behind middleware auth except /login)
```

**Extending:** add an agent by exporting an `Agent` with `actions` and registering it in `AGENTS`; mark risky actions `consequential: true`. Add an AI provider by returning a `Plan` from `plan()`. Add an integration by implementing the adapter shape used in `integrations/mock.ts` and wiring it in `registry.ts`.

## Security model
- Single-admin password login, rate-limited; session cookie is `httpOnly`, `SameSite=Lax`, HMAC-signed, 12h.
- Every page and API route requires the session (middleware). All external API calls happen server-side.
- OAuth tokens / API keys are encrypted at rest (AES-256-GCM) and never returned by any API.
- Approvals are enforced in the executor, not the UI: a consequential step cannot run without an `approved` record.
- Least-privilege scopes per integration; security headers set in `next.config.mjs`.
- Not included: multi-user accounts, HTTPS termination, key rotation. Do not expose publicly without adding those.

## Try it
- `Research "Acme Corp" and report back`
- `Summarize my inbox, draft replies and send them` → approve in **Approvals**
- `Create an Instagram reel script about coffee and schedule it`
- `Remind me to follow up with Dana`
