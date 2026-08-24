# Task Breakdown — TaskFlow Pro

> Dibuat: 27 Juli 2026 | Diperbarui: 27 Juli 2026 | Berdasarkan: `prd.md` v2.1
>
> **Layer:** `frontend` = UI, komponen, halaman, interaksi | `backend` = API, database, service, auth
>
> **Prioritas:** 🔴 Kritis &nbsp; 🟡 Menengah &nbsp; 🟢 Rendah

---

## Fase 0: Perbaikan Skema (Pra-syarat sebelum Fase 1) 🔴

> ⚠️ **Fase ini harus diselesaikan SEBELUM Fase 1 dimulai.**
> Ini adalah perbaikan teknis atas inkonsistensi yang ditemukan saat audit — bukan fitur baru.

### Backend

#### 0.1 — Rename `tasks.assignee` → `tasks.pic_name` di Database
- **File:** `src/db/schema.ts`
- **Drizzle:** rename kolom `assignee` menjadi `pic_name` di tabel `tasks`
- **File:** `src/lib/types.ts`
  - Update interface `Task`: rename `assignee: string` → `picName: string`
  - Update semua referensi `task.assignee` di seluruh codebase
- **File:** `src/lib/mock-data.ts`
  - Update semua field `assignee` → `picName` di `MOCK_TASKS`
- **File:** API routes yang membaca `task.assignee`:
  - `src/app/api/tasks/[taskId]/route.ts`
  - `src/app/api/tasks/[taskId]/subtasks/route.ts`
  - `src/app/api/tasks/review/route.ts`
  - `src/app/api/tasks/[taskId]/reject/route.ts`
  - `src/app/api/reports/route.ts`
- **File:** Komponen frontend yang membaca `task.assignee`:
  - `src/components/kanban/sortable-task-card.tsx` — `isUserAssignee()`
  - `src/components/kanban/kanban-board.tsx` — assignee filter
  - `src/app/page.tsx` — filter workload + role
  - `src/app/project/[projectId]/task/[taskId]/page.tsx` — tampilan header
- Generate migrasi: `npx drizzle-kit generate` + `npx drizzle-kit migrate`
- **Acceptance:** Kolom `pic_name` ada di `tasks`, tidak ada lagi `assignee`. Semua referensi kode menggunakan `picName`. Tidak ada yang rusak.

#### 0.2 — Pastikan Avatar/Assignee Stack Task Query dari `subtask_assignees` (BUKAN `tasks.pic_name`)
- **File:** `src/components/kanban/task-card.tsx`
- Saat ini avatar stack ditampilkan dari `task.assignee` (satu nama) — **harus diubah** menjadi derived dari seluruh assignee unik di subtask-subtask milik task tersebut
- **Logika baru:**
  ```ts
  // BUKAN: task.assignee (sekarang picName)
  // TAPI: derived dari subtask assignees
  const taskAssignees = [...new Set(
    task.subtasks.flatMap(s => s.assignees)
  )];
  ```
- Tampilkan semua avatar dari `taskAssignees`, bukan cuma satu avatar dari `picName`
- **File:** `src/app/page.tsx` — update fungsi `filterTasksByRole`:
  - Staff filter: cari task di mana user adalah salah satu assignee di subtask mana pun (bukan `task.assignee === user`)
  - Lead filter: cari task di mana `task.lead === user` (ini tetap benar)
- **File:** `src/components/kanban/sortable-task-card.tsx` — update `isUserAssignee()`:
  - Cek apakah user ada di `task.subtasks.flatMap(s => s.assignees)` (bukan `task.assignee`)
  - Lead tetap bisa drag semua task-nya (cek `task.lead`)
- **File:** `src/components/kanban/kanban-board.tsx` — update filter assignee di `KanbanToolbar`:
  - Daftar assignee unik diambil dari `[...new Set(tasks.flatMap(t => t.subtasks.flatMap(s => s.assignees)))]`
- **Acceptance:** Di halaman `/project/[projectId]`, avatar stack pada setiap task card menampilkan SEMUA staff yang terlibat di subtask-nya (bukan cuma PIC). Filter assignee bekerja berdasarkan data subtask.

#### 0.3 — Standarisasi Satuan Kapasitas: Simpan `capacity_hours_per_month`, Konversi dari Input Mingguan
- **File:** `src/app/users/page.tsx`
  - Label input ganti dari "jam/minggu" → "jam/minggu (otomatis dikonversi ke bulanan)"
  - Saat menyimpan: `capacity_per_month = input_mingguan × 4`
  - Tampilkan di tabel: tampilkan keduanya — `X j/mg (Y j/bl)`
  - Data yang dikirim/disimpan: `capacityHoursPerMonth`
- **File:** `src/lib/types.ts` — tambah/pastikan field `capacityHoursPerMonth: number`
- **File:** `src/app/individual-metrics/page.tsx` — pastikan utilisasi dihitung terhadap `capacityHoursPerMonth` (per bulan), bukan mingguan
- **File:** `src/app/reports/page.tsx` — pastikan kalkulasi utilisasi pakai `capacityHoursPerMonth`
  - Untuk laporan kuartalan: `capacity × 3`
- **Acceptance:** Kapasitas disimpan sebagai `capacity_hours_per_month`. Input mingguan di UI dikonversi otomatis. Laporan bulanan/kuartalan menggunakan basis yang konsisten.

---

## Fase 1: Fondasi (Backend & Auth) 🔴

### Backend

#### 1.1 — Buat tabel `users` di database
- **File:** `src/db/schema.ts`
- Tambahkan Drizzle schema untuk tabel `users` dengan kolom:
  - `id` TEXT PK (UUID)
  - `nama` TEXT NOT NULL
  - `username` TEXT UNIQUE NOT NULL
  - `password_hash` TEXT NOT NULL
  - `role` TEXT NOT NULL — enum: `staff` / `lead` / `kadep` / `super_admin`
  - `department` TEXT — nullable
  - `capacity_hours_per_month` REAL NOT NULL DEFAULT 160 — **SATUAN RESMI: jam/bulan** (lihat Fase 0.3)
  - `created_at` TEXT NOT NULL (ISO 8601)
  - `updated_at` TEXT NOT NULL (ISO 8601)
