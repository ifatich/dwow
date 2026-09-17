"use client";

import { useDroppable } from "@dnd-kit/core";
import { Column, Task } from "@/lib/types";
import SortableTaskCard from "./sortable-task-card";

const COLUMN_ACCENT: Record<Column["id"], { bar: string; bg: string; label: string }> = {
  todo: { bar: "bg-hairline", bg: "bg-surface-soft/50", label: "To Do" },
  "in-progress": { bar: "bg-blue-500", bg: "bg-blue-50/40", label: "In Progress" },
  review: { bar: "bg-amber-500", bg: "bg-amber-50/40", label: "Review" },
  done: { bar: "bg-green-500", bg: "bg-green-50/40", label: "Done" },
};

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  isInvalidDrop?: boolean | null;
  isActiveDrag?: boolean | null;
  currentUser?: string;
}

export default function KanbanColumn({
  column,
  tasks,
  isInvalidDrop,
  isActiveDrag,
  currentUser,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const accent = COLUMN_ACCENT[column.id];

  return (
    <div className="flex flex-col flex-1 min-w-[280px]">
      {/* Column header */}
      <div className={`${accent.bg} rounded-t-lg`}>
        <div className={`h-[3px] ${accent.bar} rounded-t-lg`} />
        <div className="flex items-center justify-between px-lg py-md">
          <h2 className="text-[18px] font-[540] leading-[1.35] tracking-[-0.26px] text-ink">
            {accent.label}
          </h2>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-canvas border border-hairline text-[12px] font-[450] text-ink/50">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task list — droppable area */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-sm p-sm rounded-b-lg min-h-[200px] transition-colors duration-200 cursor-default ${
          isInvalidDrop
            ? "bg-red-50/70 ring-2 ring-red-300 ring-inset"
            : isOver && isActiveDrag && !isInvalidDrop
              ? "bg-primary/5 ring-2 ring-primary/20 ring-inset"
              : "bg-surface-soft/30"
        }`}
      >
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[14px] text-ink/25 font-[320] italic">
            {isInvalidDrop
              ? "Tidak diizinkan"
              : isOver
                ? "Drop here"
                : "No tasks"}
          </div>
        ) : (
          tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
}
