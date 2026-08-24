"use client";

interface VelocityItem {
  sprint: string;
  done: number;
  total: number;
  isActive?: boolean;
}

interface SprintVelocityChartProps {
  data?: VelocityItem[];
}

const FALLBACK_DATA: VelocityItem[] = [
  { sprint: "S1", done: 0, total: 0 },
  { sprint: "S2", done: 0, total: 0 },
];

export default function SprintVelocityChart({ data }: SprintVelocityChartProps) {
  const chartData = data && data.length > 0 ? data : FALLBACK_DATA;
  const maxTotal = Math.max(...chartData.map((d) => d.total), 1);
  const barMaxHeight = 90;
  const totalDone = chartData.reduce((s, d) => s + d.done, 0);
  const totalTasks = chartData.reduce((s, d) => s + d.total, 0);
  const avgVelocity = Math.round(totalDone / chartData.length);
  const overallCompletionPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return (
    <div className="bg-surface-soft/60 rounded-lg border border-hairline-soft p-lg flex flex-col justify-between h-full">
      {/* Header — Identical Style */}
      <div className="flex items-center justify-between mb-md">
        <div>
          <h3 className="text-[14px] font-[540] text-ink">Velocity & Trend Sprint</h3>
          <p className="text-[11px] font-[320] text-ink/40 mt-xxs">
            Rata-rata {avgVelocity} task/sprint · {totalDone}/{totalTasks} selesai ({overallCompletionPct}%)
          </p>
        </div>
        <div className="flex items-center gap-xs">
          <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-pill px-sm py-xxs font-[540]">
            🟢 SPRINT TREND
          </span>
        </div>
      </div>

      {/* Main Content Body — Bar Chart */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-end gap-xs px-xs" style={{ height: barMaxHeight + 36 }}>
          {chartData.map((d) => {
            const doneH = maxTotal > 0 ? (d.done / maxTotal) * barMaxHeight : 0;
            const notDoneH = maxTotal > 0 ? ((d.total - d.done) / maxTotal) * barMaxHeight : 0;

            return (
              <div
                key={d.sprint}
                className={`flex-1 flex flex-col items-center gap-xxs min-w-0 p-xxs rounded-md transition-all ${
                  d.isActive ? "bg-emerald-50/60 ring-1 ring-emerald-300" : "hover:bg-canvas/50"
                }`}
              >
                {/* Done count label */}
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    d.isActive ? "text-emerald-700 font-[540]" : "text-ink/50"
                  }`}
                >
                  {d.done}
                </span>

                {/* Stacked Bars */}
                <div className="w-full max-w-[28px] relative" style={{ height: barMaxHeight }}>
                  {/* Done portion (bottom) */}
                  <div
                    className="absolute bottom-0 w-full rounded-b-sm bg-emerald-500 transition-all duration-500"
                    style={{ height: Math.max(doneH, 2) }}
                    title={`${d.sprint}: ${d.done} selesai dari ${d.total}`}
                  />
                  {/* Remaining portion (top) */}
                  {notDoneH > 0 && (
                    <div
                      className="absolute w-full rounded-t-sm bg-slate-200 transition-all duration-500"
                      style={{
                        height: Math.max(notDoneH, 2),
                        bottom: doneH,
                      }}
                      title={`${d.sprint}: ${d.total - d.done} belum selesai`}
                    />
                  )}
                </div>

                {/* Sprint label */}
                <span
                  className={`text-[10px] font-mono uppercase tracking-[0.3px] ${
                    d.isActive ? "text-emerald-700 font-[540]" : "text-ink/40"
                  }`}
                >
                  {d.sprint}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Legend — Identical Style */}
      <div className="flex items-center justify-between mt-md pt-sm border-t border-hairline-soft">
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-[450] text-ink/50">Selesai</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-[11px] font-[450] text-ink/50">Belum Selesai</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-ink/40">
          Target ~{avgVelocity} Task/Sprint
        </span>
      </div>
    </div>
  );
}
