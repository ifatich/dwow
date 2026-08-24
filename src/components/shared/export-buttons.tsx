"use client";

import { useState, useRef } from "react";

interface ExportButtonsProps {
  period?: string;
  selectedUser?: string;
  selectedSprint?: string;
}

export default function ExportButtons({ period = "bulanan", selectedUser = "all", selectedSprint = "all" }: ExportButtonsProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleExport = async (format: "pdf" | "excel") => {
    setLoading(format);
    try {
      const endpoint = format === "pdf" ? "/api/reports/export/pdf" : "/api/reports/export/excel";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, username: selectedUser, sprint: selectedSprint }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-taskflow-${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);

      showToast(`📄 Laporan ${format.toUpperCase()} berhasil diunduh`);
    } catch {
      showToast("❌ Gagal mengekspor laporan");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative">
      {toast && (
        <div className="absolute bottom-full right-0 mb-sm bg-ink text-canvas rounded-lg px-lg py-sm text-[13px] font-[450] whitespace-nowrap shadow-lg z-50 animate-in fade-in">
          {toast}
        </div>
      )}
      <div className="flex items-center gap-sm">
        <button
          type="button"
          onClick={() => handleExport("pdf")}
          className="h-[36px] rounded-pill px-lg text-[13px] font-[480] bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer inline-flex items-center gap-xs"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 10v1.5A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V10M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export PDF
        </button>
        <button
          type="button"
          onClick={() => handleExport("excel")}
          className="h-[36px] rounded-pill px-lg text-[13px] font-[480] bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer inline-flex items-center gap-xs"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 10v1.5A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V10M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export Excel
        </button>
      </div>
    </div>
  );
}
