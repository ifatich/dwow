"use client";

import { useState, useEffect } from "react";

interface MasterCategory {
  id: string;
  name: string;
  code: string;
  lead_id: string | null;
  description: string | null;
  is_active: number | boolean;
  lead_nama?: string | null;
  lead_username?: string | null;
  lead_role?: string | null;
  total_projects?: number;
  total_tasks?: number;
}

interface AvailableLead {
  id: string;
  nama: string;
  username: string;
  role: string;
  department?: string | null;
}

/**
 * Komponen Pengelola Data Master Kategori Project & Penetapan Lead
 * Memungkinkan reviewer/admin mengatur kategori proyek dan PIC Lead secara definitif.
 */
export default function MasterCategoryManager() {
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [availableLeads, setAvailableLeads] = useState<AvailableLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ id: string; text: string; success: boolean } | null>(null);

  // Modal tambah kategori
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [addError, setAddError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/master/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setAvailableLeads(data.availableLeads || []);
      }
    } catch (err) {
      console.error("Gagal mengambil master categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleLeadChange = async (categoryId: string, leadId: string) => {
    setUpdatingId(categoryId);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/master/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: categoryId,
          lead_id: leadId || null,
          syncExisting: true, // Otomatis sync ke project & task aktif
        }),
      });

      if (res.ok) {
        const selectedLead = availableLeads.find((l) => l.id === leadId);
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  lead_id: leadId || null,
                  lead_nama: selectedLead?.nama || null,
                  lead_username: selectedLead?.username || null,
                }
              : c
          )
        );
        setSaveMessage({
          id: categoryId,
          text: `Lead diubah ke ${selectedLead?.nama || "Unassigned"}`,
          success: true,
        });
      } else {
        const err = await res.json();
        setSaveMessage({
          id: categoryId,
          text: err.error || "Gagal mengubah lead",
          success: false,
        });
      }
    } catch (err) {
      setSaveMessage({
        id: categoryId,
        text: "Terjadi kesalahan jaringan",
        success: false,
      });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setAddError("Nama kategori wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setAddError("");

    try {
      const res = await fetch("/api/master/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          code: newCode.trim() || undefined,
          lead_id: newLeadId || null,
          description: newDesc.trim() || undefined,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewName("");
        setNewCode("");
        setNewLeadId("");
        setNewDesc("");
        await fetchCategories();
      } else {
        const err = await res.json();
        setAddError(err.error || "Gagal menambahkan kategori");
      }
    } catch {
      setAddError("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="master-categories" className="bg-canvas border border-hairline rounded-xl p-xxl space-y-lg shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md pb-md border-b border-hairline">
        <div>
          <div className="flex items-center gap-xs">
            <h3 className="text-[16px] font-[540] text-ink">Master Kategori Project & Lead PIC</h3>
            <span className="text-[11px] font-[540] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {categories.length} Kategori
            </span>
          </div>
          <p className="text-[12px] font-[320] text-ink/45 mt-0.5">
            Tentukan Lead penanggung jawab untuk setiap kategori project. Setiap sinkronisasi atau pembaruan akan otomatis menggunakan data master ini.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="h-[36px] rounded-lg px-lg bg-primary text-on-primary text-[12px] font-[540] hover:opacity-90 transition-opacity flex items-center justify-center gap-xs cursor-pointer flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Tambah Kategori</span>
        </button>
      </div>

      {loading ? (
        <div className="py-xl text-center text-[13px] text-ink/40">
          Memuat data master kategori...
        </div>
      ) : categories.length === 0 ? (
        <div className="py-xl text-center text-[13px] text-ink/40">
          Belum ada data kategori project.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-hairline text-[11px] font-[540] text-ink/40 uppercase tracking-wider">
                <th className="py-sm px-md">Kategori Project</th>
                <th className="py-sm px-md">Prefix Tiket</th>
                <th className="py-sm px-md">Lead Penanggung Jawab</th>
                <th className="py-sm px-md text-right">Relasi Task</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {categories.map((cat) => {
                const isUpdating = updatingId === cat.id;
                const feedback = saveMessage?.id === cat.id ? saveMessage : null;

                return (
                  <tr key={cat.id} className="hover:bg-surface-soft/40 transition-colors">
                    <td className="py-md px-md">
                      <div className="font-[520] text-ink">{cat.name}</div>
                      {cat.description && (
                        <div className="text-[11px] text-ink/40 line-clamp-1 mt-0.5">
                          {cat.description}
                        </div>
                      )}
                    </td>

                    <td className="py-md px-md">
                      <span className="font-mono text-[11px] font-[540] px-2 py-1 rounded bg-surface-soft text-ink/70 border border-hairline">
                        {cat.code}
                      </span>
                    </td>

                    <td className="py-md px-md">
                      <div className="flex items-center gap-xs">
                        <div className="relative inline-flex items-center">
                          <select
                            value={cat.lead_id || ""}
                            disabled={isUpdating}
                            onChange={(e) => handleLeadChange(cat.id, e.target.value)}
                            className="h-[34px] rounded-lg border border-hairline bg-canvas pl-3 pr-8 text-[13px] text-ink font-[450] hover:border-ink/30 focus:border-primary focus:outline-none cursor-pointer transition-colors appearance-none"
                          >
                            <option value="">— Belum Ditentukan —</option>
                            {availableLeads.map((lead) => (
                              <option key={lead.id} value={lead.id}>
                                {lead.nama}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute right-2.5 text-ink/40">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>

                        {isUpdating && (
                          <span className="text-[11px] text-ink/40 animate-pulse">Menyimpan...</span>
                        )}

                        {feedback && (
                          <span
                            className={`text-[11px] font-[500] ${
                              feedback.success ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {feedback.success ? "✅ " : "❌ "}
                            {feedback.text}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-md px-md text-right">
                      <span className="text-[11px] font-[450] text-ink/45 bg-surface-soft/60 px-2 py-0.5 rounded-full">
                        {cat.total_tasks || 0} tasks
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah Kategori */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-md animate-fadeIn">
          <div className="bg-canvas border border-hairline rounded-2xl p-xxl max-w-[480px] w-full shadow-2xl space-y-lg animate-scaleUp">
            <div className="flex items-center justify-between pb-sm border-b border-hairline">
              <h4 className="text-[16px] font-[540] text-ink">Tambah Kategori Project Baru</h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-ink/40 hover:text-ink text-[18px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-md">
              <div>
                <label className="block text-[11px] font-[540] text-ink/50 uppercase mb-xs">
                  Nama Kategori Project *
                </label>
                <input
                  type="text"
                  placeholder="Misal: Portal B2B Partner"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!newCode) {
                      const autoCode = e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
                      setNewCode(autoCode);
                    }
                  }}
                  className="w-full h-[38px] rounded-lg border border-hairline px-md text-[13px] text-ink focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-[11px] font-[540] text-ink/50 uppercase mb-xs">
                    Prefix Tiket (4 Karakter)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: B2BP"
                    maxLength={6}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full h-[38px] rounded-lg border border-hairline px-md text-[13px] font-mono text-ink focus:border-primary focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-[540] text-ink/50 uppercase mb-xs">
                    Lead Penanggung Jawab
                  </label>
                  <div className="relative flex items-center">
                    <select
                      value={newLeadId}
                      onChange={(e) => setNewLeadId(e.target.value)}
                      className="w-full h-[38px] rounded-lg border border-hairline bg-canvas pl-3 pr-8 text-[13px] text-ink focus:border-primary focus:outline-none appearance-none"
                    >
                      <option value="">— Pilih Lead —</option>
                      {availableLeads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.nama}
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

              <div>
                <label className="block text-[11px] font-[540] text-ink/50 uppercase mb-xs">
                  Deskripsi / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan pilar atau ruang lingkup proyek..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-lg border border-hairline p-md text-[13px] text-ink focus:border-primary focus:outline-none"
                />
              </div>

              {addError && (
                <div className="text-[12px] text-red-500 font-[450]">
                  {addError}
                </div>
              )}

              <div className="flex items-center justify-end gap-sm pt-md border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-[36px] px-lg rounded-lg border border-hairline text-[12px] font-[500] text-ink/70 hover:bg-surface-soft cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-[36px] px-lg rounded-lg bg-primary text-on-primary text-[12px] font-[540] hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Kategori"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
