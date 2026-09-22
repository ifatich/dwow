import { client, sqlite } from "@/db";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import {
  AvailableSprint,
  SprintSyncPreview,
  SprintSyncResult,
  AddedItemTask,
  AddedItemSubtask,
} from "../types";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1IE1qISarDluXe7ppWFgesctPTLL7TCDAzLFwAotlSzc/export?format=csv&gid=677490633";

/**
 * RFC 4180 compliant CSV parser.
 * Properly handles escaped quotes, quoted cells spanning multiple lines, and whitespace trimming.
 */
export function parseCSV(text: string): string[][] {
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
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip newline pair
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
 * Fetch raw CSV data from Google Sheets or fallback to local cache if offline.
 */
export async function fetchSpreadsheetCSV(customUrl?: string): Promise<string> {
  const targetUrl = customUrl?.trim() || DEFAULT_SHEET_URL;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TaskForge-SprintSync/1.0",
        Accept: "text/csv, text/plain, */*",
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const csvText = await res.text();
      if (csvText && csvText.includes("Kategori Project")) {
        // Cache to local data-scrape.csv for backup
        try {
          fs.writeFileSync(path.join(process.cwd(), "data-scrape.csv"), csvText, "utf-8");
        } catch {
          // ignore cache write failure
        }
        return csvText;
      }
    }
  } catch (err) {
    console.warn("⚠️ Gagal mengambil live CSV dari Google Sheets, mencoba cache lokal:", err);
  }

  // Fallback to local data-scrape.csv if network fails
  const localCachePath = path.join(process.cwd(), "data-scrape.csv");
  if (fs.existsSync(localCachePath)) {
    return fs.readFileSync(localCachePath, "utf-8");
  }

  throw new Error("Gagal mengambil data dari Google Sheets dan tidak ada cache lokal data-scrape.csv.");
}

/**
 * Find header indexes accurately from header row.
 */
export function resolveHeaders(headerRow: string[]) {
  const normalized = headerRow.map((h) => h.toLowerCase().trim());
  return {
    catIdx: normalized.indexOf("kategori project"),
    pIdx: normalized.indexOf("project"),
    tIdx: normalized.indexOf("task detail"),
    pengIdx: normalized.indexOf("pengerjaan"),
    fIdx: normalized.indexOf("fitur"),
    cIdx: normalized.indexOf("contributor"),
    hIdx: normalized.indexOf("bobot (jam)"),
    spIdx: normalized.indexOf("sprint"),
    prIdx: normalized.indexOf("priority"),
    nIdx: normalized.indexOf("notes / files"),
    stIdx: normalized.indexOf("status"),
  };
}

/**
 * Scan sheet and list all distinct sprints available in the Google Sheet.
 */
export async function getAvailableSprints(customUrl?: string): Promise<AvailableSprint[]> {
  const csvText = await fetchSpreadsheetCSV(customUrl);
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const headers = resolveHeaders(rows[0]);
  if (headers.spIdx === -1) return [];

  const sprintCountMap = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rawVal = (r[headers.spIdx] || "").trim();
    if (rawVal) {
      const numOnly = rawVal.replace(/\D/g, "");
      const sprintKey = numOnly ? numOnly : rawVal;
      sprintCountMap.set(sprintKey, (sprintCountMap.get(sprintKey) || 0) + 1);
    }
  }

  // Check which sprints are in database (via client for Turso / local compatibility)
  let dbSprintSet = new Set<string>();
  try {
    const dbSprintsRes = await client.execute("SELECT DISTINCT sprint FROM projects");
    const dbSprints = dbSprintsRes.rows as unknown as { sprint: string }[];
    dbSprintSet = new Set(dbSprints.map((s) => (s.sprint || "").toLowerCase().trim()));
  } catch (err) {
    console.warn("Could not query projects from client:", err);
  }

  const result: AvailableSprint[] = [];
  for (const [key, count] of sprintCountMap.entries()) {
    const label = /^\d+$/.test(key) ? `Sprint ${key}` : key;
    const inDb =
      dbSprintSet.has(label.toLowerCase()) ||
      dbSprintSet.has(key.toLowerCase()) ||
      dbSprintSet.has(`sprint ${key}`.toLowerCase());

    result.push({
      identifier: key,
      label,
      rowCount: count,
      isInDatabase: inDb,
    });
  }

  // Sort descending by number if possible
  result.sort((a, b) => {
    const numA = parseInt(a.identifier.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.identifier.replace(/\D/g, "")) || 0;
    return numB - numA;
  });

  return result;
}

/**
 * Preview dry-run for a specific sprint.
 */
