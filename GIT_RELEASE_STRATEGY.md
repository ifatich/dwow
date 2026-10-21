# Strategi Rilis Git Bertahap (Phased Commit & Merge Strategy)
> **Dokumen Resmi Perencanaan Rilis D-WoW Platform v1.7.x (Digital Way of Working)**  
> **Konteks:** Diajukan setelah adanya masukan, saran, dan temuan hasil evaluasi komprehensif sistem  
> **Status:** Siap Dieksekusi Bertahap (Belum Di-commit / Belum Di-push)  
> **Target Branch Pengembangan:** `feat/platform-v1.7-enhancements`  
> **Target Branch Produksi:** `master`  
> **Estimasi Ritme:** 8 Hari Kerja (1 Hari = 8 Jam Kerja Normal, 1 Commit Utama per Hari)

---

## 1. Prinsip Utama & Garansi 4 Lapis Anti-Konflik (Zero-Conflict Guarantee)

Untuk menjamin **100% TIDAK ADA KONFLIK** saat branch fitur digabungkan (merge) ke branch `master`, sistem menerapkan **4 Lapis Perlindungan Teknis**:

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ LAPIS 1: Linear Ancestry & Zero Divergence                                 │
│     Branch master adalah parent langsung (0 branch divergence).                │
│     Secara matematis 100% bebas dari conflict markers (<<<<<<< HEAD).          │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│  🧩 LAPIS 2: Self-Contained Dependency Graph                                   │
│     Semua komponen dasar (UserAvatar, CustomDropdown, useCurrentUser)          │
│     disertakan di Merge 1. Bebas dari error missing module / broken imports.   │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ LAPIS 3: Working Tree Stash Shield Protocol                                │
│     git stash push -u mengamankan file uncommitted saat checkout master.       │
│     git stash pop memulihkan perubahan seketika setelah merge ke master.       │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│  🚦 LAPIS 4: Double Typecheck Gate (npx tsc --noEmit)                          │
│     Validasi 0 error dijalankan 2x: sebelum commit di feature branch &         │
│     setelah git merge di branch master sebelum di-push ke remote.              │
└────────────────────────────────────────────────────────────────────────────────┘
```

1. **Lapis 1 — Garansi Struktur Git (Linear Ancestry & Zero Divergence):**
   Branch `master` tidak menerima commit independen dari developer lain selama proses ini. Karena branch `feat/platform-v1.7-enhancements` dibuat langsung dari HEAD `master`, riwayat git bersifat *direct descendant* (anak langsung). Secara matematis, operasi `git merge --no-ff` pada garis keturunan lurus **100% mustahil menghasilkan konflik sintaks git (`<<<<<<< HEAD`)**.

2. **Lapis 2 — Garansi Ketergantungan Komponen (Self-Contained Dependency Graph):**
   Tidak ada file di Tahap A yang memanggil komponen/tipe di Tahap B yang belum di-commit.
   - Komponen dasar seperti `<UserAvatar />`, `<CustomDropdown />`, dan hook `useCurrentUser` dimasukkan langsung ke **Hari 2 (Merge 1)** karena dibutuhkan oleh Master Data dan Header Navigasi.
   - Dengan demikian, branch `master` saat menerima Merge Tahap 1 dapat langsung di-build dan di-deploy tanpa kehilangan file referensi (*no missing module*).

3. **Lapis 3 — Garansi Kebersihan Working Tree (Stash Shield Protocol):**
   Saat berpindah dari branch fitur ke `master` untuk eksekusi merge, file-file yang belum di-commit milik hari-hari berikutnya diamankan menggunakan:
   ```bash
   git stash push -u -m "WIP: uncommitted upcoming days"
   ```
   Ini mencegah Git memblokir perintah `checkout` atau `merge` akibat benturan file lokal (*local changes would be overwritten*). Setelah merge selesai dan kembali ke branch fitur, perubahan dikembalikan dengan aman melalui:
   ```bash
   git stash pop
   ```

4. **Lapis 4 — Gerbang Validasi Tipe Ganda (Double Typecheck Gate):**
   Validasi `npx tsc --noEmit` dijalankan dua kali:
   - **Pertama:** Pada branch fitur sebelum commit dibuat.
   - **Kedua:** Pada branch `master` setelah perintah `git merge` selesai, sebelum di-push ke remote.
   Jika ditemukan `1 error` saja, push dibatalkan seketika.

---

## 2. Jawaban Kunci: Berapa Commit Sebelum Boleh Merge ke Master?

Penggabungan (merge) ke `master` **TIDAK DILAKUKAN SETIAP HARI**, melainkan dikelompokkan ke dalam **4 Tahap Merge yang Aman**:

| Tahap Merge | Syarat Jumlah Commit di Feature Branch | Akumulasi Hari Kerja | Ruang Lingkup Fitur Utama | Versi Rilis Changelog |
| :--- | :--- | :--- | :--- | :--- |
| **Merge 1** | **2 Commit** (Commit Hari 1 & 2) | Hari 1 – 2 (16 Jam) | Master Data Architecture, Rebranding D-WoW Platform & Production Login Page | `v1.6.3` + `v1.6.4` |
| **Merge 2** | **5 Commit** (+3 commit: Hari 3, 4, 5) | Hari 3 – 5 (24 Jam) | Avatar Binary Streaming & Subtask Kanban Review Workflow | `v1.6.5` s/d `v1.6.8` |
| **Merge 3** | **7 Commit** (+2 commit: Hari 6 & 7) | Hari 6 – 7 (16 Jam) | Dashboard Role Visibility & Executive Reporting Suite | `v1.6.9` |
| **Merge 4** | **8 Commit** (+1 commit: Hari 8) | Hari 8 (8 Jam) | Admin Decoupling, Equal Grid & Minimalist UI Polish | `v1.7.0` + `v1.7.1` |

> **Penting untuk Merge 1:** Sesuai instruksi pengguna, antarmuka Login langsung berstatus **Production-Ready** pada Merge 1: seluruh drawer demo preset ("Akses Demo Cepat") dan badge "Enterprise" telah dihapus total, digantikan oleh identitas resmi **D-WoW Platform** dengan logo Dual-Circle DW Monochrome berdimensi presisi `101px × 58px`, penataan teks side-by-side, toggle visibilitas password, serta header navigasi global yang terpadu.

---

## 3. Rincian Jadwal Harian: 8 Hari Kerja (8 Commit di Feature Branch)

### 📅 Hari 1 (Commit 1) — Schema Database, Master Data API & Tipe Data Core
- **Fokus Pekerjaan (8 Jam):**
  - Perancangan kolom relasi `lead_user_id` pada tabel tasks, tabel relasi master categories dan team rosters.
  - Implementasi REST API backend untuk CRUD Master Category dan Team Roster.
  - Pembaruan interface TypeScript di `types.ts` dan service repository.
- **Daftar File yang Di-stage:**
  ```text
  src/db/schema.ts
  src/lib/types.ts
  src/app/api/master/categories/route.ts
  src/app/api/master/teams/route.ts
  src/app/api/master/tasks/
  src/features/task/services/task-repository.ts
  src/features/dashboard/data/changelog-data.ts
  ```
- **Pesan Commit:**
  `feat(db): establish master data schema, task-lead relation and core api services`

---

### 📅 Hari 2 (Commit 2) — Master Data Management Interface, Rebranding D-WoW & Production Login
- **Fokus Pekerjaan (8 Jam):**
  - Pembuatan halaman `/master-data` untuk Super Admin.
  - Komponen CRUD Master Category Manager, Team Roster Manager, dan Master Task Manager.
  - Endpoint update status dan update task dengan dukungan lead assignment.
  - **Rebranding Resmi D-WoW Platform & Halaman Login Produksi:**
    - **Logo Resmi Dual-Circle DW Monochrome:**
      - `public/dwow-logo.png` (Monochrome hitam kanvas transparan, rasio 1.75:1).
      - `public/dwow-logo-white.png` (Monochrome putih untuk kanvas gelap/dark mode).
      - `public/dwow-logo-mark.png` (Standarisasi icon mark).
    - **Spesifikasi Layout Komponen `<DwowLogo />`:**
      - Wadah simbol: `101px × 58px` dengan image `/dwow-logo.png`.
      - Penataan layout: Sisi berdampingan horizontal (`gap: 8px`).
      - Tipografi Brand: `"Platform"` (`font-size: 28px`, `font-weight: 900`, `line-height: 32px`).
      - Tipografi Subline: `"Digital Way of Working"` (`font-size: 12px`, `font-weight: 600`, `color: text-neutral-400`).
    - **Halaman Login Bersih untuk Produksi (`/login`):**
      - Menghapus drawer "Akses Demo Cepat" (demo presets) karena ditujukan untuk rilis produksi.
      - Menghapus badge/label "Enterprise".
      - Form kredensial independen dengan toggle visibilitas password (eye icon) dan error alert yang rapi.
      - Direct credential authentication endpoints (`/api/auth/login-direct`, `/api/login-direct`).
    - **Penyelarasan Identitas Global & Komponen Pendukung:**
      - Header navigasi global ([`page-header.tsx`](file:///Users/lord/Desktop/brd-task-forge/src/components/shared/page-header.tsx)) menggunakan `<DwowLogo variant="horizontal" size="sm" showSubline={false} />`.
      - Metadata aplikasi ([`layout.tsx`](file:///Users/lord/Desktop/brd-task-forge/src/app/layout.tsx)) dengan title `"D-WoW Platform — Digital Way of Working"`.
      - Komponen universal `<UserAvatar />`, `<CustomDropdown />`, dan hook `useCurrentUser` disertakan agar antarmuka Master Data & Header bebas dari dependensi yang menggantung (*zero missing module*).
- **Daftar File yang Di-stage:**
  ```text
  src/app/master-data/
  src/app/login/page.tsx
  src/app/layout.tsx
  src/components/shared/dwow-logo.tsx
  src/components/shared/page-header.tsx
  src/components/shared/user-avatar.tsx
  src/features/auth/hooks/use-current-user.ts
  src/components/ui/custom-dropdown.tsx
  public/dwow-logo.png
  public/dwow-logo-white.png
  public/dwow-logo-mark.png
  src/app/api/login-direct/
  src/app/api/auth/login-direct/
  src/features/auth/services/login.ts
  src/features/master-category/components/master-category-manager.tsx
  src/features/master-category/components/team-roster-manager.tsx
  src/features/master-category/components/master-task-manager.tsx
  src/app/api/tasks/[taskId]/route.ts
  src/app/api/tasks/[taskId]/status/route.ts
  src/features/dashboard/data/changelog-data.ts
  ```
- **Pesan Commit:**
  `feat(master-data): implement management UI tables, D-WoW rebranding and production login`
- 🚀 **CHECKPOINT MERGE TAHAP 1 (Setelah Commit 2 Selesai & Di-push ke Branch):**
  - **Aksi:** Merge `feat/platform-v1.7-enhancements` ke `master`.
  - **Hasil yang Dicapai:** Sistem Master Data berfungsi penuh, identitas merek resmi D-WoW Platform aktif di seluruh antarmuka, dan halaman Login sudah berstatus 100% Production-Ready!

---

### 📅 Hari 3 (Commit 3) — Universal Avatar Binary Streaming & User Management
- **Fokus Pekerjaan (8 Jam):**
  - Mengeliminasi bug `431 Request Header Fields Too Large` akibat cookie base64 avatar.
  - Membuat endpoint dedicated binary image streaming `/api/users/[userId]/avatar`.
  - Pembaruan otentikasi sesi cookie JWT ringan (< 1KB).
  - Halaman profil pengguna (`/profile`), pengaturan akun, dan manajemen pengguna (`/users`).
- **Daftar File yang Di-stage:**
  ```text
  src/features/auth/services/auth.config.ts
  src/features/auth/services/auth.ts
  src/app/api/users/route.ts
  src/app/api/users/[userId]/route.ts
  src/app/api/users/[userId]/avatar/
  src/app/profile/
  src/app/users/page.tsx
  src/proxy.ts
  public/test-avatar.gif
  src/features/dashboard/data/changelog-data.ts
  ```
- **Pesan Commit:**
  `fix(auth): implement dedicated avatar binary streaming and user profile system`

---

### 📅 Hari 4 (Commit 4) — Subtask Kanban & Revision Management Engine
- **Fokus Pekerjaan (8 Jam):**
  - State machine status subtask: `todo` ➔ `in_progress` ➔ `review` ➔ `completed` atau `revision`.
  - Endpoint transaksi penolakan/revisi subtask dengan pencatatan `revisionReason` & timestamp.
  - Modal detail subtask dengan form review dan feedback revisi untuk Lead.
- **Daftar File yang Di-stage:**
  ```text
  src/features/task/components/subtask-kanban.tsx
  src/features/task/components/subtask-detail-modal.tsx
  src/app/api/subtasks/[subtaskId]/approve/route.ts
  src/app/api/subtasks/[subtaskId]/revise/route.ts
  src/app/api/subtasks/[subtaskId]/status/route.ts
  src/features/task/services/activity-service.ts
  src/features/dashboard/data/changelog-data.ts
  ```
- **Pesan Commit:**
  `feat(subtasks): implement revision review workflow and transaction status handlers`

---

### 📅 Hari 5 (Commit 5) — Assignment History Dialog, Consolidated Activity Feed & Kanban Polish
- **Fokus Pekerjaan (8 Jam):**
  - Audit trail perpindahan pengerjaan subtask (`assignment-history`).
  - Dialog riwayat staff dan rekap waktu kerja per tim (`staff-time-summary`).
  - Activity feed gabungan dan kartu tugas terintegrasi pada papan Kanban proyek.
- **Daftar File yang Di-stage:**
  ```text
  src/app/api/subtasks/[subtaskId]/assignment-history/route.ts
  src/features/task/components/staff-assignment-history-dialog.tsx
  src/features/task/components/staff-time-summary.tsx
  src/features/task/components/activity-log.tsx
  src/features/task/components/consolidated-activity-feed.tsx
  src/features/kanban/components/kanban-board.tsx
  src/features/kanban/components/sortable-task-card.tsx
  src/features/kanban/components/task-card.tsx
  src/app/project/[projectId]/page.tsx
  src/app/project/[projectId]/task/[taskId]/page.tsx
  src/features/dashboard/data/changelog-data.ts
  ```
- **Pesan Commit:**
  `feat(kanban): add assignment history audit modal and consolidated activity stream`
- 🚀 **CHECKPOINT MERGE TAHAP 2 (Setelah Commit 5 Selesai & Di-push ke Branch):**
  - **Aksi:** Merge `feat/platform-v1.7-enhancements` ke `master`.
  - **Hasil yang Dicapai:** Sistem Auth aman dari crash header cookie, Avatar Streaming biner cepat, dan workflow Kanban Subtask dengan siklus Review & Revisi utuh.

---

### 📅 Hari 6 (Commit 6) — Dashboard Role Visibility Engine & Executive Preferences
- **Fokus Pekerjaan (8 Jam):**
  - Modal preferensi visibilitas dashboard per role (`super_admin`, `lead`, `staff`).
  - Penyimpanan preferensi via localStorage dan endpoint `/api/settings/dashboard-visibility`.
  - Placeholder elegan ketika section tertentu dinonaktifkan oleh pengguna.
  - Pembaruan pengaturan Google Sheets dengan nama D-WoW Platform (`/settings`).
- **Daftar File yang Di-stage:**
  ```text
  src/app/api/settings/dashboard-visibility/
  src/features/dashboard/hooks/
  src/features/dashboard/types/
  src/features/dashboard/components/section-settings-modal.tsx
  src/features/dashboard/components/section-settings-button.tsx
  src/features/dashboard/components/section-hidden-placeholder.tsx
  src/app/settings/page.tsx
  src/features/dashboard/data/changelog-data.ts
  ```
- **Pesan Commit:**
  `feat(dashboard): introduce modular section visibility settings and role preferences`

---

### 📅 Hari 7 (Commit 7) — Advanced Executive Reporting Suite & Sprint Synchronization
- **Fokus Pekerjaan (8 Jam):**
  - Tabel analitik performa individu dan proyek eksekutif dengan kemampuan ekspor data.
  - Halaman metrik individu, riwayat sprint, dan riwayat aktivitas sistem.
  - Dialog sinkronisasi sprint periodik serta ekspor laporan PDF dan Excel bermerek D-WoW Platform.
- **Daftar File yang Di-stage:**
  ```text
  src/app/individual-metrics/page.tsx
  src/app/sprint-history/page.tsx
  src/app/activity-history/page.tsx
  src/features/reports/components/executive-project-report-table.tsx
  src/features/reports/components/individual-performance-table.tsx
  src/features/reports/types.ts
  src/app/api/reports/route.ts
  src/app/api/reports/export/excel/route.ts
  src/app/api/reports/export/pdf/route.ts
  src/features/sprint-sync/components/sprint-sync-dialog.tsx
  src/features/dashboard/data/changelog-data.ts
  ```
- **Pesan Commit:**
  `feat(reports): provide executive performance tables and sprint sync dialogs`
- 🚀 **CHECKPOINT MERGE TAHAP 3 (Setelah Commit 7 Selesai & Di-push ke Branch):**
  - **Aksi:** Merge `feat/platform-v1.7-enhancements` ke `master`.
  - **Hasil yang Dicapai:** Sistem Reporting Eksekutif dan Pengaturan Visibilitas Dashboard siap pakai di production.

---

### 📅 Hari 8 (Commit 8) — Admin Decoupling, Equal Grid, Minimalist What's New & Final Polish
- **Fokus Pekerjaan (8 Jam):**
  - **Admin Review Queue Decoupling:** Memisahkan peran `super_admin` agar tidak dibebani antrean review subtask personal milik lead proyek.
  - **Equal-Height Project Grid Alignment:** Mengubah container menjadi `items-stretch`, `h-full flex flex-col justify-between`, slot indikator status seragam `min-h-[28px]`, pill status `mt-auto`.
  - **Minimalist Icon Cleanup:** Menghapus emoji non-esensial (`⚠️`, `🔍`, `📋`, `🧑‍💼`, `👁️`, `🟢`) diganti dengan CSS status dots modern berstandar enterprise.
  - **What's New Minimalist Redesign:** Tampilan default 1-baris collapsible (~44px), sistem akordeon per rilis, lebar badge seragam `w-[84px]`, dan garis timeline vertikal yang coaxial persis di tengah buletan.
- **Daftar File yang Di-stage:**
  ```text
  src/app/api/dashboard/route.ts
  src/components/shared/deadline-notification.tsx
  src/app/page.tsx
  src/features/dashboard/components/project-card.tsx
  src/features/dashboard/components/lead-performance-card.tsx
  src/features/dashboard/components/task-distribution-chart.tsx
  src/features/dashboard/components/sprint-velocity-chart.tsx
  src/features/dashboard/components/sprint-trend-chart.tsx
  src/features/dashboard/components/sprint-list.tsx
  src/features/dashboard/components/workload-chart.tsx
  src/features/dashboard/components/review-task-card.tsx
  src/features/dashboard/components/whats-new-section.tsx
  src/components/shared/global-filter-toolbar.tsx
  src/features/dashboard/data/changelog-data.ts
  scripts/test-comprehensive-audit.ts
  GIT_RELEASE_STRATEGY.md
  ```
- **Pesan Commit:**
  `refactor(dashboard): decouple admin review queue, align project grid and minimalist redesign`
- 🚀 **CHECKPOINT MERGE TAHAP 4 (Merge Final & Rilis v1.7.1):**
  - **Aksi:** Merge `feat/platform-v1.7-enhancements` ke `master`.
  - **Tag Git:** `git tag -a v1.7.1 -m "Release v1.7.1: D-WoW Platform Enterprise UX"`
  - **Push Final:** `git push origin master --tags`.

---

## 4. Panduan Eksekusi Terminal Bebas Konflik (Copy-Pasteable)

Berikut rangkaian perintah copy-pasteable untuk setiap hari kerja ketika Anda memberikan instruksi pengerjaan:

### Inisialisasi: Pembuatan Branch Fitur
```bash
git checkout -b feat/platform-v1.7-enhancements
```

---

### 🔹 HARI 1: Commit 1 (Core Schema & API)
```bash
git add src/db/schema.ts src/lib/types.ts src/app/api/master/categories/route.ts src/app/api/master/teams/route.ts src/app/api/master/tasks/ src/features/task/services/task-repository.ts src/features/dashboard/data/changelog-data.ts
npx tsc --noEmit
git commit -m "feat(db): establish master data schema, task-lead relation and core api services"
git push origin feat/platform-v1.7-enhancements
```

---

### 🔹 HARI 2: Commit 2 (Master Data UI, Rebranding D-WoW & Login Prod) + MERGE TAHAP 1
```bash
# 1. Stage file Hari 2
git add src/app/master-data/ src/app/login/page.tsx src/app/layout.tsx src/components/shared/dwow-logo.tsx src/components/shared/page-header.tsx src/components/shared/user-avatar.tsx src/features/auth/hooks/use-current-user.ts src/components/ui/custom-dropdown.tsx public/dwow-logo.png public/dwow-logo-white.png public/dwow-logo-mark.png src/app/api/login-direct/ src/app/api/auth/login-direct/ src/features/auth/services/login.ts src/features/master-category/components/master-category-manager.tsx src/features/master-category/components/team-roster-manager.tsx src/features/master-category/components/master-task-manager.tsx src/app/api/tasks/[taskId]/route.ts src/app/api/tasks/[taskId]/status/route.ts src/features/dashboard/data/changelog-data.ts

