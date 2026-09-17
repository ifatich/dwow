import fs from "fs";

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
      if (char === "\r" && nextChar === "\n") i++;
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

const content = fs.readFileSync("data-scrape.csv", "utf-8");
const allRows = parseCSV(content);
const header = allRows[0];
const rows = allRows.slice(1);

const pIdx = header.indexOf("Pengerjaan");
const hIdx = header.indexOf("Bobot (Jam)");
const stIdx = header.indexOf("Status");
const cIdx = header.indexOf("Kontributor");
const bIdx = header.indexOf("Bulan");
const spIdx = header.indexOf("Sprint");
const catIdx = header.indexOf("Kategori Project");

let totalHours = 0;
const hoursByPerson: Record<string, number> = {};
const tasksByPerson: Record<string, number> = {};
const pengerjaanCount: Record<string, number> = {};
const statusCount: Record<string, number> = {};
const monthCount: Record<string, number> = {};
const sprintCount: Record<string, number> = {};

for (const r of rows) {
  const h = parseFloat(r[hIdx]) || 0;
  totalHours += h;
  const person = r[cIdx] || "Unknown";
  hoursByPerson[person] = (hoursByPerson[person] || 0) + h;
  tasksByPerson[person] = (tasksByPerson[person] || 0) + 1;

  const peng = r[pIdx] || "Unknown";
  pengerjaanCount[peng] = (pengerjaanCount[peng] || 0) + 1;

  const st = r[stIdx] || "Unknown";
  statusCount[st] = (statusCount[st] || 0) + 1;

  const m = r[bIdx] || "Unknown";
  monthCount[m] = (monthCount[m] || 0) + 1;

  const sp = r[spIdx] || "Unknown";
  sprintCount[sp] = (sprintCount[sp] || 0) + 1;
}

console.log("Total Hours:", totalHours);
console.log("\nStatus Breakdown:", statusCount);
console.log("\nMonth Breakdown:", monthCount);
console.log("\nSprint Breakdown:", sprintCount);
console.log("\nTop Pengerjaan Activities:", Object.entries(pengerjaanCount).sort((a,b)=>b[1]-a[1]).slice(0, 10));
console.log("\nContributors Ranked by Total Hours:", Object.entries(hoursByPerson).sort((a,b)=>b[1]-a[1]));
