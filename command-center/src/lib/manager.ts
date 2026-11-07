import { AGENTS, getAction } from './agents';
import * as repo from './repo';
import { plan } from './planner';
import type { ActionCtx, PlannedStep, Task } from './types';

export const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const retryDelayMs = { value: 300 }; // tests set to 0

/** Manager Agent: plan → delegate → gate consequential actions → summarize. */
export async function submitInstruction(instruction: string, opts: { workflowId?: string; steps?: PlannedStep[] } = {}): Promise<Task> {
  repo.addMessage('user', instruction);
  const task = repo.createTask(instruction, 'planning', opts.workflowId ?? null);
  repo.log('manager', 'info', `Received instruction: ${instruction}`, { taskId: task.id });
  const p = opts.steps ? { steps: opts.steps, planner: 'workflow' as const } : await plan(instruction);
  if (!p.steps.length) {
    repo.updateTask(task.id, { status: 'needs_clarification', summary: (p as any).clarification });
    repo.addMessage('assistant', (p as any).clarification ?? 'Could you rephrase?', task.id);
    repo.log('manager', 'warn', 'No plan produced', { taskId: task.id });
    return repo.getTask(task.id)!;
  }
  repo.addSteps(task.id, p.steps);
  repo.log('manager', 'info', `Planned ${p.steps.length} step(s) via ${p.planner}: ${p.steps.map((s) => `${s.agent}.${s.action}`).join(' → ')}`, { taskId: task.id });
  repo.addMessage('assistant', `Plan: ${p.steps.map((s) => `${AGENTS[s.agent].name} → ${AGENTS[s.agent].actions[s.action]?.label ?? s.action}`).join('  ➜  ')}`, task.id);
  return runTask(task.id);
}

