"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import SprintSyncDialog from "@/features/sprint-sync/components/sprint-sync-dialog";
import MasterCategoryManager from "@/features/master-category/components/master-category-manager";
import TeamRosterManager from "@/features/master-category/components/team-roster-manager";

export default function SettingsPage() {
  const currentUser = useCurrentUser();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(currentUser?.name || "");
  const [newPassword, setNewPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [appsScriptUrl, setAppsScriptUrl] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const role = currentUser?.role;
  const isReviewer = role === "lead" || role === "kadep" || role === "kadiv" || role === "super_admin";

  // Fetch spreadsheet config on mount
  useState(() => {
    fetch("/api/settings/spreadsheet")
      .then((r) => r.json())
      .then((d) => {
        if (d.spreadsheetId) setSpreadsheetId(d.spreadsheetId);
        if (d.appsScriptUrl) setAppsScriptUrl(d.appsScriptUrl);
        if (d.lastSyncAt) setLastSync(d.lastSyncAt);
      })
      .catch(() => {});
  });

  const handleTestConnection = async () => {
    setSyncStatus("⏳ Menguji...");
    try {
      const res = await fetch("/api/settings/spreadsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      const d = await res.json();
      setSyncStatus(d.status === "connected" ? `● Tersambung (${d.latency}ms)` : `● ${d.message}`);
    } catch {
      setSyncStatus("● Gagal terhubung");
    }
  };

  const handleSaveSpreadsheet = async () => {
    try {
      await fetch("/api/settings/spreadsheet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId, appsScriptUrl }),
      });
      setSyncStatus("✅ Konfigurasi disimpan");
    } catch {
      setSyncStatus("❌ Gagal menyimpan");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.userId) return;
    try {
      await fetch(`/api/users/${currentUser.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: name }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setPwMessage("❌ Gagal menyimpan profil");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPwMessage("❌ Password minimal 6 karakter");
      return;
    }
    if (!currentUser?.userId) return;
    try {
      await fetch(`/api/users/${currentUser.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      setPwMessage("✅ Password berhasil diubah");
      setNewPassword("");
    } catch {
      setPwMessage("❌ Gagal mengubah password");
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
          { label: "Pengaturan" },
        ]}
      />

      <main className="flex-1">
        <div className="max-w-[860px] mx-auto px-xl py-xxl">
          <div className="mb-xxl">
            <h2 className="text-[36px] font-[340] tracking-[-0.54px] text-ink">Pengaturan</h2>
            <p className="text-[16px] font-[320] text-ink/40 mt-sm">Konfigurasi aplikasi, master data kategori, notifikasi, dan integrasi.</p>
          </div>

          <div className="space-y-xxl">
            {/* Master Data Kategori Project */}
            {isReviewer && <MasterCategoryManager />}

            {/* Struktur Tim & Anggota Staff per Lead */}
            {isReviewer && <TeamRosterManager />}

            {/* Profil */}
            <section className="bg-canvas border border-hairline rounded-xl p-xxl space-y-lg">
              <h3 className="text-[16px] font-[540] text-ink">Profil</h3>
              <div className="grid grid-cols-2 gap-lg">
                <div>
                  <label className="block text-[11px] font-[540] text-ink/40 uppercase mb-xs">Nama</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-[40px] rounded-lg border border-hairline px-lg text-[14px] text-ink" />
              </div>
              <div>
                <label className="block text-[11px] font-[540] text-ink/40 uppercase mb-xs">Username</label>
                <input value={currentUser?.username || ""} disabled className="w-full h-[40px] rounded-lg border border-hairline px-lg text-[14px] text-ink/40 bg-surface-soft/30" />
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <button type="button" onClick={handleSaveProfile} className="h-[40px] rounded-lg px-lg bg-primary text-on-primary text-[13px] font-[540] hover:opacity-90 cursor-pointer">
                Simpan Profil
              </button>
              {saved && <span className="text-[13px] text-green-600 font-[450]">✅ Profil disimpan</span>}
            </div>
          </section>

          {/* Ganti Password */}
          <section className="bg-canvas border border-hairline rounded-xl p-xxl space-y-lg">
            <h3 className="text-[16px] font-[540] text-ink">Ganti Password</h3>
            <div className="grid grid-cols-2 gap-lg">
              <div>
                <label className="block text-[11px] font-[540] text-ink/40 uppercase mb-xs">Password Baru</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 karakter" className="w-full h-[40px] rounded-lg border border-hairline px-lg text-[14px] text-ink" />
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <button type="button" onClick={handleChangePassword} className="h-[40px] rounded-lg px-lg bg-amber-500 text-white text-[13px] font-[540] hover:opacity-90 cursor-pointer">
                Ganti Password
              </button>
              {pwMessage && <span className={`text-[13px] font-[450] ${pwMessage.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{pwMessage}</span>}
            </div>
          </section>

          {/* Notifikasi */}
          <section className="bg-canvas border border-hairline rounded-xl p-xxl space-y-lg">
            <h3 className="text-[16px] font-[540] text-ink">Notifikasi</h3>
            <div className="space-y-md">
              {[
                { label: "Deadline mendekati", desc: "Notifikasi 3 hari sebelum tenggat" },
                { label: "Task di-assign", desc: "Notifikasi saat mendapat task baru" },
                { label: "Review diminta", desc: "Notifikasi saat staff mengajukan review" },
              ].map((n) => (
                  <label key={n.label} className="flex items-center gap-md cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-[18px] h-[18px] rounded accent-primary" />
                    <div>
                      <div className="text-[14px] font-[480] text-ink">{n.label}</div>
                      <div className="text-[12px] font-[320] text-ink/35">{n.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Integrasi Spreadsheet */}
            <section className="bg-canvas border border-hairline rounded-xl p-xxl space-y-lg">
              <h3 className="text-[16px] font-[540] text-ink">Integrasi Google Sheets</h3>
              <div>
                <label className="block text-[11px] font-[540] text-ink/40 uppercase mb-xs">Spreadsheet ID</label>
                <input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="1abc123..." className="w-full h-[40px] rounded-lg border border-hairline px-lg text-[14px] text-ink font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-[540] text-ink/40 uppercase mb-xs">Apps Script URL</label>
                <input value={appsScriptUrl} onChange={(e) => setAppsScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." className="w-full h-[40px] rounded-lg border border-hairline px-lg text-[14px] text-ink font-mono" />
              </div>
              {lastSync && <p className="text-[12px] text-ink/35">Terakhir sinkron: {new Date(lastSync).toLocaleString("id-ID")}</p>}
              <div className="flex items-center gap-sm flex-wrap pt-xs">
                <button type="button" onClick={handleTestConnection} className="h-[36px] rounded-pill px-lg text-[12px] font-[480] bg-surface-soft text-ink/60 hover:bg-hairline cursor-pointer">Uji Koneksi</button>
                <button type="button" onClick={handleSaveSpreadsheet} className="h-[36px] rounded-pill px-lg text-[12px] font-[480] bg-surface-soft hover:bg-hairline text-ink cursor-pointer">Simpan URL</button>
                {isReviewer && (
                  <button
                    type="button"
                    onClick={() => setSyncDialogOpen(true)}
                    className="h-[36px] rounded-pill px-lg text-[12px] font-[540] bg-primary text-on-primary hover:opacity-90 cursor-pointer flex items-center gap-xs shadow-xs"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>Sinkronisasi Sprint Sekarang</span>
                  </button>
                )}
                {syncStatus && <span className={`text-[12px] font-[450] ${syncStatus.startsWith("✅") || syncStatus.startsWith("● Tersambung") ? "text-green-600" : syncStatus.startsWith("⏳") ? "text-ink/40" : "text-red-500"}`}>{syncStatus}</span>}
              </div>
            </section>

            {/* Logout */}
            <button
              type="button"
              onClick={() => { localStorage.removeItem("taskflow_user"); signOut({ callbackUrl: "/login" }); }}
              className="w-full h-[44px] rounded-lg border border-red-200 text-red-600 text-[14px] font-[540] hover:bg-red-50 transition-colors cursor-pointer"
            >
              Keluar dari Akun
            </button>

          </div>
        </div>
      </main>

      {/* Dialog Sinkronisasi Sprint */}
      <SprintSyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSuccess={() => {
          setLastSync(new Date().toISOString());
        }}
      />
    </div>
  );
}
