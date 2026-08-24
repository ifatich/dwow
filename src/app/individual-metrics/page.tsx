"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import { MetricsSkeleton } from "@/components/shared/skeletons";
import GlobalFilterToolbar from "@/components/shared/global-filter-toolbar";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

const COLOR_PALETTE = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#84cc16", // lime
];

export function getStaffColor(nameOrUsername: string): string {
  if (!nameOrUsername) return "#64748b";
  let hash = 0;
  const str = nameOrUsername.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

interface StaffMetric {
  name: string;
  username: string;
  role?: string;
  department?: string;
  capacity: number;
  workload: number;
  utilization: number;
  subtasksDone: number;
  subtasksTotal: number;
  isOverload: boolean;
  leaveDays?: number;
  reviewsTotal?: number;
  reviewsDone?: number;
  reviewsPending?: number;
  totalCombinedTasks?: number;
  doneCombinedTasks?: number;
}

import {
  calculateStaffPerformance,
  calculateLeadPerformance,
  PerformanceResult,
} from "@/lib/performance-calculator";

type PerformanceCategory = "all" | "top" | "overload" | "optimal" | "available";

export function getPerformanceDetail(m: StaffMetric): PerformanceResult {
  if (m.role === "lead") {
    return calculateLeadPerformance({
      workloadHours: m.workload,
      capacityHours: m.capacity,
      subtasksDone: m.subtasksDone,
      subtasksTotal: m.subtasksTotal,
      reviewsDone: m.reviewsDone || 0,
      reviewsTotal: m.reviewsTotal || 0,
    });
  }
  return calculateStaffPerformance({
    workloadHours: m.workload,
    capacityHours: m.capacity,
    subtasksDone: m.subtasksDone,
    subtasksTotal: m.subtasksTotal,
  });
}

export function calcPerformanceScore(m: StaffMetric): number {
  return getPerformanceDetail(m).score;
}

export default function IndividualMetricsPage() {
  const currentUser = useCurrentUser();
  const role = currentUser?.role ?? "staff";
  const isExecutive = role === "super_admin" || role === "kadep" || role === "kadiv";

  const [data, setData] = useState<StaffMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedSprint, setSelectedSprint] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<PerformanceCategory>("all");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchData = useCallback(() => {
    fetch(`/api/reports?period=bulanan&username=${selectedUser}&sprint=${selectedSprint}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        const staffOnly = (d.staff || []).filter(
          (m: StaffMetric) => m.role !== "super_admin" && m.role !== "kadep" && m.role !== "kadiv"
        );
        setData(staffOnly);
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedUser, selectedSprint]);

  useEffect(() => {
    setLoading(true);
    fetchData();

    // Auto-refresh real-time data every 15 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Executive Top Performers (Max 3): Combined Score (50% Subtask + 50% Workload for Staff; 33.3% x 3 for Lead)
  const topPerformers = useMemo(() => {
    return [...data]
      .sort((a, b) => calcPerformanceScore(b) - calcPerformanceScore(a) || b.subtasksDone - a.subtasksDone)
      .slice(0, 3);
  }, [data]);

  // Set of Top Performer Usernames for mutual exclusion
  const topUsernames = useMemo(() => new Set(topPerformers.map((tp) => tp.username)), [topPerformers]);

  // Executive Underperform / Perlu Perhatian (Max 3): Lowest Combined Score (Excluding Top Performers)
  const underperformOrOverload = useMemo(() => {
    return data
      .filter((m) => !topUsernames.has(m.username))
      .sort((a, b) => calcPerformanceScore(a) - calcPerformanceScore(b) || a.subtasksDone - b.subtasksDone)
      .slice(0, 3);
  }, [data, topUsernames]);

  // Filtered & Ordered Data for Display
  const filteredData = useMemo(() => {
    if (categoryFilter === "top") return topPerformers;
    if (categoryFilter === "overload") return underperformOrOverload;
    if (categoryFilter === "optimal") return data.filter((m) => m.utilization >= 80 && m.utilization <= 100 && !topUsernames.has(m.username));
    if (categoryFilter === "available") return data.filter((m) => m.utilization < 80 && !topUsernames.has(m.username));

    // "all": Sort Top Performers (#1, #2, #3) to the VERY TOP in exact rank order, followed by the rest
    const sortedAll = [...data].sort((a, b) => {
      const rankA = topPerformers.findIndex((tp) => tp.username === a.username);
      const rankB = topPerformers.findIndex((tp) => tp.username === b.username);

      if (rankA !== -1 && rankB !== -1) return rankA - rankB; // Exact #1, #2, #3 order!
      if (rankA !== -1) return -1;
      if (rankB !== -1) return 1;

      return calcPerformanceScore(b) - calcPerformanceScore(a);
    });

    return sortedAll;
  }, [data, categoryFilter, topPerformers, underperformOrOverload, topUsernames]);

  const avgUtilization = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((s, m) => s + m.utilization, 0);
    return Math.round(sum / data.length);
  }, [data]);

  const totalWorkloadHours = useMemo(() => {
    return Math.round(data.reduce((s, m) => s + m.workload, 0));
  }, [data]);

  return (
    <div className="flex flex-col flex-1">
      <PageHeader><HeaderAvatar /></PageHeader>
      <BreadcrumbBar items={[{ label: "Dashboard", href: "/" }, { label: "Kinerja Individu" }]} />
      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-xl py-xxl">

          {/* Header & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-lg">
            <div>
              <div className="flex items-center gap-xs">
                <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/40">
                  {isExecutive ? "Pengawasan Eksekutif · Kinerja Anggota Tim" : "Metrik Kinerja"}
                </span>
                {lastUpdated && (
                  <span className="inline-flex items-center gap-xxs font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-xs py-[1px] rounded-pill">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Realtime {lastUpdated}
                  </span>
                )}
              </div>
              <h2 className="text-[32px] font-[340] tracking-[-0.72px] text-ink mt-xxs">
                Kinerja Individu
              </h2>
            </div>

            <div className="flex items-center gap-xs self-start md:self-auto">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchData();
                }}
                className="font-mono text-[11px] text-ink/60 bg-white hover:bg-surface-soft border border-hairline-soft px-md py-xs rounded-pill transition-all flex items-center gap-xs cursor-pointer shadow-2xs"
                title="Synchronize real-time data"
              >
                ↻ Sync Data
              </button>

              {isExecutive && (
                <span className="font-mono text-[11px] uppercase tracking-[0.5px] bg-amber-50 text-amber-700 border border-amber-200/80 px-md py-xs rounded-pill font-[540] flex items-center gap-xs shadow-2xs">
                  🛡️ Mode Pengawasan Eksekutif ({role.toUpperCase()})
                </span>
              )}
            </div>
          </div>

          {/* Executive Overview Summary Cards */}
          {isExecutive && !loading && data.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-xxl">
              <div className="bg-surface-soft/60 border border-hairline-soft rounded-lg p-md">
                <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-ink/40">Total Staff & Lead</span>
                <p className="text-[24px] font-[600] text-ink mt-xxs tabular-nums">{data.length} <span className="text-[12px] font-normal text-ink/40">Anggota</span></p>
                <p className="text-[11px] text-ink/40 mt-[2px]">{totalWorkloadHours}j total alokasi</p>
              </div>

              <div className="bg-surface-soft/60 border border-hairline-soft rounded-lg p-md">
                <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-ink/40">Rata-Rata Utilisasi</span>
                <p className="text-[24px] font-[600] text-blue-600 mt-xxs tabular-nums">{avgUtilization}%</p>
                <p className="text-[11px] text-ink/40 mt-[2px]">Kapasitas 80j/sprint</p>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-lg p-md">
                <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-emerald-800/60">🏆 Top Performers</span>
                <p className="text-[24px] font-[600] text-emerald-700 mt-xxs tabular-nums">{topPerformers.length} <span className="text-[12px] font-normal text-emerald-600/60">Staf</span></p>
                <p className="text-[11px] text-emerald-700/60 mt-[2px]">Penyelesaian & utilisasi tinggi</p>
              </div>

              <div className="bg-red-50/50 border border-red-200/60 rounded-lg p-md">
                <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-red-800/60">⚠️ Perlu Perhatian</span>
                <p className="text-[24px] font-[600] text-red-600 mt-xxs tabular-nums">{underperformOrOverload.length} <span className="text-[12px] font-normal text-red-500/60">Staf</span></p>
                <p className="text-[11px] text-red-600/60 mt-[2px]">Overload atau penyelesaian rendah</p>
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="mb-md">
            <GlobalFilterToolbar
              userValue={selectedUser}
              onUserChange={setSelectedUser}
              sprintValue={selectedSprint}
              onSprintChange={setSelectedSprint}
            />
          </div>

          {/* Performance Classification Category Filters */}
          {isExecutive && !loading && (
            <div className="flex flex-wrap items-center gap-xs mb-lg pb-xs border-b border-hairline-soft">
              <span className="text-[12px] font-[540] text-ink/60 mr-xs">Kategori Performa:</span>
              <button
                onClick={() => setCategoryFilter("all")}
                className={`text-[11px] font-mono uppercase tracking-[0.5px] px-md py-xs rounded-pill border transition-all flex items-center gap-xs ${
                  categoryFilter === "all"
                    ? "bg-ink text-white border-ink font-[600] shadow-2xs"
                    : "bg-white text-ink/60 border-hairline-soft hover:bg-surface-soft hover:text-ink"
                }`}
              >
                Semua ({data.length})
              </button>

              <button
                onClick={() => setCategoryFilter("top")}
                className={`text-[11px] font-mono uppercase tracking-[0.5px] px-md py-xs rounded-pill border transition-all flex items-center gap-xs ${
                  categoryFilter === "top"
                    ? "bg-ink text-white border-ink font-[600] shadow-2xs"
                    : "bg-white text-ink/60 border-hairline-soft hover:bg-surface-soft hover:text-ink"
                }`}
              >
                🏆 Top Performers ({topPerformers.length})
              </button>

              <button
                onClick={() => setCategoryFilter("overload")}
                className={`text-[11px] font-mono uppercase tracking-[0.5px] px-md py-xs rounded-pill border transition-all flex items-center gap-xs ${
                  categoryFilter === "overload"
                    ? "bg-ink text-white border-ink font-[600] shadow-2xs"
                    : "bg-white text-ink/60 border-hairline-soft hover:bg-surface-soft hover:text-ink"
                }`}
              >
                ⚠️ Perlu Perhatian ({underperformOrOverload.length})
              </button>

              <button
                onClick={() => setCategoryFilter("optimal")}
                className={`text-[11px] font-mono uppercase tracking-[0.5px] px-md py-xs rounded-pill border transition-all flex items-center gap-xs ${
                  categoryFilter === "optimal"
                    ? "bg-ink text-white border-ink font-[600] shadow-2xs"
                    : "bg-white text-ink/60 border-hairline-soft hover:bg-surface-soft hover:text-ink"
                }`}
              >
                ⚡ Optimal (80-100%)
              </button>

              <button
                onClick={() => setCategoryFilter("available")}
                className={`text-[11px] font-mono uppercase tracking-[0.5px] px-md py-xs rounded-pill border transition-all flex items-center gap-xs ${
                  categoryFilter === "available"
                    ? "bg-ink text-white border-ink font-[600] shadow-2xs"
                    : "bg-white text-ink/60 border-hairline-soft hover:bg-surface-soft hover:text-ink"
                }`}
              >
                🟡 Tersedia Kapasitas
              </button>
            </div>
          )}

          {/* Main User Performance Grid */}
          {loading ? (
            <div className="mt-lg"><MetricsSkeleton /></div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-xxl border border-hairline rounded-xl bg-surface-soft/30 text-ink/40 text-[14px]">
              Tidak ada data kinerja individu yang sesuai dengan kategori filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {filteredData.map((m) => {
                const isOverload = m.utilization > 100;
                const isOptimal = m.utilization >= 80 && m.utilization <= 100;
                const color = getStaffColor(m.username || m.name);

                const subtaskRate = m.subtasksTotal > 0 ? Math.round((m.subtasksDone / m.subtasksTotal) * 100) : 0;
                const hoursDiff = m.workload - m.capacity;

                // Is Top Performer check with rank (1, 2, or 3)
                const topIndex = topPerformers.findIndex((tp) => tp.username === m.username);
                const isTop = topIndex !== -1;
                const topRank = topIndex + 1;
                const isWarning = underperformOrOverload.some((up) => up.username === m.username);

                // Initials from full name
                const nameParts = m.name.split(" ").filter(Boolean);
                const initials = nameParts.length >= 2
                  ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                  : m.name.slice(0, 2).toUpperCase();

                const isLeadRole = m.role === "lead";

                return (
                  <div
                    key={m.username}
                    className={`group bg-white border rounded-xl p-lg shadow-2xs hover:shadow-xs transition-all duration-300 flex flex-col justify-between overflow-hidden relative ${
                      isTop
                        ? "border-emerald-300 bg-gradient-to-b from-white to-emerald-50/20"
                        : isWarning
                        ? "border-amber-300 bg-gradient-to-b from-white to-amber-50/20"
                        : "border-hairline-soft"
                    }`}
                  >
                    <div>
                      {/* Staff Header */}
                      <div className="flex items-start justify-between gap-md mb-lg">
                        <div className="flex items-center gap-md">
                          {/* Avatar Circle */}
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center shadow-xs flex-shrink-0 relative group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: color }}
                          >
                            <span className="text-[13px] font-[600] text-white tracking-[0.5px]">
                              {initials}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-xs">
                              <h3 className="text-[16px] font-[600] text-ink capitalize">
                                {m.name}
                              </h3>
                              {m.role && (
                                <span className="text-[9px] font-mono uppercase tracking-[0.5px] text-ink/40 bg-surface-soft px-xs py-[1px] rounded border border-hairline-soft">
                                  {m.role}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-[320] text-ink/40 mt-xxs">
                              {isLeadRole ? (
                                <>Kapasitas Review: <span className="font-[540] text-ink/70">{m.reviewsTotal || 0} Subtask Tim</span></>
                              ) : (
                                <>Kapasitas: <span className="font-[540] text-ink/70">{m.capacity} jam</span></>
                              )}
                              <span className="text-ink/30 ml-xs">
                                {selectedSprint === "all" ? "(Akumulasi All Sprint)" : "(1 Sprint)"}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Utilization Badge & Performance Category Tag */}
                        <div className="flex flex-col items-end gap-xs flex-shrink-0">
                          {isTop ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-sm py-[2px] rounded-pill font-[600] flex items-center gap-xxs shadow-2xs">
                              {topRank === 1 ? "🥇" : topRank === 2 ? "🥈" : "🥉"} Top Performer #{topRank}
                            </span>
                          ) : isLeadRole ? (
                            m.reviewsPending && m.reviewsPending > 0 ? (
                              <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-amber-800 bg-amber-100/90 border border-amber-300 px-sm py-[2px] rounded-pill font-[600]">
                                ⚠️ {m.reviewsPending} Review Menunggu
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-sm py-[2px] rounded-pill font-[600]">
                                ✓ Review Clean
                              </span>
                            )
                          ) : isOverload ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-red-800 bg-red-100/90 border border-red-300 px-sm py-[2px] rounded-pill font-[600]">
                              🔴 Overload ({m.utilization}%)
                            </span>
                          ) : isOptimal ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-blue-800 bg-blue-100/90 border border-blue-300 px-sm py-[2px] rounded-pill font-[600]">
                              ⚡ Produktif ({m.utilization}%)
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-sky-800 bg-sky-100/90 border border-sky-300 px-sm py-[2px] rounded-pill font-[600]">
                              🟡 Tersedia ({m.utilization}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Metrics Breakdown */}
                      <div className="space-y-md">
                        {/* Workload Progress Bar (For Staff) / Lead Responsibility Header (For Lead) */}
                        {isLeadRole ? (
                          <div className="space-y-xs">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-[450] text-ink/60">Tanggung Jawab Pengawasan Lead</span>
                              <span className="font-mono text-[12px] font-[540] tabular-nums text-ink">
                                {m.reviewsTotal || 0} Subtask Tim
                              </span>
                            </div>
                            <div className="w-full h-[8px] bg-canvas/80 rounded-full overflow-hidden relative border border-hairline-soft">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-xs">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-[450] text-ink/60 flex items-center gap-xs">
                                Beban Kerja
                                {hoursDiff > 0 ? (
                                  <span className="text-[10px] font-[550] text-red-600 bg-red-50 border border-red-200 px-xs py-[1px] rounded">
                                    +{Math.round(hoursDiff)} jam Kelebihan
                                  </span>
                                ) : hoursDiff < 0 ? (
                                  <span className="text-[10px] font-[550] text-emerald-700 bg-emerald-50 border border-emerald-200 px-xs py-[1px] rounded">
                                    {Math.abs(Math.round(hoursDiff))} jam Sisa Kapasitas
                                  </span>
                                ) : null}
                              </span>
                              <span className="font-mono text-[12px] font-[540] tabular-nums text-ink">
                                {m.workload}j <span className="text-ink/35 font-normal">/ {m.capacity}j</span>
                              </span>
                            </div>

                            <div className="w-full h-[8px] bg-hairline/50 rounded-full overflow-hidden relative">
                              <div className="absolute inset-y-0 right-0 w-[1px] bg-ink/10" style={{ right: "0%" }} />
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(m.utilization, 100)}%`,
                                  backgroundColor: isOverload ? "#ef4444" : isOptimal ? "#10b981" : "#3b82f6",
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Subtasks Completion Bar */}
                        <div className="space-y-xs">
                          <div className="flex justify-between items-center text-[12px]">
                            <span className="font-[450] text-ink/60">
                              {m.role === "lead" ? "Subtask Mandiri Selesai" : "Subtask Selesai"}
                            </span>
                            <div className="flex items-center gap-xs font-mono text-[12px] tabular-nums">
                              <span className="font-[540] text-ink">
                                {m.subtasksDone} <span className="text-ink/35 font-normal">/ {m.subtasksTotal}</span>
                              </span>
                              <span className="text-[10px] text-ink/50 bg-canvas/80 px-xs py-[1px] rounded border border-hairline-soft font-[540]">
                                {subtaskRate}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-[8px] bg-hairline/50 rounded-full overflow-hidden relative">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${subtaskRate}%` }}
                            />
                          </div>
                        </div>

                        {/* Lead Review Duties Progress Bar (Khusus Role Lead) */}
                        {m.role === "lead" && (
                          <div className="space-y-xs pt-xs border-t border-dashed border-hairline-soft">
                            <div className="flex justify-between items-center text-[12px]">
                              <span className="font-[450] text-ink/60 flex items-center gap-xs">
                                Review Subtask Tim
                                {m.reviewsPending && m.reviewsPending > 0 ? (
                                  <span className="text-[10px] font-[550] text-amber-700 bg-amber-50 border border-amber-200 px-xs py-[1px] rounded">
                                    ⚠️ {m.reviewsPending} Belum Dikerjakan
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-[550] text-emerald-700 bg-emerald-50 border border-emerald-200 px-xs py-[1px] rounded">
                                    ✓ Selesai Review
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-xs font-mono text-[12px] tabular-nums">
                                <span className="font-[540] text-ink">
                                  {m.reviewsDone || 0} <span className="text-ink/35 font-normal">/ {m.reviewsTotal || 0}</span>
                                </span>
                                <span className="text-[10px] text-ink/50 bg-canvas/80 px-xs py-[1px] rounded border border-hairline-soft font-[540]">
                                  {m.reviewsTotal && m.reviewsTotal > 0 ? Math.round(((m.reviewsDone || 0) / m.reviewsTotal) * 100) : 0}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-[8px] bg-hairline/50 rounded-full overflow-hidden relative">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${m.reviewsTotal && m.reviewsTotal > 0 ? Math.round(((m.reviewsDone || 0) / m.reviewsTotal) * 100) : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Combined Performance Score Badge */}
                        {(() => {
                          const perf = getPerformanceDetail(m);
                          return (
                            <div className="text-[11px] font-mono text-ink/60 bg-surface-soft px-md py-xs rounded border border-hairline-soft flex items-center justify-between">
                              <span>Skor Performa Gabungan:</span>
                              <span className="font-[600] text-ink">
                                {perf.score}%{" "}
                                <span className="text-[10px] text-ink/40 font-normal">
                                  ({perf.weightBreakdown})
                                </span>
                              </span>
                            </div>
                          );
                        })()}

                        {/* Top Performer Reason Callout */}
                        {isTop && (
                          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-md px-md py-xs mt-sm flex items-center gap-xs">
                            <span className="text-[11px] font-[450] text-emerald-900 leading-tight">
                              💡 <strong>Alasan Top Performer #{topRank}:</strong>{" "}
                              {isLeadRole
                                ? `Meraih skor efektivitas ${calcPerformanceScore(m)}% berbasis 3 Pilar Lead (33.3% Subtask Mandiri, 33.3% Review Tim, 33.3% Workload).`
                                : `Meraih skor efektivitas ${calcPerformanceScore(m)}% berbasis 50% penyelesaian subtask (${subtaskRate}%) dan 50% utilisasi beban kerja (${m.utilization}%).`}
                            </span>
                          </div>
                        )}

                        {/* Underperform / Perlu Perhatian Reason Callout */}
                        {isWarning && !isTop && (
                          <div className="bg-amber-50/80 border border-amber-200/80 rounded-md px-md py-xs mt-sm flex items-center gap-xs">
                            <span className="text-[11px] font-[450] text-amber-900 leading-tight">
                              ⚠️ <strong>Alasan Perlu Perhatian:</strong>{" "}
                              {isLeadRole
                                ? `Skor efektivitas rendah (${calcPerformanceScore(m)}%) dengan ${m.reviewsPending || 0} subtask tim masih menggantung menunggu review.`
                                : `Skor efektivitas ${calcPerformanceScore(m)}% berbasis 50% subtask selesai (${subtaskRate}%) dan 50% beban kerja (${m.utilization}%).`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed Executive Footer */}
                    <div className="mt-lg pt-sm border-t border-hairline-soft flex items-center justify-between text-[11px] text-ink/40">
                      <div className="flex items-center gap-xs">
                        <span>Status Cuti:</span>
                        <span className="font-[540] text-ink/70">
                          {m.leaveDays && m.leaveDays > 0
                            ? `${m.leaveDays} Hari (${m.leaveDays * 8}j)`
                            : "Tidak Ada Cuti"}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-ink/50 uppercase tracking-[0.5px]">
                        Rata-rata: {m.subtasksTotal > 0 ? (m.workload / m.subtasksTotal).toFixed(1) : 0}j / subtask
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
