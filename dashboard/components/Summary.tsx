"use client";
import { PLATFORMS, PLATFORM_LABEL, type Entry } from "@/lib/types";
import { withChange } from "@/lib/stats";
import { COLOR } from "./Charts";

const sign = (n: number | null) => (n == null ? "–" : `${n > 0 ? "▲ +" : n < 0 ? "▼ " : ""}${n.toLocaleString()}`);
const cls = (n: number | null) => (n == null || n === 0 ? "muted" : n > 0 ? "up" : "down");

export default function Summary({ entries }: { entries: Entry[] }) {
  return (
    <div className="grid3">
      {PLATFORMS.map((p) => {
        const rows = withChange(entries, p);
        const last = rows[rows.length - 1];
        return (
          <div className="card stat" key={p}>
            <div><span className="dot" style={{ background: COLOR[p] }} />{PLATFORM_LABEL[p]}</div>
            {last ? (
              <>
                <div className="big">{last.followers.toLocaleString()} <span className="muted">followers</span></div>
                <div className={cls(last.dFollowers)}>{sign(last.dFollowers)} vs previous day</div>
                <div style={{ marginTop: 8 }}>{last.views.toLocaleString()} views <span className={cls(last.dViews)}>({sign(last.dViews)})</span></div>
                <div className="muted">Top: {last.topVideo || "–"}</div>
                <div className="muted">as of {last.date}</div>
              </>
            ) : <p className="muted">No data yet.</p>}
          </div>
        );
      })}
    </div>
  );
}
