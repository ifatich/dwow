export interface ChangelogItem {
  id: string;
  version: string;
  date: string;
  title: string;
  summary: string;
  changes: {
    type: "feature" | "fix" | "improvement";
    text: string;
  }[];
}

export const CHANGELOG_DATA: ChangelogItem[] = [
  {
    id: "v1-6-0",
    version: "v1.6.0",
    date: "19 Okt 2026",
    title: "Optimasi Performa Query Database & Container Architecture",
    summary: "Mempercepat waktu pemuatan halaman Home dan Project hingga 7.8x lebih cepat melalui batching query database, pola Container Progressive Loading, dan Tab Visibility Guard.",
    changes: [
      {
        type: "improvement",
        text: "Batching Query Database: Mengeliminasi N+1 query loop pada task dan subtask, memangkas 27 HTTP round-trip ke Turso menjadi hanya 2–3 batch query paralel.",
      },
      {
        type: "improvement",
        text: "Container Architecture: Memecah halaman Home, Project, dan Task Detail menjadi container mandiri dengan skeleton terisolasi untuk menghilangkan blank screen saat memuat.",
      },
      {
        type: "improvement",
        text: "Parallel Query Sprint History: Menggabungkan 5 query database sekuensial di /api/sprints menjadi 1 batch Promise.all dan melonggarkan polling arsip ke 30 detik.",
      },
      {
        type: "fix",
        text: "Filter Sprint Riwayat Aktivitas: Mengaktifkan filter sprint pada audit trail /activity-history melalui join relasi projects dan menerapkan render progresif 50 item.",
      },
      {
        type: "improvement",
        text: "Tab Visibility Guard: Realtime sync otomatis dijeda saat tab browser diminimize atau tidak aktif, menghemat ratusan request tak terpakai dan bandwidth database.",
      },
      {
        type: "improvement",
        text: "Lazy Loading Charts: Komponen grafik di-load secara dinamis (next/dynamic) untuk meringankan bundle JavaScript awal halaman utama.",
      },
    ],
  },
  {
    id: "v1-5-0",
    version: "v1.5.0",
    date: "19 Okt 2026",
    title: "Section What's New di Dashboard & Log Rilis",
    summary: "Menambahkan section log pembaruan sistem dan aktivitas rilis di halaman utama dengan filter kategori interaktif.",
    changes: [
      {
        type: "feature",
        text: "Section What's New: Timeline interaktif di bagian bawah dashboard home untuk memantau fitur baru, bug fixing, dan pembaruan sistem.",
      },
      {
        type: "feature",
        text: "Filter Kategori: Memfilter pembaruan berdasarkan Semua, Fitur Baru, Perbaikan Bug, atau Peningkatan.",
      },
      {
        type: "improvement",
        text: "Changelog Rules: Menetapkan aturan wajib update changelog sebelum setiap push ke branch master.",
      },
    ],
  },
  {
    id: "v1-4-0",
    version: "v1.4.0",
    date: "19 Okt 2026",
    title: "Jam Kerja Otomatis & Alur Pengembalian Subtask",
    summary: "Timer subtask kini mengikuti jam kerja resmi 07:30–16:30 WIB dan staf dapat mengembalikan tiket dari In Progress ke To Do.",
    changes: [
      {
        type: "feature",
        text: "Auto-Pause Timer Jam Kerja: Timer otomatis jeda di luar jam 07:30–16:30 WIB & akhir pekan, lalu otomatis lanjut esok paginya.",
      },
      {
        type: "feature",
        text: "Kembalikan ke To Do: Tombol aksi dan drag & drop untuk mengembalikan subtask dari In Progress ke To Do dilengkapi dialog alasan.",
      },
      {
        type: "improvement",
        text: "Pengajuan Review Fleksibel: Staf tetap dapat mengajukan review di luar jam kerja tanpa membuat timer membengkak semalaman.",
      },
      {
        type: "improvement",
        text: "Akumulasi Waktu Aman: Durasi kerja aktif yang sudah berjalan tetap tersimpan rapi di histori kontribusi saat tiket dikembalikan ke To Do.",
      },
    ],
  },
  {
    id: "v1-3-1",
    version: "v1.3.1",
    date: "19 Okt 2026",
    title: "Sinkronisasi Deadline & Multi-Kontributor Spreadsheet",
    summary: "Penyempurnaan parsing data dari Google Sheets sprint terbaru agar deadline dan penugasan tim 100% akurat.",
    changes: [
      {
        type: "fix",
        text: "Deadline Dinamis: Tanggal deadline task dan project kini dibaca langsung dari kolom 'End Date' spreadsheet tanpa tanggal mati.",
      },
      {
        type: "fix",
        text: "Multi-Kontributor: Pemetaan multi-assignee subtask diperbaiki agar seluruh staf yang berkontribusi terdaftar lengkap.",
      },
      {
        type: "improvement",
        text: "Integrasi Spreadsheet Baru: Pengalihan sumber sinkronisasi ke template spreadsheet sprint aktif dengan validasi kolom otomatis.",
      },
    ],
  },
  {
    id: "v1-3-0",
    version: "v1.3.0",
    date: "18 Okt 2026",
    title: "Persistensi Cloud Turso & Perbaikan Kanban",
    summary: "Transisi ke cloud database Turso / LibSQL untuk keandalan serverless Vercel serta stabilisasi drag-and-drop kanban.",
    changes: [
      {
        type: "improvement",
        text: "Cloud Database Turso: Migrasi penyimpanan database ke LibSQL Cloud untuk memastikan data persisten di serverless execution.",
      },
      {
        type: "fix",
        text: "Kanban Drag-and-Drop: Menghilangkan kendala rollback optimistik saat menggeser kartu subtask antar status.",
      },
      {
        type: "fix",
        text: "Unique Ticket ID: Mencegah duplikasi data ticket_id saat sinkronisasi sprint dijalankan berulang.",
      },
    ],
  },
  {
    id: "v1-2-0",
    version: "v1.2.0",
    date: "17 Okt 2026",
    title: "Laporan Eksekutif Proyek & Analisis Beban Kerja",
    summary: "Fitur analitik performa lead, ringkasan beban kerja tim, dan pelaporan eksekutif proyek.",
    changes: [
      {
        type: "feature",
        text: "Executive Project Status Report: Tab rekapitulasi status proyek untuk jajaran manajemen dengan filter periode tahunan.",
      },
      {
        type: "feature",
        text: "Sinkronisasi Beban Kerja: Grafik kapasitas kerja staf dan performa Lead Proyek yang tersinkronisasi otomatis dengan roster tim.",
      },
      {
        type: "improvement",
        text: "Export Laporan: Dukungan ekspor laporan ringkasan proyek ke format dokumen.",
      },
    ],
  },
  {
    id: "v1-1-0",
    version: "v1.1.0",
    date: "16 Okt 2026",
    title: "Sinkronisasi Sprint Google Sheets & Histori Tim",
    summary: "Integrasi langsung dengan Google Spreadsheet untuk impor data sprint serta pencatatan histori penugasan staf.",
    changes: [
      {
        type: "feature",
        text: "Google Sheets Sprint Sync: Dialog sinkronisasi sprint langsung dari spreadsheet dengan fitur preview diff sebelum diterapkan.",
      },
      {
        type: "feature",
        text: "Histori Penugasan Staf: Modal audit trail untuk melihat riwayat pergantian assignee subtask beserta alasan perubahannya.",
      },
    ],
  },
  {
    id: "v1-0-0",
    version: "v1.0.0",
    date: "15 Okt 2026",
    title: "Peluncuran TaskForge v1.0",
    summary: "Rilis platform manajemen tugas, pelacakan waktu subtask, dan monitoring sprint terpadu.",
    changes: [
      {
        type: "feature",
        text: "Subtask Kanban Board: Manajemen alur kerja to-do, in-progress, review, dan done.",
      },
      {
        type: "feature",
        text: "Role-Based Access Control: Hak akses berjenjang untuk Staff, Lead Proyek, Kadep, Kadiv, dan Super Admin.",
      },
      {
        type: "feature",
        text: "Realtime Timer & Kontribusi: Stopwatch pencatat durasi kerja riil per staf per subtask.",
      },
    ],
  },
];
