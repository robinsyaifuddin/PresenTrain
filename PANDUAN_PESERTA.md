# 📘 Panduan Penggunaan Lengkap PresenTrain: Peserta Pelatihan

> **Dokumen Resmi Petunjuk Teknis & Operasional Peserta PresenTrain**  
> **Level Akun:** Peserta Pelatihan (`participant`)  
> **Target Pengguna:** Seluruh Peserta Basic Training (LK-1) dan Pelatihan Kader PresenTrain  
> **Akses Portal:** `https://presentrain.web.id/peserta` atau rute lokal `/peserta`

---

## 📑 Daftar Isi
1. [Pengenalan Aplikasi PresenTrain untuk Peserta](#1-pengenalan-aplikasi-presentrain-untuk-peserta)
2. [Akses Masuk & Kredensial Akun (Login)](#2-akses-masuk--kredensial-akun-login)
3. [Navigasi Antarmuka Peserta (Mobile & Desktop)](#3-navigasi-antarmuka-peserta-mobile--desktop)
   - [Sidebar Desktop (Mode Expanded & Collapsed)](#sidebar-desktop-mode-expanded--collapsed)
   - [Floating Bottom Navigation Dock (Smartphone)](#floating-bottom-navigation-dock-smartphone)
   - [Top Bar & Menu Profil Header](#top-bar--menu-profil-header)
4. [Tab 1: Beranda (Overview) & Dasbor Peserta](#4-tab-1-beranda-overview--dasbor-peserta)
   - [Hero Card Sambutan & Cincin Progress Kehadiran](#hero-card-sambutan--cincin-progress-kehadiran)
   - [6 Menu Cepat (Quick Access Grid)](#6-menu-cepat-quick-access-grid)
   - [Slider Banner Dokumentasi Kegiatan](#slider-banner-dokumentasi-kegiatan)
   - [Kartu Informasi Kegiatan Pelatihan yang Diikuti](#kartu-informasi-kegiatan-pelatihan-yang-diikuti)
5. [Tab 2: Kartu Presensi Digital & Kode QR Resmi (`profile`)](#5-tab-2-kartu-presensi-digital--kode-qr-resmi-profile)
   - [Tampilan Kode QR Statis Resmi](#tampilan-kode-qr-statis-resmi)
   - [Nomor Unik Presensi Manual (Bantuan Presensi)](#nomor-unik-presensi-manual-bantuan-presensi)
   - [Fitur Unduh Gambar QR Code Full HD (.png)](#fitur-unduh-gambar-qr-code-full-hd-png)
   - [Zoom Layar Penuh (Full QR Screen Mode)](#zoom-layar-penuh-full-qr-screen-mode)
   - [Cetak / Unduh Kartu Identitas Digital (ID Card Potret)](#cetak--unduh-kartu-identitas-digital-id-card-potret)
6. [Tab 3: Pemindai Kamera Mandiri Peserta (`scan_presensi`)](#6-tab-3-pemindai-kamera-mandiri-peserta-scan_presensi)
   - [Kapan Digunakan? (Presensi Mandiri Acara)](#kapan-digunakan-presensi-mandiri-acara)
   - [Pengoperasian Kamera (Ganti Kamera Belakang/Depan & Mirror)](#pengoperasian-kamera-ganti-kamera-belakangdepan--mirror)
   - [Antrean Cerdas Presensi (Smart Polling Queue)](#antrean-cerdas-presensi-smart-polling-queue)
7. [Tab 4: Evaluasi & Kuis Pembelajaran (`quizzes`)](#7-tab-4-evaluasi--kuis-pembelajaran-quizzes)
   - [Daftar Ujian: Pre-Test & Post-Test](#daftar-ujian-pre-test--post-test)
   - [Pengumpulan Tugas Resume via Google Drive Terintegrasi](#pengumpulan-tugas-resume-via-google-drive-terintegrasi)
   - [Tata Cara Mengerjakan Kuis Layar Penuh (Quiz Player)](#tata-cara-mengerjakan-kuis-layar-penuh-quiz-player)
   - [Aturan Ketat Anti-Kecurangan (Anti-Cheat Engine Guard)](#aturan-ketat-anti-kecurangan-anti-cheat-engine-guard)
   - [Penguncian Nilai & Tinjauan Skor](#penguncian-nilai--tinjauan-skor)
8. [Tab 5: Jadwal Sesi Materi Training (`schedule`)](#8-tab-5-jadwal-sesi-materi-training-schedule)
   - [Melihat Rundown Pelatihan Harian](#melihat-rundown-pelatihan-harian)
   - [Informasi Pemateri, Jam Pelaksanaan, & Ruangan](#informasi-pemateri-jam-pelaksanaan--ruangan)
   - [Indikator Status Sesi (Akan Datang, Berlangsung, Selesai)](#indikator-status-sesi-akan-datang-berlangsung-selesai)
9. [Tab 6: Riwayat & Rekapitulasi Presensi Diri (`my_attendances`)](#9-tab-6-riwayat--rekapitulasi-presensi-diri-my_attendances)
   - [Monitoring Bar Persentase Kehadiran Mandiri](#monitoring-bar-persentase-kehadiran-mandiri)
   - [Sinkronisasi Data Real-Time dengan Server](#sinkronisasi-data-real-time-dengan-server)
   - [Arti Indikator Status: Hadir, Izin, Belum Absen, dan Alpa](#arti-indikator-status-hadir-izin-belum-absen-dan-alpa)
10. [Tab 7: Helpdesk Bantuan & Permohonan Izin (`helpdesk`)](#10-tab-7-helpdesk-bantuan--permohonan-izin-helpdesk)
    - [Mengirim Tiket Laporan Kendala Lapangan](#mengirim-tiket-laporan-kendala-lapangan)
    - [Mengunggah Foto Bukti Kendala / Surat Dokter](#mengunggah-foto-bukti-kendala--surat-dokter)
    - [Live Tracker Status Tiket & Membaca Tanggapan Panitia](#live-tracker-status-tiket--membaca-tanggapan-panitia)
    - [Konsultasi Cepat via WhatsApp CS](#konsultasi-cepat-via-whatsapp-cs)
11. [Pusat Pengaturan Akun & Keamanan Peserta](#11-pusat-pengaturan-akun--keamanan-peserta)
    - [Reset Kata Sandi Akun via OTP Gmail](#reset-kata-sandi-akun-via-otp-gmail)
    - [Memperbarui Email Akun](#memperbarui-email-akun)
12. [Tips Praktis & Kendala Umum (FAQ)](#12-tips-praktis--kendala-umum-faq)

---

## 1. Pengenalan Aplikasi PresenTrain untuk Peserta

**PresenTrain** adalah platform manajemen presensi digital dan evaluasi belajar modern berbasis web (PWA - Progressive Web App). Dirancang khusus untuk memfasilitasi kegiatan pelatihan kader formal (seperti Basic Training Latihan Kader I HMI) secara transparan, terintegrasi, dan nir-kertas (*paperless*).

Sebagai peserta, Anda dapat:
- Menggunakan **Kartu Presensi Digital QR Barcode** pribadi tanpa kartu fisik.
- Memantau stempel jam kehadiran sesi secara transparan dan akurat.
- Mengakses materi rundown pelatihan harian.
- Mengerjakan ujian evaluasi **Pre-Test** dan **Post-Test** secara daring dengan hasil instan.
- Mengunggah berkas penugasan dan resume ke folder Google Drive kelas.
- Melaporkan kendala presensi atau permohonan izin langsung ke panitia via Helpdesk terpadu.

---

## 2. Akses Masuk & Kredensial Akun (Login)

### Alamat Masuk Portal
Buka browser pada smartphone (Google Chrome, Safari, atau Firefox) lalu akses:
```text
https://presentrain.web.id/login
```

### Kredensial Akun Peserta Default
- **Email:** Alamat email yang Anda daftarkan saat registrasi awal/screening formulir.
- **Kata Sandi Default:** `Peserta123!` *(Kecuali jika Anda telah mengubahnya sendiri)*.

> 💡 **Tips Penggunaan di Smartphone:**  
> Anda dapat menambahkan PresenTrain ke Layar Utama (*Add to Home Screen*) melalui menu titik tiga browser Chrome atau tombol Share Safari agar aplikasi terbuka layaknya aplikasi native tanpa bar alamat browser.

---

## 3. Navigasi Antarmuka Peserta (Mobile & Desktop)

### Sidebar Desktop (Mode Expanded & Collapsed)
Pada layar komputer/laptop, navigasi berada di sisi kiri layar berlatar gradien hijau emerald:
- **Expanded (Lebar):** Menampilkan icon dan teks nama menu secara lengkap.
- **Collapsed (Ringkas):** Memadatkan bilah samping menjadi icon saja dengan menekan tombol panah kiri (`‹`).
- **Daftar Menu Sidebar Peserta:**
  1. `Beranda` (`overview`) — Dasbor utama & ringkasan kehadiran
  2. `Jadwal Training` (`schedule`) — Rundown materi dan ruangan kelas
  3. `Riwayat Presensi` (`my_attendances`) — Rekap kehadiran sesi materi
  4. `Quiz & Test` (`quizzes`) — Bank evaluasi Pre-Test & Post-Test
  5. `Helpdesk Bantuan` (`helpdesk`) — Pusat pelaporan kendala teknis

### Floating Bottom Navigation Dock (Smartphone)
Pada layar smartphone, navigasi utama melayang (*floating*) di bagian bawah layar:
- **5 Menu Prioritas:**
  1. `Riwayat` (Ikon BarChart) — Riwayat presensi sesi
  2. `Quiz` (Ikon FileText) — Evaluasi kuis
  3. `Beranda` (Ikon LayoutDashboard di tengah dengan indikator bulat putih)
  4. `Jadwal` (Ikon Kalender) — Rundown sesi
  5. `Helpdesk` (Ikon LifeBuoy) — Bantuan panitia
- **Otomatis Tersembunyi:** Bottom dock otomatis disembunyikan saat Anda sedang membuka lembar ujian kuis demi mencegah salah sentuh tombol navigasi.

### Top Bar & Menu Profil Header
Di pojok kanan atas layar terdapat:
- Jam digital (WIB) dan tanggal berjalan.
- Avatar profil Anda. Mengklik avatar membuka menu pop-up:
  - `Profil Saya` — Melihat biodata & kartu QR code
  - `Pengaturan` — Reset sandi via OTP Gmail
  - `Helpdesk & Layanan` — Kirim tiket kendala
  - `Panduan Penggunaan` — Membuka panduan praktis
  - `Keluar Akun` — Logout dari portal

---

## 4. Tab 1: Beranda (Overview) & Dasbor Peserta

Halaman pertama saat Anda berhasil masuk ke dalam aplikasi (`/peserta/beranda`).

### Hero Card Sambutan & Cincin Progress Kehadiran
Panel gradien hijau emerald di kiri atas:
- Menyapa dengan nama resmi Anda: *"Selamat Datang, [Nama Anda]"*.
- Karakter 3D maskot ramah PresenTrain di sudut kanan kartu.
- **3 Cincin Metrik Kehadiran (Circular Progress):**
  1. **Kehadiran Saya:** Menampilkan persentase total kehadiran kumulatif Anda (misal: `75%` atau `100%`).
  2. **Sesi Dihadiri:** Menghitung jumlah sesi materi yang sudah Anda ikuti (misal: `03` sesi).
  3. **Sesi Berlangsung:** Jumlah materi yang sedang aktif berjalan di forum saat ini.

### 6 Menu Cepat (Quick Access Grid)
Panel putih 6 petak tombol cepat untuk melompat langsung ke fitur:
1. **Quiz Ujian:** Membuka lembar kuis evaluasi.
2. **Jadwal Training:** Membuka rundown kegiatan.
3. **Live Rekap:** Membuka rekapitulasi kehadiran (dengan indikator titik merah berdenyut).
4. **Helpdesk Lapangan:** Mengirim laporan masalah teknis.
5. **Scan Absensi:** Membuka kamera scanner presensi mandiri.
6. **Profil & QR:** Membuka kartu barcode presensi Anda.

### Slider Banner Dokumentasi Kegiatan
Tepat di bawah menu cepat, terdapat banner slider foto dokumentasi resmi pelatihan yang bergerak otomatis dengan rasio layar sinematik.

### Kartu Informasi Kegiatan Pelatihan yang Diikuti
Menampilkan identitas event resmi, tanggal pelaksanaan, nama cabang/penyelenggara, dan lokasi venue utama.

---

## 5. Tab 2: Kartu Presensi Digital & Kode QR Resmi (`profile`)

Akses melalui menu cepat Beranda -> **"Profil & QR"** atau tab navigasi.

### Tampilan Kode QR Statis Resmi
Kartu barcode presensi pribadi Anda:
- Kode QR statis berstandar enkripsi tinggi yang merepresentasikan ID kepesertaan unik Anda.
- **Cara Penggunaan Saat Masuk Forum:**
  1. Buka kartu QR ini saat berada di depan pintu masuk ruangan pelatihan.
  2. Arahkan layar HP Anda ke arah lensa kamera pemindai panitia registrasi.
  3. Scanner panitia akan berbunyi beep sukses dan nama Anda otomatis tercatat di layar proyektor.

### Nomor Unik Presensi Manual (Bantuan Presensi)
Di bawah kode QR terdapat kotak hijau bertuliskan **Nomor Unik Presensi Manual** (angka 4-6 digit tebal):
- **Fungsi:** Jika layar HP Anda pecah, kamera panitia kesulitan membaca QR akibat pantulan cahaya, atau kuota internet habis, cukup sebutkan **Nomor Presensi Manual** ini kepada panitia registrasi untuk diinputkan ke sistem secara manual.

### Fitur Unduh Gambar QR Code Full HD (.png)
- Klik tombol hijau **"Unduh Gambar QR (PNG)"**.
- Berkas gambar beresolusi Full HD (1200 x 1200 px) berlatar belakang putih bersih akan terunduh ke galeri HP Anda.
- Anda dapat menyimpannya sebagai wallpaper layar kunci (*lockscreen*) HP agar presensi lebih cepat tanpa perlu membuka browser setiap kali masuk forum.

### Zoom Layar Penuh (Full QR Screen Mode)
- Klik tombol **"Zoom Layar Penuh"**.
- Kode QR otomatis memenuhi seluruh layar HP dengan latar putih bersih dan kecerahan optimal untuk memudahkan pemindaian scanner barcode panitia.

### Cetak / Unduh Kartu Identitas Digital (ID Card Potret)
- Klik menu tab **"Kartu Digital"** pada halaman profil.
- Sistem menyediakan tata letak kartu ID Card potret elegan (720 x 1080 px) lengkap dengan logo HMI/PresenTrain, nama lengkap, asal komisariat, nomor barcode, dan stempel status resmi.
- Klik **"Unduh ID Card"** untuk menyimpan format JPG HD atau klik **"Cetak Kartu"** untuk mencetak ke printer.

---

## 6. Tab 3: Pemindai Kamera Mandiri Peserta (`scan_presensi`)

Akses melalui menu Beranda -> **"Scan Absensi"** (`/peserta/scan-presensi`).

### Kapan Digunakan? (Presensi Mandiri Acara)
Fitur ini digunakan jika panitia menerapkan sistem **Barcode Meja/Proyektor**, di mana panitia memajang barcode sesi di layar infocus auditorium dan peserta yang memindai menggunakan kamera HP masing-masing.

### Pengoperasian Kamera (Ganti Kamera Belakang/Depan & Mirror)
1. Buka tab Scan Presensi dan izinkan browser mengakses perangkat kamera HP Anda.
2. **Tombol "Ganti Kamera":** Beralih antara kamera belakang (*environment*) dan kamera depan (*selfie*).
3. **Tombol "Cermin (Mirror)":** Membalik orientasi kamera jika tampilan terbalik.
4. **Tombol "Layar Penuh":** Memperluas area tangkapan bidik scanner.
5. Arahkan kotak bidik ke barcode sesi materi di layar proyektor.

### Antrean Cerdas Presensi (Smart Polling Queue)
PresenTrain dibekali teknologi antrean cerdas backend:
- Ketika ratusan peserta memindai barcode sesi secara bersamaan dalam detik yang sama, Anda tidak akan mengalami kendala gagal server.
- Pop-up modal **Antrean Presensi** akan menampilkan progres persentase antrean (0% - 100%).
- Begitu giliran Anda selesai diproses, bunyi sukses beep akan aktif dan status presensi Anda langsung tersimpan.

---

## 7. Tab 4: Evaluasi & Kuis Pembelajaran (`quizzes`)

Akses melalui menu navigasi **"Quiz"** (`/peserta/quiz`).

### Daftar Ujian: Pre-Test & Post-Test
- **Pre-Test:** Ujian awal materi untuk mengukur pengetahuan dasar kader sebelum menerima materi.
- **Post-Test:** Ujian evaluasi akhir materi untuk mengukur kelulusan dan pemahaman komprehensif setelah seluruh materi selesai.
- Setiap kuis menampilkan badge tipe, durasi menit pengerjaan, dan status (*Tersedia*, *Sedang Dikerjakan*, atau *Sudah Dikerjakan*).

### Pengumpulan Tugas Resume via Google Drive Terintegrasi
Di atas daftar kuis terdapat panel kartu khusus **Pengumpulan Tugas**:
- Berisi instruksi pengumpulan berkas resume materi atau makalah penugasan kader.
- **Standar Penamaan Berkas:**  
  `Nama_Asal Komisariat_Kelas_Nama Tugas.pdf`  
  *(Contoh: Anita Wijaya_Komisariat Tarbiyah_Kelas A_Resume Materi Konstitusi.pdf)*.
- Klik tombol hijau **"Buka Google Drive"** untuk langsung menuju folder penyimpanan penugasan kelas Anda tanpa perlu mencari tautan manual.

### Tata Cara Mengerjakan Kuis Layar Penuh (Quiz Player)
1. Klik tombol **"Kerjakan Quiz"** pada kuis yang aktif.
2. Muncul modal informasi: Periksa judul, durasi waktu, passing grade, dan petunjuk pengerjaan.
3. Klik tombol **"Mulai Kerjakan Sekarang"**.
4. Waktu hitung mundur (*countdown timer*) akan mulai berjalan di pojok atas layar.
5. Lembar ujian kuis menampilkan:
   - Nomor soal dan daftar butir navigasi soal.
   - Pilihan ganda (A, B, C, D) dengan efek sorot jawaban terpilih.
   - Kolom teks uraian untuk soal essay.
6. Anda dapat berpindah nomor soal secara bebas melalui nomor di bilah bawah.
7. Jika seluruh soal telah terjawab, klik tombol **"Kumpulkan / Submit Jawaban"** dan setujui konfirmasi pengumpulan.

### Aturan Ketat Anti-Kecurangan (Anti-Cheat Engine Guard)
PresenTrain menerapkan sistem pengawasan integritas ujian otomatis:
- 🚫 **DILARANG KERAS** beralih ke tab browser lain, membuka aplikasi WhatsApp, Google Search, atau aplikasi catatan lain selama kuis berjalan!
- **Sistem Batas Pelanggaran (Maksimal 2x Peringatan):**
  - **Pelanggaran ke-1:** Muncul pop-up peringatan Kuning (*"Peringatan Pelanggaran 1/2: Anda terdeteksi meninggalkan layar ujian"*).
  - **Pelanggaran ke-2:** Muncul pop-up peringatan Merah Keras (*"Peringatan Terakhir 2/2: Satu kali lagi berpindah tab, ujian Anda akan otomatis dihentikan!"*).
  - **Pelanggaran ke-3:** **Sistem OTOMATIS MENGUNCI UJIAN**, memaksa pengumpulan seluruh jawaban yang ada saat itu juga, dan menandai adanya catatan kecurangan pada lembar penilaian panitia.
- **Pencegah Muat Ulang (Reload Guard):** Menekan tombol refresh atau tombol kembali browser akan diblokir oleh sistem untuk mencegah kecurangan manipulasi waktu ujian.

### Penguncian Nilai & Tinjauan Skor
Setelah ujian disubmit:
- Skor nilai otomatis dihitung seketika (untuk soal pilihan ganda).
- Status kuis berubah menjadi **"Sudah Dikerjakan"** dengan skor perolehan Anda.
- Lembar jawaban terkunci secara permanen dan tidak dapat diedit kembali kecuali jika Super Admin memberikan izin khusus *Reset Jawaban*.

---

## 8. Tab 5: Jadwal Sesi Materi Training (`schedule`)

Akses melalui navigasi **"Jadwal"** (`/peserta/jadwal`).

### Melihat Rundown Pelatihan Harian
Menampilkan kalender kurikulum pelatihan dari hari pertama hingga penutupan.

### Informasi Pemateri, Jam Pelaksanaan, & Ruangan
Tiap sesi materi disajikan dalam kartu terpisah dengan rincian:
- **Judul Sesi Materi:** (Contoh: *Sesi 2 - Sejarah Perjuangan HMI*).
- **Jam Pelaksanaan:** Format waktu WIB (Mulai s/d Selesai).
- **Tanggal Sesi:** Tanggal materi dibawakan.
- **Ruangan / Hall:** Ruang auditorium atau ruang kelas binaan.
- **Nama Pemateri / Speaker:** Instruktur atau narasumber pengisi materi.
- **Deskripsi Materi:** Silabus singkat topik yang akan dibahas.

### Indikator Status Sesi (Akan Datang, Berlangsung, Selesai)
- 🟡 **Akan Datang:** Sesi dijadwalkan pada waktu mendatang (presensi belum dibuka).
- 🟢 **● Berlangsung:** Sesi sedang aktif berjalan di ruangan (segera lakukan presensi masuk).
- ⚪ **Selesai:** Sesi materi telah berakhir.

---

## 9. Tab 6: Riwayat & Rekapitulasi Presensi Diri (`my_attendances`)

Akses melalui navigasi **"Riwayat"** (`/peserta/riwayat-presensi`).

### Monitoring Bar Persentase Kehadiran Mandiri
Di bagian atas halaman, Anda dapat melihat bilah progres persentase kehadiran:
- *Contoh: "8 dari 10 Sesi Dihadiri (80%)"*.
- Batas minimal persentase kelulusan forum umumnya ditetapkan 75% - 80% oleh Panitia Pengarah (SC). Pastikan bilah progres Anda selalu berwarna hijau!

### Sinkronisasi Data Real-Time dengan Server
Tepat di samping judul rekap terdapat tombol **"Sinkron"** (ikon putar):
- Mengklik tombol ini memicu pengambilan data status presensi terbaru langsung dari server database untuk memastikan catatan absensi Anda telah terverifikasi.

### Arti Indikator Status: Hadir, Izin, Belum Absen, dan Alpa
Daftar seluruh sesi menampilkan badge status kehadiran Anda:
- 🟢 **HADIR (Garis Kiri Hijau):** Kehadiran sah terverifikasi, lengkap dengan rekaman stempel jam presensi Anda (misal: *08:14 WIB*).
- 🟡 **IZIN (Garis Kiri Kuning):** Ketidakhadiran dengan izin resmi panitia, lengkap dengan kutipan alasan permohonan izin Anda. Status izin **tidak dihitung sebagai pelanggaran alpa**.
- 🔴 **TIDAK HADIR / ALPA (Garis Kiri Merah):** Peserta tidak hadir tanpa keterangan resmi panitia.
- ⚪ **BELUM ABSEN:** Sesi belum dimulai atau Anda belum memindai barcode presensi.

---

## 10. Tab 7: Helpdesk Bantuan & Permohonan Izin (`helpdesk`)

Akses melalui navigasi **"Helpdesk"** (`/peserta/helpdesk`).

Jika Anda mengalami kendala teknis atau berhalangan hadir pada sesi materi, gunakan fitur ini untuk melapor secara resmi ke panitia.

### Mengirim Tiket Laporan Kendala Lapangan
1. Buka formulir **Kirim Laporan Kendala**.
2. Pilih **Kategori Masalah**:
   - `QR Token Tidak Terbaca Scanner`
   - `Kendala Teknis Quiz / Ujian`
   - `Permohonan Izin / Berhalangan Sesi`
   - `Izin Pindah Ruangan Sesi Lab`
   - `Pertanyaan Lainnya`
3. Pilih **Tingkat Prioritas**:
   - *Normal* (Respon < 30 menit)
   - *Tinggi* (Respon < 10 menit)
   - *Darurat Lapangan* (Penanganan segera oleh panitia di ruangan)
4. Tuliskan rincian kendala secara jelas dan sopan pada kolom pesan.
5. Klik tombol **"Kirim Tiket"**.

### Mengunggah Foto Bukti Kendala / Surat Dokter
- Anda dapat mengklik tombol **"Foto Bukti (Opsional)"** untuk melampirkan berkas foto surat izin dokter, surat tugas kampus, atau screenshot error layar sebelum menekan tombol kirim.

### Live Tracker Status Tiket & Membaca Tanggapan Panitia
Pada kolom sebelah kanan formulir:
- Menampilkan seluruh tiket kendala yang pernah Anda kirimkan lengkap dengan ID Tiket unik (*misal: INC-084*).
- **Badge Status:**
  - 🟡 **Proses:** Tiket sedang dibaca dan ditinjau oleh tim Panitia/Super Admin.
  - 🟢 **Selesai:** Tiket telah dijawab dan diberikan solusi resmi.
- Buka tiket untuk membaca kotak hijau bertuliskan **"Tanggapan Panitia / Admin"** yang berisi instruksi atau konfirmasi persetujuan izin kehadiran Anda.

### Konsultasi Cepat via WhatsApp CS
Jika mengalami kendala darurat yang membutuhkan penanganan telepon langsung:
- Anda dapat menghubungi nomor WhatsApp resmi Panitia Helpdesk melalui tautan layanan darurat yang tersedia di sistem.

---

## 11. Pusat Pengaturan Akun & Keamanan Peserta

Akses melalui Top Bar -> Avatar Profil -> **Pengaturan** (`/peserta/pengaturan`).

### Reset Kata Sandi Akun via OTP Gmail
Untuk melindungi privasi akun Anda dari akses pihak lain:
1. Buka menu Pengaturan -> Panel **Reset Kata Sandi Akun**.
2. Masukkan email akun Anda.
3. Masukkan kata sandi baru yang diinginkan dan konfirmasi kata sandi (minimal 6 karakter).
4. Klik **"Kirim Kode OTP Ke Gmail"**.
5. Buka kotak masuk email (atau folder Spam/Promosi) Gmail Anda untuk melihat 6-digit kode verifikasi OTP.
6. Masukkan 6-digit kode OTP ke aplikasi sebelum batas hitung mundur 60 detik berakhir.
7. Kata sandi akun Anda berhasil diperbarui.

### Memperbarui Email Akun
Jika Anda ingin memindahkan akun ke alamat Gmail aktif lain:
1. Buka Panel **Ubah Alamat Email Utama**.
2. Masukkan alamat Gmail baru.
3. Lakukan verifikasi 6-digit kode OTP yang dikirimkan ke Gmail baru tersebut.
4. Email login Anda otomatis berpindah secara aman.

---

## 12. Tips Praktis & Kendala Umum (FAQ)

### ❓ Pertanyaan 1: Scanner panitia tidak mau mendeteksi QR code di HP saya, apa solusinya?
> **Jawaban:**  
> 1. Naikkan tingkat kecerahan layar HP Anda hingga maksimal (terang).  
> 2. Bersihkan layar HP dari sidik jari atau minyak.  
> 3. Jika tetap gagal, klik tombol **"Zoom Layar Penuh"** pada kartu QR.  
> 4. Sebagai alternatif darurat tercepat, sebutkan **Nomor Presensi Manual (4-6 digit angka)** di bawah barcode Anda kepada panitia.

### ❓ Pertanyaan 2: Apakah saya boleh membuka browser lain untuk mencari jawaban saat ujian kuis berlangsung?
> **Jawaban:**  
> **SANGAT TIDAK BOLEH!** Sistem PresenTrain mendeteksi setiap perpindahan tab browser atau pembukaan aplikasi lain. Pada peringatan ke-3, ujian Anda otomatis ditutup paksa dan jawaban langsung diserahkan apa adanya.

### ❓ Pertanyaan 3: Saya tiba-tiba sakit dan tidak bisa hadir di sesi materi siang ini, bagaimana cara izin?
> **Jawaban:**  
> Buka tab **Helpdesk Bantuan**, pilih kategori *"Permohonan Izin / Berhalangan Sesi"*, tuliskan alasan sakit, dan lampirkan foto surat dokter/keterangan. Setelah panitia menyetujui tiket Anda, status kehadiran Anda otomatis berubah menjadi **IZIN** dan persentase kelulusan Anda tetap aman.

### ❓ Pertanyaan 4: Kuota internet saya habis mendadak di lokasi pelatihan, apakah presensi saya hilang?
> **Jawaban:**  
> Tidak. Kode QR presensi Anda bersifat **statis dan permanen**. Anda cukup menunjukkan screenshot atau foto barcode QR Anda kepada panitia. Kamera scanner panitia yang terhubung ke internet akan memverifikasi dan mencatat kehadiran Anda ke server secara otomatis.

---

*Dokumen ini diterbitkan oleh Pengelola Sistem PresenTrain sebagai pedoman resmi operasional seluruh peserta pelatihan.*
