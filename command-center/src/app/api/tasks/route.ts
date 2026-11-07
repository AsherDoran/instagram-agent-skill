import { handler, ok } from '@/lib/http';
import * as repo from '@/lib/repo';
export const GET = handler(async () => ok({ tasks: repo.listTasks().map((t) => ({ ...t, steps: repo.getSteps(t.id).map((s) => ({ id: s.id, agent: s.agent, action: s.action, status: s.status, attempts: s.attempts })) })) }));
