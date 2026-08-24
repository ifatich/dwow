"use client";

import { Task } from "@/lib/types";
import type { CurrentUser } from "@/features/auth/hooks/use-current-user";

export type MockRole = "all" | "staff" | "lead" | "kadep";

interface RoleFilterProps {
  role: MockRole;
  onChange: (role: MockRole) => void;
  variant?: "light" | "dark";
}

const ROLE_OPTIONS: { value: MockRole; label: string; desc: string }[] = [
  { value: "all", label: "Super Admin", desc: "Lihat semua" },
  { value: "kadep", label: "Kadep/Kadiv", desc: "Lintas departemen" },
  { value: "lead", label: "Lead", desc: "Staff di bawah supervisi" },
  { value: "staff", label: "Staff", desc: "Task milik sendiri" },
];

/**
 * Filter tasks berdasarkan role dari session.
 * @param tasks — daftar task
 * @param role — role yang dipilih di DevModeBar
 * @param currentUser — user dari session (useCurrentUser)
 */
export function filterTasksByRole(
  tasks: Task[],
  role: MockRole,
  currentUser?: CurrentUser | null
): Task[] {
  if (role === "all") return tasks;

  const username = currentUser?.username || "";

  if (role === "staff") {
    // Staff: task di mana user adalah salah satu assignee di subtask mana pun
    return tasks.filter((t) =>
      t.subtasks.some((s) => s.assignees.includes(username))
    );
  }
  if (role === "lead") {
    // Lead: task di mana lead === user
    return tasks.filter((t) => t.lead === username);
  }
  if (role === "kadep") {
    // Kadep: semua task (read-only)
    return tasks;
  }
  return tasks;
}

export default function RoleFilter({ role, onChange, variant = "light" }: RoleFilterProps) {
  const isDark = variant === "dark";

  return (
    <div className="flex items-center gap-xs">
      {!isDark && (
        <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/30 mr-xs">
          Lihat sebagai
        </span>
      )}
      {ROLE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={opt.desc}
          className={`h-[30px] rounded-pill px-sm text-[11px] font-[480] transition-colors cursor-pointer ${
            role === opt.value
              ? "bg-primary text-on-primary"
              : isDark
                ? "text-white/40 hover:text-white/70 hover:bg-white/10"
                : "bg-surface-soft text-ink/40 hover:text-ink/60 hover:bg-hairline"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
