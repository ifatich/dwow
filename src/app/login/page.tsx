"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username: username.toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Username atau password salah");
      setLoading(false);
      return;
    }

    // Login sukses via NextAuth
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-soft/40">
      <div className="w-full max-w-[400px] mx-auto px-xl">
        <div className="text-center mb-xxl">
          <h1 className="text-[32px] font-[540] tracking-[-0.28px] text-ink">TaskFlow Pro</h1>
          <p className="text-[14px] font-[320] text-ink/40 mt-sm">Sistem Manajemen Tugas & Proyek</p>
        </div>

        <form onSubmit={handleLogin} className="bg-canvas border border-hairline rounded-xl p-xxl space-y-lg">
          <h2 className="text-[20px] font-[540] text-ink">Masuk</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-lg py-sm text-[13px] font-[450] text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-[540] text-ink/50 mb-xs uppercase tracking-[0.5px]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full h-[44px] rounded-lg border border-hairline bg-surface-soft/40 px-lg text-[14px] text-ink placeholder:text-ink/25 focus:outline-none focus:border-primary/40"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-[540] text-ink/50 mb-xs uppercase tracking-[0.5px]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full h-[44px] rounded-lg border border-hairline bg-surface-soft/40 px-lg text-[14px] text-ink placeholder:text-ink/25 focus:outline-none focus:border-primary/40"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[44px] rounded-lg bg-primary text-on-primary text-[14px] font-[540] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <div className="text-center pt-sm border-t border-hairline-soft">
            <p className="text-[11px] font-[320] text-ink/30">
              Gunakan username: admin / thoriq / nabila / ariana / budi / eko
            </p>
            <p className="text-[11px] font-[320] text-ink/25 mt-xxs">
              Password: admin123 (admin) / lead123 (lead) / staff123 (staff)
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
