"use client";

import { useState, useEffect, useCallback } from "react";
import type { StaffAssignmentHistoryLog } from "@/lib/types";

interface StaffOption {
  id: string;
  username: string;
  nama: string;
  role: string;
  assignedLeads?: Array<{ id: string; nama: string; username: string }>;
}

interface StaffAssignmentHistoryDialogProps {
  open: boolean;
  subtaskTitle: string;
  subtaskId: string;
  currentAssignees: string[];
  assignmentHistory?: StaffAssignmentHistoryLog[];
  availableStaff?: string[];
  taskLead?: string;
  onClose: () => void;
  onReassign: (newAssignees: string[], reason: string) => Promise<void> | void;
}

function formatAssigneeName(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const record = val as Record<string, unknown>;
    if (typeof record.name === "string" && record.name.trim()) return record.name;
    if (typeof record.id === "string" && record.id.trim()) return record.id;
  }
  return String(val);
}

export default function StaffAssignmentHistoryDialog({
  open,
  subtaskTitle,
  subtaskId,
  currentAssignees,
  assignmentHistory: initialHistory = [],
  availableStaff = [],
  taskLead,
  onClose,
  onReassign,
}: StaffAssignmentHistoryDialogProps) {
  const [history, setHistory] = useState<StaffAssignmentHistoryLog[]>(initialHistory);
  const [loading, setLoading] = useState(false);
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string[]>(currentAssignees);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Data staf dari database
  const [userList, setUserList] = useState<StaffOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchStaff, setSearchStaff] = useState("");
  const [staffTab, setStaffTab] = useState<"all" | "team">("all");

  const fetchHistory = useCallback(async () => {
    if (!subtaskId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}/assignment-history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch assignment history", err);
    } finally {
      setLoading(false);
    }
  }, [subtaskId]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      let res = await fetch("/api/staff");
      if (!res.ok) {
        res = await fetch("/api/users");
      }
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.staff || [];
        const eligible = list.filter((u: { role?: string }) => u.role === "staff" || u.role === "lead");
        setUserList(eligible);
      }
    } catch (err) {
      console.error("Failed to fetch staff list", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedStaff(currentAssignees);
      setReason("");
      setShowReassignForm(false);
      setSearchStaff("");
      setStaffTab("all");
      fetchHistory();
      fetchUsers();
    }
  }, [open, currentAssignees, fetchHistory, fetchUsers]);

  if (!open) return null;

  // Fallback ke availableStaff jika userList belum selesai dimuat
  const displayStaffList: StaffOption[] =
    userList.length > 0
      ? userList
      : (availableStaff || []).map((name) => ({
          id: name,
          username: name.toLowerCase(),
          nama: name,
          role: "staff",
        }));

  // Cek apakah staf ada di tim taskLead saat ini
  const isTeamStaff = (u: StaffOption) => {
    if (!taskLead) return false;
    const normLead = taskLead.toLowerCase();
    return (
      u.assignedLeads?.some(
        (l) => l.nama.toLowerCase() === normLead || l.username.toLowerCase() === normLead
      ) ?? false
    );
  };

  const teamStaffCount = displayStaffList.filter(isTeamStaff).length;

  const filteredStaff = displayStaffList.filter((u) => {
    if (staffTab === "team" && taskLead && !isTeamStaff(u)) {
      return false;
    }
    if (searchStaff.trim()) {
      const q = searchStaff.toLowerCase().trim();
      return u.nama.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    }
    return true;
  });

  const isStaffSelected = (u: StaffOption) => {
    const uNorm = u.username.toLowerCase();
    const nNorm = u.nama.toLowerCase();
    return selectedStaff.some((s) => {
      const sNorm = s.toLowerCase();
      return sNorm === uNorm || sNorm === nNorm;
    });
  };

  const toggleStaff = (u: StaffOption) => {
    const uNorm = u.username.toLowerCase();
    const nNorm = u.nama.toLowerCase();
    const exists = selectedStaff.some((s) => {
      const sNorm = s.toLowerCase();
      return sNorm === uNorm || sNorm === nNorm;
    });

    if (exists) {
      if (selectedStaff.length === 1) return; // Minimal 1 staf pelaksana
      setSelectedStaff(
        selectedStaff.filter((s) => {
          const sNorm = s.toLowerCase();
          return sNorm !== uNorm && sNorm !== nNorm;
        })
      );
    } else {
      setSelectedStaff([...selectedStaff, u.username]);
    }
  };

  const removeSelected = (staffName: string) => {
    if (selectedStaff.length === 1) return;
    const norm = staffName.toLowerCase();
    setSelectedStaff(selectedStaff.filter((s) => s.toLowerCase() !== norm));
  };

  const handleSaveReassign = async () => {
    if (selectedStaff.length === 0) return;
    setSubmitting(true);
    try {
      await onReassign(selectedStaff, reason);
      await fetchHistory();
      setShowReassignForm(false);
      setReason("");
    } catch (err) {
      console.error("Failed to reassign staff", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-md"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-[560px] w-full p-xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-md border-b border-gray-100">
          <div>
            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">
              Audit Trail Tim
            </div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">Histori Penugasan Staf</h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              Subtask: <span className="font-medium text-gray-700">"{subtaskTitle}"</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="py-md flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-xs text-xs text-gray-600">
            <span className="font-semibold text-gray-800">Pelaksana Aktif:</span>
            <div className="flex flex-wrap gap-1">
              {currentAssignees.map((a) => (
                <span key={a} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium border border-indigo-100 capitalize">
                  {a}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !showReassignForm;
              setShowReassignForm(next);
              if (next && userList.length === 0) {
                fetchUsers();
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {showReassignForm ? "Tutup Form" : "Re-alokasi Staf"}
          </button>
        </div>

        {/* Re-assignment Form Collapsible */}
        {showReassignForm && (
          <div className="p-md mb-md bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-md animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-xs">
                <label className="text-xs font-bold text-gray-800">
                  Pilih Pelaksana Baru (Multi-Select)
                </label>
                <span className="text-[11px] text-gray-500">
                  Minimal 1 staf pelaksana
                </span>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="space-y-xs mb-xs">
                {taskLead && teamStaffCount > 0 && (
                  <div className="flex items-center gap-xs">
                    <button
                      type="button"
                      onClick={() => setStaffTab("all")}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        staffTab === "all"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      Semua Staf ({displayStaffList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffTab("team")}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        staffTab === "team"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      Tim {taskLead} ({teamStaffCount})
                    </button>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    value={searchStaff}
                    onChange={(e) => setSearchStaff(e.target.value)}
                    placeholder="Cari nama staf untuk realokasi..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
                  {searchStaff && (
                    <button
                      type="button"
                      onClick={() => setSearchStaff("")}
                      className="absolute right-2.5 top-1.5 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Staff Grid Container */}
              <div className="max-h-[160px] overflow-y-auto p-2 bg-white rounded-lg border border-indigo-100/70">
                {loadingUsers ? (
                  <div className="py-md text-center text-xs text-gray-400">Memuat daftar staf...</div>
                ) : filteredStaff.length === 0 ? (
                  <div className="py-md text-center text-xs text-gray-400">Tidak ada staf yang sesuai pencarian.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {filteredStaff.map((u) => {
                      const selected = isStaffSelected(u);
                      const isLeadMember = isTeamStaff(u);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleStaff(u)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                            selected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={{
                              backgroundColor: selected ? "rgba(255,255,255,0.25)" : "#e0e7ff",
                              color: selected ? "#ffffff" : "#4338ca",
                            }}
                          >
                            {u.nama.charAt(0).toUpperCase()}
                          </span>
                          <span>{u.nama}</span>
                          {isLeadMember && !selected && (
                            <span className="text-[9px] text-indigo-500 font-normal">
                              (Tim)
                            </span>
                          )}
                          <span className="font-bold text-[11px] ml-0.5">{selected ? "✓" : "+"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected summary */}
              <div className="mt-xs flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-gray-600">Terpilih:</span>
                {selectedStaff.map((staffName) => {
                  const found = displayStaffList.find(
                    (u) =>
                      u.username.toLowerCase() === staffName.toLowerCase() ||
                      u.nama.toLowerCase() === staffName.toLowerCase()
                  );
                  const displayName = found ? found.nama : staffName;
                  return (
                    <span
                      key={staffName}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-medium"
                    >
                      {displayName}
                      {selectedStaff.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSelected(staffName)}
                          className="hover:text-red-600 font-bold ml-0.5"
                          title="Hapus"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-800 block mb-xs">Alasan Re-alokasi / Catatan</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Re-alokasi beban kerja sprint, kendala sakit, dll."
                className="w-full px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-xs pt-xs">
              <button
                type="button"
                onClick={() => setShowReassignForm(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting || selectedStaff.length === 0}
                onClick={handleSaveReassign}
                className="px-3.5 py-1.5 text-xs bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 shadow-xs flex items-center gap-1"
              >
                {submitting ? "Menyimpan..." : "Simpan Perubahan Penugasan"}
              </button>
            </div>
          </div>
        )}

        {/* Timeline Log List */}
        <div className="flex-1 overflow-y-auto py-sm pr-xs space-y-md">
          {loading ? (
            <div className="py-xl text-center text-xs text-gray-400">Memuat riwayat penugasan...</div>
          ) : history.length === 0 ? (
            <div className="py-xl text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
              <p className="font-medium text-gray-600">Belum ada riwayat perubahan penugasan.</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Semua penugasan saat ini adalah penugasan awal.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-indigo-100 ml-3 pl-4 space-y-md">
              {history.map((item) => {
                const prev = item.previousAssignees || [];
                const next = item.newAssignees || [];
                const formattedDate = new Date(item.createdAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />

                    <div className="bg-gray-50/80 hover:bg-gray-50 p-sm rounded-lg border border-gray-100 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-bold">
                            {item.changedBy.charAt(0).toUpperCase()}
                          </span>
                          {item.changedBy}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{formattedDate}</span>
                      </div>

                      {/* Before -> After Badges */}
                      <div className="text-xs space-y-1 my-1">
                        <div className="flex items-center gap-1 flex-wrap text-[11px]">
                          <span className="text-gray-400 font-mono text-[10px] uppercase">Sebelum:</span>
                          {prev.length > 0 ? (
                            prev.map((p, idx) => {
                              const name = formatAssigneeName(p);
                              return (
                                <span
                                  key={`${item.id}-prev-${idx}-${name}`}
                                  className="px-1.5 py-0.2 rounded bg-gray-200 text-gray-600"
                                >
                                  {name}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-gray-400 italic">(Belum ada)</span>
                          )}
                          <span className="text-indigo-400 font-bold mx-1">➔</span>
                          <span className="text-gray-400 font-mono text-[10px] uppercase">Sesudah:</span>
                          {next.length > 0 ? (
                            next.map((n, idx) => {
                              const name = formatAssigneeName(n);
                              return (
                                <span
                                  key={`${item.id}-next-${idx}-${name}`}
                                  className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-medium"
                                >
                                  {name}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-gray-400 italic">(Kosong)</span>
                          )}
                        </div>
                      </div>

                      {item.reason && (
                        <p className="text-[11px] text-gray-600 italic bg-white p-1.5 rounded border border-gray-100 mt-1.5">
                          "{item.reason}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-md mt-sm border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
