# Brainstorming & Dokumentasi Sistem Web Absensi Training

Sistem web absensi training dirancang untuk memfasilitasi pendaftaran peserta, pemberian identitas digital berupa Barcode/QR Code tetap per peserta, verifikasi kehadiran real-time oleh panitia/admin melalui pemindaian QR Code per sesi materi, serta pengelolaan training dan rekapitulasi data kehadiran.

---

## Poin Terkonfirmasi

1. **Format QR Code**: Statis/Tetap sebagai ID Identitas Unik per Peserta.
2. **Pendaftaran Peserta**: Langsung **Aktif Otomatis** saat pendaftaran tanpa memerlukan persetujuan manual admin.

---

## 1. Peran Pengguna (User Roles)

1. **Super Admin (Admin Utama)**
   - Mengelola akun Admin biasa (buat, edit, matikan akses, atur ulang kata sandi).
   - Akses penuh ke seluruh fitur sistem, master data training, dan rekapitulasi global.

2. **Admin (Panitia / Instruktur)** (~10 akun)
   - Membuat dan mengelola event Training dan Sesi/Materi Training (misal: Sesi 1 - Pembukaan, Sesi 2 - Materi A, dst).
   - Melakukan scan Barcode/QR Code peserta menggunakan kamera device/scanner pada dashboard admin.
   - Memantau daftar peserta yang mendaftar dan status kehadirannya secara real-time.
   - Menghasilkan/Mengekspor Rekap Absensi (Excel/PDF).

3. **Peserta (Participant)** (~500+ akun)
   - Mendaftar akun (langsung aktif) dan mendaftar ke training yang tersedia.
   - Membuka Dashboard Peserta yang menampilkan **Barcode/QR Code Unik Tetap** sebagai kartu identitas digital.
   - Melihat riwayat kehadiran per sesi materi training yang telah terverifikasi.

---

## 2. Alur Sistem (User Journey & Attendance Flow)

1. **Pendaftaran & Log In**: Peserta mendaftar akun di web (otomatis aktif), lalu masuk ke Dashboard.
2. **Identitas Digital**: Di Dashboard Peserta, sistem menampilkan Barcode / QR Code unik tetap milik peserta tersebut.
3. **Persiapan Sesi Sesi Training**: Admin memilih event training & sesi materi yang sedang aktif di Dashboard Admin.
4. **Pemindaian Kehadiran**: Admin membuka fitur scanner kamera di Dashboard Admin dan memindai QR Code milik peserta.
5. **Validasi & Verifikasi**: API Backend (Laravel) memeriksa keabsahan QR token, memastikan peserta terdaftar, dan menandai status kehadiran untuk sesi tersebut. Jika di-scan ulang pada sesi yang sama, sistem memberikan notifikasi bahwa peserta sudah absen.
6. **Laporan & Rekap**: Admin dapat melihat rekapitulasi kehadiran real-time serta mengunduh laporan (Excel/PDF).

---

## 3. Desain Skema Database (MySQL)

- `users` (id, name, email, password, role [super_admin, admin, participant], phone, user_qr_token, timestamps)
- `trainings` (id, title, description, start_date, end_date, status, created_by, timestamps)
- `training_sessions` (id, training_id, session_name, speaker, session_date, start_time, end_time, timestamps)
- `registrations` (id, user_id, training_id, status [active], registered_at)
- `attendances` (id, registration_id, training_session_id, scanned_by, scanned_at, status)

---

## 4. Stack Teknologi yang Digunakan

- **Frontend**: React (Vite), Tailwind CSS, React Router v6, Axios, Lucide Icons, HTML5 QR Code Scanner Library (`@html5-qrcode`).
- **Backend API**: Laravel 11 RESTful API, Laravel Sanctum (Authentication & Token Security).
- **Database**: MySQL.
