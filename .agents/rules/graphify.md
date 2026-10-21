---
trigger: always_on
description: Mandat wajib bagi agen untuk mengonsultasikan knowledge graph graphify (graphify-out/) dan memperbaruinya setiap ada perubahan kode.
---

# Mandatory Graphify Rule for Agents

Agen dan asisten pengembang **WAJIB** menggunakan graphify untuk memahami arsitektur, relasi antar modul, dan ketergantungan file di repositori ini.

## Aturan Wajib:
1. **Wajib Konsultasi Graph Sebelum Eksplorasi Luas:**
   - Ketika menjawab pertanyaan terkait struktur kode, alur data, atau relasi komponen, agen **WAJIB** terlebih dahulu mengecek `graphify-out/graph.json` menggunakan:
     - `graphify query "<pertanyaan>"` untuk pemetaan konteks
     - `graphify path "<Komponen A>" "<Komponen B>"` untuk menganalisis relasi langsung
     - `graphify explain "<Simbol / Komponen>"` untuk memahami fungsi komponen dan relasi tetangganya
   - Dilarang melakukan blind grep atau penjelajahan manual acak jika informasi relasi sudah terpetakan di knowledge graph.

2. **Wajib Update Graph Setelah Perubahan Kode:**
   - Setelah membuat fitur baru, memodifikasi file, atau merefaktor komponen, agen **WAJIB** menjalankan:
     ```bash
     graphify update .
     ```
   - Perintah ini berjalan cepat secara lokal (AST-only, tanpa biaya token LLM) untuk menjaga graph tetap mutakhir (*fresh*).

3. **Dokumen Referensi:**
   - Laporan audit lengkap arsitektur dan god nodes tersimpan di `graphify-out/GRAPH_REPORT.md`.
   - Visualisasi graf interaktif tersedia di `graphify-out/graph.html`.

