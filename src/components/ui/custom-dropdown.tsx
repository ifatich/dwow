"use client";

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface CustomDropdownOption {
  value: string;
  label: string;
  badge?: string;
  icon?: ReactNode;
  disabled?: boolean;
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
  triggerClassName?: string;
  align?: "left" | "right";
}

/**
 * Standardized Custom Dropdown matching TaskForge design system.
 * Uses React Portal (Teleport) to document.body to avoid being clipped by
 * overflow-hidden or overflow-y-auto modal containers.
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
  triggerClassName = "",
  align = "left",
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Debounce search query to optimize filtering on large dataset options
  useEffect(() => {
    if (!searchable) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(timer);
  }, [search, searchable]);

  // Position state for Teleport Portal
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
  }>({
    left: 0,
    width: 180,
    maxHeight: 280,
    openUpward: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate coordinates for portal floating popover
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger element is completely scrolled out of the viewport, auto-close
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;

    const maxHeight = openUpward
      ? Math.min(280, Math.max(120, spaceAbove - 16))
      : Math.min(280, Math.max(120, spaceBelow - 16));

    const popoverWidth = Math.min(Math.max(rect.width, 200), window.innerWidth - 16);
    let calculatedLeft = rect.left;
    if (align === "right") {
      calculatedLeft = rect.right - popoverWidth;
    }

    // Keep within window viewport boundaries
    calculatedLeft = Math.max(8, Math.min(calculatedLeft, window.innerWidth - popoverWidth - 8));

    setPos({
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      left: calculatedLeft,
      width: rect.width,
      maxHeight,
      openUpward,
    });
  };

  // Re-position or close on scroll / resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, align]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Selected option and label calculation
  const selectedOption = useMemo(() => {
    if (allOptionLabel && (value === allOptionValue || !value)) {
      return null;
    }
    return options.find((opt) => opt.value === value) || null;
  }, [value, options, allOptionLabel, allOptionValue]);

  const currentLabel = useMemo(() => {
    if (allOptionLabel && (value === allOptionValue || !value)) {
      return allOptionLabel;
    }
    if (selectedOption) return selectedOption.label;
    if (value) return value;
    return placeholder;
  }, [value, selectedOption, allOptionLabel, allOptionValue, placeholder]);

  // Filtered options based on debounced search
  const filteredOptions = useMemo(() => {
    if (!searchable || !debouncedSearch.trim()) return options;
    const q = debouncedSearch.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchable, debouncedSearch]);

  const isAllSelected = value === allOptionValue || !value;
  const isFullWidth = className.includes("w-full") || className.includes("flex-1");
  const hasCustomHeight = triggerClassName.includes("h-");
  const hasCustomRounded = triggerClassName.includes("rounded-");

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setSearch("");
      setDebouncedSearch("");
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={`relative flex items-center gap-xs ${className}`}>
      {label && (
        <label className="text-[12px] font-[450] text-ink/50 select-none flex-shrink-0">
          {label}
        </label>
      )}

      <div className={`relative ${isFullWidth ? "flex-1 w-full" : ""}`}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={toggleDropdown}
          style={{ minWidth: isFullWidth ? undefined : minWidth }}
          className={`${hasCustomHeight ? "" : "h-[34px]"} ${hasCustomRounded ? "" : "rounded-md"} px-md border border-hairline bg-surface-soft text-[13px] font-[480] text-ink focus:outline-none focus:border-ink/30 cursor-pointer flex items-center justify-between gap-sm text-left transition-colors ${
            isFullWidth ? "w-full" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-hairline-soft"} ${triggerClassName}`}
        >
          <div className="flex items-center gap-1.5 truncate min-w-0">
            {selectedOption?.icon}
            <span className="truncate">{currentLabel}</span>
          </div>
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            className={`text-ink/40 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Teleport / Portal rendering to document.body */}
        {isOpen &&
          mounted &&
          createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: pos.top !== undefined ? `${pos.top}px` : undefined,
                bottom: pos.bottom !== undefined ? `${pos.bottom}px` : undefined,
                left: `${pos.left}px`,
                width: isFullWidth ? `${Math.min(pos.width, window.innerWidth - 16)}px` : undefined,
                minWidth: `min(${Math.max(pos.width, 200)}px, calc(100vw - 16px))`,
                maxWidth: "calc(100vw - 16px)",
                maxHeight: `${pos.maxHeight}px`,
                zIndex: 999999,
              }}
              className="overflow-y-auto bg-white border border-hairline/80 rounded-md shadow-2xl p-xs space-y-[2px] animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {searchable && (
                <div className="p-xs px-sm border-b border-hairline/60 bg-surface-soft/40 backdrop-blur-md sticky top-0 z-10 mb-xs">
                  <div className="relative flex items-center">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="absolute left-2.5 text-ink/35 pointer-events-none"
                    >
                      <path
                        d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM12 12l3 3"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
                          setDebouncedSearch("");
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
                      <svg
                        width="12"
                        height="10"
                        viewBox="0 0 12 10"
                        fill="none"
                        className="text-ink flex-shrink-0"
                      >
                        <path
                          d="M1 5L4.5 8.5L11 1.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="my-xs border-t border-hairline-soft" />
                </>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-md py-sm text-[12px] text-ink/40 text-center italic">
                  Tidak ada opsi
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => {
                        if (opt.disabled) return;
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-sm py-1.5 rounded-md text-[13px] font-[480] transition-all flex items-center justify-between gap-sm ${
                        opt.disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-surface-soft/70 cursor-pointer"
                      } ${isSelected ? "text-ink font-[540] bg-surface-soft/60" : "text-ink/70"}`}
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
                        <svg
                          width="12"
                          height="10"
                          viewBox="0 0 12 10"
                          fill="none"
                          className="text-ink flex-shrink-0"
                        >
                          <path
                            d="M1 5L4.5 8.5L11 1.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
