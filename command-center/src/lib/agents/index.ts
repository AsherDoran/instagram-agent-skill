import type { Agent, ActionResult } from '../types';
import { getDb, now, uid } from '../db';
import { integrations } from '../integrations/registry';
import type { InboxMessage } from '../integrations/mock';

const str = (v: unknown, d = '') => (typeof v === 'string' && v.trim() ? v.trim() : d);
const isMock = (p: { mock: boolean }) => p.mock;
const tag = (m: boolean) => (m ? ' [mock data]' : '');

function categorize(m: InboxMessage): string {
  const t = `${m.subject} ${m.snippet}`.toLowerCase();
  if (/invoice|payment|due|billing/.test(t)) return 'finance';
  if (/quote|pricing|proposal|project/.test(t)) return 'lead';
  if (/call|meeting|schedule|tuesday|wednesday/.test(t)) return 'scheduling';
  if (/newsletter|digest|unsubscribe|tips/.test(t)) return 'newsletter';
  return 'other';
}
const firstName = (from: string) => (from.replace(/<.*>/, '').trim().split(/\s+/)[0] || 'there');
const addr = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from;

export function saveDraft(kind: string, title: string, body: string, meta: unknown, taskId: string) {
  const id = uid('dr');
  getDb().prepare('INSERT INTO drafts(id,kind,title,body,meta,task_id,created_at) VALUES(?,?,?,?,?,?,?)').run(id, kind, title, body, JSON.stringify(meta ?? {}), taskId, now());
  return id;
}

export const emailAgent: Agent = {
  id: 'email', name: 'Email Agent', description: 'Reads authorized inboxes, organizes messages, prepares personalized drafts.',
  actions: {
    triage: {
      label: 'Read & organize inbox',
      async run(_i, ctx) {
        const p = integrations.email();
        const msgs = (await p.listInbox()).map((m) => ({ ...m, category: categorize(m) }));
        const counts: Record<string, number> = {};
        msgs.forEach((m) => (counts[m.category!] = (counts[m.category!] || 0) + 1));
        ctx.log('info', `Read ${msgs.length} messages (read-only)`, counts);
        return { summary: `Organized ${msgs.length} messages: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}.${tag(isMock(p))}`, output: { messages: msgs, counts }, mock: isMock(p) };
      },
    },
    draft_replies: {
      label: 'Prepare personalized drafts',
      async run(_i, ctx) {
        const prev: any = ctx.prev;
        const msgs: InboxMessage[] = prev?.messages ?? (await integrations.email().listInbox()).map((m) => ({ ...m, category: categorize(m) }));
        const targets = msgs.filter((m) => ['lead', 'scheduling', 'finance'].includes(m.category ?? categorize(m)));
        const drafts = targets.map((m) => {
          const body = `Hi ${firstName(m.from)},\n\nThanks for your message about "${m.subject.replace(/^Re:\s*/i, '')}". ` +
            (m.category === 'lead' ? 'I will put together the details and get back to you shortly.' : m.category === 'scheduling' ? 'Happy to find a time that works — I will send a few options.' : 'I have noted this and will follow up before the deadline.') + '\n\nBest regards';
          const id = saveDraft('email', `Re: ${m.subject.replace(/^Re:\s*/i, '')}`, body, { to: addr(m.from), sourceId: m.id }, ctx.taskId);
          return { draftId: id, to: addr(m.from), subject: `Re: ${m.subject.replace(/^Re:\s*/i, '')}`, body };
        });
        ctx.log('info', `Prepared ${drafts.length} local drafts (not sent)`);
        return { summary: `Prepared ${drafts.length} draft replies. Nothing has been sent.`, output: { drafts } };
      },
    },
    send: {
      label: 'Send drafted emails', consequential: true,
      preview(_i, ctx) {
        const drafts = ((ctx.prev as any)?.drafts ?? []) as any[];
        return { title: `Send ${drafts.length} email(s)`, payload: drafts.map((d) => ({ to: d.to, subject: d.subject, body: d.body })) };
      },
      async run(_i, ctx) {
        const drafts = ((ctx.prev as any)?.drafts ?? []) as any[];
        const p = integrations.email();
        const results = [];
        for (const d of drafts) results.push(await p.send(d.to, d.subject, d.body));
        ctx.log('info', `Sent ${results.length} email(s) after approval`);
        return { summary: `${isMock(p) ? 'MOCK-sent' : 'Sent'} ${results.length} email(s).`, output: { results }, mock: isMock(p) };
      },
    },
  },
};

