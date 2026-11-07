# Social dashboard

A small Next.js app to log daily **views, followers and top video** for Instagram, TikTok and YouTube,
and see growth + day-over-day change in charts. Your numbers are saved in `data/log.json` on your own
machine (git-ignored). No database, no account.

```bash
cd dashboard
npm install
npm run dev        # http://localhost:3000
```

## Step 1 - log by hand

Fill in the "Log today" form once a day per platform. Saving the same date + platform again overwrites
that row, so fixing a typo is just logging it again. The charts and the "vs previous day" numbers update
immediately. Use the Followers / Views toggle to switch both charts.

Where to read the numbers: each app's built-in analytics (Instagram: Professional dashboard,
TikTok: Creator Tools > Analytics, YouTube: Studio > Analytics).

## Step 2 - YouTube fills itself in

1. Go to <https://console.cloud.google.com> and create a project (any name).
2. **APIs & Services > Library** > search **YouTube Data API v3** > **Enable**.
3. **APIs & Services > Credentials > Create credentials > API key**. Copy it.
   (Optional but wise: click the key > *API restrictions* > restrict to YouTube Data API v3.)
4. In `dashboard/`, copy `.env.example` to `.env.local` and fill in:
   ```
   YOUTUBE_API_KEY=your-key
   YOUTUBE_CHANNEL_HANDLE=@yourhandle
   ```
   (or `YOUTUBE_CHANNEL_ID=UC...` instead of the handle). Restart `npm run dev`.
5. Click **Sync YouTube** on the dashboard. It saves today's row for YouTube.

What gets filled in, and the honest limits:
- **Followers** = your subscriber count. YouTube rounds it publicly (e.g. 12,345 shows as 12,300).
- **Views** = YouTube only reports a lifetime total, so daily views = today's total minus the total from your
  last sync. The first sync therefore shows 0 views; click sync once a day (or after a gap, it covers the gap).
- **Top video** = the most-viewed of your latest 50 uploads (all-time views, not "today"). A true
  "top video today" needs the YouTube Analytics API, which requires OAuth login; ask if you want that.
- The key is only used on the server (`app/api/youtube/sync`), never sent to the browser. Cost: ~3 quota
  units per sync out of 10,000/day.

## Step 3 - Instagram

See [INSTAGRAM_SETUP.md](./INSTAGRAM_SETUP.md).
