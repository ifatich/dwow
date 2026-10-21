import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

function getDatabasePath(): string {
  const candidatePaths = [
    path.join(process.cwd(), "taskforge.db"),
    path.join(process.cwd(), ".next/server/taskforge.db"),
    path.join(process.cwd(), ".next/standalone/taskforge.db"),
    path.resolve("./taskforge.db"),
  ];

  if (isVercel) {
    const tmpPath = "/tmp/taskforge.db";
    
    // Copy bundled db file to writable /tmp on Vercel AWS Lambda
    if (!fs.existsSync(tmpPath)) {
      for (const cand of candidatePaths) {
        if (fs.existsSync(cand)) {
          try {
            fs.copyFileSync(cand, tmpPath);
            return tmpPath;
          } catch (err) {
            console.error("Failed to copy db to /tmp:", err);
          }
        }
      }
    } else {
      return tmpPath;
    }
  }

  for (const cand of candidatePaths) {
    if (fs.existsSync(cand)) return cand;
  }

  return candidatePaths[0];
}

const dbPath = getDatabasePath();

// LibSQL Client initialization:
// If TURSO_DATABASE_URL is provided, connect directly to Turso cloud database.
// Otherwise, connect to local SQLite file.
const clientUrl = tursoUrl ? tursoUrl : `file:${dbPath}`;

const rawLibsqlClient: Client = createClient({
  url: clientUrl,
  authToken: tursoAuthToken,
});

let schemaSyncPromise: Promise<void> | null = null;

