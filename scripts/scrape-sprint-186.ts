import fs from "fs";
import path from "path";
import { importSprint186 } from "./import-sprint-186";

const SPREADSHEET_ID = "1IE1qISarDluXe7ppWFgesctPTLL7TCDAzLFwAotlSzc";
const SHEET_GID = "677490633";
const CSV_EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

/**
 * RFC 4180 compliant CSV parser.
 * Properly handles escaped quotes, multiline values, and commas within quotes.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentCell.trim());
      currentCell = "";
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Encodes rows into RFC 4180 CSV text.
 */
function toCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell === undefined || cell === null) return "";
          const str = String(cell);
          if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\n");
}

async function scrapeSprint186() {
  console.log("🌐 1. Mengunduh data terbaru dari Google Sheets...");
  console.log(`   URL: ${CSV_EXPORT_URL}`);

  const response = await fetch(CSV_EXPORT_URL, {
    headers: {
      "User-Agent": "TaskForge-Scraper/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengunduh spreadsheet: ${response.status} ${response.statusText}`);
  }

  const rawCSV = await response.text();
  console.log(`  ✓ Data berhasil diunduh (${(rawCSV.length / 1024).toFixed(1)} KB).`);

  // Backup full raw data
  if (!fs.existsSync("backups")) {
    fs.mkdirSync("backups", { recursive: true });
  }
  fs.writeFileSync(path.join("backups", "data-scrape-all-sprints.csv"), rawCSV, "utf-8");
  console.log("  ✓ Backup seluruh sprint tersimpan di backups/data-scrape-all-sprints.csv");

  // Parse CSV
  console.log("\n🔍 2. Melakukan parsing dan filtering fokus Sprint 186...");
  const allRows = parseCSV(rawCSV);
  if (allRows.length === 0) {
    throw new Error("Data CSV kosong!");
  }

  const header = allRows[0];
  const dataRows = allRows.slice(1);
  const spIdx = header.indexOf("Sprint");

  if (spIdx === -1) {
    throw new Error("Kolom 'Sprint' tidak ditemukan dalam spreadsheet!");
  }

  // Filter ONLY Sprint 186
  const sprint186Rows = dataRows.filter((r) => r[spIdx] === "186");
  console.log(`  ✓ Total baris dalam spreadsheet       : ${dataRows.length}`);
  console.log(`  ✓ Total baris fokus Sprint 186        : ${sprint186Rows.length}`);

  // Write focused Sprint 186 CSV
  const s186CSV = toCSV([header, ...sprint186Rows]);
  fs.writeFileSync("data-scrape.csv", s186CSV, "utf-8");
  console.log("  ✓ File data-scrape.csv berhasil diperbarui dengan data murni Sprint 186.");

  // Also save a dedicated copy
  fs.writeFileSync("data-sprint-186.csv", s186CSV, "utf-8");
  console.log("  ✓ File data-sprint-186.csv berhasil disimpan.");

  // 3. Trigger Import into Database
  console.log("\n⚡ 3. Menjalankan import data Sprint 186 ke database taskforge.db...");
  await importSprint186();

  console.log("\n✅ Selesai! Scrap ulang dan import Sprint 186 berhasil murni tanpa filter biweekly/sekper.");
}

if (process.argv[1] && process.argv[1].includes("scrape-sprint-186")) {
  scrapeSprint186().catch((err) => {
    console.error("❌ Error scraping Sprint 186:", err);
    process.exit(1);
  });
}

export { scrapeSprint186 };
