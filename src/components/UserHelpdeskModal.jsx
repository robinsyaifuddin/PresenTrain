import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  LifeBuoy, MessageSquare, PhoneCall, Mail, HelpCircle, 
  Send, X, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, Sparkles 
} from 'lucide-react';

export default function UserHelpdeskModal({ isOpen, onClose, user, siteSettings }) {
  if (!isOpen) return null;

  const [issueCategory, setIssueCategory] = useState('QR Token Tidak Terbaca');
  const [issueMessage, setIssueMessage] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(0);
  const [notification, setNotification] = useState('');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const handleOpenWhatsApp = () => {
    const waNum = siteSettings?.whatsappNumber || '62887437525303';
    const text = `Halo Admin CS PresenTrain, saya ${user?.name || 'Peserta'} ingin bertanya mengenai kendala teknis sistem presensi.`;
    const url = `https://wa.me/${waNum}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!issueMessage.trim()) return;

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err) {}

    showToast(`Laporan Kendala ("${issueCategory}") berhasil dikirim ke Helpdesk Panitia!`);
    setIssueMessage('');
    setTimeout(() => onClose(), 1500);
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
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
        
        {/* Toast Notification */}
        {notification && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-purple-600 text-white px-4 py-3 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Modal Top Header Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-extrabold text-xl flex items-center justify-center shadow-md shrink-0">
              <LifeBuoy className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/30">
                Pusat Bantuan CS
              </span>
              <h3 className="text-lg font-extrabold mt-0.5">Helpdesk & Dukungan Layanan</h3>
              <p className="text-xs text-purple-100">Bantuan cepat kendala teknis presensi & evaluasi kuis</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto no-scrollbar">
          
          {/* Quick Contact Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-2xl flex items-center space-x-3 transition-all cursor-pointer group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="block font-bold text-slate-900">WhatsApp Live CS</span>
                <span className="block text-[10px] text-emerald-800 font-semibold flex items-center space-x-0.5">
                  <span>Chat CS Panitia</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </button>

            <a
              href={`mailto:${siteSettings?.contactEmail || 'support@presentrain.com'}`}
              className="p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-2xl flex items-center space-x-3 transition-all cursor-pointer group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="block font-bold text-slate-900">Email Technical CS</span>
                <span className="block text-[10px] text-blue-800 font-semibold truncate">
                  {siteSettings?.contactEmail || 'support@presentrain.com'}
                </span>
              </div>
            </a>
          </div>

          {/* Form Tiket Lapor Kendala */}
          <form onSubmit={handleSubmitTicket} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-purple-900 flex items-center space-x-1">
              <Send className="w-3.5 h-3.5 text-purple-600" />
              <span>Form Kirim Laporan Kendala Teknikal</span>
            </h4>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori Masalah / Pertanyaan</label>
              <select
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-purple-600"
              >
                <option value="QR Token Tidak Terbaca">QR Token Tidak Terbaca Scanner</option>
                <option value="Kendala Teknis Quiz / Ujian">Kendala Teknis Quiz / Ujian</option>
                <option value="Permohonan Izin / Berhalangan">Permohonan Izin / Berhalangan Sesi</option>
                <option value="Lainnya">Pertanyaan Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Detail Kendala yang Dialami <span className="text-rose-500">*</span></label>
              <textarea
                rows={3}
                required
                placeholder="Tuliskan masalah yang Anda alami secara mendalam agar dapat ditangani tim..."
                value={issueMessage}
                onChange={(e) => setIssueMessage(e.target.value)}
                className="w-full p-3 bg-white rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-purple-600"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Tiket Helpdesk</span>
              </button>
            </div>
          </form>

          {/* Section FAQ Terpopuler */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4 text-purple-600" />
              <span>Pertanyaan Sering Ditanyakan (FAQ)</span>
            </h4>

            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const isExp = expandedFaqIndex === idx;
                return (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedFaqIndex(isExp ? null : idx)}
                      className="w-full p-3.5 text-left font-bold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <span className="pr-2">{faq.q}</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>
                    {isExp && (
                      <div className="p-3.5 pt-0 text-slate-600 border-t border-slate-100 bg-slate-50/50 leading-relaxed font-medium">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
