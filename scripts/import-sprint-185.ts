import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";

/**
 * RFC 4180 compliant CSV parser.
 * Properly handles escaped quotes, quoted cells spanning multiple lines, and whitespace trimming.
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

async function importSprint185() {
  console.log("🚀 Memulai import data Sprint 185 dari Google Sheets (CSV):");
  console.log("   • Level 1 (Project) : Kolom 'Kategori Project'");
  console.log("   • Level 2 (Task)    : Kolom 'Project'");
  console.log("   • Level 3 (Subtask) : Kolom 'Task Detail'");
  console.log("   • Lead (3 orang)    : Arif, Cheppy, Ganda");
  console.log("   • Filter            : Exclude task jika Bobot = 0 & 'Notes / Files' = tentative\n");

  const db = new Database("taskforge.db");
  db.pragma("foreign_keys = OFF");

  // 1. Clear operational tables
  console.log("1. Mengosongkan data operasional lama...");
  const tables = [
    "activity_logs",
    "time_contributions",
    "revision_notes",
    "staff_assignment_history",
    "subtask_assignees",
    "subtasks",
    "tasks",
    "projects",
    "users",
  ];
  for (const t of tables) {
    try {
      db.prepare(`DELETE FROM ${t}`).run();
    } catch {}
  }

  // 2. Insert Users
  console.log("2. Menyimpan data pengguna (3 Lead: Arif, Cheppy, Ganda & 17 Staf)...");
  const adminHash = await bcrypt.hash("admin123", 10);
  const leadHash = await bcrypt.hash("lead123", 10);
  const staffHash = await bcrypt.hash("staff123", 10);

  const teamMembers = [
    // Executive & Management
    { username: "admin", nama: "Administrator", role: "super_admin", dept: "IT Executive", hash: adminHash },
    { username: "kadiv", nama: "Dr. Hendra Wijaya", role: "kadiv", dept: "Divisi Digital & IT", hash: leadHash },
    { username: "kadep", nama: "Maya Suryani", role: "kadep", dept: "Departemen UI/UX & Product", hash: leadHash },

    // The 3 Project Leads requested by user
    { username: "arif", nama: "Arif", role: "lead", dept: "UI/UX Design", hash: leadHash },
    { username: "cheppy", nama: "Cheppy", role: "lead", dept: "Digital Project", hash: leadHash },
    { username: "ganda", nama: "Ganda", role: "lead", dept: "Digital Project", hash: leadHash },

    // Staff Members
    { username: "nabila", nama: "Nabila", role: "staff", dept: "User Research", hash: staffHash },
    { username: "fatich", nama: "Fatich", role: "staff", dept: "Frontend Engineering", hash: staffHash },
    { username: "femmy", nama: "Femmy", role: "staff", dept: "UI/UX Design", hash: staffHash },
    { username: "sasa", nama: "Sasa", role: "staff", dept: "UI/UX Design", hash: staffHash },
    { username: "avi", nama: "Avi", role: "staff", dept: "UI/UX Design", hash: staffHash },
    { username: "vira", nama: "Vira", role: "staff", dept: "UI/UX Design", hash: staffHash },
    { username: "rizqi", nama: "Rizqi", role: "staff", dept: "UI/UX Design", hash: staffHash },
    { username: "yunita", nama: "Yunita", role: "staff", dept: "UI/UX Design", hash: staffHash },
    { username: "amanda", nama: "Amanda", role: "staff", dept: "UI/UX Design", hash: staffHash },
    { username: "nina", nama: "Nina", role: "staff", dept: "User Research", hash: staffHash },
    { username: "nando", nama: "Nando", role: "staff", dept: "User Research", hash: staffHash },
    { username: "indah", nama: "Indah", role: "staff", dept: "User Research", hash: staffHash },
    { username: "ailin", nama: "Ailin", role: "staff", dept: "User Research", hash: staffHash },
    { username: "aqmal", nama: "Aqmal", role: "staff", dept: "Creative & Illustration", hash: staffHash },
    { username: "rizal", nama: "Rizal", role: "staff", dept: "Creative & Illustration", hash: staffHash },
    { username: "adit", nama: "Adit", role: "staff", dept: "UI/UX Design", hash: staffHash },
    { username: "sharen", nama: "Sharen", role: "staff", dept: "UI/UX Design", hash: staffHash },
    { username: "bille", nama: "Bille", role: "staff", dept: "UI/UX Design", hash: staffHash },
  ];

  const userMap = new Map<string, string>(); // lowercase username/name -> userId
  const now = new Date().toISOString();

  const insertUserStmt = db.prepare(`
    INSERT INTO users (id, nama, username, password_hash, role, department, capacity_hours_per_month, leave_days, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 160, 0, ?, ?)
  `);

  for (const m of teamMembers) {
    const id = crypto.randomUUID();
    insertUserStmt.run(id, m.nama, m.username, m.hash, m.role, m.dept, now, now);
    userMap.set(m.username.toLowerCase(), id);
    userMap.set(m.nama.toLowerCase(), id);
  }
  console.log(`  ✓ ${teamMembers.length} akun pengguna berhasil disimpan.`);

  // 3. Read and parse CSV file
  console.log("3. Membaca file data-scrape.csv...");
  const content = fs.readFileSync("data-scrape.csv", "utf-8");
  const allRows = parseCSV(content);
  if (allRows.length === 0) {
    throw new Error("File data-scrape.csv kosong!");
  }

  const header = allRows[0];
  const rows = allRows.slice(1);

  const spIdx = header.indexOf("Sprint");
  const catIdx = header.indexOf("Kategori Project");
  const pIdx = header.indexOf("Project");
  const tIdx = header.indexOf("Task Detail");
  const fIdx = header.indexOf("Fitur");
  const pengIdx = header.indexOf("Pengerjaan");
  const prIdx = header.indexOf("Priority");
  const cIdx = header.indexOf("Kontributor");
  const hIdx = header.indexOf("Bobot (Jam)");
  const nIdx = header.indexOf("Notes / Files");
  const stIdx = header.indexOf("Status");

  // Filter Sprint 185 rows
  let totalRawS185 = 0;
  let excludedTentativeZero = 0;
  let excludedInvalidDetail = 0;

  const validS185Rows: string[][] = [];

  for (const r of rows) {
    if (r[spIdx] !== "185") continue;
    totalRawS185++;

    const categoryRaw = r[catIdx] || "";
    const projectRaw = r[pIdx] || "";
    const taskDetailRaw = r[tIdx] || "";

    if (!categoryRaw.trim() || !projectRaw.trim() || !taskDetailRaw.trim()) {
      excludedInvalidDetail++;
      continue;
    }

    const rawBobot = (r[hIdx] || "").trim().replace(",", ".");
    const workload = isNaN(parseFloat(rawBobot)) ? 0 : parseFloat(rawBobot);
    const notes = (r[nIdx] || "").trim().toLowerCase();

    // Rule: jika bobot jam kerja adalah 0 dan ada "Notes / Files" = tentative maka jangan import ke data sprint
    if (workload === 0 && notes.includes("tentative")) {
      excludedTentativeZero++;
      continue;
    }

    validS185Rows.push(r);
  }

  console.log(`  ✓ Total baris Sprint 185 mentah           : ${totalRawS185}`);
  console.log(`  ✓ Baris tentative 0 jam yang di-exclude   : ${excludedTentativeZero}`);
  if (excludedInvalidDetail > 0) {
    console.log(`  ✓ Baris tidak valid / detail kosong       : ${excludedInvalidDetail}`);
  }
  console.log(`  ✓ Total baris valid yang akan diimpor     : ${validS185Rows.length}`);

  // 4. Grouping: Kategori Project (Project) -> Project (Task) -> Task Detail (Subtask)
  const categoryMap = new Map<string, Map<string, string[][]>>();
  for (const r of validS185Rows) {
    const categoryName = r[catIdx].replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
    const projectName = r[pIdx].replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, new Map());
    }
    const taskMap = categoryMap.get(categoryName)!;
    if (!taskMap.has(projectName)) {
      taskMap.set(projectName, []);
    }
    taskMap.get(projectName)!.push(r);
  }

  // Prepared statements
  const insertProjectStmt = db.prepare(`
    INSERT INTO projects (id, title, description, sprint, lead_id, sprint_cutoff, is_archived, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

  const insertTaskStmt = db.prepare(`
    INSERT INTO tasks (id, ticket_id, title, description, status, priority, pic_name, lead_id, project_id, total_actual_hours, deadline, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubtaskStmt = db.prepare(`
    INSERT INTO subtasks (id, task_id, title, description, goals, done, status, workload_hours, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubtaskAssigneeStmt = db.prepare(`
    INSERT INTO subtask_assignees (subtask_id, staff_id, assigned_at)
    VALUES (?, ?, ?)
  `);

  const insertAssignmentHistoryStmt = db.prepare(`
    INSERT INTO staff_assignment_history (id, subtask_id, previous_assignees, new_assignees, changed_by, change_type, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertActivityLogStmt = db.prepare(`
    INSERT INTO activity_logs (id, subtask_id, task_id, user_id, action, timestamp, duration_hours, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTimeContribStmt = db.prepare(`
    INSERT INTO time_contributions (subtask_id, staff_id, hours)
    VALUES (?, ?, ?)
  `);

  // The 3 Leads: Arif, Cheppy, Ganda
  const theThreeLeads = ["arif", "cheppy", "ganda"];
  let catCounter = 0;
  let totalTasksInserted = 0;
  let totalSubtasksInserted = 0;
  let totalWorkloadHours = 0;

  const hoursByPerson: Record<string, number> = {};

  for (const [categoryName, taskMap] of categoryMap.entries()) {
    const projectId = crypto.randomUUID();
    const assignedLeadUsername = theThreeLeads[catCounter % theThreeLeads.length];
    const leadId = userMap.get(assignedLeadUsername) || null;
    const catCode = categoryName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PROJ";

    // Level 1: Project (Kategori Project)
    insertProjectStmt.run(
      projectId,
      categoryName,
      `Kategori Project: ${categoryName} — Sprint 185`,
      "Sprint 185",
      leadId,
      "2026-09-18T23:59:59.000Z",
      "2026-09-04T00:00:00.000Z",
      "2026-09-18T00:00:00.000Z"
    );

    let taskCounter = 1;
    for (const [projectName, subtaskRows] of taskMap.entries()) {
      const taskId = crypto.randomUUID();
      const firstRow = subtaskRows[0];
      const pic = firstRow[cIdx] || "Tim";
      const priorityRaw = (firstRow[prIdx] || "medium").toLowerCase();
      const priority = ["low", "medium", "high", "urgent"].includes(priorityRaw) ? priorityRaw : "medium";
      const ticketId = `S185-${catCode}-${String(taskCounter).padStart(2, "0")}`;

      // Calculate task total workload and actual hours
      let taskTotalActual = 0;
      for (const sr of subtaskRows) {
        const rawBobot = (sr[hIdx] || "").trim().replace(",", ".");
        const workload = isNaN(parseFloat(rawBobot)) ? 0 : parseFloat(rawBobot);
        const statusRaw = (sr[stIdx] || "to_do").toLowerCase();
        if (statusRaw === "done") {
          taskTotalActual += workload;
        }
      }

      // Level 2: Task (Project column)
      insertTaskStmt.run(
        taskId,
        ticketId,
        projectName,
        `Task proyek ${projectName} di bawah kategori ${categoryName}`,
        taskTotalActual > 0 ? "in-progress" : "todo",
        priority,
        pic,
        leadId,
        projectId,
        taskTotalActual,
        "2026-09-18T18:00:00.000Z",
        now,
        now
      );
      totalTasksInserted++;

      // Level 3: Subtask (Task Detail)
      for (const sr of subtaskRows) {
        const subtaskId = crypto.randomUUID();
        const rawSubtaskTitle = sr[tIdx] || projectName;
        const subtaskTitle = rawSubtaskTitle.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();

        // Exact Bobot (Jam) from spreadsheet
        const rawBobot = (sr[hIdx] || "").trim().replace(",", ".");
        const workload = isNaN(parseFloat(rawBobot)) ? 0 : parseFloat(rawBobot);
        totalWorkloadHours += workload;

        const contributorName = sr[cIdx] || "Staff";
        const staffUserId = userMap.get(contributorName.toLowerCase()) || userMap.get("sasa")!;
        hoursByPerson[contributorName] = (hoursByPerson[contributorName] || 0) + workload;

        const statusRaw = (sr[stIdx] || "to_do").toLowerCase();
        const isDone = statusRaw === "done";
        const subtaskStatus = isDone ? "done" : "to_do";

        const descParts: string[] = [];
        if (sr[pengIdx] && sr[pengIdx].trim()) descParts.push(`Pengerjaan: ${sr[pengIdx].trim()}`);
        if (sr[fIdx] && sr[fIdx].trim()) descParts.push(`Fitur: ${sr[fIdx].trim()}`);
        if (sr[nIdx] && sr[nIdx].trim()) descParts.push(`Notes: ${sr[nIdx].trim()}`);
        const description = descParts.length > 0 ? descParts.join("\n") : undefined;

        insertSubtaskStmt.run(
          subtaskId,
          taskId,
          subtaskTitle,
          description,
          sr[fIdx] ? `Fitur: ${sr[fIdx].trim()}` : undefined,
          isDone ? 1 : 0,
          subtaskStatus,
          workload,
          now,
          now
        );

        // Subtask assignee
        insertSubtaskAssigneeStmt.run(subtaskId, staffUserId, now);

        // Staff assignment history (Audit Trail)
        insertAssignmentHistoryStmt.run(
          crypto.randomUUID(),
          subtaskId,
          null,
          JSON.stringify([contributorName]),
          "System (Import Sprint 185)",
          "added",
          "Penugasan awal dari spreadsheet",
          now
        );

        // Activity log
        insertActivityLogStmt.run(
          crypto.randomUUID(),
          subtaskId,
          taskId,
          staffUserId,
          isDone ? "completed" : "created",
          now,
          isDone ? workload : 0,
          `Subtask '${subtaskTitle}' ditugaskan ke ${contributorName}`
        );

        // Time contribution
        if (isDone) {
          insertTimeContribStmt.run(subtaskId, staffUserId, workload);
        }

        totalSubtasksInserted++;
      }

      taskCounter++;
    }

    catCounter++;
  }

  db.pragma("foreign_keys = ON");
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.prepare("VACUUM").run();
  db.close();

  console.log(`\n🎉 SELESAI! Data berhasil diimpor dengan data bobot jam kerja yang akurat:`);
  console.log(`  • Level 1 (Projects)  : ${categoryMap.size} Kategori Proyek`);
  console.log(`  • Level 2 (Tasks)     : ${totalTasksInserted} Tasks (dari kolom Project)`);
  console.log(`  • Level 3 (Subtasks)  : ${totalSubtasksInserted} Subtasks (dari kolom Task Detail)`);
  console.log(`  • Total Bobot Jam     : ${totalWorkloadHours} Jam`);
  console.log(`  • Project Leads       : 3 orang (Arif, Cheppy, Ganda)`);
  console.log(`  • Staff Members       : 18 orang`);

  console.log("\n📊 Distribusi Jam Kerja per Kontributor:");
  const sortedContributors = Object.entries(hoursByPerson).sort((a, b) => b[1] - a[1]);
  for (const [person, hours] of sortedContributors) {
    console.log(`   - ${person.padEnd(12)}: ${hours} jam`);
  }
}

export { importSprint185 };

if (process.argv[1] && process.argv[1].includes("import-sprint-185")) {
  importSprint185().catch((err) => {
    console.error("❌ Error importing Sprint 185:", err);
    process.exit(1);
  });
}

