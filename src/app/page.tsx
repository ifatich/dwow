"use client";

import { useState, useEffect, useCallback } from "react";
import ProjectCard from "@/features/dashboard/components/project-card";
import StatCard from "@/features/dashboard/components/stat-card";
import DeadlineNotification from "@/components/shared/deadline-notification";
import ReviewTaskCard from "@/features/dashboard/components/review-task-card";
import TaskDistributionChart from "@/features/dashboard/components/task-distribution-chart";
import SprintVelocityChart from "@/features/dashboard/components/sprint-velocity-chart";
import WorkloadChart from "@/features/dashboard/components/workload-chart";
import LeadPerformanceCard from "@/features/dashboard/components/lead-performance-card";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useRealtimeSync } from "@/lib/realtime-sync";
import { DashboardSkeleton } from "@/components/shared/skeletons";
import SprintSyncDialog from "@/features/sprint-sync/components/sprint-sync-dialog";

interface DashboardData {
  activeSprint?: string;
  stats: { totalTasks: number; inProgressCount: number; overdueCount: number; doneCount: number };
  projects: { id: string; name: string; description: string; goals: string; dod: string; sprint: string; lead: string; totalTasks: number; doneTasks: number; totalHours: number }[];
  reviewTasks: { id: string; ticketId: string; title: string; status: string; priority: string; picName: string; lead: string; project: string; projectId: string; deadline: string; subtaskDone: number; subtaskTotal: number }[];
  statusDistribution: Record<string, number>;
  workload: { username: string; name: string; hours: number; capacity: number }[];
  leadsPerformance?: any[];
}

