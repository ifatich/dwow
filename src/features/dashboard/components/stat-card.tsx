interface StatCardProps {
  label: string;
  value: number | string;
  accent?: "default" | "blue" | "amber" | "green" | "red";
  subtitle?: string;
}

const ACCENT_STYLES = {
  default: { bg: "bg-surface-soft", bar: "bg-ink/20" },
  blue: { bg: "bg-blue-50/60", bar: "bg-blue-400" },
  amber: { bg: "bg-amber-50/60", bar: "bg-amber-400" },
  green: { bg: "bg-green-50/60", bar: "bg-green-400" },
  red: { bg: "bg-red-50/60", bar: "bg-red-400" },
};

export default function StatCard({
  label,
  value,
  accent = "default",
  subtitle,
}: StatCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div className={`${styles.bg} rounded-lg p-lg border border-hairline-soft`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40">
            {label}
          </span>
          <div className="text-[32px] font-[340] leading-[1.1] tracking-[-0.48px] text-ink mt-xs">
            {value}
          </div>
        </div>
        <div className={`w-[3px] h-[36px] rounded-full ${styles.bar}`} />
      </div>
      {subtitle && (
        <p className="text-[11px] font-[320] text-ink/35 mt-sm">{subtitle}</p>
      )}
    </div>
  );
}
