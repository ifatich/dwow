import { create } from "zustand";

type Theme = "light" | "dark";

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  theme: "light",
  setTheme: (theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    set({ theme });
  },
}));
