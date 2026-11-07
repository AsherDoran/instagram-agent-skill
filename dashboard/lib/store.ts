import { promises as fs } from "fs";
import path from "path";
import type { Entry } from "./types";

// Your data lives in a plain JSON file on your own machine.
const FILE = path.join(process.cwd(), "data", "log.json");

export async function readEntries(): Promise<Entry[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return []; // first run: no file yet
  }
}

export async function writeEntries(entries: Entry[]) {
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform));
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(entries, null, 2));
}

export async function upsertEntry(entry: Entry) {
  const all = await readEntries();
  const rest = all.filter((e) => !(e.date === entry.date && e.platform === entry.platform));
  await writeEntries([...rest, entry]);
}

export async function deleteEntry(date: string, platform: string) {
  const all = await readEntries();
  await writeEntries(all.filter((e) => !(e.date === date && e.platform === platform)));
}
