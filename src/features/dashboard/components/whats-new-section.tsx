"use client";

import { useState } from "react";
import { CHANGELOG_DATA } from "@/features/dashboard/data/changelog-data";
import type { ChangelogItem } from "@/features/dashboard/data/changelog-data";

type FilterType = "all" | "feature" | "fix" | "improvement";

/**
 * Komponen section "What's New" di dashboard home.
 * Menampilkan catatan rilis, log pembaruan fitur, dan perbaikan bug sistem.
 */
export default function WhatsNewSection() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAll, setShowAll] = useState(false);

  // Filter items based on active category
  const filteredData: ChangelogItem[] = CHANGELOG_DATA.map((item) => {
    if (filter === "all") return item;
    const filteredChanges = item.changes.filter((c) => c.type === filter);
    return { ...item, changes: filteredChanges };
  }).filter((item) => item.changes.length > 0);

  const displayedData = showAll ? filteredData : filteredData.slice(0, 3);

  return (
    <section className="bg-canvas border border-hairline rounded-lg overflow-hidden shadow-sm mt-xxl mb-xxl">
      {/* Header Section */}
      <div className="px-lg py-md border-b border-hairline bg-surface-soft/40 flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div className="flex items-center gap-sm">
          <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center flex-shrink-0 text-emerald-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-xs">
              <h2 className="text-[17px] font-[540] text-ink leading-tight">What&apos;s New</h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-xs py-0.5 rounded-pill">
                Update Terbaru
              </span>
            </div>
            <p className="text-[12px] font-[350] text-ink/60 mt-0.5">
              Catatan pembaruan sistem, fitur baru, dan perbaikan bug TaskForge
            </p>
          </div>
        </div>

        {/* Filter Chips */}
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
            Perbaikan Bug
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
      </div>

      {/* Timeline List */}
      <div className="p-lg">
        <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-hairline">
          {displayedData.length === 0 ? (
            <p className="text-[13px] text-ink/40 py-lg">Tidak ada catatan pembaruan untuk kategori ini.</p>
          ) : (
            displayedData.map((item, idx) => (
              <div key={item.id} className={`relative ${idx > 0 ? "mt-xl" : ""}`}>
                {/* Node marker on timeline */}
                <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-canvas border-2 border-primary flex items-center justify-center -translate-x-1/2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                </span>

                {/* Header item */}
                <div className="flex items-center gap-xs flex-wrap mb-xs">
                  <span className="font-mono text-[11px] font-bold text-ink bg-surface-soft border border-hairline px-sm py-xxs rounded-pill">
                    {item.version}
                  </span>
                  <span className="text-[11px] text-ink/50 font-mono">
                    {item.date}
                  </span>
                  <h3 className="text-[14px] font-[540] text-ink ml-1">
                    {item.title}
                  </h3>
                </div>

                <p className="text-[12px] text-ink/70 mb-sm">
                  {item.summary}
                </p>

                {/* Changes List */}
                <div className="space-y-xs bg-surface-soft/40 border border-hairline-soft/80 rounded-md p-sm">
                  {item.changes.map((change, cIdx) => (
                    <div key={cIdx} className="flex items-start gap-xs text-[12px] leading-relaxed">
                      <span
                        className={`inline-flex items-center flex-shrink-0 text-[10px] font-semibold px-xs py-0.5 rounded mt-0.5 ${
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
              </div>
            ))
          )}
        </div>

        {/* Toggle Expand / Collapse */}
        {filteredData.length > 3 && (
          <div className="mt-lg pt-md border-t border-hairline flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="inline-flex items-center gap-xs text-[12px] font-[480] text-ink/70 hover:text-ink px-md py-xs rounded-pill hover:bg-surface-soft transition-colors cursor-pointer border border-hairline"
            >
              {showAll ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  Tampilkan Lebih Sedikit
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  Lihat Semua Pembaruan ({filteredData.length} rilis)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
