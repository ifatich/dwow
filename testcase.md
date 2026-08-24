# Test Case — TaskFlow Pro (Fokus Key Feature 1–8)

> Dibuat: 27 Juli 2026 | Cakupan: 8 Key Feature utama TaskFlow Pro
>
> Data test case ini juga tersimpan pada database `TaskFlow-Pro-Test-Cases.db` (tabel `test_cases`) untuk kebutuhan pelacakan status pengujian oleh tim QA.

## Ringkasan

| # | Fitur | Jumlah Test Case | Kritis | Menengah | Rendah |
|---|---|---:|---:|---:|---:|
| 1 | Hierarki Kerja 3 Tingkat (Project → Task → Subtask) | 6 | 5 | 1 | 0 |
| 2 | Multi-Assignee Subtask | 6 | 4 | 2 | 0 |
| 3 | Workflow Approval Berjenjang | 6 | 5 | 1 | 0 |
| 4 | Pelacakan Waktu Otomatis | 6 | 3 | 2 | 1 |
| 5 | Sistem Tiket Unik dengan PIC | 5 | 2 | 2 | 1 |
| 6 | Dashboard Eksekutif (Level 0) | 6 | 2 | 3 | 1 |
| 7 | Reporting & Analitik Kinerja | 8 | 4 | 4 | 0 |
| 8 | Riwayat Sprint (Arsip Read-Only) | 5 | 1 | 4 | 0 |
| | **TOTAL** | **48** | **26** | **19** | **3** |

## Fitur 1: Hierarki Kerja 3 Tingkat (Project → Task → Subtask)

| ID | Judul Test Case | Precondition | Langkah Pengujian | Data Uji | Expected Result | Prioritas |
|---|---|---|---|---|---|---|
| TC-F1-01 | Project ditampilkan sebagai card di Dashboard | Ada minimal 1 project tersimpan (mis. 'Pooling') | 1. Buka Dashboard (/)<br>2. Amati bagian daftar project | Project: Pooling | Project 'Pooling' tampil sebagai card berisi nama, progress bar, dan label sprint aktif. | Kritis |
| TC-F1-02 | Klik Project card membawa ke Kanban Task (Level 1) | Berada di Dashboard | 1. Klik card project 'Pooling'<br>2. Amati halaman yang terbuka | - | Navigasi menuju /project/[projectId] menampilkan Kanban Board dengan 3 kolom (To Do, In Progress, Done) berisi task milik project tsb. | Kritis |
| TC-F1-03 | Klik Task card membawa ke papan Subtask (Level 2) | Ada task dengan minimal 1 subtask di dalamnya | 1. Dari halaman project, klik salah satu Task card<br>2. Amati halaman yang terbuka | - | Navigasi menuju Task Detail menampilkan papan Subtask dengan 4 kolom (to_do, in_progress, review, done). | Kritis |
| TC-F1-04 | Task tidak bisa Done selama ada Subtask yang belum Done | Task punya 3 subtask, 2 sudah Done, 1 masih in_progress | 1. Coba pindahkan Task ke kolom Done (drag atau tombol) | 2/3 subtask Done | Perpindahan ditolak. Muncul pesan/toast '⛔ Tidak bisa Done — 1 subtask belum selesai'. Status Task tidak berubah. | Kritis |
| TC-F1-05 | Task berhasil Done setelah seluruh Subtask berstatus Done | Semua subtask dalam Task sudah Done, user berrole Lead | 1. Pindahkan Task ke kolom Done | 3/3 subtask Done | Task berhasil berpindah status ke Done tanpa penolakan. | Kritis |
| TC-F1-06 | Progress bar Task menunjukkan rasio Subtask selesai secara real-time | Task punya 5 subtask, 2 sudah Done | 1. Buka Task Detail atau lihat Task card di Kanban<br>2. Perhatikan progress bar/teks 'X/Y Subtask selesai' | 2/5 subtask Done | Ditampilkan '2/5 Subtask selesai' dan progress bar terisi 40%. | Menengah |

## Fitur 2: Multi-Assignee Subtask

