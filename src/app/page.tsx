"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import ProjectCard from "@/features/dashboard/components/project-card";
import StatCard from "@/features/dashboard/components/stat-card";
import DeadlineNotification from "@/components/shared/deadline-notification";
import ReviewTaskCard from "@/features/dashboard/components/review-task-card";
import LeadPerformanceCard from "@/features/dashboard/components/lead-performance-card";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useRealtimeSync } from "@/lib/realtime-sync";
import {
  StatCardsSkeleton,
  ChartsGridSkeleton,
  LeadPerformanceSkeleton,
  ProjectGridSkeleton,
} from "@/components/shared/skeletons";
import SprintSyncDialog from "@/features/sprint-sync/components/sprint-sync-dialog";
import WhatsNewSection from "@/features/dashboard/components/whats-new-section";
import { useDashboardVisibility } from "@/features/dashboard/hooks/use-dashboard-visibility";
import type { DashboardSectionKey } from "@/features/dashboard/types/visibility-types";
import SectionSettingsModal from "@/features/dashboard/components/section-settings-modal";
import SectionSettingsButton from "@/features/dashboard/components/section-settings-button";
import SectionHiddenPlaceholder from "@/features/dashboard/components/section-hidden-placeholder";

const TaskDistributionChart = dynamic(
  () => import("@/features/dashboard/components/task-distribution-chart"),
  { ssr: false, loading: () => <div className="bg-canvas border border-hairline rounded-lg p-lg h-[260px] animate-pulse shadow-xs" /> }
);
const SprintVelocityChart = dynamic(
  () => import("@/features/dashboard/components/sprint-velocity-chart"),
  { ssr: false, loading: () => <div className="bg-canvas border border-hairline rounded-lg p-lg h-[260px] animate-pulse shadow-xs" /> }
);
const WorkloadChart = dynamic(
  () => import("@/features/dashboard/components/workload-chart"),
  { ssr: false, loading: () => <div className="bg-canvas border border-hairline rounded-lg p-lg h-[280px] animate-pulse shadow-xs" /> }
);

interface DashboardData {
  activeSprint?: string;
  stats: { totalTasks: number; inProgressCount: number; overdueCount: number; doneCount: number };
  projects: { id: string; name: string; description: string; goals: string; dod: string; sprint: string; lead: string; totalTasks: number; doneTasks: number; totalHours: number }[];
  tasks?: { id: string; ticketId: string; title: string; status: string; priority: string; deadline?: string; project?: string; projectId?: string }[];
  reviewTasks: { id: string; ticketId: string; title: string; status: string; priority: string; picName: string; lead: string; project: string; projectId: string; deadline: string; subtaskDone: number; subtaskTotal: number; reviewSubtasksCount?: number }[];
  statusDistribution: Record<string, number>;
  workload: { username: string; name: string; hours: number; capacity: number }[];
  leadsPerformance?: any[];
}

