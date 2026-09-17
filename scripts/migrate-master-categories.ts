import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";

const dbPath = path.join(process.cwd(), "taskforge.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log("🚀 Menyiapkan tabel `project_categories` (Master Data)...");

db.exec(`
  CREATE TABLE IF NOT EXISTS project_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL,
    lead_id TEXT REFERENCES users(id),
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

console.log("✅ Tabel `project_categories` siap.");

// Ambil list user lead
const users = db.prepare("SELECT id, nama, username, role FROM users").all() as Array<{
  id: string;
  nama: string;
  username: string;
  role: string;
}>;

const userByUsername = new Map(users.map((u) => [u.username.toLowerCase(), u.id]));
const userByName = new Map(users.map((u) => [u.nama.toLowerCase(), u.id]));

// Default 10 categories
const initialCategories = [
  {
    name: "Digital Project",
    code: "DIGI",
    defaultLead: "arif",
    description: "Proyek-proyek pilar digital & perbankan digital.",
  },
  {
    name: "IC Project",
    code: "ICPR",
    defaultLead: "cheppy",
    description: "Internal communication & platform micro-frontend.",
  },
  {
    name: "Single UI",
    code: "SUI",
    defaultLead: "ganda",
    description: "Inisiatif Single UI Revamp & Standardisasi antarmuka.",
  },
  {
    name: "UI/UX",
    code: "UIUX",
    defaultLead: "arif",
    description: "Design system & eksplorasi pengalaman pengguna.",
  },
  {
    name: "Tring!",
    code: "TRNG",
    defaultLead: "cheppy",
    description: "Pengembangan ekosistem aplikasi Tring!.",
  },
  {
    name: "Divisi Layanan dan Contact Center",
    code: "DLCC",
    defaultLead: "ganda",
    description: "Sistem & otomasi layanan contact center nasabah.",
  },
  {
    name: "Direktorat MRLK",
    code: "MRLK",
    defaultLead: "arif",
    description: "Manajemen Risiko dan Layanan Kepatuhan.",
  },
  {
    name: "Pooling IT",
    code: "POOL",
    defaultLead: "cheppy",
    description: "Pooling resource IT lintas proyek (E-Rumdin, dll).",
  },
  {
    name: "Enterprise Business",
    code: "EBUS",
    defaultLead: "ganda",
    description: "Aplikasi & portal solusi bisnis enterprise B2B.",
  },
  {
    name: "Sekper",
    code: "SEKP",
    defaultLead: "arif",
    description: "Sekretariat Perusahaan & inisiatif corporate branding.",
  },
];

const now = new Date().toISOString();
const insertStmt = db.prepare(`
  INSERT INTO project_categories (id, name, code, lead_id, description, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  ON CONFLICT(name) DO UPDATE SET
    code = excluded.code,
    description = COALESCE(project_categories.description, excluded.description),
    updated_at = excluded.updated_at
`);

for (const cat of initialCategories) {
  const leadId = userByUsername.get(cat.defaultLead) || null;
  const id = crypto.randomUUID();
  insertStmt.run(id, cat.name, cat.code, leadId, cat.description, now, now);
}

const count = db.prepare("SELECT COUNT(*) as total FROM project_categories").get() as { total: number };
console.log(`🎉 Master Data Kategori berhasil diisi! Total: ${count.total} kategori.`);
