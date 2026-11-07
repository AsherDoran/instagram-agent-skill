import { handler, ok } from '@/lib/http';
import * as repo from '@/lib/repo';
export const GET = handler(async () => ok({ approvals: repo.listApprovals() }));