| ID | Judul Test Case | Precondition | Langkah Pengujian | Data Uji | Expected Result | Prioritas |
|---|---|---|---|---|---|---|
| TC-F2-01 | Satu Subtask dapat memiliki lebih dari satu assignee | Subtask baru dibuat tanpa assignee | 1. Buka form/edit Subtask<br>2. Tambahkan 2 staff sebagai assignee (mis. ariana & budi)<br>3. Simpan | assignee: ariana, budi | Kedua staff tersimpan sebagai assignee subtask (relasi many-to-many), keduanya tampil di avatar stack kartu subtask. | Kritis |
| TC-F2-02 | Avatar stack Task menampilkan gabungan unik assignee dari seluruh Subtask-nya | Task memiliki 2 subtask dengan assignee berbeda: SubtaskA(ariana, budi), SubtaskB(citra) | 1. Buka halaman Kanban project<br>2. Perhatikan avatar stack pada Task card | - | Avatar stack menampilkan 3 avatar unik (ariana, budi, citra) — bukan satu assignee tunggal untuk Task. | Kritis |
| TC-F2-03 | Assignee yang sama di beberapa Subtask tidak tampil duplikat pada avatar stack Task | SubtaskA(ariana), SubtaskB(ariana, budi) dalam 1 Task yang sama | 1. Buka Task card di Kanban<br>2. Hitung jumlah avatar unik yang tampil | - | Hanya 2 avatar unik (ariana, budi) yang tampil, ariana tidak dihitung/ditampilkan dua kali. | Menengah |
| TC-F2-04 | Hanya assignee terdaftar pada Subtask yang bisa drag Subtask tsb | Subtask di-assign ke staff 'citra' saja | 1. Login/simulasi sebagai staff lain (mis. 'dian')<br>2. Coba drag kartu Subtask tsb ke kolom lain | assignee subtask: citra | Drag ditolak untuk staff 'dian' karena bukan assignee subtask tsb. | Kritis |
| TC-F2-05 | Filter assignee pada Kanban Task menampilkan hasil berdasarkan data Subtask, bukan field Task | Staff 'hadi' adalah assignee di salah satu Subtask, namun bukan PIC di Task manapun | 1. Buka filter assignee di KanbanToolbar<br>2. Pilih 'hadi' | - | Task yang memiliki Subtask dengan assignee 'hadi' tetap muncul di hasil filter, walau 'hadi' bukan PIC task tsb. | Kritis |
| TC-F2-06 | Log waktu tercatat terpisah per staff meski Subtask dikerjakan bersama | Subtask dengan 2 assignee (ariana & budi) sama-sama mengerjakan | 1. ariana start timer pada subtask<br>2. budi juga start timer pada subtask yang sama<br>3. Cek log aktivitas | - | Activity log mencatat durasi masing-masing staff secara terpisah (per user_id), tidak digabung jadi satu entri. | Menengah |

## Fitur 3: Workflow Approval Berjenjang

| ID | Judul Test Case | Precondition | Langkah Pengujian | Data Uji | Expected Result | Prioritas |
|---|---|---|---|---|---|---|
| TC-F3-01 | Staff dapat menggeser Subtask dari to_do ke in_progress ke review | Login sebagai staff, assignee pada subtask tsb | 1. Drag Subtask dari to_do → in_progress<br>2. Lengkapi evidence<br>3. Drag/klik 'Ajukan Review' → review | - | Subtask berpindah status sesuai urutan, tanpa hambatan untuk staff assignee. | Kritis |
| TC-F3-02 | Staff TIDAK dapat memindahkan Task langsung ke status Done | Login sebagai staff | 1. Coba drag Task card ke kolom Done | - | Perpindahan ditolak dengan toast error. Hanya Lead yang dapat melakukan ini. | Kritis |
| TC-F3-03 | Lead dapat menyetujui (approve) Subtask berstatus review | Login sebagai Lead task tsb, Subtask berstatus review | 1. Klik tombol 'Setujui' pada kartu Subtask | - | Status Subtask berubah menjadi Done. Tercatat di activity log dengan action 'approved'. | Kritis |
| TC-F3-04 | Lead dapat meminta revisi dengan catatan wajib diisi | Login sebagai Lead task tsb, Subtask berstatus review | 1. Klik tombol 'Revisi'<br>2. Coba submit tanpa mengisi catatan | catatan: kosong | Submit ditolak — 'Catatan revisi wajib diisi'. Setelah catatan diisi, status Subtask kembali ke in_progress dan catatan tersimpan. | Kritis |
| TC-F3-05 | Lead lain (bukan penanggung jawab Task) tidak bisa approve/reject | Login sebagai Lead dari task/tim lain | 1. Coba akses aksi approve/reject pada Subtask milik Task lead lain | - | Aksi ditolak (403) — hanya Lead yang menjadi penanggung jawab Task tsb yang berwenang. | Menengah |
| TC-F3-06 | Task terkunci dari Done selama ada Subtask menggantung, meski sudah direview Lead sebelumnya | 1 Subtask sudah Done, 1 Subtask lain masih berstatus review (belum diputuskan) | 1. Lead coba selesaikan Task (validate-done) | - | Penyelesaian Task ditolak — sistem menampilkan Subtask mana yang belum Done. | Kritis |

