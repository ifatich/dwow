"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AvailableSprint,
  SprintSyncPreview,
  SprintSyncResult,
  AddedItemTask,
  AddedItemSubtask,
  UpdatedItemTask,
  UpdatedItemSubtask,
} from "../types";
import CustomDropdown from "@/components/ui/custom-dropdown";

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

  // Selection states for selective sync
  const [selectedNewTaskKeys, setSelectedNewTaskKeys] = useState<Set<string>>(new Set());
  const [selectedNewSubtaskKeys, setSelectedNewSubtaskKeys] = useState<Set<string>>(new Set());
  const [selectedUpdatedTaskIds, setSelectedUpdatedTaskIds] = useState<Set<string>>(new Set());
  const [selectedUpdatedSubtaskIds, setSelectedUpdatedSubtaskIds] = useState<Set<string>>(new Set());

  // Active view tab & search query in preview
  const [previewTab, setPreviewTab] = useState<"new" | "updated" | "categories">("new");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync execution state
  const [executing, setExecuting] = useState(false);
  const [syncResult, setSyncResult] = useState<SprintSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showResultDetail, setShowResultDetail] = useState<boolean>(true);

  // Load available sprints on modal open
  useEffect(() => {
    if (open) {
      setLoadingSprints(true);
      setPreview(null);
      setPreviewError(null);
      setSyncResult(null);
      setSyncError(null);
      setShowResultDetail(true);
      setSearchQuery("");

      fetch("/api/sprint/sync/sprints")
        .then((res) => {
          if (!res.ok) throw new Error("Gagal memuat daftar sprint");
          return res.json();
        })
        .then((data) => {
          if (data.sprints && data.sprints.length > 0) {
            setAvailableSprints(data.sprints);
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
    setSearchQuery("");

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

      // Initialize all items as selected by default
      const nTasks = data.detectedNewItems?.newTasks || [];
      const nSubtasks = data.detectedNewItems?.newSubtasks || [];
      const uTasks = data.detectedUpdatedItems?.updatedTasks || [];
      const uSubtasks = data.detectedUpdatedItems?.updatedSubtasks || [];

      setSelectedNewTaskKeys(new Set(nTasks.map((t: AddedItemTask) => t.key!).filter(Boolean)));
      setSelectedNewSubtaskKeys(new Set(nSubtasks.map((s: AddedItemSubtask) => s.key!).filter(Boolean)));
      setSelectedUpdatedTaskIds(new Set(uTasks.map((t: UpdatedItemTask) => t.id)));
      setSelectedUpdatedSubtaskIds(new Set(uSubtasks.map((s: UpdatedItemSubtask) => s.id)));

      // Auto-switch to most informative tab
      if (nTasks.length > 0 || nSubtasks.length > 0) {
        setPreviewTab("new");
      } else if (uTasks.length > 0 || uSubtasks.length > 0) {
        setPreviewTab("updated");
      } else {
        setPreviewTab("categories");
      }
    } catch (err: any) {
      setPreviewError(err.message || "Terjadi kesalahan saat memuat preview data.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle execute sync with selected items
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
          selectedNewTaskKeys: Array.from(selectedNewTaskKeys),
          selectedNewSubtaskKeys: Array.from(selectedNewSubtaskKeys),
          selectedUpdatedTaskIds: Array.from(selectedUpdatedTaskIds),
          selectedUpdatedSubtaskIds: Array.from(selectedUpdatedSubtaskIds),
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

  // Selection toggle helpers
  const allNewTasks = useMemo(() => preview?.detectedNewItems?.newTasks || [], [preview]);
  const allNewSubtasks = useMemo(() => preview?.detectedNewItems?.newSubtasks || [], [preview]);
  const allUpdatedTasks = useMemo(() => preview?.detectedUpdatedItems?.updatedTasks || [], [preview]);
  const allUpdatedSubtasks = useMemo(() => preview?.detectedUpdatedItems?.updatedSubtasks || [], [preview]);

  const totalNewItemsCount = allNewTasks.length + allNewSubtasks.length;
  const totalUpdatedItemsCount = allUpdatedTasks.length + allUpdatedSubtasks.length;

  const selectedNewCount = selectedNewTaskKeys.size + selectedNewSubtaskKeys.size;
  const selectedUpdatedCount = selectedUpdatedTaskIds.size + selectedUpdatedSubtaskIds.size;
  const totalSelectedCount = selectedNewCount + selectedUpdatedCount;

  // Toggle single new task (and its children)
  const toggleNewTask = (taskKey: string, taskTitle: string, catName: string) => {
    const nextTasks = new Set(selectedNewTaskKeys);
    const nextSubtasks = new Set(selectedNewSubtaskKeys);
    const isAdding = !nextTasks.has(taskKey);

    if (isAdding) {
      nextTasks.add(taskKey);
      allNewSubtasks
        .filter((s) => s.taskTitle === taskTitle && s.categoryName === catName)
        .forEach((s) => s.key && nextSubtasks.add(s.key));
    } else {
      nextTasks.delete(taskKey);
      allNewSubtasks
        .filter((s) => s.taskTitle === taskTitle && s.categoryName === catName)
        .forEach((s) => s.key && nextSubtasks.delete(s.key));
    }
    setSelectedNewTaskKeys(nextTasks);
    setSelectedNewSubtaskKeys(nextSubtasks);
  };

  // Toggle single new subtask
  const toggleNewSubtask = (subKey: string, taskTitle: string, catName: string) => {
    const nextSubtasks = new Set(selectedNewSubtaskKeys);
    const nextTasks = new Set(selectedNewTaskKeys);
    const isAdding = !nextSubtasks.has(subKey);

    if (isAdding) {
      nextSubtasks.add(subKey);
      const parent = allNewTasks.find((t) => t.title === taskTitle && t.categoryName === catName);
      if (parent?.key) nextTasks.add(parent.key);
    } else {
      nextSubtasks.delete(subKey);
    }
    setSelectedNewSubtaskKeys(nextSubtasks);
    setSelectedNewTaskKeys(nextTasks);
  };

  // Toggle all new items
  const toggleAllNewItems = (select: boolean) => {
    if (select) {
      setSelectedNewTaskKeys(new Set(allNewTasks.map((t) => t.key!).filter(Boolean)));
      setSelectedNewSubtaskKeys(new Set(allNewSubtasks.map((s) => s.key!).filter(Boolean)));
    } else {
      setSelectedNewTaskKeys(new Set());
      setSelectedNewSubtaskKeys(new Set());
    }
  };

  // Toggle single updated task
  const toggleUpdatedTask = (taskId: string) => {
    const next = new Set(selectedUpdatedTaskIds);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setSelectedUpdatedTaskIds(next);
  };

  // Toggle single updated subtask
  const toggleUpdatedSubtask = (subtaskId: string) => {
    const next = new Set(selectedUpdatedSubtaskIds);
    if (next.has(subtaskId)) next.delete(subtaskId);
    else next.add(subtaskId);
    setSelectedUpdatedSubtaskIds(next);
  };

  // Toggle all updated items
  const toggleAllUpdatedItems = (select: boolean) => {
    if (select) {
      setSelectedUpdatedTaskIds(new Set(allUpdatedTasks.map((t) => t.id)));
      setSelectedUpdatedSubtaskIds(new Set(allUpdatedSubtasks.map((s) => s.id)));
    } else {
      setSelectedUpdatedTaskIds(new Set());
      setSelectedUpdatedSubtaskIds(new Set());
    }
  };

  // Filtered lists based on search query
  const query = searchQuery.trim().toLowerCase();

  const filteredNewTasks = useMemo(() => {
    if (!query) return allNewTasks;
    return allNewTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.categoryName.toLowerCase().includes(query) ||
        t.pic.toLowerCase().includes(query)
    );
  }, [allNewTasks, query]);

  const filteredNewSubtasks = useMemo(() => {
    if (!query) return allNewSubtasks;
    return allNewSubtasks.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.taskTitle.toLowerCase().includes(query) ||
        s.categoryName.toLowerCase().includes(query) ||
        s.assignees.some((a) => a.toLowerCase().includes(query))
    );
  }, [allNewSubtasks, query]);

  const filteredUpdatedTasks = useMemo(() => {
    if (!query) return allUpdatedTasks;
    return allUpdatedTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.categoryName.toLowerCase().includes(query) ||
        (t.ticketId && t.ticketId.toLowerCase().includes(query)) ||
        t.currentPic.toLowerCase().includes(query) ||
        t.newPic.toLowerCase().includes(query)
    );
  }, [allUpdatedTasks, query]);

  const filteredUpdatedSubtasks = useMemo(() => {
    if (!query) return allUpdatedSubtasks;
    return allUpdatedSubtasks.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.taskTitle.toLowerCase().includes(query) ||
        s.categoryName.toLowerCase().includes(query) ||
        s.currentAssignees.some((a) => a.toLowerCase().includes(query)) ||
        s.newAssignees.some((a) => a.toLowerCase().includes(query))
    );
  }, [allUpdatedSubtasks, query]);

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
        className="bg-canvas border border-hairline rounded-2xl max-w-[780px] md:max-w-[840px] w-full my-lg p-xl md:p-xxl shadow-2xl text-ink space-y-lg max-h-[92vh] flex flex-col overflow-hidden"
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
                Pilih tiket baru & terupdate dengan perbandingan diff visual sebelum disimpan
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
                        Semua Subtask Sinkron
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
                      <div className="p-sm rounded-lg bg-surface-soft text-[12px] text-ink/70 space-y-xs">
                        <div className="flex items-center gap-xs font-[550] text-ink">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                          <span>Semua Subtask Terdaftar di Database</span>
                        </div>
                        <p className="text-[12px] text-ink/60 leading-[1.4]">
                          Seluruh subtask untuk <strong>{syncResult.sprintLabel}</strong> sudah terdaftar di database.
                          Sinkronisasi berhasil memperbarui <strong>{syncResult.subtasksUpdated} subtask</strong>,
                          dan mempertahankan <strong>{syncResult.subtasksPreserved} subtask</strong> aktif.
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
                  <CustomDropdown
                    className="flex-1"
                    triggerClassName="h-[42px] rounded-lg text-[14px]"
                    value={selectedSprint}
                    onChange={(val) => {
                      setSelectedSprint(val);
                      setPreview(null);
                    }}
                    disabled={loadingSprints || loadingPreview || executing}
                    options={[
                      ...availableSprints.map((s) => ({
                        value: s.identifier,
                        label: `${s.label} ${s.isInDatabase ? "(Sudah di DB)" : `(${s.rowCount} baris sheet)`}`,
                        badge: s.isInDatabase ? "DB" : undefined,
                      })),
                      { value: "custom", label: "+ Input Nomor Sprint Lain..." },
                    ]}
                  />

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
                      placeholder="https://docs.google.com/spreadsheets/d/1aDi3fiKhYmAlm4ltLQV8gc7DMm2hqpZtzF9iK0jfFKQ/export?format=csv&gid=27617465"
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
              <div className="flex items-center justify-between flex-wrap gap-xs">
                <span className="text-[13px] font-[540] text-ink flex items-center gap-xs">
                  Ringkasan Pratinjau: {preview.sprintLabel}
                </span>
                <div className="flex items-center gap-xs">
                  <span className="font-mono text-[11px] text-ink/50 bg-surface-soft rounded-pill px-sm py-xxs">
                    {preview.validRows} baris sheet
                  </span>
                  <span className="font-mono text-[11px] text-primary bg-primary/10 rounded-pill px-sm py-xxs font-[550]">
                    {preview.uniqueSubtasksCount} subtask unik
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
                  <div className="text-[18px] font-[600] text-ink">{preview.uniqueSubtasksCount}</div>
                  <div className="text-[11px] text-ink/40 uppercase tracking-[0.5px]">Subtasks Unik</div>
                </div>
                <div className="bg-surface-soft/40 border border-hairline p-md rounded-xl">
                  <div className="text-[18px] font-[600] text-primary">{preview.totalWorkloadHours}h</div>
                  <div className="text-[11px] text-ink/40 uppercase tracking-[0.5px]">Bobot Jam</div>
                </div>
              </div>

              {/* Selection & Tab Navigation */}
              <div className="space-y-sm">
                <div className="flex items-center justify-between flex-wrap gap-xs border-b border-hairline pb-xs">
                  <div className="flex items-center gap-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab("new")}
                      className={`px-md py-xs rounded-lg text-[13px] font-[550] transition-colors flex items-center gap-xs cursor-pointer ${
                        previewTab === "new"
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-ink/60 hover:text-ink hover:bg-surface-soft"
                      }`}
                    >
                      <span>Item Baru Ditambahkan</span>
                      <span
                        className={`text-[11px] px-xs py-xxs rounded-full ${
                          previewTab === "new" ? "bg-white/20 text-white" : "bg-surface-soft text-ink/60 font-mono"
                        }`}
                      >
                        {totalNewItemsCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewTab("updated")}
                      className={`px-md py-xs rounded-lg text-[13px] font-[550] transition-colors flex items-center gap-xs cursor-pointer ${
                        previewTab === "updated"
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-ink/60 hover:text-ink hover:bg-surface-soft"
                      }`}
                    >
                      <span>Pembaruan & Diff</span>
                      <span
                        className={`text-[11px] px-xs py-xxs rounded-full ${
                          previewTab === "updated" ? "bg-white/20 text-white" : "bg-surface-soft text-ink/60 font-mono"
                        }`}
                      >
                        {totalUpdatedItemsCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewTab("categories")}
                      className={`px-md py-xs rounded-lg text-[13px] font-[550] transition-colors flex items-center gap-xs cursor-pointer ${
                        previewTab === "categories"
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-ink/60 hover:text-ink hover:bg-surface-soft"
                      }`}
                    >
                      <span>Kategori & Tim</span>
                      <span
                        className={`text-[11px] px-xs py-xxs rounded-full ${
                          previewTab === "categories" ? "bg-white/20 text-white" : "bg-surface-soft text-ink/60 font-mono"
                        }`}
                      >
                        {preview.categories.length}
                      </span>
                    </button>
                  </div>

                  {/* Search input */}
                  {(previewTab === "new" || previewTab === "updated") && (
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari tiket..."
                        className="h-[32px] w-[160px] sm:w-[200px] text-[12px] bg-canvas border border-hairline rounded-lg px-sm pl-7 text-ink focus:outline-none focus:border-primary"
                      />
                      <svg
                        className="absolute left-2 top-2 text-ink/40"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1.5 text-ink/40 hover:text-ink text-[12px]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* TAB 1: ITEM BARU YANG AKAN DITAMBAHKAN */}
                {previewTab === "new" && (
                  <div className="space-y-sm">
                    {/* Control Bar */}
                    <div className="p-xs px-sm rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-sm">
                        <label className="flex items-center gap-xs font-[550] text-emerald-950 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={totalNewItemsCount > 0 && selectedNewCount === totalNewItemsCount}
                            onChange={(e) => toggleAllNewItems(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-emerald-300 cursor-pointer"
                          />
                          <span>Pilih Semua Item Baru</span>
                        </label>
                        <span className="text-emerald-800/80 font-mono text-[11px]">
                          ({selectedNewCount} dari {totalNewItemsCount} dipilih)
                        </span>
                      </div>

                      <div className="flex items-center gap-xs text-[11px]">
                        <button
                          type="button"
                          onClick={() => toggleAllNewItems(true)}
                          className="text-emerald-700 hover:underline cursor-pointer"
                        >
                          Centang Semua
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => toggleAllNewItems(false)}
                          className="text-ink/50 hover:underline cursor-pointer"
                        >
                          Batal Centang
                        </button>
                      </div>
                    </div>

                    {totalNewItemsCount === 0 ? (
                      <div className="p-xl text-center border border-dashed border-hairline rounded-xl text-ink/50 text-[13px]">
                        Tidak ada task atau subtask baru yang terdeteksi untuk ditambahkan.
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto space-y-xs pr-xs">
                        {/* New Tasks */}
                        {filteredNewTasks.map((t, idx) => {
                          const isChecked = t.key ? selectedNewTaskKeys.has(t.key) : true;
                          return (
                            <div
                              key={`task-${idx}`}
                              className={`p-sm rounded-xl border transition-colors flex items-center justify-between text-[12px] ${
                                isChecked
                                  ? "bg-canvas border-emerald-300 shadow-xs"
                                  : "bg-surface-soft/40 border-hairline/60 opacity-60"
                              }`}
                            >
                              <label className="flex items-center gap-sm flex-1 min-w-0 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => t.key && toggleNewTask(t.key, t.title, t.categoryName)}
                                  className="w-4 h-4 rounded text-emerald-600 border-hairline cursor-pointer"
                                />
                                <div className="flex items-center gap-xs flex-wrap min-w-0">
                                  <span className="text-[10px] font-bold uppercase px-xs py-xxs bg-emerald-100 text-emerald-800 rounded flex-shrink-0">
                                    Task Baru
                                  </span>
                                  <span className="font-[600] text-ink truncate">{t.title}</span>
                                </div>
                              </label>
                              <div className="flex items-center gap-sm flex-shrink-0 text-[11px] text-ink/50">
                                <span className="bg-surface-soft px-xs py-xxs rounded">{t.categoryName}</span>
                                <span>PIC: {t.pic}</span>
                              </div>
                            </div>
                          );
                        })}

                        {/* New Subtasks */}
                        {filteredNewSubtasks.map((st, idx) => {
                          const isChecked = st.key ? selectedNewSubtaskKeys.has(st.key) : true;
                          return (
                            <div
                              key={`sub-${idx}`}
                              className={`p-sm rounded-xl border transition-colors text-[12px] space-y-xxs ${
                                isChecked
                                  ? "bg-canvas border-blue-200/80 shadow-xs"
                                  : "bg-surface-soft/40 border-hairline/60 opacity-60"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-sm">
                                <label className="flex items-start gap-sm flex-1 min-w-0 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => st.key && toggleNewSubtask(st.key, st.taskTitle, st.categoryName)}
                                    className="mt-0.5 w-4 h-4 rounded text-primary border-hairline cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-xs flex-wrap">
                                      <span className="text-[10px] font-bold uppercase px-xs py-xxs bg-blue-100 text-blue-800 rounded flex-shrink-0">
                                        Subtask
                                      </span>
                                      <span className="font-[600] text-ink">{st.title}</span>
                                    </div>
                                    <div className="text-[11px] text-ink/50 mt-xxs flex items-center gap-xs flex-wrap">
                                      <span>Task: <strong>{st.taskTitle}</strong></span>
                                      <span>•</span>
                                      <span>{st.categoryName}</span>
                                    </div>
                                  </div>
                                </label>
                                <span className="font-mono text-[11px] bg-emerald-100 text-emerald-900 rounded px-xs py-xxs font-[600] flex-shrink-0">
                                  {st.workloadHours}h
                                </span>
                              </div>
                              <div className="text-[11px] text-ink/60 pl-6 flex items-center gap-xs">
                                <span>Assignee:</span>
                                <span className="font-medium text-ink">
                                  {st.assignees.length > 0 ? st.assignees.join(", ") : "Tim"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: PEMBARUAN & PERBANDINGAN DIFF */}
                {previewTab === "updated" && (
                  <div className="space-y-sm">
                    {/* Control Bar */}
                    <div className="p-xs px-sm rounded-lg bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-sm">
                        <label className="flex items-center gap-xs font-[550] text-blue-950 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={totalUpdatedItemsCount > 0 && selectedUpdatedCount === totalUpdatedItemsCount}
                            onChange={(e) => toggleAllUpdatedItems(e.target.checked)}
                            className="w-4 h-4 rounded text-primary border-blue-300 cursor-pointer"
                          />
                          <span>Pilih Semua Pembaruan</span>
                        </label>
                        <span className="text-blue-800/80 font-mono text-[11px]">
                          ({selectedUpdatedCount} dari {totalUpdatedItemsCount} dipilih)
                        </span>
                      </div>

                      <div className="flex items-center gap-xs text-[11px]">
                        <button
                          type="button"
                          onClick={() => toggleAllUpdatedItems(true)}
                          className="text-primary hover:underline cursor-pointer font-[500]"
                        >
                          Centang Semua
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => toggleAllUpdatedItems(false)}
                          className="text-ink/50 hover:underline cursor-pointer"
                        >
                          Batal Centang
                        </button>
                      </div>
                    </div>

                    {totalUpdatedItemsCount === 0 ? (
                      <div className="p-xl text-center border border-dashed border-hairline rounded-xl text-ink/50 text-[13px] space-y-xs">
                        <div className="font-[550] text-ink">Semua Tiket di Database Sudah Sinkron</div>
                        <p className="text-[12px] text-ink/40">
                          Tidak ditemukan perbedaan bobot jam, assignee, status, atau prioritas pada tiket yang sudah terdaftar.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto space-y-xs pr-xs">
                        {/* Updated Tasks */}
                        {filteredUpdatedTasks.map((t) => {
                          const isChecked = selectedUpdatedTaskIds.has(t.id);
                          return (
                            <div
                              key={`upd-task-${t.id}`}
                              className={`p-md rounded-xl border transition-all text-[12px] space-y-xs ${
                                isChecked
                                  ? "bg-canvas border-blue-300 shadow-xs"
                                  : "bg-surface-soft/40 border-hairline/60 opacity-60"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-sm">
                                <label className="flex items-start gap-sm flex-1 min-w-0 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleUpdatedTask(t.id)}
                                    className="mt-0.5 w-4 h-4 rounded text-primary border-hairline cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-xs flex-wrap">
                                      <span className="text-[10px] font-bold uppercase px-xs py-xxs bg-indigo-100 text-indigo-800 rounded flex-shrink-0">
                                        Update Task
                                      </span>
                                      {t.ticketId && (
                                        <span className="font-mono text-[11px] font-bold text-ink/50 bg-surface-soft px-xs py-xxs rounded">
                                          {t.ticketId}
                                        </span>
                                      )}
                                      <span className="font-[600] text-ink">{t.title}</span>
                                    </div>
                                    <div className="text-[11px] text-ink/50 mt-xxs">
                                      Kategori: <strong>{t.categoryName}</strong>
                                    </div>
                                  </div>
                                </label>
                                <span className="font-mono text-[11px] px-xs py-xxs bg-surface-soft text-ink/70 rounded">
                                  {t.diffs.length} perubahan
                                </span>
                              </div>

                              {/* Diff Comparison Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs pl-6 pt-xs border-t border-hairline/50">
                                {t.diffs.map((d, dIdx) => (
                                  <div key={dIdx} className="p-xs px-sm rounded-lg bg-surface-soft/60 border border-hairline/50 text-[11px]">
                                    <span className="text-[10px] uppercase font-bold text-ink/40 tracking-[0.4px] block mb-xxs">
                                      {d.label}
                                    </span>
                                    <div className="flex items-center gap-xs flex-wrap">
                                      <span className="line-through text-red-600 bg-red-50 border border-red-200/60 px-xs py-xxs rounded font-mono">
                                        {d.oldValue || "-"}
                                      </span>
                                      <span className="text-ink/40">➔</span>
                                      <span className="font-[600] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-xs py-xxs rounded font-mono">
                                        {d.newValue || "-"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {/* Updated Subtasks */}
                        {filteredUpdatedSubtasks.map((st) => {
                          const isChecked = selectedUpdatedSubtaskIds.has(st.id);
                          return (
                            <div
                              key={`upd-sub-${st.id}`}
                              className={`p-md rounded-xl border transition-all text-[12px] space-y-xs ${
                                isChecked
                                  ? "bg-canvas border-blue-300 shadow-xs"
                                  : "bg-surface-soft/40 border-hairline/60 opacity-60"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-sm">
                                <label className="flex items-start gap-sm flex-1 min-w-0 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleUpdatedSubtask(st.id)}
                                    className="mt-0.5 w-4 h-4 rounded text-primary border-hairline cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-xs flex-wrap">
                                      <span className="text-[10px] font-bold uppercase px-xs py-xxs bg-blue-100 text-blue-800 rounded flex-shrink-0">
                                        Update Subtask
                                      </span>
                                      <span className="font-[600] text-ink">{st.title}</span>
                                    </div>
                                    <div className="text-[11px] text-ink/50 mt-xxs flex items-center gap-xs flex-wrap">
                                      <span>Task: <strong>{st.taskTitle}</strong></span>
                                      <span>•</span>
                                      <span>{st.categoryName}</span>
                                    </div>
                                  </div>
                                </label>
                                <span className="font-mono text-[11px] px-xs py-xxs bg-surface-soft text-ink/70 rounded flex-shrink-0">
                                  {st.diffs.length} perubahan
                                </span>
                              </div>

                              {/* Diff Comparison Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs pl-6 pt-xs border-t border-hairline/50">
                                {st.diffs.map((d, dIdx) => (
                                  <div key={dIdx} className="p-xs px-sm rounded-lg bg-surface-soft/60 border border-hairline/50 text-[11px]">
                                    <span className="text-[10px] uppercase font-bold text-ink/40 tracking-[0.4px] block mb-xxs">
                                      {d.label}
                                    </span>
                                    <div className="flex items-center gap-xs flex-wrap">
                                      <span className="line-through text-red-600 bg-red-50 border border-red-200/60 px-xs py-xxs rounded font-mono">
                                        {d.oldValue || "-"}
                                      </span>
                                      <span className="text-ink/40">➔</span>
                                      <span className="font-[600] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-xs py-xxs rounded font-mono">
                                        {d.newValue || "-"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: RINCIAN KATEGORI & KONTRIBUTOR */}
                {previewTab === "categories" && (
                  <div className="space-y-sm">
                    <div className="p-sm max-h-[220px] overflow-y-auto space-y-xs bg-canvas border border-hairline rounded-xl">
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

                    {/* Top Contributors */}
                    <div className="space-y-xs pt-xs">
                      <div className="text-[11px] font-[540] text-ink/40 uppercase tracking-[0.5px]">
                        Kontributor ({preview.contributors.length} anggota tim):
                      </div>
                      <div className="flex flex-wrap gap-xs max-h-[80px] overflow-y-auto pr-xs">
                        {preview.contributors.slice(0, 10).map((c) => (
                          <span
                            key={c.name}
                            className="text-[11px] bg-surface-soft border border-hairline rounded-pill px-sm py-xxs text-ink/70"
                          >
                            {c.name}: <strong className="text-ink">{c.hours}h</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Smart Merge Safety Banner */}
              <div className="p-md rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 space-y-xs">
                <div className="flex items-center gap-xs font-[600] text-[13px] text-blue-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Smart Merge & Perlindungan Progres</span>
                </div>
                <p className="text-[12px] text-blue-700 leading-[1.4]">
                  Hanya tiket yang dicentang yang akan ditambahkan atau diperbarui.
                  {preview.delta.preservedInProgressSubtasks > 0 ? (
                    <span className="block mt-xxs font-[550] text-blue-900">
                      🛡️ Terdapat {preview.delta.preservedInProgressSubtasks} subtask yang sedang/sudah dikerjakan tim — statusnya akan tetap dipertahankan aman!
                    </span>
                  ) : (
                    <span className="block mt-xxs">
                      Subtask yang berstatus <i>in_progress</i>, <i>review</i>, atau <i>done</i> tidak akan pernah direset ke to_do.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-sm pt-sm border-t border-hairline flex-wrap">
          {syncResult ? (
            <div className="w-full flex justify-end">
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
            </div>
          ) : (
            <>
              {preview && (
                <div className="text-[12px] text-ink/60 font-mono">
                  {totalNewItemsCount + totalUpdatedItemsCount > 0 ? (
                    <span>
                      Terpilih: <strong>{totalSelectedCount}</strong> dari {totalNewItemsCount + totalUpdatedItemsCount} tiket
                    </span>
                  ) : (
                    <span>Data sepenuhnya sinkron</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-sm ml-auto">
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
                    disabled={executing || (totalNewItemsCount + totalUpdatedItemsCount > 0 && totalSelectedCount === 0)}
                    className="h-[42px] px-xl rounded-lg bg-primary text-on-primary font-[540] text-[13px] hover:opacity-90 transition-opacity flex items-center gap-sm cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {executing ? (
                      <span>Sedang Menyinkronkan ke Cloud...</span>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>
                          {totalNewItemsCount + totalUpdatedItemsCount > 0
                            ? `Mulai Sinkronisasi (${totalSelectedCount} Item Terpilih)`
                            : "Mulai Sinkronisasi Data"}
                        </span>
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
