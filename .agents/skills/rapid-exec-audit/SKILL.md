---
name: rapid-exec-audit
description: >-
  Alur eksekusi langsung, hemat token, minim perintah shell/run, tanpa build otomatis,
  dengan audit kode menyeluruh dan ringkasan akhir yang ringkas. Gunakan setiap kali pengguna
  memberikan prompt pengkodean, perbaikan bug, penambahan fitur, atau refaktor yang membutuhkan
  kecepatan tinggi, akurasi tepat, dan efisiensi token maksimal.
---

# Rapid Direct Execution & Thorough Audit (Fast & Token-Efficient)

Panduan operasional tingkat tinggi untuk mengeksekusi instruksi pengguna secara langsung, tepat sasaran, hemat token, tanpa overhead perintah terminal yang tidak perlu, dan menghasilkan kode yang diaudit secara menyeluruh.

---

## 🎯 5 Prinsip Utama (Core Principles)

1. **Direct Execution (Langsung Eksekusi Tanpa Basa-Basi)**:
   - Mulai analisis dan modifikasi langsung saat prompt diterima.
   - Jangan meminta konfirmasi trivial (misal: *"Bolehkah saya mengedit file ini?"*, *"Apakah Anda setuju jika saya ubah?"*).
   - Hindari alat `ask_question` kecuali instruksi pengguna benar-benar ambigu atau berpotensi merusak arsitektur mendasar.

2. **Zero Run-Spam (Minimalkan Perintah Terminal `run_command`)**:
   - Dilarang menjalankan perintah shell berulang-ulang untuk hal yang dapat diverifikasi melalui analisis kode.
   - JANGAN menjalankan `npm run dev`, `npm run build`, `npm test`, `git log`, `cat`, atau terminal trial-and-error kecuali diminta secara eksplisit oleh pengguna.
   - Verifikasi sintaks dan alur logika dilakukan secara **analisis statis & mental reasoning**.

3. **Maksimal Efisiensi Token (Token-Saving Mindset)**:
   - **Targeted Reading**: Selalu gunakan parameter `StartLine` dan `EndLine` saat memanggil `view_file`. Jangan membaca ratusan baris file yang tidak relevan.
   - **Surgical Edits**: Gunakan `replace_file_content` dengan blok target yang presisi. Jangan menimpa (`write_to_file`) seluruh isi file jika hanya beberapa baris yang diubah.
   - **Zero Redundant Reads**: Hindari membaca ulang file yang baru saja diedit jika perubahannya sudah diverifikasi dalam logika internal.
   - Jangan memanggil subagent atau web search untuk tugas pengkodean internal yang lokasinya sudah jelas.

4. **Zero Automatic Build & Zero Redundant Approvals**:
   - Setelah pengkodean selesai, **JANGAN menjalankan `npm run build` secara otomatis**.
   - Jangan meminta konfirmasi atau persetujuan yang tidak perlu untuk menutup sesi.
   - Cukup sajikan ringkasan apa yang telah diselesaikan.

5. **Audit Kode Menyeluruh (Thorough Static Audit)**:
   - Sebelum memberikan respons akhir, lakukan audit mendalam terhadap seluruh file yang dimodifikasi berdasarkan checklist verifikasi internal.

---

## 🔍 Checklist Audit Kode Menyeluruh (Internal Static Audit)

Lakukan verifikasi statis & penelusuran logika secara teliti terhadap aspek berikut:

- [ ] **Import & Dependency Integrity**:
  - Apakah komponen, hook, fungsi, atau class PHP yang baru di-import benar-benar ada di file asalnya?
  - Apakah path import (`@/components/...`, `../utils/...`) sudah valid?
- [ ] **Type & Parameter Consistency**:
  - Apakah argument pemanggilan fungsi sesuai dengan tipe data dan urutan parameternya?
  - Apakah props komponen React konsisten dengan antarmuka TypeScript atau props destructuring?
- [ ] **Lifecycle & React Hook Safety**:
  - Apakah dependency array di `useEffect` / `useMemo` / `useCallback` sudah lengkap dan bebas dari infinite loop?
  - Apakah hooks selalu dipanggil di top-level komponen (tidak di dalam conditional atau loop)?
- [ ] **Backend & Database Integrity (Laravel/PHP)**:
  - Apakah request validation sudah aman?
  - Apakah query Eloquent/DB bebas dari potensi SQL injection dan null-pointer exception?
  - Apakah route name, HTTP method, dan controller action sudah sinkron?
- [ ] **Zero Regressions & Syntax Balance**:
  - Pastikan logika sekitar tidak sengaja terhapus atau tergeser saat melakukan `replace_file_content`.
  - Pastikan penutupan tag JSX `</...>`, kurung kurawal `{}`, dan tanda kurung `()` seimbang sempurna.
- [ ] **Null-Safety & Edge Cases**:
  - Apakah data nullable / undefined sudah ditangani dengan optional chaining `?.` atau null coalescing `??`?

---

## ⚡ Alur Kerja Standar (Execution Pipeline)

```
[Terima Prompt Pengguna]
       │
       ▼
[1. Targeted View] ──► Baca hanya baris/fungsi yang relevan dengan StartLine & EndLine
       │
       ▼
[2. Precision Edit] ──► Modifikasi langsung dengan replace_file_content
       │
       ▼
[3. Static Audit] ──► Periksa 6 poin checklist audit secara teliti (Tanpa run_command)
       │
       ▼
[4. Ringkasan Akhir] ──► Kirim ringkasan terstruktur & padat (Tanpa build & tanpa minta izin)
```

---

## 📋 Format Ringkasan Akhir (Final Output Template)

Sajikan respons penutup dalam format ringkas, jelas, dan profesional:

```markdown
### ⚡ Implementasi Selesai

#### 1. Perubahan yang Dilakukan
- **[Modul/Fitur]**: [Deskripsi singkat perubahan atau perbaikan logika]
- **[Modul/Fitur]**: [Deskripsi singkat penambahan fitur baru]

#### 2. File yang Dimodifikasi
- [NamaFile.tsx](file:///path/ke/file#L10-L40) — [Keterangan singkat fungsi/baris]

#### 3. Hasil Audit Kode Statis
- ✅ **Sintaks & Struktur**: Imports, kurung, dan JSX terverifikasi valid & seimbang.
- ✅ **Alur Logika & Tipe**: Parameter, props, dan lifecycle safe.
- ✅ **Null-Safety & Regresi**: Fitur sekitar tetap utuh, edge cases terlindungi.

#### 4. Catatan Selanjutnya
- *Perubahan siap. Jalankan `npm run build` atau upload file saat Anda siap deploy.*
```

---

## 🚫 Yang DILARANG Dilakukan:

1. ❌ Menjalankan `run_command` untuk `npm run build`, `npm run dev`, atau `npm test` otomatis di akhir pekerjaan.
2. ❌ Bertanya: *"Apakah Anda ingin saya melanjutkannya?"*, *"Bolehkah saya mengedit file ini?"*, *"Apakah perubahan ini sudah memuaskan?"*.
3. ❌ Membaca seluruh file (800+ baris) saat hanya membutuhkan fungsi tertentu.
4. ❌ Menjalankan perintah terminal berkali-kali hanya untuk mengecek hal-hal sepele.
5. ❌ Menulis ulang satu file penuh dengan `write_to_file` ketika cukup mengganti beberapa baris via `replace_file_content`.
