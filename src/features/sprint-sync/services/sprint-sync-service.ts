import { sqlite } from "@/db";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { AvailableSprint, SprintSyncPreview, SprintSyncResult } from "../types";

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

interface ParsedHeaderIndices {
  spIdx: number;
  catIdx: number;
  pIdx: number;
  tIdx: number;
  fIdx: number;
  pengIdx: number;
  prIdx: number;
  cIdx: number;
  hIdx: number;
  nIdx: number;
  stIdx: number;
}

function resolveHeaders(headerRow: string[]): ParsedHeaderIndices {
  const normalized = headerRow.map((h) => h.trim());
  return {
    spIdx: normalized.indexOf("Sprint"),
    catIdx: normalized.indexOf("Kategori Project"),
    pIdx: normalized.indexOf("Project"),
    tIdx: normalized.indexOf("Task Detail"),
    fIdx: normalized.indexOf("Fitur"),
    pengIdx: normalized.indexOf("Pengerjaan"),
    prIdx: normalized.indexOf("Priority"),
    cIdx: normalized.indexOf("Kontributor"),
    hIdx: normalized.indexOf("Bobot (Jam)"),
    nIdx: normalized.indexOf("Notes / Files"),
    stIdx: normalized.indexOf("Status"),
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

  // Check which sprints are in SQLite database
  const dbSprints = sqlite
    .prepare("SELECT DISTINCT sprint FROM projects")
    .all() as { sprint: string }[];
  const dbSprintSet = new Set(dbSprints.map((s) => s.sprint.toLowerCase().trim()));

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
 * Preview sprint sync diff before executing.
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

  // Database Delta Check for THIS SPRINT ONLY (multi-sprint retention)
  const existingProjects = sqlite
    .prepare("SELECT id, title FROM projects WHERE sprint = ?")
    .all(sprintLabel) as { id: string; title: string }[];
  const existingProjectIds = existingProjects.map((p) => p.id);

  let existingTasksCount = 0;
  let existingSubtasksCount = 0;
  let preservedInProgressSubtasks = 0;

  if (existingProjectIds.length > 0) {
    const placeholders = existingProjectIds.map(() => "?").join(",");
    const existingTasks = sqlite
      .prepare(`SELECT id, title FROM tasks WHERE project_id IN (${placeholders})`)
      .all(...existingProjectIds) as { id: string; title: string }[];
    existingTasksCount = existingTasks.length;

    const taskIds = existingTasks.map((t) => t.id);
    if (taskIds.length > 0) {
      const taskPlaceholders = taskIds.map(() => "?").join(",");
      const existingSubtasks = sqlite
        .prepare(
          `SELECT id, title, status FROM subtasks WHERE task_id IN (${taskPlaceholders})`
        )
        .all(...taskIds) as { id: string; title: string; status: string }[];
      existingSubtasksCount = existingSubtasks.length;

      // Check how many have progress already started (Smart Merge protection)
      for (const st of existingSubtasks) {
        if (st.status === "in_progress" || st.status === "review" || st.status === "done") {
          preservedInProgressSubtasks++;
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
    projectsCount: categoryMap.size,
    tasksCount,
    totalWorkloadHours: Math.round(totalWorkloadHours * 10) / 10,
    contributors: sortedContributors,
    categories: categoriesList,
    delta: {
      existingProjectsInSprint: existingProjects.length,
      newProjectsCount,
      existingTasksInSprint: existingTasksCount,
      newTasksCount: Math.max(0, tasksCount - existingTasksCount),
      existingSubtasksInSprint: existingSubtasksCount,
      newSubtasksCount: Math.max(0, totalUniqueSubtasks - existingSubtasksCount),
      preservedInProgressSubtasks,
    },
  };
}

/**
 * Execute atomic smart sync for the specified sprint.
 * Multi-sprint retention: leaves all other sprints untouched.
 * Smart merge: preserves in_progress, review, done status on existing subtasks.
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

  // Ensure default users & leads exist
  const existingUsers = sqlite
    .prepare("SELECT id, username, nama, role FROM users")
    .all() as { id: string; username: string; nama: string; role: string }[];
  const userMap = new Map<string, string>(); // lowercase username/name -> userId

  for (const u of existingUsers) {
    userMap.set(u.username.toLowerCase(), u.id);
    userMap.set(u.nama.toLowerCase(), u.id);
  }

  // Ensure the 3 leads exist (Arif, Cheppy, Ganda)
  const defaultLeadHash = await bcrypt.hash("lead123", 10);
  const theThreeLeads = [
    { username: "arif", nama: "Arif", role: "lead", dept: "UI/UX Design" },
    { username: "cheppy", nama: "Cheppy", role: "lead", dept: "Digital Project" },
    { username: "ganda", nama: "Ganda", role: "lead", dept: "Digital Project" },
  ];

  const insertUserStmt = sqlite.prepare(`
    INSERT INTO users (id, nama, username, password_hash, role, department, capacity_hours_per_month, leave_days, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 160, 0, ?, ?)
  `);

  for (const ld of theThreeLeads) {
    if (!userMap.has(ld.username.toLowerCase())) {
      const id = crypto.randomUUID();
      insertUserStmt.run(id, ld.nama, ld.username, defaultLeadHash, ld.role, ld.dept, now, now);
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
      insertUserStmt.run(
        id,
        rawContributor,
        sanitizedUsername || `staff_${id.slice(0, 6)}`,
        defaultStaffHash,
        "staff",
        "Digital & Product Team",
        now,
        now
      );
      userMap.set(rawContributor.toLowerCase(), id);
      userMap.set((sanitizedUsername || "").toLowerCase(), id);
    }
  }

  // Begin Transaction for Multi-Sprint Safe Smart Sync
  let projectsCreated = 0;
  let projectsUpdated = 0;
  let tasksCreated = 0;
  let tasksUpdated = 0;
  let subtasksCreated = 0;
  let subtasksPreserved = 0;
  let subtasksUpdated = 0;
  let totalWorkloadHours = 0;

  const findProjectStmt = sqlite.prepare(
    "SELECT id, title, lead_id FROM projects WHERE title = ? AND sprint = ?"
  );
  const insertProjectStmt = sqlite.prepare(`
    INSERT INTO projects (id, title, description, sprint, lead_id, sprint_cutoff, is_archived, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);
  const updateProjectStmt = sqlite.prepare(`
    UPDATE projects SET description = ?, lead_id = COALESCE(?, lead_id), updated_at = ? WHERE id = ?
  `);

  const findTaskStmt = sqlite.prepare(
    "SELECT id, ticket_id, title, status, total_actual_hours FROM tasks WHERE title = ? AND project_id = ?"
  );
  const insertTaskStmt = sqlite.prepare(`
    INSERT INTO tasks (id, ticket_id, title, description, status, priority, pic_name, lead_id, project_id, total_actual_hours, deadline, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateTaskStmt = sqlite.prepare(`
    UPDATE tasks SET pic_name = ?, priority = ?, lead_id = COALESCE(?, lead_id), updated_at = ? WHERE id = ?
  `);

  const findSubtaskByTaskAndTitleStmt = sqlite.prepare(`
    SELECT id, title, status, workload_hours, done FROM subtasks WHERE title = ? AND task_id = ?
  `);
  const insertSubtaskStmt = sqlite.prepare(`
    INSERT INTO subtasks (id, task_id, title, description, goals, done, status, workload_hours, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateSubtaskStmt = sqlite.prepare(`
    UPDATE subtasks SET description = ?, goals = ?, workload_hours = ?, updated_at = ? WHERE id = ?
  `);
  const updateSubtaskDoneStmt = sqlite.prepare(`
    UPDATE subtasks SET done = 1, status = 'done', workload_hours = ?, updated_at = ? WHERE id = ?
  `);

  const insertSubtaskAssigneeStmt = sqlite.prepare(`
    INSERT INTO subtask_assignees (subtask_id, staff_id, assigned_at)
    VALUES (?, ?, ?)
  `);
  const findAssigneeStmt = sqlite.prepare(
    "SELECT id FROM subtask_assignees WHERE subtask_id = ? AND staff_id = ?"
  );

  const insertAssignmentHistoryStmt = sqlite.prepare(`
    INSERT INTO staff_assignment_history (id, subtask_id, previous_assignees, new_assignees, changed_by, change_type, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertActivityLogStmt = sqlite.prepare(`
    INSERT INTO activity_logs (id, subtask_id, task_id, user_id, action, timestamp, duration_hours, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTimeContribStmt = sqlite.prepare(`
    INSERT INTO time_contributions (subtask_id, staff_id, hours)
    VALUES (?, ?, ?)
  `);

  const findTimeContribStmt = sqlite.prepare(
    "SELECT id FROM time_contributions WHERE subtask_id = ? AND staff_id = ?"
  );

  // Ambil data master project_categories
  const masterCategories = sqlite.prepare(
    "SELECT id, name, code, lead_id FROM project_categories"
  ).all() as Array<{ id: string; name: string; code: string; lead_id: string | null }>;
  const masterCatMap = new Map(masterCategories.map((c) => [c.name.toLowerCase().trim(), c]));

  const insertMasterCatStmt = sqlite.prepare(`
    INSERT INTO project_categories (id, name, code, lead_id, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const runSyncTransaction = sqlite.transaction(() => {
    const matchedSubtaskIds = new Set<string>();
    for (const [categoryName, taskMap] of categoryMap.entries()) {
      let projectId: string;
      const cleanCatName = categoryName.trim();
      const matchedMaster = masterCatMap.get(cleanCatName.toLowerCase());

      const catCode = matchedMaster?.code || cleanCatName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PROJ";
      const leadId = matchedMaster?.lead_id || null;

      // Jika kategori baru belum ada di master data, otomatis registrasikan
      if (!matchedMaster) {
        const newCatId = crypto.randomUUID();
        insertMasterCatStmt.run(
          newCatId,
          cleanCatName,
          catCode,
          null,
          `Otomatis terdaftar dari sinkronisasi ${sprintLabel}`,
          now,
          now
        );
        masterCatMap.set(cleanCatName.toLowerCase(), {
          id: newCatId,
          name: cleanCatName,
          code: catCode,
          lead_id: null,
        });
      }

      // 1. Projects (Category level)
      const existingProject = findProjectStmt.get(categoryName, sprintLabel) as
        | { id: string; title: string; lead_id: string }
        | undefined;

      if (existingProject) {
        projectId = existingProject.id;
        updateProjectStmt.run(`Kategori Project: ${categoryName} — ${sprintLabel}`, leadId, now, projectId);
        projectsUpdated++;
      } else {
        projectId = crypto.randomUUID();
        insertProjectStmt.run(
          projectId,
          categoryName,
          `Kategori Project: ${categoryName} — ${sprintLabel}`,
          sprintLabel,
          leadId,
          "2026-10-02T23:59:59.000Z",
          now,
          now
        );
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
        const existingTask = findTaskStmt.get(projectName, projectId) as
          | { id: string; ticket_id: string; title: string; status: string; total_actual_hours: number }
          | undefined;

        if (existingTask) {
          taskId = existingTask.id;
          updateTaskStmt.run(pic, priority, leadId, now, taskId);
          tasksUpdated++;
        } else {
          taskId = crypto.randomUUID();
          insertTaskStmt.run(
            taskId,
            ticketId,
            projectName,
            `Task proyek ${projectName} di bawah kategori ${categoryName}`,
            "todo",
            priority,
            pic,
            leadId,
            projectId,
            0,
            "2026-10-02T18:00:00.000Z",
            now,
            now
          );
          tasksCreated++;
        }

        // 3. Subtasks (Task Detail column in sheet) — Group by Title + Bobot so co-assignees share 1 card
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
          const candidates = findSubtaskByTaskAndTitleStmt.all(subtaskTitle, taskId) as {
            id: string;
            title: string;
            status: string;
            workload_hours: number;
            done: number;
          }[];

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

            // SMART MERGE RULE:
            // If already in_progress, review, or done, PRESERVE progress!
            if (currentStatus === "in_progress" || currentStatus === "review" || currentStatus === "done") {
              subtasksPreserved++;
              updateSubtaskStmt.run(description, featureGoal, workload, now, existingSubtask.id);
            } else if (anyDone) {
              updateSubtaskDoneStmt.run(workload, now, existingSubtask.id);
              subtasksUpdated++;
            } else {
              updateSubtaskStmt.run(description, featureGoal, workload, now, existingSubtask.id);
              subtasksUpdated++;
            }
          } else {
            subtaskId = crypto.randomUUID();
            matchedSubtaskIds.add(subtaskId);
            const initialStatus = anyDone ? "done" : "to_do";

            insertSubtaskStmt.run(
              subtaskId,
              taskId,
              subtaskTitle,
              description,
              featureGoal,
              anyDone ? 1 : 0,
              initialStatus,
              workload,
              now,
              now
            );
            subtasksCreated++;
          }

          // Handle Assignees for this subtask:
          // The first row in the sheet is the primary subtask owner, subsequent are co-assignees.
          const seenStaff = new Set<string>();
          const assigneeList: { id: string; name: string }[] = [];

          for (const sr of rowsInSubtask) {
            const contributorName = (sr[h.cIdx] || "").trim() || "Staff";
            const staffUserId = userMap.get(contributorName.toLowerCase()) || userMap.get("arif")!;
            totalWorkloadHours += workload;

            if (!seenStaff.has(staffUserId)) {
              seenStaff.add(staffUserId);
              assigneeList.push({ id: staffUserId, name: contributorName });

              const existingAssignee = findAssigneeStmt.get(subtaskId, staffUserId);
              if (!existingAssignee) {
                insertSubtaskAssigneeStmt.run(subtaskId, staffUserId, now);
              }

              if (anyDone) {
                const existingContrib = findTimeContribStmt.get(subtaskId, staffUserId);
                if (!existingContrib) {
                  insertTimeContribStmt.run(subtaskId, staffUserId, workload);
                }
              }
            }
          }

          insertAssignmentHistoryStmt.run(
            crypto.randomUUID(),
            subtaskId,
            null,
            JSON.stringify(assigneeList.map((a) => a.name)),
            performedBy || "Sprint Sync Engine",
            "added",
            `Sinkronisasi otomatis ${sprintLabel}`,
            now
          );

          const primaryStaffId = assigneeList[0]?.id || userMap.get("arif")!;
          insertActivityLogStmt.run(
            crypto.randomUUID(),
            subtaskId,
            taskId,
            primaryStaffId,
            anyDone ? "completed" : "created",
            now,
            anyDone ? workload : 0,
            `Subtask '${subtaskTitle}' disinkronkan dari Google Sheets`
          );
        }

        taskCounter++;
      }
    }
  });

  runSyncTransaction();

  // Checkpoint SQLite WAL after transaction completes
  try {
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    // ignore
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
  };
}
