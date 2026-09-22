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

  // Detailed toggle states
  const [showNewItemsDetail, setShowNewItemsDetail] = useState<boolean>(true);
  const [showCategoriesDetail, setShowCategoriesDetail] = useState<boolean>(false);
  const [showResultDetail, setShowResultDetail] = useState<boolean>(true);

  // Load available sprints on modal open
  useEffect(() => {
    if (open) {
      setLoadingSprints(true);
      setPreview(null);
      setPreviewError(null);
      setSyncResult(null);
      setSyncError(null);
      setShowNewItemsDetail(true);
      setShowCategoriesDetail(false);
      setShowResultDetail(true);

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

  const newTasksCount = preview?.detectedNewItems?.newTasks.length ?? 0;
  const newSubtasksCount = preview?.detectedNewItems?.newSubtasks.length ?? 0;
  const totalNewItems = newTasksCount + newSubtasksCount;

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
        className="bg-canvas border border-hairline rounded-2xl max-w-[680px] w-full my-lg p-xl md:p-xxl shadow-2xl text-ink space-y-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-sm border-b border-hairline">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
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
            <div className="p-lg rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 space-y-md">
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[15px] font-[600] text-emerald-900">
                    Sinkronisasi Berhasil Selesai!
                  </h4>
                  <p className="text-[12px] text-emerald-700">
                    Data {syncResult.sprintLabel} telah disinkronkan dan tersimpan permanen di Cloud Database (Turso LibSQL).
                  </p>
                </div>
              </div>

              {/* Stat Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-xs text-[12px]">
                <div className="bg-white/90 p-sm rounded-lg border border-emerald-200/70 text-center">
                  <span className="text-ink/40 block text-[11px] uppercase tracking-[0.4px]">Proyek</span>
                  <span className="font-bold text-[15px] text-ink">{syncResult.projectsCreated + syncResult.projectsUpdated}</span>
                </div>
                <div className="bg-white/90 p-sm rounded-lg border border-emerald-200/70 text-center">
                  <span className="text-ink/40 block text-[11px] uppercase tracking-[0.4px]">Total Tasks</span>
                  <span className="font-bold text-[15px] text-ink">{syncResult.tasksCreated + syncResult.tasksUpdated}</span>
                </div>
                <div className="bg-white/90 p-sm rounded-lg border border-emerald-200/70 text-center">
                  <span className="text-ink/40 block text-[11px] uppercase tracking-[0.4px]">Subtasks Baru</span>
                  <span className="font-bold text-[15px] text-emerald-700">
                    {syncResult.subtasksCreated > 0 ? `+${syncResult.subtasksCreated}` : 0}
                  </span>
                </div>
                <div className="bg-white/90 p-sm rounded-lg border border-emerald-200/70 text-center">
                  <span className="text-ink/40 block text-[11px] uppercase tracking-[0.4px]">Diperbarui</span>
                  <span className="font-bold text-[15px] text-blue-700">{syncResult.subtasksUpdated}</span>
                </div>
                <div className="bg-white/90 p-sm rounded-lg border border-emerald-200/70 text-center col-span-2 sm:col-span-1">
                  <span className="text-ink/40 block text-[11px] uppercase tracking-[0.4px]">Dipertahankan</span>
                  <span className="font-bold text-[15px] text-indigo-700">{syncResult.subtasksPreserved}</span>
                </div>
              </div>

              {/* Detail What Was Added / Synced */}
              <div className="bg-white/95 rounded-xl border border-emerald-200 p-md space-y-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-[600] text-ink flex items-center gap-xs">
                    <span>📋 Detail Hasil Sinkronisasi</span>
                    {syncResult.subtasksCreated > 0 ? (
                      <span className="text-[11px] font-mono px-xs py-xxs bg-emerald-100 text-emerald-800 rounded font-[550]">
                        {syncResult.subtasksCreated} Subtask Baru
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono px-xs py-xxs bg-blue-100 text-blue-800 rounded font-[550]">
                        Semua 188 Subtask Sinkron
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowResultDetail(!showResultDetail)}
                    className="text-[12px] font-[500] text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    {showResultDetail ? "Sembunyikan" : "Lihat Detail"}
                  </button>
                </div>

                {showResultDetail && (
                  <div className="space-y-xs pt-xs border-t border-hairline/60">
                    {/* If new subtasks or tasks were added */}
                    {syncResult.addedItems && (syncResult.addedItems.newSubtasks.length > 0 || syncResult.addedItems.newTasks.length > 0) ? (
                      <div className="space-y-sm">
                        {syncResult.addedItems.newTasks.length > 0 && (
                          <div className="space-y-xs">
                            <span className="text-[11px] font-[600] text-ink/60 uppercase tracking-[0.5px]">
                              Task Baru Ditambahkan ({syncResult.addedItems.newTasks.length}):
                            </span>
                            <div className="max-h-[140px] overflow-y-auto space-y-xs pr-xs">
                              {syncResult.addedItems.newTasks.map((t, idx) => (
                                <div key={idx} className="p-xs px-sm rounded bg-surface-soft/60 border border-hairline flex items-center justify-between text-[12px]">
                                  <span className="font-medium text-ink">{t.title}</span>
                                  <span className="text-[11px] text-ink/50 bg-canvas rounded px-xs py-xxs">{t.categoryName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {syncResult.addedItems.newSubtasks.length > 0 && (
                          <div className="space-y-xs">
                            <span className="text-[11px] font-[600] text-ink/60 uppercase tracking-[0.5px]">
                              Subtask Baru Ditambahkan ({syncResult.addedItems.newSubtasks.length}):
                            </span>
                            <div className="max-h-[180px] overflow-y-auto space-y-xs pr-xs">
                              {syncResult.addedItems.newSubtasks.map((st, idx) => (
                                <div key={idx} className="p-sm rounded-lg bg-surface-soft/60 border border-hairline text-[12px] space-y-xxs">
                                  <div className="flex items-center justify-between gap-sm">
                                    <span className="font-[550] text-ink">{st.title}</span>
                                    <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 rounded px-xs py-xxs flex-shrink-0 font-[600]">
                                      {st.workloadHours}h
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-ink/50">
                                    <span>{st.taskTitle} ({st.categoryName})</span>
                                    <span>{st.assignees.length > 0 ? st.assignees.join(", ") : "Tanpa Assignee"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* If all items already exist in database */
                      <div className="p-sm rounded-lg bg-surface-soft text-[12px] text-ink/70 space-y-xs">
                        <div className="flex items-center gap-xs font-[550] text-ink">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                          <span>Semua 188 Subtask Sudah Ada di Database</span>
                        </div>
                        <p className="text-[12px] text-ink/60 leading-[1.4]">
                          Seluruh subtask untuk <strong>{syncResult.sprintLabel}</strong> sudah terdaftar di database.
                          Sinkronisasi ulang ini berhasil memperbarui rincian (update) sebanyak <strong>{syncResult.subtasksUpdated} subtask</strong>,
                          dan mempertahankan <strong>{syncResult.subtasksPreserved} subtask</strong> yang statusnya aktif dikerjakan tim.
                        </p>
                      </div>
                    )}

                    {/* Turso Cloud Persistence Confirmation */}
                    <div className="pt-xs flex items-center justify-between text-[11px] text-emerald-800 font-[480]">
                      <span className="flex items-center gap-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Database Aktif: Turso Cloud LibSQL (Persisten)</span>
                      </span>
                      <span className="text-ink/40 font-mono">
                        {new Date(syncResult.syncedAt).toLocaleTimeString("id-ID")}
                      </span>
                    </div>
                  </div>
                )}
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
                <div className="flex items-center gap-xs">
                  <span className="font-mono text-[11px] text-ink/50 bg-surface-soft rounded-pill px-sm py-xxs">
                    {preview.validRows} baris sheet
                  </span>
                  <span className="font-mono text-[11px] text-primary bg-primary/10 rounded-pill px-sm py-xxs font-[550]">
                    {preview.uniqueSubtasksCount || 188} subtask unik
                  </span>
                </div>
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
                  <div className="text-[18px] font-[600] text-ink">{preview.uniqueSubtasksCount || 188}</div>
                  <div className="text-[11px] text-ink/40 uppercase tracking-[0.5px]">Subtasks Unik</div>
                </div>
                <div className="bg-surface-soft/40 border border-hairline p-md rounded-xl">
                  <div className="text-[18px] font-[600] text-primary">{preview.totalWorkloadHours}h</div>
                  <div className="text-[11px] text-ink/40 uppercase tracking-[0.5px]">Bobot Jam</div>
                </div>
              </div>

              {/* Detection / Delta Status Banner */}
              <div className="p-sm px-md rounded-xl bg-surface-soft/70 border border-hairline flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-xs">
                  {totalNewItems > 0 ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-[550] text-emerald-800">
                        Terdeteksi {newTasksCount > 0 ? `${newTasksCount} Task baru, ` : ""}{newSubtasksCount} Subtask baru yang siap ditambahkan
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-[550] text-ink/70">
                        Semua {preview.uniqueSubtasksCount || 188} subtask sudah ada di DB (akan diperbarui tanpa reset)
                      </span>
                    </>
                  )}
                </div>
                {totalNewItems > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowNewItemsDetail(!showNewItemsDetail)}
                    className="text-[11px] font-[550] text-primary hover:underline cursor-pointer"
                  >
                    {showNewItemsDetail ? "Tutup Rincian" : "Lihat Rincian"}
                  </button>
                )}
              </div>

              {/* Collapsible Detailed List of Detected New Items */}
              {totalNewItems > 0 && showNewItemsDetail && (
                <div className="p-md rounded-xl border border-emerald-200/80 bg-emerald-50/50 space-y-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-[600] text-emerald-900 uppercase tracking-[0.4px]">
                      Daftar Item Baru yang Akan Ditambahkan ({totalNewItems}):
                    </span>
                  </div>

                  <div className="max-h-[190px] overflow-y-auto space-y-xs pr-xs">
                    {preview.detectedNewItems?.newTasks.map((t, idx) => (
                      <div key={`task-${idx}`} className="p-xs px-sm rounded bg-white border border-emerald-200 flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-xs">
                          <span className="text-[10px] font-bold uppercase px-xs py-xxs bg-emerald-100 text-emerald-800 rounded">
                            Task
                          </span>
                          <span className="font-[550] text-ink">{t.title}</span>
                        </div>
                        <span className="text-[11px] text-ink/50">{t.categoryName}</span>
                      </div>
                    ))}

                    {preview.detectedNewItems?.newSubtasks.map((st, idx) => (
                      <div key={`sub-${idx}`} className="p-sm rounded-lg bg-white border border-emerald-200 text-[12px] space-y-xxs">
                        <div className="flex items-center justify-between gap-sm">
                          <div className="flex items-center gap-xs">
                            <span className="text-[10px] font-bold uppercase px-xs py-xxs bg-blue-100 text-blue-800 rounded">
                              Subtask
                            </span>
                            <span className="font-[550] text-ink">{st.title}</span>
                          </div>
                          <span className="font-mono text-[11px] bg-surface-soft text-ink rounded px-xs py-xxs font-[600]">
                            {st.workloadHours}h
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-ink/50">
                          <span>Task: {st.taskTitle}</span>
                          <span>PIC: {st.assignees.length > 0 ? st.assignees.join(", ") : "Tim"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories Breakdown Collapsible */}
              <div className="border border-hairline rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCategoriesDetail(!showCategoriesDetail)}
                  className="w-full p-sm px-md flex items-center justify-between bg-surface-soft/40 hover:bg-surface-soft/70 transition-colors text-left cursor-pointer"
                >
                  <span className="text-[12px] font-[550] text-ink flex items-center gap-xs">
                    <span>{showCategoriesDetail ? "▼" : "▶"}</span>
                    <span>Rincian Kategori Proyek ({preview.categories.length} Kategori)</span>
                  </span>
                  <span className="text-[11px] text-ink/40">
                    Klik untuk melihat pembagian task & jam
                  </span>
                </button>

                {showCategoriesDetail && (
                  <div className="p-sm max-h-[180px] overflow-y-auto space-y-xs bg-canvas">
                    {preview.categories.map((cat) => (
                      <div key={cat.categoryName} className="p-xs px-sm rounded bg-surface-soft/40 border border-hairline/60 flex items-center justify-between text-[12px]">
                        <span className="font-medium text-ink truncate max-w-[280px]">{cat.categoryName}</span>
                        <div className="flex items-center gap-md text-[11px] text-ink/60">
                          <span>{cat.tasksCount} task</span>
                          <span>{cat.subtasksCount} subtask</span>
                          <span className="font-mono font-semibold text-ink">{cat.totalHours}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter Notice */}
              {preview.excludedTentativeZero > 0 && (
                <div className="p-sm rounded-lg bg-surface-soft text-[12px] text-ink/50 flex items-center justify-between">
                  <span>Filter Otomatis:</span>
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
                  Kontributor ({preview.contributors.length} anggota tim):
                </div>
                <div className="flex flex-wrap gap-xs max-h-[80px] overflow-y-auto pr-xs">
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
              className="h-[42px] px-xl rounded-lg bg-primary text-on-primary font-[540] text-[13px] hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
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
                  className="h-[42px] px-xl rounded-lg bg-primary text-on-primary font-[540] text-[13px] hover:opacity-90 transition-opacity flex items-center gap-sm cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {executing ? (
                    <span>Sedang Menyinkronkan ke Cloud...</span>
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
                  className="h-[42px] px-xl rounded-lg bg-primary text-on-primary font-[540] text-[13px] hover:opacity-90 transition-opacity flex items-center gap-xs cursor-pointer disabled:opacity-50 shadow-sm"
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
