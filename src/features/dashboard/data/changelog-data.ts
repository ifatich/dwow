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
    id: "v1-8-0",
    version: "v1.8.0",
    date: "21 Okt 2026",
    title: "Rich Markdown Evidence Editor with Formatting Toolbar, Direct Screenshot Paste & Lightbox Preview",
    summary: "Menghadirkan editor bukti pengerjaan (evidence) berbasis Markdown modern dengan toolbar visual lengkap, dukungan paste langsung screenshot dari clipboard (Ctrl+V) dengan kompresi WebP otomatis di browser, tab preview real-time, serta penampil gambar lightbox interaktif pada kartu Kanban dan modal detail.",
    changes: [
      {
        type: "feature",
        text: "Markdown Evidence Editor: Menggantikan textarea bukti pengerjaan polos dengan editor berbasis Markdown yang dilengkapi toolbar visual untuk Bold, Italic, Bullet List, Numbered List, Checklist (- [ ]), Link, dan Image.",
      },
      {
        type: "feature",
        text: "Direct Screenshot Paste (Ctrl+V) & Instant Visual Image Preview: Pengembang kini dapat langsung menempelkan screenshot tangkapan layar dari clipboard (Ctrl+V / Cmd+V) atau drag-and-drop. Gambar otomatis dikompresi menjadi WebP ringan (~30-70 KB) dan langsung tampil seketika sebagai kartu pratinjau visual di bawah teks tanpa perlu membuka tab preview manual, serta tanpa mengotori area ketik dengan kode base64.",
      },
      {
        type: "feature",
        text: "Dual Tab Write & Real-Time Full Preview: Menyediakan toggle tab 'Tulis Catatan' dan 'Preview Lengkap' pada EvidenceDialog untuk memverifikasi susunan teks, formatting markdown, checklist, dan link sebelum diajukan.",
      },
      {
        type: "improvement",
        text: "Interactive Image Lightbox & Compact Card Preview: Bukti pengerjaan pada kartu Kanban dan modal detail subtask kini dirender rapi dengan dukungan checklist interaktif, link aktif, dan thumbnail gambar yang dapat diklik untuk membuka pratinjau zoom layar penuh (Lightbox).",
      },
      {
        type: "improvement",
        text: "Pembersihan Otomatis Log Aktivitas (No Base64 Bloat): Riwayat log aktivitas kini disanitasi secara otomatis sehingga hanya menampilkan teks catatan manusia yang ringkas dan bersih. Kode panjang base64 gambar digantikan dengan penanda tag rapi [📷 Gambar Bukti] baik saat disimpan ke database maupun saat ditampilkan di halaman riwayat dan feed aktivitas.",
      },
      {
        type: "improvement",
        text: "Peningkatan Ukuran Modal & Shortcut: Modal EvidenceDialog diperluas secara proporsional (max-w-[600px]) dengan dukungan shortcut simpan cepat (Ctrl+Enter / Cmd+Enter) dan tombol tutup (Esc / ✕).",
      },
    ],
  },
  {
    id: "v1-7-1",
    version: "v1.7.1",
    date: "20 Okt 2026",
    title: "Non-Essential Icon Removal & Minimalist Collapsible What's New Section",
    summary: "Membersihkan seluruh icon/emoji non-esensial di dashboard untuk tampilan yang lebih profesional dan minimalis, serta menghadirkan fitur collapse pada section What's New dengan mode strip ringkas dan penyimpanan preferensi lokal.",
    changes: [
      {
        type: "improvement",
        text: "Pembersihan Icon/Emoji Non-Esensial: Menghapus emoji dekoratif non-esensial (seperti emoji peringatan pada status approval lead, penanda pada kartu proyek, banner eksekutif & subtask, serta bulatan emoji pada grafik performa dan trend sprint) dan menggantinya dengan indikator dot CSS minimalis yang rapi dan profesional.",
      },
      {
        type: "feature",
        text: "Fitur Collapse & Mode Strip Minimalis What's New: Section Catatan Rilis kini dapat di-collapse menjadi 1 baris ringkas (~44px) yang hanya menampilkan preview rilis terbaru tanpa memakan ruang vertikal berlebih pada dashboard.",
      },
      {
        type: "improvement",
        text: "Accordion Rilis Terdahulu: Saat What's New dibuka, hanya versi terbaru yang ditampilkan secara penuh, sedangkan versi-versi sebelumnya dapat dibuka secara mandiri melalui tombol accordion 'Lihat Perubahan'.",
      },
      {
        type: "improvement",
        text: "Standarisasi Lebar Badge Tipe Perubahan: Mengatur badge kategori perubahan ('Fitur Baru', 'Perbaikan', 'Peningkatan') dengan lebar tetap seragam (w-[84px] text-center) sehingga teks rincian di sebelah kanannya selalu sejajar vertikal secara presisi.",
      },
      {
        type: "fix",
        text: "Penyelarasan Garis Timeline What's New: Memperbaiki alignment horizontal garis vertikal timeline dan bulatan node (◎) agar berada pada satu sumbu sumbu simetri yang sama persis (left-[12px] -translate-x-1/2).",
      },
      {
        type: "improvement",
        text: "Persistensi Status Collapse: Pilihan collapse/expand What's New disimpan secara persisten di penyimpanan browser lokal (localStorage).",
      },
    ],
  },
  {
    id: "v1-7-0",
    version: "v1.7.0",
    date: "20 Okt 2026",
    title: "Admin Role Task Decoupling & Unified Equal-Height Project Card Layout",
    summary: "Memastikan role Super Admin tidak lagi dibebani antrean tugas review personal di dashboard namun tetap memegang otoritas penuh di seluruh sistem, serta menyempurnakan struktur layout kartu proyek agar selalu rapi, proporsional, dan memiliki tinggi yang seragam dengan segala variasi nilai.",
    changes: [
      {
        type: "fix",
        text: "Pemisahan Antrean Review Role Admin: Menghapus penetapan task review personal, badge review, dan border kuning pada kartu proyek untuk role Super Admin/Admin. Admin kini murni berposisi sebagai pengawas manajerial tanpa beban task harian, namun tetap memiliki hak akses bypass penuh untuk meninjau dan menyetujui subtask di kanban board.",
      },
      {
        type: "improvement",
        text: "Penyelarasan Tinggi Kartu Proyek (Equal-Height Grid): Mengganti perataan grid dari items-start menjadi items-stretch serta menerapkan struktur flex flex-col h-full pada ProjectCard sehingga seluruh kartu dalam baris yang sama otomatis memiliki tinggi 100% sejajar.",
      },
      {
        type: "improvement",
        text: "Bottom-Pinned Footer & Slot Indikator Seragam: Menstandarisasi slot indikator dengan reserved min-height dan menyematkan bagian progress serta status pills di posisi dasar kartu (mt-auto) agar baseline elemen horizontal kartu selalu sejajar secara presisi lintas kolom.",
      },
      {
        type: "fix",
        text: "Koreksi Notifikasi Deadline & Review Super Admin: Memastikan lonceng notifikasi tidak memuat antrean deadline atau review personal untuk role Super Admin pada halaman dashboard.",
      },
    ],
  },
  {
    id: "v1-6-9",
    version: "v1.6.9",
    date: "20 Okt 2026",
    title: "Dashboard Section Visibility Customization per Role for Admin & Streamlined Lead Performance Card",
    summary: "Menghadirkan fitur pengaturan visibilitas section dashboard berdasarkan role pengguna (Staff, Project Lead, Kadep, Kadiv, Super Admin) melalui modal interaktif yang dapat diakses oleh Admin via tombol gerigi, serta menyederhanakan kartu Performa Project Lead dengan menyembunyikan area beban kerja tim staf.",
    changes: [
      {
        type: "feature",
        text: "Modal Pengaturan Visibilitas Section per Role: Admin kini dapat mengatur section dashboard mana saja yang tampil untuk masing-masing role (Staff, Project Lead, Kepala Departemen, Kepala Divisi, Super Admin) dengan toggle switch interaktif dan penyimpanan persisten di database.",
      },
      {
        type: "feature",
        text: "Icon Gerigi / Settings pada Setiap Section Dashboard: Tombol gerigi ditambahkan pada setiap section mulai dari Performa Project Lead ke bawah (Performa Project Lead, Daftar Proyek, Grafik Beban Kerja, Perlu Review, dan What's New) yang khusus dapat diakses oleh role Admin.",
      },
      {
        type: "improvement",
        text: "Penyederhanaan Kartu Performa Project Lead: Area daftar 'Beban Kerja Tim' beserta bar jam kerja per staf pada kartu Project Lead kini disembunyikan untuk semua role agar tampilan kartu lebih ringkas, proporsional, dan fokus pada metrik inti proyek.",
      },
      {
        type: "improvement",
        text: "Placeholder Reaktivasi Khusus Admin: Jika suatu section disembunyikan untuk role Super Admin, sistem menampilkan banner placeholder interaktif sehingga Admin dapat dengan mudah membuka modal dan mengaktifkannya kembali kapan saja.",
      },
      {
        type: "fix",
        text: "Penyelesaian SSR Hydration Mismatch Dashboard: Mengadopsi two-pass client hydration pattern pada useDashboardVisibility dan page.tsx sehingga pohon DOM server dan client identik pada saat render awal sebelum menerapkan konfigurasi kustom role.",
      },
    ],
  },
  {
    id: "v1-6-8",
    version: "v1.6.8",
    date: "20 Okt 2026",
    title: "Cookie Size & JWT Header Overflow Fix via Dedicated Binary Avatar Streaming Endpoint",
    summary: "Memperbaiki kendala gagal login ('Failed to fetch') pada pengguna yang pernah mengganti foto profil dengan mengisolasi data gambar biner melalui rute streaming khusus /api/users/:userId/avatar dan memangkas ukuran header cookie JWT dari ratusan kilobyte menjadi < 1KB.",
    changes: [
      {
        type: "fix",
        text: "Penyelesaian HTTP Header Overflow (Failed to fetch): Mencegah string Data URI base64 foto profil masuk ke dalam cookie authjs.session-token saat proses login dan session update, sehingga ukuran cookie turun drastis dari ~320KB menjadi < 1KB dan aman dari limitasi header browser/ekstensi.",
      },
      {
        type: "feature",
        text: "Dedicated Binary Avatar Streaming Endpoint: Menghadirkan endpoint /api/users/:userId/avatar yang melayani file gambar biner pengguna secara efisien lengkap dengan header HTTP Caching.",
      },
      {
        type: "improvement",
        text: "Optimasi Komponen UserAvatar & Auto-Fallback: Memperbaiki logika deteksi avatar pada komponen UserAvatar sehingga otomatis mengambil foto dari cache memory jika data avatar pada session bernilai null/undefined.",
      },
    ],
  },
  {
    id: "v1-6-7",
    version: "v1.6.7",
    date: "20 Okt 2026",
    title: "Direct Subtask Evidence Display for Reviewing Lead & Persistent Review Notification List",
    summary: "Menampilkan bukti pengerjaan (evidence) langsung pada kartu subtask di papan Kanban khusus untuk Lead penanggung jawab yang mereview, serta menghadirkan daftar tugas review (maksimal 5) pada menu notifikasi yang persisten hingga seluruh subtask selesai direview.",
    changes: [
      {
        type: "feature",
        text: "Tampilan Evidence Langsung di Kartu Subtask: Bukti pengerjaan (evidence / URL / catatan penyelesaian) kini langsung dirender secara rapi dan dapat diklik (linkify) pada kartu subtask kolom Review khusus bagi Lead yang berwenang mereview tanpa perlu membuka modal detail terlebih dahulu.",
      },
      {
        type: "feature",
        text: "Daftar Tugas Review pada Menu Notifikasi (Maks 5): Menu notifikasi header kini menampilkan seksi khusus 'Perlu Review' (maksimal 5 tugas teratas) lengkap dengan counter subtask menunggu review, rincian proyek, badge indikator terintegrasi, dan tautan langsung ke Kanban task.",
      },
      {
        type: "improvement",
        text: "Notifikasi Review Persisten & Sinkronisasi Realtime: Notifikasi tugas review tetap aktif dan tidak hilang sampai seluruh subtask yang bersangkutan benar-benar selesai direview (disetujui atau direvisi) dengan pembaruan otomatis via realtime sync.",
      },
    ],
  },
  {
    id: "v1-6-6",
    version: "v1.6.6",
    date: "20 Okt 2026",
    title: "Task-Lead Ownership Enforcement, Review Indicators & Settings Access Control",
    summary: "Memperketat hak akses Lead pada level task/subtask hanya untuk tiket yang dipimpinnya, menghadirkan penanda visual cerdas pada project, task, dan subtask yang membutuhkan review Lead, membatasi pengubahan Histori Tim, serta mengkhususkan Integrasi Google Sheets untuk Lead & Admin.",
    changes: [
      {
        type: "feature",
        text: "Penanda Review pada Project, Task & Subtask: Menghadirkan indikator visual (badge counter, border highlight, serta daftar subtask aktif di posisi review) pada kartu proyek, kartu task, dan kartu subtask di dashboard dan papan Kanban khusus untuk Lead penanggung jawab ketika ada subtask yang benar-benar membutuhkan review.",
      },
      {
        type: "feature",
        text: "Enforcement Kepemilikan Lead pada Task & Subtask: Pengguna dengan peran Lead kini hanya dapat melakukan review, revisi, approval (status Done), serta menggeser tiket Kanban pada task dan subtask yang berada di bawah tanggung jawab/kepemimpinannya secara spesifik.",
      },
      {
        type: "feature",
        text: "Proteksi Otorisasi Histori Tim: Fitur re-alokasi staf di dialog Histori Tim kini diproteksi di sisi UI dan API backend — hanya pelaksana/pemilik tiket yang terlibat, Lead penanggung jawab task tersebut, atau Admin yang dapat mengubah penugasan.",
      },
      {
        type: "improvement",
        text: "Akses Kontrol Integrasi Google Sheets: Kartu 'Integrasi Google Sheets' pada halaman /settings kini dikhususkan dan hanya ditampilkan untuk peran Lead dan jajaran Admin (Kadep, Kadiv, Super Admin).",
      },
      {
        type: "improvement",
        text: "Palet Kurasi Enterprise untuk User Baru pada UserAvatar: Menghadirkan palet warna kurasi (CURATED_FALLBACK_PALETTE) dengan standar kontras WCAG AA yang dipilih secara deterministik untuk pengguna baru yang belum memiliki foto profil.",
      },
    ],
  },
  {
    id: "v1-6-5",
    version: "v1.6.5",
    date: "19 Okt 2026",
    title: "Universal User Avatar & Profile Picture Integration",
    summary: "Menyelaraskan seluruh avatar pengguna di semua modul dan antarmuka aplikasi agar menampilkan foto profil asli (termasuk animasi GIF), didukung cache otomatis cerdas dan fallback inisial terstandarisasi.",
    changes: [
      {
        type: "feature",
        text: "Standarisasi Komponen UserAvatar: Menghadirkan komponen universal UserAvatar dengan multi-preset ukuran (2xs hingga 2xl), auto-lookup foto profil dari in-memory cache pengguna, deteksi error gambar otomatis dengan fallback inisial dan warna deterministik, serta sinkronisasi update profil seketika.",
      },
      {
        type: "improvement",
        text: "Integrasi Foto Profil Menyeluruh di Seluruh Halaman: Memastikan semua avatar pengguna menampilkan foto profil di Master Data (/master-data), Manajemen Pengguna (/users), Kanban Task & Subtask, Detail Task, Activity Feed & Logs, Riwayat Aktivitas (/activity-history), Sprint List, Dialog Penugasan Staff, Laporan Kinerja, dan Header Navigasi.",
      },
      {
        type: "improvement",
        text: "Tampilan Avatar pada Trigger Dropdown: Memperbarui CustomDropdown sehingga tombol pemilih menampilkan icon/avatar pengguna yang sedang terpilih secara langsung pada form dan tabel.",
      },
      {
        type: "fix",
        text: "Optimalisasi Endpoint & Query Avatar: Menyertakan kolom avatar pengguna di endpoint API Master Tasks, Master Teams, Master Categories, Dashboard, Reports Kinerja/Eksekutif, dan Activity Logs untuk memastikan data foto profil selalu siap saji.",
      },
    ],
  },
  {
    id: "v1-6-4",
    version: "v1.6.4",
    date: "19 Okt 2026",
    title: "Master Task Management & Task-Level Lead Review",
    summary: "Menghadirkan manajemen seluruh task di halaman /master-data dengan kemampuan mengatur Lead Penanggung Jawab pada level task, serta mengalihkan kewenangan review subtask langsung ke Task Lead.",
    changes: [
      {
        type: "feature",
        text: "Daftar Semua Task di Master Data (/master-data): Menampilkan ringkasan KPI (Total Task, Memiliki Lead, Belum Ditugaskan), pencarian multi-kriteria, filter Sprint, Proyek, dan Lead, serta tabel komprehensif seluruh task di halaman utama Master Data.",
      },
      {
        type: "feature",
        text: "Pengaturan Lead di Level Task: Memungkinkan penugasan Lead penanggung jawab langsung pada setiap task secara inline menggunakan CustomDropdown dengan kandidat Lead yang dikhususkan hanya untuk personil dengan peran Lead (Arif, Cheppy, Ganda).",
      },
      {
        type: "improvement",
        text: "Penyelarasan Tampilan & Collapsible Filter: Menyeragamkan desain tabel Daftar Task dengan Master Kategori Project (border-collapse, badge tiket, feedback inline per-baris) serta menghadirkan bilah filter horizontal (pencarian teks, sprint, proyek, lead) yang dapat disembunyikan/ditampilkan (collapsible).",
      },
      {
        type: "improvement",
        text: "Task-Level Review Enforcement: Hak akses review, approval, dan revisi subtask kini dialihkan ke Lead pada level task (bukan lagi sekadar level project), dengan penyesuaian otomatis pada kartu 'Perlu Review' di dashboard dan metrik laporan kinerja.",
      },
      {
        type: "improvement",
        text: "Penyatuan Tampilan Halaman (/master-data): Menghapus bilah tab navigasi sehingga seluruh seksi Master Data (Daftar Task, Kategori Proyek, dan Struktur Tim) tersaji secara berkesinambungan dan mudah diakses tanpa harus berpindah tab.",
      },
      {
        type: "improvement",
        text: "Pembersihan Navigasi Pengaturan (/settings): Menghapus tombol shortcut 'Kelola Master Data' pada header Pengaturan & Profil agar tata letak halaman lebih bersih dan fokus pada manajemen akun.",
      },
      {
        type: "improvement",
        text: "Pembersihan Antarmuka Profil (/settings): Menghapus kartu informasi departemen/ID dan tautan pengujian download GIF dari form Profil Pengguna agar tampilan profil lebih rapi, terfokus, dan minimalis.",
      },
      {
        type: "fix",
        text: "Kalibrasi Indikator Online Avatar: Mengunci dimensi wadah relatif avatar (88x88 px) dan mengalibrasi posisi lingkaran hijau indikator status aktif (bottom-1 right-1) agar menempel presisi pada sudut keliling foto tanpa celah renggang.",
      },
      {
        type: "improvement",
        text: "Rebranding D-WoW Platform & Halaman Login Produksi: Mengubah identitas merek secara menyeluruh menjadi D-WoW Platform (Digital Way of Working) dengan logo resmi Dual-Circle DW Monochrome (101x58px), penataan lockup presisi dengan subline, pembaruan header global dan metadata layout, serta menyempurnakan halaman login untuk rilis produksi (menghapus drawer demo dan tulisan enterprise, menambahkan toggle visibilitas password, serta pembersihan antarmuka).",
      },
      {
        type: "fix",
        text: "Perbaikan Hapus Foto Profil & Asset GIF: Memperbaiki tombol 'Hapus Foto' agar langsung menghapus foto secara permanen ke server dan session, mengatasi restore otomatis akibat sinkronisasi reaktif, serta menyediakan asset animasi GIF (/test-avatar.gif) untuk pengujian.",
      },
    ],
  },
  {
    id: "v1-6-3",
    version: "v1.6.3",
    date: "19 Okt 2026",
    title: "Pemisahan Master Data & Penyatuan Pengaturan dan Profil",
    summary: "Memisahkan area Master Data menjadi halaman mandiri (/master-data) khusus Reviewer, serta menyatukan Profil Pengguna dan Pengaturan Sistem ke dalam satu halaman terpadu di /settings dengan navigasi akun yang ringkas.",
    changes: [
      {
        type: "feature",
        text: "Penyatuan Pengaturan & Profil (/settings): Menggabungkan identitas profil pengguna, upload foto (kompresi otomatis ~15KB & animasi GIF maks 800KB), ganti password 2-step (collapsible), integrasi Google Sheets, dan preferensi notifikasi dalam satu halaman efisien.",
      },
      {
        type: "feature",
        text: "Halaman Master Data Mandiri (/master-data): Memisahkan Kategori Proyek dan Struktur Tim Roster ke halaman terdedikasi lengkap dengan filter tab (Semua, Kategori Proyek, Struktur Tim) dan proteksi akses middleware khusus Reviewer.",
      },
      {
        type: "improvement",
        text: "Penyederhanaan Menu Dropdown Akun: Menu header kini ringkas menampilkan satu opsi terpadu 'Pengaturan & Profil' dan 'Master Data' (untuk reviewer) dengan penanda status rute aktif (class active).",
      },
      {
        type: "improvement",
        text: "Data Riwayat Sprint Aktual: Mode Tren pada /sprint-history kini menggunakan data agregasi database aktual (Sprint 186) dan bebas dari data dummy.",
      },
    ],
  },
  {
    id: "v1-6-2",
    version: "v1.6.2",
    date: "19 Okt 2026",
    title: "Standardisasi Dropdown Custom & Default Sprint Aktif",
    summary: "Menyeragamkan seluruh komponen dropdown di Kanban dan dialog agar konsisten dengan style TaskForge serta memastikan filter sprint di seluruh aplikasi default ke sprint yang sedang aktif.",
    changes: [
      {
        type: "improvement",
        text: "Default Sprint Aktif: Seluruh filter sprint di halaman Riwayat Sprint, Laporan Kinerja, Riwayat Aktivitas, dan Metrik Individu kini otomatis memilih sprint yang sedang aktif (terbaru) saat halaman pertama kali dimuat.",
      },
      {
        type: "improvement",
        text: "Standardisasi CustomDropdown: Menggantikan elemen native <select> pada KanbanToolbar, SubtaskKanban, dan SprintSyncDialog dengan komponen CustomDropdown terstandarisasi lengkap dengan popover card, checkmark, dan chevron interaktif.",
      },
      {
        type: "improvement",
        text: "Badge Indikator Sprint Aktif: Menambahkan badge visual 'Aktif' pada opsi sprint terbaru di dalam daftar dropdown.",
      },
    ],
  },
  {
    id: "v1-6-1",
    version: "v1.6.1",
    date: "19 Okt 2026",
    title: "Perbaikan Instant Mount Fetch & Anti-Duplicate Polling",
    summary: "Memperbaiki keterlambatan penampilan Daftar Sprint dan halaman terkait dengan pemanggilan data instan pada mount awal (0 ms), pencegahan burst request ganda, dan micro-cache API.",
    changes: [
      {
        type: "fix",
        text: "Instant Mount Fetch: Menghilangkan jeda pemuatan 30 detik pada Riwayat Sprint, Home, dan Kanban dengan memicu pengambilan data langsung saat komponen dimount (0 ms) alih-alih menunggu timer polling.",
      },
      {
        type: "improvement",
        text: "Anti-Duplicate Polling: Menambahkan throttle guard (2000 ms) pada useRealtimeSync untuk mencegah request ganda saat event window focus dan visibilitychange terpicu bersamaan.",
      },
      {
        type: "improvement",
        text: "Deduplikasi Filter Sprints: GlobalFilterToolbar memanfaatkan data sprint dari parent page sehingga tidak lagi menembak /api/sprints secara berulang.",
      },
      {
        type: "improvement",
        text: "Lean Columns & Micro-Cache /api/sprints: Memilih kolom spesifik (menghapus payload evidence/goals/dod yang berat) dan menambahkan micro-cache 5 detik untuk respon instan < 40 ms.",
      },
    ],
  },
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