## Fitur 4: Pelacakan Waktu Otomatis

| ID | Judul Test Case | Precondition | Langkah Pengujian | Data Uji | Expected Result | Prioritas |
|---|---|---|---|---|---|---|
| TC-F4-01 | Timer otomatis mulai saat Subtask berpindah ke in_progress | Subtask berstatus to_do | 1. Staff pindahkan Subtask ke in_progress | - | Timer otomatis aktif tanpa perlu memanggil aksi start manual terpisah. | Kritis |
| TC-F4-02 | Timer otomatis berhenti & mencatat durasi 'kerja aktif' saat diajukan review | Subtask sedang in_progress dengan timer berjalan | 1. Staff klik 'Ajukan Review' | - | Timer berhenti. Durasi kerja aktif (in_progress → review) tercatat di activity log. | Kritis |
| TC-F4-03 | Durasi 'menunggu review' tercatat terpisah dari durasi kerja aktif | Subtask sudah diajukan review, menunggu keputusan Lead beberapa saat | 1. Tunggu beberapa waktu<br>2. Lead approve/reject | - | Durasi antara 'diajukan review' dan 'keputusan Lead' tercatat sebagai kategori terpisah (wait_review), tidak tercampur dengan durasi kerja aktif. | Kritis |
| TC-F4-04 | Timer countdown menampilkan perbandingan estimasi vs waktu berjalan real-time | Subtask in_progress dengan workload_hours = 4 jam | 1. Buka Task Detail saat Subtask sedang berjalan<br>2. Amati indikator countdown | workload_hours: 4 jam | Countdown menampilkan sisa/lebih waktu dibanding estimasi 4 jam, update tiap detik. | Menengah |
| TC-F4-05 | Badge 'Overdue' muncul jika waktu aktual melebihi estimasi | Subtask in_progress sudah berjalan melebihi workload_hours | 1. Biarkan waktu berjalan melebihi estimasi<br>2. Amati kartu Subtask | - | Badge 'Overdue' tampil pada kartu Subtask yang bersangkutan. | Menengah |
| TC-F4-06 | Selisih estimasi vs aktual dapat dihitung per staff untuk kebutuhan akurasi estimasi | Beberapa Subtask staff X sudah selesai dengan durasi aktual tercatat | 1. Bandingkan total workload_hours vs total durasi aktual staff X | - | Selisih dapat dihitung dan digunakan sebagai indikator akurasi estimasi individu (dipakai di Reporting, Fitur 7). | Rendah |

## Fitur 5: Sistem Tiket Unik dengan PIC

| ID | Judul Test Case | Precondition | Langkah Pengujian | Data Uji | Expected Result | Prioritas |
|---|---|---|---|---|---|---|
| TC-F5-01 | Ticket ID baru mengikuti format [Project]-[Nomor]-[PIC]-[Lead] | Task baru dibuat: project 'Pooling', pic_name 'ariana', lead 'thoriq' | 1. Buat Task baru dengan data tsb<br>2. Periksa ticket_id yang dihasilkan | - | Ticket ID sesuai format, misal 'pooling-0009-ariana-thoriq'. | Kritis |
| TC-F5-02 | PIC diambil dari nama staff PERTAMA pada data sumber, bukan dari staff yang login | Kolom staff pada data sumber (spreadsheet/sync) berisi lebih dari satu nama, urutan: budi, citra | 1. Buat/sync Task dari data tsb<br>2. Periksa pic_name yang tersimpan | kolom staff: budi, citra | pic_name tersimpan sebagai 'budi' (nama pertama), bukan 'citra' ataupun nama staff yang sedang login melakukan aksi. | Kritis |
| TC-F5-03 | Ticket ID tidak pernah duplikat meski dua Task dibuat bersamaan pada project yang sama | 2 request pembuatan Task ke project 'Pooling' dikirim hampir bersamaan | 1. Kirim 2 request createTask() paralel untuk project yang sama<br>2. Bandingkan kedua ticket_id | - | Kedua ticket_id berbeda, nomor urut tidak collision. | Menengah |
| TC-F5-04 | PIC tidak membatasi assignee sesungguhnya pada Subtask | Task dengan pic_name 'ariana', namun seluruh Subtask di-assign ke 'budi' dan 'citra' | 1. Cek daftar assignee pada Subtask Task tsb | - | Assignee tetap 'budi' dan 'citra' sesuai data subtask_assignees — PIC hanya identitas tiket, tidak mempengaruhi siapa pengerjanya. | Menengah |
| TC-F5-05 | Ticket ID ditampilkan konsisten di Task card dan header Task Detail | Task dengan ticket_id tertentu sudah dibuat | 1. Bandingkan ticket_id yang tampil di Kanban card vs di halaman Task Detail | - | Ticket ID identik di kedua tempat. | Rendah |

