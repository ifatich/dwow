"use client";

import { ReactNode } from "react";

/** Props for the Tooltip component. */
export interface TooltipProps {
  /** Text content displayed inside the tooltip popover. */
  content: string;
  /** Children node wrapped by the tooltip trigger. */
  children: ReactNode;
  /** Preferred tooltip position relative to trigger. Defaults to 'top'. */
  position?: "top" | "bottom";
}

/**
 * Tooltip Component (`tooltip.tsx`)
 *
 * Lightweight, pure CSS Tailwind-styled tooltip trigger.
 * Renders an accessible overlay on hover without heavy third-party dependencies.
 */
export default function Tooltip({ content, children, position = "top" }: TooltipProps) {
  if (!content) return <>{children}</>;

  const positionClasses =
    position === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-xs"
      : "top-full left-1/2 -translate-x-1/2 mt-xs";

  return (
    <div className="relative group/tooltip inline-flex items-center cursor-help">
      {children}
      <div
        role="tooltip"
        className={`absolute hidden group-hover/tooltip:block z-50 px-md py-xs text-[11px] font-[450] leading-snug text-canvas bg-ink rounded-md shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-150 animate-in fade-in ${positionClasses}`}
      >
        {content}
        <div
          className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
            position === "top"
              ? "top-full border-t-ink"
              : "bottom-full border-b-ink"
          }`}
        />
      </div>
    </div>
  );
}