- Generate migrasi: `npx drizzle-kit generate`
- Jalankan migrasi: `npx drizzle-kit migrate`
- **File:** `src/db/seed.ts` — tambahkan seed data:
  - 1 Super Admin: `admin` (capacity: 160)
  - 2 Lead: `thoriq` (capacity: 180), `nabila` (capacity: 180)
  - 8 Staff: ariana (160), budi (140), citra (160), dian (120), eko (100), fani (160), gina (140), hadi (80)
  - Password hash untuk semua: bcrypt hash dari default password (`staff123`/`lead123`/`admin123`)
- **Acceptance:** Tabel `users` ada di `taskforge.db` dengan 11 user. Bisa query via Drizzle Studio.

#### 1.2 — Buat tabel `projects` di database
- **File:** `src/db/schema.ts`
- Tambahkan Drizzle schema untuk tabel `projects` dengan kolom:
  - `id` TEXT PK (UUID)
  - `title` TEXT NOT NULL
  - `description` TEXT
  - `goals` TEXT
  - `dod` TEXT
  - `sprint` TEXT NOT NULL — label sprint (contoh: "Sprint 14")
  - `lead_id` TEXT FK → users.id
  - `sprint_cutoff` TEXT — ISO 8601 datetime cutoff (nullable)
  - `is_archived` INTEGER (boolean) DEFAULT 0 — untuk read-only setelah cut-off
  - `created_at` TEXT NOT NULL
  - `updated_at` TEXT NOT NULL
- Generate + jalankan migrasi
- Seed: Pooling (lead: thoriq, sprint: "Sprint 14"), Sentra (lead: nabila, sprint: "Sprint 14")
- **Acceptance:** Tabel `projects` ada dengan 2 data.

#### 1.3 — Migrasi tabel `tasks` ke database-driven + FK + `pic_name`
- **File:** `src/db/schema.ts`
- Update tabel `tasks` yang sudah ada:
  - Kolom `pic_name` sudah dari Fase 0.1 ✅ (hasil rename `assignee`)
  - Ubah `lead` (string) → `lead_id` TEXT FK → users.id
  - Ubah `project` (string) → `project_id` TEXT FK → projects.id
  - Tambah `total_actual_hours` REAL DEFAULT 0 — akumulasi dari subtask durations
- ⚠️ **JANGAN tambah `workload_hours` di level Task** — ini keputusan desain yang benar (mencegah double-counting; total workload = SUM subtask workload)
- ⚠️ **JANGAN tambah field assignee lagi** — assignee Task harus selalu derived dari `subtask_assignees` (lihat Fase 0.2)
- Generate + jalankan migrasi (backup data dulu)
- **Acceptance:** `tasks` pakai FK ke users & projects. Field `pic_name` tetap untuk PIC. Tidak ada field assignee/workload di task.

#### 1.4 — Migrasi tabel `subtasks` & relasi ke FK
- **File:** `src/db/schema.ts`
- Update `subtask_assignees`:
  - Ubah `staff_name` (string) → `staff_id` TEXT FK → users.id
  - Tambah `assigned_at` TEXT NOT NULL (ISO 8601)
- Update `activity_logs`:
  - Ubah `staff_name` → `user_id` TEXT FK → users.id
  - Tambah `duration_category` TEXT — `work` / `wait_review` (nullable, untuk Fase 5)
  - Tambah `duration_seconds` INTEGER (nullable, untuk Fase 5)
  - Tambah `task_id` TEXT FK → tasks.id (nullable) — untuk log level task
- Update `time_contributions`:
  - Ubah `staff_name` → `staff_id` TEXT FK → users.id
- Update `revision_notes`:
  - Ubah `lead_name` → `lead_id` TEXT FK → users.id
- Generate + jalankan migrasi
- **Acceptance:** Semua relasi pakai FK. Tidak ada hardcoded string nama di tabel-tabel tersebut.

#### 1.5 — Implementasi Authentication System
- **Library:** NextAuth.js v5 (Auth.js) `@auth/core` + `@auth/drizzle-adapter`
- **File baru:**
  - `src/lib/auth.ts` — konfigurasi auth (credential provider, callbacks)
  - `src/app/api/auth/[...nextauth]/route.ts` — route handler
  - `src/middleware.ts` — proteksi route berbasis role
- Implementasi:
  - Login dengan username + password (credential provider)
  - Session management dengan JWT — simpan `role`, `userId`, `username` di token
  - Password hashing dengan bcrypt (`bcryptjs`)
  - Callback: inject role ke session
- Matikan login stub di `src/app/login/page.tsx` — redirect ke NextAuth signIn
- **Acceptance:** User bisa login dengan kredensial dari database. Session bertahan. Logout berfungsi. Role tersedia di session.

#### 1.6 — Middleware Proteksi Route
- **File:** `src/middleware.ts`
- Rules:
  | Route | Akses |
  |-------|-------|
  | `/login` | Public (hanya jika belum login; redirect ke `/` jika sudah) |
  | `/` (Dashboard) | Semua role terautentikasi |
  | `/project/*` | Semua role terautentikasi |
  | `/users` | Hanya `super_admin` |
  | `/settings` | Semua terautentikasi (profil sendiri); `super_admin` untuk integrasi |
  | `/reports` | `lead`, `kadep`, `super_admin` |
  | `/sprint-history` | Semua role terautentikasi |
  | `/individual-metrics` | Semua role (data sendiri untuk staff, semua untuk lead+) |
  | `/activity-history` | Semua role terautentikasi |
  | `/api/tasks/*/reject` | Hanya `lead` yang bersangkutan |
  | `/api/tasks/*/validate-done` | Hanya `lead` |
  | `/api/users/*` | Hanya `super_admin` |
- Redirect unauthorized → `/login`
- Return 403 untuk forbidden
- **Acceptance:** Setiap route terlindungi sesuai role. Staff tidak bisa akses `/users`.