# 2. Validasi tipe pada feature branch
npx tsc --noEmit

# 3. Commit & push ke feature branch
git commit -m "feat(master-data): implement management UI tables, D-WoW rebranding and production login"
git push origin feat/platform-v1.7-enhancements

# 4. AMANKAN SISA PERUBAHAN UNCOMMITTED SEBELUM PINDAH KE MASTER
git stash push -u -m "WIP: uncommitted files for days 3-8"

# 5. EKSEKUSI CHECKPOINT MERGE TAHAP 1 KE MASTER
git checkout master
git pull origin master
git merge --no-ff feat/platform-v1.7-enhancements -m "merge: milestone 1 (master data management, D-WoW rebranding & production login)"
npx tsc --noEmit
git push origin master
git tag -a v1.6.4 -m "Release v1.6.4: D-WoW Platform Rebranding & Master Data Architecture"
git push origin v1.6.4

# 6. KEMBALI KE FEATURE BRANCH & RESTORE SISA PERUBAHAN
git checkout feat/platform-v1.7-enhancements
git stash pop
```

---

### 🔹 HARI 3: Commit 3 (Avatar Binary Streaming & User Management)
```bash
git add src/features/auth/services/auth.config.ts src/features/auth/services/auth.ts src/app/api/users/route.ts src/app/api/users/[userId]/route.ts src/app/api/users/[userId]/avatar/ src/app/profile/ src/app/users/page.tsx src/proxy.ts public/test-avatar.gif src/features/dashboard/data/changelog-data.ts
npx tsc --noEmit
git commit -m "fix(auth): implement dedicated avatar binary streaming and user profile system"
git push origin feat/platform-v1.7-enhancements
```

---

### 🔹 HARI 4: Commit 4 (Subtask Kanban & Revision Workflow)
```bash
git add src/features/task/components/subtask-kanban.tsx src/features/task/components/subtask-detail-modal.tsx src/app/api/subtasks/[subtaskId]/approve/route.ts src/app/api/subtasks/[subtaskId]/revise/route.ts src/app/api/subtasks/[subtaskId]/status/route.ts src/features/task/services/activity-service.ts src/features/dashboard/data/changelog-data.ts
npx tsc --noEmit
git commit -m "feat(subtasks): implement revision review workflow and transaction status handlers"
git push origin feat/platform-v1.7-enhancements
```

---

### 🔹 HARI 5: Commit 5 (Assignment History & Feed) + MERGE TAHAP 2
```bash
# 1. Stage file Hari 5
git add src/app/api/subtasks/[subtaskId]/assignment-history/route.ts src/features/task/components/staff-assignment-history-dialog.tsx src/features/task/components/staff-time-summary.tsx src/features/task/components/activity-log.tsx src/features/task/components/consolidated-activity-feed.tsx src/features/kanban/components/kanban-board.tsx src/features/kanban/components/sortable-task-card.tsx src/features/kanban/components/task-card.tsx src/app/project/[projectId]/page.tsx src/app/project/[projectId]/task/[taskId]/page.tsx src/features/dashboard/data/changelog-data.ts

