import { NextRequest } from 'next/server';
import { handler, ok } from '@/lib/http';
import { listWorkflows, saveWorkflow, deleteWorkflow } from '@/lib/manager';
export const GET = handler(async () => ok({ workflows: listWorkflows() }));
export const POST = handler(async (req: NextRequest) => ok({ workflow: saveWorkflow(await req.json()) }, 201));
export const DELETE = handler(async (req: NextRequest) => { deleteWorkflow(String(req.nextUrl.searchParams.get('id'))); return ok({ ok: true }); });
