"use client";

import { useState } from "react";
import MarkdownEditor from "@/components/shared/markdown-editor";

interface EvidenceDialogProps {
  open: boolean;
  subtaskTitle: string;
  /** Target status untuk pesan dinamis */
  targetLabel?: string;
  onConfirm: (evidence: string) => void;
  onCancel: () => void;
}

const MESSAGES: Record<string, { title: string; body: string; placeholder: string }> = {
  review: {
    title: "Ajukan ke Review",
    body: "Pindah ke Review wajib menyertakan bukti pengerjaan.",
    placeholder: "Jelaskan ringkasan pengerjaan, lampirkan link PR / Figma, atau paste (Ctrl+V) screenshot hasil pengujian...",
  },
  done: {
    title: "Selesaikan Subtask",
    body: "Pastikan semua kriteria selesai sebelum menyelesaikan subtask.",
    placeholder: "Jelaskan bukti penyelesaian atau lampirkan hasil akhir...",
  },
  backward: {
    title: "Kembalikan Subtask",
    body: "Mengembalikan subtask memerlukan alasan yang jelas.",
    placeholder: "Jelaskan alasan pengembalian atau catatan revisi...",
  },
  default: {
    title: "Lampirkan Evidence",
    body: "Lampirkan bukti atau catatan untuk perubahan status ini.",
    placeholder: "Jelaskan atau lampirkan link bukti / screenshot...",
  },
};

export default function EvidenceDialog({ open, subtaskTitle, targetLabel, onConfirm, onCancel }: EvidenceDialogProps) {
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const isReview = targetLabel === "Review";
  const msg = isReview ? MESSAGES.review : targetLabel === "Done" ? MESSAGES.done : targetLabel ? MESSAGES.backward : MESSAGES.default;

  const handleConfirm = () => {
    const trimmed = evidence.trim();
    if (!trimmed) {
      setError("Evidence wajib diisi");
      return;
    }
    onConfirm(trimmed);
    setEvidence("");
    setError("");
  };

  const handleCancel = () => {
    setEvidence("");
    setError("");
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-md"
      style={{ backgroundColor: "var(--color-overlay-scrim)" }}
      onClick={handleCancel}
    >
      <div
        className="bg-canvas rounded-xl max-w-[600px] w-full p-xl md:p-xxl shadow-xl border border-hairline transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleConfirm();
          }
        }}
      >
        <div className="flex items-start justify-between mb-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1L17 16H1L9 1Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="0.5" strokeLinejoin="round" />
                <path d="M9 6v4M9 13v1" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-[17px] font-[540] leading-[1.3] text-ink">{msg.title}</h3>
              <p className="text-[13px] font-[320] leading-[1.4] text-ink/60">
                {msg.body}{" "}<strong className="text-ink/80 font-semibold">"{subtaskTitle}"</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Tutup dialog"
            className="text-ink/40 hover:text-ink hover:bg-surface-soft p-1 rounded-md transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mb-md">
          <label className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40 block mb-xs">
            Evidence / Bukti Pengerjaan (Markdown & Screenshot Supported)
          </label>
          <MarkdownEditor
            value={evidence}
            onChange={(val) => {
              setEvidence(val);
              if (error) setError("");
            }}
            placeholder={msg.placeholder}
            minRows={5}
            autoFocus
          />
          {error && <p className="text-[12px] font-[450] text-red-500 mt-xs">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-sm pt-xs border-t border-hairline-soft">
          <span className="text-[11px] text-ink/40 hidden sm:inline">
            Tekan <kbd className="font-mono bg-surface-soft px-1 rounded border border-hairline text-[10px]">Ctrl+Enter</kbd> untuk simpan cepat
          </span>
          <div className="flex items-center gap-sm ml-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="h-[38px] px-lg rounded-lg bg-surface-soft text-ink/70 text-[13px] font-[480] hover:bg-hairline hover:text-ink transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="h-[38px] px-xl rounded-lg bg-primary text-on-primary text-[13px] font-[540] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              Simpan & Pindahkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