# 2. Validasi tipe pada feature branch
npx tsc --noEmit

# 3. Commit & push ke feature branch
git commit -m "feat(kanban): add assignment history audit modal and consolidated activity stream"
git push origin feat/platform-v1.7-enhancements

# 4. AMANKAN SISA PERUBAHAN UNCOMMITTED SEBELUM PINDAH KE MASTER
git stash push -u -m "WIP: uncommitted files for days 6-8"

# 5. EKSEKUSI CHECKPOINT MERGE TAHAP 2 KE MASTER
git checkout master
git pull origin master
git merge --no-ff feat/platform-v1.7-enhancements -m "merge: milestone 2 (avatar binary streaming & subtask revision review workflow)"
npx tsc --noEmit
git push origin master
git tag -a v1.6.8 -m "Release v1.6.8: Avatar Binary Streaming & Kanban Revision Engine"
git push origin v1.6.8

# 6. KEMBALI KE FEATURE BRANCH & RESTORE SISA PERUBAHAN
git checkout feat/platform-v1.7-enhancements
git stash pop
```

---

### 🔹 HARI 6: Commit 6 (Dashboard Role Visibility Settings)
```bash
git add src/app/api/settings/dashboard-visibility/ src/features/dashboard/hooks/ src/features/dashboard/types/ src/features/dashboard/components/section-settings-modal.tsx src/features/dashboard/components/section-settings-button.tsx src/features/dashboard/components/section-hidden-placeholder.tsx src/app/settings/page.tsx src/features/dashboard/data/changelog-data.ts
npx tsc --noEmit
git commit -m "feat(dashboard): introduce modular section visibility settings and role preferences"
git push origin feat/platform-v1.7-enhancements
```

---

### 🔹 HARI 7: Commit 7 (Executive Reporting Suite) + MERGE TAHAP 3
```bash
# 1. Stage file Hari 7
git add src/app/individual-metrics/page.tsx src/app/sprint-history/page.tsx src/app/activity-history/page.tsx src/features/reports/components/executive-project-report-table.tsx src/features/reports/components/individual-performance-table.tsx src/features/reports/types.ts src/app/api/reports/route.ts src/app/api/reports/export/excel/route.ts src/app/api/reports/export/pdf/route.ts src/features/sprint-sync/components/sprint-sync-dialog.tsx src/features/dashboard/data/changelog-data.ts

