"use client";

import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-xxl px-xl text-center">
      {icon && <div className="text-[48px] text-ink/15 mb-lg">{icon}</div>}
      <h3 className="text-[16px] font-[540] text-ink/50 mb-xs">{title}</h3>
      {description && <p className="text-[13px] text-ink/30 max-w-[320px] mb-lg">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="h-[36px] rounded-pill px-lg text-[12px] font-[480] bg-primary text-on-primary hover:opacity-90 cursor-pointer transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
