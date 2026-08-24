"use client";

import { useState, useEffect } from "react";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";

interface SprintData { id: string; name: string; sprint: string; totalTasks: number; doneTasks: number; isArchived: boolean; }

export default function SprintReportPage() {
  const [sprints, setSprints] = useState<SprintData[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sprints").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setSprints(data); }).finally(() => setLoading(false));
  }, []);

  const sprint = sprints.find((s) => s.id === selected);

  return (
    <div className="flex flex-col flex-1">
      <PageHeader><HeaderAvatar /></PageHeader>
      <BreadcrumbBar items={[{ label: "Dashboard", href: "/" }, { label: "Sprint", href: "/sprint-history" }, { label: "Laporan" }]} />
      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-xl py-xxl">
          <h2 className="text-[48px] font-[340] tracking-[-0.72px] text-ink mt-sm">Akhir<br />Sprint</h2>
          <p className="text-[16px] text-ink/40 mt-sm">Pilih sprint untuk melihat ringkasan performa.</p>

          <div className="flex gap-sm my-lg flex-wrap">
            {loading ? <span className="text-ink/30">Memuat...</span> : sprints.map((s) => (
              <button key={s.id} onClick={() => setSelected(selected === s.id ? null : s.id)}
                className={`h-[40px] rounded-lg px-lg text-[13px] font-[480] transition-colors cursor-pointer border ${selected === s.id ? "bg-primary text-on-primary border-primary" : "bg-canvas text-ink/60 border-hairline hover:border-ink/20"}`}>
                {s.name}
              </button>
            ))}
          </div>

          {sprint && (
            <div className="space-y-lg">
              <div className="grid grid-cols-3 gap-md">
                {[
                  { label: "Done/Tasks", val: `${sprint.doneTasks}/${sprint.totalTasks}` },
                  { label: "Completion", val: `${sprint.totalTasks > 0 ? Math.round((sprint.doneTasks/sprint.totalTasks)*100) : 0}%` },
                  { label: "Status", val: sprint.isArchived ? "Archived" : "Active" },
                ].map((c) => (
                  <div key={c.label} className="bg-surface-soft/40 rounded-lg border border-hairline-soft p-lg text-center">
                    <div className="text-[28px] font-[340] text-ink">{c.val}</div>
                    <div className="text-[13px] text-ink/40 mt-xs">{c.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-canvas border border-hairline rounded-lg p-xxl">
                <h3 className="text-[20px] font-[540] text-ink mb-lg">{sprint.name}</h3>
                <div className="grid grid-cols-2 gap-lg text-[14px]">
                  <div><span className="text-ink/40">Sprint: </span><span className="text-ink/70">{sprint.sprint}</span></div>
                  <div><span className="text-ink/40">Total Tasks: </span><span className="text-ink/70">{sprint.totalTasks}</span></div>
                  <div><span className="text-ink/40">Selesai: </span><span className="text-ink/70">{sprint.doneTasks}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
