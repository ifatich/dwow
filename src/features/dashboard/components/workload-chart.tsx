"use client";

import { Task } from "@/lib/types";
import { getStaffColor } from "@/app/individual-metrics/page";

interface WorkloadEntry { username: string; name: string; role?: string; hours: number; capacity: number; }
type WorkloadInput = Task[] | WorkloadEntry[];

interface WorkloadChartProps {
  tasks: WorkloadInput;
  currentUser?: string;
  maxCapacity?: number;
}

export default function WorkloadChart({ tasks, currentUser, maxCapacity }: WorkloadChartProps) {
  // Accept both Task[] and WorkloadEntry[]
  let entries: { username: string; name: string; role?: string; hours: number; capacity: number }[];

  if (Array.isArray(tasks) && tasks.length > 0 && "username" in tasks[0]) {
    // New format: WorkloadEntry[]
    const wl = tasks as WorkloadEntry[];
    entries = wl
      .filter((w) => !currentUser || w.username === currentUser)
      .map((w) => {
        const cap = w.capacity || 72;
        return { username: w.username, name: w.name, role: w.role, hours: w.hours, capacity: cap };
      });
  } else {
    // Old format: Task[]
    const taskList = tasks as Task[];
    const staffHours: Record<string, number> = {};
    taskList.forEach((task) => {
      task.subtasks.forEach((sub) => {
        const perPerson = sub.assignees.length > 0 ? sub.workloadHours / sub.assignees.length : sub.workloadHours;
        sub.assignees.forEach((name) => {
          if (!currentUser || name.toLowerCase() === currentUser.toLowerCase()) {
            staffHours[name] = (staffHours[name] || 0) + perPerson;
          }
        });
      });
    });
    entries = Object.entries(staffHours)
      .sort((a, b) => b[1] - a[1])
      .map(([name, hours]) => ({ username: name.toLowerCase(), name, hours, capacity: maxCapacity || 80 }));
  }

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const cap = maxCapacity || entries[0]?.capacity || 72;

  return (
    <div className="bg-surface-soft/60 rounded-lg border border-hairline-soft p-lg">
      <div className="mb-lg">
        <h3 className="text-[14px] font-[540] text-ink">Beban Kerja per Staff</h3>
        <p className="text-[11px] font-[320] text-ink/35 mt-xxs">
          Total {Math.round(totalHours)} jam estimasi · {entries.length} staff & lead · Kapasitas {cap}j/sprint
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="py-xl px-md text-center flex flex-col items-center justify-center border border-dashed border-hairline/80 rounded-lg bg-white/40 my-xs">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-xs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="text-[13px] font-[550] text-ink">Belum Ada Penugasan Beban Kerja Staff</p>
          <p className="text-[11px] text-ink/40 mt-[2px] max-w-[340px]">
            Subtask pada Sprint aktif ini belum ditugaskan ke staf atau jam estimasi pekerjaan belum diinput.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-xl gap-y-md max-h-[360px] overflow-y-auto pr-xs">
          {entries.map((e) => {
            const pct = Math.min(100, (e.hours / e.capacity) * 100);
            const isOver = e.hours > e.capacity;
            const color = getStaffColor(e.username || e.name);

            return (
              <div key={e.username || e.name} className="flex items-center gap-sm">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                  <span className="text-[8px] font-[540] text-white leading-none">{e.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-xxs">
                    <div className="flex items-center gap-xs truncate">
                      <span className="text-[12px] font-[450] text-ink/80 capitalize truncate">{e.name}</span>
                      {e.role && (
                        <span className="text-[9px] font-mono uppercase tracking-[0.5px] text-ink/35 bg-surface-soft px-xs py-[1px] rounded flex-shrink-0">
                          {e.role}
                        </span>
                      )}
                    </div>
                    <span className={`text-[12px] font-[540] tabular-nums ml-sm flex-shrink-0 ${isOver ? "text-red-500 font-[600]" : "text-ink"}`}>
                      {Math.round(e.hours)}j / {e.capacity}j
                    </span>
                  </div>
                  <div className="w-full h-[8px] bg-hairline/50 rounded-full overflow-hidden relative">
                    {/* Max capacity line */}
                    <div className="absolute inset-y-0 right-0 w-[1px] bg-ink/10" style={{ right: "0%" }} />
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(pct, e.hours > 0 ? 2 : 0)}%`,
                        backgroundColor: isOver ? "#ef4444" : color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