#### 1.7 — Service Layer: Task Repository (database-driven)
- **File baru:** `src/lib/task-repository.ts`
- Ganti akses langsung `MOCK_TASKS` di API routes dengan repository:
  - `getTasksByProject(projectId)` — query DB + join subtasks + join assignees
  - `getTaskById(taskId)` — query DB dengan join lengkap
  - `createTask(data)` — insert ke DB + auto-generate ticket ID
  - `updateTaskStatus(taskId, newStatus)` — update DB
  - `updateTaskLead(taskId, leadId)` — reassign lead
- **PENTING:** Saat return task, assignee stack harus dihitung dari `subtask_assignees` (Fase 0.2):
  ```ts
  const assignees = await db
    .selectDistinct({ staffId: subtaskAssignees.staffId })
    .from(subtaskAssignees)
    .innerJoin(subtasks, eq(subtasks.id, subtaskAssignees.subtaskId))
    .where(eq(subtasks.taskId, taskId));
  ```
- **Acceptance:** API routes membaca dari DB via repository. Assignee task selalu derived dari subtask_assignees.

#### 1.8 — Service Layer: Subtask Repository (database-driven)
- **File baru:** `src/lib/subtask-repository.ts`
- Fungsi:
  - `getSubtasksByTask(taskId)` — query DB dengan join assignees + activity logs
  - `getSubtaskById(subtaskId)` — query DB lengkap
  - `createSubtask(data)` — insert DB + otomatis assign ke staff
  - `updateSubtask(subtaskId, data)` — update DB
  - `updateSubtaskStatus(subtaskId, newStatus, userId)` — update + trigger log aktivitas
  - `addAssignee(subtaskId, userId)` — insert ke subtask_assignees
  - `removeAssignee(subtaskId, userId)` — delete dari subtask_assignees
  - `getSubtaskTotalHours(taskId)` — `SUM(workload_hours)` untuk validasi
- Panggil `logSubtaskActivity()` otomatis setiap perubahan status
- **Acceptance:** API routes subtask membaca/menulis DB via repository.

#### 1.9 — Ticket ID Auto-Generator
- **File baru:** `src/lib/ticket-generator.ts`
- Logika:
  - Format: `[ProjectName]-[Counter4Digit]-[PIC_Username]-[Lead_Username]`
  - Counter per project, di-reset per sprint (opsional)
  - PIC = **`pic_name` dari task** (diisi saat create task)
  - Lead = username lead dari `lead_id` FK
  - Generate saat `createTask()` dipanggil
- **Acceptance:** Setiap task baru dapat ticket ID unik otomatis. Format sesuai.

#### 1.10 — Seed Database dengan Data Awal
- **File baru:** `src/db/seed.ts`
- Insert data awal:
  - **11 Users** (1 admin, 2 lead, 8 staff) — dengan password hash + capacity_hours_per_month
  - **2 Projects** (Pooling → thoriq, Sentra → nabila)
  - **8 Tasks** (4 per project) — dengan pic_name, lead FK, project FK
  - **31 Subtasks** dengan assignee FK via `subtask_assignees`
  - Sample `activity_logs` per subtask
  - Sample `time_contributions`
- Script: `npx tsx src/db/seed.ts`
- **Acceptance:** Database terisi data awal lengkap. Aplikasi jalan tanpa `MOCK_TASKS`.

---

### Frontend

#### 1.11 — Halaman Login (Real)
- **File:** `src/app/login/page.tsx` (refactor total)
- Integrasi dengan NextAuth.js signIn:
  ```ts
  import { signIn } from "next-auth/react";
  ```
- UI tetap dipertahankan (desain Figma-inspired yang sudah ada)
- Handle error: "Username atau password salah" dari auth response
- Redirect ke `/` setelah login sukses
- Loading spinner saat submit
- Jika user sudah login, redirect ke `/`
- **Acceptance:** User bisa login dengan kredensial dari database. Error handling berfungsi.

#### 1.12 — Auth Context / Session Provider
- **File baru:** `src/components/providers/auth-provider.tsx`
- Wrap root layout (`src/app/layout.tsx`) dengan `<SessionProvider>`
- Custom hook `useCurrentUser()` — return:
  ```ts
  { userId: string, username: string, name: string, role: "staff" | "lead" | "kadep" | "super_admin" }
  ```
- Ganti semua simulasi user selector dengan data session nyata
- **File:** `src/app/layout.tsx` — tambah `<SessionProvider>` di root
- **Acceptance:** Semua halaman dan komponen bisa akses `useCurrentUser()`.

#### 1.13 — Hapus User Selector Bar, Gunakan Session
- **File:** `src/app/project/[projectId]/page.tsx`
- **File:** `src/app/project/[projectId]/task/[taskId]/page.tsx`
- Hapus `<div className="bg-surface-soft/40 border-b...">` user selector bar
- Gunakan `useCurrentUser()` untuk:
  - Menentukan role
  - Membatasi drag-and-drop (Fase 0.2 logic — cek assignee dari subtask)
  - Menentukan tampilan tombol aksi
- **Acceptance:** Tidak ada lagi user selector bar. Drag-and-drop otomatis dibatasi sesuai session.

#### 1.14 — Update RoleFilter di Dashboard ke Session + Derived Assignee
- **File:** `src/components/dashboard/role-filter.tsx`
- Gunakan `useCurrentUser().role` sebagai default, bukan "all"
- Filter task berdasarkan role dari session:
  - **Staff:** task di mana user adalah salah satu assignee di subtask mana pun (query `subtask_assignees`, bukan `pic_name`)
  - **Lead:** task di mana `lead_id === user.id`
  - **Kadep:** semua task di departemen user (by department field)
  - **Super Admin:** semua task
- **Acceptance:** Dashboard otomatis terfilter sesuai role user login. Filter berdasarkan data asli.

#### 1.15 — Halaman Users (Real) — Super Admin Only
- **File:** `src/app/users/page.tsx` (refactor total)
- Proteksi: hanya `super_admin` (middleware + UI check)
- Fitur:
  - **Tabel user dari database** — fetch dari `GET /api/users`
  - **Form tambah user:** nama, username, password, role (dropdown), department, kapasitas mingguan (otomatis ×4 → `capacity_hours_per_month`)
  - **Tombol edit:** nama, role, department, kapasitas — semua inline edit
  - **Tombol delete:** soft delete (nonaktifkan) — tidak bisa delete diri sendiri
  - Tampilkan kapasitas dalam dua satuan: `X j/mg (Y j/bl)`
