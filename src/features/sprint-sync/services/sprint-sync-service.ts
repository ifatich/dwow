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
  UpdatedItemTask,
  UpdatedItemSubtask,
  FieldDiff,
} from "../types";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1aDi3fiKhYmAlm4ltLQV8gc7DMm2hqpZtzF9iK0jfFKQ/export?format=csv&gid=27617465";

/**
 * Normalizes any Google Sheets URL (including edit/sharing links) into a CSV export URL.
 * Automatically targets the task data tab (gid=27617465) if missing or default.
 */
export function normalizeGoogleSheetsUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return DEFAULT_SHEET_URL;

  // Already a complete export CSV URL with gid
  if (trimmed.includes("/export?") && trimmed.includes("format=csv") && trimmed.includes("gid=")) {
    return trimmed;
  }

  // Extract spreadsheet doc ID
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) {
    return trimmed;
  }
  const spreadsheetId = idMatch[1];

  // Extract GID from query params (?gid=...) or URL fragment (#gid=...)
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
  let gid = gidMatch ? gidMatch[1] : undefined;

  // If this matches the target spreadsheet and gid is missing or 0, default to tbl_task (gid 27617465)
  if (spreadsheetId === "1aDi3fiKhYmAlm4ltLQV8gc7DMm2hqpZtzF9iK0jfFKQ" && (!gid || gid === "0")) {
    gid = "27617465";
  }

  if (gid) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
}

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
  const targetUrl = customUrl?.trim() ? normalizeGoogleSheetsUrl(customUrl) : DEFAULT_SHEET_URL;

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
 * Normalizes title strings for reliable comparison (strips whitespace, newlines, case).
 */
export function normalizeTitle(str?: string | null): string {
  if (!str) return "";
  return str.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
}

/**
 * Find header indexes accurately from header row.
 */
export function resolveHeaders(headerRow: string[]) {
  const normalized = headerRow.map((h) => h.toLowerCase().trim());
  const findIdx = (exactList: string[]) => {
    const exact = normalized.findIndex((h) => exactList.includes(h));
    if (exact !== -1) return exact;
    return normalized.findIndex((h) => exactList.some((k) => h.startsWith(k)));
  };

  return {
    catIdx: findIdx(["kategori project", "kategori proyek", "kategori"]),
    pIdx: findIdx(["project", "proyek", "nama project"]),
    tIdx: findIdx(["task detail", "detail task", "subtask", "pekerjaan"]),
    pengIdx: findIdx(["pengerjaan", "tipe pengerjaan"]),
    fIdx: findIdx(["fitur", "feature"]),
    cIdx: findIdx(["kontributor", "contributor", "pic", "assignee"]),
    hIdx: findIdx(["bobot (jam)", "bobot", "jam", "hours", "workload"]),
    spIdx: findIdx(["sprint"]),
    prIdx: findIdx(["priority", "prioritas"]),
    nIdx: findIdx(["notes / files", "notes", "catatan", "files"]),
    stIdx: findIdx(["status"]),
    endIdx: findIdx(["end date", "end_date", "tgl selesai", "tanggal selesai", "selesai", "deadline"]),
    startIdx: findIdx(["start date", "start_date", "tgl mulai", "tanggal mulai", "mulai"]),
  };
}

/**
 * Parses dates formatted in Indonesian or English (e.g. "30 Oktober 2026", "10 Jul2026", "10/2/2026") into ISO 8601.
 */
