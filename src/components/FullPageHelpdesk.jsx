import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  LifeBuoy, MessageSquare, PhoneCall, Mail, HelpCircle, 
  Send, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, Sparkles, Clock, AlertTriangle,
  Paperclip, Search, Phone
} from 'lucide-react';

export default function FullPageHelpdesk({ user, siteSettings, onBack }) {
  const [issueCategory, setIssueCategory] = useState('QR Token Tidak Terbaca');
  const [issuePriority, setIssuePriority] = useState('Normal');
  const [issueMessage, setIssueMessage] = useState('');
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(0);
  const [notification, setNotification] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);

  const [tickets, setTickets] = useState([
    { id: 'INC-081', category: 'QR Token Tidak Terbaca', priority: 'Tinggi', msg: 'Kamera HP peserta retak sehingga scanner sulit membaca token.', status: 'Selesai', time: '19/09/2026 08:30 WIB', solution: 'Presensi manual panitia telah diset Hadir.' },
    { id: 'INC-082', category: 'Kendala Teknis Quiz / Ujian', priority: 'Normal', msg: 'Peserta mengalami koneksi putus saat pengerjaan Post-Test.', status: 'Proses', time: '20/09/2026 10:15 WIB', solution: 'Menunggu persetujuan reset nilai Super Admin.' }
  ]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const handleOpenWhatsApp = () => {
    const waNum = siteSettings?.whatsappNumber || '62887437525303';
    const text = `Halo Admin CS PresenTrain, saya ${user?.name || 'Peserta'} ingin berkonsultasi mengenai kendala teknis sistem presensi.`;
    const url = `https://wa.me/${waNum}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleFileAttach = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0].name);
      showToast(`Berkas "${e.target.files[0].name}" berhasil dilampirkan!`);
    }
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!issueMessage.trim()) return;

    const newT = {
      id: `INC-0${tickets.length + 83}`,
      category: issueCategory,
      priority: issuePriority,
      msg: issueMessage + (attachedFile ? ` (Lampiran: ${attachedFile})` : ''),
      status: 'Proses',
      time: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      solution: 'Sedang ditinjau oleh Koordinator Lapangan Panitia'
    };

    setTickets([newT, ...tickets]);

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err) {}

    showToast(`Tiket Laporan Kendala ("${issueCategory}") Berhasil Dikirim ke Helpdesk Panitia!`);
    setIssueMessage('');
    setAttachedFile(null);
  };

  const faqs = [
    {
      q: "Bagaimana jika QR Code peserta mengalami kerusakan / tidak terbaca scanner?",
      a: "Operator panitia dapat melakukan presensi secara manual melalui menu 'Daftar Peserta' -> pilih opsi 'Set Hadir' atau masukkan 'Presensi Manual Panitia'."
    },
    {
      q: "Bagaimana jika peserta mengalami kendala teknis saat mengerjakan Quiz?",
      a: "Peserta atau panitia dapat mengajukan 'Reset Nilai / Pengerjaan Ulang Kuis' yang nantinya disetujui oleh Super Admin demi integritas nilai."
    },
    {
      q: "Apakah laporan rekapitulasi presensi dapat diekspor ke Microsoft Excel?",
      a: "Ya! Pada dashboard panitia / admin terdapat tombol 'Ekspor Excel Berwarna' yang menghasilkan file rekapitulasi lengkap dengan timestamp presensi."
    },
    {
      q: "Di mana saya bisa melihat jadwal dan lokasi ruangan sesi pelatihan hari ini?",
      a: "Anda dapat melihatnya pada tab 'Jadwal & Status Sesi' di menu utama dashboard PresenTrain."
    },
    {
      q: "Bagaimana prosedur permohonan izin atau pindah ruangan sesi pelatihan?",
      a: "Anda dapat mengirimkan tiket permohonan melalui form di halaman ini dengan memilih kategori 'Permohonan Izin / Berhalangan' atau menghubungi Panitia via WhatsApp."
    }
  ];

  const filteredFaqs = faqs.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans animate-fade-in">
      
      {/* Toast Notification */}
      {notification && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
          <span>{notification}</span>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        </div>
      )}

      {/* SIMPLE BACK NAVIGATION (IF APPLICABLE) */}
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

      {/* TOP QUICK CONTACT METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={handleOpenWhatsApp}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <MessageSquare className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center space-x-1 group-hover:text-emerald-700 transition-colors">
              <span>WhatsApp Live CS</span>
              <ExternalLink className="w-3 h-3 text-emerald-600" />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Chat Panitia Langsung</p>
          </div>
        </div>

        <a 
          href={`mailto:${siteSettings?.contactEmail || 'support@presentrain.com'}`}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/70 text-teal-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all">
            <Mail className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">Email Technical CS</div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">{siteSettings?.contactEmail || 'support@presentrain.com'}</p>
          </div>
        </a>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Status Server PresenTrain</div>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Semua Layanan Normal</span>
            </p>
          </div>
        </div>
      </div>

      {/* MAIN TWO COLUMN CONTENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: FORM TIKET & FAQ */}
        <div className="space-y-6">
          
          {/* FORM LAPOR KENDALA */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Send className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Form Kirim Laporan Kendala</h3>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori Masalah</label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-emerald-600"
                  >
                    <option value="QR Token Tidak Terbaca">QR Token Tidak Terbaca Scanner</option>
                    <option value="Kendala Teknis Quiz / Ujian">Kendala Teknis Quiz / Ujian</option>
                    <option value="Permohonan Izin / Berhalangan">Permohonan Izin / Berhalangan Sesi</option>
                    <option value="Pindah Ruangan Sesi">Izin Pindah Ruangan Sesi Lab</option>
                    <option value="Lainnya">Pertanyaan Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Prioritas</label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-emerald-600"
                  >
                    <option value="Normal">Normal (Respon &lt; 30 Menit)</option>
                    <option value="Tinggi">Tinggi (Respon &lt; 10 Menit)</option>
                    <option value="Darurat">Darurat Lapangan (Segera)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rincian Detail Kendala <span className="text-rose-500">*</span></label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan kendala teknis yang Anda alami secara rinci agar panitia dapat langsung memberikan penanganan..."
                  value={issueMessage}
                  onChange={(e) => setIssueMessage(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white transition-all text-xs"
                />
              </div>

              {/* UPLOAD SIMULATION */}
              <div className="flex items-center justify-between pt-1">
                <label className="cursor-pointer inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors">
                  <Paperclip className="w-4 h-4 text-emerald-600" />
                  <span>{attachedFile ? `Lampiran: ${attachedFile}` : 'Lampirkan Foto Bukti (Opsional)'}</span>
                  <input type="file" onChange={handleFileAttach} className="sr-only" />
                </label>

                <button
                  type="submit"
                  className="px-6 py-3 btn-emerald text-xs font-bold rounded-2xl flex items-center space-x-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Tiket Laporan</span>
                </button>
              </div>
            </form>
          </div>

          {/* FAQ SECTION */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Pertanyaan Sering Ditanyakan (FAQ)</h3>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari kata kunci pertanyaan FAQ..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-2xl border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-2.5">
              {filteredFaqs.map((faq, idx) => {
                const isExp = expandedFaqIndex === idx;
                return (
                  <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedFaqIndex(isExp ? null : idx)}
                      className="w-full p-3.5 text-left font-bold text-slate-800 flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <span className="pr-2">{faq.q}</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>
                    {isExp && (
                      <div className="p-3.5 pt-0 text-slate-600 border-t border-slate-200/60 bg-white leading-relaxed font-medium">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: RIWAYAT TIKET LAPORAN */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Riwayat Tiket ({tickets.length})</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Tracker
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
            {tickets.map(t => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 font-mono">{t.id}</span>
                  <div className="flex items-center space-x-1.5">
                    {t.priority && (
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${
                        t.priority === 'Tinggi' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}>
                        {t.priority}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                      t.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>

                <div className="font-bold text-slate-800 text-[11px]">{t.category}</div>
                <p className="text-slate-600 leading-relaxed font-medium">{t.msg}</p>

                <div className="pt-2 border-t border-slate-200/80 text-[10px] space-y-1">
                  <div className="text-slate-400 font-mono">Waktu: {t.time}</div>
                  <div className="text-emerald-900 bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-200 font-medium">
                    <strong>Tanggapan Panitia:</strong> {t.solution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