- Validasi: username unik, kapasitas input > 0
- Toast feedback setelah CRUD
- **Acceptance:** Super Admin bisa CRUD user dari UI. Kapasitas otomatis dikonversi ke bulanan.

#### 1.16 — API: CRUD Users
- **File baru:** `src/app/api/users/route.ts`
  - `GET` — list semua users (super_admin only)
  - `POST` — buat user baru (super_admin only)
- **File baru:** `src/app/api/users/[userId]/route.ts`
  - `GET` — detail user
  - `PATCH` — update user (nama, role, department, capacity_hours_per_month)
  - `DELETE` — soft delete user
- Validasi: super_admin only, tidak bisa delete diri sendiri
- Hash password saat create/update
- **Acceptance:** CRUD user via API dengan proteksi role.

#### 1.17 — Halaman Settings (Real)
- **File:** `src/app/settings/page.tsx` (refactor)
- Fetch data user dari session + API
- Tab/section:
  - **Profil:** Edit nama, ganti password (form ganti password dengan konfirmasi)
  - **Notifikasi:** Checkbox preferensi (simpan ke localStorage atau DB)
  - **Integrasi Spreadsheet:** Input spreadsheet ID, tombol "Uji Koneksi" (untuk Fase 4)
- **Acceptance:** Setting profil tersimpan. Password bisa diganti.

---

## Fase 2: Workflow Task Review 🟡

### Backend

#### 2.1 — API: Approve Subtask (Lead)
- **File baru:** `src/app/api/subtasks/[subtaskId]/approve/route.ts`
- `POST` — Lead menyetujui subtask:
  - Validasi: hanya Lead task yang bisa approve (cek dari session)
  - Validasi: subtask harus dalam status `review`
  - Update `subtask.status` → `done`, `subtask.done` → true
  - Catat `activity_log` dengan action `approved`, user_id dari session, durasi wait_review
  - Hitung durasi: selisih timestamp `review_requested` → `approved`
- **Acceptance:** Lead bisa approve subtask via API. Validasi role ketat.

#### 2.2 — API: Revisi Subtask (Lead)
- **File baru:** `src/app/api/subtasks/[subtaskId]/revise/route.ts`
- `POST` — Lead meminta revisi subtask:
  - Validasi: hanya Lead task yang bisa revisi
  - Validasi: subtask harus dalam status `review`
  - Validasi: `note` wajib diisi (catatan revisi)
  - Update `subtask.status` → `in_progress`
  - Simpan `revision_note` ke DB (dengan `lead_id` FK, bukan lead_name)
  - Catat `activity_log` dengan action `revision_requested`
- **Acceptance:** Lead bisa minta revisi subtask. Catatan revisi wajib. Tersimpan di DB.

#### 2.3 — API: Batasi Task → Done hanya untuk Lead
- **File:** `src/app/api/tasks/[taskId]/validate-done/route.ts` (update)
- `POST` handler:
  - Ambil `userId` + `role` dari session
  - Cari task, bandingkan `task.lead_id` dengan `userId`
  - Jika bukan lead task → return 403: "Hanya Lead yang dapat menyelesaikan task"
  - Jalankan `completeTaskIfValid()` hanya jika role cocok
- **Acceptance:** Staff tidak bisa POST validate-done. Lead bisa.

#### 2.4 — Integrasi Timer Auto-Start/Stop dengan Perubahan Status Subtask
- **File:** `src/lib/subtask-repository.ts` — dalam `updateSubtaskStatus()`
- Auto-start timer saat:
  - Status berubah ke `in_progress` (dari `to_do`)
  - Panggil `startSubtaskTimer(subtaskId, userId)`
- Auto-stop timer saat:
  - Status berubah ke `review` (dari `in_progress`) — catat durasi `work` + panggil `stopSubtaskTimer(subtaskId, userId, "review_requested")`
  - Status berubah ke `done` (dari `review`) — catat durasi `wait_review` + panggil `stopSubtaskTimer(subtaskId, userId, "approved")`
  - Status berubah ke `in_progress` (dari `review`, saat revisi) — reset timer, catat durasi `wait_review`
- Update `activity_log` entry dengan durasi yang dihitung
- Update `time_contributions` table
- **Acceptance:** Timer otomatis tanpa perlu API call manual. Durasi tercatat di log.

#### 2.5 — Tambah `duration_category` di Activity Log
- **File:** `src/db/schema.ts` (kolom sudah ditambah di Fase 1.4)
- **File:** `src/lib/activity-service.ts` — update `logSubtaskActivity()`
  - Parameter baru: `durationCategory?: "work" | "wait_review"`
  - Simpan ke kolom `duration_category` di DB
- Set kategori:
  - `created`, `started`, `paused`, `resumed`: `null` (tidak relevan)
  - `completed`, `review_requested`: `"work"`
  - `approved`, `revision_requested`: `"wait_review"`
- **Acceptance:** Setiap log tercatat dengan kategori durasi yang benar.

---

### Frontend

#### 2.6 — Tombol Setujui & Revisi di Kartu Subtask Review (Lead)
- **File:** `src/components/subtask/subtask-kanban.tsx`
- Di array `SUBTASK_ACTIONS`, tambah aksi untuk status `review`:
  ```ts
  review: [
    { to: "done", label: "Setujui", icon: "check", variant: "green" },
    { to: "in_progress", label: "Revisi", icon: "refresh", variant: "red" },
  ]
  ```
- Tombol hanya muncul jika `useCurrentUser().role === "lead"` DAN user adalah lead task tersebut
- Untuk staff: tombol tidak muncul (array kosong)
- Panggil API yang sesuai: approve → `POST /api/subtasks/[id]/approve`, revise → `POST /api/subtasks/[id]/revise`
- Loading state per tombol (pending)
- **Acceptance:** Lead melihat tombol Setujui (hijau) & Revisi (merah) di kartu review. Staff tidak melihat apa pun.

