"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import SprintSyncDialog from "@/features/sprint-sync/components/sprint-sync-dialog";

const ROLE_BADGE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  super_admin: { label: "Super Admin", badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80" },
  kadiv: { label: "Kadiv", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80" },
  kadep: { label: "Kadep", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80" },
  lead: { label: "Lead", badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80" },
  staff: { label: "Staff", badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80" },
};

const COMMON_WEAK_PASSWORDS = [
  "password",
  "12345678",
  "123456789",
  "qwertyui",
  "admin123",
  "password123",
  "taskflow123",
  "indonesia",
];

function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SettingsPage() {
  const currentUser = useCurrentUser();
  const { update: sessionUpdate } = useSession();

  // Profile states
  const [name, setName] = useState(currentUser?.name || "");
  const [avatar, setAvatar] = useState<string | null>(currentUser?.avatar || null);
  const [department, setDepartment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2-Step Password states (collapsible, default ter-collapse)
  const [isPasswordCollapsed, setIsPasswordCollapsed] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form submission feedback
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Spreadsheet config states
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [appsScriptUrl, setAppsScriptUrl] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const role = currentUser?.role || "staff";
  const isReviewer = role === "lead" || role === "kadep" || role === "kadiv" || role === "super_admin";
  const isLeadOrAdmin = isReviewer || currentUser?.username?.toLowerCase() === "admin";
  const roleConfig = ROLE_BADGE_CONFIG[role] || {
    label: role,
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
  };

  const isProfileInitializedRef = useRef(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  // Sync profile form once on initial mount / user data fetch
  useEffect(() => {
    if (currentUser?.userId && !isProfileInitializedRef.current) {
      isProfileInitializedRef.current = true;
      if (currentUser.name && !name) setName(currentUser.name);
      if (currentUser.avatar) setAvatar(currentUser.avatar);

      fetch(`/api/users/${currentUser.userId}`)
        .then((r) => r.json())
        .then((userData) => {
          if (userData && !userData.error) {
            if (userData.nama) setName(userData.nama);
            if (userData.avatar !== undefined) setAvatar(userData.avatar || null);
            if (userData.department) setDepartment(userData.department);
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.userId, currentUser?.name, currentUser?.avatar, name]);

  // Fetch spreadsheet config on mount (hanya untuk lead & admin)
  useEffect(() => {
    if (!isLeadOrAdmin) return;
    fetch("/api/settings/spreadsheet")
      .then((r) => r.json())
      .then((d) => {
        if (d.spreadsheetId) setSpreadsheetId(d.spreadsheetId);
        if (d.appsScriptUrl) setAppsScriptUrl(d.appsScriptUrl);
        if (d.lastSyncAt) setLastSync(d.lastSyncAt);
      })
      .catch(() => {});
  }, [isLeadOrAdmin]);

  const handleSpreadsheetIdChange = (val: string) => {
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      setSpreadsheetId(match[1]);
      if (!appsScriptUrl) setAppsScriptUrl(val);
    } else {
      setSpreadsheetId(val);
    }
  };

  const handleAppsScriptUrlChange = (val: string) => {
    setAppsScriptUrl(val);
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match && (!spreadsheetId || spreadsheetId === "1abc123...")) {
      setSpreadsheetId(match[1]);
    }
  };

  const handleTestConnection = async () => {
    setSyncStatus("⏳ Menguji...");
    try {
      const res = await fetch("/api/settings/spreadsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      const d = await res.json();
      setSyncStatus(d.status === "connected" ? `● ${d.message}` : `● ${d.message}`);
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

  /**
   * Kompresi foto profil cerdas & dukungan GIF:
   * - Format GIF: disimpan langsung tanpa canvas agar animasinya tetap hidup, dengan batas rekomendasi maksimal 800KB.
   * - Format JPG, PNG, WebP: dicrop persegi tengah & dikompresi ke 200x200 pixel kualitas 0.80 (~10-15KB).
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setProfileMessage("❌ Format harus berupa gambar JPG, PNG, WebP, atau GIF");
      return;
    }

    if (file.type === "image/gif") {
      const maxGifSize = 800 * 1024;
      if (file.size > maxGifSize) {
        setProfileMessage("❌ Ukuran animasi GIF maksimal 800KB agar database hemat ruang dan loading instan");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAvatar(dataUrl);
        setProfileMessage("✅ Animasi GIF berhasil dimuat");
        setTimeout(() => setProfileMessage(""), 3000);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage("❌ Ukuran file gambar maksimal 5MB sebelum kompresi");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const targetSize = 200;
          const width = img.width;
          const height = img.height;

          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

            let dataUrl = "";
            try {
              dataUrl = canvas.toDataURL("image/webp", 0.80);
              if (!dataUrl.startsWith("data:image/webp")) {
                dataUrl = canvas.toDataURL("image/jpeg", 0.80);
              }
            } catch {
              dataUrl = canvas.toDataURL("image/jpeg", 0.80);
            }

            setAvatar(dataUrl);
            setProfileMessage("✅ Foto profil berhasil dioptimalkan (~15KB)");
            setTimeout(() => setProfileMessage(""), 3000);
          }
        } catch {
          setProfileMessage("❌ Gagal memproses dan mengompres gambar");
        }
      };
      img.onerror = () => {
        setProfileMessage("❌ File gambar rusak atau tidak dapat dibaca");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeleteAvatar = async () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setAvatar(null);

    if (!currentUser?.userId) return;

    try {
      setIsDeletingAvatar(true);
      const res = await fetch(`/api/users/${currentUser.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: null }),
      });

      if (!res.ok) {
        throw new Error("Gagal menghapus foto di server");
      }

      // Sync local storage
      const stored = localStorage.getItem("taskflow_user");
      const parsed = stored ? JSON.parse(stored) : {};
      const newStorage = {
        ...parsed,
        avatar: null,
      };
      localStorage.setItem("taskflow_user", JSON.stringify(newStorage));

      if (sessionUpdate) {
        await sessionUpdate({ avatar: null });
      }

      window.dispatchEvent(new Event("taskflow_user_updated"));
      setProfileMessage("✅ Foto profil berhasil dihapus");
      setTimeout(() => setProfileMessage(""), 3500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal menghapus foto profil";
      setProfileMessage(`❌ ${errMsg}`);
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.userId) return;
    if (!name.trim()) {
      setProfileMessage("❌ Nama lengkap tidak boleh kosong");
      return;
    }

    const isChangingPassword = !isPasswordCollapsed && Boolean(newPassword || confirmPassword);
    if (isChangingPassword) {
      if (!newPassword) {
        setProfileMessage("❌ Masukkan password baru");
        return;
      }
      if (!confirmPassword) {
        setProfileMessage("❌ Masukkan konfirmasi password baru");
        return;
      }
      if (newPassword.length < 8) {
        setProfileMessage("❌ Password baru minimal 8 karakter");
        return;
      }
      const hasLetter = /[a-zA-Z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      if (!hasLetter || !hasNumber) {
        setProfileMessage("❌ Password harus mengandung kombinasi huruf dan angka");
        return;
      }
      if (newPassword.toLowerCase() === (currentUser?.username || "").toLowerCase()) {
        setProfileMessage("❌ Password tidak boleh sama dengan username");
        return;
      }
      if (newPassword.toLowerCase() === name.trim().toLowerCase()) {
        setProfileMessage("❌ Password tidak boleh sama dengan nama lengkap");
        return;
      }
      if (COMMON_WEAK_PASSWORDS.includes(newPassword.toLowerCase())) {
        setProfileMessage("❌ Password terlalu umum dan mudah ditebak, gunakan variasi lain");
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileMessage("❌ Konfirmasi password tidak cocok dengan password baru");
        return;
      }
    }

    setIsSavingProfile(true);
    setProfileMessage("");

    try {
      const payload: { nama: string; avatar: string | null; password?: string } = {
        nama: name.trim(),
        avatar: avatar || null,
      };
      if (isChangingPassword) {
        payload.password = newPassword;
      }

      const res = await fetch(`/api/users/${currentUser.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan profil");
      }

      const updatedUser = await res.json();

      // Sync to localStorage
      const stored = localStorage.getItem("taskflow_user");
      const parsed = stored ? JSON.parse(stored) : {};
      const newStorage = {
        ...parsed,
        id: currentUser.userId,
        userId: currentUser.userId,
        username: currentUser.username,
        nama: name.trim(),
        name: name.trim(),
        role: currentUser.role,
        avatar: avatar || null,
        department: updatedUser.department || parsed.department || null,
      };
      localStorage.setItem("taskflow_user", JSON.stringify(newStorage));

      if (sessionUpdate) {
        const sessionAvatarUrl = avatar
          ? (avatar.startsWith("data:") ? `/api/users/${currentUser.userId}/avatar` : avatar)
          : null;
        await sessionUpdate({ name: name.trim(), avatar: sessionAvatarUrl });
      }

      window.dispatchEvent(new Event("taskflow_user_updated"));

      if (isChangingPassword) {
        setNewPassword("");
        setConfirmPassword("");
        setIsPasswordCollapsed(true);
        setProfileMessage("✅ Profil & password baru berhasil disimpan");
      } else {
        setProfileMessage("✅ Profil berhasil disimpan");
      }

      setTimeout(() => setProfileMessage(""), 3500);
    } catch (err: any) {
      setProfileMessage(`❌ ${err.message || "Gagal menyimpan profil"}`);
    } finally {
      setIsSavingProfile(false);
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
          { label: "Pengaturan & Profil" },
        ]}
      />

      <main className="flex-1">
        <div className="max-w-[880px] mx-auto px-xl py-xxl">
          <div className="mb-xxl">
            <div>
              <span className="font-mono text-[12px] uppercase tracking-wider text-ink/40">
                Akun & Preferensi Sistem
              </span>
              <h2 className="text-[36px] font-[340] tracking-[-0.54px] text-ink mt-xs">
                Pengaturan & Profil
              </h2>
              <p className="text-[15px] font-[320] text-ink/40 mt-sm max-w-[560px]">
                {isLeadOrAdmin
                  ? "Kelola foto profil, identitas akun, keamanan kata sandi, integrasi Google Sheets, dan preferensi notifikasi."
                  : "Kelola foto profil, identitas akun, keamanan kata sandi, dan preferensi notifikasi."}
              </p>
            </div>
          </div>

          <div className="space-y-xxl">
            {/* CARD 1: PROFIL PENGGUNA & GANTI PASSWORD */}
            <section id="profile" className="bg-canvas border border-hairline rounded-2xl p-xxl shadow-2xs space-y-xl">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md pb-md border-b border-hairline/80">
                <div>
                  <div className="flex items-center gap-xs">
                    <h3 className="text-[18px] font-[550] text-ink tracking-tight">Profil Pengguna</h3>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-[500] bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Akun Aktif
                    </span>
                  </div>
                  <p className="text-[13px] font-[320] text-ink/40 mt-0.5">
                    Kelola foto profil, identitas akun, dan keamanan kata sandi Anda.
                  </p>
                </div>
                <div className="flex items-center gap-xs">
                  <span className={`inline-block text-[11px] font-[540] uppercase tracking-wider px-2.5 py-1 rounded-md border ${roleConfig.badgeClass}`}>
                    {roleConfig.label}
                  </span>
                </div>
              </div>

              {/* Avatar Showcase & Actions (Center-Aligned Vertically) */}
              <div className="flex flex-col sm:flex-row items-center gap-lg pb-md">
                <div className="relative w-[88px] h-[88px] flex-shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-hairline shadow-sm bg-surface-soft/40 flex items-center justify-center">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name || "Avatar"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/5 to-surface-soft flex items-center justify-center text-[30px] font-[600] text-primary select-none">
                        {getInitials(name)}
                      </div>
                    )}
                  </div>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-canvas absolute bottom-1 right-1 shadow-2xs pointer-events-none" />
                </div>

                <div className="flex flex-col justify-center items-center sm:items-start text-center sm:text-left gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-xs">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-[36px] rounded-lg px-md bg-surface-soft hover:bg-hairline text-ink text-[13px] font-[500] border border-hairline/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/60">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Unggah Foto</span>
                    </button>

                    {avatar && (
                      <button
                        type="button"
                        disabled={isDeletingAvatar}
                        onClick={handleDeleteAvatar}
                        className="h-[36px] rounded-lg px-md text-red-600 hover:bg-red-50 text-[13px] font-[480] transition-colors flex items-center gap-1 cursor-pointer border border-transparent hover:border-red-200 disabled:opacity-50"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>{isDeletingAvatar ? "Menghapus..." : "Hapus Foto"}</span>
                      </button>
                    )}
                  </div>

                  {profileMessage && (
                    <span
                      className={`text-[12px] animate-fadeIn ${
                        profileMessage.startsWith("✅") ? "text-emerald-600 font-[500]" : "text-red-500 font-[480]"
                      }`}
                    >
                      {profileMessage}
                    </span>
                  )}

                  <p className="text-[11px] font-[320] text-ink/40 leading-normal">
                    Format JPG, PNG, WebP (kompresi otomatis ~15KB) atau GIF animasi (Maks. 800KB).
                  </p>
                </div>
              </div>

              {/* Form Fields: Data Diri & Ganti Password (2-Step) */}
              <form onSubmit={handleSaveProfile} className="space-y-lg pt-xs">
                {/* Data Diri */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  {/* Nama Lengkap */}
                  <div>
                    <label className="block text-[11px] font-[540] text-ink/50 uppercase mb-xs tracking-wider">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama pengguna..."
                      required
                      className="w-full h-[40px] rounded-lg border border-hairline px-lg text-[14px] text-ink bg-canvas focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  {/* Username (Locked) */}
                  <div>
                    <label className="block text-[11px] font-[540] text-ink/50 uppercase mb-xs tracking-wider flex items-center justify-between">
                      <span>Username</span>
                      <span className="text-[10px] font-normal text-ink/35">Terkunci</span>
                    </label>
                    <div className="relative">
                      <input
                        value={currentUser?.username || ""}
                        disabled
                        className="w-full h-[40px] rounded-lg border border-hairline/80 px-lg pl-9 text-[14px] font-mono text-ink/50 bg-surface-soft/40 cursor-not-allowed select-all"
                      />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Ganti Password (Collapsible, Default Ter-collapse) */}
                <div className="pt-md border-t border-hairline/70">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPasswordCollapsed) {
                        setNewPassword("");
                        setConfirmPassword("");
                      }
                      setIsPasswordCollapsed(!isPasswordCollapsed);
                    }}
                    className="w-full flex items-center justify-between py-2 text-left cursor-pointer group rounded-lg hover:bg-surface-soft/40 px-1 -mx-1 transition-colors"
                    aria-expanded={!isPasswordCollapsed}
                  >
                    <div className="flex items-center gap-xs">
                      <div className="w-7 h-7 rounded-md bg-surface-soft border border-hairline/60 flex items-center justify-center text-ink/50 group-hover:text-primary group-hover:border-primary/30 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[14px] font-[540] text-ink group-hover:text-primary transition-colors">
                            Ganti Password
                          </h4>
                          <span className="text-[10px] font-[480] text-ink/40 bg-surface-soft px-1.5 py-0.5 rounded border border-hairline/50">
                            Opsional
                          </span>
                        </div>
                        <p className="text-[12px] font-[320] text-ink/40 mt-0.5">
                          {isPasswordCollapsed
                            ? "Klik untuk membuka formulir perubahan kata sandi akun."
                            : "Kosongkan kedua kolom ini jika Anda tidak ingin mengubah kata sandi akun."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[12px] font-[500] text-primary group-hover:underline pr-1">
                      <span>{isPasswordCollapsed ? "Buka" : "Tutup"}</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-200 ${isPasswordCollapsed ? "rotate-0" : "rotate-180"}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Konten Password yang Ter-collapse */}
                  {!isPasswordCollapsed && (
                    <div className="pt-md space-y-md animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                        {/* Field 1: Password Baru */}
                        <div>
                          <label className="block text-[11px] font-[540] text-ink/50 uppercase mb-xs tracking-wider">
                            Password Baru
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Min. 8 karakter (huruf & angka)"
                              className="w-full h-[40px] rounded-lg border border-hairline px-lg pr-10 text-[14px] text-ink bg-canvas focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink/40 hover:text-ink/70 transition-colors cursor-pointer"
                              aria-label={showNewPassword ? "Sembunyikan password" : "Lihat password"}
                            >
                              {showNewPassword ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Field 2: Konfirmasi Password Baru */}
                        <div>
                          <label className="block text-[11px] font-[540] text-ink/50 uppercase mb-xs tracking-wider">
                            Konfirmasi Password Baru
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Ketik ulang password baru"
                              className="w-full h-[40px] rounded-lg border border-hairline px-lg pr-10 text-[14px] text-ink bg-canvas focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink/40 hover:text-ink/70 transition-colors cursor-pointer"
                              aria-label={showConfirmPassword ? "Sembunyikan password" : "Lihat password"}
                            >
                              {showConfirmPassword ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Real-time Checklist Badges */}
                      {(newPassword || confirmPassword) && (
                        <div className="flex flex-wrap items-center gap-x-md gap-y-1 text-[11px] pt-1">
                          <span className={`flex items-center gap-1 font-[480] transition-colors ${newPassword.length >= 8 ? "text-emerald-600" : "text-ink/40"}`}>
                            <span>{newPassword.length >= 8 ? "✓" : "○"}</span>
                            <span>Min. 8 karakter</span>
                          </span>

                          <span className={`flex items-center gap-1 font-[480] transition-colors ${(/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) ? "text-emerald-600" : "text-ink/40"}`}>
                            <span>{(/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) ? "✓" : "○"}</span>
                            <span>Kombinasi huruf & angka</span>
                          </span>

                          <span className={`flex items-center gap-1 font-[480] transition-colors ${newPassword && newPassword.toLowerCase() !== (currentUser?.username || "").toLowerCase() ? "text-emerald-600" : "text-ink/40"}`}>
                            <span>{newPassword && newPassword.toLowerCase() !== (currentUser?.username || "").toLowerCase() ? "✓" : "○"}</span>
                            <span>Bukan username</span>
                          </span>

                          <span className={`flex items-center gap-1 font-[480] transition-colors ${confirmPassword && newPassword === confirmPassword ? "text-emerald-600" : confirmPassword ? "text-red-500" : "text-ink/40"}`}>
                            <span>{confirmPassword && newPassword === confirmPassword ? "✓" : confirmPassword ? "✕" : "○"}</span>
                            <span>{confirmPassword && newPassword !== confirmPassword ? "Konfirmasi belum cocok" : "Konfirmasi cocok"}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions & Feedback */}
                <div className="flex items-center gap-md pt-sm border-t border-hairline/60">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="h-[40px] rounded-lg px-xl bg-primary text-on-primary text-[13px] font-[540] hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isSavingProfile ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Profil</span>
                    )}
                  </button>

                  {profileMessage && (
                    <span
                      className={`text-[13px] font-[450] animate-fade-in ${
                        profileMessage.startsWith("✅") ? "text-emerald-600 font-[500]" : "text-red-500"
                      }`}
                    >
                      {profileMessage}
                    </span>
                  )}
                </div>
              </form>
            </section>

            {/* CARD 2: INTEGRASI SPREADSHEET (Hanya Lead & Admin) */}
            {isLeadOrAdmin && (
              <section className="bg-canvas border border-hairline rounded-2xl p-xxl shadow-2xs space-y-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-xs pb-md border-b border-hairline/80">
                  <div>
                    <h3 className="text-[18px] font-[550] text-ink tracking-tight">Integrasi Google Sheets</h3>
                    <p className="text-[13px] font-[320] text-ink/40 mt-0.5">
                      Hubungkan database D-WoW Platform dengan Google Sheets untuk sinkronisasi data sprint.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-[500] bg-blue-50 text-blue-700 border border-blue-200/80 self-start sm:self-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Google Workspace
                  </span>
                </div>

                <div className="space-y-md">
                  <div>
                    <label className="block text-[11px] font-[540] text-ink/40 uppercase mb-xs tracking-wider">Spreadsheet ID</label>
                    <input
                      value={spreadsheetId}
                      onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
                      placeholder="1aDi3fiKhYmAlm4ltLQV8gc7DMm2hqpZtzF9iK0jfFKQ"
                      className="w-full h-[40px] rounded-lg border border-hairline px-lg text-[14px] text-ink font-mono bg-canvas focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-[540] text-ink/40 uppercase mb-xs tracking-wider">Google Sheets URL / Apps Script URL</label>
                    <input
                      value={appsScriptUrl}
                      onChange={(e) => handleAppsScriptUrlChange(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/... atau https://script.google.com/..."
                      className="w-full h-[40px] rounded-lg border border-hairline px-lg text-[14px] text-ink font-mono bg-canvas focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>

                {lastSync && (
                  <p className="text-[12px] text-ink/40 font-mono">
                    Terakhir sinkron: {new Date(lastSync).toLocaleString("id-ID")}
                  </p>
                )}

                <div className="flex items-center gap-sm flex-wrap pt-xs">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    className="h-[36px] rounded-lg px-lg text-[12px] font-[500] bg-surface-soft text-ink hover:bg-hairline cursor-pointer transition-colors border border-hairline/80 shadow-2xs"
                  >
                    Uji Koneksi
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSpreadsheet}
                    className="h-[36px] rounded-lg px-lg text-[12px] font-[500] bg-surface-soft hover:bg-hairline text-ink cursor-pointer transition-colors border border-hairline/80 shadow-2xs"
                  >
                    Simpan URL
                  </button>
                  {isReviewer && (
                    <button
                      type="button"
                      onClick={() => setSyncDialogOpen(true)}
                      className="h-[36px] rounded-lg px-lg text-[12px] font-[540] bg-primary text-on-primary hover:opacity-90 cursor-pointer flex items-center gap-xs shadow-xs transition-opacity"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      <span>Sinkronisasi Sprint Sekarang</span>
                    </button>
                  )}
                  {syncStatus && (
                    <span
                      className={`text-[12px] font-[450] animate-fade-in ${
                        syncStatus.startsWith("✅") || syncStatus.startsWith("● Tersambung")
                          ? "text-emerald-600 font-[500]"
                          : syncStatus.startsWith("⏳")
                          ? "text-ink/40"
                          : "text-red-500"
                      }`}
                    >
                      {syncStatus}
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* CARD 3: PREFERENSI NOTIFIKASI */}
            <section className="bg-canvas border border-hairline rounded-2xl p-xxl shadow-2xs space-y-lg">
              <div className="pb-md border-b border-hairline/80">
                <h3 className="text-[18px] font-[550] text-ink tracking-tight">Preferensi Notifikasi</h3>
                <p className="text-[13px] font-[320] text-ink/40 mt-0.5">
                  Atur pemberitahuan tenggat waktu, penugasan task baru, dan permintaan review.
                </p>
              </div>

              <div className="space-y-md">
                {[
                  { label: "Deadline mendekati", desc: "Notifikasi 3 hari sebelum tenggat subtask berakhir" },
                  { label: "Task di-assign", desc: "Notifikasi saat mendapat delegasi task baru dari lead" },
                  { label: "Review diminta", desc: "Notifikasi saat anggota staf mengajukan request approval" },
                ].map((n) => (
                  <label key={n.label} className="flex items-center gap-md cursor-pointer group p-2 rounded-xl hover:bg-surface-soft/40 transition-colors">
                    <input type="checkbox" defaultChecked className="w-[18px] h-[18px] rounded accent-primary cursor-pointer" />
                    <div>
                      <div className="text-[14px] font-[500] text-ink group-hover:text-primary transition-colors">{n.label}</div>
                      <div className="text-[12px] font-[320] text-ink/40">{n.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* CARD 4: SESI & KELUAR */}
            <div className="pt-sm">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("taskflow_user");
                  signOut({ callbackUrl: "/login" });
                }}
                className="w-full h-[46px] rounded-xl border border-red-200 text-red-600 text-[14px] font-[540] hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Keluar dari Akun</span>
              </button>
            </div>
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
