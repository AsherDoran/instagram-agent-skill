import { handler, ok } from '@/lib/http';
import { runWorkflow } from '@/lib/manager';
export const POST = handler(async (_r: Request, { params }: { params: Promise<{ id: string }> }) => ok({ task: await runWorkflow((await params).id) }));