#### 2.7 — Dialog Konfirmasi Revisi Subtask
- **File:** `src/components/shared/confirm-dialog.tsx` (update atau buat baru `revise-dialog.tsx`)
- Dialog khusus revisi:
  - Judul: "Revisi Subtask"
  - Textarea untuk catatan revisi — placeholder: "Tulis catatan revisi..."
  - Validasi: catatan wajib diisi (min 10 karakter)
  - Tombol "Kirim Revisi" (merah) / "Batal"
  - Error state: "Catatan revisi wajib diisi"
- **Acceptance:** Lead tidak bisa submit revisi tanpa catatan. UI memberikan feedback yang jelas.

#### 2.8 — Batasi Kolom "Done" di Task Kanban untuk Non-Lead
- **File:** `src/components/kanban/kanban-board.tsx`
- Di `handleDragEnd` + `handleStatusChangeRequest`:
  - Cek: jika `targetColumn === "done"` DAN `useCurrentUser().role !== "lead"` (atau bukan lead task tersebut)
  - Tampilkan toast: "⛔ Hanya Lead yang dapat menyelesaikan task"
  - Jangan tampilkan confirm dialog
- Di `Droppable` area kolom "Done": tambah indikator visual bahwa kolom tidak bisa di-drop (cursor not-allowed, warna pudar) untuk non-Lead
- **Acceptance:** Staff tidak bisa drag task ke Done dari UI. Lead bisa setelah validasi subtask.

#### 2.9 — Notifikasi Real-Time: Subtask Direview
- **File baru:** `src/components/shared/review-notification.tsx`
- Polling sederhana: `setInterval` fetch status review setiap 30 detik
- Atau gunakan `useEffect` + fetch di Dashboard
- Tampilkan toast/badge saat:
  - Subtask staff di-approve: "✅ Subtask '[title]' disetujui oleh [lead]"
  - Subtask staff direvisi: "🔄 Subtask '[title]' perlu revisi: [note]"
- Hanya tampil untuk staff yang bersangkutan
- **Acceptance:** Staff mendapat notifikasi saat subtask-nya direview oleh Lead.

---

## Fase 3: Laporan & Ekspor 🟡/🟢

### Backend

#### 3.1 — API: Laporan Periodik (Real Data dari DB)
- **File:** `src/app/api/reports/route.ts` (refactor total)
- Query dari database (bukan mock):
  ```
  GET ?period=bulanan&role=lead&userId=xxx
  GET ?period=kuartalan&role=super_admin
  ```
- **Metrik yang dihitung per staff:**
  - **Kapasitas Standar:** `users.capacity_hours_per_month` (×3 untuk kuartalan)
  - **Beban Kerja:** `SUM(subtasks.workload_hours)` — untuk multi-assignee: `workload_hours / COUNT(assignees)`
  - **Utilisasi:** `(beban / kapasitas) × 100%` — flag "Overload" jika > 100%
  - **Akurasi Estimasi:** `AVG(workload_hours - actual_hours)` per staff — dari `time_contributions`
  - **Durasi Aktif vs Tunggu Review:** dari `activity_logs` dengan `duration_category` filter
  - **Volume Kerja:** `COUNT(task_id)` involvement + `COUNT(subtask_id WHERE status='done')`
- **Filter role:**
  - Staff: hanya data diri sendiri
  - Lead: data staff di bawah supervisinya (by `tasks.lead_id`)
  - Kadep: semua staff di departemennya
  - Super Admin: semua
- **Acceptance:** API laporan mengembalikan data nyata dari database, bukan mock.

#### 3.2 — API: Ekspor PDF
- **File baru:** `src/app/api/reports/export/pdf/route.ts`
- Library: `jspdf` + `jspdf-autotable`
- `POST` — body: `{ period, role, userId?, staffIds?: string[] }`
- Generate PDF A4:
  - Halaman 1: Cover — "TaskFlow Pro — Laporan Kinerja [Bulanan/Kuartalan]", periode, role viewer, tanggal generate
  - Halaman 2+: Tabel metrik individu (nama, kapasitas, beban, utilisasi%, akurasi%, task selesai, total jam)
  - Baris highlight merah untuk staff overload (utilisasi > 100%)
  - Footer: "Generated by TaskFlow Pro — [tanggal]"
- Return PDF sebagai blob download dengan header `Content-Type: application/pdf`
- **Acceptance:** Download PDF berhasil. Data sesuai dengan yang di layar. Layout rapi.

#### 3.3 — API: Ekspor Excel (XLSX)
- **File baru:** `src/app/api/reports/export/excel/route.ts`
- Library: `exceljs`
- `POST` — body: `{ period, role, userId?, staffIds?: string[] }`
- Generate workbook dengan 3 sheet:
  - **Sheet "Ringkasan":** 4-6 baris agregat (total task, selesai, completion rate, total jam, utilisasi rata-rata)
  - **Sheet "Per Individu":** Tabel: Nama, Kapasitas (jam/bl), Beban, Utilisasi%, Akurasi%, Task Selesai, Total Jam Aktual, Rata² Hari
  - **Sheet "Per Task":** Tabel: Ticket ID, Task, Status, Subtask Selesai/Total, Workload, Actual Hours, Lead
- Styling: header bold + background abu, border, lebar kolom auto-fit, angka rata kanan
- Conditional formatting: sel merah untuk utilisasi > 100%
- Return XLSX sebagai blob download
- **Acceptance:** Download Excel berhasil. Multi-sheet. Data sesuai.

#### 3.4 — API: Data Sprint History (Real)
- **File baru:** `src/app/api/sprints/route.ts`
- `GET /api/sprints` — list sprint (dari `projects.sprint` unik, diurutkan)
  - Kembalikan: sprint id, nama, periode, total task, done task, total hours, actual hours, capacity, status (active/archived)
- `GET /api/sprints/[sprintId]` — detail per sprint:
  - Daftar project, task, subtask, penugasan
  - Metrik: velocity, completion rate, beban vs kapasitas
- **Acceptance:** Sprint history dari database, bukan mock.

---

### Frontend

