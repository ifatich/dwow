import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const sqlite = new Database("taskforge.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const pickN = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
const iso = (d: Date) => d.toISOString().split("T")[0];
const STATUSES: string[] = ["todo", "in-progress", "review", "done"];
const SUBTASK_STATUSES: string[] = ["to_do", "in_progress", "review", "done"];
const PRIORITIES: string[] = ["low", "medium", "high", "urgent"];

const PROJECT_TEMPLATES: Record<string, string[]> = {
  thoriq: ["Migrasi database ", "Optimasi query ", "Setup CI/CD ", "Integrasi payment ", "Autentikasi SSO ", "API gateway ", "Refactor service ", "Monitoring & alerting ", "Backup & DR ", "Load testing ", "Security audit ", "Containerization ", "Microservices ", "Message queue ", "Caching layer "],
  nabila: ["Redesign halaman ", "UI component library ", "Design system ", "Responsive layout ", "Accessibility audit ", "Animation ", "Onboarding flow ", "Dark mode ", "Search experience ", "Notification center ", "Dashboard redesign ", "Form validation ", "Mobile-first ", "Design tokens ", "User feedback "],
  rizky: ["Data pipeline ", "Analytics dashboard ", "ML model ", "Report generator ", "Data warehouse ", "ETL process ", "A/B testing ", "Customer segmentation ", "Predictive analytics ", "Data visualization ", "Real-time analytics ", "Data quality ", "BI integration ", "KPI tracker ", "Anomaly detection "],
};
const SUFFIXES = ["modul utama", "sprint ini", "fase 1", "POC", "migrasi", "enhancement", "v2", "stabilisasi", "MVP", "scale-up", "optimasi", "refactor", "pilot", "rollout", "maintenance"];

type Role = "staff" | "lead" | "kadep" | "kadiv" | "super_admin";
interface US { id: string; nama: string; username: string; passwordHash: string; role: Role; capacityHoursPerMonth: number; leaveDays?: number; department?: string; }

async function seed() {
  console.log("🌱 Seeding database...\n");
  
  // Clear existing data
  console.log("  Menghapus data lama...");
  await db.delete(schema.activityLogs).run();
  await db.delete(schema.timeContributions).run();
  await db.delete(schema.revisionNotes).run();
  await db.delete(schema.subtaskAssignees).run();
  await db.delete(schema.subtasks).run();
  await db.delete(schema.tasks).run();
  await db.delete(schema.projects).run();
  await db.delete(schema.users).run();

  const now = new Date().toISOString();
  const adminHash = await bcrypt.hash("admin123", 10);
  const leadHash = await bcrypt.hash("lead123", 10);
  const staffHash = await bcrypt.hash("staff123", 10);

  const userSeeds: US[] = [
    { id: crypto.randomUUID(), nama: "Administrator", username: "admin", passwordHash: adminHash, role: "super_admin", capacityHoursPerMonth: 160, leaveDays: 0, department: "IT" },
    { id: crypto.randomUUID(), nama: "Dr. Hendra Wijaya", username: "kadiv", passwordHash: leadHash, role: "kadiv", capacityHoursPerMonth: 160, leaveDays: 0, department: "IT" },
    { id: crypto.randomUUID(), nama: "Maya Suryani", username: "kadep", passwordHash: leadHash, role: "kadep", capacityHoursPerMonth: 160, leaveDays: 0, department: "IT" },
    { id: crypto.randomUUID(), nama: "Thoriq Akbar", username: "thoriq", passwordHash: leadHash, role: "lead", capacityHoursPerMonth: 160, leaveDays: 0, department: "IT" },
    { id: crypto.randomUUID(), nama: "Nabila Putri", username: "nabila", passwordHash: leadHash, role: "lead", capacityHoursPerMonth: 160, leaveDays: 1, department: "IT" },
    { id: crypto.randomUUID(), nama: "Rizky Pratama", username: "rizky", passwordHash: leadHash, role: "lead", capacityHoursPerMonth: 160, leaveDays: 0, department: "IT" },
    { id: crypto.randomUUID(), nama: "Ariana Dewi", username: "ariana", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 0 },
    { id: crypto.randomUUID(), nama: "Budi Santoso", username: "budi", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 2.5 },
    { id: crypto.randomUUID(), nama: "Citra Lestari", username: "citra", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 0 },
    { id: crypto.randomUUID(), nama: "Dian Permana", username: "dian", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 5 },
    { id: crypto.randomUUID(), nama: "Eko Cahyono", username: "eko", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 7.5 },
    { id: crypto.randomUUID(), nama: "Fani Maulana", username: "fani", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 0 },
    { id: crypto.randomUUID(), nama: "Gina Amelia", username: "gina", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 2.5 },
    { id: crypto.randomUUID(), nama: "Hadi Gunawan", username: "hadi", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 10 },
    { id: crypto.randomUUID(), nama: "Indra Wijaya", username: "indra", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 0 },
    { id: crypto.randomUUID(), nama: "Joko Susilo", username: "joko", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 3.75 },
    { id: crypto.randomUUID(), nama: "Kartika Sari", username: "kartika", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 0 },
    { id: crypto.randomUUID(), nama: "Lisa Anggraini", username: "lisa", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 2.5 },
    { id: crypto.randomUUID(), nama: "Mario Gundala", username: "mario", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 1.25 },
    { id: crypto.randomUUID(), nama: "Nova Safitri", username: "nova", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 5 },
    { id: crypto.randomUUID(), nama: "Oka Prasetyo", username: "oka", passwordHash: staffHash, role: "staff", capacityHoursPerMonth: 160, leaveDays: 7.5 },
  ];

  for (const u of userSeeds) {
    await db.insert(schema.users).values({ ...u, createdAt: now, updatedAt: now }).run();
  }
  console.log(`  ✅ ${userSeeds.length} users`);

  const usernames = new Map(userSeeds.map(u => [u.username, u]));
  const getU = (u: string) => usernames.get(u)!;
  const leadTeams: Record<string, string[]> = {
    thoriq: ["ariana","budi","citra","dian","eko"],
    nabila: ["fani","gina","hadi","indra","joko"],
    rizky: ["kartika","lisa","mario","nova","oka"],
  };

  // Generate projects: 10 sprints × 10-15
  const allProjects: { id: string; title: string; description: string; sprint: string; leadUsername: string; goals: string; dod: string }[] = [];
  for (let sprint = 1; sprint <= 10; sprint++) {
    const count = rand(10, 15);
    for (let p = 0; p < count; p++) {
      const lead = pick(["thoriq","nabila","rizky"]);
      const tpl = PROJECT_TEMPLATES[lead];
      const title = pick(tpl) + pick(SUFFIXES);
      allProjects.push({
        id: crypto.randomUUID(),
        title,
        description: `${title} — Sprint ${sprint}, lead: ${lead}.`,
        sprint: `Sprint ${sprint}`,
        leadUsername: lead,
        goals: `Selesaikan ${title} dengan 90%+ test coverage`,
        dod: "Semua task Done, Lead approval",
      });
    }
  }

  for (const p of allProjects) {
    const lu = getU(p.leadUsername);
    await db.insert(schema.projects).values({
      id: p.id, title: p.title, description: p.description,
      goals: p.goals, dod: p.dod, sprint: p.sprint,
      leadId: lu.id, sprintCutoff: null, isArchived: false,
      createdAt: now, updatedAt: now,
    }).run();
  }
  console.log(`  ✅ ${allProjects.length} projects (${allProjects.length / 10} avg/sprint)`);

  const projectMap = new Map(allProjects.map(p => [p.title, p]));

  // Generate tasks per project
  let taskTotal = 0, subtaskTotal = 0, logTotal = 0, contribTotal = 0;
  for (const proj of allProjects) {
    const taskCount = rand(2, 5);
    const team = leadTeams[proj.leadUsername] || [];
    for (let t = 0; t < taskCount; t++) {
      taskTotal++;
      const picUsername = pick(team);
      const isDone = Math.random() < 0.35;
      const status = isDone ? "done" : pick(STATUSES.filter(s => s !== "done"));
      const priority = pick(PRIORITIES);
      const deadlineBase = isDone ? new Date(Date.now() - rand(1, 30) * 86400000) : new Date(Date.now() + rand(7, 30) * 86400000);

      const taskId = crypto.randomUUID();
      const ticketId = `T-${String(taskTotal).padStart(4,"0")}-${picUsername.toUpperCase()}`;
      const leadUser = getU(proj.leadUsername);

      const taskCreatedAt = new Date(Date.now() - rand(7, 60) * 86400000).toISOString();

      await db.insert(schema.tasks).values({
        id: taskId, ticketId,
        title: `${proj.title} — task ${t + 1}`,
        description: `Task ${t + 1} proyek ${proj.title}. PIC: ${picUsername}.`,
        goals: proj.goals, dod: proj.dod,
        status: status as any, priority: priority as any,
        picName: picUsername, leadId: leadUser.id, projectId: proj.id,
        totalActualHours: 0, deadline: iso(deadlineBase),
        createdAt: taskCreatedAt, updatedAt: now,
      }).run();

      // Log task_created
      await db.insert(schema.activityLogs).values({
        id: crypto.randomUUID(),
        subtaskId: null,
        taskId,
        userId: leadUser.id,
        action: "task_created",
        timestamp: taskCreatedAt,
        durationHours: 0,
        note: `Task "${proj.title} — task ${t + 1}" dibuat oleh ${proj.leadUsername}`,
      }).run();
      logTotal++;

      const subCount = rand(2, 6);
      for (let s = 0; s < subCount; s++) {
        subtaskTotal++;
        const sDone = status === "done" ? true : Math.random() < 0.3;
        const sStatus = sDone ? "done" : pick(SUBTASK_STATUSES.filter(x => x !== "done"));
        const assignees = pickN(team, rand(1, 2));
        const subId = crypto.randomUUID();

        const subCreatedAt = new Date(new Date(taskCreatedAt).getTime() + rand(1, 3) * 86400000).toISOString();

        await db.insert(schema.subtasks).values({
          id: subId, taskId, title: `${proj.title} — subtask ${s + 1}`,
          description: `Deskripsi pengerjaan subtask ${s + 1} untuk proyek ${proj.title}.`,
          goals: `Target subtask ${s + 1}: menyelesaikan modul & integrasi terkait ${proj.title}.`,
          dod: `Kode bersih, tidak ada lint error, lolos review Lead.`,
          evidence: sStatus === "done" || sStatus === "review" ? `Bukti pengerjaan subtask ${s + 1}: PR #10${s + 1} approved` : null,
          done: sStatus === "done", status: sStatus as any,
          workloadHours: rand(2, 16), createdAt: subCreatedAt, updatedAt: now,
        }).run();

        for (const an of assignees) {
          const au = getU(an);
          if (au) {
            await db.insert(schema.subtaskAssignees).values({
              subtaskId: subId, staffId: au.id, assignedAt: subCreatedAt,
            }).run();
          }
        }

        // ── Generate activity logs per subtask ──
        const primaryAssignee = getU(assignees[0]);
        if (primaryAssignee) {
          // Log: created
          await db.insert(schema.activityLogs).values({
            id: crypto.randomUUID(),
            subtaskId: subId, taskId,
            userId: primaryAssignee.id,
            action: "created",
            timestamp: subCreatedAt,
            durationHours: 0,
            note: `Subtask dibuat`,
          }).run();
          logTotal++;

          // Log: started (jika in_progress, review, atau done)
          if (sStatus !== "to_do") {
            const startedAt = new Date(new Date(subCreatedAt).getTime() + rand(1, 5) * 3600000).toISOString();
            await db.insert(schema.activityLogs).values({
              id: crypto.randomUUID(),
              subtaskId: subId, taskId,
              userId: primaryAssignee.id,
              action: "started",
              timestamp: startedAt,
              durationHours: 0,
              durationCategory: "work",
              note: `Mulai mengerjakan subtask`,
            }).run();
            logTotal++;

            // Log: review_requested (jika review atau done)
            if (sStatus === "review" || sStatus === "done") {
              const workHours = rand(2, 12);
              const reviewAt = new Date(new Date(startedAt).getTime() + workHours * 3600000).toISOString();
              await db.insert(schema.activityLogs).values({
                id: crypto.randomUUID(),
                subtaskId: subId, taskId,
                userId: primaryAssignee.id,
                action: "review_requested",
                timestamp: reviewAt,
                durationHours: workHours,
                durationCategory: "work",
                durationSeconds: workHours * 3600,
                note: `Selesai dikerjakan (${workHours}h), menunggu review`,
              }).run();
              logTotal++;

              // Log: approved (jika done)
              if (sStatus === "done") {
                const approvedAt = new Date(new Date(reviewAt).getTime() + rand(2, 24) * 3600000).toISOString();
                await db.insert(schema.activityLogs).values({
                  id: crypto.randomUUID(),
                  subtaskId: subId, taskId,
                  userId: leadUser.id,
                  action: "approved",
                  timestamp: approvedAt,
                  durationHours: 0,
                  durationCategory: "wait_review",
                  note: `Disetujui oleh Lead ${proj.leadUsername}`,
                }).run();
                logTotal++;

                // Time contribution
                for (const an of assignees) {
                  const au = getU(an);
                  if (au) {
                    const hours = rand(1, workHours);
                    await db.insert(schema.timeContributions).values({
                      subtaskId: subId, staffId: au.id, hours,
                    }).run();
                    contribTotal++;
                  }
                }
              }
            }
          }
        }
      }

      // Sync parent task status in DB based on subtasks
      const taskSubs = await db.select().from(schema.subtasks).where(eq(schema.subtasks.taskId, taskId));
      const allDone = taskSubs.length > 0 && taskSubs.every((s) => s.status === "done" || s.done);
      const anyStarted = taskSubs.some((s) => s.status !== "to_do");
      const derivedStatus = allDone ? "done" : anyStarted ? "in-progress" : "todo";
      await db.update(schema.tasks).set({ status: derivedStatus as any }).where(eq(schema.tasks.id, taskId)).run();
    }
  }
  console.log(`  ✅ ${taskTotal} tasks, ${subtaskTotal} subtasks`);
  console.log(`  ✅ ${logTotal} activity logs, ${contribTotal} time contributions`);
  console.log("\n🎉 Seeding complete! Run: pnpm dev");
  sqlite.close();
}

seed().catch(err => { console.error("❌", err); sqlite.close(); process.exit(1); });