export function parseSpreadsheetDate(raw?: string, fallbackIso?: string): string {
  if (!raw || !raw.trim()) {
    return fallbackIso || new Date().toISOString();
  }
  const str = raw.trim();

  const monthMap: Record<string, number> = {
    jan: 0, januari: 0, january: 0,
    feb: 1, februari: 1, february: 1,
    mar: 2, maret: 2, march: 2,
    apr: 3, april: 3,
    mei: 4, may: 4,
    jun: 5, juni: 5, june: 5,
    jul: 6, juli: 6, july: 6,
    agu: 7, agustus: 7, aug: 7, august: 7,
    sep: 8, september: 8,
    okt: 9, oktober: 9, oct: 9, october: 9,
    nov: 10, november: 10,
    des: 11, desember: 11, dec: 11, december: 11,
  };

  // Match e.g. "30 Oktober 2026" or "10 Jul2026" or "2 Okt 2026"
  const m = str.match(/^(\d{1,2})\s*([a-zA-Z]+)\s*(\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthStr = m[2].toLowerCase();
    const year = parseInt(m[3], 10);
    const month = monthMap[monthStr];
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day, 18, 0, 0)).toISOString();
    }
  }

  // Match e.g. "10/2/2026" or "30/10/2026" or "2026-10-30"
  if (str.includes("/") || str.includes("-")) {
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parseInt(parts[0], 10);
        const mon = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(Date.UTC(y, mon, d, 18, 0, 0)).toISOString();
      } else {
        // DD/MM/YYYY or MM/DD/YYYY
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        const day = p1 > 12 ? p1 : p2;
        const mon = p1 > 12 ? p2 - 1 : p1 - 1;
        return new Date(Date.UTC(y, mon, day, 18, 0, 0)).toISOString();
      }
    }
  }

  const direct = new Date(str);
  if (!isNaN(direct.getTime()) && direct.getFullYear() > 2000) {
    direct.setHours(18, 0, 0, 0);
    return direct.toISOString();
  }

  return fallbackIso || new Date().toISOString();
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
      sql: "SELECT id, title FROM projects WHERE sprint = ? OR sprint = ? OR sprint = ?",
      args: [sprintLabel, sprintIdentifier, numOnly],
    });
    existingProjects = existingProjectsRes.rows as unknown as { id: string; title: string }[];
  } catch {
    if (sqlite) {
      existingProjects = sqlite
        .prepare("SELECT id, title FROM projects WHERE sprint = ? OR sprint = ? OR sprint = ?")
        .all(sprintLabel, sprintIdentifier, numOnly) as { id: string; title: string }[];
    }
  }

  const existingProjectIds = existingProjects.map((p) => p.id);
  const existingProjectMap = new Map<string, string>();
  for (const p of existingProjects) {
    existingProjectMap.set(normalizeTitle(p.title), p.id);
  }

  let existingTasks: Array<{
    id: string;
    ticket_id: string;
    title: string;
    status: string;
    priority: string;
    pic_name: string;
    deadline: string | null;
    project_id: string;
  }> = [];
  let existingSubtasks: Array<{
    id: string;
    title: string;
    status: string;
    task_id: string;
    workload_hours: number;
    description?: string | null;
    goals?: string | null;
    done?: number;
  }> = [];
  let preservedInProgressSubtasks = 0;

  if (existingProjectIds.length > 0) {
    const placeholders = existingProjectIds.map(() => "?").join(",");
    try {
      const existingTasksRes = await client.execute({
        sql: `SELECT id, ticket_id, title, status, priority, pic_name, deadline, project_id FROM tasks WHERE project_id IN (${placeholders})`,
        args: existingProjectIds,
      });
      existingTasks = existingTasksRes.rows as unknown as any[];
    } catch {
      if (sqlite) {
        existingTasks = sqlite
          .prepare(`SELECT id, ticket_id, title, status, priority, pic_name, deadline, project_id FROM tasks WHERE project_id IN (${placeholders})`)
          .all(...existingProjectIds) as any[];
      }
    }

    const taskIds = existingTasks.map((t) => t.id);
    if (taskIds.length > 0) {
      const taskPlaceholders = taskIds.map(() => "?").join(",");
      try {
        const existingSubtasksRes = await client.execute({
          sql: `SELECT id, title, status, task_id, workload_hours, description, goals, done FROM subtasks WHERE task_id IN (${taskPlaceholders})`,
          args: taskIds,
        });
        existingSubtasks = existingSubtasksRes.rows as unknown as any[];
      } catch {
        if (sqlite) {
          existingSubtasks = sqlite
            .prepare(
              `SELECT id, title, status, task_id, workload_hours, description, goals, done FROM subtasks WHERE task_id IN (${taskPlaceholders})`
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

  // Fetch assignees for existing subtasks to detect changes accurately
  const existingAssigneesMap = new Map<string, string[]>();
  const allSubtaskIds = existingSubtasks.map((s) => s.id);
  if (allSubtaskIds.length > 0) {
    const subHolders = allSubtaskIds.map(() => "?").join(",");
    try {
      const assRes = await client.execute({
        sql: `SELECT sa.subtask_id, COALESCE(u.nama, u.username) as staff_name
              FROM subtask_assignees sa
              LEFT JOIN users u ON sa.staff_id = u.id
              WHERE sa.subtask_id IN (${subHolders})`,
        args: allSubtaskIds,
      });
      for (const a of assRes.rows as unknown as { subtask_id: string; staff_name: string }[]) {
        if (!existingAssigneesMap.has(a.subtask_id)) {
          existingAssigneesMap.set(a.subtask_id, []);
        }
        if (a.staff_name) {
          existingAssigneesMap.get(a.subtask_id)!.push(a.staff_name);
        }
      }
    } catch (err) {
      console.warn("Assignee query note in preview:", err);
    }
  }

  // Pre-calculate detected new and updated tasks and subtasks for detailed preview
  const detectedNewTasks: AddedItemTask[] = [];
  const detectedNewSubtasks: AddedItemSubtask[] = [];
  const detectedUpdatedTasks: UpdatedItemTask[] = [];
  const detectedUpdatedSubtasks: UpdatedItemSubtask[] = [];
  const processedUpdatedTaskIds = new Set<string>();
  const matchedTaskIds = new Set<string>();
  const matchedSubtaskIds = new Set<string>();

  for (const [catName, taskMap] of categoryMap.entries()) {
    const pId = existingProjectMap.get(normalizeTitle(catName));
    for (const [projectName, sRows] of taskMap.entries()) {
      // 1. Direct match within same category project
      let matchedTask = existingTasks.find(
        (t) => !matchedTaskIds.has(t.id) && pId === t.project_id && normalizeTitle(t.title) === normalizeTitle(projectName)
      );
      let isCategoryShift = false;
      let oldCategoryName: string | undefined = undefined;

      // 2. Cross-Category Match in the same sprint (category was shifted in spreadsheet)
      if (!matchedTask) {
        const candidate = existingTasks.find(
          (t) => !matchedTaskIds.has(t.id) && normalizeTitle(t.title) === normalizeTitle(projectName)
        );
        if (candidate) {
          matchedTask = candidate;
          isCategoryShift = true;
          const oldProj = existingProjects.find((p) => p.id === candidate.project_id);
          oldCategoryName = oldProj?.title || "Kategori Lain";
        }
      }

      if (matchedTask) {
        matchedTaskIds.add(matchedTask.id);
      }

      if (!matchedTask) {
        detectedNewTasks.push({
          key: `new_task:${catName}:::${projectName}`,
          title: projectName,
          categoryName: catName,
          pic: sRows[0]?.[h.cIdx] || "Tim",
        });
      } else if (!processedUpdatedTaskIds.has(matchedTask.id)) {
        processedUpdatedTaskIds.add(matchedTask.id);
        const taskDiffs: FieldDiff[] = [];
        const newPic = sRows[0]?.[h.cIdx] || "Tim";
        const newPriorityRaw = (sRows[0]?.[h.prIdx] || "medium").toLowerCase();
        const newPriority = ["low", "medium", "high", "urgent"].includes(newPriorityRaw) ? newPriorityRaw : "medium";

        // Diff for Category Shift
        if (isCategoryShift && oldCategoryName) {
          taskDiffs.push({
            field: "category",
            label: "Kategori Project",
            oldValue: oldCategoryName,
            newValue: catName,
          });
        }

        if (newPic && matchedTask.pic_name && newPic.toLowerCase().trim() !== matchedTask.pic_name.toLowerCase().trim()) {
          taskDiffs.push({
            field: "pic",
            label: "PIC",
            oldValue: matchedTask.pic_name,
            newValue: newPic,
          });
        }

        if (newPriority && matchedTask.priority && newPriority.toLowerCase().trim() !== matchedTask.priority.toLowerCase().trim()) {
          taskDiffs.push({
            field: "priority",
            label: "Prioritas",
            oldValue: matchedTask.priority,
            newValue: newPriority,
          });
        }

        if (taskDiffs.length > 0) {
          detectedUpdatedTasks.push({
            id: matchedTask.id,
            ticketId: matchedTask.ticket_id,
            title: projectName,
            categoryName: catName,
            diffs: taskDiffs,
            currentPic: matchedTask.pic_name || "-",
            newPic,
            currentPriority: matchedTask.priority || "medium",
            newPriority,
          });
        }
      }

      // Group subtasks in sheet
      const subtaskGroupMap = new Map<string, string[][]>();
      for (const sr of sRows) {
        const rawTitle = sr[h.tIdx] || projectName;
        const title = rawTitle.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
        const rawB = (sr[h.hIdx] || "").trim().replace(",", ".");
        const workload = isNaN(parseFloat(rawB)) ? 0 : parseFloat(rawB);
        const subKey = `${normalizeTitle(title)}__${workload}`;
        if (!subtaskGroupMap.has(subKey)) subtaskGroupMap.set(subKey, []);
        subtaskGroupMap.get(subKey)!.push(sr);
      }

      for (const [, rowsInSub] of subtaskGroupMap.entries()) {
        const firstSr = rowsInSub[0];
        const rawTitle = firstSr[h.tIdx] || projectName;
        const title = rawTitle.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
        const rawB = (firstSr[h.hIdx] || "").trim().replace(",", ".");
        const workload = isNaN(parseFloat(rawB)) ? 0 : parseFloat(rawB);
        const sheetAssignees = Array.from(new Set(rowsInSub.map((r) => (r[h.cIdx] || "").trim()).filter(Boolean)));
        const anyDone = rowsInSub.some((r) => (r[h.stIdx] || "").toLowerCase() === "done");

        let matchedSubtask: (typeof existingSubtasks)[0] | undefined = undefined;
        let isSubtaskShift = false;
        let oldParentTaskTitle: string | undefined = undefined;

        // 1. Try finding within matchedTask
        if (matchedTask) {
          matchedSubtask = existingSubtasks.find(
            (st) => !matchedSubtaskIds.has(st.id) &&
                    st.task_id === matchedTask!.id &&
                    normalizeTitle(st.title) === normalizeTitle(title) &&
                    st.workload_hours === workload
          );
          if (!matchedSubtask) {
            matchedSubtask = existingSubtasks.find(
              (st) => !matchedSubtaskIds.has(st.id) &&
                      st.task_id === matchedTask!.id &&
                      normalizeTitle(st.title) === normalizeTitle(title)
            );
          }
        }

        // 2. Fallback: Search across sprint if non-generic
        const isGeneric = ["review", "support", "discuss & brainstorming", "showing mockup", "qa", "testing"].includes(
          normalizeTitle(title)
        );
        if (!matchedSubtask && !isGeneric) {
          matchedSubtask = existingSubtasks.find(
            (st) => !matchedSubtaskIds.has(st.id) &&
                    normalizeTitle(st.title) === normalizeTitle(title) &&
                    st.workload_hours === workload
          );
          if (!matchedSubtask) {
            matchedSubtask = existingSubtasks.find(
              (st) => !matchedSubtaskIds.has(st.id) &&
                      normalizeTitle(st.title) === normalizeTitle(title)
            );
          }
          if (matchedSubtask) {
            isSubtaskShift = true;
            const oldParent = existingTasks.find((t) => t.id === matchedSubtask!.task_id);
            oldParentTaskTitle = oldParent?.title || "Task Lain";
          }
        }

        if (!matchedSubtask) {
          detectedNewSubtasks.push({
            key: `new_subtask:${catName}:::${projectName}:::${title}:::${workload}`,
            title,
            taskTitle: projectName,
            categoryName: catName,
            workloadHours: workload,
            assignees: sheetAssignees,
          });
        } else {
          matchedSubtaskIds.add(matchedSubtask.id);
          // Check for diffs between database and spreadsheet
          const subDiffs: FieldDiff[] = [];

          if (isSubtaskShift && oldParentTaskTitle) {
            subDiffs.push({
              field: "parent_task",
              label: "Pindah Parent Task",
              oldValue: oldParentTaskTitle,
              newValue: projectName,
            });
          }

          if (workload !== matchedSubtask.workload_hours) {
            subDiffs.push({
              field: "workload",
              label: "Bobot Jam",
              oldValue: `${matchedSubtask.workload_hours}h`,
              newValue: `${workload}h`,
            });
          }

          const currentAssignees = existingAssigneesMap.get(matchedSubtask.id) || [];
          const sortedCurrent = [...currentAssignees].map((a) => a.toLowerCase().trim()).sort().join(", ");
          const sortedNew = [...sheetAssignees].map((a) => a.toLowerCase().trim()).sort().join(", ");
          if (sortedCurrent !== sortedNew && (currentAssignees.length > 0 || sheetAssignees.length > 0)) {
            subDiffs.push({
              field: "assignees",
              label: "Assignee / Personil",
              oldValue: currentAssignees.join(", ") || "Tanpa Assignee",
              newValue: sheetAssignees.join(", ") || "Tanpa Assignee",
            });
          }

          if (anyDone && matchedSubtask.status !== "done") {
            subDiffs.push({
              field: "status",
              label: "Status Subtask",
              oldValue: matchedSubtask.status,
              newValue: "done (selesai)",
            });
          }

          if (subDiffs.length > 0) {
            detectedUpdatedSubtasks.push({
              id: matchedSubtask.id,
              title,
              taskTitle: projectName,
              categoryName: catName,
              diffs: subDiffs,
              currentWorkload: matchedSubtask.workload_hours,
              newWorkload: workload,
              currentAssignees,
              newAssignees: sheetAssignees,
              currentStatus: matchedSubtask.status,
              newStatus: anyDone ? "done" : undefined,
            });
          }
        }
      }
    }
  }

  const existingProjectTitles = new Set(existingProjects.map((p) => normalizeTitle(p.title)));
  let newProjectsCount = 0;
  for (const catName of categoryMap.keys()) {
    if (!existingProjectTitles.has(normalizeTitle(catName))) {
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
      newTasksCount: detectedNewTasks.length,
      existingSubtasksInSprint: existingSubtasks.length,
      newSubtasksCount: detectedNewSubtasks.length,
      preservedInProgressSubtasks,
    },
    detectedNewItems: {
      newTasks: detectedNewTasks,
      newSubtasks: detectedNewSubtasks,
    },
    detectedUpdatedItems: {
      updatedTasks: detectedUpdatedTasks,
      updatedSubtasks: detectedUpdatedSubtasks,
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
  selectedNewTaskKeys?: string[];
  selectedNewSubtaskKeys?: string[];
  selectedUpdatedTaskIds?: string[];
  selectedUpdatedSubtaskIds?: string[];
}): Promise<SprintSyncResult> {
  const {
    sprintIdentifier,
    customUrl,
    performedBy,
    selectedNewTaskKeys,
    selectedNewSubtaskKeys,
    selectedUpdatedTaskIds,
    selectedUpdatedSubtaskIds,
  } = options;
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
    sql: "SELECT id, title, lead_id FROM projects WHERE sprint = ? OR sprint = ? OR sprint = ?",
    args: [sprintLabel, sprintIdentifier, numOnly],
  });
  const existingProjects = existingProjRes.rows as unknown as Array<{ id: string; title: string; lead_id: string }>;
  const existingProjectMap = new Map(existingProjects.map((p) => [normalizeTitle(p.title), p]));

  const existingProjIds = existingProjects.map((p) => p.id);
  let existingTasks: Array<{ id: string; ticket_id: string; title: string; status: string; project_id: string; pic_name?: string; priority?: string }> = [];
  let existingSubtasks: Array<{ id: string; task_id: string; title: string; status: string; workload_hours: number; done: number }> = [];

  if (existingProjIds.length > 0) {
    const pHolders = existingProjIds.map(() => "?").join(",");
    const tRes = await client.execute({
      sql: `SELECT id, ticket_id, title, status, project_id, pic_name, priority FROM tasks WHERE project_id IN (${pHolders})`,
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
  const existingAssigneesSet = new Set<string>();
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
  let skippedItemsCount = 0;

  const addedNewTasks: AddedItemTask[] = [];
  const addedNewSubtasks: AddedItemSubtask[] = [];
  const claimedTaskIds = new Set<string>();
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

    // Dynamically calculate sprint cutoff from spreadsheet's End Date column
    let detectedSprintCutoff = "2026-10-30T23:59:59.000Z";
    if (h.endIdx !== -1) {
      const parsedDates = validRows
        .map((r) => (r[h.endIdx] || "").trim())
        .filter(Boolean)
        .map((dStr) => parseSpreadsheetDate(dStr))
        .filter((iso) => Boolean(iso));

      if (parsedDates.length > 0) {
        detectedSprintCutoff = parsedDates.sort().reverse()[0];
      }
    }

    // 1. Projects (Category level)
    const existingProject = existingProjectMap.get(normalizeTitle(cleanCatName));

    if (existingProject) {
      projectId = existingProject.id;
      batchStatements.push({
        sql: "UPDATE projects SET description = ?, sprint_cutoff = ?, lead_id = COALESCE(?, lead_id), updated_at = ? WHERE id = ?",
        args: [`Kategori Project: ${categoryName} — ${sprintLabel}`, detectedSprintCutoff, leadId, now, projectId],
      });
      projectsUpdated++;
    } else {
      projectId = crypto.randomUUID();
      batchStatements.push({
        sql: `INSERT INTO projects (id, title, description, sprint, lead_id, sprint_cutoff, is_archived, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        args: [projectId, categoryName, `Kategori Project: ${categoryName} — ${sprintLabel}`, sprintLabel, leadId, detectedSprintCutoff, now, now],
      });
      existingProjectMap.set(normalizeTitle(cleanCatName), { id: projectId, title: categoryName, lead_id: leadId || "" });
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

      // Determine task deadline from its subtask rows in the sheet
      let taskDeadline = detectedSprintCutoff;
      if (h.endIdx !== -1) {
        const rowWithDate = subtaskRows.find((r) => (r[h.endIdx] || "").trim());
        if (rowWithDate) {
          taskDeadline = parseSpreadsheetDate(rowWithDate[h.endIdx], detectedSprintCutoff);
        }
      }

      // 2. Tasks (Project column in sheet)
      // Check within same category project first
      let existingTask = existingTasks.find(
        (t) => !claimedTaskIds.has(t.id) && t.project_id === projectId && normalizeTitle(t.title) === normalizeTitle(projectName)
      );

      // Fallback: cross-category search in the same sprint (category was shifted)
      if (!existingTask) {
        const candidate = existingTasks.find(
          (t) => !claimedTaskIds.has(t.id) && normalizeTitle(t.title) === normalizeTitle(projectName)
        );
        if (candidate) {
          existingTask = candidate;
        }
      }

      if (existingTask) {
        claimedTaskIds.add(existingTask.id);
        taskId = existingTask.id;
        const shouldUpdateTask = !selectedUpdatedTaskIds || selectedUpdatedTaskIds.includes(taskId);
        if (shouldUpdateTask) {
          // Update project_id to move task if category shifted, along with PIC, priority, and deadline
          batchStatements.push({
            sql: "UPDATE tasks SET project_id = ?, pic_name = ?, priority = ?, deadline = ?, lead_id = COALESCE(?, lead_id), updated_at = ? WHERE id = ?",
            args: [projectId, pic, priority, taskDeadline, leadId, now, taskId],
          });
          existingTask.project_id = projectId;
          tasksUpdated++;
        }
      } else {
        const newTaskKey = `new_task:${categoryName}:::${projectName}`;
        const shouldCreateTask = !selectedNewTaskKeys || selectedNewTaskKeys.includes(newTaskKey);
        if (!shouldCreateTask) {
          skippedItemsCount++;
          continue; // User skipped this new task
        }

        taskId = crypto.randomUUID();
        claimedTaskIds.add(taskId);
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
          args: [taskId, currentTicketId, projectName, `Task proyek ${projectName} di bawah kategori ${categoryName}`, "todo", priority, pic, leadId, projectId, 0, taskDeadline, now, now],
        });
        tasksCreated++;
        addedNewTasks.push({
          key: newTaskKey,
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
        const subKey = `${normalizeTitle(subtaskTitle)}__${workload}`;
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

        // Check if subtask exists under taskId first
        let existingSubtask = existingSubtasks.find(
          (s) => !matchedSubtaskIds.has(s.id) &&
                 s.task_id === taskId &&
                 normalizeTitle(s.title) === normalizeTitle(subtaskTitle) &&
                 s.workload_hours === workload
        );
        if (!existingSubtask) {
          existingSubtask = existingSubtasks.find(
            (s) => !matchedSubtaskIds.has(s.id) &&
                   s.task_id === taskId &&
                   normalizeTitle(s.title) === normalizeTitle(subtaskTitle)
          );
        }

        // Fallback: cross-task search in this sprint if non-generic
        const isGeneric = ["review", "support", "discuss & brainstorming", "showing mockup", "qa", "testing"].includes(
          normalizeTitle(subtaskTitle)
        );
        if (!existingSubtask && !isGeneric) {
          existingSubtask = existingSubtasks.find(
            (s) => !matchedSubtaskIds.has(s.id) &&
                   normalizeTitle(s.title) === normalizeTitle(subtaskTitle) &&
                   s.workload_hours === workload
          );
          if (!existingSubtask) {
            existingSubtask = existingSubtasks.find(
              (s) => !matchedSubtaskIds.has(s.id) &&
                     normalizeTitle(s.title) === normalizeTitle(subtaskTitle)
            );
          }
        }

        let subtaskId: string;

        if (existingSubtask) {
          subtaskId = existingSubtask.id;
          matchedSubtaskIds.add(subtaskId);
          const currentStatus = existingSubtask.status;

          const shouldUpdateSubtask = !selectedUpdatedSubtaskIds || selectedUpdatedSubtaskIds.includes(subtaskId);

          if (!shouldUpdateSubtask) {
            // User unselected this update: preserve without changing workload or description, but maintain parent task link if shifted
            subtasksPreserved++;
            if (existingSubtask.task_id !== taskId) {
              batchStatements.push({
                sql: "UPDATE subtasks SET task_id = ?, updated_at = ? WHERE id = ?",
                args: [taskId, now, existingSubtask.id],
              });
            }
          } else if (currentStatus === "in_progress" || currentStatus === "review" || currentStatus === "done") {
            subtasksPreserved++;
            batchStatements.push({
              sql: "UPDATE subtasks SET task_id = ?, description = ?, goals = ?, workload_hours = ?, updated_at = ? WHERE id = ?",
              args: [taskId, description || null, featureGoal || null, workload, now, existingSubtask.id],
            });
          } else if (anyDone) {
            batchStatements.push({
              sql: "UPDATE subtasks SET task_id = ?, done = 1, status = 'done', workload_hours = ?, updated_at = ? WHERE id = ?",
              args: [taskId, workload, now, existingSubtask.id],
            });
            subtasksUpdated++;
          } else {
            batchStatements.push({
              sql: "UPDATE subtasks SET task_id = ?, description = ?, goals = ?, workload_hours = ?, updated_at = ? WHERE id = ?",
              args: [taskId, description || null, featureGoal || null, workload, now, existingSubtask.id],
            });
            subtasksUpdated++;
          }
        } else {
          const newSubKey = `new_subtask:${categoryName}:::${projectName}:::${subtaskTitle}:::${workload}`;
          const shouldCreateSubtask = !selectedNewSubtaskKeys || selectedNewSubtaskKeys.includes(newSubKey);
          if (!shouldCreateSubtask) {
            skippedItemsCount++;
            continue; // Skip creating this new subtask
          }

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
            key: newSubKey,
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
        const targetStaffIds: string[] = [];
        const assigneeList: { id: string; name: string }[] = [];

        for (const sr of rowsInSubtask) {
          const rawBobot = (sr[h.hIdx] || "").trim().replace(",", ".");
          const rowWorkload = isNaN(parseFloat(rawBobot)) ? 0 : parseFloat(rawBobot);
          totalWorkloadHours += rowWorkload;

          const contributorName = (sr[h.cIdx] || "").trim();
          if (contributorName) {
            const staffUserId = userMap.get(contributorName.toLowerCase());
            if (staffUserId && !targetStaffIds.includes(staffUserId)) {
              targetStaffIds.push(staffUserId);
              assigneeList.push({ id: staffUserId, name: contributorName });
            }
          }
        }

        const shouldSyncAssignees = !existingSubtask || (!selectedUpdatedSubtaskIds || selectedUpdatedSubtaskIds.includes(subtaskId));

        if (shouldSyncAssignees) {
          // Sync subtask_assignees to accurately reflect the spreadsheet contributors
          batchStatements.push({
            sql: "DELETE FROM subtask_assignees WHERE subtask_id = ?",
            args: [subtaskId],
          });

          for (const staffId of targetStaffIds) {
            batchStatements.push({
              sql: "INSERT INTO subtask_assignees (subtask_id, staff_id, assigned_at) VALUES (?, ?, ?)",
              args: [subtaskId, staffId, now],
            });
          }
        }

        if (anyDone && shouldSyncAssignees) {
          batchStatements.push({
            sql: "DELETE FROM time_contributions WHERE subtask_id = ?",
            args: [subtaskId],
          });
          for (const staffId of targetStaffIds) {
            batchStatements.push({
              sql: "INSERT INTO time_contributions (subtask_id, staff_id, hours) VALUES (?, ?, ?)",
              args: [subtaskId, staffId, workload],
            });
          }
        }

        if (!existingSubtask) {
          batchStatements.push({
            sql: `INSERT INTO staff_assignment_history (id, subtask_id, previous_assignees, new_assignees, changed_by, change_type, reason, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [crypto.randomUUID(), subtaskId, null, JSON.stringify(assigneeList.map((a) => a.name)), performedBy || "Sprint Sync Engine", "added", `Sinkronisasi otomatis ${sprintLabel}`, now],
          });

          const primaryStaffId = targetStaffIds[0] || userMap.get("arif")!;
          batchStatements.push({
            sql: `INSERT INTO activity_logs (id, subtask_id, task_id, user_id, action, timestamp, duration_hours, note)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [crypto.randomUUID(), subtaskId, taskId, primaryStaffId, anyDone ? "completed" : "created", now, anyDone ? workload : 0, `Subtask '${subtaskTitle}' disinkronkan dari Google Sheets`],
          });
        }
      }

      taskCounter++;
    }
  }

  // 4. Clean up any empty category projects in this sprint that have no tasks remaining
  batchStatements.push({
    sql: `DELETE FROM projects 
          WHERE (sprint = ? OR sprint = ? OR sprint = ?) 
            AND id NOT IN (SELECT DISTINCT project_id FROM tasks WHERE project_id IS NOT NULL)`,
    args: [sprintLabel, sprintIdentifier, numOnly],
  });

  // 5. Execute all batch statements in chunks of 50 to Turso/LibSQL client
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
    skippedItemsCount,
  };
}
