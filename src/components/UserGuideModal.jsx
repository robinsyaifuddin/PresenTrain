import React, { useState } from 'react';
import { 
  X, BookOpen, ShieldCheck, QrCode, Users, Calendar, 
  Settings, CheckCircle2, HelpCircle, Smartphone, Printer, Camera, Crown
} from 'lucide-react';

export default function UserGuideModal({ isOpen, onClose, defaultRole = 'participant' }) {
  const [activeTab, setActiveTab] = useState(
    defaultRole === 'super_admin' ? 'super_admin' : defaultRole === 'admin' ? 'admin' : 'participant'
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] border border-slate-100 my-auto">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Panduan Penggunaan Sistem</h3>
              <p className="text-xs text-emerald-100 font-medium">Petunjuk Penggunaan Fitur PresenTrain Digital</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Tutup Panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 flex items-center space-x-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('participant')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'participant'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Panduan Peserta</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Panduan Admin Panitia</span>
          </button>

          <button
            onClick={() => setActiveTab('super_admin')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'super_admin'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Panduan Super Admin</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 leading-relaxed flex-1">
          
          {/* TAB 1: PESERTA */}
          {activeTab === 'participant' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
                <h4 className="font-bold text-sm mb-1 text-emerald-800 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>Petunjuk Penggunaan untuk Peserta Training</span>
                </h4>
                <p>PresenTrain mempermudah proses kehadiran Anda di lokasi pelatihan hanya dengan menunjukkan Kode QR Digital.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">1</div>
                  <h5 className="font-bold text-slate-900 text-xs">Tunjukkan Kartu QR Digital</h5>
                  <p className="text-slate-500 text-[11px]">Buka tab "Kartu QR Digital" di smartphone Anda saat tiba di lokasi meja registrasi panitia.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">2</div>
                  <h5 className="font-bold text-slate-900 text-xs">Pemindaian oleh Panitia</h5>
                  <p className="text-slate-500 text-[11px]">Arahkan QR Code ke kamera scanner panitia. Status presensi akan tercatat otomatis secara instan.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">3</div>
                  <h5 className="font-bold text-slate-900 text-xs">Cek Riwayat Absensi</h5>
                  <p className="text-slate-500 text-[11px]">Pantau status kehadiran setiap sesi pelatihan pada menu "Riwayat Absensi".</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">4</div>
                  <h5 className="font-bold text-slate-900 text-xs">Unduh Kartu & Profil</h5>
                  <p className="text-slate-500 text-[11px]">Anda dapat menyimpan gambar QR ke galeri perangkat Anda melalui menu "Profil Saya".</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMIN PANITIA */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 font-medium">
                <h4 className="font-bold text-sm mb-1 text-teal-800 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal-700" />
                  <span>Petunjuk Kerja Admin Scanner / Panitia Pelatihan</span>
                </h4>
                <p>Panitia bertugas memindai QR Code peserta di meja registrasi dan melakukan pencetakan stiker ID Badge.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center">1</div>
                  <h5 className="font-bold text-slate-900 text-xs">Live QR Scanner</h5>
                  <p className="text-slate-500 text-[11px]">Gunakan menu "Sesi & Live QR Scanner" untuk membuka kamera pemindai. Arahkan ke QR Code peserta untuk mencatat waktu hadir.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center">2</div>
                  <h5 className="font-bold text-slate-900 text-xs">Cetak Stiker ID Badge</h5>
                  <p className="text-slate-500 text-[11px]">Buka menu "ID Badge & Ticket Desk" untuk mencetak stiker nama badge peserta atau membagikan tiket QR via WhatsApp.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center">3</div>
                  <h5 className="font-bold text-slate-900 text-xs">Presensi Manual & Pencarian</h5>
                  <p className="text-slate-500 text-[11px]">Jika HP peserta mati/terkendala, cari nama peserta di menu "Cari & Presensi Manual" untuk memverifikasi kehadiran.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center">4</div>
                  <h5 className="font-bold text-slate-900 text-xs">Pantau Live Stats</h5>
                  <p className="text-slate-500 text-[11px]">Pantau jumlah kehadiran real-time per sesi melalui menu "Rekap & Live Stats".</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUPER ADMIN */}
          {activeTab === 'super_admin' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-medium">
                <h4 className="font-bold text-sm mb-1 text-amber-800 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-700" />
                  <span>Petunjuk Pengelolaan Sistem untuk Super Admin</span>
                </h4>
                <p>Super Admin memiliki akses penuh untuk mengatur event, kelola panitia, ekspor data peserta, dan konfigurasi sistem.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center">1</div>
                  <h5 className="font-bold text-slate-900 text-xs">Kelola Event & Sesi</h5>
                  <p className="text-slate-500 text-[11px]">Atur judul event, tambah sesi pelatihan baru, atur waktu pelaksanaan, serta lokasi ruang kelas.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center">2</div>
                  <h5 className="font-bold text-slate-900 text-xs">Manajemen Admin Panitia</h5>
                  <p className="text-slate-500 text-[11px]">Tambah akun panitia baru, ubah tugas operasional, serta atur status aktif/nonaktif panitia.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center">3</div>
                  <h5 className="font-bold text-slate-900 text-xs">Master Data Peserta & Export</h5>
                  <p className="text-slate-500 text-[11px]">Kelola data seluruh peserta pelatihan dan unduh file rekap kehadiran (Excel/CSV).</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center">4</div>
                  <h5 className="font-bold text-slate-900 text-xs">Pengaturan Identitas & Maintenance</h5>
                  <p className="text-slate-500 text-[11px]">Ubah nama website, tagline, logo web, serta aktifkan modus maintenance jika terjadi perbaikan sistem.</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>Butuh bantuan lebih lanjut? Hubungi panitia / helpdesk.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md"
          >
            Tutup Panduan
          </button>
        </div>

      </div>
    </div>
  );
}