export async function runTask(taskId: string): Promise<Task> {
  repo.updateTask(taskId, { status: 'running' });
  const steps = repo.getSteps(taskId);
  const outputs: unknown[] = [];
  for (const step of steps) {
    if (step.status === 'done') { outputs.push(step.output); continue; }
    if (['rejected', 'skipped', 'failed'].includes(step.status)) continue;
    const def = getAction(step.agent, step.action);
    const log = (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => repo.log(step.agent, level, message, { taskId, stepId: step.id, data });
    if (!def) { repo.updateStep(step.id, { status: 'failed', error: `Unknown action ${step.agent}.${step.action}` }); log('error', `Unknown action ${step.action}`); return finish(taskId); }
    const ctx: ActionCtx = { taskId, prev: outputs[outputs.length - 1], outputs, log };

    if (def.consequential && !isApproved(taskId, step.id)) {
      const existing = repo.listApprovals('pending').find((a) => a.step_id === step.id);
      if (!existing) {
        const pv = def.preview?.(step.input, ctx) ?? { title: def.label, payload: step.input };
        repo.createApproval({ taskId, stepId: step.id, agent: step.agent, action: step.action, title: pv.title, payload: pv.payload });
        log('info', `Waiting for approval: ${pv.title}`);
      }
      repo.updateStep(step.id, { status: 'awaiting_approval' });
      repo.updateTask(taskId, { status: 'awaiting_approval' });
      return repo.getTask(taskId)!;
    }

    let ok = false;
    for (let attempt = step.attempts + 1; attempt <= MAX_ATTEMPTS && !ok; attempt++) {
      repo.updateStep(step.id, { status: 'running', attempts: attempt, error: null });
      log('info', `${def.label}: started (attempt ${attempt}/${MAX_ATTEMPTS})`);
      try {
        const res = await def.run(step.input, ctx);
        repo.updateStep(step.id, { status: 'done', output: res.output });
        log('info', `${def.label}: ${res.summary}`, { mock: !!res.mock });
        outputs.push(res.output); ok = true;
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        repo.updateStep(step.id, { error: msg });
        log(attempt < MAX_ATTEMPTS ? 'warn' : 'error', `${def.label}: failed — ${msg}${attempt < MAX_ATTEMPTS ? ' (retrying)' : ''}`);
        if (attempt < MAX_ATTEMPTS) await sleep(retryDelayMs.value * attempt);
      }
    }
    if (!ok) { repo.updateStep(step.id, { status: 'failed' }); return finish(taskId); }
  }
  return finish(taskId);
}

const isApproved = (taskId: string, stepId: string) =>
  repo.listApprovals('approved').some((a) => a.task_id === taskId && a.step_id === stepId);

export async function resolveApproval(approvalId: string, decision: 'approved' | 'rejected'): Promise<Task> {
  const a = repo.getApproval(approvalId);
  if (!a) throw new Error('Approval not found');
  if (repo.decideApproval(approvalId, decision) === 0) throw new Error('Approval already decided');
  repo.log('manager', 'info', `Approval ${decision}: ${a.title}`, { taskId: a.task_id, stepId: a.step_id });
  if (decision === 'rejected') {
    for (const s of repo.getSteps(a.task_id)) {
      if (s.id === a.step_id) repo.updateStep(s.id, { status: 'rejected' });
      else if (s.idx > repo.getSteps(a.task_id).find((x) => x.id === a.step_id)!.idx && s.status === 'pending') repo.updateStep(s.id, { status: 'skipped' });
    }
    return finish(a.task_id, 'cancelled');
  }
  repo.updateStep(a.step_id, { status: 'pending' });
  return runTask(a.task_id);
}

function finish(taskId: string, force?: 'cancelled'): Task {
  const steps = repo.getSteps(taskId);
  const failed = steps.find((s) => s.status === 'failed');
  const status = force ?? (failed ? 'failed' : steps.some((s) => s.status === 'awaiting_approval') ? 'awaiting_approval' : 'done');
  const lines = steps.map((s) => `${s.status === 'done' ? '✓' : s.status === 'failed' ? '✗' : '•'} ${s.agent}.${s.action} — ${s.status}${s.error ? ` (${s.error})` : ''}`);
  const summary = lines.join('\n');
  repo.updateTask(taskId, { status, summary });
  repo.log('manager', status === 'failed' ? 'error' : 'info', `Task ${status}`, { taskId });
  repo.addMessage('assistant', `Task ${status}.\n${summary}`, taskId);
  return repo.getTask(taskId)!;
}

/* ---------- Workflows ---------- */
import { getDb, now, uid } from './db';
export interface Workflow { id: string; name: string; description: string | null; steps: PlannedStep[]; recurrence: 'none' | 'daily' | 'weekly'; next_run_at: number | null; last_run_at: number | null; created_at: number }
const wf = (r: any): Workflow => ({ ...r, steps: JSON.parse(r.steps) });
export const listWorkflows = () => (getDb().prepare('SELECT * FROM workflows ORDER BY created_at DESC').all() as any[]).map(wf);
export const getWorkflow = (id: string) => { const r = getDb().prepare('SELECT * FROM workflows WHERE id=?').get(id); return r ? wf(r) : undefined; };
const interval = (r: string) => (r === 'daily' ? 86400000 : r === 'weekly' ? 604800000 : 0);

export function saveWorkflow(w: { name: string; description?: string; steps: PlannedStep[]; recurrence?: 'none' | 'daily' | 'weekly' }): Workflow {
  if (!w.name.trim()) throw new Error('Name required');
  if (!w.steps.length) throw new Error('Add at least one step');
  for (const s of w.steps) if (!getAction(s.agent, s.action)) throw new Error(`Unknown action ${s.agent}.${s.action}`);
  const rec = w.recurrence ?? 'none';
  const id = uid('wf');
  getDb().prepare('INSERT INTO workflows(id,name,description,steps,recurrence,next_run_at,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(id, w.name.trim(), w.description ?? null, JSON.stringify(w.steps), rec, rec === 'none' ? null : now() + interval(rec), now());
  return getWorkflow(id)!;
}
export const deleteWorkflow = (id: string) => getDb().prepare('DELETE FROM workflows WHERE id=?').run(id);

export async function runWorkflow(id: string): Promise<Task> {
  const w = getWorkflow(id); if (!w) throw new Error('Workflow not found');
  getDb().prepare('UPDATE workflows SET last_run_at=?, next_run_at=? WHERE id=?').run(now(), w.recurrence === 'none' ? null : now() + interval(w.recurrence), id);
  return submitInstruction(`Workflow: ${w.name}`, { workflowId: id, steps: w.steps });
}

/** Runs due recurring workflows. Consequential steps still land in the approval queue. */
export async function tickRecurring(): Promise<number> {
  const due = (getDb().prepare('SELECT id FROM workflows WHERE next_run_at IS NOT NULL AND next_run_at <= ?').all(now()) as any[]);
  for (const d of due) await runWorkflow(d.id);
  return due.length;
}
