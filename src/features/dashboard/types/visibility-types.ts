export type UserRole = "staff" | "lead" | "kadep" | "kadiv" | "super_admin";

export type DashboardSectionKey =
  | "lead_performance"
  | "projects_list"
  | "workload_chart"
  | "review_tasks"
  | "whats_new";

export type DashboardVisibilityMap = Record<
  DashboardSectionKey,
  Record<UserRole, boolean>
>;

export interface SectionMeta {
  key: DashboardSectionKey;
  title: string;
  badge: string;
  description: string;
}

export const DASHBOARD_SECTIONS_META: Record<DashboardSectionKey, SectionMeta> = {
  lead_performance: {
    key: "lead_performance",
    title: "Performa Project Lead & Beban Kerja Tim",
    badge: "Manajerial & Lead",
    description: "Kartu ringkasan kemajuan proyek, beban subtask, dan status review untuk setiap Project Lead.",
  },
  projects_list: {
    key: "projects_list",
    title: "Daftar Proyek",
    badge: "Proyek & Tim",
    description: "Daftar kartu proyek aktif atau proyek saya lengkap dengan metrik penyelesaian tugas dan sprint.",
  },
  workload_chart: {
    key: "workload_chart",
    title: "Grafik Beban Kerja Tim",
    badge: "Kapasitas Staf",
    description: "Grafik komparasi jam kerja staf terhadap batas kapasitas bulanan dalam sprint aktif.",
  },
  review_tasks: {
    key: "review_tasks",
    title: "Daftar Tugas Perlu Review",
    badge: "Approval & Verifikasi",
    description: "Daftar tiket tugas dan subtask yang menunggu tindakan review atau persetujuan oleh Lead.",
  },
  whats_new: {
    key: "whats_new",
    title: "Catatan Rilis & Log Pembaruan",
    badge: "Pembaruan Sistem",
    description: "Seksi informasi fitur baru, log perubahan versi aplikasi, dan panduan sistem TaskForge.",
  },
};

export interface RoleMeta {
  role: UserRole;
  label: string;
  badgeClass: string;
  description: string;
  icon: string;
}

export const ALL_ROLES_META: RoleMeta[] = [
  {
    role: "staff",
    label: "Staff",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Anggota tim pelaksana tugas dan subtask teknis",
    icon: "👤",
  },
  {
    role: "lead",
    label: "Project Lead",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Penanggung jawab proyek, alokasi tugas & reviewer",
    icon: "⭐",
  },
  {
    role: "kadep",
    label: "Kepala Departemen",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    description: "Pimpinan pengawas departemen & kapasitas tim",
    icon: "🏢",
  },
  {
    role: "kadiv",
    label: "Kepala Divisi",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    description: "Pimpinan eksekutif divisi & pengawasan manajerial",
    icon: "🏛️",
  },
  {
    role: "super_admin",
    label: "Super Admin",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description: "Administrator sistem dengan hak konfigurasi penuh",
    icon: "👑",
  },
];