# 2. Validasi tipe pada feature branch
npx tsc --noEmit

# 3. Commit & push ke feature branch
git commit -m "feat(reports): provide executive performance tables and sprint sync dialogs"
git push origin feat/platform-v1.7-enhancements

# 4. AMANKAN SISA PERUBAHAN UNCOMMITTED SEBELUM PINDAH KE MASTER
git stash push -u -m "WIP: uncommitted files for day 8"

# 5. EKSEKUSI CHECKPOINT MERGE TAHAP 3 KE MASTER
git checkout master
git pull origin master
git merge --no-ff feat/platform-v1.7-enhancements -m "merge: milestone 3 (executive reporting suite & role visibility settings)"
npx tsc --noEmit
git push origin master
git tag -a v1.6.9 -m "Release v1.6.9: Executive Reporting & Role Dashboard Visibility"
git push origin v1.6.9

# 6. KEMBALI KE FEATURE BRANCH & RESTORE SISA PERUBAHAN
git checkout feat/platform-v1.7-enhancements
git stash pop
```

---

### 🔹 HARI 8: Commit 8 (Admin Decoupling, Equal Grid & Polish) + MERGE FINAL (v1.7.1)
```bash
# 1. Stage file Hari 8 (seluruh sisa file yang tersisa)
git add src/app/api/dashboard/route.ts src/components/shared/deadline-notification.tsx src/app/page.tsx src/features/dashboard/components/project-card.tsx src/features/dashboard/components/lead-performance-card.tsx src/features/dashboard/components/task-distribution-chart.tsx src/features/dashboard/components/sprint-velocity-chart.tsx src/features/dashboard/components/sprint-trend-chart.tsx src/features/dashboard/components/sprint-list.tsx src/features/dashboard/components/workload-chart.tsx src/features/dashboard/components/review-task-card.tsx src/features/dashboard/components/whats-new-section.tsx src/components/shared/global-filter-toolbar.tsx src/features/dashboard/data/changelog-data.ts scripts/test-comprehensive-audit.ts GIT_RELEASE_STRATEGY.md

