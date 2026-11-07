export const PLATFORMS = ["instagram", "tiktok", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/** One row = one platform on one day. Saving the same day+platform again overwrites it. */
export interface Entry {
  date: string; // YYYY-MM-DD
  platform: Platform;
  views: number; // views that day
  followers: number; // total followers/subscribers at end of day
  topVideo: string; // title or note
  source: "manual" | "youtube";
  lifetimeViews?: number; // YouTube only: channel total, used to work out daily views
}
