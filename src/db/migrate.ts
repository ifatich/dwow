import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const sqlite = new Database("taskforge.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

// Jalankan migrasi dari folder drizzle/
migrate(db, { migrationsFolder: "./drizzle" });

console.log("✅ Migrasi database selesai!");
sqlite.close();
