import { z } from 'zod';
import type { PlannedStep } from './types';
import { AGENTS, getAction } from './agents';

export interface Plan { steps: PlannedStep[]; clarification?: string; planner: 'rules' | 'anthropic' }

const has = (t: string, ...w: string[]) => w.some((x) => t.includes(x));

/** Deterministic, free planner. Used by default and as fallback for any LLM planner. */
export function rulePlan(instruction: string): Plan {
  const t = instruction.toLowerCase();
  const steps: PlannedStep[] = [];
  const quoted = instruction.match(/["“]([^"”]+)["”]/)?.[1];
  const afterAbout = instruction.match(/\b(?:about|on|for|of)\s+(.{3,60}?)(?:[.,;!?]|\sand\s|$)/i)?.[1]?.trim();
  const topic = quoted ?? afterAbout ?? instruction.slice(0, 60);
  const platform = has(t, 'linkedin') ? 'linkedin' : has(t, 'twitter', ' x ') ? 'x' : 'instagram';

  if (has(t, 'email', 'inbox', 'reply', 'replies', 'draft')) {
    steps.push({ agent: 'email', action: 'triage', input: {} }, { agent: 'email', action: 'draft_replies', input: {} });
    if (has(t, 'send')) steps.push({ agent: 'email', action: 'send', input: {} });
  }
  if (has(t, 'research', 'competitor', 'company', 'find out', 'report on', 'look up')) {
    const subject = quoted ?? instruction.match(/(?:research|report on|look up|find out about|about)\s+(.{2,60}?)(?:[.,;!?]|\sand\s|$)/i)?.[1]?.trim() ?? topic;
    steps.push({ agent: 'research', action: 'report', input: { subject } });
  }
  if (has(t, 'social', 'instagram', 'linkedin', 'tweet', 'post', 'content', 'reel', 'script', 'analytics')) {
    if (has(t, 'analytics', 'performance', 'metrics')) steps.push({ agent: 'social', action: 'analytics', input: { platform } });
    if (has(t, 'idea', 'content', 'script', 'reel', 'post', 'calendar')) {
      steps.push({ agent: 'social', action: 'ideas', input: { topic } }, { agent: 'social', action: 'script', input: { platform, topic } });
      if (has(t, 'schedule', 'publish', 'post it')) steps.push({ agent: 'social', action: 'schedule', input: { platform } });
    }
  }
  if (has(t, 'remind')) steps.push({ agent: 'scheduler', action: 'remind', input: { text: instruction.replace(/^.*?remind me( to)?/i, '').trim() || instruction, due: 'tomorrow 09:00' } });
  if (has(t, 'calendar', 'meeting', 'event', 'appointment', 'my schedule') && !steps.some((s) => s.agent === 'social')) {
    if (has(t, 'create', 'book', 'add', 'schedule a', 'set up')) steps.push({ agent: 'scheduler', action: 'create_event', input: { title: quoted ?? topic } });
    else steps.push({ agent: 'scheduler', action: 'list', input: {} });
  }
  if (!steps.length) return { steps, planner: 'rules', clarification: 'I could not map that to an agent. Try mentioning email, social media, research, or calendar/reminders — e.g. "Research Acme Corp and draft replies to my inbox".' };
  return { steps, planner: 'rules' };
}

const PlanSchema = z.object({ steps: z.array(z.object({ agent: z.enum(['email', 'social', 'research', 'scheduler']), action: z.string(), input: z.record(z.string(), z.unknown()).default({}) })).max(8) });

/** Optional PAID planner. Only used when AI_PROVIDER=anthropic and a key is configured. */
export async function plan(instruction: string): Promise<Plan> {
  if (process.env.AI_PROVIDER === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    try {
      const catalog = Object.values(AGENTS).map((a) => `${a.id}: ${Object.keys(a.actions).join(', ')}`).join('\n');
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 800,
          system: `You are a task planner. Break the instruction into ordered steps using ONLY these agents/actions:\n${catalog}\nReply with JSON only: {"steps":[{"agent":"","action":"","input":{}}]}. Empty steps if unclear.`,
          messages: [{ role: 'user', content: instruction }] }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: any = await r.json();
      const parsed = PlanSchema.parse(JSON.parse(String(j.content?.[0]?.text).replace(/^```json|```$/g, '').trim()));
      const steps = parsed.steps.filter((s) => getAction(s.agent, s.action));
      if (steps.length) return { steps, planner: 'anthropic' };
    } catch { /* fall through to rules */ }
  }
  return rulePlan(instruction);
}
