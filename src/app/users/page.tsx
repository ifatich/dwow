"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import { TableSkeleton } from "@/components/shared/skeletons";

type UserRow = {
  id: string;
  nama: string;
  username: string;
  role: string;
  department: string | null;
  capacity: number; // capacityHoursPerMonth
  assignedLeads: Array<{ id: string; nama: string; username: string }>;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  kadep: "Kadep/Kadiv",
  lead: "Lead",
  staff: "Staff",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form tambah user
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({
    nama: "",
    username: "",
    password: "",
    role: "staff",
    department: "",
    capacitySprint: 72,
    leadId: "",
  });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Gagal memuat data");
      const data = await res.json();
      setUsers(data.map((u: any) => ({
        id: u.id,
        nama: u.nama,
        username: u.username,
        role: u.role,
        department: u.department,
        capacity: u.capacityHoursPerMonth || 72,
        assignedLeads: u.assignedLeads || [],
      })));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const startEdit = (id: string, capacitySprint: number) => {
    setEditing(id);
    setEditVal(String(capacitySprint > 0 ? capacitySprint : 72));
  };

  const saveEdit = async (userId: string) => {
    const val = parseInt(editVal, 10);
    if (!isNaN(val) && val > 0 && val <= 200) {
      try {
        await fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capacityHoursPerMonth: val }),
        });
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, capacity: val } : u));
        showToast(`✅ Kapasitas diubah ke ${val} j/sprint`);
      } catch {
        showToast("❌ Gagal menyimpan");
      }
    }
    setEditing(null);
  };

  const handleAssignLead = async (staffId: string, leadId: string) => {
    try {
      const res = await fetch("/api/master/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, staffId }),
      });
      if (res.ok) {
        await fetchUsers();
        showToast("✅ Staff berhasil ditugaskan ke Lead");
      } else {
        const err = await res.json();
        showToast(`❌ ${err.error || "Gagal menugaskan lead"}`);
      }
    } catch {
      showToast("❌ Terjadi kesalahan jaringan");
    }
  };

  const handleUnassignLead = async (staffId: string, leadId: string, leadName: string) => {
    try {
      const res = await fetch("/api/master/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, staffId }),
      });
      if (res.ok) {
        await fetchUsers();
        showToast(`Penugasan dari ${leadName} dicabut`);
      } else {
        const err = await res.json();
        showToast(`❌ ${err.error || "Gagal mencabut penugasan"}`);
      }
    } catch {
      showToast("❌ Terjadi kesalahan jaringan");
    }
  };

  const handleAdd = async () => {
    if (!newUser.nama || !newUser.username || !newUser.password) {
      setError("Nama, username, dan password wajib diisi");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: newUser.nama,
          username: newUser.username,
          password: newUser.password,
          role: newUser.role,
          department: newUser.department || null,
          capacityHoursPerMonth: newUser.capacitySprint,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal");
      }
      const createdUser = await res.json();

      if (newUser.role === "staff" && newUser.leadId && createdUser.id) {
        await fetch("/api/master/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: newUser.leadId, staffId: createdUser.id }),
        });
      }

      await fetchUsers();
      setShowAdd(false);
      setNewUser({
        nama: "",
        username: "",
        password: "",
        role: "staff",
        department: "",
        capacitySprint: 72,
        leadId: "",
      });
      showToast("✅ User berhasil ditambahkan");
    } catch (err: any) {
      showToast(`❌ ${err.message}`);
    }
  };

  const handleDelete = async (userId: string, uname: string) => {
    if (!confirm(`Hapus user "${uname}"?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showToast("✅ User dihapus");
      }
    } catch {
      showToast("❌ Gagal menghapus");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <PageHeader>
        <HeaderAvatar />
      </PageHeader>

      <BreadcrumbBar
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Pengguna" },
        ]}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-lg right-lg z-50 bg-ink text-canvas text-[13px] px-lg py-sm rounded-lg shadow-lg font-[480]">
          {toast}
        </div>
      )}

      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-xl py-xxl">
          <div className="mb-xxl flex items-end justify-between">
            <div>
              <span className="font-mono text-[18px] uppercase tracking-[0.54px] text-ink/40">Admin</span>
              <h2 className="text-[48px] font-[340] leading-[1.10] tracking-[-0.72px] text-ink mt-sm">
                Daftar<br />Pengguna
              </h2>
            </div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="h-[40px] rounded-lg bg-primary text-on-primary px-lg text-[13px] font-[540] hover:opacity-90 transition-opacity cursor-pointer"
            >
              + Tambah User
            </button>
          </div>

          {/* Add form */}
          {showAdd && (
            <div className="bg-surface-soft/30 border border-hairline rounded-lg p-lg mb-lg space-y-sm">
              <div className="grid grid-cols-2 gap-sm">
                <input placeholder="Nama" value={newUser.nama} onChange={(e) => setNewUser({ ...newUser, nama: e.target.value })} className="h-[36px] rounded-md border border-hairline px-sm text-[13px]" />
                <input placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="h-[36px] rounded-md border border-hairline px-sm text-[13px]" />
                <input placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="h-[36px] rounded-md border border-hairline px-sm text-[13px]" />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="h-[36px] rounded-md border border-hairline px-sm text-[13px]">
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input placeholder="Department (opsional)" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} className="h-[36px] rounded-md border border-hairline px-sm text-[13px]" />
                <input placeholder="Kapasitas (jam/sprint)" type="number" value={newUser.capacitySprint} onChange={(e) => setNewUser({ ...newUser, capacitySprint: parseInt(e.target.value) || 0 })} className="h-[36px] rounded-md border border-hairline px-sm text-[13px]" min={1} max={160} />
                {newUser.role === "staff" && (
                  <div className="relative flex items-center col-span-2">
                    <select
                      value={newUser.leadId}
                      onChange={(e) => setNewUser({ ...newUser, leadId: e.target.value })}
                      className="w-full h-[36px] rounded-md border border-hairline pl-3 pr-8 text-[13px] bg-canvas text-ink appearance-none focus:outline-none focus:border-primary"
                    >
                      <option value="">— Pilih Lead Penanggung Jawab (Opsional) —</option>
                      {users
                        .filter((u) => u.role === "lead")
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nama} (Lead)
                          </option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 text-ink/40">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-sm">
                <button onClick={handleAdd} className="h-[36px] rounded-md bg-primary text-on-primary px-lg text-[13px] font-[540] cursor-pointer">Simpan</button>
                <button onClick={() => setShowAdd(false)} className="h-[36px] rounded-md bg-surface-soft text-ink/60 px-lg text-[13px] cursor-pointer">Batal</button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-lg py-sm text-[13px] text-red-600 mb-lg">{error}</div>
          )}

          {loading ? (
            <TableSkeleton cols={6} />
          ) : (
            <div className="bg-canvas border border-hairline rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-soft/60 border-b border-hairline">
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40">Nama</th>
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40">Username</th>
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40">Role</th>
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40">Lead Penanggung Jawab</th>
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-right">Kapasitas (j/sprint)</th>
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors">
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-sm">
                          <div className="w-[28px] h-[28px] rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] font-[540] text-primary">{user.nama.slice(0, 2).toUpperCase()}</span>
                          </div>
                          <span className="text-[14px] font-[480] text-ink">{user.nama}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md">
                        <span className="text-[13px] font-[450] text-ink/60 font-mono">{user.username}</span>
                      </td>
                      <td className="px-lg py-md">
                        <span className={`inline-flex rounded-pill px-sm py-xxs text-[11px] font-[480] ${
                          user.role === "lead" ? "bg-amber-50 text-amber-700" : user.role === "super_admin" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-lg py-md">
                        {user.role === "staff" ? (
                          <div className="flex items-center flex-wrap gap-1">
                            {user.assignedLeads && user.assignedLeads.length > 0 ? (
                              user.assignedLeads.map((lead) => (
                                <span
                                  key={lead.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-soft border border-hairline text-[11px] font-[480] text-ink"
                                >
                                  <span>{lead.nama}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignLead(user.id, lead.id, lead.nama)}
                                    className="text-ink/30 hover:text-red-500 cursor-pointer text-[9px] ml-0.5"
                                    title={`Hapus dari tim ${lead.nama}`}
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-ink/35 italic mr-1">Belum ada Lead</span>
                            )}

                            <div className="relative inline-flex items-center">
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) handleAssignLead(user.id, e.target.value);
                                }}
                                className="h-[22px] text-[10px] rounded border border-hairline bg-canvas pl-2 pr-4 text-ink/60 hover:text-ink cursor-pointer focus:outline-none appearance-none"
                              >
                                <option value="">+ Lead</option>
                                {users
                                  .filter((u) => u.role === "lead" && !user.assignedLeads?.some((al) => al.id === u.id))
                                  .map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.nama}
                                    </option>
                                  ))}
                              </select>
                              <span className="pointer-events-none absolute right-1 text-ink/40">
                                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </span>
                            </div>
                          </div>
                        ) : user.role === "lead" ? (
                          <span className="text-[11px] font-[500] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            Lead ({users.filter((u) => u.assignedLeads?.some((al) => al.id === user.id)).length} Staff)
                          </span>
                        ) : (
                          <span className="text-[11px] text-ink/35">—</span>
                        )}
                      </td>
                      <td className="px-lg py-md text-right">
                        {editing === user.id ? (
                          <div className="flex items-center justify-end gap-xs">
                            <input type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(user.id); if (e.key === "Escape") setEditing(null); }}
                              className="w-[60px] h-[28px] rounded-md border border-primary/40 px-sm text-[13px] text-right font-[480] focus:outline-none focus:border-primary"
                              min={1} max={160} autoFocus />
                            <span className="text-[11px] text-ink/35">j/sprint</span>
                            <button onClick={() => saveEdit(user.id)} className="text-[11px] text-green-600 font-[480] cursor-pointer">✓</button>
                            <button onClick={() => setEditing(null)} className="text-[11px] text-red-500 font-[480] cursor-pointer">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-sm cursor-pointer group" onClick={() => startEdit(user.id, user.capacity)}>
                            <span className="text-[14px] font-[480] tabular-nums text-ink/70">{user.capacity || 72} j/sprint</span>
                          </div>
                        )}
                      </td>
                      <td className="px-lg py-md text-right">
                        <button onClick={() => handleDelete(user.id, user.username)}
                          className="text-[11px] text-red-400 hover:text-red-600 font-[480] cursor-pointer">Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
