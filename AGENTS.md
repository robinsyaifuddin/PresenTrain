# PresenTrain Agent Guidelines & Rapid Vibecoding Rules

## ⚡ Aturan Eksekusi Cepat & Efisiensi Token (Rapid Direct Execution)
1. **Langsung Eksekusi (Direct Action)**:
   - Kerjakan prompt pengguna secara langsung dan tepat sasaran tanpa konfirmasi atau persetujuan trivial.
   - Jangan gunakan `ask_question` kecuali instruksi ambigu secara kritis.
2. **Hemat Token & Minimalkan Perintah Shell (No Run-Spam)**:
   - Hindari menjalankan perintah terminal (`npm run ...`, `git ...`, looping commands) berulang kali jika bisa diperiksa lewat inspeksi kode.
   - Gunakan parameter `StartLine` dan `EndLine` saat membaca file. Edit secara presisi menggunakan `replace_file_content`.
3. **Tanpa Build Otomatis & Tanpa Persetujuan Tambahan**:
   - **JANGAN PERNAH** menjalankan `npm run build`, `npm run dev`, atau build server otomatis di akhir pengerjaan kecuali diminta secara eksplisit.
   - Setelah tugas selesai, langsung berikan ringkasan padat tanpa meminta persetujuan yang tidak perlu.
4. **Audit Kode Menyeluruh (Thorough Static Audit)**:
   - Lakukan audit statis (sintaks, import, props/tipe, null-safety, tidak merusak kode sekitar) secara mental/analisis sebelum mengirim ringkasan.

## 📋 Prosedur Penyelesaian & Panduan Re-upload Hostinger
Ketika pengguna menyelesaikan fitur, bug fix, atau sesi vibecoding:
1. **Ringkasan Padat**:
   - Jelaskan fitur/perbaikan yang selesai.
   - Sebutkan file yang dimodifikasi.
   - Berikan hasil audit statis.
2. **Panduan Upload Hostinger (Hanya Catatan, Tidak Dijalankan Otomatis)**:
   - **Frontend** (`src/`, `public/`): Ingatkan pengguna cukup jalankan `npm run build` (menghasilkan `dist.zip`), lalu upload & extract `dist.zip` ke `public_html/`.
   - **Backend** (`backend/app/`, `backend/routes/`): Sebutkan file PHP yang bersangkutan untuk diupload ke `~/backend/`, lalu jalankan `php artisan optimize` di SSH.
   - **Database**: Jika ada migrasi baru, ingatkan jalankan `php artisan migrate`.

## 🛠️ Skill Khusus yang Tersedia
- `.agents/skills/rapid-exec-audit/`: Prosedur eksekusi cepat, hemat token, zero run-spam, dan audit statis menyeluruh.
- `.agents/skills/vibecoding-deploy-summary/`: Panduan pemetaan file dan deployment Hostinger.
