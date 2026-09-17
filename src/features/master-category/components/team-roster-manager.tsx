"use client";

import { useState, useEffect } from "react";

interface StaffMember {
  id: string;
  nama: string;
  username: string;
  role: string;
  department: string | null;
}

interface LeadTeam {
  id: string;
  nama: string;
  username: string;
  role: string;
  department: string | null;
  staffCount: number;
  staffMembers: StaffMember[];
}

interface StaffWithLeads extends StaffMember {
  assignedLeads: Array<{ id: string; nama: string; username: string }>;
}

/**
 * Komponen Manajemen Struktur Tim (Lead & Staff Matrix)
 * Menampilkan kartu per Lead, jumlah staff yang dibawahi, dan kemudahan menugaskan/mencabut staff.
 */
export default function TeamRosterManager() {
  const [leads, setLeads] = useState<LeadTeam[]>([]);
  const [staffList, setStaffList] = useState<StaffWithLeads[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [selectedStaffToAdd, setSelectedStaffToAdd] = useState<Record<string, string>>({});

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/master/teams");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setStaffList(data.staffList || []);
      }
    } catch (err) {
      console.error("Gagal memuat tim:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const showToast = (text: string, success = true) => {
    setToastMessage({ text, success });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAssignStaff = async (leadId: string, staffId: string) => {
    if (!staffId) return;
    const key = `assign-${leadId}-${staffId}`;
    setProcessingKey(key);

    try {
      const res = await fetch("/api/master/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, staffId }),
      });

      if (res.ok) {
        // Reset dropdown selection
        setSelectedStaffToAdd((prev) => ({ ...prev, [leadId]: "" }));
        await fetchTeams();
        showToast("✅ Staff berhasil ditugaskan ke Lead");
      } else {
        const err = await res.json();
        showToast(`❌ ${err.error || "Gagal menugaskan staff"}`, false);
      }
    } catch {
      showToast("❌ Terjadi kesalahan jaringan", false);
    } finally {
      setProcessingKey(null);
    }
  };

  const handleUnassignStaff = async (leadId: string, staffId: string, staffName: string) => {
    const key = `unassign-${leadId}-${staffId}`;
    setProcessingKey(key);

    try {
      const res = await fetch("/api/master/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, staffId }),
      });

      if (res.ok) {
        await fetchTeams();
        showToast(`Penugasan ${staffName} berhasil dicabut`);
      } else {
        const err = await res.json();
        showToast(`❌ ${err.error || "Gagal mencabut penugasan"}`, false);
      }
    } catch {
      showToast("❌ Terjadi kesalahan jaringan", false);
    } finally {
      setProcessingKey(null);
    }
  };

  // Hitung metrik
  const totalLeads = leads.length;
  const totalStaff = staffList.length;
  const staffWithAtLeastOneLead = staffList.filter((s) => s.assignedLeads.length > 0).length;

  return (
    <section id="team-roster" className="bg-canvas border border-hairline rounded-xl p-xxl space-y-lg shadow-xs">
      {/* Toast Notifikasi */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-canvas rounded-lg px-lg py-sm text-[13px] font-[500] shadow-xl animate-in fade-in slide-in-from-bottom-2">
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md pb-md border-b border-hairline">
        <div>
          <div className="flex items-center gap-xs">
            <h3 className="text-[16px] font-[540] text-ink">Struktur Tim & Anggota Staff per Lead</h3>
            <span className="text-[11px] font-[540] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
              Matrix Structure
            </span>
          </div>
          <p className="text-[12px] font-[320] text-ink/45 mt-0.5">
            Tentukan siapa saja personil staff di bawah tanggung jawab masing-masing Lead. Satu staff dapat ditugaskan ke lebih dari satu Lead.
          </p>
        </div>

        {/* Ringkasan Angka */}
        <div className="flex items-center gap-sm flex-shrink-0">
          <div className="bg-surface-soft/80 border border-hairline rounded-lg px-md py-1.5 text-center">
            <div className="text-[16px] font-[540] text-ink">{totalLeads}</div>
            <div className="text-[10px] uppercase font-[540] text-ink/40">Leads</div>
          </div>
          <div className="bg-surface-soft/80 border border-hairline rounded-lg px-md py-1.5 text-center">
            <div className="text-[16px] font-[540] text-primary">{totalStaff}</div>
            <div className="text-[10px] uppercase font-[540] text-ink/40">Total Staff</div>
          </div>
          <div className="bg-surface-soft/80 border border-hairline rounded-lg px-md py-1.5 text-center">
            <div className="text-[16px] font-[540] text-green-600">{staffWithAtLeastOneLead}</div>
            <div className="text-[10px] uppercase font-[540] text-ink/40">Terpetakan</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-xl text-center text-[13px] text-ink/40">
          Memuat struktur tim...
        </div>
      ) : leads.length === 0 ? (
        <div className="py-xl text-center text-[13px] text-ink/40">
          Belum ada pengguna dengan role Lead di database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg pt-xs">
          {leads.map((lead) => {
            const assignedStaffIds = new Set(lead.staffMembers.map((s) => s.id));
            const availableStaffForThisLead = staffList.filter((s) => !assignedStaffIds.has(s.id));
            const currentSelected = selectedStaffToAdd[lead.id] || "";

            return (
              <div
                key={lead.id}
                className="bg-surface-soft/30 border border-hairline rounded-xl p-lg flex flex-col justify-between space-y-md hover:border-ink/20 transition-all shadow-2xs"
              >
                {/* Header Kartu Lead */}
                <div className="flex items-center justify-between pb-sm border-b border-hairline/60">
                  <div className="flex items-center gap-sm">
                    <div className="w-[34px] h-[34px] rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-[540] text-primary text-[12px]">
                      {lead.nama.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[14px] font-[540] text-ink leading-tight">{lead.nama}</div>
                      <div className="text-[11px] font-mono text-ink/40">@{lead.username}</div>
                    </div>
                  </div>

                  <span className="text-[12px] font-[540] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/15">
                    {lead.staffCount} Staff
                  </span>
                </div>

                {/* List Staff Members */}
                <div className="flex-1 space-y-xs min-h-[90px]">
                  <div className="text-[11px] font-[540] uppercase tracking-wider text-ink/40 mb-1">
                    Anggota Tim ({lead.staffCount})
                  </div>

                  {lead.staffMembers.length === 0 ? (
                    <div className="text-[12px] italic text-ink/35 py-sm">
                      Belum ada staff yang ditugaskan ke Lead ini.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {lead.staffMembers.map((staff) => {
                        const isRemoving = processingKey === `unassign-${lead.id}-${staff.id}`;
                        return (
                          <span
                            key={staff.id}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px] font-[480] bg-canvas border border-hairline text-ink transition-all ${
                              isRemoving ? "opacity-30 pointer-events-none" : "hover:border-ink/30"
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-surface-soft text-[9px] font-[540] flex items-center justify-center text-ink/60">
                              {staff.nama.slice(0, 1)}
                            </span>
                            <span>{staff.nama}</span>
                            <button
                              type="button"
                              onClick={() => handleUnassignStaff(lead.id, staff.id, staff.nama)}
                              title={`Hapus ${staff.nama} dari tim ${lead.nama}`}
                              className="w-3.5 h-3.5 rounded-full hover:bg-red-500 hover:text-white text-ink/35 flex items-center justify-center text-[9px] cursor-pointer transition-colors ml-0.5"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Add Staff Dropdown */}
                <div className="pt-sm border-t border-hairline/60">
                  <div className="relative flex items-center">
                    <select
                      value={currentSelected}
                      disabled={availableStaffForThisLead.length === 0}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedStaffToAdd((prev) => ({ ...prev, [lead.id]: val }));
                        if (val) {
                          handleAssignStaff(lead.id, val);
                        }
                      }}
                      className="w-full h-[34px] rounded-lg border border-hairline bg-canvas pl-3 pr-8 text-[12px] text-ink font-[450] focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                    >
                      <option value="">
                        {availableStaffForThisLead.length === 0
                          ? "Semua staff sudah masuk"
                          : "+ Tambah Staff ke Tim..."}
                      </option>
                      {availableStaffForThisLead.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} {s.assignedLeads.length > 0 ? `(sudah di ${s.assignedLeads.map((l) => l.nama).join(", ")})` : "(belum ada lead)"}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 text-ink/40">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
