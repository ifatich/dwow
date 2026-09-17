"use client";

import { useState, useEffect } from "react";
import { AvailableSprint, SprintSyncPreview, SprintSyncResult } from "../types";

interface SprintSyncDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SprintSyncDialog({ open, onClose, onSuccess }: SprintSyncDialogProps) {
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [availableSprints, setAvailableSprints] = useState<AvailableSprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>("186");
  const [customSprintInput, setCustomSprintInput] = useState<string>("");
  const [customUrl, setCustomUrl] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Preview state
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<SprintSyncPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Sync execution state
  const [executing, setExecuting] = useState(false);
  const [syncResult, setSyncResult] = useState<SprintSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load available sprints on modal open
  useEffect(() => {
    if (open) {
      setLoadingSprints(true);
      setPreview(null);
      setPreviewError(null);
      setSyncResult(null);
      setSyncError(null);

      fetch("/api/sprint/sync/sprints")
        .then((res) => {
          if (!res.ok) throw new Error("Gagal memuat daftar sprint");
          return res.json();
        })
        .then((data) => {
          if (data.sprints && data.sprints.length > 0) {
            setAvailableSprints(data.sprints);
            // Default to first sprint or 186
            const has186 = data.sprints.find((s: AvailableSprint) => s.identifier === "186");
            if (has186) {
              setSelectedSprint("186");
            } else {
              setSelectedSprint(data.sprints[0].identifier);
            }
          }
        })
        .catch((err) => {
          console.warn("Gagal memuat daftar sprint:", err);
          setSelectedSprint("186");
        })
        .finally(() => setLoadingSprints(false));
    }
  }, [open]);