export default function Home() {
  const currentUser = useCurrentUser();
  const role = currentUser?.role ?? "staff";
  const username = currentUser?.username;

  const isReviewer = role === "lead" || role === "kadep" || role === "super_admin" || role === "kadiv";
  const isExecutive = role === "super_admin" || role === "kadep" || role === "kadiv";
  const { visibility, isSectionVisibleForRole, updateSectionVisibility, mounted } = useDashboardVisibility();
  const isAdmin = mounted && (role === "super_admin" || username?.toLowerCase() === "admin");

  const [activeSettingsSection, setActiveSettingsSection] = useState<DashboardSectionKey | null>(null);

  const handleOpenSettings = (secKey: DashboardSectionKey) => {
    setActiveSettingsSection(secKey);
  };

  const [data, setData] = useState<DashboardData | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const fetchDashboardData = useCallback(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/login") return;
    const params = new URLSearchParams({ role, username: username || "" });
    fetch(`/api/dashboard?${params}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, [role, username]);

  const fetchSpreadsheetInfo = useCallback(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/login") return;
    fetch("/api/settings/spreadsheet")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => { if (d?.lastSyncAt) setLastSync(d.lastSyncAt); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSpreadsheetInfo();
  }, [fetchSpreadsheetInfo]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useRealtimeSync(fetchDashboardData, 5000);

  const isLoaded = Boolean(data);
  const stats = data?.stats || { totalTasks: 0, inProgressCount: 0, overdueCount: 0, doneCount: 0, unassignedSubtasksCount: 0 };
  const projects = data?.projects || [];
  const reviewTasks = role === "super_admin" ? [] : (data?.reviewTasks || []);
  const workload = data?.workload || [];
  const userTasksForDeadline = role === "super_admin" ? [] : ((data?.tasks as any[]) || []);

  return (
    <div className="flex flex-col flex-1">
      {/* ========================================================================
       * Header Dashboard: Badge Sprint, Navigasi, Notifikasi, & User Avatar
       * ======================================================================== */}
      <PageHeader
        middle={
          <div suppressHydrationWarning className="flex items-center gap-md">
            <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/30 bg-surface-soft rounded-pill px-sm py-xxs">Dashboard</span>
            {data?.activeSprint ? (
              <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-green-700 bg-green-100 rounded-pill px-sm py-xxs">{data.activeSprint}</span>
            ) : (
              <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/30 bg-surface-soft rounded-pill px-sm py-xxs animate-pulse">Sprint ...</span>
            )}
          </div>
        }
      >
        <DeadlineNotification tasks={userTasksForDeadline} reviewTasks={reviewTasks} />
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
            <div className="flex items-center justify-between gap-md mb-lg px-md py-sm rounded-lg bg-blue-50/60 border border-blue-200/70 text-blue-900">
              <div className="flex items-center gap-sm min-w-0">
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-xs flex-wrap">
                    <h4 className="text-[12px] font-[600]">Mode Pengawasan Eksekutif ({role.toUpperCase()})</h4>
                    <span className="text-[11px] text-blue-700/80 hidden sm:inline">— Menampilkan ringkasan data agregat seluruh tim & departemen untuk pengawasan manajerial.</span>
                  </div>
                </div>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.5px] bg-blue-100/90 text-blue-800 rounded-pill px-sm py-xxs font-[550] border border-blue-200 flex-shrink-0">
                Agregat Organisasi
              </span>
            </div>
          )}

          {/* Peringatan Subtask Belum Ditugaskan (Unassigned Subtasks) */}
          {(stats as any).unassignedSubtasksCount > 0 && isReviewer && (
            <div className="flex items-center justify-between gap-md mb-lg px-md py-sm rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900">
              <div className="flex items-center gap-sm min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-xs flex-wrap">
                    <h4 className="text-[12px] font-[600]">Peringatan Subtask Belum Ditugaskan</h4>
                    <span className="text-[11px] text-amber-700/90 hidden sm:inline">
                      — Terdapat <strong className="font-[600] text-amber-900">{(stats as any).unassignedSubtasksCount} subtask</strong> di Sprint ini yang belum memiliki eksekutor.
                    </span>
                  </div>
                </div>
              </div>
              <a
                href="/sprint-history"
                className="text-[11px] font-[550] text-amber-800 bg-amber-100 hover:bg-amber-200/80 px-sm py-xxs rounded-md transition-colors border border-amber-300/60 flex-shrink-0"
              >
                Tinjau Subtask →
              </a>
            </div>
          )}

          {/* ========================================================================
           * Section 1: Executive Stat Cards Container
           * ======================================================================== */}
          {!isLoaded ? (
            <StatCardsSkeleton />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-xxl stat-card-grid">
              <StatCard label="Total Tugas" value={stats.totalTasks} accent="default" subtitle={`${stats.doneCount} selesai`} />
              <StatCard label="In Progress" value={stats.inProgressCount} accent="blue" subtitle="Sedang dikerjakan" />
              <StatCard label="Overdue" value={stats.overdueCount} accent="red" subtitle="Melewati tenggat" />
              <StatCard label="Selesai" value={stats.doneCount} accent="green" subtitle={`${stats.totalTasks > 0 ? Math.round((stats.doneCount / stats.totalTasks) * 100) : 0}% completion`} />
            </div>
          )}

          {/* ========================================================================
           * Section 3: Charts Grid Container
           * ======================================================================== */}
          {!isLoaded ? (
            <ChartsGridSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-xxl">
              <TaskDistributionChart tasks={(data?.statusDistribution || {}) as any} />
              <SprintVelocityChart data={(data as any)?.velocity} />
            </div>
          )}

          {/* ========================================================================
           * Section 4B: Performa Lead Proyek Container
           * ======================================================================== */}
          {!isSectionVisibleForRole("lead_performance", role) ? (
            isAdmin ? (
              <SectionHiddenPlaceholder
                title="Performa Project Lead & Beban Kerja Tim"
                onOpenSettings={() => handleOpenSettings("lead_performance")}
              />
            ) : null
          ) : !isLoaded ? (
            <LeadPerformanceSkeleton />
          ) : (
            <LeadPerformanceCard
              leads={(data as any)?.leadsPerformance || []}
              onOpenSettings={isAdmin ? () => handleOpenSettings("lead_performance") : undefined}
            />
          )}

          {/* ========================================================================
           * Section 2: Daftar Proyek Container
           * ======================================================================== */}
          {!isSectionVisibleForRole("projects_list", role) ? (
            isAdmin ? (
              <SectionHiddenPlaceholder
                title="Daftar Proyek"
                onOpenSettings={() => handleOpenSettings("projects_list")}
              />
            ) : null
          ) : (
            <div className="mb-xxl">
              <div className="flex items-center justify-between mb-lg">
                <h2 className="text-[24px] font-[540] text-ink">
                  {role === "staff" ? "Proyek Saya" : "Proyek Aktif"}
                </h2>
                {isAdmin && (
                  <SectionSettingsButton
                    onClick={() => handleOpenSettings("projects_list")}
                    title="Atur Tampilan Role: Daftar Proyek"
                  />
                )}
              </div>
              {!isLoaded ? (
                <ProjectGridSkeleton />
              ) : projects.length === 0 ? (
                <div className="text-[13px] text-ink/30 py-xxl text-center bg-surface-soft/30 rounded-lg border border-hairline">
                  Belum ada proyek dengan tugas untuk Anda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md items-stretch">
                  {projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={{
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        goals: p.goals,
                        dod: p.dod,
                        sprint: p.sprint,
                        lead: p.lead,
                        totalTasks: p.totalTasks,
                        doneTasks: p.doneTasks,
                        reviewTasks: (p as any).reviewTasks,
                        inProgressTasks: (p as any).inProgressTasks,
                        todoTasks: (p as any).todoTasks,
                        reviewSubtasksCount: (p as any).reviewSubtasksCount,
                      } as any}
                      userTaskCount={role === "staff" ? (p as any).userTaskCount : undefined}
                      isLeadProject={(p as any).isLeadProject}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================
           * Section 4: Chart Beban Kerja Container
           * ======================================================================== */}
          {!isSectionVisibleForRole("workload_chart", role) ? (
            isAdmin ? (
              <SectionHiddenPlaceholder
                title="Grafik Beban Kerja Tim"
                onOpenSettings={() => handleOpenSettings("workload_chart")}
              />
            ) : null
          ) : (
            <div className="mb-xxl">
              {!isLoaded ? (
                <div className="bg-canvas border border-hairline rounded-lg p-lg h-[280px] animate-pulse shadow-xs" />
              ) : (
                <WorkloadChart
                  tasks={workload as any}
                  currentUser={role === "staff" ? currentUser?.username : undefined}
                  onOpenSettings={isAdmin ? () => handleOpenSettings("workload_chart") : undefined}
                />
              )}
            </div>
          )}

          {/* ========================================================================
           * Section 5: Daftar Perlu Review Container
           * ======================================================================== */}
          {!isSectionVisibleForRole("review_tasks", role) ? (
            isAdmin ? (
              <SectionHiddenPlaceholder
                title="Daftar Perlu Review"
                onOpenSettings={() => handleOpenSettings("review_tasks")}
              />
            ) : null
          ) : reviewTasks.length > 0 ? (
            <div className="mt-xxl">
              <div className="flex items-center justify-between mb-md flex-wrap gap-sm">
                <div className="flex items-center gap-sm flex-wrap">
                  <h2 className="text-[20px] font-[540] text-ink">Perlu Review</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-500 text-white px-3 py-1 text-[11px] font-[600] shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>
                      {reviewTasks.reduce((sum, t) => sum + ((t as any).reviewSubtasksCount || 1), 0)} Subtask Menunggu Review
                    </span>
                  </span>
                </div>
                {isAdmin && (
                  <SectionSettingsButton
                    onClick={() => handleOpenSettings("review_tasks")}
                    title="Atur Tampilan Role: Daftar Perlu Review"
                  />
                )}
              </div>
              <div className="space-y-sm">
                {reviewTasks.map((t) => (
                  <ReviewTaskCard key={t.id} task={t as any} />
                ))}
              </div>
            </div>
          ) : null}

          {/* ========================================================================
           * Section 6: What's New & Log Aktivitas Pembaruan Sistem (Selalu Tampil Instan)
           * ======================================================================== */}
          {!isSectionVisibleForRole("whats_new", role) ? (
            isAdmin ? (
              <SectionHiddenPlaceholder
                title="Catatan Rilis & Log Pembaruan"
                onOpenSettings={() => handleOpenSettings("whats_new")}
              />
            ) : null
          ) : (
            <WhatsNewSection
              onOpenSettings={isAdmin ? () => handleOpenSettings("whats_new") : undefined}
            />
          )}
        </div>
      </main>

      {/* Modal Pengaturan Visibilitas Section per Role (Khusus Admin) */}
      <SectionSettingsModal
        open={Boolean(activeSettingsSection)}
        sectionKey={activeSettingsSection}
        currentVisibility={activeSettingsSection ? visibility[activeSettingsSection] : ({} as any)}
        onClose={() => setActiveSettingsSection(null)}
        onSave={async (key, roleMap) => {
          await updateSectionVisibility(key, roleMap);
        }}
      />

      {/* Dialog Sinkronisasi Sprint Google Sheets */}
      <SprintSyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
          fetchSpreadsheetInfo();
        }}
      />
    </div>
  );
}
