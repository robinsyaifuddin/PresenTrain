import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Send, ArrowLeft, Clock,
  Paperclip, Edit3, MessageCircle, User
} from 'lucide-react';
import { normalizeRole } from '@/routes/routeConfig';
import { api } from '@/services/api';
import NotificationPopup from '@/components/ui/Feedback/NotificationPopup';

export default function HelpdeskView({ user, siteSettings, onBack, tickets: propTickets, setTickets: propSetTickets }) {
  const defaultTickets = [];

  const [localTickets, setLocalTickets] = useState(defaultTickets);
  const tickets = propTickets || localTickets;
  const setTickets = propSetTickets || setLocalTickets;

  const [issueCategory, setIssueCategory] = useState('QR Token Tidak Terbaca');
  const [issuePriority, setIssuePriority] = useState('Normal');
  const [issueMessage, setIssueMessage] = useState('');
  const [notification, setNotification] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);

  // Reply State for Admin Pusat (Super Admin) & Administrator
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('Selesai');
  const [ticketFilter, setTicketFilter] = useState('ALL');

  const userRole = normalizeRole(user?.role);
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin';
  const canReply = isSuperAdmin || isAdmin;

  const showToast = (msg) => {
    setNotification(msg);
  };

  const handleOpenWhatsApp = () => {
    const waNum = siteSettings?.whatsappNumber || '62887437525303';
    const text = `Halo Admin CS PresenTrain, saya ${user?.name || 'Pengguna'} ingin berkonsultasi mengenai kendala teknis sistem presensi.`;
    const url = `https://wa.me/${waNum}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleFileAttach = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0].name);
      showToast(`Berkas "${e.target.files[0].name}" berhasil dilampirkan!`);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!issueMessage.trim()) return;

    const newT = {
      id: `INC-0${tickets.length + 83}`,
      category: issueCategory,
      priority: issuePriority,
      msg: issueMessage + (attachedFile ? ` (Lampiran: ${attachedFile})` : ''),
      status: 'Proses',
      time: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      solution: 'Sedang ditinjau oleh Tim Panitia Pusat',
      senderName: user?.name || (userRole === 'admin' ? 'Panitia Admin' : 'Peserta'),
      senderRole: userRole
    };

    try {
      await api.createTicket(newT);
    } catch (err) {
      console.warn('API createTicket error:', err);
    }

    setTickets([newT, ...tickets]);

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err) {}

    showToast(`Tiket Laporan Kendala ("${issueCategory}") Berhasil Dikirim ke Helpdesk Panitia!`);
    setIssueMessage('');
    setAttachedFile(null);
  };

  const handleOpenReplyModal = (ticket) => {
    setActiveReplyId(ticket.id);
    setReplyText(ticket.solution && !ticket.solution.startsWith('Sedang ditinjau') ? ticket.solution : '');
    setReplyStatus(ticket.status || 'Selesai');
  };

  const handleSaveReply = async (e, ticketId) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await api.updateTicket(ticketId, {
        solution: replyText,
        status: replyStatus,
        repliedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      });
    } catch (err) {
      console.warn('API updateTicket error:', err);
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          solution: replyText,
          status: replyStatus,
          repliedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        };
      }
      return t;
    });

    setTickets(updated);
    setActiveReplyId(null);
    setReplyText('');
    showToast(`Balasan tiket ${ticketId} berhasil disimpan & dikirimkan!`);
  };

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === 'Proses') return t.status === 'Proses';
    if (ticketFilter === 'Selesai') return t.status === 'Selesai';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans animate-fade-in w-full">
      {notification && (
        <NotificationPopup
          message={notification}
          onClose={() => setNotification('')}
          duration={1000}
          type="success"
        />
      )}

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



      <div className={canReply ? "w-full" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
        {/* Left Column: Form Kirim Tiket (Hanya untuk Peserta) */}
        {!canReply && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-emerald-600 cursor-pointer"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-emerald-600 cursor-pointer"
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
                    rows={2}
                    required
                    placeholder="Tuliskan kendala teknis yang Anda alami secara rinci agar panitia dapat langsung memberikan penanganan..."
                    value={issueMessage}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(el.scrollHeight, 80)}px`;
                      }
                    }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(e.target.scrollHeight, 80)}px`;
                    }}
                    onChange={(e) => {
                      setIssueMessage(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(e.target.scrollHeight, 80)}px`;
                    }}
                    className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white transition-all text-xs resize-none overflow-hidden"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="cursor-pointer inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors">
                    <Paperclip className="w-4 h-4 text-emerald-600" />
                    <span>{attachedFile ? `Lampiran: ${attachedFile}` : 'Foto Bukti (Opsional)'}</span>
                    <input type="file" onChange={handleFileAttach} className="sr-only" />
                  </label>

                  <button
                    type="submit"
                    className="px-6 py-3 btn-emerald text-xs font-bold rounded-xl flex items-center space-x-2 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Right Column: Riwayat Tiket & Mode Balas Tiket untuk Admin / Admin Pusat */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Riwayat Tiket ({tickets.length})
                </h3>
                {canReply && (
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    {isSuperAdmin ? 'Mode Admin Pusat: Membaca & Membalas Tiket' : 'Mode Administrator: Membaca & Membalas Tiket'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {canReply && (
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                  <button
                    onClick={() => setTicketFilter('ALL')}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${ticketFilter === 'ALL' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setTicketFilter('Proses')}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${ticketFilter === 'Proses' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Proses
                  </button>
                  <button
                    onClick={() => setTicketFilter('Selesai')}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${ticketFilter === 'Selesai' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Selesai
                  </button>
                </div>
              )}
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                Live Tracker
              </span>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada tiket laporan kendala yang ditemukan.
              </div>
            ) : (
              filteredTickets.map(t => (
                <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs relative">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 font-mono">{t.id}</span>
                      {t.senderName && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{t.senderName}</span>
                        </span>
                      )}
                    </div>

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

                  <div className="pt-2 border-t border-slate-200/80 text-[10px] space-y-1.5">
                    <div className="text-slate-400 font-mono">Waktu: {t.time}</div>
                    
                    {/* Tanggapan Panitia / Admin */}
                    <div className="text-emerald-900 bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-200 font-medium space-y-1">
                      <div className="flex justify-between items-center">
                        <strong>Tanggapan Panitia / Admin:</strong>
                        {t.repliedAt && <span className="text-[9px] text-emerald-700 font-mono">{t.repliedAt}</span>}
                      </div>
                      <p className="text-slate-800">{t.solution}</p>
                    </div>

                    {/* Tombol Balas Tiket khusus Admin Pusat / Administrator */}
                    {canReply && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenReplyModal(t)}
                          className="p-1.5 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl flex items-center space-x-1 sm:space-x-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
                          title={t.solution && !t.solution.startsWith('Sedang ditinjau') ? 'Edit Balasan' : 'Balas Tiket'}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t.solution && !t.solution.startsWith('Sedang ditinjau') ? 'Edit Balasan' : 'Balas Tiket'}</span>
                          <span className="sm:hidden text-[10px]">{t.solution && !t.solution.startsWith('Sedang ditinjau') ? 'Edit' : 'Balas'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Form Inline Balas Tiket oleh Super Admin / Administrator */}
                  {canReply && activeReplyId === t.id && (
                    <form onSubmit={(e) => handleSaveReply(e, t.id)} className="mt-3 p-3 bg-white rounded-xl border-2 border-emerald-400 space-y-2.5 animate-fade-in shadow-md">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-900 text-xs flex items-center space-x-1">
                          <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Balas Tiket {t.id} ({t.senderName || 'Peserta'})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveReplyId(null)}
                          className="text-slate-400 hover:text-slate-700 text-[11px] font-bold"
                        >
                          Batal
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggapan / Solusi Panitia / Admin</label>
                        <textarea
                          rows={3}
                          required
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Tuliskan balasan atau solusi resmi untuk laporan kendala ini..."
                          className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-bold text-slate-700">Status Tiket:</span>
                          <select
                            value={replyStatus}
                            onChange={(e) => setReplyStatus(e.target.value)}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-300 font-bold rounded-lg text-slate-800 text-xs cursor-pointer outline-none focus:border-emerald-600"
                          >
                            <option value="Selesai">Selesai (Resolved)</option>
                            <option value="Proses">Proses (Pending)</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Kirim Balasan</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
