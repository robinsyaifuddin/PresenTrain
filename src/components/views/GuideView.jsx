import React, { useState, useMemo } from 'react';
import { 
  BookOpen, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, 
  User, ShieldCheck, QrCode, FileText, BarChart3, Clock, 
  Search, HelpCircle, AlertCircle, Layers, GraduationCap, Users, 
  Calendar, KeyRound, Download, RefreshCw, Send, CheckSquare, 
  ExternalLink, ShieldAlert, BadgeCheck, Info
} from 'lucide-react';
import { normalizeRole } from '@/routes/routeConfig';

export default function GuideView({ user, onBack }) {
  const userRole = normalizeRole(user?.role);
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin';
  const isPeserta = userRole === 'participant';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('ALL');

  // ==========================================
  // 1. PANDUAN KHUSUS ADMINISTRATOR UTAMA (SUPER ADMIN)
  // Bahasa jelas tanpa kode string teknis (tanpa overview, quiz_management, dll)
  // ==========================================
  const superAdminGuides = useMemo(() => [
    {
      category: 'Dasbor & Event',
      title: '1. Kendali Beranda, Status Sesi & Banner Slider Kegiatan',
      desc: 'Pengoperasian halaman Beranda, pengubah status sesi materi, pemantauan riwayat aktivitas sistem, dan banner slider dokumentasi.',
      tip: 'Status sesi pelatihan dapat diubah kapan saja langsung dari kartu sesi materi (Pilihan: Akan Datang, Sedang Berlangsung, atau Selesai) tanpa perlu memuat ulang halaman.',
      steps: [
        'Buka menu Beranda pada bilah navigasi utama. Anda dapat melihat kartu selamat datang yang menampilkan 3 ringkasan statistik (Total Sesi, Admin Panitia Aktif, dan Total Peserta).',
        'Gunakan 6 tombol menu cepat di samping kartu sambutan untuk berpindah cepat ke modul utama, atau langsung klik tombol Ekspor Rekap untuk mengunduh rekapitulasi nilai dan kehadiran dalam format Excel.',
        'Pantau 4 kartu indikator aktivitas server: Aktivitas Hari Ini, Proses Berhasil, Percobaan Gagal/Ditolak, dan Total Seluruh Catatan Riwayat.',
        'Pada daftar Sesi Pelatihan: Klik tombol status di sudut bawah kartu sesi untuk memilih status materi: Akan Datang (belum dimulai), Sedang Berlangsung (kamera scanner aktif dibuka), atau Selesai.',
        'Untuk mengatur banner dokumentasi: Buka menu Event & Sesi, klik tombol Edit Informasi Event. Anda dapat mengunggah beberapa foto dokumentasi sekaligus untuk dijadikan banner berjalan, atau menghapus foto yang tidak lagi digunakan.',
        'Lengkapi juga nama resmi kegiatan, lokasi ruangan/gedung, serta rentang tanggal mulai hingga tanggal selesai kegiatan.'
      ]
    },
    {
      category: 'Kelas & Evaluasi',
      title: '2. Manajemen Pembagian Kelas & Pengaturan Hak Akses Panitia',
      desc: 'Pembuatan kelompok kelas binaan, alokasi pembagian peserta, penugasan admin pendamping, dan pembagian wewenang panitia.',
      tip: 'Setiap peserta yang baru mendaftar atau belum ditempatkan ke kelas binaan tertentu akan secara otomatis berada di Kelas Umum.',
      steps: [
        'Buka menu Manajemen Kelas pada navigasi samping. Klik tombol Tambah Kelas Baru untuk membuat kelompok kelas binaan baru (misalnya: Kelas A - Lafran Pane).',
        'Klik tombol menu titik tiga pada kartu kelas yang dipilih, lalu pilih Kelola Admin untuk menunjuk panitia yang bertugas mendampingi kelas tersebut.',
        'Atur izin fitur yang diberikan kepada masing-masing panitia kelas: Izin Memindai Barcode Presensi, Izin Pengisian Nilai Peserta, serta Izin Mengelola Kuis Evaluasi.',
        'Klik tombol Lihat Detail pada kartu kelas untuk melihat 3 tab informasi: Daftar Peserta Kelas, Panitia Pembina Kelas, dan Rekapitulasi Nilai.',
        'Apabila suatu kelas dihapus, data peserta di dalamnya tidak akan hilang melainkan otomatis dikembalikan ke status Kelas Umum.'
      ]
    },
    {
      category: 'Kelas & Evaluasi',
      title: '3. Lembar Kerja Rekapitulasi Nilai & Koreksi Data Langsung',
      desc: 'Pengoperasian lembar kerja evaluasi multi-halaman (7 lembar penilaian), koreksi nilai langsung pada tabel, dan pencatatan riwayat perubahan.',
      tip: 'Setiap kali melakukan koreksi angka nilai, Anda dapat menyertakan catatan alasan perubahan agar riwayat pembaharuan tercatat secara transparan bagi tim instruktur.',
      steps: [
        'Buka menu Manajemen Kelas, pilih kelas yang diinginkan, lalu buka tab Rekapitulasi Nilai untuk menampilkan lembar kerja terpadu.',
        'Pilih salah satu lembar penilaian yang tersedia: Total Nilai Akhir, Screening Masuk, Absensi Kehadiran, Keaktifan Forum, Rekapitulasi Aktivitas, Penugasan Resume, atau Nilai Ujian Tulis.',
        'Untuk mengubah nilai, aktifkan tombol Edit Nilai. Klik langsung pada kotak angka yang ingin diperbaiki.',
        'Ketikkan angka nilai yang baru dan masukkan alasan perbaikan data pada kolom keterangan yang tersedia.',
        'Klik tombol Simpan Perubahan. Sistem akan memperbarui database nilai secara otomatis dan mencatat riwayat perubahan tersebut ke dalam log riwayat.'
      ]
    },
    {
      category: 'Bank Soal & Kuis',
      title: '4. Pembuat Kuis Evaluasi & Pengawasan Integritas Ujian',
      desc: 'Penyusunan paket soal Pre-Test dan Post-Test, pengaturan batas durasi ujian, bobot penilaian, kunci jawaban, dan proteksi dari kecurangan.',
      tip: 'Sistem pengawas ujian mencatat setiap kali peserta mencoba berpindah tab atau membuka aplikasi lain: Peringatan ke-1 (Kuning), Peringatan ke-2 (Merah), dan pada pelanggaran ke-3 lembar jawaban akan langsung dikumpulkan paksa oleh sistem.',
      steps: [
        'Buka menu Kelola Kuis pada navigasi utama. Klik tombol Buat Kuis Baru untuk membuka formulir penyusun soal interaktif.',
        'Isi judul kuis, petunjuk pengerjaan, jenis kuis (Ujian Awal / Pre-Test atau Ujian Akhir / Post-Test), batas waktu pengerjaan dalam menit, dan batas nilai kelulusan.',
        'Tambahkan butir pertanyaan Pilihan Ganda (masukkan pilihan A, B, C, D serta tandai kunci jawaban yang benar) atau pertanyaan Uraian/Essay, lalu tentukan bobot nilai masing-masing soal.',
        'Gunakan tombol Duplikat Kuis jika Anda ingin menduplikasi paket soal yang sama untuk kelas pelatihan lain tanpa harus mengetik ulang.',
        'Pada menu Hasil & Koreksi, Anda dapat memantau perolehan skor peserta, memeriksa jawaban uraian, atau menekan tombol Reset Jawaban apabila peserta mengalami kendala teknis dan diizinkan mengulang.'
      ]
    },
    {
      category: 'Panitia & Akses',
      title: '5. Pengelolaan Akun Panitia & Pengaturan Wewenang Fitur',
      desc: 'Pendaftaran panitia baru, reset kata sandi default, penonaktifan akun, dan pembagian tugas per kelas.',
      tip: 'Kata sandi awal untuk akun panitia yang baru didaftarkan adalah "AdminPanitia123!". Kata sandi ini dapat direset sewaktu-waktu oleh Admin Utama jika panitia lupa sandi.',
      steps: [
        'Buka menu Admin Panitia pada navigasi utama. Klik tombol Tambah Admin Baru untuk mendaftarkan panitia pelaksana.',
        'Lengkapi formulir pendaftaran: nama lengkap, alamat email login, nomor WhatsApp, divisi kepanitiaan, dan status akun.',
        'Pada tabel daftar panitia, klik tombol menu titik tiga di samping nama panitia, lalu pilih Edit Akses untuk mengatur wewenang fitur.',
        'Atur wewenang menggunakan tombol sakelar aktif/nonaktif: Akses Pemindai Presensi, Akses Penilaian Peserta, Akses Pengelolaan Kuis, serta Status Akun Aktif.',
        'Pilih opsi Atur Kelas untuk menentukan kelas binaan mana saja yang menjadi wilayah tanggung jawab panitia tersebut.',
        'Jika panitia lupa kata sandi login, buka formulir ubah data lalu tekan tombol Reset Password Admin agar kata sandi kembali ke format awal.'
      ]
    },
    {
      category: 'Peserta & Presensi',
      title: '6. Master Data Peserta, Presensi Manual & Pemindahan Kelas Massal',
      desc: 'Pendaftaran peserta, pembuatan kode barcode QR unik 6-digit, filter pencarian, pemindahan kelas serentak, dan pencatatan izin berhalangan.',
      tip: 'Gunakan kotak centang pada daftar tabel peserta untuk memindahkan puluhan peserta ke kelas binaan secara bersamaan dalam satu langkah.',
      steps: [
        'Buka menu Master Peserta pada navigasi utama. Klik tombol Tambah Peserta Baru untuk mendaftarkan peserta satu per satu.',
        'Sistem akan secara otomatis membuatkan akun login dengan kata sandi awal "Peserta123!" sekaligus menghasilkan nomor token barcode 6-digit unik.',
        'Untuk memindahkan banyak peserta sekaligus: Centang kotak di samping nama-nama peserta yang diinginkan, klik tombol Masukkan ke Kelas pada bilah aksi yang muncul di atas tabel, pilih kelas tujuan, lalu simpan.',
        'Untuk presensi darurat di lapangan tanpa pemindai kamera: Klik menu titik tiga pada baris peserta, lalu pilih Set Hadir (waktu presensi otomatis tercatat) atau Set Tidak Hadir.',
        'Apabila peserta berhalangan hadir: Pilih menu Izin / Berhalangan, lalu masukkan keterangan resmi (misal: sakit atau tugas kampus) agar status kehadiran tidak terhitung alpa.'
      ]
    },
    {
      category: 'Keamanan & Sistem',
      title: '7. Catatan Riwayat Aktivitas, Mode Pemeliharaan & Pusat Bantuan',
      desc: 'Pemeriksaan riwayat aktivitas sistem, aktivasi layar pemeliharaan darurat, keamanan kode verifikasi email, dan penanganan tiket keluhan.',
      tip: 'Mode Pemeliharaan digunakan saat perbaikan sistem. Saat diaktifkan, peserta dan panitia biasa akan melihat layar pemberitahuan pemeliharaan, sementara Admin Utama tetap dapat mengakses sistem dengan normal.',
      steps: [
        'Buka menu Audit Log untuk memantau seluruh catatan aktivitas sistem secara langsung (waktu kejadian, identitas pengguna, modul sistem, alamat IP, dan status keberhasilan).',
        'Klik tombol ikon mata pada baris catatan riwayat untuk memeriksa rincian data masukan secara mendalam.',
        'Mode Pemeliharaan: Pada pengaturan situs, aktifkan tombol Mode Pemeliharaan apabila server sedang diperbarui atau mengalami kendala teknis.',
        'Pengaturan Akun: Gunakan menu Pengaturan pada menu profil pojok kanan atas untuk mengganti kata sandi atau memperbarui email melalui verifikasi kode 6-digit yang dikirim ke email.',
        'Pusat Bantuan: Buka menu Helpdesk & Layanan untuk membaca pesan keluhan dari peserta atau panitia, lalu ketikkan solusi penyelesaian langsung pada tiket terkait.'
      ]
    },
    {
      category: 'Ekspor & Laporan',
      title: '8. Ekspor Berkas Excel Data Peserta & Rekapitulasi Presensi Sesi',
      desc: 'Pengunduhan laporan data peserta dan matriks kehadiran seluruh materi ke dalam format dokumen Excel resmi yang rapi.',
      tip: 'Berkas rekapitulasi Excel telah dilengkapi pewarnaan otomatis: Hijau (Hadir beserta stempel jam), Kuning (Izin beserta alasan), dan Abu-abu (Belum Absen / Alpa).',
      steps: [
        'Ekspor Data Induk Peserta: Pada menu Master Peserta, klik tombol Ekspor Excel Peserta untuk mengunduh dokumen daftar peserta terurut rapi dari A sampai Z.',
        'Ekspor Rekapitulasi Presensi: Pada halaman Beranda, klik kotak Ekspor Rekap (atau melalui menu Rekap) untuk mengunduh matriks kehadiran seluruh sesi pelatihan.',
        'Periksa baris bagian bawah berkas Excel untuk melihat persentase kehadiran masing-masing peserta serta total kehadiran pada setiap materi pelatihan.'
      ]
    }
  ], []);

  // ==========================================
  // 2. PANDUAN KHUSUS PANITIA / ADMINISTRATOR
  // Operasional Scanner Kamera, Kelas Binaan, Penilaian, Kuis & Helpdesk
  // ==========================================
  const adminGuides = useMemo(() => [
    {
      category: 'Scanner & Absensi',
      title: '1. Pengoperasian Pemindai Barcode Kamera & Verifikasi Peserta',
      desc: 'Panduan panitia lapangan dalam memindai kode barcode QR peserta saat sesi materi dibuka.',
      tip: 'Pastikan peramban internet diizinkan mengakses kamera HP atau laptop Anda. Arahkan kamera tegak lurus ke layar HP peserta dengan pencahayaan yang cukup.',
      steps: [
        'Buka menu Pemindai Barcode pada navigasi utama.',
        'Pilih sesi materi yang sedang berlangsung. Jika status sesi masih bertuliskan "Akan Datang", hubungi Admin Utama untuk mengaktifkan sesi menjadi "Sedang Berlangsung".',
        'Klik tombol Buka Scanner Kamera dan izinkan akses kamera pada perangkat Anda.',
        'Arahkan kamera ke layar barcode peserta. Saat kode berhasil dibaca, sistem akan mengeluarkan suara notifikasi dan menandai kehadiran peserta seketika lengkap dengan jam kehadiran.',
        'Tersedia tombol Ganti Kamera untuk memilih kamera belakang atau kamera depan, serta tombol Mode Layar Penuh untuk memperluas jangkauan bidik pemindai.'
      ]
    },
    {
      category: 'Scanner & Absensi',
      title: '2. Presensi Cepat, Nomor Manual & Penanganan Kendala Scan',
      desc: 'Solusi darurat jika layar HP peserta redup, retak, atau kuota internet peserta habis di lokasi pelatihan.',
      tip: 'Jika barcode peserta sulit dipindai, gunakan kolom Input Token Cepat untuk memasukkan nomor manual yang tertera di bawah barcode peserta.',
      steps: [
        'Input Token Cepat: Ketikkan 6-digit nomor manual presensi peserta pada kolom masukan cepat di samping pemindai, lalu tekan tombol Verifikasi.',
        'Presensi Manual Sesi: Anda juga dapat mencari nama peserta pada daftar sesi aktif, lalu memilih opsi Set Hadir secara langsung.',
        'Jika peserta berhalangan hadir: Pilih opsi Izin / Berhalangan lalu masukkan keterangan resmi agar persentase kehadiran peserta tidak terhitung alpa.',
        'Sistem otomatis mencegah presensi ganda: Jika peserta sudah pernah dipindai pada sesi yang sama, layar akan menampilkan notifikasi bahwa peserta telah tercatat sebelumnya.'
      ]
    },
    {
      category: 'Peserta & Kelas',
      title: '3. Pengelolaan Daftar Peserta & Pemantauan Kehadiran Kelas',
      desc: 'Melihat daftar anggota kelas binaan, memeriksa status absensi, dan memverifikasi identitas peserta.',
      tip: 'Gunakan pilihan dropdown kelas pada bilah atas untuk memfokuskan tampilan hanya pada peserta kelas yang menjadi wilayah pendampingan Anda.',
      steps: [
        'Buka menu Daftar Peserta pada bilah navigasi utama untuk melihat seluruh anggota peserta kelas binaan Anda.',
        'Gunakan kolom pencarian untuk menemukan nama peserta berdasarkan nama lengkap, alamat email, atau asal lembaga/komisariat.',
        'Klik foto profil peserta untuk melihat kartu identitas lengkap, nomor kontak, serta riwayat kehadiran mereka pada setiap sesi materi.',
        'Pantau indikator status kehadiran peserta pada masing-masing sesi materi (Hadir, Izin, atau Belum Absen).'
      ]
    },
    {
      category: 'Evaluasi & Nilai',
      title: '4. Pengisian Nilai Akademis, Keaktifan Forum & Resume Materi',
      desc: 'Merekap nilai harian peserta, keaktifan diskusi, kedisiplinan, dan tugas resume materi.',
      tip: 'Hanya panitia yang telah diberikan wewenang "Penilaian Peserta" oleh Admin Utama yang dapat memasukkan atau mengubah angka nilai evaluasi.',
      steps: [
        'Buka menu Rekap Data pada bilah navigasi sesuai pembagian tugas pendampingan kelas Anda.',
        'Pilih nama peserta yang ingin dinilai untuk membuka formulir lembar penilaian kader.',
        'Masukkan nilai keaktifan forum, ketertiban, resume materi, dan aspek penilaian kader lainnya sesuai rubrik instruktur.',
        'Klik tombol Simpan Nilai. Skor yang dimasukkan akan langsung terakumulasi ke dalam nilai akhir peserta secara otomatis.'
      ]
    },
    {
      category: 'Evaluasi & Nilai',
      title: '5. Lembar Kerja Rekapitulasi & Koreksi Nilai Terpadu',
      desc: 'Pengoperasian lembar penilaian terintegrasi multi-kategori dan perbaikan angka nilai peserta.',
      tip: 'Pastikan seluruh komponen nilai (screening, absensi, keaktifan, tugas, dan ujian) telah terisi lengkap sebelum penutupan forum pelatihan.',
      steps: [
        'Buka modul Rekap Data untuk menampilkan rekapitulasi penilaian kelas secara menyeluruh.',
        'Pilih lembar evaluasi yang ingin ditinjau: Nilai Screening, Presensi Kehadiran, Aktivitas Forum, Penugasan Resume, atau Ujian Tulis.',
        'Periksa rekapitulasi persentase kehadiran masing-masing peserta untuk memastikan peserta memenuhi syarat minimal kelulusan forum.',
        'Jika terdapat koreksi nilai, ubah angka pada kolom yang bersangkutan lalu simpan agar perolehan nilai akhir terbarui.'
      ]
    },
    {
      category: 'Kuis & Evaluasi',
      title: '6. Monitoring Pelaksanaan Ujian Pre-Test & Post-Test',
      desc: 'Memantau peserta yang sedang mengerjakan ujian evaluasi serta melihat perolehan skor nilai ujian.',
      tip: 'Pantau daftar pengumpulan lembar jawaban secara langsung selama sesi ujian berlangsung untuk memastikan seluruh peserta telah mengumpulkan ujian.',
      steps: [
        'Buka menu Quiz & Evaluasi pada bilah navigasi utama.',
        'Pilih paket kuis aktif yang sedang dikerjakan peserta untuk melihat daftar peserta yang telah mengumpulkan lembar jawaban secara langsung.',
        'Periksa perolehan nilai otomatis untuk soal pilihan ganda, dan tinjau jawaban uraian/essay untuk memberikan penilaian yang objektif.',
        'Apabila peserta mengalami kendala teknis jaringan saat kuis berlangsung, laporkan kepada Admin Utama untuk diberikan persetujuan reset ujian.'
      ]
    },
    {
      category: 'Helpdesk & Bantuan',
      title: '7. Penanganan Kendala Lapangan & Tiket Permohonan Izin',
      desc: 'Merespon tiket laporan masalah dari peserta dan memberikan persetujuan izin berhalangan.',
      tip: 'Setiap permohonan izin dari peserta yang disetujui akan otomatis mengubah status presensi sesi peserta menjadi Izin tanpa mengurangi persentase kelulusan.',
      steps: [
        'Buka menu Helpdesk Kendala pada bilah navigasi untuk melihat daftar tiket permohonan atau kendala yang dikirimkan oleh peserta.',
        'Filter tiket berdasarkan status: Semua Tiket, Sedang Diproses, atau Selesai.',
        'Buka tiket kendala yang masuk untuk membaca rincian keluhan serta memeriksa foto bukti (seperti surat dokter atau surat tugas) yang dilampirkan peserta.',
        'Ketikkan jawaban solusi atau tanggapan resmi pada kolom balasan, lalu ubah status tiket menjadi Selesai.',
        'Solusi yang Anda kirimkan akan langsung tampil pada layar HP peserta yang bersangkutan.'
      ]
    },
    {
      category: 'Ekspor & Laporan',
      title: '8. Ekspor Dokumen Excel Rekapitulasi Presensi & Nilai Kelas',
      desc: 'Mengunduh berkas laporan kehadiran dan rekapitulasi evaluasi kelas ke dalam format dokumen spreadsheet Excel resmi.',
      tip: 'Dokumen Excel yang diunduh sudah tertata rapi lengkap dengan kop resmi dan siap dicetak untuk arsip administrasi Panitia Pengarah (SC).',
      steps: [
        'Buka menu Rekap Data pada navigasi utama.',
        'Pastikan kelas binaan yang ingin diekspor telah dipilih pada pilihan kelas di bilah atas.',
        'Klik tombol Ekspor Excel di bagian atas tabel rekapitulasi data.',
        'Sistem akan otomatis menghasilkan berkas dokumen Excel (.xlsx) lengkap dengan data nama peserta, asal komisariat, rincian kehadiran per sesi, dan rekap nilai akhir.',
        'Buka berkas di Microsoft Excel atau Google Sheets untuk mencetak laporan resmi kegiatan.'
      ]
    }
  ], []);

  // ==========================================
  // 3. PANDUAN KHUSUS PESERTA PELATIHAN
  // Sesuai PANDUAN_PESERTA.md secara lengkap & terperinci (8 Topik Komprehensif)
  // ==========================================
  const pesertaGuides = useMemo(() => [
    {
      category: 'Presensi Digital',
      title: '1. Menampilkan & Menggunakan Kartu Barcode Presensi Digital',
      desc: 'Petunjuk praktis peserta saat hadir di lokasi dan memasuki ruangan sesi materi pelatihan.',
      tip: 'Tingkatkan kecerahan layar HP Anda hingga maksimal agar kamera pemindai panitia dapat membaca kode barcode dalam hitungan detik.',
      steps: [
        'Masuk ke portal PresenTrain menggunakan alamat email dan kata sandi yang telah dibagikan panitia.',
        'Pada halaman Beranda, klik tombol Barcode Saya atau buka menu Profil & QR untuk menampilkan kartu barcode pribadi.',
        'Kode barcode QR statis resmi dan 6-digit nomor unik presensi manual Anda akan langsung tampil di layar.',
        'Tunjukkan kode barcode tersebut kepada panitia di pintu masuk ruangan untuk dipindai saat sesi materi dimulai.',
        'Setelah scanner panitia berbunyi sukses, status kehadiran Anda akan langsung tercatat Hadir lengkap dengan rekaman stempel jam kedatangan.',
        'Anda juga dapat mengklik tombol Unduh Gambar QR untuk menyimpan gambar barcode beresolusi tinggi ke galeri HP agar dapat digunakan tanpa membuka peramban.'
      ]
    },
    {
      category: 'Presensi Digital',
      title: '2. Nomor Presensi Manual, Unduh Barcode HD & Cetak ID Card',
      desc: 'Solusi cadangan saat layar HP bermasalah, penyimpanan barcode ke galeri, dan pencetakan kartu tanda peserta resmi.',
      tip: 'Nomor Presensi Manual (4-6 digit angka tebal) di bawah barcode adalah solusi tercepat jika layar HP Anda pecah, baterai hampir habis, atau pemindai panitia terkendala pantulan cahaya.',
      steps: [
        'Jika pemindai panitia kesulitan membaca layar Anda: Cukup sebutkan Nomor Presensi Manual yang tertera tepat di bawah barcode Anda kepada petugas di pintu.',
        'Untuk memperbesar barcode di layar: Klik tombol Zoom Layar Penuh pada kartu barcode agar tampilan kode memenuhi layar dengan latar putih bersih.',
        'Untuk mengunduh barcode resmi: Klik tombol Unduh Gambar QR (PNG) untuk menyimpan berkas beresolusi Full HD (1200 x 1200 piksel) yang siap dijadikan gambar latar kunci layar HP.',
        'Untuk mengunduh atau mencetak kartu tanda peserta: Buka menu Profil, pilih tab Kartu Digital, lalu klik tombol Unduh Kartu Peserta untuk format JPG HD atau Cetak Kartu untuk mencetak ke kertas.'
      ]
    },
    {
      category: 'Pemindai Kamera',
      title: '3. Pemindai Kamera Mandiri & Antrean Cerdas Server',
      desc: 'Pengoperasian kamera mandiri peserta saat presensi barcode layar proyektor serta sistem antrean backend.',
      tip: 'Jika panitia memajang barcode sesi di layar infocus auditorium, gunakan menu Scan Absensi untuk memindai barcode tersebut secara mandiri.',
      steps: [
        'Buka menu Scan Absensi pada halaman Beranda dan berikan izin peramban untuk mengakses kamera perangkat HP Anda.',
        'Gunakan tombol Ganti Kamera untuk beralih antara kamera belakang dan kamera depan sesuai kebutuhan sudut pengambilan.',
        'Tersedia tombol Mode Cermin untuk membalik orientasi layar serta tombol Layar Penuh untuk memperluas bidang bidik pemindai.',
        'Arahkan kotak bidik kamera ke kode barcode sesi yang ditampilkan oleh panitia di layar proyektor.',
        'Sistem Antrean Cerdas: Jika ratusan peserta memindai secara bersamaan, layar antrean akan menampilkan progres pemrosesan (0% - 100%) dan otomatis memberikan nada konfirmasi sukses begitu data Anda berhasil dicatat.'
      ]
    },
    {
      category: 'Ujian & Evaluasi',
      title: '4. Pelaksanaan Kuis Pre-Test & Post-Test Daring',
      desc: 'Tata cara mengerjakan kuis evaluasi pilihan ganda dan uraian essay secara daring di portal pelatihan.',
      tip: 'Sebelum menekan tombol Mulai Kerjakan Sekarang, pastikan koneksi internet Anda stabil dan perhatikan batas waktu pengerjaan.',
      steps: [
        'Buka menu Quiz Ujian pada navigasi utama atau menu cepat Beranda.',
        'Pilih kuis yang sedang berstatus aktif (misalnya: Pre-Test Wawasan Kebangsaan atau Post-Test Evaluasi Akhir).',
        'Bacalah judul, durasi pengerjaan dalam menit, dan batas nilai kelulusan dengan seksama.',
        'Klik tombol Mulai Kerjakan Sekarang untuk membuka lembar soal layar penuh. Waktu hitung mundur akan mulai berjalan otomatis di sudut atas.',
        'Pilih opsi jawaban yang benar untuk soal pilihan ganda dan ketikkan uraian pemahaman Anda pada kolom soal essay.',
        'Gunakan nomor navigasi soal di bagian bawah untuk berpindah soal secara bebas, lalu klik Kumpulkan / Submit Jawaban jika seluruh pertanyaan telah terjawab.'
      ]
    },
    {
      category: 'Ujian & Evaluasi',
      title: '5. Pengawasan Anti-Kecurangan & Penguncian Nilai Ujian',
      desc: 'Aturan ketat integritas ujian, larangan perpindahan tab peramban, batas peringatan, dan penguncian hasil.',
      tip: 'Dilarang keras beralih ke tab peramban lain, membuka WhatsApp, atau beralih ke aplikasi lain selama ujian berlangsung!',
      steps: [
        'Sistem pengawas ujian bekerja secara otomatis memantau fokus layar peramban Anda.',
        'Pelanggaran ke-1: Muncul kotak peringatan Kuning yang memberitahukan bahwa Anda terdeteksi meninggalkan layar ujian.',
        'Pelanggaran ke-2: Muncul kotak peringatan Merah Keras sebagai peringatan terakhir.',
        'Pelanggaran ke-3: Sistem akan secara otomatis mengunci ujian, membatalkan sisa waktu, dan memaksa penyerahan seluruh lembar jawaban saat itu juga.',
        'Tombol muat ulang (refresh) dan tombol kembali pada peramban otomatis dinonaktifkan demi menjaga integritas waktu pengerjaan.',
        'Setelah diserahkan, skor kuis pilihan ganda langsung dihitung otomatis dan status lembar jawaban terkunci secara permanen di database panitia.'
      ]
    },
    {
      category: 'Tugas & Resume',
      title: '6. Pengumpulan Tugas & Resume Materi ke Google Drive',
      desc: 'Standar penamaan berkas resume, akses tautan folder Google Drive kelas, dan format pengumpulan dokumen.',
      tip: 'Selalu gunakan format penamaan berkas resmi agar berkas tugas Anda mudah diverifikasi oleh tim instruktur pembina kelas.',
      steps: [
        'Buka menu Quiz Ujian pada halaman evaluasi belajar.',
        'Pada bagian atas daftar kuis, perhatikan panel kartu Pengumpulan Tugas kelas binaan Anda.',
        'Format Penamaan Berkas Resmi: Gunakan format Nama_Asal Komisariat_Kelas_Nama Tugas.pdf (Contoh: Anita Wijaya_Komisariat Tarbiyah_Kelas A_Resume Materi Konstitusi.pdf).',
        'Klik tombol hijau Buka Google Drive untuk membuka folder penyimpanan tugas kelas Anda di tab baru peramban.',
        'Unggah berkas resume materi dalam format PDF ke dalam folder kelas tersebut sebelum batas waktu pengumpulan berakhir.'
      ]
    },
    {
      category: 'Jadwal & Rekap',
      title: '7. Monitoring Rundown Materi, Sesi & Persentase Kelulusan Diri',
      desc: 'Melihat kalender materi pelatihan harian, ruangan, instruktur pengisi, dan batas minimal kelulusan presensi.',
      tip: 'Panitia Pengarah (SC) umumnya menetapkan batas minimal kehadiran sebesar 75% - 80% sebagai syarat mutlak kelulusan forum.',
      steps: [
        'Buka menu Jadwal Training untuk melihat daftar materi lengkap dari hari pertama hingga penutupan, jam pelaksanaan (WIB), lokasi ruangan kelas, dan nama instruktur narasumber.',
        'Perhatikan tanda status sesi pada jadwal: Akan Datang (materi belum dimulai), Sedang Berlangsung (materi aktif dan presensi dibuka), atau Selesai.',
        'Buka menu Riwayat Presensi untuk memantau daftar materi yang telah Anda ikuti beserta garis persentase kehadiran kumulatif Anda.',
        'Gunakan tombol Sinkron di samping judul rekapitulasi untuk memastikan catatan kehadiran Anda telah sesuai dengan catatan server pusat.',
        'Periksa status pada setiap sesi: Hadir (garis hijau beserta jam scan), Izin (garis kuning beserta alasan resmi), atau Belum Absen.'
      ]
    },
    {
      category: 'Bantuan & Akun',
      title: '8. Pengajuan Izin Resmi, Tiket Helpdesk & Pengaturan Keamanan Akun',
      desc: 'Pengiriman permohonan izin berhalangan hadir dengan bukti foto, pelaporan kendala teknis, dan reset sandi via email.',
      tip: 'Jika berhalangan hadir karena sakit atau dinas mendesak, segera kirimkan permohonan izin melalui Helpdesk agar kehadiran Anda tercatat sebagai Izin dan tidak terhitung alpa.',
      steps: [
        'Mengajukan Izin atau Lapor Masalah: Buka menu Helpdesk Lapangan, pilih kategori kendala (misalnya: Permohonan Izin / Berhalangan atau Barcode Tidak Terbaca), dan tentukan tingkat prioritas laporan.',
        'Tuliskan keterangan permohonan secara jelas dan lampirkan foto bukti pendukung (seperti surat keterangan dokter atau surat tugas) melalui tombol Foto Bukti.',
        'Klik Kirim Tiket. Pantau kolom Riwayat Tiket di sebelah kanan untuk melihat persetujuan atau tanggapan solusi resmi dari panitia.',
        'Pengaturan Keamanan Sandi: Buka menu Pengaturan pada menu profil sudut kanan atas untuk mengubah kata sandi akun.',
        'Ketikkan kata sandi baru yang diinginkan, klik Kirim Kode OTP Ke Gmail, lalu periksa kotak masuk email Anda untuk memasukkan 6-digit kode verifikasi sebelum waktu 60 detik berakhir.'
      ]
    }
  ], []);

  // Filter berdasarkan Role pengguna aktif
  const currentGuides = useMemo(() => {
    if (isSuperAdmin) return superAdminGuides;
    if (isAdmin) return adminGuides;
    return pesertaGuides;
  }, [isSuperAdmin, isAdmin, superAdminGuides, adminGuides, pesertaGuides]);

  // Kategori unik untuk pill filter
  const categories = useMemo(() => {
    const set = new Set(currentGuides.map(g => g.category));
    return ['ALL', ...Array.from(set)];
  }, [currentGuides]);

  // Filter gabungan (kategori + pencarian teks)
  const filteredGuides = useMemo(() => {
    return currentGuides.filter(g => {
      const matchCat = activeCategory === 'ALL' || g.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        g.title.toLowerCase().includes(q) || 
        g.desc.toLowerCase().includes(q) || 
        g.steps.some(s => s.toLowerCase().includes(q)) ||
        (g.tip && g.tip.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [currentGuides, activeCategory, searchQuery]);

  const handleToggleAccordion = (idx) => {
    if (expandedIndex === idx) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(idx);
      // Scroll langsung dan mulus ke bagian atas item yang dibuka
      setTimeout(() => {
        const el = document.getElementById(`guide-item-${idx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans animate-fade-in w-full">
      
      {/* Top Header Bar dengan Tombol Kembali (Tanpa Icon Buku Hijau) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-slate-600 hover:text-emerald-700 font-bold text-xs flex items-center space-x-1.5 underline underline-offset-4 cursor-pointer transition-colors w-fit mb-2"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </button>
          )}

          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {isSuperAdmin && 'Panduan Penggunaan — Administrator Utama'}
              {isAdmin && 'Panduan Penggunaan — Panitia & Operator'}
              {isPeserta && 'Panduan Penggunaan — Peserta Pelatihan'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isSuperAdmin && 'Petunjuk lengkap pengelolaan kegiatan, pembagian kelas, bank soal kuis, data peserta, dan pemantauan sistem.'}
              {isAdmin && 'Petunjuk operasional pemindai barcode presensi, pengelolaan kelas binaan, dan penilaian peserta.'}
              {isPeserta && 'Petunjuk praktis kartu presensi digital, pengerjaan kuis daring, jadwal kegiatan, dan bantuan.'}
            </p>
          </div>
        </div>

        {/* Badge Identitas Peran */}
        <div className="shrink-0 self-start sm:self-center">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200">
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {isSuperAdmin && 'Peran: Administrator Utama'}
              {isAdmin && 'Peran: Panitia Pelaksana'}
              {isPeserta && 'Peran: Peserta Pelatihan'}
            </span>
          </span>
        </div>
      </div>

      {/* Hero Banner Panduan (Tema Hijau Terang Khas PresenTrain) */}
      <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-teal-500/10 border border-emerald-500/30 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 block">
              Pusat Informasi & Petunjuk Teknis PresenTrain
            </span>
            <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-snug">
              {isSuperAdmin && 'Panduan Standar Operasional Administrator Utama'}
              {isAdmin && 'Panduan Operasional Panitia Pelaksana & Penilaian'}
              {isPeserta && 'Panduan Penggunaan Mandiri: Presensi, Ujian & Jadwal'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-emerald-200/80 shadow-2xs">
            <div className="text-center px-2">
              <span className="block text-lg font-black text-emerald-800 leading-none">{currentGuides.length}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Topik Panduan</span>
            </div>
            <div className="w-px h-7 bg-slate-200" />
            <div className="text-center px-2">
              <span className="block text-lg font-black text-emerald-800 leading-none">Resmi</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Terverifikasi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Kategori (Dropdown) & Kotak Pencarian Tepat Bersebelahan di Sebelah Kiri */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3">
        {/* Category Dropdown Selector */}
        <div className="relative w-full sm:w-60">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 transition-colors shadow-2xs cursor-pointer appearance-none pr-9"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'Semua Topik Panduan' : cat}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Search Input Box (Tepat Bersebelahan di Sisi Kiri) */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari topik atau langkah panduan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-600 transition-colors shadow-2xs placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Accordion List Panduan */}
      <div className="space-y-4">
        {filteredGuides.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-slate-400 text-xs space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">Tidak ada panduan yang cocok dengan pencarian "{searchQuery}"</p>
            <p className="text-[11px] text-slate-400">Silakan coba kata kunci lain atau pilih "Semua Topik".</p>
          </div>
        ) : (
          filteredGuides.map((guide, idx) => {
            const isExp = expandedIndex === idx;

            return (
              <div 
                key={idx} 
                id={`guide-item-${idx}`}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden text-xs shadow-xs scroll-mt-24 ${
                  isExp ? 'border-emerald-400 ring-2 ring-emerald-500/10' : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Header Accordion Button (Bersih Tanpa Badge Berulang) */}
                <button
                  type="button"
                  onClick={() => handleToggleAccordion(idx)}
                  className={`w-full p-4 sm:p-5 text-left font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    isExp ? 'bg-emerald-50/40 text-slate-900' : 'hover:bg-slate-50/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-start sm:items-center space-x-3.5 pr-2">
                    {/* Index Number Circle */}
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs border transition-colors ${
                      isExp 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-700/20' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {idx + 1}
                    </div>

                    <div>
                      <div className="mb-0.5">
                        <span className="text-[11px] font-bold text-emerald-700 tracking-wide">
                          {guide.category}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-snug">
                        {guide.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
                        {guide.desc}
                      </p>
                    </div>
                  </div>

                  {/* Icon Chevron Collapse */}
                  <div className={`p-1.5 rounded-lg border transition-all shrink-0 ml-2 ${
                    isExp ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {isExp ? <ChevronUp className="w-4 h-4 stroke-[2.5]" /> : <ChevronDown className="w-4 h-4 stroke-[2.5]" />}
                  </div>
                </button>

                {/* Konten Terbuka (Body Accordion) */}
                {isExp && (
                  <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    
                    {/* Kotak Tips Khusus */}
                    {guide.tip && (
                      <div className="p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-200 text-emerald-950 text-xs font-medium shadow-2xs">
                        <strong className="block font-black text-emerald-900 mb-0.5">Tips Operasional Penting:</strong>
                        <span className="leading-relaxed text-slate-800">{guide.tip}</span>
                      </div>
                    )}

                    {/* Judul Langkah Pelaksanaan: 1 Baris Lebih Kecil & Rapi */}
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-extrabold uppercase tracking-wider text-[10px] sm:text-[11px]">
                          Langkah-Langkah Pelaksanaan
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0">
                        {guide.steps.length} Langkah
                      </span>
                    </div>

                    {/* Daftar Langkah Berurut */}
                    <div className="space-y-2">
                      {guide.steps.map((stepStr, sIdx) => (
                        <div 
                          key={sIdx} 
                          className="p-3.5 bg-white rounded-xl border border-slate-200/90 flex items-start space-x-3 shadow-2xs hover:border-emerald-200 transition-colors"
                        >
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </div>
                          <p className="font-medium text-slate-800 text-xs leading-relaxed pt-0.5">
                            {stepStr}
                          </p>
                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Mengalami kendala teknis yang belum tercantum di panduan ini? Gunakan menu Helpdesk atau hubungi panitia pelaksana.
          </span>
        </div>

        <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0 self-end sm:self-auto">
          PresenTrain Panduan Penggunaan • 2026
        </span>
      </div>

    </div>
  );
}