## Fitur 6: Dashboard Eksekutif (Level 0)

| ID | Judul Test Case | Precondition | Langkah Pengujian | Data Uji | Expected Result | Prioritas |
|---|---|---|---|---|---|---|
| TC-F6-01 | Dashboard menampilkan grafik distribusi Task per status | Ada task dengan berbagai status (To Do, In Progress, Done) | 1. Buka Dashboard<br>2. Amati grafik distribusi task | - | Grafik menampilkan proporsi task per status secara agregat lintas seluruh project. | Menengah |
| TC-F6-02 | Dashboard menampilkan grafik velocity sprint | Ada data task selesai vs belum selesai dalam sprint berjalan | 1. Buka Dashboard<br>2. Amati grafik Sprint Velocity | - | Grafik membandingkan jumlah task selesai vs belum selesai pada sprint aktif. | Menengah |
| TC-F6-03 | Dashboard menampilkan grafik beban kerja per staff | Ada data beban kerja (jam) dari beberapa staff | 1. Buka Dashboard<br>2. Amati grafik Workload per Staff | - | Grafik horizontal bar menunjukkan akumulasi jam beban kerja tiap staff. | Menengah |
| TC-F6-04 | Filter Role membatasi tampilan Dashboard sesuai role user | Login sebagai Staff | 1. Buka Dashboard sebagai staff<br>2. Amati task/statistik yang tampil | - | Hanya menampilkan data terkait task milik staff tsb (sebagai assignee di Subtask manapun), bukan data global. | Kritis |
| TC-F6-05 | Lead melihat Review Queue berisi Task yang menunggu approval | Login sebagai Lead, ada Subtask berstatus review dalam task-nya | 1. Buka Dashboard sebagai Lead<br>2. Amati bagian Review Queue | - | Kartu Task yang memiliki Subtask berstatus review muncul di Review Queue. | Kritis |
| TC-F6-06 | Project Card menampilkan indikator peringatan jika ada task overdue/stagnan | Project memiliki task yang melewati deadline | 1. Buka Dashboard<br>2. Amati card project tsb | - | Card menampilkan indikator peringatan (badge/warna) menandakan ada task overdue. | Rendah |

## Fitur 7: Reporting & Analitik Kinerja

