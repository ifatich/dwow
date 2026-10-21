"use client";

import { useState, useEffect } from "react";
import { CHANGELOG_DATA } from "@/features/dashboard/data/changelog-data";
import type { ChangelogItem } from "@/features/dashboard/data/changelog-data";

import SectionSettingsButton from "./section-settings-button";

type FilterType = "all" | "feature" | "fix" | "improvement";

interface WhatsNewSectionProps {
  onOpenSettings?: () => void;
}

const STORAGE_KEY = "taskflow_whats_new_collapsed";

/**
 * Komponen section "What's New" di dashboard home.
 * Didesain minimalis dengan fitur collapse/expand agar tidak memakan ruang vertikal berlebih.
 */
export default function WhatsNewSection({ onOpenSettings }: WhatsNewSectionProps = {}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAll, setShowAll] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});

  // Restore user collapse preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const toggleVersionItem = (id: string) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filter items based on active category
  const filteredData: ChangelogItem[] = CHANGELOG_DATA.map((item) => {
    if (filter === "all") return item;
    const filteredChanges = item.changes.filter((c) => c.type === filter);
    return { ...item, changes: filteredChanges };
  }).filter((item) => item.changes.length > 0);

  const latestItem = CHANGELOG_DATA[0];
  const displayedData = showAll ? filteredData : filteredData.slice(0, 3);

  // Mode Minimalis (Collapsed Strip View)
  if (isCollapsed) {
    return (
      <section className="bg-canvas border border-hairline rounded-lg overflow-hidden shadow-2xs mt-xxl mb-xxl transition-all">
        <div className="px-lg py-md flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
          <div className="flex items-center gap-sm min-w-0">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-pill flex-shrink-0">
              What&apos;s New
            </span>
            <span className="font-mono text-[11px] font-bold text-ink bg-surface-soft border border-hairline px-2 py-0.5 rounded-pill flex-shrink-0">
              {latestItem?.version || "Rilis Terbaru"}
            </span>
            <span className="text-[13px] font-[520] text-ink truncate">
              {latestItem?.title}
            </span>
            {latestItem?.date && (
              <span className="text-[11px] text-ink/40 font-mono hidden md:inline flex-shrink-0">
                · {latestItem.date}
              </span>
            )}
          </div>

          <div className="flex items-center gap-xs flex-shrink-0">
            {onOpenSettings && (
              <SectionSettingsButton
                onClick={onOpenSettings}
                title="Atur Tampilan Role: What's New"
              />
            )}
            <button
              type="button"
              onClick={toggleCollapse}
              className="inline-flex items-center gap-1.5 text-[11px] font-[500] text-ink/70 hover:text-ink px-sm py-xxs rounded-pill hover:bg-surface-soft transition-colors cursor-pointer border border-hairline"
            >
              <span>Buka Catatan Rilis</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Mode Lengkap (Expanded View — Minimalis & Refined)
  return (
    <section className="bg-canvas border border-hairline rounded-lg overflow-hidden shadow-sm mt-xxl mb-xxl transition-all">
      {/* Header Section */}
      <div className="px-lg py-md border-b border-hairline bg-surface-soft/40 flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div className="flex items-center gap-xs flex-wrap">
          <h2 className="text-[16px] font-[550] text-ink">What&apos;s New</h2>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-xs py-0.5 rounded-pill">
            Update Terbaru
          </span>
          <span className="text-[12px] font-[350] text-ink/50 ml-1 hidden md:inline">
            Catatan pembaruan sistem dan perbaikan fitur TaskForge
          </span>
        </div>

        {/* Filter Chips & Action Controls */}
        <div className="flex items-center gap-xs flex-wrap">
          <div className="flex items-center gap-xs flex-wrap">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-sm py-xxs rounded-pill text-[11px] font-[480] transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-ink text-white"
                  : "bg-surface-soft text-ink/70 hover:bg-hairline hover:text-ink"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilter("feature")}
              className={`px-sm py-xxs rounded-pill text-[11px] font-[480] transition-colors cursor-pointer ${
                filter === "feature"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              Fitur Baru
            </button>
            <button
              type="button"
              onClick={() => setFilter("fix")}
              className={`px-sm py-xxs rounded-pill text-[11px] font-[480] transition-colors cursor-pointer ${
                filter === "fix"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              Perbaikan
            </button>
            <button
              type="button"
              onClick={() => setFilter("improvement")}
              className={`px-sm py-xxs rounded-pill text-[11px] font-[480] transition-colors cursor-pointer ${
                filter === "improvement"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
              }`}
            >
              Peningkatan
            </button>
          </div>

          <div className="flex items-center gap-xs pl-xs border-l border-hairline ml-xs">
            {onOpenSettings && (
              <SectionSettingsButton
                onClick={onOpenSettings}
                title="Atur Tampilan Role: What's New"
              />
            )}
            <button
              type="button"
              onClick={toggleCollapse}
              className="inline-flex items-center gap-1 text-[11px] font-[500] text-ink/60 hover:text-ink px-sm py-xxs rounded-pill hover:bg-surface-soft transition-colors cursor-pointer border border-hairline"
              title="Sembunyikan Catatan Rilis"
            >
              <span>Sembunyikan</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="p-lg">
        <div className="relative">
          {/* Vertical timeline track line — perfectly coaxial at left-[12px] */}
          {displayedData.length > 0 && (
            <div className="absolute left-[12px] top-2 bottom-3 w-[2px] -translate-x-1/2 bg-hairline pointer-events-none" />
          )}

          {displayedData.length === 0 ? (
            <p className="text-[13px] text-ink/40 py-lg">Tidak ada catatan pembaruan untuk kategori ini.</p>
          ) : (
            displayedData.map((item, idx) => {
              // Versi paling atas selalu terbuka, versi lama bisa di-toggle
              const isItemExpanded = idx === 0 || Boolean(expandedVersions[item.id]);

              return (
                <div key={item.id} className={`relative pl-8 ${idx > 0 ? "mt-lg" : ""}`}>
                  {/* Node marker on timeline — perfectly coaxial at left-[12px] */}
                  <span className="absolute left-[12px] top-1.5 w-3.5 h-3.5 rounded-full bg-canvas border-2 border-primary flex items-center justify-center -translate-x-1/2 z-10 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </span>

                  {/* Header item */}
                  <div className="flex items-center justify-between gap-xs flex-wrap mb-xs">
                    <div className="flex items-center gap-xs flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-ink bg-surface-soft border border-hairline px-2 py-0.5 rounded-pill">
                        {item.version}
                      </span>
                      <span className="text-[11px] text-ink/40 font-mono">
                        {item.date}
                      </span>
                      <h3 className="text-[14px] font-[540] text-ink ml-1">
                        {item.title}
                      </h3>
                    </div>

                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleVersionItem(item.id)}
                        className="text-[11px] text-ink/50 hover:text-ink transition-colors cursor-pointer flex items-center gap-1 font-[480]"
                      >
                        <span>{isItemExpanded ? "Tutup Detail" : "Lihat Perubahan"}</span>
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`transition-transform duration-200 ${isItemExpanded ? "rotate-180" : "rotate-0"}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <p className="text-[12px] text-ink/70 mb-sm">
                    {item.summary}
                  </p>

                  {/* Changes List — jika expanded */}
                  {isItemExpanded && (
                    <div className="space-y-xs bg-surface-soft/40 border border-hairline-soft/80 rounded-md p-sm animate-fade-in">
                      {item.changes.map((change, cIdx) => (
                        <div key={cIdx} className="flex items-start gap-xs text-[12px] leading-relaxed">
                          <span
                            className={`inline-flex items-center justify-center text-center w-[84px] flex-shrink-0 text-[10px] font-semibold py-0.5 rounded mt-0.5 ${
                              change.type === "feature"
                                ? "bg-emerald-100 text-emerald-800"
                                : change.type === "fix"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {change.type === "feature"
                              ? "Fitur Baru"
                              : change.type === "fix"
                                ? "Perbaikan"
                                : "Peningkatan"}
                          </span>
                          <span className="text-ink/80 flex-1">{change.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Toggle Expand / Collapse All Versions */}
        {filteredData.length > 3 && (
          <div className="mt-lg pt-md border-t border-hairline flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="inline-flex items-center gap-xs text-[11px] font-[480] text-ink/70 hover:text-ink px-md py-xs rounded-pill hover:bg-surface-soft transition-colors cursor-pointer border border-hairline"
            >
              {showAll ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  <span>Tampilkan Lebih Sedikit</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <span>Lihat Semua Pembaruan ({filteredData.length} rilis)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
