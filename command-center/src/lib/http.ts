import { NextResponse } from 'next/server';
export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export function handler<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A) => {
    try { return await fn(...a); }
    catch (e: any) { return NextResponse.json({ error: String(e?.message ?? e) }, { status: e?.status ?? 400 }); }
  };
}
