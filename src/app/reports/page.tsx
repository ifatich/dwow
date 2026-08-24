"use client";

import { useState, useEffect } from "react";
import ExportButtons from "@/components/shared/export-buttons";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import { TableSkeleton } from "@/components/shared/skeletons";
import GlobalFilterToolbar from "@/components/shared/global-filter-toolbar";

import type { Period, ReportTab, ReportData, SprintGroupItem } from "@/features/reports/types";
import KPIHeaderCards from "@/features/reports/components/kpi-header-cards";
import IndividualPerformanceTable from "@/features/reports/components/individual-performance-table";
import SprintProjectTable from "@/features/reports/components/sprint-project-table";

/**
 * Performance Report Page (`/reports`)
 *
 * Serves as the central executive report dashboard aggregating metrics
 * across staff individual performance, workload utilization, and sprint achievements.
 */
export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("bulanan");
  const [activeTab, setActiveTab] = useState<ReportTab>("individual");
  const [data, setData] = useState<ReportData | null>(null);
  const [sprintData, setSprintData] = useState<SprintGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedSprint, setSelectedSprint] = useState("all");

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/reports?period=${period}&username=${selectedUser}&sprint=${selectedSprint}`).then((r) => {
        if (!r.ok) throw new Error("Gagal memuat data laporan kinerja");
        return r.json();
      }),
      fetch(`/api/sprints`).then((r) => r.json()).catch(() => []),
    ])
      .then(([rep, spr]) => {
        setData(rep);
        if (Array.isArray(spr)) setSprintData(spr);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period, selectedUser, selectedSprint]);

  return (
    <div className="flex flex-col flex-1">
      {/* Top Header Bar with Export Buttons & User Avatar */}
      <PageHeader>
        <ExportButtons period={period} selectedUser={selectedUser} selectedSprint={selectedSprint} />
        <HeaderAvatar />
      </PageHeader>

      <BreadcrumbBar items={[{ label: "Dashboard", href: "/" }, { label: "Laporan Kinerja" }]} />

      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-xl py-xxl">
          {/* Hero Header */}
          <div className="mb-xxl">
            <span className="font-mono text-[18px] uppercase tracking-[0.54px] text-ink/40">
              Konsolidasi Data
            </span>
            <h2 className="text-[56px] font-[340] leading-[1.10] tracking-[-0.72px] text-ink mt-sm">
              Laporan Kinerja<br />Komprehensif
            </h2>
            <p className="text-[18px] font-[330] text-ink/50 mt-sm max-w-[640px]">
              Ringkasan performa tim, pencapaian tugas, jam kerja aktual, dan statistik per sprint secara terpadu.
            </p>
          </div>

          {/* Global Filter Toolbar */}
          <GlobalFilterToolbar
            userValue={selectedUser}
            onUserChange={setSelectedUser}
            sprintValue={selectedSprint}
            onSprintChange={setSelectedSprint}
          />

          {/* Filter & View Controls */}
          <div className="flex items-center justify-between gap-md my-lg flex-wrap">
            {/* Period selector */}
            <div className="flex items-center gap-xs">
              <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/40 mr-xs">
                Periode:
              </span>
              {(["bulanan", "kuartalan"] as Period[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`h-[32px] rounded-pill px-md text-[12px] font-[480] transition-colors cursor-pointer ${
                    period === p ? "bg-primary text-on-primary" : "bg-surface-soft text-ink/50 hover:text-ink"
                  }`}
                >
                  {p === "bulanan" ? "Bulanan" : "Kuartalan (3 Bln)"}
                </button>
              ))}
            </div>

            {/* Tab switch */}
            <div className="flex items-center gap-xs" role="tablist" aria-label="Laporan Navigation">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "individual"}
                onClick={() => setActiveTab("individual")}
                className={`h-[34px] rounded-pill px-lg text-[13px] font-[480] transition-colors cursor-pointer ${
                  activeTab === "individual"
                    ? "bg-ink text-canvas shadow-xs"
                    : "bg-surface-soft text-ink/50 hover:text-ink"
                }`}
              >
                📋 Kinerja Individu
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "sprint"}
                onClick={() => setActiveTab("sprint")}
                className={`h-[34px] rounded-pill px-lg text-[13px] font-[480] transition-colors cursor-pointer ${
                  activeTab === "sprint"
                    ? "bg-ink text-canvas shadow-xs"
                    : "bg-surface-soft text-ink/50 hover:text-ink"
                }`}
              >
                📊 Performa Sprint & Proyek
              </button>
            </div>
          </div>

          {/* Loading Skeleton & Error Alert */}
          {loading && <TableSkeleton cols={8} />}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-lg py-md text-[13px] text-red-600 mb-lg">
              ⚠️ {error}
            </div>
          )}

          {/* Content Area */}
          {!loading && data && (
            <>
              {/* Executive Summary 4 KPI Cards */}
              <KPIHeaderCards summary={data.summary} totalSprintsCount={data.totalSprintsCount} />

              {/* Tab 1: Individual Performance Table */}
              {activeTab === "individual" && <IndividualPerformanceTable staff={data.staff} />}

              {/* Tab 2: Sprint & Project Performance Table */}
              {activeTab === "sprint" && (
                <SprintProjectTable sprints={sprintData} selectedSprint={selectedSprint} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
