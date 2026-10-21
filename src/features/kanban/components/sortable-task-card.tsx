"use client";

import { useDraggable } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types";
import TaskCard from "./task-card";

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

interface SortableTaskCardProps {
  task: Task;
  currentUser?: string;
}

function isUserAssignee(task: Task, user?: string): boolean {
  if (!user) return true; // super admin fallback
  // Staff: cek apakah user adalah salah satu assignee di subtask mana pun
  return task.subtasks.some((s) =>
    s.assignees.some((a) => a.toLowerCase() === user.toLowerCase())
  );
}

export default function SortableTaskCard({
  task,
  currentUser,
}: SortableTaskCardProps) {
  const router = useRouter();
  const sessionUser = useCurrentUser();
  
  const userRole = sessionUser?.role;
  const currentUsername = sessionUser?.username || currentUser;
  
  const isManagerOrAdmin =
    userRole === "super_admin" ||
    userRole === "kadep" ||
    userRole === "kadiv" ||
    currentUsername?.toLowerCase() === "admin";

  const isCurrentTaskLead = !!(
    task.lead &&
    ((currentUsername && task.lead.toLowerCase() === currentUsername.toLowerCase()) ||
     (sessionUser?.name && task.lead.toLowerCase() === sessionUser.name.toLowerCase()))
  );

  const isAuthorizedLeadOrAdmin = isManagerOrAdmin || (userRole === "lead" && isCurrentTaskLead);

  // Lead hanya bisa menggeser tiket yang dia pegang / tanggung jawabnya.
  // Staff/Assignee hanya bisa menggeser jika terlibat dalam subtask.
  const canDrag = isAuthorizedLeadOrAdmin || (userRole !== "lead" && isUserAssignee(task, currentUsername)) || (userRole === "lead" && isUserAssignee(task, currentUsername));

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { task },
      disabled: !canDrag,
    });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  const handleClick = () => {
    if (!isDragging) {
      router.push(`/project/${task.projectId}/task/${task.id}`);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
      suppressHydrationWarning
      className={`${canDrag ? "touch-none cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${isDragging ? "opacity-40" : ""}`}
    >
      <TaskCard
        task={task}
        currentUser={currentUsername}
      />
    </div>
  );
}