#### 3.5 — Halaman Reports: Koneksi ke API Real
- **File:** `src/app/reports/page.tsx` (refactor)
- Ganti `STAFF_METRICS` mock dengan `fetch('/api/reports?period=...&role=...')`
- Gunakan `useCurrentUser()` untuk default role & userId
- Tambah loading skeleton (`TableSkeleton`) + error state
- Tetap pertahankan UI: period selector, role viewer, tabel metrik
- **Acceptance:** Data laporan berasal dari database real. Interaktif (ganti periode).

#### 3.6 — Halaman Individual Metrics: Koneksi ke API Real
- **File:** `src/app/individual-metrics/page.tsx` (refactor)
- Ganti `INDIVIDUAL_METRICS` mock dengan `fetch('/api/reports?period=bulanan&role=staff&userId=...')`
- Gunakan `useCurrentUser()` untuk userId
- Jika role = lead/kadep/admin: tampilkan toggle untuk pilih staff yang dilihat
- **Acceptance:** Metrik individu real-time dari database. Kapasitas dalam satuan bulanan.

#### 3.7 — Tombol Ekspor PDF (Fungsional)
- **File:** `src/components/shared/export-buttons.tsx` (refactor)
- Props: `{ period, role, staffIds?, metrics }` dari halaman laporan
- Klik "Ekspor PDF":
  - `POST /api/reports/export/pdf` dengan body parameter
  - Terima blob, trigger download: `saveAs(blob, 'laporan-taskflow-[periode].pdf')`
  - Loading spinner + disable tombol saat generating
  - Error handling: toast jika gagal
- **Acceptance:** Klik ekspor PDF → file terdownload. Nama file sesuai periode.

#### 3.8 — Tombol Ekspor Excel (Fungsional)
- **File:** `src/components/shared/export-buttons.tsx` (refactor)
- Sama seperti 3.7, untuk XLSX endpoint
- **Acceptance:** Klik ekspor Excel → file .xlsx terdownload.

#### 3.9 — Halaman Sprint History: Koneksi ke API Real
- **File:** `src/app/sprint-history/page.tsx` (refactor)
- Ganti `SPRINT_HISTORY` mock dengan `fetch('/api/sprints')`
- Tetap pertahankan mode Tren & Detail
- Loading + error state
- **Acceptance:** Data sprint dari database. Mode tren tetap berfungsi.

#### 3.10 — Halaman Sprint Report: Koneksi ke API Real
- **File:** `src/app/sprint-report/page.tsx` (refactor)
- Ganti `MOCK_SPRINTS` dengan `fetch('/api/sprints/[id]')`
- Sprint selector tetap ada, tapi data dari API
- **Acceptance:** Laporan sprint dari database. Pilih sprint untuk lihat detail.

#### 3.11 — Halaman Activity History: Koneksi ke API + Filter Durasi
- **File:** `src/app/activity-history/page.tsx` (refactor)
- Fetch dari `GET /api/activity/staff?name=...` atau endpoint baru
- Filter tambahan:
  - **Date range picker:** dari-tanggal sampai-tanggal
  - **Kategori durasi:** pill toggle "Semua | Work | Wait Review" (menggunakan `duration_category`)
- Tampilkan ikon berbeda: 🔨 untuk work, ⏳ untuk wait_review
- **Acceptance:** Audit trail lengkap dengan filter durasi. Data dari DB.

---

## Fase 4: Integrasi Spreadsheet 🟢

### Backend

#### 4.1 — Apps Script: Sinkronisasi Tarik (Pull)
- **File baru:** Google Apps Script (dideploy di Google Sheets)
- Baca sheet: "Projects", "Tasks", "Subtasks"
- Kirim data via HTTP POST ke endpoint aplikasi:
  ```
  POST https://[app-url]/api/sync/pull
  Headers: Authorization: Bearer [SYNC_SECRET]
  ```
- Data:
  - **Projects:** title, sprint, lead_username
  - **Tasks:** project_title, title, description, pic_name (dari kolom staff pertama), priority, deadline, workload_hours (opsional — hanya untuk referensi, tidak disimpan di task)
  - **Subtasks:** task_title (untuk matching), title, assignees (array username), workload_hours
- Trigger: onEdit / onFormSubmit / manual dari menu
- **Acceptance:** Data dari Sheets masuk ke database aplikasi via API.

#### 4.2 — API: Endpoint Sinkronisasi Pull
- **File baru:** `src/app/api/sync/pull/route.ts`
- `POST` — terima data dari Apps Script
- Validasi: `Authorization` header dengan `SYNC_SECRET` dari env
- Logic:
  - **Projects:** upsert by title
  - **Tasks:** upsert by ticket_id (generate kalau baru), match project by title, match lead by username
  - **Subtasks:** upsert by title+task_id, match/create assignee di `subtask_assignees`
  - Jangan duplikasi: cek existing data sebelum insert
- Response:
  ```json
  { "projects": { "created": 0, "updated": 2 },
    "tasks": { "created": 1, "updated": 7 },
    "subtasks": { "created": 5, "updated": 26 },
    "assignees": { "added": 3, "removed": 1 }
  }
  ```
- **Acceptance:** Data Sheets terserap ke database. Tidak ada duplikasi. Response informatif.

#### 4.3 — Apps Script: Sinkronisasi Dorong (Push)
- **File:** Google Apps Script (update)
- Endpoint aplikasi kirim data balik ke Sheets via Apps Script Web App:
  ```
  POST https://script.google.com/macros/s/[deployment-id]/exec
  Body: { action: "updateStatus", tasks: [...], subtasks: [...] }
  ```
- Update kolom status, actual hours, last_updated di sheet
- Trigger: setelah sprint cut-off, atau manual dari Settings page
- **Acceptance:** Sheets terupdate dengan status + jam aktual dari aplikasi.

#### 4.4 — API: Endpoint Sinkronisasi Push (Trigger)
- **File baru:** `src/app/api/sync/push/route.ts`
- `POST` — trigger push ke Apps Script
- Baca data terbaru dari database: task status, subtask status, actual hours, time contributions
- Kirim ke Apps Script Web App URL (dari settings)
- Response: status pengiriman, berapa row yang diupdate
- **Acceptance:** Aplikasi bisa push data balik ke Sheets.