/**
 * Ensures all required tables and columns exist in Turso Cloud / SQLite.
 * Executes automatically and transparently on the first database operation.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaSyncPromise) return schemaSyncPromise;
  schemaSyncPromise = (async () => {
    // 1. Create missing tables if not exist (covers all 12 schema tables)
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        nama TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'staff' NOT NULL,
        department TEXT,
        capacity_hours_per_month REAL DEFAULT 72 NOT NULL,
        leave_days REAL DEFAULT 0 NOT NULL,
        avatar TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS lead_staff_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        lead_id TEXT NOT NULL,
        staff_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        UNIQUE(lead_id, staff_id)
      )`,
      `CREATE TABLE IF NOT EXISTS project_categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL,
        lead_id TEXT,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        goals TEXT,
        dod TEXT,
        sprint TEXT NOT NULL,
        lead_id TEXT,
        sprint_cutoff TEXT,
        is_archived INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS revision_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        subtask_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        lead_id TEXT,
        note TEXT NOT NULL,
        action TEXT DEFAULT 'rejected' NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        ticket_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        goals TEXT,
        dod TEXT,
        status TEXT DEFAULT 'todo' NOT NULL,
        priority TEXT DEFAULT 'medium' NOT NULL,
        pic_name TEXT NOT NULL,
        lead_id TEXT,
        project_id TEXT,
        total_actual_hours REAL DEFAULT 0,
        deadline TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        goals TEXT,
        dod TEXT,
        evidence TEXT,
        done INTEGER DEFAULT 0 NOT NULL,
        status TEXT DEFAULT 'to_do' NOT NULL,
        workload_hours REAL DEFAULT 0 NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS subtask_assignees (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        subtask_id TEXT NOT NULL,
        staff_id TEXT,
        assigned_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY NOT NULL,
        subtask_id TEXT,
        task_id TEXT,
        user_id TEXT,
        action TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        duration_hours REAL DEFAULT 0 NOT NULL,
        duration_category TEXT,
        duration_seconds INTEGER,
        note TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS time_contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        subtask_id TEXT NOT NULL,
        staff_id TEXT,
        hours REAL DEFAULT 0 NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS staff_assignment_history (
        id TEXT PRIMARY KEY NOT NULL,
        subtask_id TEXT NOT NULL,
        previous_assignees TEXT,
        new_assignees TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        change_type TEXT NOT NULL DEFAULT 'reassigned',
        reason TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    ];

    for (const sql of tables) {
      try {
        await rawLibsqlClient.execute(sql);
      } catch {
        // Table already exists or not supported, ignore
      }
    }

    // 2. Add missing columns to existing tables (self-healing migration)
    const alterCols = [
      "ALTER TABLE users ADD COLUMN avatar TEXT",
      "ALTER TABLE users ADD COLUMN leave_days REAL DEFAULT 0",
      "ALTER TABLE users ADD COLUMN capacity_hours_per_month REAL DEFAULT 72",
      "ALTER TABLE users ADD COLUMN department TEXT",
      "ALTER TABLE tasks ADD COLUMN lead_id TEXT",
      "ALTER TABLE tasks ADD COLUMN total_actual_hours REAL DEFAULT 0",
      "ALTER TABLE tasks ADD COLUMN deadline TEXT",
      "ALTER TABLE tasks ADD COLUMN goals TEXT",
      "ALTER TABLE tasks ADD COLUMN dod TEXT",
      "ALTER TABLE tasks ADD COLUMN description TEXT",
      "ALTER TABLE projects ADD COLUMN lead_id TEXT",
      "ALTER TABLE projects ADD COLUMN sprint_cutoff TEXT",
      "ALTER TABLE projects ADD COLUMN is_archived INTEGER DEFAULT 0",
      "ALTER TABLE projects ADD COLUMN goals TEXT",
      "ALTER TABLE projects ADD COLUMN dod TEXT",
      "ALTER TABLE projects ADD COLUMN description TEXT",
      "ALTER TABLE subtasks ADD COLUMN evidence TEXT",
      "ALTER TABLE subtasks ADD COLUMN goals TEXT",
      "ALTER TABLE subtasks ADD COLUMN dod TEXT",
      "ALTER TABLE subtasks ADD COLUMN description TEXT",
      "ALTER TABLE subtasks ADD COLUMN workload_hours REAL DEFAULT 0",
      "ALTER TABLE activity_logs ADD COLUMN duration_category TEXT",
      "ALTER TABLE activity_logs ADD COLUMN duration_seconds INTEGER",
      "ALTER TABLE activity_logs ADD COLUMN note TEXT",
    ];

    for (const sql of alterCols) {
      try {
        await rawLibsqlClient.execute(sql);
      } catch {
        // Column already exists, safe to ignore
      }
    }
  })();
  return schemaSyncPromise;
}

// Intercept client so ANY Drizzle or LibSQL query triggers ensureSchema() automatically
export const client: Client = new Proxy(rawLibsqlClient, {
  get(target, prop, receiver) {
    if (prop === "execute") {
      return async (...args: any[]) => {
        await ensureSchema();
        return (target.execute as any)(...args);
      };
    }
    if (prop === "batch") {
      return async (...args: any[]) => {
        await ensureSchema();
        return (target.batch as any)(...args);
      };
    }
    if (prop === "transaction") {
      return async (...args: any[]) => {
        await ensureSchema();
        return (target.transaction as any)(...args);
      };
    }
    if (prop === "executeMultiple") {
      return async (...args: any[]) => {
        await ensureSchema();
        return (target.executeMultiple as any)(...args);
      };
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === "function") {
      return val.bind(target);
    }
    return val;
  },
});

export const db = drizzle(client, { schema });

// Better-sqlite3 instance for local tooling or backward compatibility (lazy/safe on serverless)
let sqliteInstance: any = null;
if (!isVercel && !tursoUrl) {
  try {
    // Dynamic require so serverless runtimes never attempt to load native bindings
    const Database = require("better-sqlite3");
    sqliteInstance = new Database(dbPath);
    sqliteInstance.pragma("journal_mode = WAL");
    sqliteInstance.pragma("foreign_keys = ON");
  } catch (err) {
    console.warn("Local SQLite instance fallback warning:", err);
  }
}

export const sqlite = sqliteInstance;

/**
 * Helper for running raw SELECT queries safely across both Turso and local SQLite.
 */
export async function rawQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureSchema();
  const result = await rawLibsqlClient.execute({ sql, args: params });
  return result.rows as unknown as T[];
}

/**
 * Helper for running raw SELECT query returning a single row.
 */
export async function rawQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  await ensureSchema();
  const result = await rawLibsqlClient.execute({ sql, args: params });
  return (result.rows[0] as unknown as T) || null;
}

/**
 * Helper for running raw INSERT / UPDATE / DELETE queries.
 */
export async function rawExecute(sql: string, params: any[] = []): Promise<{ rowsAffected: number }> {
  await ensureSchema();
  const result = await rawLibsqlClient.execute({ sql, args: params });
  return { rowsAffected: result.rowsAffected };
}
