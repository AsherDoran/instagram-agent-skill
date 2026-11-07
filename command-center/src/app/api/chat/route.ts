import { NextRequest } from 'next/server';
import { handler, ok } from '@/lib/http';
import { submitInstruction } from '@/lib/manager';
import * as repo from '@/lib/repo';

export const GET = handler(async () => ok({ messages: repo.listMessages() }));
export const POST = handler(async (req: NextRequest) => {
  const { instruction } = await req.json();
  if (typeof instruction !== 'string' || !instruction.trim() || instruction.length > 2000) throw new Error('Instruction required (max 2000 chars)');
  return ok({ task: await submitInstruction(instruction.trim()) });
});