  // Handle preview calculation
  const handleFetchPreview = async () => {
    const targetSprint = selectedSprint === "custom" ? customSprintInput.trim() : selectedSprint;
    if (!targetSprint) {
      setPreviewError("Silakan pilih atau masukkan nomor sprint.");
      return;
    }

    setLoadingPreview(true);
    setPreview(null);
    setPreviewError(null);
    setSyncResult(null);
    setSyncError(null);

    try {
      const res = await fetch("/api/sprint/sync/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sprintIdentifier: targetSprint,
          customUrl: customUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses pratinjau sprint.");
      }

      setPreview(data);
    } catch (err: any) {
      setPreviewError(err.message || "Terjadi kesalahan saat memuat preview data.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle execute sync
  const handleExecuteSync = async () => {
    const targetSprint = selectedSprint === "custom" ? customSprintInput.trim() : selectedSprint;
    if (!targetSprint) return;

    setExecuting(true);
    setSyncError(null);

    try {
      const res = await fetch("/api/sprint/sync/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sprintIdentifier: targetSprint,
          customUrl: customUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengeksekusi sinkronisasi.");
      }

      setSyncResult(data);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setSyncError(err.message || "Gagal mengeksekusi sinkronisasi sprint.");
    } finally {
      setExecuting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sprint-sync-dialog-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-md overflow-y-auto"
      style={{ backgroundColor: "var(--color-overlay-scrim, rgba(15, 23, 42, 0.6))" }}
      onClick={onClose}
    >
      <div
        className="bg-canvas border border-hairline rounded-2xl max-w-[640px] w-full my-lg p-xl md:p-xxl shadow-xl text-ink space-y-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-sm border-b border-hairline">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              {/* Sync inline SVG icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>
            <div>
              <h3 id="sprint-sync-dialog-title" className="text-[18px] font-[540] text-ink">
                Sinkronisasi Sprint Google Sheets
              </h3>
              <p className="text-[13px] font-[320] text-ink/50">
                Pembaruan terarah dengan multi-sprint retention & smart merge
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink/40 hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-xs space-y-lg text-[14px]">
          {/* Success Banner */}
          {syncResult && (
            <div className="p-lg rounded-xl bg-green-50 border border-green-200 text-green-900 space-y-sm">
              <div className="flex items-center gap-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h4 className="text-[15px] font-[600] text-green-800">
                  Sinkronisasi Berhasil Selesai!
                </h4>
              </div>
              <p className="text-[13px] text-green-700">
                Data {syncResult.sprintLabel} telah disinkronkan ke TaskForge.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-xs pt-xs text-[12px]">
                <div className="bg-white/80 p-sm rounded border border-green-200">
                  <span className="text-ink/40 block">Proyek</span>
                  <span className="font-bold text-ink">{syncResult.projectsCreated + syncResult.projectsUpdated}</span>
                </div>
                <div className="bg-white/80 p-sm rounded border border-green-200">
                  <span className="text-ink/40 block">Tasks</span>
                  <span className="font-bold text-ink">{syncResult.tasksCreated + syncResult.tasksUpdated}</span>
                </div>
                <div className="bg-white/80 p-sm rounded border border-green-200">
                  <span className="text-ink/40 block">Subtasks Baru</span>
                  <span className="font-bold text-ink">{syncResult.subtasksCreated}</span>
                </div>
                <div className="bg-white/80 p-sm rounded border border-green-200">
                  <span className="text-ink/40 block">Dipertahankan</span>
                  <span className="font-bold text-green-700">{syncResult.subtasksPreserved} progres</span>
                </div>
              </div>
            </div>
          )}

          {/* Sync Form */}
          {!syncResult && (
            <div className="space-y-md">
              <div>
                <label className="block text-[11px] font-[540] text-ink/40 uppercase mb-xs tracking-[0.5px]">
                  Pilih Sprint yang akan Disinkronkan
                </label>
                <div className="flex gap-sm items-center">
                  <select
                    value={selectedSprint}
                    onChange={(e) => {
                      setSelectedSprint(e.target.value);
                      setPreview(null);
                    }}
                    disabled={loadingSprints || loadingPreview || executing}
                    className="flex-1 h-[42px] rounded-lg border border-hairline px-md text-[14px] bg-canvas text-ink cursor-pointer focus:outline-primary"
                  >
                    {availableSprints.map((s) => (
                      <option key={s.identifier} value={s.identifier}>
                        {s.label} {s.isInDatabase ? "(Sudah di DB)" : `(${s.rowCount} baris sheet)`}
                      </option>
                    ))}
                    <option value="custom">+ Input Nomor Sprint Lain...</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleFetchPreview}
                    disabled={loadingPreview || executing}
                    className="h-[42px] px-lg rounded-lg bg-surface-soft hover:bg-hairline text-ink font-[540] text-[13px] transition-colors flex items-center gap-xs cursor-pointer disabled:opacity-50"
                  >
                    {loadingPreview ? (
                      <span>Memuat...</span>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span>Pratinjau Data</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {selectedSprint === "custom" && (
                <div>
                  <label className="block text-[11px] font-[540] text-ink/40 uppercase mb-xs tracking-[0.5px]">
                    Nomor Sprint (contoh: 187)
                  </label>
                  <input
                    type="text"
                    value={customSprintInput}
                    onChange={(e) => setCustomSprintInput(e.target.value)}
                    placeholder="187"
                    className="w-full h-[40px] rounded-lg border border-hairline px-md text-[14px] bg-canvas text-ink"
                  />
                </div>
              )}

              {/* Advanced Settings Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[12px] font-[480] text-ink/40 hover:text-ink flex items-center gap-xs transition-colors"
                >
                  <span>{showAdvanced ? "▼ Sembunyikan URL Kustom" : "▶ Kustomisasi URL Spreadsheet"}</span>
                </button>
                {showAdvanced && (
                  <div className="mt-xs p-md rounded-lg bg-surface-soft/40 border border-hairline space-y-xs">
                    <label className="block text-[11px] font-[540] text-ink/40 uppercase tracking-[0.5px]">
                      Google Sheets CSV Export URL (Opsional)
                    </label>
                    <input
                      type="text"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=..."
                      className="w-full h-[36px] rounded-md border border-hairline px-sm text-[12px] font-mono bg-canvas text-ink"
                    />
                    <span className="text-[11px] text-ink/40 block">
                      Kosongkan untuk menggunakan spreadsheet standar tim yang sudah dikonfigurasi.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {(previewError || syncError) && (
            <div className="p-md rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center gap-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{previewError || syncError}</span>
            </div>
          )}

          {/* Preview Results Panel */}
          {preview && !syncResult && (
            <div className="space-y-md pt-sm border-t border-hairline">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-[540] text-ink flex items-center gap-xs">
                  Ringkasan Pratinjau: {preview.sprintLabel}
                </span>
                <span className="font-mono text-[11px] text-primary bg-primary/10 rounded-pill px-sm py-xxs font-[550]">
                  {preview.validRows} subtask valid
                </span>
              </div>

              {/* Stat Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm text-center">
                <div className="bg-surface-soft/40 border border-hairline p-md rounded-xl">
                  <div className="text-[18px] font-[600] text-ink">{preview.projectsCount}</div>
                  <div className="text-[11px] text-ink/40 uppercase tracking-[0.5px]">Kategori Proyek</div>
                </div>
                <div className="bg-surface-soft/40 border border-hairline p-md rounded-xl">
                  <div className="text-[18px] font-[600] text-ink">{preview.tasksCount}</div>
                  <div className="text-[11px] text-ink/40 uppercase tracking-[0.5px]">Total Tasks</div>
                </div>
                <div className="bg-surface-soft/40 border border-hairline p-md rounded-xl">
                  <div className="text-[18px] font-[600] text-ink">{preview.validRows}</div>
                  <div className="text-[11px] text-ink/40 uppercase tracking-[0.5px]">Total Subtasks</div>
                </div>
                <div className="bg-surface-soft/40 border border-hairline p-md rounded-xl">
                  <div className="text-[18px] font-[600] text-primary">{preview.totalWorkloadHours}h</div>
                  <div className="text-[11px] text-ink/40 uppercase tracking-[0.5px]">Bobot Jam</div>
                </div>
              </div>

              {/* Filter Notice */}
              {preview.excludedTentativeZero > 0 && (
                <div className="p-sm rounded-lg bg-surface-soft text-[12px] text-ink/50 flex items-center justify-between">
                  <span>Filter Otomatis Aktif:</span>
                  <span className="font-mono text-[11px] font-[550] text-amber-700 bg-amber-100 rounded px-xs py-xxs">
                    {preview.excludedTentativeZero} baris tentative (0 jam) diabaikan
                  </span>
                </div>
              )}

              {/* Smart Merge Safety Banner */}
              <div className="p-md rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 space-y-xs">
                <div className="flex items-center gap-xs font-[600] text-[13px] text-blue-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Smart Merge & Perlindungan Progres</span>
                </div>
                <p className="text-[12px] text-blue-700 leading-[1.4]">
                  Sinkronisasi ini terisolasi hanya pada <span className="font-[600]">{preview.sprintLabel}</span> (sprint lain tidak terhapus).
                  {preview.delta.preservedInProgressSubtasks > 0 ? (
                    <span className="block mt-xxs font-[550] text-blue-900">
                      🛡️ Terdapat {preview.delta.preservedInProgressSubtasks} subtask yang statusnya sedang/sudah dikerjakan tim — statusnya akan tetap dipertahankan aman!
                    </span>
                  ) : (
                    <span className="block mt-xxs">
                      Semua subtask yang sudah berstatus <i>in_progress</i>, <i>review</i>, atau <i>done</i> tidak akan pernah direset ke to_do.
                    </span>
                  )}
                </p>
              </div>

              {/* Top Contributors list preview */}
              <div className="space-y-xs">
                <div className="text-[12px] font-[540] text-ink/40 uppercase tracking-[0.5px]">
                  Kontributor Terbanyak ({preview.contributors.length} anggota tim):
                </div>
                <div className="flex flex-wrap gap-xs max-h-[90px] overflow-y-auto pr-xs">
                  {preview.contributors.slice(0, 8).map((c) => (
                    <span
                      key={c.name}
                      className="text-[11px] bg-surface-soft border border-hairline rounded-pill px-sm py-xxs text-ink/70"
                    >
                      {c.name}: <strong className="text-ink">{c.hours}h</strong>
                    </span>
                  ))}
                  {preview.contributors.length > 8 && (
                    <span className="text-[11px] text-ink/40 self-center">
                      +{preview.contributors.length - 8} lainnya
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-sm pt-sm border-t border-hairline">
          {syncResult ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.reload();
              }}
              className="h-[42px] px-xl rounded-lg bg-primary text-on-primary font-[540] text-[13px] hover:opacity-95 transition-opacity cursor-pointer"
            >
              Selesai & Segarkan Halaman
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={executing}
                className="h-[42px] px-lg rounded-lg border border-hairline text-[13px] font-[480] text-ink/60 hover:bg-surface-soft transition-colors cursor-pointer"
              >
                Batal
              </button>
              {preview ? (
                <button
                  type="button"
                  onClick={handleExecuteSync}
                  disabled={executing}
                  className="h-[42px] px-xl rounded-lg bg-primary text-on-primary font-[540] text-[13px] hover:opacity-90 transition-opacity flex items-center gap-sm cursor-pointer disabled:opacity-50"
                >
                  {executing ? (
                    <span>Sedang Menyinkronkan...</span>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Mulai Sinkronisasi Data</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFetchPreview}
                  disabled={loadingPreview}
                  className="h-[42px] px-xl rounded-lg bg-primary text-on-primary font-[540] text-[13px] hover:opacity-90 transition-opacity flex items-center gap-xs cursor-pointer disabled:opacity-50"
                >
                  {loadingPreview ? "Memuat..." : "Tinjau Data Terlebih Dahulu"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
