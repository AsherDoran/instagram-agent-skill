import { NextRequest } from 'next/server';
import { handler, ok } from '@/lib/http';
import { resolveApproval } from '@/lib/manager';
export const POST = handler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { decision } = await req.json(); const { id } = await params;
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('decision must be approved|rejected');
  return ok({ task: await resolveApproval(id, decision) });
});
