"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const DISMISS_MS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

const ICONS: Record<ToastType, string> = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

const COLORS: Record<ToastType, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  warning: "bg-amber-500",
  info: "bg-blue-600",
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: ToastType) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    const ms = DISMISS_MS[type];
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ms);
  }, []);

  const ctx: ToastContextType = {
    success: (msg) => add(msg, "success"),
    error: (msg) => add(msg, "error"),
    warning: (msg) => add(msg, "warning"),
    info: (msg) => add(msg, "info"),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${COLORS[toast.type]} text-white rounded-lg px-lg py-sm text-[13px] font-[450] shadow-lg pointer-events-auto animate-slide-up flex items-center gap-sm max-w-[360px]`}
          >
            <span className="text-[14px]">{ICONS[toast.type]}</span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-white/60 hover:text-white ml-sm flex-shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
