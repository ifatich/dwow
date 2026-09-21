import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

function getDatabasePath(): string {
  const candidatePaths = [
    path.join(process.cwd(), "taskforge.db"),
    path.join(process.cwd(), ".next/server/taskforge.db"),
    path.join(process.cwd(), ".next/standalone/taskforge.db"),
    path.resolve("./taskforge.db"),
  ];

  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

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
const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

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
export const db = drizzle(sqlite, { schema });