export async function previewSprintSync(options: {
  sprintIdentifier: string;
  customUrl?: string;
}): Promise<SprintSyncPreview> {
  const { sprintIdentifier, customUrl } = options;
  const numOnly = sprintIdentifier.replace(/\D/g, "");
  const sprintLabel = numOnly ? `Sprint ${numOnly}` : sprintIdentifier;

  const csvText = await fetchSpreadsheetCSV(customUrl);
  const allRows = parseCSV(csvText);
  if (allRows.length < 2) {
    throw new Error("Data spreadsheet kosong atau tidak memiliki baris data.");
  }

  const h = resolveHeaders(allRows[0]);
  const rows = allRows.slice(1);

  let totalRawRows = 0;
  let excludedTentativeZero = 0;
  const validRows: string[][] = [];

  for (const r of rows) {
    const rowSprint = (r[h.spIdx] || "").trim();
    const rowSprintNum = rowSprint.replace(/\D/g, "");

    const isMatch =
      rowSprint.toLowerCase() === sprintIdentifier.toLowerCase() ||
      (numOnly && rowSprintNum === numOnly) ||
      rowSprint.toLowerCase() === sprintLabel.toLowerCase();

    if (!isMatch) continue;

    totalRawRows++;

    const categoryRaw = r[h.catIdx] || "";
    const projectRaw = r[h.pIdx] || "";
    const taskDetailRaw = r[h.tIdx] || "";

    if (!categoryRaw.trim() || !projectRaw.trim() || !taskDetailRaw.trim()) {
      continue;
    }

    const rawBobot = (r[h.hIdx] || "").trim().replace(",", ".");
    const workload = isNaN(parseFloat(rawBobot)) ? 0 : parseFloat(rawBobot);
    const notes = (r[h.nIdx] || "").trim().toLowerCase();

    // Rule: Exclude jika Bobot = 0 & Notes / Files = tentative
    if (workload === 0 && notes.includes("tentative")) {
      excludedTentativeZero++;
      continue;
    }

    validRows.push(r);
  }

  // Group by Kategori Project (Project Level) -> Project (Task Level) -> Subtask Level
  const categoryMap = new Map<string, Map<string, string[][]>>();
  const hoursByPerson: Record<string, number> = {};
  let totalWorkloadHours = 0;

  for (const r of validRows) {
    const catName = r[h.catIdx].replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
    const projName = r[h.pIdx].replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, new Map());
    }
    const taskMap = categoryMap.get(catName)!;
    if (!taskMap.has(projName)) {
      taskMap.set(projName, []);
    }
    taskMap.get(projName)!.push(r);

    const rawBobot = (r[h.hIdx] || "").trim().replace(",", ".");
    const workload = isNaN(parseFloat(rawBobot)) ? 0 : parseFloat(rawBobot);
    totalWorkloadHours += workload;

    const person = (r[h.cIdx] || "Unassigned").trim();
    hoursByPerson[person] = (hoursByPerson[person] || 0) + workload;
  }

  let tasksCount = 0;
  let totalUniqueSubtasks = 0;
  const categoriesList: SprintSyncPreview["categories"] = [];

  for (const [catName, taskMap] of categoryMap.entries()) {
    let catHours = 0;
    let catSubtasks = 0;
    for (const [, sRows] of taskMap.entries()) {
      tasksCount++;
      const subtaskGroupMap = new Map<string, string[][]>();
      for (const sr of sRows) {
        const rawTitle = sr[h.tIdx] || "";
        const title = rawTitle.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
        const rawB = (sr[h.hIdx] || "").trim().replace(",", ".");
        const workload = isNaN(parseFloat(rawB)) ? 0 : parseFloat(rawB);
        catHours += workload;
        const subKey = `${title}__${workload}`;
        if (!subtaskGroupMap.has(subKey)) {
          subtaskGroupMap.set(subKey, []);
        }
        subtaskGroupMap.get(subKey)!.push(sr);
      }
      catSubtasks += subtaskGroupMap.size;
    }
    totalUniqueSubtasks += catSubtasks;
    categoriesList.push({
      categoryName: catName,
      tasksCount: taskMap.size,
      subtasksCount: catSubtasks,
      totalHours: Math.round(catHours * 10) / 10,
    });
  }

  // Database Delta Check for THIS SPRINT ONLY (multi-sprint retention via client)
  let existingProjects: { id: string; title: string }[] = [];
  try {
    const existingProjectsRes = await client.execute({
      sql: "SELECT id, title FROM projects WHERE sprint = ?",
      args: [sprintLabel],
    });
    existingProjects = existingProjectsRes.rows as unknown as { id: string; title: string }[];
  } catch {
    if (sqlite) {
      existingProjects = sqlite
        .prepare("SELECT id, title FROM projects WHERE sprint = ?")
        .all(sprintLabel) as { id: string; title: string }[];
    }
  }

  const existingProjectIds = existingProjects.map((p) => p.id);
  const existingProjectMap = new Map<string, string>();
  for (const p of existingProjects) {
    existingProjectMap.set(p.title.toLowerCase().trim(), p.id);
  }

  let existingTasks: { id: string; title: string; project_id: string }[] = [];
  let existingSubtasks: { id: string; title: string; status: string; task_id: string; workload_hours: number }[] = [];
  let preservedInProgressSubtasks = 0;

  if (existingProjectIds.length > 0) {
    const placeholders = existingProjectIds.map(() => "?").join(",");
    try {
      const existingTasksRes = await client.execute({
        sql: `SELECT id, title, project_id FROM tasks WHERE project_id IN (${placeholders})`,
        args: existingProjectIds,
      });
      existingTasks = existingTasksRes.rows as unknown as { id: string; title: string; project_id: string }[];
    } catch {
      if (sqlite) {
        existingTasks = sqlite
          .prepare(`SELECT id, title, project_id FROM tasks WHERE project_id IN (${placeholders})`)
          .all(...existingProjectIds) as { id: string; title: string; project_id: string }[];
      }
    }

    const taskIds = existingTasks.map((t) => t.id);
    if (taskIds.length > 0) {
      const taskPlaceholders = taskIds.map(() => "?").join(",");
      try {
        const existingSubtasksRes = await client.execute({
          sql: `SELECT id, title, status, task_id, workload_hours FROM subtasks WHERE task_id IN (${taskPlaceholders})`,
          args: taskIds,
        });
        existingSubtasks = existingSubtasksRes.rows as unknown as {
          id: string;
          title: string;
          status: string;
          task_id: string;
          workload_hours: number;
        }[];
      } catch {
        if (sqlite) {
          existingSubtasks = sqlite
            .prepare(
              `SELECT id, title, status, task_id, workload_hours FROM subtasks WHERE task_id IN (${taskPlaceholders})`
            )
            .all(...taskIds) as any[];
        }
      }

      for (const st of existingSubtasks) {
        if (st.status === "in_progress" || st.status === "review" || st.status === "done") {
          preservedInProgressSubtasks++;
        }
      }
    }
  }

  // Pre-calculate detected new tasks and subtasks for detailed preview
  const detectedNewTasks: AddedItemTask[] = [];
  const detectedNewSubtasks: AddedItemSubtask[] = [];

  const existingTaskKeySet = new Set<string>();
  for (const t of existingTasks) {
    existingTaskKeySet.add(`${t.project_id}___${t.title.toLowerCase().trim()}`);
  }

  for (const [catName, taskMap] of categoryMap.entries()) {
    const pId = existingProjectMap.get(catName.toLowerCase().trim());
    for (const [projectName, sRows] of taskMap.entries()) {
      const isTaskExisting = Boolean(pId && existingTaskKeySet.has(`${pId}___${projectName.toLowerCase().trim()}`));
      if (!isTaskExisting) {
        detectedNewTasks.push({
          title: projectName,
          categoryName: catName,
          pic: sRows[0]?.[h.cIdx] || "Tim",
        });
      }

      // Group subtasks in sheet
      const subtaskGroupMap = new Map<string, string[][]>();
      for (const sr of sRows) {
        const rawTitle = sr[h.tIdx] || projectName;
        const title = rawTitle.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
        const rawB = (sr[h.hIdx] || "").trim().replace(",", ".");
        const workload = isNaN(parseFloat(rawB)) ? 0 : parseFloat(rawB);
        const subKey = `${title}__${workload}`;
        if (!subtaskGroupMap.has(subKey)) subtaskGroupMap.set(subKey, []);
        subtaskGroupMap.get(subKey)!.push(sr);
      }

      for (const [, rowsInSub] of subtaskGroupMap.entries()) {
        const firstSr = rowsInSub[0];
        const rawTitle = firstSr[h.tIdx] || projectName;
        const title = rawTitle.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
        const rawB = (firstSr[h.hIdx] || "").trim().replace(",", ".");
        const workload = isNaN(parseFloat(rawB)) ? 0 : parseFloat(rawB);

        const matchedTask = existingTasks.find(
          (t) => pId === t.project_id && t.title.toLowerCase().trim() === projectName.toLowerCase().trim()
        );
        const isSubExisting = Boolean(
          matchedTask &&
          existingSubtasks.some(
            (st) => st.task_id === matchedTask.id && st.title.toLowerCase().trim() === title.toLowerCase().trim()
          )
        );

        if (!isSubExisting) {
          detectedNewSubtasks.push({
            title,
            taskTitle: projectName,
            categoryName: catName,
            workloadHours: workload,
            assignees: Array.from(new Set(rowsInSub.map((r) => (r[h.cIdx] || "").trim()).filter(Boolean))),
          });
        }
      }
    }
  }

  const existingProjectTitles = new Set(existingProjects.map((p) => p.title.toLowerCase()));
  let newProjectsCount = 0;
  for (const catName of categoryMap.keys()) {
    if (!existingProjectTitles.has(catName.toLowerCase())) {
      newProjectsCount++;
    }
  }

  const sortedContributors = Object.entries(hoursByPerson)
    .sort((a, b) => b[1] - a[1])
    .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }));

  return {
    sprintIdentifier,
    sprintLabel,
    totalRawRows,
    excludedTentativeZero,
    validRows: validRows.length,
    uniqueSubtasksCount: totalUniqueSubtasks,
    projectsCount: categoryMap.size,
    tasksCount,
    totalWorkloadHours: Math.round(totalWorkloadHours * 10) / 10,
    contributors: sortedContributors,
    categories: categoriesList,
    delta: {
      existingProjectsInSprint: existingProjects.length,
      newProjectsCount,
      existingTasksInSprint: existingTasks.length,
      newTasksCount: Math.max(0, tasksCount - existingTasks.length),
      existingSubtasksInSprint: existingSubtasks.length,
      newSubtasksCount: Math.max(0, totalUniqueSubtasks - existingSubtasks.length),
      preservedInProgressSubtasks,
    },
    detectedNewItems: {
      newTasks: detectedNewTasks,
      newSubtasks: detectedNewSubtasks,
    },
  };
}

