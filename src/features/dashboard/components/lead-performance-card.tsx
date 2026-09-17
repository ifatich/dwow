"use client";

import Link from "next/link";
import { getStaffColor } from "@/app/individual-metrics/page";

export interface TeamMemberWorkload {
  username: string;
  name: string;
  hours: number;
  capacity: number;
}

export interface LeadPerformanceItem {
  username: string;
  name: string;
  projectsCount: number;
  totalTasks: number;
  doneTasks: number;
  completionRate: number;
  reviewPendingCount: number;
  teamSize: number;
  ownSubtasksTotal: number;
  ownSubtasksDone: number;
  ownWorkloadHours: number;
  teamMembers?: TeamMemberWorkload[];
}

interface LeadPerformanceCardProps {
  leads: LeadPerformanceItem[];
}

export default function LeadPerformanceCard({ leads }: LeadPerformanceCardProps) {
  if (!leads || leads.length === 0) return null;

  return (
    <div className="bg-surface-soft/60 rounded-lg border border-hairline-soft p-lg mb-xxl">
      {/* Outer Header — Identical to TaskDistributionChart / WorkloadChart */}
      <div className="flex items-center justify-between mb-md">
        <div>
          <h3 className="text-[14px] font-[540] text-ink">Performa Project Lead & Beban Kerja Tim</h3>
          <p className="text-[11px] font-[320] text-ink/40 mt-xxs">
            Pengawasan performa lead proyek dan distribusi beban kerja tim ({leads.length} Lead Proyek)
          </p>
        </div>
        <Link
          href="/individual-metrics"
          className="inline-flex items-center gap-xs font-mono text-[10px] uppercase tracking-[0.5px] bg-white border border-hairline-soft hover:border-ink/20 text-ink/70 hover:text-ink rounded-pill px-md py-xs font-[540] transition-all shadow-2xs hover:shadow-xs group"
        >
          Lihat Detail
          <svg className="w-3 h-3 transition-transform group-hover:translate-x-[2px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {leads.map((lead) => {
          const color = getStaffColor(lead.username || lead.name);

          // Initials
          const nameParts = lead.name.split(" ").filter(Boolean);
          const initials = nameParts.length >= 2
            ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
            : lead.name.slice(0, 2).toUpperCase();

          return (
            <div
              key={lead.username}
              className="bg-white border border-hairline-soft rounded-lg p-lg shadow-2xs hover:shadow-xs transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Lead Header */}
                <div className="flex items-center gap-sm mb-md">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-[600] text-[12px] shadow-xs flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[14px] font-[540] text-ink truncate capitalize">{lead.name}</h4>
                    <p className="text-[11px] font-[320] text-ink/40 mt-xxs">
                      Lead {lead.projectsCount} Proyek · {lead.teamSize} Anggota Tim
                    </p>
                  </div>
                </div>

                {/* Overall Led Project Progress */}
                <div className="space-y-xs mb-md">
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-ink/60 font-[450]">Tugas Selesai Proyek</span>
                    <span className="font-mono text-[12px] font-[540] text-ink">
                      {lead.doneTasks}/{lead.totalTasks} <span className="text-ink/40 font-normal">({lead.completionRate}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-[8px] bg-hairline/50 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${lead.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Explicit Distinction: Dikerjakan Lead vs Harus Direview Lead */}
                <div className="grid grid-cols-2 gap-xs my-sm p-xs bg-canvas/80 rounded-md border border-hairline-soft text-center">
                  {/* Box 1: Dikerjakan Lead */}
                  <div className="flex flex-col items-center justify-center p-xs">
                    <span className="font-mono text-[9px] uppercase tracking-[0.5px] text-ink/40">Dikerjakan Lead</span>
                    <span className="font-mono text-[13px] font-[600] text-blue-700 mt-[2px]">
                      {lead.ownSubtasksDone}/{lead.ownSubtasksTotal} Subtask
                    </span>
                    <span className="text-[10px] text-ink/40 mt-[1px]">({lead.ownWorkloadHours}j beban)</span>
                  </div>

                  {/* Box 2: Harus Direview Lead */}
                  <div className="flex flex-col items-center justify-center p-xs border-l border-hairline-soft">
                    <span className="font-mono text-[9px] uppercase tracking-[0.5px] text-ink/40">Perlu Direview</span>
                    <span className={`font-mono text-[13px] font-[600] mt-[2px] ${lead.reviewPendingCount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {lead.reviewPendingCount} Subtask
                    </span>
                    <span className="text-[10px] text-ink/40 mt-[1px]">
                      {lead.reviewPendingCount > 0 ? "Menunggu Review" : "Semua Clean"}
                    </span>
                  </div>
                </div>

                {/* Beban Kerja Anggota Tim di Bawah Lead Ini */}
                <div className="mt-md pt-sm border-t border-hairline-soft">
                  <div className="flex items-center justify-between mb-xs">
                    <span className="text-[11px] font-[540] text-ink/70">
                      Beban Kerja Tim ({lead.teamMembers ? lead.teamMembers.length : 0} Staf)
                    </span>
                    <span className="font-mono text-[10px] text-ink/40">Sprint Ini</span>
                  </div>
                  {lead.teamMembers && lead.teamMembers.length > 0 ? (
                    <div className="space-y-sm max-h-[180px] overflow-y-auto pr-xs">
                      {lead.teamMembers.map((member) => {
                        const mPct = Math.min(100, (member.hours / member.capacity) * 100);
                        const mIsOver = member.hours > member.capacity;
                        const mColor = getStaffColor(member.username || member.name);

                        return (
                          <div key={member.username} className="flex items-center gap-sm">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-[540] flex-shrink-0" style={{ backgroundColor: mColor }}>
                              {member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-xxs">
                                <span className="truncate text-ink/70 font-[450] text-[12px] capitalize">{member.name}</span>
                                <span className={`font-mono text-[12px] font-[540] tabular-nums ml-sm flex-shrink-0 ${mIsOver ? "text-red-500" : "text-ink"}`}>
                                  {Math.round(member.hours)}j / {member.capacity}j
                                </span>
                              </div>
                              <div className="w-full h-[8px] bg-hairline/50 rounded-full overflow-hidden relative">
                                <div className="absolute inset-y-0 right-0 w-[1px] bg-ink/10" style={{ right: "0%" }} />
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${Math.max(mPct, member.hours > 0 ? 2 : 0)}%`,
                                    backgroundColor: mIsOver ? "#ef4444" : mColor,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-md text-center text-[11px] text-ink/40 italic">
                      Belum ada staf yang ditugaskan ke Lead ini.
                    </div>
                  )}
                </div>
              </div>

              {/* Micro Stats Footer */}
              <div className="pt-xs mt-sm border-t border-hairline-soft flex items-center justify-between text-[11px] text-ink/40">
                <span>Status Approval:</span>
                {lead.reviewPendingCount > 0 ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-amber-700 bg-amber-100/80 rounded-pill px-sm py-xxs font-[540] border border-amber-200">
                    ⚠️ {lead.reviewPendingCount} Membutuhkan Review
                  </span>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-emerald-700 bg-emerald-100/80 rounded-pill px-sm py-xxs font-[540] border border-emerald-200">
                    ✓ Tidak Ada Tunggakan Review
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
