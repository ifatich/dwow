"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DwowLogo } from "@/components/shared/dwow-logo";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Suppress unhandled extension errors from chrome-extension:// in dev mode
  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      const reasonStr = String(e?.reason?.stack || e?.reason?.message || e?.reason || "");
      if (
        reasonStr.includes("chrome-extension:") ||
        reasonStr.includes("injectScriptAdjust") ||
        reasonStr.includes("Failed to fetch")
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleRejection, true);
    return () => window.removeEventListener("unhandledrejection", handleRejection, true);
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center px-4 py-12 bg-neutral-50/70 overflow-hidden selection:bg-neutral-900 selection:text-white">
      {/* Background Decorative Ambient Glows */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40" 
        style={{
          backgroundImage: `radial-gradient(#d4d4d8 1px, transparent 1px)`,
          backgroundSize: "24px 24px"
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[340px] bg-gradient-to-tr from-neutral-200/50 via-slate-100/40 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-[420px] relative z-10 mx-auto">
        {/* Brand Header */}
        <div className="flex justify-center mb-8">
          <DwowLogo size="xl" showSubline={true} />
        </div>

        {/* Main Card */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] p-7 md:p-8 backdrop-blur-sm transition-all">
          <div className="mb-6">
            <h2 className="text-[18px] font-semibold text-neutral-900 tracking-[-0.2px]">
              Masuk ke Akun
            </h2>
            <p className="text-[13px] text-neutral-500 mt-0.5">
              Masukkan kredensial Anda untuk mengakses sistem
            </p>
          </div>

          {/* Error Message */}
          {urlError && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-red-50/80 border border-red-200/80 text-[13px] text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-red-600">
                <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8C1.5 11.59 4.41 14.5 8 14.5C11.59 14.5 14.5 11.59 14.5 8C14.5 4.41 11.59 1.5 8 1.5ZM8 10.5C7.59 10.5 7.25 10.16 7.25 9.75V5.75C7.25 5.34 7.59 5 8 5C8.41 5 8.75 5.34 8.75 5.75V9.75C8.75 10.16 8.41 10.5 8 10.5ZM8.75 12.25H7.25V11H8.75V12.25Z" fill="currentColor"/>
              </svg>
              <div className="flex-1 font-medium">{urlError}</div>
            </div>
          )}

          <form
            method="POST"
            action="/api/login-direct"
            onSubmit={() => setSubmitting(true)}
            className="space-y-4"
          >
            {/* Username Input */}
            <div>
              <label 
                htmlFor="username" 
                className="block text-[12px] font-medium text-neutral-700 mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2.75 14C2.75 11.6528 5.10051 9.75 8 9.75C10.8995 9.75 13.25 11.6528 13.25 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  autoComplete="username"
                  className="w-full h-[44px] rounded-xl border border-neutral-200 bg-neutral-50/40 pl-10 pr-3.5 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="password" 
                  className="block text-[12px] font-medium text-neutral-700"
                >
                  Kata Sandi
                </label>
                <span className="text-[11px] text-neutral-400 cursor-help hover:text-neutral-600 transition-colors" title="Hubungi administrator sistem jika Anda mengalami kendala masuk">
                  Lupa kata sandi?
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3.25" y="6.75" width="9.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5.5 6.75V4.75C5.5 3.36929 6.61929 2.25 8 2.25C9.38071 2.25 10.5 3.36929 10.5 4.75V6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="10.5" r="1" fill="currentColor" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  className="w-full h-[44px] rounded-xl border border-neutral-200 bg-neutral-50/40 pl-10 pr-11 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer transition-colors"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 focus:ring-offset-0 transition-colors cursor-pointer"
                />
                <span className="text-[12px] text-neutral-600 font-normal">
                  Ingat saya di perangkat ini
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[44px] mt-2 rounded-xl bg-neutral-900 text-white text-[14px] font-medium hover:bg-black active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin text-white">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="24" strokeDashoffset="8" fill="none" opacity="0.4" />
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="8" strokeDashoffset="8" fill="none" />
                  </svg>
                  <span>Memvalidasi kredensial...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.33 8h9.34M8.67 4l4 4-4 4" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security & System Info Footer */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center text-[12px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-neutral-400">
              <path d="M8 1.5L2.5 4V7.5C2.5 11 5 13.7 8 14.5C11 13.7 13.5 11 13.5 7.5V4L8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 8L7.5 9.5L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Autentikasi terenkripsi sesi aman 256-bit</span>
          </div>
          <p className="text-[11px] text-neutral-400/80">
            D-WoW Platform &copy; {new Date().getFullYear()} &middot; Hak Cipta Dilindungi
          </p>
        </div>
      </div>
    </div>
  );
}

