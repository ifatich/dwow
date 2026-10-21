"use client";

import { useState, useEffect } from "react";
import {
  type DashboardSectionKey,
  type UserRole,
  DASHBOARD_SECTIONS_META,
  ALL_ROLES_META,
} from "../types/visibility-types";

interface SectionSettingsModalProps {
  open: boolean;
  sectionKey: DashboardSectionKey | null;
  currentVisibility: Record<UserRole, boolean>;
  onClose: () => void;
  onSave: (sectionKey: DashboardSectionKey, visibility: Record<UserRole, boolean>) => Promise<void>;
}

export default function SectionSettingsModal({
  open,
  sectionKey,
  currentVisibility,
  onClose,
  onSave,
}: SectionSettingsModalProps) {
  const [localMap, setLocalMap] = useState<Record<UserRole, boolean>>(currentVisibility);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open && currentVisibility) {
      setLocalMap({ ...currentVisibility });
      setSaveSuccess(false);
      setErrorMsg("");
    }
  }, [open, currentVisibility]);

  if (!open || !sectionKey) return null;

  const meta = DASHBOARD_SECTIONS_META[sectionKey];

  const handleToggle = (role: UserRole) => {
    setLocalMap((prev) => ({
      ...prev,
      [role]: !prev[role],
    }));
  };

  const handleSelectAll = (val: boolean) => {
    const updated: Record<UserRole, boolean> = {
      staff: val,
      lead: val,
      kadep: val,
      kadiv: val,
      super_admin: val,
    };
    setLocalMap(updated);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMsg("");
      await onSave(sectionKey, localMap);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan pengaturan visibilitas.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-canvas border border-hairline rounded-xl shadow-xl w-full max-w-[560px] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-settings-title"
      >
        {/* Header */}
        <div className="px-xl py-lg border-b border-hairline flex items-center justify-between bg-surface-soft/40">
          <div className="flex items-center gap-md min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-xs">
                <span className="font-mono text-[10px] uppercase tracking-[0.5px] bg-surface-soft border border-hairline px-sm py-xxs rounded-pill text-ink/60">
                  {meta?.badge || "Pengaturan Section"}
                </span>
              </div>
              <h3 id="section-settings-title" className="text-[16px] font-[540] text-ink truncate mt-xxs">
                {meta?.title || "Pengaturan Visibilitas Section"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-ink/40 hover:text-ink hover:bg-hairline flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Subtitle & Quick Actions */}
        <div className="px-xl pt-lg pb-sm border-b border-hairline/60 bg-surface-soft/20 flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
          <p className="text-[12px] font-[320] text-ink/60 leading-relaxed max-w-[340px]">
            Tentukan role pengguna yang berhak melihat section ini di dashboard.
          </p>
          <div className="flex items-center gap-xs flex-shrink-0">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-[11px] font-[500] text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 border border-primary/20 px-sm py-xxs rounded-md transition-colors cursor-pointer"
            >
              Aktifkan Semua
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="text-[11px] font-[500] text-ink/50 hover:text-ink/80 bg-surface-soft hover:bg-hairline border border-hairline px-sm py-xxs rounded-md transition-colors cursor-pointer"
            >
              Sembunyikan Semua
            </button>
          </div>
        </div>

        {/* Body — List Role Cards */}
        <div className="p-xl space-y-sm overflow-y-auto max-h-[420px]">
          {errorMsg && (
            <div className="p-md rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px] font-[450] animate-in fade-in flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {ALL_ROLES_META.map((r) => {
            const isVisible = Boolean(localMap[r.role]);

            return (
              <div
                key={r.role}
                onClick={() => handleToggle(r.role)}
                className={`p-md rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-md select-none ${
                  isVisible
                    ? "bg-canvas border-hairline hover:border-primary/40 shadow-2xs"
                    : "bg-surface-soft/40 border-hairline-soft opacity-65 hover:opacity-100"
                }`}
              >
                <div className="flex items-center gap-md min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-surface-soft border border-hairline flex items-center justify-center text-[15px] flex-shrink-0">
                    {r.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-xs flex-wrap">
                      <span className="text-[13px] font-[540] text-ink">{r.label}</span>
                      <span className={`text-[10px] font-mono px-xs py-[1px] rounded border uppercase tracking-[0.5px] ${r.badgeClass}`}>
                        {r.role}
                      </span>
                    </div>
                    <p className="text-[11px] font-[320] text-ink/45 truncate mt-xxs">
                      {r.description}
                    </p>
                  </div>
                </div>

                {/* Switch & Badge Status */}
                <div className="flex items-center gap-sm flex-shrink-0">
                  <span
                    className={`font-mono text-[10px] font-[540] px-sm py-[2px] rounded-pill border transition-colors ${
                      isVisible
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {isVisible ? "Tampil" : "Sembunyi"}
                  </span>

                  {/* iOS Style Toggle Switch */}
                  <div
                    className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                      isVisible ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        isVisible ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-xl py-md border-t border-hairline bg-surface-soft/30 flex items-center justify-between gap-sm">
          <div className="text-[11px] text-ink/40 font-[320]">
            Perubahan disimpan langsung ke server & langsung berlaku untuk semua pengguna.
          </div>
          <div className="flex items-center gap-xs">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-md h-[34px] rounded-lg border border-hairline bg-canvas hover:bg-surface-soft text-[12px] font-[500] text-ink/70 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-lg h-[34px] rounded-lg bg-primary text-on-primary hover:opacity-90 text-[12px] font-[540] transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-xs shadow-xs"
            >
              {isSaving ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="animate-spin">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="24" strokeDashoffset="8" fill="none" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : saveSuccess ? (
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Tersimpan!</span>
                </span>
              ) : (
                <span>Simpan Pengaturan</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
