"use client";

import { useState, useMemo, useEffect } from "react";
import { SprintGroup } from "@/features/dashboard/components/sprint-list";

interface SprintTrendChartProps {
  /** Daftar data sprint aktual dari database */
  sprints?: SprintGroup[];
  /** Sprint yang sedang dipilih pada toolbar (opsional) */
  selectedSprint?: string;
  /** Callback saat pengguna mengklik salah satu sprint */
  onSelectSprint?: (sprintName: string) => void;
  /** Status pemuatan */
  loading?: boolean;
}

export default function SprintTrendChart({
  sprints: initialSprints,
  selectedSprint,
  onSelectSprint,
  loading: externalLoading,
}: SprintTrendChartProps) {
  const [fetchedSprints, setFetchedSprints] = useState<SprintGroup[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fallback fetch jika komponen digunakan secara standalone tanpa props sprints
  useEffect(() => {
    if (!initialSprints) {
      setInternalLoading(true);
      fetch("/api/sprints")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setFetchedSprints(data);
        })
        .catch(() => {})
        .finally(() => setInternalLoading(false));
    }
  }, [initialSprints]);

  const rawSprints = initialSprints || fetchedSprints;
  const isLoading = externalLoading || (initialSprints === undefined && internalLoading);

  // Urutkan sprint secara kronologis (Ascending: Sprint 180 -> Sprint 186) untuk sumbu waktu X
  const sortedSprints = useMemo(() => {
    return [...rawSprints].sort((a, b) => {
      const na = parseInt(a.sprint.replace(/\D/g, "")) || 0;
      const nb = parseInt(b.sprint.replace(/\D/g, "")) || 0;
      return na - nb;
    });
  }, [rawSprints]);

  // Data teragregasi aktual
  const trendData = useMemo(() => {
    return sortedSprints.map((s) => {
      const total = s.totalTasks || 0;
      const done = s.doneTasks || 0;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        sprint: s.sprint,
        shortName: s.sprint.replace(/Sprint\s*/i, "S"),
        total,
        done,
        hours: Math.round(s.totalHours || 0),
        rate,
        projectsCount: s.projects?.length || 0,
        isActive: Boolean(s.isActive),
      };
    });
  }, [sortedSprints]);

  // Metrik KPI keseluruhan
  const totalCompletedTasks = useMemo(() => trendData.reduce((acc, d) => acc + d.done, 0), [trendData]);
  const totalAllTasks = useMemo(() => trendData.reduce((acc, d) => acc + d.total, 0), [trendData]);
  const totalAllHours = useMemo(() => trendData.reduce((acc, d) => acc + d.hours, 0), [trendData]);
  const overallRate = totalAllTasks > 0 ? Math.round((totalCompletedTasks / totalAllTasks) * 100) : 0;
  const avgTasksPerSprint = trendData.length > 0 ? Math.round(totalAllTasks / trendData.length) : 0;

  // Konfigurasi dimensi grafik SVG
  const w = 720;
  const h = 200;
  const pad = { top: 24, right: 30, bottom: 32, left: 44 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const maxTasks = useMemo(() => {
    if (trendData.length === 0) return 10;
    const maxVal = Math.max(...trendData.map((d) => Math.max(d.total, d.done)));
    return maxVal > 0 ? Math.ceil(maxVal * 1.15) : 10;
  }, [trendData]);

  // Koordinat titik garis Done (Hijau)
  const pointsDone = useMemo(() => {
    if (trendData.length === 0) return [];
    if (trendData.length === 1) {
      return [{
        x: pad.left + plotW / 2,
        y: pad.top + plotH - (trendData[0].done / maxTasks) * plotH,
      }];
    }
    return trendData.map((d, i) => ({
      x: pad.left + (i / (trendData.length - 1)) * plotW,
      y: pad.top + plotH - (d.done / maxTasks) * plotH,
    }));
  }, [trendData, maxTasks, pad, plotW, plotH]);

  // Koordinat titik garis Total (Abu-abu)
  const pointsTotal = useMemo(() => {
    if (trendData.length === 0) return [];
    if (trendData.length === 1) {
      return [{
        x: pad.left + plotW / 2,
        y: pad.top + plotH - (trendData[0].total / maxTasks) * plotH,
      }];
    }
    return trendData.map((d, i) => ({
      x: pad.left + (i / (trendData.length - 1)) * plotW,
      y: pad.top + plotH - (d.total / maxTasks) * plotH,
    }));
  }, [trendData, maxTasks, pad, plotW, plotH]);

  const lineDone = pointsDone.map((p) => `${p.x},${p.y}`).join(" ");
  const lineTotal = pointsTotal.map((p) => `${p.x},${p.y}`).join(" ");

  // Gradient area di bawah kurva Done
  const areaDone = useMemo(() => {
    if (pointsDone.length < 2) return "";
    const firstX = pointsDone[0].x;
    const lastX = pointsDone[pointsDone.length - 1].x;
    const baselineY = pad.top + plotH;
    return `${lineDone} ${lastX},${baselineY} ${firstX},${baselineY}`;
  }, [pointsDone, lineDone, pad, plotH]);

  if (isLoading) {
    return (
      <div className="bg-canvas border border-hairline rounded-2xl p-xxl animate-pulse space-y-lg">
        <div className="h-6 w-48 bg-surface-soft rounded-md" />
        <div className="grid grid-cols-4 gap-md">
          <div className="h-20 bg-surface-soft rounded-xl" />
          <div className="h-20 bg-surface-soft rounded-xl" />
          <div className="h-20 bg-surface-soft rounded-xl" />
          <div className="h-20 bg-surface-soft rounded-xl" />
        </div>
        <div className="h-48 bg-surface-soft rounded-xl" />
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className="bg-canvas border border-hairline rounded-2xl p-xxl text-center py-xxxl">
        <div className="w-12 h-12 rounded-full bg-surface-soft flex items-center justify-center mx-auto mb-md text-ink/40">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <h3 className="text-[16px] font-[550] text-ink">Belum Ada Data Tren Sprint</h3>
        <p className="text-[13px] font-[320] text-ink/40 mt-1 max-w-[420px] mx-auto">
          Tidak ditemukan riwayat sprint yang sesuai dengan filter yang dipilih saat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-canvas border border-hairline rounded-2xl p-xxl shadow-2xs space-y-xl">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md pb-md border-b border-hairline/80">
        <div>
          <div className="flex items-center gap-xs">
            <h3 className="text-[18px] font-[550] text-ink tracking-tight">Tren Performa Sprint</h3>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-[500] bg-blue-50 text-blue-700 border border-blue-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Data Aktual Database
            </span>
          </div>
          <p className="text-[13px] font-[320] text-ink/40 mt-0.5">
            Analisis historis beban kerja, tingkat penyelesaian task, dan kapasitas sprint.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-md text-[12px] font-[450] text-ink/60 bg-surface-soft/40 px-md py-1.5 rounded-lg border border-hairline/60">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
            <span>Task Selesai</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 border-t-2 border-dashed border-slate-400" />
            <span>Total Task</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <div className="bg-surface-soft/30 border border-hairline rounded-xl p-md">
          <span className="text-[11px] font-[540] text-ink/40 uppercase tracking-wider block mb-1">
            Tingkat Selesai
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[24px] font-[600] text-emerald-600 tracking-tight">{overallRate}%</span>
            <span className="text-[12px] text-ink/40 font-mono">avg</span>
          </div>
        </div>

        <div className="bg-surface-soft/30 border border-hairline rounded-xl p-md">
          <span className="text-[11px] font-[540] text-ink/40 uppercase tracking-wider block mb-1">
            Total Task Selesai
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-[600] text-ink tracking-tight">{totalCompletedTasks}</span>
            <span className="text-[13px] text-ink/40 font-mono">/ {totalAllTasks}</span>
          </div>
        </div>

        <div className="bg-surface-soft/30 border border-hairline rounded-xl p-md">
          <span className="text-[11px] font-[540] text-ink/40 uppercase tracking-wider block mb-1">
            Total Jam Kerja
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-[600] text-ink tracking-tight">{totalAllHours}</span>
            <span className="text-[12px] text-ink/40 font-mono">jam</span>
          </div>
        </div>

        <div className="bg-surface-soft/30 border border-hairline rounded-xl p-md">
          <span className="text-[11px] font-[540] text-ink/40 uppercase tracking-wider block mb-1">
            Rata-rata Task
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-[600] text-ink tracking-tight">{avgTasksPerSprint}</span>
            <span className="text-[12px] text-ink/40 font-mono">task/sprint</span>
          </div>
        </div>
      </div>

      {/* Single Sprint Special Visualization or Multi-sprint Curve */}
      {trendData.length === 1 ? (
        <div className="bg-surface-soft/20 border border-hairline/80 rounded-xl p-xl space-y-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="text-[16px] font-[550] text-ink">{trendData[0].sprint}</span>
                {trendData[0].isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-[540] bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Sprint Aktif
                  </span>
                )}
              </div>
              <p className="text-[12px] text-ink/50 mt-0.5">
                {trendData[0].projectsCount} Proyek Aktif · {trendData[0].hours} Jam Kerja Total
              </p>
            </div>

            <div className="text-right">
              <span className="text-[28px] font-[600] text-ink tracking-tight">
                {trendData[0].done}
                <span className="text-[16px] font-normal text-ink/40 font-mono"> / {trendData[0].total} Task</span>
              </span>
              <span className="block text-[11px] text-emerald-600 font-[500]">
                {trendData[0].rate}% Selesai
              </span>
            </div>
          </div>

          {/* Progress bar visual */}
          <div className="w-full bg-surface-soft h-3 rounded-full overflow-hidden border border-hairline/60">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(trendData[0].rate, 2)}%` }}
            />
          </div>

          <div className="p-md rounded-lg bg-blue-50/60 border border-blue-100 flex items-start gap-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-[12px] text-blue-900 leading-relaxed font-[400]">
              Database saat ini mencatat data dari <strong>{trendData[0].sprint}</strong> ({trendData[0].total} task, {trendData[0].hours} jam beban kerja). Grafik garis kurva komparasi multi-sprint akan terproyeksikan secara otomatis seiring tersimpannya riwayat sprint berikutnya.
            </p>
          </div>
        </div>
      ) : (
        /* Multi-Sprint Line Chart */
        <div className="relative bg-surface-soft/10 border border-hairline/60 rounded-xl p-md">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible select-none">
            <defs>
              <linearGradient id="trendDoneGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = pad.top + plotH * (1 - frac);
              const val = Math.round(maxTasks * frac);
              return (
                <g key={frac}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={w - pad.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={pad.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[9px]"
                    fill="#94a3b8"
                    fontFamily="Geist Mono, monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Area fill under Done line */}
            {areaDone && (
              <polygon
                points={areaDone}
                fill="url(#trendDoneGradient)"
              />
            )}

            {/* Total line (Dashed Slate) */}
            <polyline
              points={lineTotal}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.8"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Done line (Solid Emerald) */}
            <polyline
              points={lineDone}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points & Hover Triggers */}
            {trendData.map((d, i) => {
              const ptDone = pointsDone[i];
              const ptTotal = pointsTotal[i];
              if (!ptDone || !ptTotal) return null;

              const isHovered = hoveredIndex === i;
              const isSelected = selectedSprint === d.sprint;

              return (
                <g
                  key={d.sprint}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onSelectSprint?.(d.sprint)}
                  className="cursor-pointer"
                >
                  {/* Vertical guide line on hover */}
                  {isHovered && (
                    <line
                      x1={ptDone.x}
                      y1={pad.top}
                      x2={ptDone.x}
                      y2={pad.top + plotH}
                      stroke="#10b981"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.6"
                    />
                  )}

                  {/* Total Dot */}
                  <circle
                    cx={ptTotal.x}
                    cy={ptTotal.y}
                    r={isHovered ? 4.5 : 3.5}
                    fill="#fff"
                    stroke="#94a3b8"
                    strokeWidth="1.8"
                  />

                  {/* Done Dot */}
                  <circle
                    cx={ptDone.x}
                    cy={ptDone.y}
                    r={isHovered || isSelected ? 5.5 : 4}
                    fill="#10b981"
                    stroke="#fff"
                    strokeWidth="2"
                    className="transition-all"
                  />

                  {/* Selection Ring */}
                  {isSelected && (
                    <circle
                      cx={ptDone.x}
                      cy={ptDone.y}
                      r="9"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      opacity="0.5"
                    />
                  )}

                  {/* X-axis label */}
                  <text
                    x={ptDone.x}
                    y={h - 8}
                    textAnchor="middle"
                    className={`text-[10px] transition-colors ${
                      isSelected || isHovered ? "font-[600] fill-primary" : "font-[450] fill-ink/50"
                    }`}
                    fontFamily="Geist Mono, monospace"
                  >
                    {d.shortName}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip Card */}
          {hoveredIndex !== null && trendData[hoveredIndex] && (
            <div
              className="absolute pointer-events-none bg-canvas border border-hairline rounded-lg shadow-xl px-md py-sm text-[12px] z-20 animate-scale-in"
              style={{
                left: `${Math.min(Math.max((pointsDone[hoveredIndex]?.x || 0) - 60, 10), w - 160)}px`,
                top: "12px",
              }}
            >
              <div className="font-[600] text-ink flex items-center gap-1.5">
                <span>{trendData[hoveredIndex].sprint}</span>
                {trendData[hoveredIndex].isActive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Aktif
                  </span>
                )}
              </div>
              <div className="text-ink/60 mt-1 space-y-0.5 text-[11px]">
                <div>
                  Task: <span className="font-semibold text-emerald-600">{trendData[hoveredIndex].done}</span> / {trendData[hoveredIndex].total} ({trendData[hoveredIndex].rate}%)
                </div>
                <div>
                  Beban Kerja: <span className="font-semibold text-ink">{trendData[hoveredIndex].hours} Jam</span>
                </div>
                <div>
                  Proyek: <span className="font-semibold text-ink">{trendData[hoveredIndex].projectsCount} Proyek</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabel Rincian Data Aktual Tiap Sprint */}
      <div className="space-y-sm pt-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-[14px] font-[550] text-ink">Rincian Performa per Sprint</h4>
          <span className="text-[11px] font-[320] text-ink/40">
            {trendData.length} Sprint Terdata
          </span>
        </div>

        <div className="overflow-x-auto border border-hairline/80 rounded-xl">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-soft/40 border-b border-hairline/70 text-[11px] font-[540] uppercase tracking-wider text-ink/50">
              <tr>
                <th className="py-2.5 px-md">Sprint</th>
                <th className="py-2.5 px-md">Status</th>
                <th className="py-2.5 px-md">Proyek</th>
                <th className="py-2.5 px-md">Task Selesai</th>
                <th className="py-2.5 px-md">Persentase</th>
                <th className="py-2.5 px-md text-right">Beban Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/60">
              {trendData.map((item) => {
                const isSelected = selectedSprint === item.sprint;
                return (
                  <tr
                    key={item.sprint}
                    onClick={() => onSelectSprint?.(item.sprint)}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? "bg-primary/5 font-[500]" : "hover:bg-surface-soft/40"
                    }`}
                  >
                    <td className="py-3 px-md font-[540] text-ink flex items-center gap-1.5">
                      <span>{item.sprint}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </td>
                    <td className="py-3 px-md">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-[540] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-[450] bg-slate-50 text-slate-600 border border-slate-200">
                          Arsip
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-md text-ink/70">
                      {item.projectsCount} Proyek
                    </td>
                    <td className="py-3 px-md">
                      <span className="font-[540] text-ink">{item.done}</span>
                      <span className="text-ink/40"> / {item.total}</span>
                    </td>
                    <td className="py-3 px-md">
                      <div className="flex items-center gap-2 max-w-[140px]">
                        <div className="flex-1 bg-surface-soft h-2 rounded-full overflow-hidden border border-hairline/60">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${item.rate}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-ink/60 w-8 text-right">
                          {item.rate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-md text-right font-mono text-ink/80">
                      {item.hours} jam
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
