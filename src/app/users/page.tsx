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
  const [newUser, setNewUser] = useState({ nama: "", username: "", password: "", role: "staff", department: "", capacityWeekly: 40 });

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
        capacity: u.capacityHoursPerMonth,
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

  const startEdit = (id: string, capacityMonthly: number) => {
    setEditing(id);
    setEditVal(String(Math.round(capacityMonthly / 4)));
  };

  const saveEdit = async (userId: string) => {
    const val = parseInt(editVal, 10);
    if (!isNaN(val) && val > 0 && val <= 80) {
      const monthlyVal = val * 4;
      try {
        await fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capacityHoursPerMonth: monthlyVal }),
        });
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, capacity: monthlyVal } : u));
        showToast(`✅ Kapasitas diubah ke ${val} j/mg (${monthlyVal} j/bl)`);
      } catch {
        showToast("❌ Gagal menyimpan");
      }
    }
    setEditing(null);
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
          capacityHoursPerMonth: newUser.capacityWeekly * 4,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal");
      }
      await fetchUsers();
      setShowAdd(false);
      setNewUser({ nama: "", username: "", password: "", role: "staff", department: "", capacityWeekly: 40 });
      showToast("✅ User berhasil ditambahkan");
    } catch (err: any) {
      showToast(`❌ ${err.message}`);
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Hapus user "${username}"?`)) return;
    try {
      await fetch(`/api/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast("✅ User dihapus");
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
        <div className="fixed top-[60px] right-4 z-50 bg-ink text-canvas rounded-lg px-lg py-sm text-[13px] font-[450] shadow-lg animate-in fade-in">
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
                <input placeholder="Kapasitas (jam/minggu)" type="number" value={newUser.capacityWeekly} onChange={(e) => setNewUser({ ...newUser, capacityWeekly: parseInt(e.target.value) || 0 })} className="h-[36px] rounded-md border border-hairline px-sm text-[13px]" min={1} max={80} />
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
            <TableSkeleton cols={5} />
          ) : (
            <div className="bg-canvas border border-hairline rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-soft/60 border-b border-hairline">
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40">Nama</th>
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40">Username</th>
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40">Role</th>
                    <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-right">Kapasitas (j/mg → j/bl)</th>
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
                      <td className="px-lg py-md text-right">
                        {editing === user.id ? (
                          <div className="flex items-center justify-end gap-xs">
                            <input type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(user.id); if (e.key === "Escape") setEditing(null); }}
                              className="w-[50px] h-[28px] rounded-md border border-primary/40 px-sm text-[13px] text-right font-[480] focus:outline-none focus:border-primary"
                              min={1} max={80} autoFocus />
                            <span className="text-[11px] text-ink/35">j/mg → {parseInt(editVal, 10) > 0 ? parseInt(editVal, 10) * 4 : 0} j/bl</span>
                            <button onClick={() => saveEdit(user.id)} className="text-[11px] text-green-600 font-[480] cursor-pointer">✓</button>
                            <button onClick={() => setEditing(null)} className="text-[11px] text-red-500 font-[480] cursor-pointer">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-sm cursor-pointer group" onClick={() => startEdit(user.id, user.capacity)}>
                            <span className="text-[14px] font-[480] tabular-nums text-ink/70">{Math.round(user.capacity / 4)} j/mg</span>
                            <span className="text-[11px] font-[320] text-ink/35">({user.capacity} j/bl)</span>
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