# 2. Validasi tipe pada feature branch
npx tsc --noEmit

# 3. Commit & push ke feature branch
git commit -m "refactor(dashboard): decouple admin review queue, align project grid and minimalist redesign"
git push origin feat/platform-v1.7-enhancements

# 4. EKSEKUSI CHECKPOINT MERGE TAHAP 4 (FINAL) KE MASTER
git checkout master
git pull origin master
git merge --no-ff feat/platform-v1.7-enhancements -m "merge: milestone 4 (admin review decoupling, equal grid & minimalist what's new)"
npx tsc --noEmit
git push origin master
git tag -a v1.7.1 -m "Release v1.7.1: D-WoW Platform Enterprise UX Final"
git push origin v1.7.1
```

---

## 5. Matriks Verifikasi & Kesiapan Rilis (Pre-Flight Checklist)

| Area Verifikasi | Target Uji Coba | Tolok Ukur Keberhasilan | Milestone Terkait |
| :--- | :--- | :--- | :--- |
| **Kompilasi TypeScript** | Seluruh Project | `npx tsc --noEmit` menghasilkan `0 error`. | Wajib di setiap Commit |
| **Login Page Produksi** | `/login` | Tampilan bersih tanpa drawer demo, tanpa badge enterprise, logo lockup presisi, password toggle aktif. | Merge Tahap 1 |
| **D-WoW Brand Identity** | Header, Layout, Login | Logo Dual-Circle DW (101x58px) tampil tajam dengan rasio 1.75:1 dan teks "Platform" / "Digital Way of Working". | Merge Tahap 1 |
| **Master Data Management** | `/master-data` | Tabel Master Tasks, Kategori, dan Tim dapat di-CRUD oleh Super Admin. | Merge Tahap 1 |
| **Avatar Streaming** | `/api/users/[userId]/avatar` | Tidak ada error HTTP 431, avatar biner termuat cepat dengan header caching. | Merge Tahap 2 |
| **Kanban Review Workflow** | Kanban Proyek & Subtask | Subtask review dapat disetujui (Done) atau direvisi dengan alasan oleh Lead pemilik task. | Merge Tahap 2 |
| **Role Dashboard Visibility**| `/` (Dashboard) | Admin dapat menyembunyikan/menampilkan section dashboard per role pengguna. | Merge Tahap 3 |
| **Executive Reports** | `/individual-metrics`, Export | Ekspor PDF dan Excel memuat kop resmi D-WoW Platform dan data metrik akurat. | Merge Tahap 3 |
| **Admin Decoupling & Grid** | `/` (Dashboard) | Kartu proyek memiliki tinggi sejajar (equal-height), admin tidak dibebani review personal, What's New collapsible. | Merge Tahap 4 |

---
*Dokumen ini merupakan pedoman baku deployment D-WoW Platform. Tidak ada eksekusi git commit/push yang dilakukan sebelum ada instruksi harian dari pengguna.*
