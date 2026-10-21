"use client";

import React from "react";
import SectionSettingsButton from "./section-settings-button";

interface SectionHiddenPlaceholderProps {
  title: string;
  onOpenSettings: () => void;
  className?: string;
}

export default function SectionHiddenPlaceholder({
  title,
  onOpenSettings,
  className = "",
}: SectionHiddenPlaceholderProps) {
  return (
    <div
      className={`mb-xxl p-md rounded-xl border border-dashed border-hairline bg-surface-soft/40 flex items-center justify-between gap-md transition-colors hover:border-hairline-strong ${className}`}
    >
      <div className="flex items-center gap-sm">
        <div className="w-7 h-7 rounded-lg bg-surface-soft border border-hairline flex items-center justify-center text-ink/40">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </div>
        <div>
          <h4 className="text-[12px] font-[540] text-ink/70">
            Section <span className="font-[600] text-ink">{title}</span> disembunyikan
          </h4>
          <p className="text-[11px] font-[320] text-ink/40">
            Section ini tidak ditampilkan untuk role Anda berdasarkan konfigurasi dashboard.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-xs">
        <button
          type="button"
          onClick={onOpenSettings}
          className="h-[30px] px-sm rounded-lg border border-hairline bg-canvas hover:bg-surface-soft text-[11px] font-[500] text-ink/70 transition-colors flex items-center gap-xs cursor-pointer shadow-2xs"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Atur Tampilan</span>
        </button>
      </div>
    </div>
  );
}
