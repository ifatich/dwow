"use client";

const TREND_DATA = [
  { sprint: "S1", done: 3, total: 5, hours: 42 },
  { sprint: "S2", done: 5, total: 7, hours: 55 },
  { sprint: "S3", done: 4, total: 5, hours: 38 },
  { sprint: "S4", done: 8, total: 8, hours: 60 },
  { sprint: "S5", done: 3, total: 6, hours: 44 },
  { sprint: "S6", done: 6, total: 9, hours: 72 },
  { sprint: "S7", done: 5, total: 7, hours: 48 },
  { sprint: "S8", done: 7, total: 8, hours: 65 },
  { sprint: "S9", done: 7, total: 8, hours: 52 },
  { sprint: "S10", done: 4, total: 6, hours: 52 },
];

export default function SprintTrendChart() {
  const w = 600;
  const h = 180;
  const pad = { top: 20, right: 10, bottom: 24, left: 36 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const maxDone = Math.max(...TREND_DATA.map((d) => d.done));
  const maxTotal = Math.max(...TREND_DATA.map((d) => d.total));

  const pointsDone = TREND_DATA.map((d, i) => ({
    x: pad.left + (i / (TREND_DATA.length - 1)) * plotW,
    y: pad.top + plotH - (d.done / Math.max(maxDone, 1)) * plotH,
  }));

  const pointsTotal = TREND_DATA.map((d, i) => ({
    x: pad.left + (i / (TREND_DATA.length - 1)) * plotW,
    y: pad.top + plotH - (d.total / Math.max(maxTotal, 1)) * plotH,
  }));

  const lineDone = pointsDone.map((p) => `${p.x},${p.y}`).join(" ");
  const lineTotal = pointsTotal.map((p) => `${p.x},${p.y}`).join(" ");

  const avgDone = Math.round(TREND_DATA.reduce((s, d) => s + d.done, 0) / TREND_DATA.length);
  const totalCompleted = TREND_DATA.reduce((s, d) => s + d.done, 0);
  const totalAll = TREND_DATA.reduce((s, d) => s + d.total, 0);

  return (
    <div className="bg-surface-soft/60 rounded-lg border border-hairline-soft p-lg">
      <div className="flex items-center justify-between mb-md">
        <div>
          <h3 className="text-[14px] font-[540] text-ink">Tren 10 Sprint</h3>
          <p className="text-[11px] font-[320] text-ink/35 mt-xxs">
            Rata-rata {avgDone} task/sprint · {totalCompleted}/{totalAll} selesai
          </p>
        </div>
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = pad.top + plotH * (1 - frac);
          return (
            <g key={frac}>
              <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#e5e5e5" strokeWidth="0.5" />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" className="text-[9px]" fill="#999" fontFamily="Geist Mono, monospace">
                {Math.round(Math.max(maxDone, maxTotal) * frac)}
              </text>
            </g>
          );
        })}

        {/* Total line (gray, dashed) */}
        <polyline
          points={lineTotal}
          fill="none"
          stroke="#d4d4d4"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Done line (green) */}
        <polyline
          points={lineDone}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Done dots */}
        {pointsDone.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#22c55e" strokeWidth="1.5" />
        ))}

        {/* X-axis labels */}
        {TREND_DATA.map((d, i) => {
          const x = pad.left + (i / (TREND_DATA.length - 1)) * plotW;
          return (
            <text key={i} x={x} y={h - 4} textAnchor="middle" className="text-[8px]" fill="#999" fontFamily="Geist Mono, monospace">
              {d.sprint}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-md mt-md pt-md border-t border-hairline-soft">
        <div className="flex items-center gap-xs">
          <div className="w-4 h-0.5 bg-green-500 rounded-full" />
          <span className="text-[11px] font-[450] text-ink/50">Selesai</span>
        </div>
        <div className="flex items-center gap-xs">
          <div className="w-4 h-0.5 bg-gray-300 rounded-full" style={{ borderTop: "1px dashed #d4d4d4" }} />
          <span className="text-[11px] font-[450] text-ink/50">Total</span>
        </div>
      </div>
    </div>
  );
}
