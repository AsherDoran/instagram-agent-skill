import { PLATFORMS, type Entry, type Platform } from "./types";

export type Metric = "followers" | "views";

/** Entries for one platform, oldest first, each with change vs the previous logged day. */
export function withChange(entries: Entry[], platform: Platform) {
  const rows = entries
    .filter((e) => e.platform === platform)
    .sort((a, b) => a.date.localeCompare(b.date));
  return rows.map((e, i) => {
    const prev = rows[i - 1];
    return {
      ...e,
      dFollowers: prev ? e.followers - prev.followers : null,
      dViews: prev ? e.views - prev.views : null,
    };
  });
}

/** Pivot to one object per date: { date, instagram: 10, tiktok: 4, ... } for Recharts. */
export function pivot(entries: Entry[], metric: Metric, change: boolean) {
  const byDate = new Map<string, Record<string, number | string | null>>();
  for (const p of PLATFORMS) {
    for (const r of withChange(entries, p)) {
      const row = byDate.get(r.date) ?? { date: r.date };
      const v = change ? (metric === "followers" ? r.dFollowers : r.dViews) : r[metric];
      row[p] = v;
      byDate.set(r.date, row);
    }
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
