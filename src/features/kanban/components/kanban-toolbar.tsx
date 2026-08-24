"use client";

import { TaskPriority } from "@/lib/types";

export interface KanbanFilters {
  search: string;
  priority: TaskPriority | "all";
  assignee: string;
}

interface KanbanToolbarProps {
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  assignees: string[];
}

const PRIORITY_OPTIONS: { value: TaskPriority | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function KanbanToolbar({
  filters,
  onFiltersChange,
  assignees,
}: KanbanToolbarProps) {
  const update = (partial: Partial<KanbanFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.priority !== "all" ||
    filters.assignee !== "";

  return (
    <div className="flex items-center gap-md flex-wrap">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-[360px]">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="absolute left-sm top-1/2 -translate-y-1/2 text-ink/25"
        >
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Cari tugas atau tiket..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full h-[40px] pl-xxl pr-md rounded-md border border-hairline bg-canvas text-[14px] font-[450] text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 transition-colors"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => update({ search: "" })}
            className="absolute right-sm top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface-soft flex items-center justify-center hover:bg-hairline transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Priority filter pills */}
      <div className="flex items-center gap-xxs">
        {PRIORITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update({ priority: opt.value })}
            className={`h-[32px] rounded-pill px-sm text-[12px] font-[480] transition-colors ${
              filters.priority === opt.value
                ? "bg-primary text-on-primary"
                : "bg-surface-soft text-ink/50 hover:text-ink/70 hover:bg-hairline"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Assignee filter dropdown */}
      {assignees.length > 0 && (
        <select
          value={filters.assignee}
          onChange={(e) => update({ assignee: e.target.value })}
          className="h-[40px] px-md rounded-md border border-hairline bg-canvas text-[14px] font-[450] text-ink focus:outline-none focus:border-ink/30 transition-colors cursor-pointer appearance-none pr-xxl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23000' stroke-opacity='0.4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
          }}
        >
          <option value="">Semua Staff</option>
          {assignees.map((a) => (
            <option key={a} value={a}>
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </option>
          ))}
        </select>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() =>
            onFiltersChange({ search: "", priority: "all", assignee: "" })
          }
          className="h-[32px] rounded-pill px-sm text-[12px] font-[480] text-ink/40 hover:text-ink/60 hover:bg-surface-soft transition-colors"
        >
          Reset Filter
        </button>
      )}
    </div>
  );
}
