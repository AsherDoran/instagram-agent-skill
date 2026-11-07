import { NextResponse } from "next/server";
import { deleteEntry, readEntries, upsertEntry } from "@/lib/store";
import { PLATFORMS, type Entry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readEntries());
}

export async function POST(req: Request) {
  const b = await req.json();
  const platform = b.platform;
  const views = Number(b.views);
  const followers = Number(b.followers);
  if (!PLATFORMS.includes(platform)) return NextResponse.json({ error: "Bad platform" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return NextResponse.json({ error: "Bad date" }, { status: 400 });
  if (!Number.isFinite(views) || !Number.isFinite(followers) || views < 0 || followers < 0)
    return NextResponse.json({ error: "Views and followers must be numbers ≥ 0" }, { status: 400 });
  const entry: Entry = {
    date: b.date,
    platform,
    views,
    followers,
    topVideo: String(b.topVideo ?? "").slice(0, 200),
    source: "manual",
  };
  await upsertEntry(entry);
  return NextResponse.json(entry);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  await deleteEntry(searchParams.get("date") ?? "", searchParams.get("platform") ?? "");
  return NextResponse.json({ ok: true });
}
