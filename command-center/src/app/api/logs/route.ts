import { NextRequest } from 'next/server';
import { handler, ok } from '@/lib/http';
import * as repo from '@/lib/repo';
export const GET = handler(async (req: NextRequest) => ok({ logs: repo.listLogs(Math.min(500, Number(req.nextUrl.searchParams.get('limit')) || 200)) }));
