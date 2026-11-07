"use client";
import { useCallback, useEffect, useState } from "react";
import type { Entry } from "@/lib/types";
import type { Metric } from "@/lib/stats";
import EntryForm from "@/components/EntryForm";
import Summary from "@/components/Summary";
import Charts from "@/components/Charts";
import EntriesTable from "@/components/EntriesTable";

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [metric, setMetric] = useState<Metric>("followers");
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => setEntries(await (await fetch("/api/entries")).json()), []);
  useEffect(() => { load(); }, [load]);

  async function syncYouTube() {
    setSyncing(true); setMsg("");
    const res = await fetch("/api/youtube/sync", { method: "POST" });
    const json = await res.json();
    setSyncing(false);
    setMsg(res.ok
      ? json.firstRun
        ? "YouTube synced. This was the first sync, so views show 0 - tomorrow's sync will show real daily views."
        : "YouTube synced."
      : json.error);
    load();
  }

  async function remove(e: Entry) {
    await fetch(`/api/entries?date=${e.date}&platform=${e.platform}`, { method: "DELETE" });
    load();
  }

  return (
    <main>
      <div className="row">
        <h1>Social dashboard</h1>
        <div className="row">
          <div className="seg" role="group" aria-label="Metric">
            <button aria-pressed={metric === "followers"} onClick={() => setMetric("followers")}>Followers</button>
            <button aria-pressed={metric === "views"} onClick={() => setMetric("views")}>Views</button>
          </div>
          <button className="ghost" onClick={syncYouTube} disabled={syncing}>{syncing ? "Syncing…" : "Sync YouTube"}</button>
        </div>
      </div>
      {msg && <div className="msg">{msg}</div>}
      <Summary entries={entries} />
      <EntryForm onSaved={load} />
      <Charts entries={entries} metric={metric} />
      <EntriesTable entries={entries} onDelete={remove} />
    </main>
  );
}
