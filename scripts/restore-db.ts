import fs from "fs";
import path from "path";

async function restore() {
  const latest = path.resolve(process.cwd(), "backups/taskforge-seed-backup-latest.db");
  if (!fs.existsSync(latest)) {
    console.error("❌ File backup tidak ditemukan di:", latest);
    process.exit(1);
  }

  // Remove temporary WAL files if any
  try {
    if (fs.existsSync("taskforge.db-wal")) fs.unlinkSync("taskforge.db-wal");
    if (fs.existsSync("taskforge.db-shm")) fs.unlinkSync("taskforge.db-shm");
  } catch {}

  fs.copyFileSync(latest, "taskforge.db");
  console.log("✅ Database berhasil di-restore kembali dari backup:", latest);
}

restore();
