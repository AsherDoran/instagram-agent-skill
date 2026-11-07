import { NextResponse } from "next/server";
import { readEntries, upsertEntry } from "@/lib/store";
import type { Entry } from "@/lib/types";

export const dynamic = "force-dynamic";

const API = "https://www.googleapis.com/youtube/v3";

async function yt(path: string, params: Record<string, string>) {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY! })}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `YouTube API error ${res.status}`);
  return json;
}

export async function POST() {
  if (!process.env.YOUTUBE_API_KEY)
    return NextResponse.json({ error: "Missing YOUTUBE_API_KEY in .env.local (see README step 2)." }, { status: 400 });
  const handle = process.env.YOUTUBE_CHANNEL_HANDLE;
  const id = process.env.YOUTUBE_CHANNEL_ID;
  if (!handle && !id)
    return NextResponse.json({ error: "Set YOUTUBE_CHANNEL_HANDLE or YOUTUBE_CHANNEL_ID in .env.local." }, { status: 400 });

  try {
    // 1) Channel totals + the id of its "uploads" playlist.
    const ch = await yt("channels", {
      part: "statistics,contentDetails",
      ...(id ? { id } : { forHandle: handle! }),
    });
    const channel = ch.items?.[0];
    if (!channel) throw new Error("Channel not found - check your handle / channel ID.");
    const followers = Number(channel.statistics.subscriberCount); // YouTube rounds this to 3 significant figures
    const lifetimeViews = Number(channel.statistics.viewCount);

    // 2) Latest 50 uploads, then their view counts; "top video" = most viewed of those.
    const uploads = channel.contentDetails.relatedPlaylists.uploads;
    const items = await yt("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: "50" });
    const ids = items.items.map((i: any) => i.contentDetails.videoId).join(",");
    let topVideo = "";
    if (ids) {
      const vids = await yt("videos", { part: "snippet,statistics", id: ids });
      const best = [...vids.items].sort((a: any, b: any) => Number(b.statistics.viewCount) - Number(a.statistics.viewCount))[0];
      if (best) topVideo = `${best.snippet.title} (${Number(best.statistics.viewCount).toLocaleString()} views)`;
    }

    // 3) The API only gives a lifetime total, so daily views = today's total minus the last saved total.
    const today = new Date().toISOString().slice(0, 10);
    const prev = (await readEntries())
      .filter((e) => e.platform === "youtube" && e.lifetimeViews != null && e.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const views = prev ? Math.max(0, lifetimeViews - prev.lifetimeViews!) : 0;

    const entry: Entry = { date: today, platform: "youtube", views, followers, topVideo, source: "youtube", lifetimeViews };
    await upsertEntry(entry);
    return NextResponse.json({ entry, firstRun: !prev });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
