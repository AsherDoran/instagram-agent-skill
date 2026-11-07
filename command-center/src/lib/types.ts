export type AgentId = 'manager' | 'email' | 'social' | 'research' | 'scheduler';
export type StepStatus = 'pending' | 'running' | 'awaiting_approval' | 'done' | 'failed' | 'rejected' | 'skipped';
export type TaskStatus = 'planning' | 'running' | 'awaiting_approval' | 'done' | 'failed' | 'cancelled' | 'needs_clarification';

export interface PlannedStep { agent: Exclude<AgentId, 'manager'>; action: string; input: Record<string, unknown> }
export interface Step extends PlannedStep { id: string; task_id: string; idx: number; status: StepStatus; output: unknown; error: string | null; attempts: number }
export interface Task { id: string; instruction: string; status: TaskStatus; summary: string | null; workflow_id: string | null; created_at: number; updated_at: number }

export interface ActionResult { summary: string; output: unknown; mock?: boolean }
export interface ActionCtx {
  taskId: string;
  prev: unknown;            // output of the previous step
  outputs: unknown[];       // outputs of all earlier steps
  log: (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
}
export interface ActionDef {
  label: string;
  /** Consequential actions never run without an approved entry in the approval queue. */
  consequential?: boolean;
  /** Human-readable preview shown in the approval queue. */
  preview?: (input: Record<string, unknown>, ctx: ActionCtx) => { title: string; payload: unknown };
  run: (input: Record<string, unknown>, ctx: ActionCtx) => Promise<ActionResult>;
}
export interface Agent { id: Exclude<AgentId, 'manager'>; name: string; description: string; actions: Record<string, ActionDef> }

export type IntegrationStatus = 'mock' | 'connected_untested' | 'verified' | 'error';
export interface ProviderInfo { id: string; name: string; group: 'google' | 'social'; scopes: string[]; adapter: 'implemented' | 'not_implemented' }
