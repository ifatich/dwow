import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import Database from "better-sqlite3";
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

export const client: Client = createClient({
  url: clientUrl,
  authToken: tursoAuthToken,
});

export const db = drizzle(client, { schema });

// Better-sqlite3 instance for local tooling or backward compatibility
let sqliteInstance: Database.Database;
try {
  sqliteInstance = new Database(dbPath);
  if (!isVercel) {
    sqliteInstance.pragma("journal_mode = WAL");
    sqliteInstance.pragma("foreign_keys = ON");
  }
} catch {
  sqliteInstance = new Database(dbPath, { readonly: true });
}

export const sqlite = sqliteInstance;

/**
 * Helper for running raw SELECT queries safely across both Turso and local SQLite.
 */
export async function rawQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await client.execute({ sql, args: params });
  return result.rows as unknown as T[];
}

/**
 * Helper for running raw SELECT query returning a single row.
 */
export async function rawQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const result = await client.execute({ sql, args: params });
  return (result.rows[0] as unknown as T) || null;
}

/**
 * Helper for running raw INSERT / UPDATE / DELETE queries.
 */
export async function rawExecute(sql: string, params: any[] = []): Promise<{ rowsAffected: number }> {
  const result = await client.execute({ sql, args: params });
  return { rowsAffected: result.rowsAffected };
}
