import { describe, it, expect, beforeEach } from 'vitest';
import { resetDbForTests } from '@/lib/db';
import { rulePlan } from '@/lib/planner';
import { submitInstruction, resolveApproval, saveWorkflow, runWorkflow, retryDelayMs, MAX_ATTEMPTS, tickRecurring } from '@/lib/manager';
import * as repo from '@/lib/repo';
import { AGENTS } from '@/lib/agents';
import { getDb } from '@/lib/db';

beforeEach(() => { resetDbForTests(); retryDelayMs.value = 0; });

describe('planner', () => {
  it('routes to the right agents', () => {
    expect(rulePlan('Summarize my inbox and draft replies').steps.map((s) => s.action)).toEqual(['triage', 'draft_replies']);
    expect(rulePlan('Research "Acme Corp"').steps[0]).toMatchObject({ agent: 'research', action: 'report', input: { subject: 'Acme Corp' } });
    expect(rulePlan('Create a reel script about coffee and schedule it').steps.map((s) => s.action)).toContain('schedule');
    expect(rulePlan('Remind me to call Sam').steps[0].agent).toBe('scheduler');
  });
  it('asks for clarification on gibberish', () => {
    expect(rulePlan('asdf qwer').clarification).toBeTruthy();
  });
});

describe('manager', () => {
  it('completes read-only tasks without approvals', async () => {
    const t = await submitInstruction('Research "Acme Corp"');
    expect(t.status).toBe('done');
    expect(repo.listApprovals('pending')).toHaveLength(0);
    expect(repo.getSteps(t.id)[0].output).toMatchObject({ subject: 'Acme Corp' });
  });

  it('never sends email before approval; sends (mock) only after approval', async () => {
    const t = await submitInstruction('Draft replies to my inbox and send them');
    expect(t.status).toBe('awaiting_approval');
    const steps = repo.getSteps(t.id);
    expect(steps.find((s) => s.action === 'send')!.status).toBe('awaiting_approval');
    const [ap] = repo.listApprovals('pending');
    expect(ap.title).toMatch(/Send \d+ email/);
    const done = await resolveApproval(ap.id, 'approved');
    expect(done.status).toBe('done');
    const sent: any = repo.getSteps(t.id).find((s) => s.action === 'send')!.output;
    expect(sent.results[0].delivered).toBe(false); // mock adapter
  });

  it('rejection cancels task and skips remaining steps', async () => {
    const t = await submitInstruction('Make an Instagram reel script about tea and schedule it');
    const [ap] = repo.listApprovals('pending');
    const r = await resolveApproval(ap.id, 'rejected');
    expect(r.status).toBe('cancelled');
    expect(repo.getSteps(t.id).find((s) => s.action === 'schedule')!.status).toBe('rejected');
    await expect(resolveApproval(ap.id, 'approved')).rejects.toThrow(/already decided/);
  });

  it('retries failing actions and logs each attempt', async () => {
    let calls = 0;
    AGENTS.research.actions.flaky = { label: 'Flaky', async run() { calls++; if (calls < 3) throw new Error('boom'); return { summary: 'ok', output: { n: calls } }; } };
    const t = await submitInstruction('x', { steps: [{ agent: 'research', action: 'flaky', input: {} }] });
    expect(t.status).toBe('done');
    expect(calls).toBe(3);
    expect(repo.listLogs(100, t.id).filter((l) => l.level === 'warn')).toHaveLength(2);
    delete AGENTS.research.actions.flaky;
  });

  it('fails after max attempts', async () => {
    AGENTS.research.actions.broken = { label: 'Broken', async run() { throw new Error('nope'); } };
    const t = await submitInstruction('x', { steps: [{ agent: 'research', action: 'broken', input: {} }] });
    expect(t.status).toBe('failed');
    expect(repo.getSteps(t.id)[0].attempts).toBe(MAX_ATTEMPTS);
    delete AGENTS.research.actions.broken;
  });
});

describe('workflows', () => {
  it('validates, saves, runs and gates consequential steps', async () => {
    expect(() => saveWorkflow({ name: 'x', steps: [{ agent: 'email', action: 'nope', input: {} }] })).toThrow();
    const w = saveWorkflow({ name: 'Morning', steps: [{ agent: 'scheduler', action: 'create_event', input: { title: 'Sync' } }] });
    const t = await runWorkflow(w.id);
    expect(t.status).toBe('awaiting_approval');
  });
  it('tick runs due recurring workflows', async () => {
    const w = saveWorkflow({ name: 'Daily', recurrence: 'daily', steps: [{ agent: 'scheduler', action: 'list', input: {} }] });
    getDb().prepare('UPDATE workflows SET next_run_at=1 WHERE id=?').run(w.id);
    expect(await tickRecurring()).toBe(1);
    expect(await tickRecurring()).toBe(0);
  });
});
