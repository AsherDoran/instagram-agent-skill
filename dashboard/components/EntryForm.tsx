"use client";
import { useState } from "react";
import { PLATFORMS, PLATFORM_LABEL } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export default function EntryForm({ onSaved }: { onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true); setErr("");
    const res = await fetch("/api/entries", { method: "POST", body: JSON.stringify(data) });
    setBusy(false);
    if (!res.ok) return setErr((await res.json()).error ?? "Could not save");
    form.reset();
    onSaved();
  }

  return (
    <section className="card">
      <h2>Log today</h2>
      <form onSubmit={submit}>
        <label>Date<input type="date" name="date" defaultValue={today()} required /></label>
        <label>Platform
          <select name="platform">{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}</select>
        </label>
        <label>Views today<input type="number" name="views" min={0} required /></label>
        <label>Followers (total)<input type="number" name="followers" min={0} required /></label>
        <label>Top video<input type="text" name="topVideo" placeholder="Title or note" /></label>
        <button disabled={busy}>Save</button>
      </form>
      {err && <p className="down">{err}</p>}
      <p className="muted">Saving the same date + platform again overwrites that row.</p>
    </section>
  );
}