export const socialAgent: Agent = {
  id: 'social', name: 'Social Media Agent', description: 'Content ideas, scripts, scheduling and analytics through authorized platform APIs.',
  actions: {
    ideas: {
      label: 'Generate content ideas',
      async run(i) {
        const topic = str(i.topic, 'your business');
        const ideas = [
          { title: `3 myths about ${topic}`, format: 'carousel' },
          { title: `Behind the scenes: how ${topic} really works`, format: 'reel' },
          { title: `Customer question of the week about ${topic}`, format: 'post' },
          { title: `Before/after: ${topic} results`, format: 'reel' },
          { title: `${topic} checklist (save for later)`, format: 'carousel' },
        ];
        return { summary: `Generated ${ideas.length} content ideas about "${topic}".`, output: { topic, ideas } };
      },
    },
    script: {
      label: 'Write a script',
      async run(i, ctx) {
        const prev: any = ctx.prev;
        const idea = prev?.ideas?.find((x: any) => x.format === 'reel') ?? prev?.ideas?.[0] ?? { title: str(i.topic, 'your topic'), format: 'reel' };
        const script = `HOOK (0-3s): "${idea.title}" — stop scrolling.\nBODY (3-20s): Three quick points that deliver on the hook.\nCTA (20-25s): Follow for more, comment a question.`;
        const id = saveDraft('social', idea.title, script, { format: idea.format, platform: str(i.platform, 'instagram') }, ctx.taskId);
        return { summary: `Wrote a ${idea.format} script for "${idea.title}" (saved as draft).`, output: { draftId: id, title: idea.title, script, platform: str(i.platform, 'instagram') } };
      },
    },
    schedule: {
      label: 'Schedule / publish a post', consequential: true,
      preview(i, ctx) {
        const p: any = ctx.prev;
        return { title: `Schedule post on ${str(i.platform, p?.platform ?? 'instagram')}`, payload: { platform: str(i.platform, p?.platform ?? 'instagram'), text: p?.script ?? str(i.text), when: str(i.when, 'next available slot') } };
      },
      async run(i, ctx) {
        const p: any = ctx.prev; const adapter = integrations.social();
        const platform = str(i.platform, p?.platform ?? 'instagram');
        const r = await adapter.schedulePost(platform, p?.script ?? str(i.text), str(i.when, 'next available slot'));
        return { summary: `${isMock(adapter) ? 'MOCK-scheduled' : 'Scheduled'} post on ${platform}. ${r.note}`, output: r, mock: isMock(adapter) };
      },
    },
    analytics: {
      label: 'Pull analytics',
      async run(i) {
        const a = integrations.social(); const r = await a.analytics(str(i.platform, 'instagram'));
        return { summary: `Analytics for ${r.platform} (${r.period}): reach ${r.reach}, engagement ${(r.engagementRate * 100).toFixed(1)}%.${tag(isMock(a))}`, output: r, mock: isMock(a) };
      },
    },
  },
};

export const researchAgent: Agent = {
  id: 'research', name: 'Research Agent', description: 'Finds public business information and produces structured reports with sources.',
  actions: {
    report: {
      label: 'Produce research report',
      async run(i, ctx) {
        const subject = str(i.subject, 'the requested subject'); const p = integrations.research();
        const r = await p.lookup(subject);
        const markdown = `# Research: ${r.subject}\n\n` + r.sections.map((s) => `## ${s.heading}\n${s.body}`).join('\n\n') + '\n\n## Sources\n' + r.sources.map((s) => `- ${s.title}${s.url ? ` (${s.url})` : ''}`).join('\n');
        saveDraft('research', `Report: ${subject}`, markdown, { sources: r.sources }, ctx.taskId);
        return { summary: `Report on "${subject}" with ${r.sources.length} source(s).${tag(isMock(p))}`, output: { ...r, markdown }, mock: isMock(p) };
      },
    },
  },
};

export const schedulerAgent: Agent = {
  id: 'scheduler', name: 'Scheduling Agent', description: 'Calendar management, reminders and recurring workflows.',
  actions: {
    list: {
      label: 'List upcoming events',
      async run() {
        const c = integrations.calendar(); const ev = await c.listEvents();
        return { summary: `Found ${ev.length} upcoming events.${tag(isMock(c))}`, output: { events: ev }, mock: isMock(c) };
      },
    },
    create_event: {
      label: 'Create calendar event', consequential: true,
      preview(i) { return { title: `Create event "${str(i.title, 'Untitled')}"`, payload: i }; },
      async run(i) {
        const c = integrations.calendar();
        const start = str(i.start, new Date(Date.now() + 86400000).toISOString());
        const r = await c.createEvent({ title: str(i.title, 'Untitled'), start, end: str(i.end, new Date(Date.parse(start) + 3600000).toISOString()) });
        return { summary: `${isMock(c) ? 'MOCK-created' : 'Created'} event "${r.title}". ${r.note}`, output: r, mock: isMock(c) };
      },
    },
    remind: {
      label: 'Set a reminder (local)',
      async run(i, ctx) {
        const text = str(i.text, 'Follow up');
        const id = saveDraft('reminder', text, text, { due: str(i.due, 'tomorrow 09:00') }, ctx.taskId);
        return { summary: `Reminder saved: "${text}" (${str(i.due, 'tomorrow 09:00')}).`, output: { id, text } };
      },
    },
  },
};

export const AGENTS: Record<string, Agent> = { email: emailAgent, social: socialAgent, research: researchAgent, scheduler: schedulerAgent };
export const AGENT_LIST = Object.values(AGENTS);
export function getAction(agent: string, action: string) { return AGENTS[agent]?.actions[action]; }
export type { ActionResult };
