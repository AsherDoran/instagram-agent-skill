import { getDb, now, uid } from './db';
import type { Step, Task, StepStatus, TaskStatus, PlannedStep } from './types';

const parse = (s: string | null) => (s == null ? null : JSON.parse(s));
const rowToStep = (r: any): Step => ({ ...r, input: parse(r.input) ?? {}, output: parse(r.output) });

export function log(agent: string, level: 'info' | 'warn' | 'error', message: string, opts: { taskId?: string; stepId?: string; data?: unknown } = {}) {
  getDb().prepare('INSERT INTO logs(task_id,step_id,agent,level,message,data,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(opts.taskId ?? null, opts.stepId ?? null, agent, level, message, opts.data === undefined ? null : JSON.stringify(opts.data), now());
}
export const listLogs = (limit = 200, taskId?: string) =>
  (taskId ? getDb().prepare('SELECT * FROM logs WHERE task_id=? ORDER BY id DESC LIMIT ?').all(taskId, limit) : getDb().prepare('SELECT * FROM logs ORDER BY id DESC LIMIT ?').all(limit)) as any[];

export function createTask(instruction: string, status: TaskStatus = 'planning', workflowId: string | null = null): Task {
  const t = { id: uid('t'), instruction, status, summary: null, workflow_id: workflowId, created_at: now(), updated_at: now() };
  getDb().prepare('INSERT INTO tasks VALUES(@id,@instruction,@status,@summary,@workflow_id,@created_at,@updated_at)').run(t);
  return t;
}
export function updateTask(id: string, patch: Partial<Pick<Task, 'status' | 'summary'>>) {
  const t = getTask(id)!;
  getDb().prepare('UPDATE tasks SET status=?, summary=?, updated_at=? WHERE id=?').run(patch.status ?? t.status, patch.summary ?? t.summary, now(), id);
}
export const getTask = (id: string) => getDb().prepare('SELECT * FROM tasks WHERE id=?').get(id) as Task | undefined;
export const listTasks = (limit = 50) => getDb().prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?').all(limit) as Task[];

export function addSteps(taskId: string, steps: PlannedStep[]) {
  const ins = getDb().prepare('INSERT INTO steps(id,task_id,idx,agent,action,input,status,attempts,created_at,updated_at) VALUES(?,?,?,?,?,?,?,0,?,?)');
  steps.forEach((s, i) => ins.run(uid('s'), taskId, i, s.agent, s.action, JSON.stringify(s.input ?? {}), 'pending', now(), now()));
}
export const getSteps = (taskId: string) => (getDb().prepare('SELECT * FROM steps WHERE task_id=? ORDER BY idx').all(taskId) as any[]).map(rowToStep);
export function updateStep(id: string, p: { status?: StepStatus; output?: unknown; error?: string | null; attempts?: number }) {
  const s = getDb().prepare('SELECT * FROM steps WHERE id=?').get(id) as any;
  getDb().prepare('UPDATE steps SET status=?, output=?, error=?, attempts=?, updated_at=? WHERE id=?').run(
    p.status ?? s.status, p.output === undefined ? s.output : JSON.stringify(p.output), p.error === undefined ? s.error : p.error, p.attempts ?? s.attempts, now(), id);
}

export function createApproval(a: { taskId: string; stepId: string; agent: string; action: string; title: string; payload: unknown }) {
  const id = uid('ap');
  getDb().prepare('INSERT INTO approvals VALUES(?,?,?,?,?,?,?,?,?,NULL)').run(id, a.taskId, a.stepId, a.agent, a.action, a.title, JSON.stringify(a.payload), 'pending', now());
  return id;
}
export const getApproval = (id: string) => { const r = getDb().prepare('SELECT * FROM approvals WHERE id=?').get(id) as any; return r && { ...r, payload: parse(r.payload) }; };
export const listApprovals = (status?: string) => (getDb().prepare(status ? 'SELECT * FROM approvals WHERE status=? ORDER BY created_at DESC' : 'SELECT * FROM approvals ORDER BY created_at DESC LIMIT 100').all(...(status ? [status] : [])) as any[]).map((r) => ({ ...r, payload: parse(r.payload) }));
export const decideApproval = (id: string, status: 'approved' | 'rejected') => getDb().prepare('UPDATE approvals SET status=?, decided_at=? WHERE id=? AND status=\'pending\'').run(status, now(), id).changes;

export const addMessage = (role: 'user' | 'assistant', content: string, taskId?: string) => getDb().prepare('INSERT INTO messages(role,content,task_id,created_at) VALUES(?,?,?,?)').run(role, content, taskId ?? null, now());
export const listMessages = (limit = 100) => (getDb().prepare('SELECT * FROM messages ORDER BY id DESC LIMIT ?').all(limit) as any[]).reverse();
export const listDrafts = (limit = 50) => getDb().prepare('SELECT * FROM drafts ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
