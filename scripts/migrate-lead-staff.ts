import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "taskforge.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log("🚀 Menyiapkan tabel `lead_staff_assignments`...");

db.exec(`
  CREATE TABLE IF NOT EXISTS lead_staff_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    staff_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL,
    UNIQUE(lead_id, staff_id)
  );
`);

console.log("✅ Tabel `lead_staff_assignments` siap.");