/**
 * Execute atomic smart sync for the specified sprint.
 * Multi-sprint retention: leaves all other sprints untouched.
 * Smart merge: preserves in_progress, review, done status on existing subtasks.
 * Fully compatible with Turso (LibSQL) Cloud and local SQLite.
 */
export async function executeSprintSync(options: {
  sprintIdentifier: string;
  customUrl?: string;
  performedBy: string;
}): Promise<SprintSyncResult> {
  const { sprintIdentifier, customUrl, performedBy } = options;
  const numOnly = sprintIdentifier.replace(/\D/g, "");
  const sprintLabel = numOnly ? `Sprint ${numOnly}` : sprintIdentifier;

  const csvText = await fetchSpreadsheetCSV(customUrl);
  const allRows = parseCSV(csvText);
  if (allRows.length < 2) {
    throw new Error("Data spreadsheet kosong.");
  }

  const h = resolveHeaders(allRows[0]);
  const rows = allRows.slice(1);

  // Filter valid rows
  const validRows: string[][] = [];
  for (const r of rows) {
    const rowSprint = (r[h.spIdx] || "").trim();
    const rowSprintNum = rowSprint.replace(/\D/g, "");

    const isMatch =
      rowSprint.toLowerCase() === sprintIdentifier.toLowerCase() ||
      (numOnly && rowSprintNum === numOnly) ||
      rowSprint.toLowerCase() === sprintLabel.toLowerCase();

    if (!isMatch) continue;

    const categoryRaw = r[h.catIdx] || "";
    const projectRaw = r[h.pIdx] || "";
    const taskDetailRaw = r[h.tIdx] || "";

    if (!categoryRaw.trim() || !projectRaw.trim() || !taskDetailRaw.trim()) {
      continue;
    }

    const rawBobot = (r[h.hIdx] || "").trim().replace(",", ".");
    const workload = isNaN(parseFloat(rawBobot)) ? 0 : parseFloat(rawBobot);
    const notes = (r[h.nIdx] || "").trim().toLowerCase();

    // Rule: Bobot 0 + tentative excluded
    if (workload === 0 && notes.includes("tentative")) {
      continue;
    }

    validRows.push(r);
  }

  if (validRows.length === 0) {
    throw new Error(`Tidak ada data valid yang ditemukan untuk ${sprintLabel}.`);
  }

  // Group by Kategori -> Project -> Subtasks
  const categoryMap = new Map<string, Map<string, string[][]>>();
  for (const r of validRows) {
    const catName = r[h.catIdx].replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
    const projName = r[h.pIdx].replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, new Map());
    }
    const taskMap = categoryMap.get(catName)!;
    if (!taskMap.has(projName)) {
      taskMap.set(projName, []);
    }
    taskMap.get(projName)!.push(r);
  }

  const now = new Date().toISOString();

  // 1. Fetch existing users from client
  const usersRes = await client.execute("SELECT id, username, nama, role FROM users");
  const existingUsers = usersRes.rows as unknown as { id: string; username: string; nama: string; role: string }[];
  const userMap = new Map<string, string>();

  for (const u of existingUsers) {
    userMap.set(u.username.toLowerCase(), u.id);
    userMap.set(u.nama.toLowerCase(), u.id);
  }

  const batchStatements: { sql: string; args: any[] }[] = [];

  // Ensure the 3 leads exist (Arif, Cheppy, Ganda)
  const defaultLeadHash = await bcrypt.hash("lead123", 10);
  const theThreeLeads = [
    { username: "arif", nama: "Arif", role: "lead", dept: "UI/UX Design" },
    { username: "cheppy", nama: "Cheppy", role: "lead", dept: "Digital Project" },
    { username: "ganda", nama: "Ganda", role: "lead", dept: "Digital Project" },
  ];

  for (const ld of theThreeLeads) {
    if (!userMap.has(ld.username.toLowerCase())) {
      const id = crypto.randomUUID();
      batchStatements.push({
        sql: `INSERT INTO users (id, nama, username, password_hash, role, department, capacity_hours_per_month, leave_days, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 72, 0, ?, ?)`,
        args: [id, ld.nama, ld.username, defaultLeadHash, ld.role, ld.dept, now, now],
      });
      userMap.set(ld.username.toLowerCase(), id);
      userMap.set(ld.nama.toLowerCase(), id);
    }
  }

  // Ensure any staff name in spreadsheet exists
  const defaultStaffHash = await bcrypt.hash("staff123", 10);
  for (const r of validRows) {
    const rawContributor = (r[h.cIdx] || "").trim();
    if (rawContributor && !userMap.has(rawContributor.toLowerCase())) {
      const id = crypto.randomUUID();
      const sanitizedUsername = rawContributor.toLowerCase().replace(/[^a-z0-9]/g, "");
      batchStatements.push({
        sql: `INSERT INTO users (id, nama, username, password_hash, role, department, capacity_hours_per_month, leave_days, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 72, 0, ?, ?)`,
        args: [id, rawContributor, sanitizedUsername || `staff_${id.slice(0, 6)}`, defaultStaffHash, "staff", "Digital & Product Team", now, now],
      });
      userMap.set(rawContributor.toLowerCase(), id);
      userMap.set((sanitizedUsername || "").toLowerCase(), id);
    }
  }

  // 2. Fetch master categories
  const masterCatRes = await client.execute("SELECT id, name, code, lead_id FROM project_categories");
  const masterCategories = masterCatRes.rows as unknown as Array<{ id: string; name: string; code: string; lead_id: string | null }>;
  const masterCatMap = new Map(masterCategories.map((c) => [c.name.toLowerCase().trim(), c]));

  // 3. Fetch existing projects, tasks, and subtasks for this sprint from client
  const existingProjRes = await client.execute({
    sql: "SELECT id, title, lead_id FROM projects WHERE sprint = ?",
    args: [sprintLabel],
  });
  const existingProjects = existingProjRes.rows as unknown as Array<{ id: string; title: string; lead_id: string }>;
  const existingProjectMap = new Map(existingProjects.map((p) => [p.title.toLowerCase().trim(), p]));

  const existingProjIds = existingProjects.map((p) => p.id);
  let existingTasks: Array<{ id: string; ticket_id: string; title: string; status: string; project_id: string }> = [];
  let existingSubtasks: Array<{ id: string; task_id: string; title: string; status: string; workload_hours: number; done: number }> = [];

  if (existingProjIds.length > 0) {
    const pHolders = existingProjIds.map(() => "?").join(",");
    const tRes = await client.execute({
      sql: `SELECT id, ticket_id, title, status, project_id FROM tasks WHERE project_id IN (${pHolders})`,
      args: existingProjIds,
    });
    existingTasks = tRes.rows as unknown as any[];

    const tIds = existingTasks.map((t) => t.id);
    if (tIds.length > 0) {
      const sHolders = tIds.map(() => "?").join(",");
      const sRes = await client.execute({
        sql: `SELECT id, task_id, title, status, workload_hours, done FROM subtasks WHERE task_id IN (${sHolders})`,
        args: tIds,
      });
      existingSubtasks = sRes.rows as unknown as any[];
    }
  }

  // Existing assignees lookup
  let existingAssigneesSet = new Set<string>();
  try {
    const assRes = await client.execute("SELECT subtask_id, staff_id FROM subtask_assignees");
    for (const a of assRes.rows as unknown as { subtask_id: string; staff_id: string }[]) {
      existingAssigneesSet.add(`${a.subtask_id}___${a.staff_id}`);
    }
  } catch {}

  // Existing ticket IDs
  const allTicketsRes = await client.execute("SELECT ticket_id FROM tasks");
  const existingTicketIds = new Set((allTicketsRes.rows as unknown as { ticket_id: string }[]).map((t) => t.ticket_id));

  // Tracking counts and added items
  let projectsCreated = 0;
  let projectsUpdated = 0;
  let tasksCreated = 0;
  let tasksUpdated = 0;
  let subtasksCreated = 0;
  let subtasksPreserved = 0;
  let subtasksUpdated = 0;
  let totalWorkloadHours = 0;

  const addedNewTasks: AddedItemTask[] = [];
  const addedNewSubtasks: AddedItemSubtask[] = [];
  const matchedSubtaskIds = new Set<string>();

  for (const [categoryName, taskMap] of categoryMap.entries()) {
    let projectId: string;
    const cleanCatName = categoryName.trim();
    const matchedMaster = masterCatMap.get(cleanCatName.toLowerCase());

    const catCode = matchedMaster?.code || cleanCatName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PROJ";
    const leadId = matchedMaster?.lead_id || null;

    if (!matchedMaster) {
      const newCatId = crypto.randomUUID();
      batchStatements.push({
        sql: `INSERT INTO project_categories (id, name, code, lead_id, description, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [newCatId, cleanCatName, catCode, null, `Otomatis terdaftar dari sinkronisasi ${sprintLabel}`, now, now],
      });
      masterCatMap.set(cleanCatName.toLowerCase(), {
        id: newCatId,
        name: cleanCatName,
        code: catCode,
        lead_id: null,
      });
    }

    // 1. Projects (Category level)
    const existingProject = existingProjectMap.get(cleanCatName.toLowerCase());

    if (existingProject) {
      projectId = existingProject.id;
      batchStatements.push({
        sql: "UPDATE projects SET description = ?, lead_id = COALESCE(?, lead_id), updated_at = ? WHERE id = ?",
        args: [`Kategori Project: ${categoryName} — ${sprintLabel}`, leadId, now, projectId],
      });
      projectsUpdated++;
    } else {
      projectId = crypto.randomUUID();
      batchStatements.push({
        sql: `INSERT INTO projects (id, title, description, sprint, lead_id, sprint_cutoff, is_archived, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        args: [projectId, categoryName, `Kategori Project: ${categoryName} — ${sprintLabel}`, sprintLabel, leadId, "2026-10-02T23:59:59.000Z", now, now],
      });
      existingProjectMap.set(cleanCatName.toLowerCase(), { id: projectId, title: categoryName, lead_id: leadId || "" });
      projectsCreated++;
    }

    let taskCounter = 1;
    for (const [projectName, subtaskRows] of taskMap.entries()) {
      let taskId: string;
      const firstRow = subtaskRows[0];
      const pic = firstRow[h.cIdx] || "Tim";
      const priorityRaw = (firstRow[h.prIdx] || "medium").toLowerCase();
      const priority = ["low", "medium", "high", "urgent"].includes(priorityRaw) ? priorityRaw : "medium";
      const ticketId = `S${numOnly || "000"}-${catCode}-${String(taskCounter).padStart(2, "0")}`;

      // 2. Tasks (Project column in sheet)
      const existingTask = existingTasks.find(
        (t) => t.project_id === projectId && t.title.toLowerCase().trim() === projectName.toLowerCase().trim()
      );

      if (existingTask) {
        taskId = existingTask.id;
        batchStatements.push({
          sql: "UPDATE tasks SET pic_name = ?, priority = ?, lead_id = COALESCE(?, lead_id), updated_at = ? WHERE id = ?",
          args: [pic, priority, leadId, now, taskId],
        });
        tasksUpdated++;
      } else {
        taskId = crypto.randomUUID();
        let currentTicketId = ticketId;
        let offset = 0;
        while (existingTicketIds.has(currentTicketId)) {
          offset++;
          currentTicketId = `S${numOnly || "000"}-${catCode}-${String(taskCounter + offset).padStart(2, "0")}`;
        }
        existingTicketIds.add(currentTicketId);

        batchStatements.push({
          sql: `INSERT INTO tasks (id, ticket_id, title, description, status, priority, pic_name, lead_id, project_id, total_actual_hours, deadline, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [taskId, currentTicketId, projectName, `Task proyek ${projectName} di bawah kategori ${categoryName}`, "todo", priority, pic, leadId, projectId, 0, "2026-10-02T18:00:00.000Z", now, now],
        });
        tasksCreated++;
        addedNewTasks.push({
          id: taskId,
          ticketId: currentTicketId,
          title: projectName,
          categoryName,
          pic,
        });
        existingTasks.push({ id: taskId, ticket_id: currentTicketId, title: projectName, status: "todo", project_id: projectId });
      }

      // 3. Subtasks (Task Detail column in sheet)
      const subtaskGroupMap = new Map<string, string[][]>();
      for (const sr of subtaskRows) {
        const rawSubtaskTitle = sr[h.tIdx] || projectName;
        const subtaskTitle = rawSubtaskTitle.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
        const rawBobot = (sr[h.hIdx] || "").trim().replace(",", ".");
        const workload = isNaN(parseFloat(rawBobot)) ? 0 : parseFloat(rawBobot);
        const subKey = `${subtaskTitle}__${workload}`;
        if (!subtaskGroupMap.has(subKey)) {
          subtaskGroupMap.set(subKey, []);
        }
        subtaskGroupMap.get(subKey)!.push(sr);
      }

      for (const [, rowsInSubtask] of subtaskGroupMap.entries()) {
        const firstSubtaskRow = rowsInSubtask[0];
        const rawSubtaskTitle = firstSubtaskRow[h.tIdx] || projectName;
        const subtaskTitle = rawSubtaskTitle.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
        const rawBobot = (firstSubtaskRow[h.hIdx] || "").trim().replace(",", ".");
        const workload = isNaN(parseFloat(rawBobot)) ? 0 : parseFloat(rawBobot);

        const anyDone = rowsInSubtask.some((r) => (r[h.stIdx] || "").toLowerCase() === "done");

        const descParts: string[] = [];
        if (firstSubtaskRow[h.pengIdx] && firstSubtaskRow[h.pengIdx].trim()) descParts.push(`Pengerjaan: ${firstSubtaskRow[h.pengIdx].trim()}`);
        if (firstSubtaskRow[h.fIdx] && firstSubtaskRow[h.fIdx].trim()) descParts.push(`Fitur: ${firstSubtaskRow[h.fIdx].trim()}`);
        if (firstSubtaskRow[h.nIdx] && firstSubtaskRow[h.nIdx].trim()) descParts.push(`Notes: ${firstSubtaskRow[h.nIdx].trim()}`);
        const description = descParts.length > 0 ? descParts.join("\n") : undefined;
        const featureGoal = firstSubtaskRow[h.fIdx] ? `Fitur: ${firstSubtaskRow[h.fIdx].trim()}` : undefined;

        // Check if subtask exists in DB for this task
        const candidates = existingSubtasks.filter(
          (s) => s.task_id === taskId && s.title.toLowerCase().trim() === subtaskTitle.toLowerCase()
        );

        let existingSubtask = candidates.find(
          (c) => !matchedSubtaskIds.has(c.id) && c.workload_hours === workload
        );
        if (!existingSubtask) {
          existingSubtask = candidates.find((c) => !matchedSubtaskIds.has(c.id));
        }

        let subtaskId: string;

        if (existingSubtask) {
          subtaskId = existingSubtask.id;
          matchedSubtaskIds.add(subtaskId);
          const currentStatus = existingSubtask.status;

          if (currentStatus === "in_progress" || currentStatus === "review" || currentStatus === "done") {
            subtasksPreserved++;
            batchStatements.push({
              sql: "UPDATE subtasks SET description = ?, goals = ?, workload_hours = ?, updated_at = ? WHERE id = ?",
              args: [description || null, featureGoal || null, workload, now, existingSubtask.id],
            });
          } else if (anyDone) {
            batchStatements.push({
              sql: "UPDATE subtasks SET done = 1, status = 'done', workload_hours = ?, updated_at = ? WHERE id = ?",
              args: [workload, now, existingSubtask.id],
            });
            subtasksUpdated++;
          } else {
            batchStatements.push({
              sql: "UPDATE subtasks SET description = ?, goals = ?, workload_hours = ?, updated_at = ? WHERE id = ?",
              args: [description || null, featureGoal || null, workload, now, existingSubtask.id],
            });
            subtasksUpdated++;
          }
        } else {
          subtaskId = crypto.randomUUID();
          matchedSubtaskIds.add(subtaskId);
          const initialStatus = anyDone ? "done" : "to_do";

          batchStatements.push({
            sql: `INSERT INTO subtasks (id, task_id, title, description, goals, done, status, workload_hours, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [subtaskId, taskId, subtaskTitle, description || null, featureGoal || null, anyDone ? 1 : 0, initialStatus, workload, now, now],
          });
          subtasksCreated++;

          const rawAssignees = Array.from(new Set(rowsInSubtask.map((r) => (r[h.cIdx] || "").trim()).filter(Boolean)));
          addedNewSubtasks.push({
            id: subtaskId,
            title: subtaskTitle,
            taskTitle: projectName,
            categoryName,
            workloadHours: workload,
            assignees: rawAssignees,
          });
          existingSubtasks.push({ id: subtaskId, task_id: taskId, title: subtaskTitle, status: initialStatus, workload_hours: workload, done: anyDone ? 1 : 0 });
        }

        // Assignees
        const seenStaff = new Set<string>();
        const assigneeList: { id: string; name: string }[] = [];

        for (const sr of rowsInSubtask) {
          const contributorName = (sr[h.cIdx] || "").trim() || "Staff";
          const staffUserId = userMap.get(contributorName.toLowerCase()) || userMap.get("arif")!;
          totalWorkloadHours += workload;

          if (!seenStaff.has(staffUserId)) {
            seenStaff.add(staffUserId);
            assigneeList.push({ id: staffUserId, name: contributorName });

            const assKey = `${subtaskId}___${staffUserId}`;
            if (!existingAssigneesSet.has(assKey)) {
              existingAssigneesSet.add(assKey);
              batchStatements.push({
                sql: "INSERT INTO subtask_assignees (subtask_id, staff_id, assigned_at) VALUES (?, ?, ?)",
                args: [subtaskId, staffUserId, now],
              });
            }

            if (anyDone) {
              batchStatements.push({
                sql: "INSERT INTO time_contributions (subtask_id, staff_id, hours) VALUES (?, ?, ?)",
                args: [subtaskId, staffUserId, workload],
              });
            }
          }
        }

        batchStatements.push({
          sql: `INSERT INTO staff_assignment_history (id, subtask_id, previous_assignees, new_assignees, changed_by, change_type, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [crypto.randomUUID(), subtaskId, null, JSON.stringify(assigneeList.map((a) => a.name)), performedBy || "Sprint Sync Engine", "added", `Sinkronisasi otomatis ${sprintLabel}`, now],
        });

        const primaryStaffId = assigneeList[0]?.id || userMap.get("arif")!;
        batchStatements.push({
          sql: `INSERT INTO activity_logs (id, subtask_id, task_id, user_id, action, timestamp, duration_hours, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [crypto.randomUUID(), subtaskId, taskId, primaryStaffId, anyDone ? "completed" : "created", now, anyDone ? workload : 0, `Subtask '${subtaskTitle}' disinkronkan dari Google Sheets`],
        });
      }

      taskCounter++;
    }
  }

  // 4. Execute all batch statements in chunks of 50 to Turso/LibSQL client
  console.log(`🚀 Menjalankan ${batchStatements.length} statements via client.batch...`);
  const CHUNK_SIZE = 50;
  for (let i = 0; i < batchStatements.length; i += CHUNK_SIZE) {
    const chunk = batchStatements.slice(i, i + CHUNK_SIZE);
    await client.batch(chunk);
  }

  // Also apply to local sqlite instance if available and not using Turso
  if (sqlite && !process.env.TURSO_DATABASE_URL) {
    try {
      const localTx = sqlite.transaction(() => {
        for (const stmt of batchStatements) {
          try {
            sqlite.prepare(stmt.sql).run(...stmt.args);
          } catch {
            // ignore duplicate constraints in fallback
          }
        }
      });
      localTx();
      sqlite.pragma("wal_checkpoint(TRUNCATE)");
    } catch (localErr) {
      console.warn("Local SQLite mirror note:", localErr);
    }
  }

  return {
    success: true,
    message: `Sinkronisasi ${sprintLabel} berhasil diselesaikan.`,
    sprintLabel,
    projectsCreated,
    projectsUpdated,
    tasksCreated,
    tasksUpdated,
    subtasksCreated,
    subtasksPreserved,
    subtasksUpdated,
    totalWorkloadHours: Math.round(totalWorkloadHours * 10) / 10,
    syncedAt: now,
    addedItems: {
      newTasks: addedNewTasks,
      newSubtasks: addedNewSubtasks,
    },
  };
}
