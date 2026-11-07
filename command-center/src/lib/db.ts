import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, instruction TEXT NOT NULL, status TEXT NOT NULL,
  summary TEXT, workflow_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL, agent TEXT NOT NULL, action TEXT NOT NULL, input TEXT NOT NULL,
  status TEXT NOT NULL, output TEXT, error TEXT, attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, step_id TEXT, agent TEXT NOT NULL,
  level TEXT NOT NULL, message TEXT NOT NULL, data TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, task_id TEXT NOT NULL, step_id TEXT NOT NULL, agent TEXT NOT NULL,
  action TEXT NOT NULL, title TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL,
  created_at INTEGER NOT NULL, decided_at INTEGER);
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, steps TEXT NOT NULL, recurrence TEXT NOT NULL DEFAULT 'none',
  next_run_at INTEGER, last_run_at INTEGER, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS integrations (
  provider TEXT PRIMARY KEY, status TEXT NOT NULL, scopes TEXT, secret TEXT,
  last_tested_at INTEGER, last_test_ok INTEGER, note TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, content TEXT NOT NULL, task_id TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, meta TEXT, task_id TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_steps_task ON steps(task_id, idx);
CREATE INDEX IF NOT EXISTS idx_logs_task ON logs(task_id);
`;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const file = process.env.DATABASE_PATH || './data/command-center.db';
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

/** Test helper: swap in a fresh in-memory DB. */
export function resetDbForTests(): Database.Database {
  db?.close();
  db = null;
  process.env.DATABASE_PATH = ':memory:';
  return getDb();
}

export const now = () => Date.now();
export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-3)}`;
