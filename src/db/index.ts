import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import * as schema from "./schema";

const dbPath = path.join(process.cwd(), "taskforge.db");

let sqliteInstance: Database.Database;

try {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  sqliteInstance = new Database(dbPath, { readonly: isVercel });
  if (!isVercel) {
    sqliteInstance.pragma("journal_mode = WAL");
    sqliteInstance.pragma("foreign_keys = ON");
  }
} catch {
  sqliteInstance = new Database(dbPath, { readonly: true });
}

export const sqlite = sqliteInstance;
export const db = drizzle(sqlite, { schema });
