import { handler, ok } from '@/lib/http';
import * as repo from '@/lib/repo';
export const GET = handler(async (_r: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params; const task = repo.getTask(id);
  if (!task) throw Object.assign(new Error('Not found'), { status: 404 });
  return ok({ task, steps: repo.getSteps(id), logs: repo.listLogs(200, id).reverse() });
});
