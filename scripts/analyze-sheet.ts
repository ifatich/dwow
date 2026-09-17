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

function analyze() {
  const content = fs.readFileSync("data-scrape.csv", "utf-8");
  const allRows = parseCSV(content);
  const header = allRows[0];
  console.log("Headers:", header);

  const rows = allRows.slice(1);
  console.log(`Total data rows: ${rows.length}`);

  const projects = new Set<string>();
  const sprints = new Set<string>();
  const contributors = new Set<string>();
  const statuses = new Set<string>();
  const priorities = new Set<string>();
  const categories = new Set<string>();

  const pIdx = header.indexOf("Project");
  const spIdx = header.indexOf("Sprint");
  const cIdx = header.indexOf("Kontributor");
  const stIdx = header.indexOf("Status");
  const prIdx = header.indexOf("Priority");
  const catIdx = header.indexOf("Kategori Project");

  for (const r of rows) {
    if (r[pIdx]) projects.add(r[pIdx]);
    if (r[spIdx]) sprints.add(r[spIdx]);
    if (r[cIdx]) contributors.add(r[cIdx]);
    if (r[stIdx]) statuses.add(r[stIdx]);
    if (r[prIdx]) priorities.add(r[prIdx]);
    if (r[catIdx]) categories.add(r[catIdx]);
  }

  console.log(`\nUnique Projects (${projects.size}):`, Array.from(projects).slice(0, 15));
  console.log(`\nUnique Sprints (${sprints.size}):`, Array.from(sprints));
  console.log(`\nUnique Kontributor (${contributors.size}):`, Array.from(contributors));
  console.log(`\nUnique Statuses:`, Array.from(statuses));
  console.log(`\nUnique Priorities:`, Array.from(priorities));
  console.log(`\nUnique Kategori Project:`, Array.from(categories));
}

analyze();