| ID | Judul Test Case | Precondition | Langkah Pengujian | Data Uji | Expected Result | Prioritas |
|---|---|---|---|---|---|---|
| TC-F7-01 | Laporan tersedia dalam periode Bulanan dan Kuartalan | Data historis mencakup lebih dari 1 bulan | 1. Buka halaman Reports<br>2. Pilih periode Bulanan, lalu Kuartalan | - | Kedua periode dapat dipilih dan menghasilkan data yang sesuai rentang waktunya. | Kritis |
| TC-F7-02 | Utilisasi dihitung dari beban kerja dibanding kapasitas standar staff | Staff dengan kapasitas 160 jam/bulan, beban kerja bulan ini 120 jam | 1. Buka laporan individu staff tsb<br>2. Periksa persentase utilisasi | kapasitas=160, beban=120 | Utilisasi ditampilkan 75%. | Kritis |
| TC-F7-03 | Indikator overload muncul jika beban kerja melebihi kapasitas standar | Staff dengan kapasitas 100 jam/bulan, beban kerja 130 jam | 1. Buka laporan individu staff tsb | kapasitas=100, beban=130 | Muncul indikator/flag overload (utilisasi >100%). | Menengah |
| TC-F7-04 | Beban kerja Subtask multi-assignee dibagi rata, tidak dihitung ganda | 1 Subtask workload 10 jam, di-assign ke 2 staff (A & B) | 1. Buka laporan masing-masing staff A dan B<br>2. Jumlahkan kontribusi dari subtask tsb | workload=10 jam, assignee: A, B | Masing-masing staff mendapat kontribusi 5 jam, total tetap 10 jam (bukan 20). | Kritis |
| TC-F7-05 | Laporan menampilkan akurasi estimasi (selisih estimasi vs aktual) per individu | Staff memiliki beberapa Subtask selesai dengan data estimasi & aktual | 1. Buka laporan individu staff tsb<br>2. Periksa metrik akurasi estimasi | - | Selisih rata-rata estimasi vs aktual ditampilkan sebagai metrik terpisah. | Menengah |
| TC-F7-06 | Laporan menggunakan struktur supervisi yang berlaku saat Task dikerjakan (historical assignment) | Staff X pindah dari Lead A ke Lead B di tengah kuartal | 1. Buka laporan kuartalan mencakup periode sebelum & sesudah mutasi | - | Task yang dikerjakan saat masih di bawah Lead A tetap tercatat pada laporan Lead A untuk periode tsb, bukan otomatis berpindah ke Lead B. | Menengah |
| TC-F7-07 | Laporan dapat diekspor ke PDF dan Excel | Ada data laporan untuk periode tertentu | 1. Klik 'Ekspor PDF'<br>2. Klik 'Ekspor Excel' | - | Kedua file berhasil diunduh dengan data yang konsisten dengan tampilan di layar. | Menengah |
| TC-F7-08 | Hak akses laporan sesuai role (Staff diri sendiri, Lead timnya, Kadep departemen, Super Admin semua) | Login bergantian sebagai Staff, Lead, Kadep, Super Admin | 1. Buka halaman Reports dengan masing-masing role<br>2. Amati cakupan data yang tampil | - | Setiap role hanya melihat data sesuai cakupan aksesnya masing-masing. | Kritis |

## Fitur 8: Riwayat Sprint (Arsip Read-Only)

| ID | Judul Test Case | Precondition | Langkah Pengujian | Data Uji | Expected Result | Prioritas |
|---|---|---|---|---|---|---|
| TC-F8-01 | Mode Timeline/Tren menampilkan grafik 10 sprint terakhir | Ada minimal 10 data sprint historis | 1. Buka menu Riwayat Sprint<br>2. Amati tampilan default (Mode Tren) | - | Grafik tren menampilkan metrik (task selesai, beban kerja, dsb) untuk 10 sprint terakhir. | Menengah |
| TC-F8-02 | Mode Detail per Sprint menampilkan snapshot lengkap sprint terpilih | Berada di menu Riwayat Sprint | 1. Pilih salah satu sprint dari daftar (mis. Sprint 5)<br>2. Amati detail yang tampil | - | Snapshot lengkap sprint tsb tampil: daftar project, task, subtask, dan penugasan pada periode itu. | Menengah |
| TC-F8-03 | Sprint yang sudah cut-off bersifat read-only, tidak bisa diedit | Sprint tertentu sudah melewati tanggal cut-off | 1. Buka detail sprint yang sudah lewat cut-off<br>2. Coba ubah status task/subtask di dalamnya | - | Tidak ada aksi ubah status/edit yang tersedia. Sistem menampilkan banner 'Data riwayat sprint bersifat read-only'. | Kritis |
| TC-F8-04 | Data sprint tetap tersimpan penuh di database meski spreadsheet dibatasi 10 sprint | Sudah lebih dari 10 siklus sprint berjalan sejak awal | 1. Cek jumlah sprint yang tersimpan di spreadsheet sumber (maks 10)<br>2. Cek jumlah sprint yang bisa diakses di Riwayat Sprint aplikasi | - | Aplikasi tetap bisa menampilkan sprint ke-11 dan seterusnya (histori penuh), meski spreadsheet sumber hanya menyimpan 10 sprint terakhir. | Menengah |
| TC-F8-05 | Laporan bulanan/kuartalan (Fitur 7) mengambil data konsisten dari Riwayat Sprint | Ada 6 sprint dalam 1 kuartal yang sudah di-cutoff | 1. Bandingkan data agregat pada Laporan Kuartalan dengan data 6 sprint terkait di Riwayat Sprint | - | Angka pada Laporan Kuartalan konsisten dengan agregasi data 6 sprint tersebut, tidak ada selisih sumber data. | Menengah |