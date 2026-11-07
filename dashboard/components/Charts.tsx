"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLATFORMS, PLATFORM_LABEL, type Entry } from "@/lib/types";
import { pivot, type Metric } from "@/lib/stats";

export const COLOR = { instagram: "var(--ig)", tiktok: "var(--tt)", youtube: "var(--yt)" } as const;
const fmt = (n: number) => n.toLocaleString();
const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false } as const;

export default function Charts({ entries, metric }: { entries: Entry[]; metric: Metric }) {
  const growth = pivot(entries, metric, false);
  const change = pivot(entries, metric, true);
  const present = PLATFORMS.filter((p) => entries.some((e) => e.platform === p));
  const tip = { contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8 }, formatter: (v: number) => fmt(v) };

  return (
    <>
      <section className="card">
        <h2>{metric === "followers" ? "Followers" : "Daily views"} over time</h2>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={growth} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" {...axis} />
              <YAxis {...axis} tickFormatter={fmt} width={56} domain={metric === "followers" ? ["auto", "auto"] : [0, "auto"]} />
              <Tooltip {...tip} />
              <Legend />
              {present.map((p) => (
                <Line key={p} type="monotone" dataKey={p} name={PLATFORM_LABEL[p]} stroke={COLOR[p]} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2>Day-over-day change in {metric === "followers" ? "followers" : "views"}</h2>
        <p className="muted" style={{ marginTop: -8 }}>Compared with each platform&apos;s previous logged day.</p>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={change} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" {...axis} />
              <YAxis {...axis} tickFormatter={fmt} width={56} />
              <ReferenceLine y={0} stroke="var(--muted)" />
              <Tooltip {...tip} />
              <Legend />
              {present.map((p) => (
                <Bar key={p} dataKey={p} name={PLATFORM_LABEL[p]} fill={COLOR[p]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