#### 4.5 — Mekanisme Sprint Cut-off Otomatis
- **File baru:** `src/lib/sprint-service.ts`
- Fungsi `cutoffSprint(projectId)`:
  - Set `projects.is_archived = 1` untuk project
  - Set `projects.sprint_cutoff = now()` 
  - Buat sprint baru: increment sprint number, reset cutoff
  - Trigger push ke Sheets (opsional)
- Bisa dipanggil manual dari Settings atau via cron
- Untuk cron: gunakan Vercel Cron Jobs atau `node-cron` jika self-hosted
- **Acceptance:** Sprint bisa di-cutoff. Data lama tetap read-only.

#### 4.6 — API: Konfigurasi Spreadsheet
- **File baru:** `src/app/api/settings/spreadsheet/route.ts`
- `GET` — ambil konfigurasi (spreadsheet_id, apps_script_url, sheet_mappings, last_sync_at) — simpan di DB atau env
- `PUT` — update konfigurasi (super_admin only)
- `POST /test` — uji koneksi: ping Apps Script URL, return status + latency
- **Acceptance:** Konfigurasi spreadsheet tersimpan & bisa diuji koneksinya.

---

### Frontend

#### 4.7 — Halaman Settings: Integrasi Spreadsheet (Real)
- **File:** `src/app/settings/page.tsx` (update section spreadsheet)
- Form:
  - **Spreadsheet ID** — text input
  - **Apps Script URL** — text input (URL Web App deployment)
  - **Sheet Mapping** — dropdown/input: nama sheet untuk Projects, Tasks, Subtasks
- Tombol:
  - **"Uji Koneksi"** → `POST /api/settings/spreadsheet/test` → tampilkan "● Tersambung (120ms)" atau "● Gagal: timeout"
  - **"Sinkronisasi Manual"** → `POST /api/sync/pull` → tampilkan summary (project: 2 updated, task: 8 updated, ...)
- Indikator: "Terakhir sinkron: 27 Jul 2026, 14:30"
- **Acceptance:** Konfigurasi spreadsheet berfungsi dari UI. Bisa uji koneksi + sync manual.

#### 4.8 — Indikator Sinkronisasi di Dashboard
- **File:** `src/app/page.tsx` (tambah di header/hero)
- Badge kecil di samping judul atau di top nav:
  ```
  ● Tersinkron — 2 jam lalu
  ```
- Warna: hijau (< 1 jam), kuning (1-24 jam), merah (> 24 jam), abu (belum pernah)
- Data dari `GET /api/settings/spreadsheet` → `last_sync_at`
- **Acceptance:** User tahu kapan terakhir sync dari dashboard.

---

## Fase 5: Polish 🟢

### Backend

#### 5.1 — Tambah Zod Validation di API Routes
- **File:** semua API routes (refactor bertahap)
- Install: `npm install zod`
- Buat schema di file terpisah: `src/lib/validations.ts`
  - `taskSchema`, `subtaskSchema`, `activityLogSchema`, `userSchema`, `reportQuerySchema`
- Integrasi dengan `withErrorHandler`: parse body dengan `.safeParse()`, return 400 ZodError jika gagal
- **Acceptance:** Semua input tervalidasi dengan Zod. Error message informatif.

#### 5.2 — Error Handling & Logging Terpusat
- **File baru:** `src/lib/logger.ts`
- Wrapper: `logger.info()`, `logger.warn()`, `logger.error()`
- Di dev: log ke console dengan warna
- Di production: log ke file atau service eksternal (Sentry, etc.)
- Tangkap unhandled errors di `withErrorHandler` → log + return 500
- **Acceptance:** Semua error tercatat. Tidak ada crash yang tidak terlacak.

#### 5.3 — Rate Limiting API
- **File:** `src/middleware.ts` (update)
- Library: `@upstash/ratelimit` atau implementasi sederhana dengan Map
- Batasi: 100 request/menit per IP untuk `/api/*`
- Kecuali: `/api/auth/*`, static assets
- Return 429 "Too Many Requests" dengan header `Retry-After`
- **Acceptance:** API terlindungi dari abuse.

#### 5.4 — API: Bulk Operations
- **File baru:** `src/app/api/tasks/bulk/route.ts`
  - `PATCH` — update status banyak task: `{ taskIds: string[], status: TaskStatus }`
- **File baru:** `src/app/api/subtasks/bulk/route.ts`
  - `PATCH` — update status banyak subtask: `{ subtaskIds: string[], status: SubtaskStatus }`
- Validasi: role-based untuk setiap item
- **Acceptance:** Operasi bulk berfungsi. Berguna untuk Lead yang ingin approve banyak subtask.

---

### Frontend

#### 5.5 — Loading Skeletons
- **File baru:** `src/components/shared/skeletons.tsx`
- Komponen skeleton:
  - `DashboardSkeleton` — placeholder stat cards (4 kotak abu) + chart area + project cards
  - `KanbanSkeleton` — 3 kolom dengan 3-4 kartu placeholder masing-masing
  - `TableSkeleton` — 5 baris placeholder dengan kolom lebar bervariasi
  - `CardSkeleton` — 1 kartu placeholder
- Gunakan di semua halaman saat `loading === true`
- Animasi pulse/shine
- **Acceptance:** UI tidak "lompat" saat loading. Skeleton tampil dulu, lalu data.

#### 5.6 — Empty State untuk Semua Halaman
- **File baru:** `src/components/shared/empty-state.tsx`
- Props: `icon`, `title`, `description`, `action?` (label + onClick)
- Gunakan di:
  - Dashboard: "Belum ada proyek" → action "Sync dari Spreadsheet"
  - Kanban: "Tidak ada task di kolom ini" (sudah ada "Kosong" — ganti dengan empty state)
  - Reports: "Belum ada data untuk periode ini"
  - Sprint History: "Belum ada sprint tersimpan"
  - Users: "Belum ada user" (tidak mungkin, tapi untuk jaga-jaga)
