import React, { useState } from 'react';
import { 
  BookOpen, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, 
  User, ShieldCheck, QrCode, FileText, BarChart3, Clock, Sparkles, Search, HelpCircle, AlertCircle 
} from 'lucide-react';

export default function GuideView({ user, onBack }) {
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGuideIndex, setExpandedGuideIndex] = useState(0);

  const guideSections = [
    {
      role: 'peserta',
      title: '1. Cara Menampilkan & Menggunakan QR Token Presensi',
      desc: 'Petunjuk lengkap peserta saat hadir di ruangan sesi pelatihan.',
      tip: 'Pastikan kecerahan layar HP dalam kondisi terang agar kamera scanner panitia dapat membaca kode QR secara cepat.',
      steps: [
        'Login ke portal PresenTrain menggunakan akun email yang terdaftar.',
        'Klik menu "Barcode Saya" atau tombol "Kartu Presensi Digital".',
        'Tunjukkan kode QR Token unik kepada operator panitia di pintu masuk lokasi pelatihan.',
        'Setelah di-scan, status presensi Anda langsung berubah menjadi HADIR beserta konfirmasi waktu timestamp.'
      ]
    },
    {
      role: 'peserta',
      title: '2. Cara Pengerjaan Quiz Pre-Test & Post-Test Evaluasi',
      desc: 'Panduan pengerjaan ujian kuis pilihan ganda dan essay.',
      tip: 'Kuis yang telah di-submit nilainya bersifat terkunci secara otomatis. Pastikan periksa kembali jawaban sebelum submit.',
      steps: [
        'Buka tab menu "Quiz & Evaluasi" pada navigasi utama.',
        'Pilih kuis aktif yang tersedia (Pre-Test atau Post-Test).',
        'Bacalah instruksi & petunjuk durasi waktu kuis sebelum menekan tombol "Mulai Kerjakan Quiz".',
        'Jawab seluruh pertanyaan pilihan ganda & essay sebelum waktu countdown berakhir.',
        'Klik tombol "Submit Quiz" untuk menyimpan & mengunci perolehan nilai Anda.'
      ]
    },
    {
      role: 'peserta',
      title: '3. Memeriksa Jadwal Sesi & Rekapitulasi Presensi Diri',
      desc: 'Panduan memantau riwayat kehadiran dan jadwal materi.',
      tip: 'Anda dapat mengunduh bukti kartu presensi digital dalam format PNG melalui tombol "Unduh Barcode".',
      steps: [
        'Buka tab menu "Jadwal Sesi" untuk melihat daftar materi, jam, dan lokasi ruangan.',
        'Buka tab "Rekap Saya" untuk melihat daftar persentase sesi yang telah Anda hadiri.',
        'Jika ada ketidaksesuaian status presensi, gunakan menu "Pusat Bantuan" untuk melapor ke panitia.'
      ]
    },
    {
      role: 'admin',
      title: '4. Operasional Pemindai Barcode QR Kamera Panitia',
      desc: 'Cara kerja operator panitia dalam memindai QR Token peserta.',
      tip: 'Gunakan tombol Test Scanner atau Barcode Gun Gunakan input fast token jika kamera HP peserta rusak.',
      steps: [
        'Buka tab "Scan Absensi" atau tombol "Buka Scanner Kamera" pada sesi aktif.',
        'Izinkan akses perangkat kamera pada browser HP / Laptop panitia.',
        'Arahkan kamera ke layar HP peserta yang menampilkan QR Code.',
        'Sistem akan memverifikasi token dan memberikan respon beep audio serta efek sukses.'
      ]
    },
    {
      role: 'admin',
      title: '5. Ekspor Rekapitulasi Presensi Berwarna ke Excel',
      desc: 'Cara mengunduh laporan presensi resmi berbentuk file Excel rapi.',
      tip: 'File Excel yang diunduh sudah diformat dengan header hijau resmi dan kolom timestamp.',
      steps: [
        'Buka menu "Live Rekap" atau klik tombol "Ekspor Excel".',
        'Gunakan filter pencarian jika ingin menyaring nama atau sesi tertentu.',
        'Klik tombol "Ekspor Rekap Excel", sistem otomatis mengunduh file .xls.'
      ]
    },
    {
      role: 'admin',
      title: '6. Pembuatan & Pengelolaan Quiz Google Form Baru',
      desc: 'Cara membuat kuis baru bergaya Google Form full-page.',
      tip: 'Anda dapat mengatur Passing Grade minimal dan memberikan kunci jawaban otomatis.',
      steps: [
        'Buka menu "Quiz Ujian" lalu klik tombol "+ Buat Quiz Baru".',
        'Isi Judul Quiz, Deskripsi, Jenis (Pre-Test / Post-Test), Durasi, dan Passing Grade.',
        'Susun soal Pilihan Ganda & Essay, atur opsi jawaban dan kunci jawaban benar.',
        'Klik tombol "Simpan & Publikasikan Quiz".'
      ]
    },
    {
      role: 'admin',
      title: '7. Penanganan Helpdesk & Reset Token Lapangan',
      desc: 'Cara memberikan bantuan presensi manual bagi peserta berhalangan.',
      tip: 'Gunakan opsi "Presensi Manual Panitia" jika peserta tidak membawa HP.',
      steps: [
        'Buka tab menu "Helpdesk Lapangan".',
        'Cari nama peserta atau kode tiket kendala yang diajukan.',
        'Pilih tindakan "Reset QR Token" atau "Set Hadir Manual Panitia".',
        'Klik Simpan untuk memperbarui status presensi peserta.'
      ]
    }
  ];

  const filteredGuides = guideSections.filter(g => {
    const matchesRole = activeRoleFilter === 'ALL' || g.role === activeRoleFilter;
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          g.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          g.steps.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans animate-fade-in">
      {onBack && (
        <button
          onClick={onBack}
          className="text-slate-600 hover:text-emerald-700 font-bold text-xs flex items-center space-x-1.5 underline underline-offset-4 cursor-pointer transition-all w-fit mb-2"
          title="Kembali ke Beranda"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Semua Panduan' },
            { id: 'peserta', label: 'Panduan Peserta' },
            { id: 'admin', label: 'Panduan Panitia / Admin' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveRoleFilter(f.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeRoleFilter === f.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari kata kunci panduan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredGuides.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
            Tidak ada panduan yang cocok dengan kata kunci "{searchQuery}".
          </div>
        ) : (
          filteredGuides.map((guide, idx) => {
            const isExp = expandedGuideIndex === idx;

            return (
              <div key={idx} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden text-xs transition-all">
                <button
                  type="button"
                  onClick={() => setExpandedGuideIndex(isExp ? null : idx)}
                  className="w-full p-5 text-left font-bold text-slate-900 flex items-center justify-between hover:bg-emerald-50/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5 pr-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black shrink-0 shadow-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${
                          guide.role === 'peserta' ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {guide.role === 'peserta' ? 'Peserta' : 'Panitia / Admin'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{guide.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{guide.desc}</p>
                    </div>
                  </div>

                  {isExp ? <ChevronUp className="w-5 h-5 text-emerald-600 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                </button>

                {isExp && (
                  <div className="p-6 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    {guide.tip && (
                      <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start space-x-2.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Tips Antigravity:</strong>
                          <span>{guide.tip}</span>
                        </div>
                      </div>
                    )}

                    <h4 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">Langkah-Langkah Pelaksanaan:</h4>
                    
                    <div className="space-y-2.5">
                      {guide.steps.map((stepStr, sIdx) => (
                        <div key={sIdx} className="p-3.5 bg-white rounded-2xl border border-slate-200/80 flex items-start space-x-3 shadow-xs">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </div>
                          <span className="font-medium text-slate-800 leading-relaxed pt-0.5">{stepStr}</span>
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
    </div>
  );
}
