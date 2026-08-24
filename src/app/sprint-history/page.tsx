"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import SprintTrendChart from "@/features/dashboard/components/sprint-trend-chart";
import SprintList, { SprintGroup } from "@/features/dashboard/components/sprint-list";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import { useRealtimeSync } from "@/lib/realtime-sync";
import { SprintHistorySkeleton } from "@/components/shared/skeletons";
import GlobalFilterToolbar from "@/components/shared/global-filter-toolbar";

export default function SprintHistoryPage() {
  const [mode, setMode] = useState<"trend" | "detail">("detail");
  const [sprints, setSprints] = useState<SprintGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedSprint, setSelectedSprint] = useState("all");

  const fetchSprints = useCallback(() => {
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSprints(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useRealtimeSync(fetchSprints, 5000);

  const filteredSprints = useMemo(() => {
    let result = sprints;
    if (selectedSprint !== "all") {
      result = result.filter((s) => s.sprint === selectedSprint);
    }
    if (selectedUser !== "all") {
      const userList = selectedUser.split(",").filter(Boolean).map((u) => u.toLowerCase());
      result = result
        .map((s) => ({
          ...s,
          projects: s.projects.filter(
            (p) =>
              userList.some((u) => (p.lead || "").toLowerCase().includes(u)) ||
              p.tasks.some(
                (t) =>
                  userList.some((u) => (t.picName || "").toLowerCase().includes(u)) ||
                  t.subtasks.some((st) => (st.assignees || []).some((a) => userList.some((u) => a.toLowerCase().includes(u))))
              )
          ),
        }))
        .filter((s) => s.projects.length > 0);
    }
    return result;
  }, [sprints, selectedSprint, selectedUser]);

  return (
    <div className="flex flex-col flex-1">
      {/* Top bar — same as /project */}
      <PageHeader>
        <HeaderAvatar />
      </PageHeader>

      <BreadcrumbBar
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Riwayat Sprint" },
        ]}
      />

      <main className="flex-1">
        {/* Read-only banner */}
        <div className="bg-amber-50/60 border-b border-amber-100">
          <div className="max-w-[1280px] mx-auto px-xl py-sm flex items-center gap-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-amber-500">
              <rect x="2" y="6" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 6V4.5a3 3 0 116 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="8" cy="10" r="1" fill="currentColor" />
            </svg>
            <span className="text-[13px] font-[450] text-amber-700">
              Data riwayat sprint bersifat <strong>read-only</strong>. Tidak dapat diubah atau dimodifikasi.
            </span>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-xl py-xxl">
          {/* Hero */}
          <div className="mb-xxl">
            <span className="font-mono text-[18px] uppercase tracking-[0.54px] text-ink/40">
              Arsip & Tren
            </span>
            <h2 className="text-[64px] font-[340] leading-[1.10] tracking-[-0.96px] text-ink mt-sm">
              Riwayat<br />Sprint
            </h2>
            <p className="text-[20px] font-[330] leading-[1.40] tracking-[-0.14px] text-ink/50 mt-lg max-w-[640px]">
              Tinjau performa sprint sebelumnya. Data bersifat read-only dan tidak dapat diubah.
            </p>
          </div>

          {/* Filter Toolbar */}
          <GlobalFilterToolbar
            userValue={selectedUser}
            onUserChange={setSelectedUser}
            sprintValue={selectedSprint}
            onSprintChange={setSelectedSprint}
          />

          {/* Mode toggle */}
          <div className="flex items-center gap-xs mb-xxl">
            <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/30 mr-sm">
              Tampilan
            </span>
            <button type="button" onClick={() => setMode("trend")}
              className={`h-[32px] rounded-pill px-md text-[12px] font-[480] transition-colors cursor-pointer ${
                mode === "trend" ? "bg-primary text-on-primary" : "bg-surface-soft text-ink/40 hover:text-ink/60"
              }`}>
              📈 Mode Tren
            </button>
            <button type="button" onClick={() => setMode("detail")}
              className={`h-[32px] rounded-pill px-md text-[12px] font-[480] transition-colors cursor-pointer ${
                mode === "detail" ? "bg-primary text-on-primary" : "bg-surface-soft text-ink/40 hover:text-ink/60"
              }`}>
              📋 Mode Detail
            </button>
          </div>

          {mode === "trend" ? (
            <div className="mb-xxl">
              <SprintTrendChart />
            </div>
          ) : (
            <div>
              <span className="font-mono text-[18px] uppercase tracking-[0.54px] text-ink/40">Daftar Sprint</span>
              <h3 className="text-[26px] font-[540] leading-[1.35] tracking-[-0.26px] text-ink mt-sm mb-lg">Sprint terpilih</h3>
              {loading ? <SprintHistorySkeleton /> : <SprintList sprints={filteredSprints} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
