# PresenTrain: Sistem Presensi & Evaluasi Training Perkaderan HMI

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**PresenTrain** (*Presensi, Evaluasi, dan Manajemen Training Perkaderan HMI*) adalah platform web digital cerdas yang dirancang khusus untuk memfasilitasi dan mengelola seluruh siklus perkaderan di lingkungan **Himpunan Mahasiswa Islam (HMI)**, meliputi jenjang formal (**Basic Training / LK 1**, **Intermediate Training / LK 2**, **Advance Training / LK 3**), non-formal (**Senior Course / SC**, Pelatihan Instruktur BPL), hingga diklat profesi (**Lembaga Pengembangan Profesi / LPP**).

---

## 📌 Arti & Singkatan PresenTrain
- **Presen**: *Presensi Digital & Presisi Kehadiran* (Scanner QR Code unik per materi, proteksi anti-titip absen, validasi real-time per forum).
- **Train**: *Training Perkaderan Kader HMI* (Evaluasi komprehensif MOT & SC pada aspek Afektif, Kognitif, Psikomotorik, serta modul Pre-Test, Post-Test, dan Quiz digital terintegrasi).

👉 **[Baca Dokumentasi Lengkap Sistem Perkaderan HMI (PRESENTRAIN_HMI.md)](./PRESENTRAIN_HMI.md)**

---

## 🚀 Fitur Utama
1. **Presensi Cerdas Berbasis QR Code**: Pemindaian instan lewat smartphone panitia/MOT per sesi materi dengan proteksi anti-duplicate presensi.
2. **Penilaian Terpadu MOT & SC**: Format penilaian baku perkaderan HMI (Afektif, Kognitif, dan Psikomotorik) dengan rekap catatan kedisiplinan kader.
3. **Quiz & Ujian Digital (In-App Form)**: Pembuatan dan pengerjaan Pre-Test, Post-Test, dan Quiz materi wajib (NDP, Konstitusi, Sejarah Perjuangan HMI, Mission HMI, KMO) secara online tanpa kertas.
4. **Sistem Yudisium Otomatis**: Perhitungan bobot nilai kelulusan kader (Lulus Murni, Lulus Bersyarat, Tidak Lulus) dan ekspor Berita Acara (Excel / PDF).
5. **Kartu Identitas Digital & E-Sertifikat**: Kartu tanda peserta ber-QR statis dan generator sertifikat kelulusan.
6. **Progressive Web App (PWA)**: Dapat dipasang langsung di smartphone panitia, instruktur, maupun peserta tanpa perlu install dari PlayStore.

---

## 🛠️ Stack Teknologi
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React
- **QR Engine**: `@html5-qrcode` & `qrcode.react`
- **State & Data**: Offline Sync & LocalStorage Caching dengan arsitektur sinkronisasi REST API
- **Linter**: Oxlint

---

## 💻 Menjalankan Proyek Secara Lokal

1. **Clone & Masuk ke Direktori Proyek**:
   ```bash
   git clone https://github.com/robinsyaifuddin/PresenTrain.git
   cd PresenTrain
   ```

2. **Instalasi Dependencies**:
   ```bash
   npm install
   ```

3. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`.

4. **Build untuk Produksi**:
   ```bash
   npm run build
   ```

---
*PresenTrain - Terpercaya untuk Transformasi Digital Perkaderan HMI Menuju Insan Cita.*
