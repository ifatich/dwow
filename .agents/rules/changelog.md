# Mandatory Changelog Update Rule

Sebelum melakukan commit dan push ke branch `master`, agen dan pengembang **WAJIB** memperbarui changelog aplikasi.

## Ketentuan
1. **File Target:** `src/features/dashboard/data/changelog-data.ts`
2. **Kapan Dijalankan:** Setiap kali ada implementasi fitur baru, perbaikan bug, atau peningkatan performa/arsitektur yang siap di-push ke `master`.
3. **Format Entri:**
   Tambahkan entri baru di posisi teratas array `CHANGELOG_DATA`:
   - `id`: Tag unik (contoh: `"v1-5-0"`)
   - `version`: Versi semantik (contoh: `"v1.5.0"`)
   - `date`: Tanggal rilis dalam format lokal (contoh: `"19 Okt 2026"`)
   - `title`: Judul ringkas pembaruan
   - `summary`: Ringkasan 1-2 kalimat mengenai dampak/manfaat bagi pengguna
   - `changes`: Daftar poin perubahan dengan type `"feature" | "fix" | "improvement"`
4. **Validasi:**
   Jalankan `npx tsc --noEmit` untuk memastikan tipe TypeScript valid sebelum commit.
