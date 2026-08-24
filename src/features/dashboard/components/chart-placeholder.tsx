interface ChartPlaceholderProps {
  title: string;
  subtitle?: string;
  height?: string;
}

export default function ChartPlaceholder({
  title,
  subtitle,
  height = "h-[200px]",
}: ChartPlaceholderProps) {
  return (
    <div className="bg-surface-soft/60 rounded-lg border border-hairline-soft p-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-md">
        <div>
          <h3 className="text-[14px] font-[540] text-ink">{title}</h3>
          {subtitle && (
            <p className="text-[11px] font-[320] text-ink/35 mt-xxs">
              {subtitle}
            </p>
          )}
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.54px] text-ink/25 bg-surface-soft rounded-pill px-sm py-xxs">
          Data Tiruan
        </span>
      </div>

      {/* Placeholder bars */}
      <div className={`${height} flex items-end gap-xs px-sm`}>
        {[65, 40, 80, 55, 70, 35, 60, 50, 75, 45].map((pct, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-xxs">
            <div
              className="w-full rounded-t-sm bg-hairline transition-all duration-500"
              style={{ height: `${pct}%` }}
            />
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-sm mt-sm">
        {["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"].map(
          (label) => (
            <span
              key={label}
              className="text-[9px] font-[320] text-ink/25 tabular-nums"
            >
              {label}
            </span>
          )
        )}
      </div>
    </div>
  );
}
