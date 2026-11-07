import { handler, ok } from '@/lib/http';
import * as repo from '@/lib/repo';
import { AGENT_LIST } from '@/lib/agents';
import { getDb } from '@/lib/db';
import { listIntegrations } from '@/lib/integrations/store';

export const GET = handler(async () => {
  const running = getDb().prepare("SELECT agent, COUNT(*) n FROM steps WHERE status='running' GROUP BY agent").all() as any[];
  const waiting = getDb().prepare("SELECT agent, COUNT(*) n FROM steps WHERE status='awaiting_approval' GROUP BY agent").all() as any[];
  const last = getDb().prepare('SELECT agent, MAX(created_at) t FROM logs GROUP BY agent').all() as any[];
  const agents = [{ id: 'manager', name: 'Manager Agent', description: 'Plans and delegates tasks' }, ...AGENT_LIST.map((a) => ({ id: a.id, name: a.name, description: a.description }))].map((a) => ({
    ...a,
    status: running.find((r) => r.agent === a.id) ? 'working' : waiting.find((r) => r.agent === a.id) ? 'waiting for approval' : 'idle',
    lastActive: last.find((l) => l.agent === a.id)?.t ?? null,
  }));
  return ok({
    agents, activity: repo.listLogs(15), tasks: repo.listTasks(8),
    pendingApprovals: repo.listApprovals('pending').length,
    integrations: listIntegrations().map((i) => ({ provider: i.provider, status: i.status })),
  });
});
