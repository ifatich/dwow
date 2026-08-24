"use client";

import { useState } from "react";

interface MetadataSectionProps {
  description?: string;
  goals?: string;
  dod?: string;
  compact?: boolean; // smaller text for card contexts
}

export default function MetadataSection({
  description,
  goals,
  dod,
  compact = false,
}: MetadataSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hasAny = description || goals || dod;

  if (!hasAny) return null;

  const textClass = compact ? "text-[12px]" : "text-[14px]";
  const labelClass = compact
    ? "text-[10px]"
    : "font-mono text-[11px] uppercase tracking-[0.54px]";

  return (
    <div className={`${compact ? "mt-sm" : "mt-lg"} border-t border-hairline-soft pt-md`}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setExpanded(!expanded);
        }}
        className={`flex items-center gap-xs ${labelClass} text-ink/35 hover:text-ink/60 transition-colors cursor-pointer`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <path
            d="M4 2l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Detail {description ? "•" : ""} {goals ? "•" : ""} {dod ? "•" : ""}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-sm space-y-sm">
          {description && (
            <div>
              <span className={`${labelClass} text-ink/30 block mb-xxs`}>
                Deskripsi
              </span>
              <p className={`${textClass} font-[320] leading-[1.45] text-ink/60`}>
                {description}
              </p>
            </div>
          )}
          {goals && (
            <div>
              <span className={`${labelClass} text-ink/30 block mb-xxs`}>
                Goals
              </span>
              <p className={`${textClass} font-[320] leading-[1.45] text-ink/60`}>
                {goals}
              </p>
            </div>
          )}
          {dod && (
            <div>
              <span className={`${labelClass} text-ink/30 block mb-xxs`}>
                Definition of Done
              </span>
              <p className={`${textClass} font-[320] leading-[1.45] text-ink/60`}>
                {dod}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