export default function Home() {
  const currentUser = useCurrentUser();
  const role = currentUser?.role ?? "staff";
  const username = currentUser?.username;

  const isReviewer = role === "lead" || role === "kadep" || role === "super_admin" || role === "kadiv";
  const isAdmin = role === "super_admin";
  const isExecutive = role === "super_admin" || role === "kadep" || role === "kadiv";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const fetchDashboardData = useCallback(() => {
    const params = new URLSearchParams({ role, username: username || "" });
    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("/api/settings/spreadsheet")
      .then((r) => r.json())
      .then((d) => { if (d.lastSyncAt) setLastSync(d.lastSyncAt); })
      .catch(() => {});
  }, [role, username]);

  useRealtimeSync(fetchDashboardData, 5000);

  if (!data) {
    return (
      <div className="flex flex-col flex-1">
        <PageHeader middle={<span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/30 bg-surface-soft rounded-pill px-sm py-xxs">Dashboard</span>}><HeaderAvatar /></PageHeader>
        <main className="flex-1"><DashboardSkeleton /></main>
      </div>
    );
  }

  const stats = data.stats || { totalTasks: 0, inProgressCount: 0, overdueCount: 0, doneCount: 0, unassignedSubtasksCount: 0 };
  const projects = data.projects || [];
  const reviewTasks = data.reviewTasks || [];
  const workload = data.workload || [];
  const userTasksForDeadline = reviewTasks as any[];

  return (
    <div className="flex flex-col flex-1">
      {/* ========================================================================
       * Header Dashboard: Badge Sprint, Navigasi, Notifikasi, & User Avatar
       * ======================================================================== */}
      <PageHeader
        middle={
          <div suppressHydrationWarning className="flex items-center gap-md">
            <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/30 bg-surface-soft rounded-pill px-sm py-xxs">Dashboard</span>
            {data?.activeSprint && (
              <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-green-700 bg-green-100 rounded-pill px-sm py-xxs">{data.activeSprint}</span>
            )}
          </div>
        }
      >
        <DeadlineNotification tasks={userTasksForDeadline} />
        <HeaderAvatar />
      </PageHeader>

      <main className="flex-1" id="main-content">
        <div className="max-w-[1280px] mx-auto px-xl py-xxl">
          <div className="flex items-center justify-between gap-md mb-md flex-wrap">
            {lastSync ? (
              <div className="flex items-center gap-sm">
                <span className="text-[11px] font-[480] text-ink/30 uppercase tracking-[0.5px]">Sinkron Spreadsheet</span>
                <span className="text-[11px] font-mono text-ink/45 bg-surface-soft rounded-pill px-sm py-xxs">{new Date(lastSync).toLocaleString("id-ID")}</span>
              </div>
            ) : <div />}

            {isReviewer && (
              <button
                type="button"
                onClick={() => setSyncDialogOpen(true)}
                className="h-[32px] px-md rounded-pill border border-hairline bg-surface-soft hover:bg-hairline text-[12px] font-[540] text-ink transition-colors flex items-center gap-xs cursor-pointer shadow-xs"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Sinkronisasi Sprint</span>
              </button>
            )}
          </div>

          {/* Mode Pengawasan Eksekutif (Manajerial Overview) */}
          {isExecutive && (
            <div className="flex items-center justify-between gap-md mb-lg p-md rounded-xl bg-blue-50/60 border border-blue-200/80 text-blue-900 shadow-xs">
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0 shadow-xs">
                  👁️
                </div>
                <div>
                  <h4 className="text-[13px] font-[600]">Mode Pengawasan Eksekutif ({role.toUpperCase()})</h4>
                  <p className="text-[11px] text-blue-700/80">
                    Menampilkan ringkasan data agregat seluruh tim & departemen untuk pengawasan manajerial.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.5px] bg-blue-100/80 text-blue-800 rounded-pill px-md py-xxs font-[550] border border-blue-200 flex-shrink-0">
                Agregat Organisasi
              </span>
            </div>
          )}

          {/* Peringatan Subtask Belum Ditugaskan (Unassigned Subtasks) */}
          {(stats as any).unassignedSubtasksCount > 0 && isReviewer && (
            <div className="flex items-center justify-between gap-md mb-lg p-md rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 shadow-xs">
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0">
                  ⚠️
                </div>
                <div>
                  <h4 className="text-[13px] font-[600]">Peringatan Subtask Belum Ditugaskan</h4>
                  <p className="text-[11px] text-amber-700/90">
                    Terdapat <span className="font-[600] text-amber-900">{(stats as any).unassignedSubtasksCount} subtask</span> di Sprint ini yang belum memiliki eksekutor (staffId).
                  </p>
                </div>
              </div>
              <a
                href="/sprint-history"
                className="text-[11px] font-[550] text-amber-800 bg-amber-100 hover:bg-amber-200/80 px-md py-xs rounded-lg transition-colors border border-amber-300/60 flex-shrink-0"
              >
                Tinjau Subtask →
              </a>
            </div>
          )}

          {/* ========================================================================
           * Section 1: Executive Stat Cards (Total Tugas, In Progress, Overdue, Selesai)
           * ======================================================================== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-xxl stat-card-grid">
            <StatCard label="Total Tugas" value={stats.totalTasks} accent="default" subtitle={`${stats.doneCount} selesai`} />
            <StatCard label="In Progress" value={stats.inProgressCount} accent="blue" subtitle="Sedang dikerjakan" />
            <StatCard label="Overdue" value={stats.overdueCount} accent="red" subtitle="Melewati tenggat" />
            <StatCard label="Selesai" value={stats.doneCount} accent="green" subtitle={`${stats.totalTasks > 0 ? Math.round((stats.doneCount / stats.totalTasks) * 100) : 0}% completion`} />
          </div>

          {/* ========================================================================
           * Section 3A: Chart Distribusi Status & Section 3B: Chart Velocity Sprint
           * ======================================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-xxl">
            {/* Section 3A: Chart Distribusi Status */}
            <TaskDistributionChart tasks={(data.statusDistribution || {}) as any} />
            {/* Section 3B: Chart Velocity Sprint */}
            <SprintVelocityChart data={(data as any).velocity} />
          </div>

          {/* ========================================================================
           * Section 4B: Performa Lead Proyek & Beban Kerja Tim (Di atas Proyek Aktif)
           * ======================================================================== */}
          <LeadPerformanceCard leads={(data as any).leadsPerformance || []} />

          {/* ========================================================================
           * Section 2: Daftar Proyek ("Proyek Saya" untuk Staff / "Proyek Aktif" untuk Lead/Admin)
           * ======================================================================== */}
          <div className="mb-xxl">
            <h2 className="text-[24px] font-[540] text-ink mb-lg">
              {role === "staff" ? "Proyek Saya" : "Proyek Aktif"}
            </h2>
            {projects.length === 0 ? (
              <div className="text-[13px] text-ink/30 py-xxl text-center bg-surface-soft/30 rounded-lg border border-hairline">
                Belum ada proyek dengan tugas untuk Anda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md items-start">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={{ id: p.id, name: p.name, description: p.description, goals: p.goals, dod: p.dod, sprint: p.sprint, lead: p.lead, totalTasks: p.totalTasks, doneTasks: p.doneTasks, reviewTasks: (p as any).reviewTasks, inProgressTasks: (p as any).inProgressTasks, todoTasks: (p as any).todoTasks } as any} userTaskCount={role === "staff" ? (p as any).userTaskCount : undefined} isLeadProject={(p as any).isLeadProject} />
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================
           * Section 4: Chart Beban Kerja (Per Staff — Hanya untuk non-Executive)
           * ======================================================================== */}
          {!isExecutive && (
            <div className="mb-xxl">
              <WorkloadChart tasks={workload as any} currentUser={role === "staff" ? currentUser?.username : undefined} />
            </div>
          )}

          {/* ========================================================================
           * Section 5: Daftar Perlu Review (Khusus Role Lead Proyek)
           * ======================================================================== */}
          {reviewTasks.length > 0 && role === "lead" && (
            <div className="mt-xxl">
              <h2 className="text-[20px] font-[540] text-ink mb-md">Perlu Review</h2>
              <div className="space-y-sm">
                {reviewTasks.map((t) => (
                  <ReviewTaskCard key={t.id} task={t as any} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dialog Sinkronisasi Sprint Google Sheets */}
      <SprintSyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
}
