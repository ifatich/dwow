import Database from "better-sqlite3";

async function cleanData() {
  const db = new Database("taskforge.db");
  db.pragma("foreign_keys = OFF");

  console.log("🧹 Membersihkan data operasional...");

  // Delete in order of child to parent
  const tablesToClean = [
    "activity_logs",
    "time_contributions",
    "revision_notes",
    "staff_assignment_history",
    "subtask_assignees",
    "subtasks",
    "tasks",
    "projects",
  ];

  for (const table of tablesToClean) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
      console.log(`  ✓ Data tabel '${table}' berhasil dibersihkan.`);
    } catch (e: any) {
      console.log(`  - Tabel '${table}': ${e.message}`);
    }
  }

  // Reset SQLite autoincrement sequences
  try {
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('subtask_assignees', 'time_contributions', 'revision_notes')").run();
  } catch {}

  db.pragma("foreign_keys = ON");
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.prepare("VACUUM").run();

  console.log("\n📊 Verifikasi jumlah record database saat ini:");
  const checkTables = [
    "projects",
    "tasks",
    "subtasks",
    "subtask_assignees",
    "activity_logs",
    "time_contributions",
    "revision_notes",
    "staff_assignment_history",
    "users",
  ];

  for (const t of checkTables) {
    try {
      const row = db.prepare(`SELECT count(*) as count FROM ${t}`).get() as { count: number };
      console.log(`  - ${t}: ${row.count}`);
    } catch {
      console.log(`  - ${t}: 0`);
    }
  }

  console.log("\n✨ Database berhasil dibersihkan dengan aman!");
  db.close();
}

cleanData().catch((err) => {
  console.error("❌ Clean failed:", err);
  process.exit(1);
});
