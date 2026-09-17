import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

async function runBackup() {
  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `taskforge-seed-backup-${timestamp}.db`);
  const latestBackupPath = path.join(backupDir, "taskforge-seed-backup-latest.db");

  const db = new Database("taskforge.db");
  db.pragma("wal_checkpoint(TRUNCATE)");

  // Get table counts
  const tables = [
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

  console.log("📊 Record counts before backup:");
  for (const t of tables) {
    try {
      const row = db.prepare(`SELECT count(*) as count FROM ${t}`).get() as { count: number };
      console.log(`  - ${t}: ${row.count}`);
    } catch {
      console.log(`  - ${t}: (table does not exist or empty)`);
    }
  }

  console.log(`\n💾 Creating backup to: ${backupPath}...`);
  await db.backup(backupPath);
  console.log(`💾 Copying to: ${latestBackupPath}...`);
  fs.copyFileSync(backupPath, latestBackupPath);

  console.log("✅ Backup completed successfully!");
  db.close();
}

runBackup().catch((err) => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});
