"use client";

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";

export interface CustomDropdownOption {
  value: string;
  label: string;
  badge?: string;
  icon?: ReactNode;
}

export interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomDropdownOption[];
  label?: string;
  placeholder?: string;
  allOptionLabel?: string;
  allOptionValue?: string;
  minWidth?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Standardized Custom Dropdown matching TaskForge design system.
 * Replaces native <select> elements across toolbars and dialogs.
 */
export default function CustomDropdown({
  value,
  onChange,
  options,
  label,
  placeholder = "Pilih...",
  allOptionLabel,
  allOptionValue = "",
  minWidth = "160px",
  searchable = false,
  searchPlaceholder = "Cari...",
  disabled = false,
  className = "",
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Selected label calculation
  const currentLabel = useMemo(() => {
    if (allOptionLabel && (value === allOptionValue || !value)) {
      return allOptionLabel;
    }
    const found = options.find((opt) => opt.value === value);
    if (found) return found.label;
    if (value) return value;
    return placeholder;
  }, [value, options, allOptionLabel, allOptionValue, placeholder]);

  // Filtered options based on search
  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchable, search]);

  const isAllSelected = value === allOptionValue || !value;

  const isFullWidth = className.includes("w-full") || className.includes("flex-1");

  return (
    <div ref={dropdownRef} className={`relative flex items-center gap-xs ${className}`}>
      {label && <label className="text-[12px] font-[450] text-ink/50 select-none flex-shrink-0">{label}</label>}

      <div className={`relative ${isFullWidth ? "flex-1 w-full" : ""}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          style={{ minWidth: isFullWidth ? undefined : minWidth }}
          className={`h-[34px] px-md rounded-md border border-hairline bg-surface-soft text-[13px] font-[480] text-ink focus:outline-none focus:border-ink/30 cursor-pointer flex items-center justify-between gap-sm text-left transition-colors ${
            isFullWidth ? "w-full" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-hairline-soft"}`}
        >
          <span className="truncate">{currentLabel}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            className={`text-ink/40 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isOpen && (
          <div
            style={{ minWidth: `max(${minWidth}, 180px)` }}
            className="absolute z-50 left-0 mt-xs max-h-[280px] overflow-y-auto bg-white border border-hairline/80 rounded-md shadow-xl p-xs space-y-[2px] animate-scale-in"
          >
            {searchable && (
              <div className="p-xs px-sm border-b border-hairline/60 bg-surface-soft/40 backdrop-blur-md sticky top-0 z-10 mb-xs">
                <div className="relative flex items-center">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="absolute left-2.5 text-ink/35 pointer-events-none">
                    <path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM12 12l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-[12px] bg-white border border-hairline rounded-md focus:outline-none focus:border-ink/40 text-ink placeholder:text-ink/30 transition-all shadow-xs"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearch("");
                      }}
                      className="absolute right-2 text-ink/30 hover:text-ink text-[12px] cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {allOptionLabel && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange(allOptionValue);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-sm py-1.5 rounded-md text-[13px] font-[480] hover:bg-surface-soft/70 cursor-pointer transition-all flex items-center justify-between gap-sm ${
                    isAllSelected ? "text-ink font-[540] bg-surface-soft/60" : "text-ink/70"
                  }`}
                >
                  <span>{allOptionLabel}</span>
                  {isAllSelected && (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="text-ink flex-shrink-0">
                      <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="my-xs border-t border-hairline-soft" />
              </>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-md py-sm text-[12px] text-ink/40 text-center italic">Tidak ada opsi</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-sm py-1.5 rounded-md text-[13px] font-[480] hover:bg-surface-soft/70 cursor-pointer transition-all flex items-center justify-between gap-sm ${
                      isSelected ? "text-ink font-[540] bg-surface-soft/60" : "text-ink/70"
                    }`}
                  >
                    <div className="flex items-center gap-sm truncate flex-1 min-w-0">
                      {opt.icon}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {opt.badge && (
                      <span className="text-[10px] font-mono uppercase tracking-[0.5px] text-ink/40 bg-surface-soft px-xs py-[1px] rounded flex-shrink-0">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="text-ink flex-shrink-0">
                        <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
