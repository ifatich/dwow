"use client";

import { useState } from "react";

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
    placeholder: "Jelaskan atau lampirkan link bukti pengerjaan...",
  },
  done: {
    title: "Selesaikan Subtask",
    body: "Pastikan semua kriteria selesai sebelum menyelesaikan subtask.",
    placeholder: "Jelaskan atau lampirkan bukti penyelesaian...",
  },
  backward: {
    title: "Kembalikan Subtask",
    body: "Mengembalikan subtask memerlukan alasan yang jelas.",
    placeholder: "Jelaskan alasan pengembalian...",
  },
  default: {
    title: "Lampirkan Evidence",
    body: "Lampirkan bukti atau catatan untuk perubahan status ini.",
    placeholder: "Jelaskan atau lampirkan link bukti...",
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
    if (!trimmed) { setError("Evidence wajib diisi"); return; }
    onConfirm(trimmed);
    setEvidence(""); setError("");
  };

  const handleCancel = () => { setEvidence(""); setError(""); onCancel(); };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backgroundColor: "var(--color-overlay-scrim)" }} onClick={handleCancel}>
      <div className="bg-canvas rounded-lg max-w-[420px] w-full mx-lg p-xxl shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-md">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1L17 16H1L9 1Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="0.5" strokeLinejoin="round" />
            <path d="M9 6v4M9 13v1" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="text-[18px] font-[540] leading-[1.35] tracking-[-0.26px] text-ink mb-sm">{msg.title}</h3>
        <p className="text-[14px] font-[320] leading-[1.45] text-ink/50 mb-md">
          {msg.body}{" "}<strong className="text-ink/70">"{subtaskTitle}"</strong>
        </p>
        <div className="mb-md">
          <label className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40 block mb-xs">Evidence / Bukti</label>
          <textarea value={evidence} onChange={(e) => { setEvidence(e.target.value); if (error) setError(""); }} placeholder={msg.placeholder} rows={3} className="w-full px-md py-sm rounded-md border border-hairline bg-canvas text-[14px] font-[450] text-ink placeholder:text-ink/25 focus:outline-none focus:border-ink/30 transition-colors resize-none" autoFocus />
          {error && <p className="text-[12px] font-[450] text-red-500 mt-xs">{error}</p>}
        </div>
        <div className="flex items-center gap-sm">
          <button type="button" onClick={handleConfirm} className="flex-1 h-[40px] rounded-lg bg-primary text-on-primary text-[14px] font-[540] hover:opacity-90 transition-opacity cursor-pointer">Simpan & Pindahkan</button>
          <button type="button" onClick={handleCancel} className="flex-1 h-[40px] rounded-lg bg-surface-soft text-ink/60 text-[14px] font-[480] hover:bg-hairline transition-colors cursor-pointer">Batal</button>
        </div>
      </div>
    </div>
  );
}
