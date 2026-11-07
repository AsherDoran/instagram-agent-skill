"use client";
import { PLATFORM_LABEL, type Entry } from "@/lib/types";

export default function EntriesTable({ entries, onDelete }: { entries: Entry[]; onDelete: (e: Entry) => void }) {
  const rows = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="card">
      <h2>All entries</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Platform</th><th className="num">Views</th><th className="num">Followers</th><th>Top video</th><th /></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.date + e.platform}>
                <td>{e.date}</td><td>{PLATFORM_LABEL[e.platform]}{e.source === "youtube" && " (auto)"}</td>
                <td className="num">{e.views.toLocaleString()}</td><td className="num">{e.followers.toLocaleString()}</td>
                <td>{e.topVideo}</td>
                <td><button className="ghost" onClick={() => confirm(`Delete ${e.platform} ${e.date}?`) && onDelete(e)}>Delete</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="muted">Nothing logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