- **Acceptance:** Empty state informatif dengan ilustrasi/ikon, bukan halaman kosong.

#### 5.7 — Toast Notification System Terpusat
- **File baru:** `src/components/shared/toast.tsx` + `src/lib/use-toast.ts`
- Gunakan React Context: `<ToastProvider>` di root layout
- Hook: `const { toast } = useToast()`
- API: `toast.success("Pesan")`, `toast.error("Pesan")`, `toast.warning("Pesan")`, `toast.info("Pesan")`
- UI: container fixed di bottom-right, stack vertikal, animasi slide-in
- Auto-dismiss: success 3s, info 4s, warning 5s, error 6s (bisa manual dismiss)
- Ganti semua `setToastMessage` lokal di komponen dengan `useToast()`
- **Acceptance:** Semua toast terpusat. Konsisten di seluruh aplikasi. Bisa stacked.

#### 5.8 — Error Boundary
- **File baru:** `src/components/shared/error-boundary.tsx`
- Gunakan React `componentDidCatch` atau `useErrorBoundary`
- Tangkap error rendering di level:
  - Root layout (top-level)
  - Per halaman (Dashboard, Project, Task Detail)
- Tampilkan:
  - Ikon error
  - "Terjadi kesalahan saat memuat halaman ini"
  - Error message (hanya di dev)
  - Tombol "Coba Lagi" (reload halaman)
  - Tombol "Kembali ke Dashboard"
- **Acceptance:** Aplikasi tidak white-screen saat error. User bisa recovery.

#### 5.9 — Responsive Design Audit & Fix
- **File:** semua halaman (review + fix)
- Cek dan fix untuk 3 breakpoint:
  - **Mobile (< 768px):** Kanban scroll horizontal, chart stack vertikal, tabel wrap, top nav collapse
  - **Tablet (768-1024px):** Kanban 2 kolom fit, chart grid 2-kolom
  - **Desktop (> 1024px):** Full layout (existing)
- Fix spesifik:
  - Kanban board: `overflow-x-auto` dengan snap scroll
  - Stat cards: `grid-cols-2` mobile, `grid-cols-4` desktop
  - Top nav: hamburger menu atau scroll horizontal di mobile
  - Task detail: subtask kanban horizontal scroll
- **Acceptance:** Aplikasi usable di iPhone SE (375px) hingga iMac 5K.

#### 5.10 — Animasi & Transisi
- **File:** `tailwind.config.ts` (update)
- Animasi CSS/ Tailwind:
  - `animate-slide-up` — toast masuk dari bawah
  - `animate-fade-in` — modal/Skeleton muncul
  - `animate-scale-in` — dialog konfirmasi
  - Drag overlay: `scale-105 shadow-2xl` + transisi
  - Progress bar: transisi lebar (`transition-all duration-500`)
- **Acceptance:** Animasi halus, tidak mengganggu. Konsisten di seluruh app.

#### 5.11 — Keyboard Navigation & Accessibility
- **File:** Semua komponen interaktif (review)
- Tambah:
  - `aria-label` untuk tombol ikon
  - `role` attributes (button, dialog, etc.)
  - Focus trapping di modal/dialog
  - Keyboard: Enter/Escape di dialog, arrow keys di Kanban (optional)
  - Skip link "Langsung ke konten" di layout
- **Acceptance:** Aplikasi bisa dinavigasi dengan keyboard. Screen reader-friendly.

#### 5.12 — Global State Management (Zustand) — Optional
- **File baru:** `src/lib/stores/` (folder)
- Store:
  - `useTaskStore` — cache task per project, invalidate on status change
  - `useUIStore` — sidebar state, toast queue, theme
- Ganti `useState` lokal yang di-passing via props berlapis
- **Acceptance:** State terpusat. Mengurangi prop drilling.

---

## Ringkasan Per Fase

| Fase | Total | Frontend | Backend | Prioritas |
|------|:-----:|:--------:|:-------:|-----------|
| **0. Perbaikan Skema** | 3 | (1)* | 3 | 🔴 Kritis — PRASYARAT |
| **1. Fondasi** | 17 | 6 | 11 | 🔴 Kritis |
| **2. Workflow Review** | 9 | 4 | 5 | 🟡 Menengah |
| **3. Laporan & Ekspor** | 11 | 7 | 4 | 🟡/🟢 |
| **4. Spreadsheet** | 8 | 2 | 6 | 🟢 Rendah |
| **5. Polish** | 12 | 8 | 4 | 🟢 Rendah |
| **TOTAL** | **60** | **27** | **33** | |

> \* Fase 0.2 mencakup perubahan frontend signifikan (avatar stack derived dari subtask_assignees)

---

## Urutan Pengerjaan yang Direkomendasikan

```
FASE 0 — WAJIB PERTAMA (ini prasyarat, semua fase lain bergantung):
  Backend: 0.1 (rename assignee→pic_name) → 0.3 (standarisasi kapasitas)
  Frontend: 0.2 (assignee stack derived dari subtask_assignees) — paralel dengan backend

FASE 1 — Fondasi:
  Backend dulu: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6
  Lalu campur: 1.7 → 1.8 → 1.9 (backend) || 1.11 → 1.12 → 1.13 (frontend)
  Lanjut backend: 1.10 (seed)
  Lalu frontend: 1.14 → 1.15 → 1.16 → 1.17

FASE 2 — Review:
  Backend: 2.3 → 2.1 → 2.2 → 2.4 → 2.5
  Frontend: 2.8 → 2.6 → 2.7 → 2.9

FASE 3 — Laporan:
  Backend: 3.1 → 3.4 → 3.2 → 3.3
  Frontend: 3.5 → 3.6 → 3.9 → 3.10 → 3.11 → 3.7 → 3.8

FASE 4 — Spreadsheet:
  Backend: 4.6 → 4.1 → 4.2 → 4.4 → 4.3 → 4.5
  Frontend: 4.7 → 4.8

FASE 5 — Polish (bebas, low priority):
  5.1 → 5.2 → 5.7 → 5.5 → 5.6 → 5.8 → 5.9 → 5.10 → 5.11 → 5.3 → 5.4 → 5.12
```
