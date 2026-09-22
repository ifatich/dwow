/**
 * Script untuk memigrasikan / mengunggah seluruh data dari SQLite lokal (taskforge.db)
 * ke database Turso Cloud (LibSQL).
 *
 * Cara penggunaan:
 *   npx tsx scripts/push-to-turso.ts
 * atau dengan argumen:
 *   npx tsx scripts/push-to-turso.ts <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN>
 */

import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

async function main() {
  const localDbPath = path.join(process.cwd(), "taskforge.db");
  if (!fs.existsSync(localDbPath)) {
    console.error("❌ File taskforge.db tidak ditemukan di direktori saat ini!");
    process.exit(1);
  }

  // Ambil URL & Token dari argumen atau env
  const tursoUrl = process.argv[2] || process.env.TURSO_DATABASE_URL;
  const tursoToken = process.argv[3] || process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl) {
    console.error("❌ TURSO_DATABASE_URL belum diisi!");
    console.log("Penggunaan: npx tsx scripts/push-to-turso.ts <URL> <TOKEN>");
    process.exit(1);
  }

  console.log("🚀 Menghubungkan ke Turso Cloud:", tursoUrl);
  const turso = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  const localDb = new Database(localDbPath, { readonly: true });

  // 1. Buat tabel-tabel di Turso jika belum ada
  console.log("📦 Menyiapkan skema tabel di Turso...");
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      nama TEXT NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff' NOT NULL,
      department TEXT,
      capacity_hours_per_month REAL DEFAULT 160 NOT NULL,
      leave_days REAL DEFAULT 0 NOT NULL,
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
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      ticket_id TEXT NOT NULL,
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
    `CREATE TABLE IF NOT EXISTS lead_staff_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      lead_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      UNIQUE(lead_id, staff_id)
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
  ];

  for (const sql of tableStatements) {
    await turso.execute(sql);
  }
  console.log("✅ Skema tabel berhasil disiapkan.");

  // Urutan tabel untuk menjaga foreign key / relasi
  const tables = [
    "users",
    "projects",
    "tasks",
    "subtasks",
    "subtask_assignees",
    "activity_logs",
    "time_contributions",
    "revision_notes",
    "project_categories",
    "lead_staff_assignments",
    "staff_assignment_history",
  ];

  console.log("\n🧹 Membersihkan tabel-tabel di Turso agar bersih dan persisten...");
  for (let i = tables.length - 1; i >= 0; i--) {
    try {
      await turso.execute(`DELETE FROM ${tables[i]}`);
    } catch {
      // ignore
    }
  }

  console.log("\n🚚 Mulai mentransfer data dari taskforge.db ke Turso...");

  for (const tableName of tables) {
    const rows = localDb.prepare(`SELECT * FROM ${tableName}`).all() as any[];
    if (rows.length === 0) {
      console.log(`- ${tableName}: 0 baris (dilewati)`);
      continue;
    }

    // Insert each row
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

    // Batch execute
    let inserted = 0;
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const statements = chunk.map((row) => ({
        sql: insertSql,
        args: columns.map((col) => row[col] !== undefined ? row[col] : null),
      }));
      await turso.batch(statements);
      inserted += chunk.length;
    }

    console.log(`✅ ${tableName}: ${inserted} baris berhasil ditransfer.`);
  }

  console.log("\n🎉 Migrasi data ke Turso selesai dengan sukses!");
  console.log("Silakan masukkan kedua variabel berikut ke dashboard Vercel Anda:");
  console.log(`TURSO_DATABASE_URL=${tursoUrl}`);
  console.log(`TURSO_AUTH_TOKEN=${tursoToken ? "(token Anda)" : ""}`);
}

main().catch((err) => {
  console.error("❌ Terjadi kesalahan saat migrasi:", err);
  process.exit(1);
});
