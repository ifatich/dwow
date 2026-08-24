"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityLogEntry } from "@/lib/types";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import { ActivityHistorySkeleton } from "@/components/shared/skeletons";
import GlobalFilterToolbar from "@/components/shared/global-filter-toolbar";

type FilterAction = "all" | ActivityLogEntry["action"];

interface ActivityLogRow {
  id: string;
  subtaskId: string | null;
  taskId: string | null;
  userId: string | null;
  staffName: string | null;
  staffNama: string | null;
  action: ActivityLogEntry["action"];
  timestamp: string;
  durationHours: number;
  note: string | null;
  subtaskTitle: string | null;
  taskTitle: string | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  started: { label: "Dimulai", color: "bg-blue-50 text-blue-700" },
  paused: { label: "Dijeda", color: "bg-amber-50 text-amber-700" },
  resumed: { label: "Dilanjutkan", color: "bg-sky-50 text-sky-700" },
  review_requested: { label: "Review", color: "bg-amber-50 text-amber-700" },
  approved: { label: "Disetujui", color: "bg-green-50 text-green-700" },
  revision_requested: { label: "Revisi", color: "bg-orange-50 text-orange-700" },
  task_created: { label: "Task Dibuat", color: "bg-slate-100 text-slate-600" },
  task_status_changed: { label: "Status Task", color: "bg-blue-50 text-blue-700" },
  task_rejected: { label: "Task Ditolak", color: "bg-red-50 text-red-700" },
  task_approved: { label: "Task Disetujui", color: "bg-emerald-50 text-emerald-700" },
  created: { label: "Dibuat", color: "bg-slate-100 text-slate-600" },
  completed: { label: "Selesai", color: "bg-green-100 text-green-700" },
  subtask_created: { label: "Subtask Dibuat", color: "bg-slate-100 text-slate-600" },
  assignee_added: { label: "Assignee +", color: "bg-cyan-50 text-cyan-700" },
  assignee_removed: { label: "Assignee -", color: "bg-rose-50 text-rose-700" },
};

export default function ActivityHistoryPage() {
  const [filter, setFilter] = useState<FilterAction>("all");
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedSprint, setSelectedSprint] = useState("all");

  // Fetch logs dari API
  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/activity/logs?limit=500");
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error("Gagal fetch activity logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    let result = logs;
    if (filter !== "all") result = result.filter((l) => l.action === filter);
    if (selectedUser !== "all") {
      const userList = selectedUser.split(",").filter(Boolean).map((u) => u.toLowerCase());
      result = result.filter((l) => {
        const name = (l.staffName || l.staffNama || "").toLowerCase();
        const uid = (l.userId || "").toLowerCase();
        return userList.some((u) => name.includes(u) || u.includes(name) || uid === u);
      });
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          (l.staffName && l.staffName.toLowerCase().includes(q)) ||
          (l.taskTitle && l.taskTitle.toLowerCase().includes(q)) ||
          (l.subtaskTitle && l.subtaskTitle.toLowerCase().includes(q)) ||
          (l.note && l.note.toLowerCase().includes(q))
      );
    }
    return result;
  }, [logs, filter, search, selectedUser]);

  return (
    <div className="flex flex-col flex-1">
      <PageHeader>
        <HeaderAvatar />
      </PageHeader>

      <BreadcrumbBar
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Riwayat Aktivitas" },
        ]}
      />

      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-xl py-xxl">
          <div className="mb-xxl">
            <span className="font-mono text-[18px] uppercase tracking-[0.54px] text-ink/40">Audit Trail</span>
            <h2 className="text-[48px] font-[340] leading-[1.10] tracking-[-0.72px] text-ink mt-sm">
              Riwayat<br />Perubahan Status
            </h2>
            <p className="text-[18px] font-[330] leading-[1.40] text-ink/50 mt-lg mb-lg">
              Seluruh aktivitas dan perubahan status task & subtask tercatat di sini.
            </p>
          </div>

          <GlobalFilterToolbar
            userValue={selectedUser}
            onUserChange={setSelectedUser}
            sprintValue={selectedSprint}
            onSprintChange={setSelectedSprint}
          />

          {/* Filters */}
          <div className="flex items-center gap-sm mb-xl flex-wrap">
            <input
              type="text"
              placeholder="Cari staff, task, atau subtask..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-[36px] rounded-pill px-lg text-[13px] bg-surface-soft border border-hairline text-ink placeholder:text-ink/25 focus:outline-none focus:border-primary/40 min-w-[240px]"
            />
            <span className="text-ink/20 mx-xs">|</span>
            {(["all", "started", "completed", "review_requested", "approved", "revision_requested", "task_rejected", "subtask_created", "created"] as FilterAction[]).map((a) => (
              <button
                key={a}
                onClick={() => setFilter(a)}
                className={`h-[30px] rounded-pill px-sm text-[11px] font-[480] transition-colors cursor-pointer ${
                  filter === a
                    ? "bg-primary text-on-primary"
                    : "bg-surface-soft text-ink/50 hover:text-ink hover:bg-hairline"
                }`}
              >
                {a === "all" ? "Semua" : ACTION_LABELS[a]?.label || a}
              </button>
            ))}
          </div>

          {/* Activity list */}
          {loading ? (
            <ActivityHistorySkeleton />
          ) : filtered.length === 0 ? (
            <div className="text-center py-xxl text-ink/30 text-[16px]">
              Tidak ada aktivitas tercatat
            </div>
          ) : (
            <div className="space-y-xs">
              {filtered.map((log) => {
                const action = ACTION_LABELS[log.action] || { label: log.action, color: "bg-slate-50 text-slate-500" };
                const time = new Date(log.timestamp);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-lg bg-canvas border border-hairline-soft rounded-lg px-lg py-md hover:border-hairline transition-colors group"
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center pt-xxs">
                      <div className={`w-[8px] h-[8px] rounded-full ${action.color.split(" ")[0].replace("bg-", "bg-").replace("50","400").replace("100","400")}`} />
                      <div className="w-px flex-1 bg-hairline-soft mt-xxs group-last:hidden" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm mb-xxs">
                        <span className={`inline-flex rounded-pill px-sm py-xxs text-[10px] font-[540] ${action.color}`}>
                          {action.label}
                        </span>
                        <span className="text-[12px] font-[450] text-ink/60">{log.staffName || "—"}</span>
                        <span className="text-ink/20">·</span>
                        <span className="text-[12px] font-[320] text-ink/40">{log.subtaskTitle || "—"}</span>
                      </div>
                      <p className="text-[11px] font-[320] text-ink/30">
                        Task: {log.taskTitle || "—"}
                      </p>
                      {log.note && (
                        <p className="text-[13px] font-[320] text-ink/60 mt-xs italic">
                          &ldquo;{log.note}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-[12px] font-[450] tabular-nums text-ink/50">
                        {time.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </div>
                      <div className="text-[11px] font-[320] text-ink/30">
                        {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {log.durationHours > 0 && (
                        <div className="text-[11px] font-[480] text-ink/40 mt-xxs">
                          {log.durationHours} jam
                        </div>
                      )}
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
