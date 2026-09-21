import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

// Resolve taskforge.db path safely across local & Vercel Serverless Function bundles
let dbPath = path.join(process.cwd(), "taskforge.db");

if (!fs.existsSync(dbPath)) {
  const altPath = path.join(process.cwd(), ".next/standalone/taskforge.db");
  if (fs.existsSync(altPath)) {
    dbPath = altPath;
  }
}

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
