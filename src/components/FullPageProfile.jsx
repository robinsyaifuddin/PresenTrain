import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  User, Mail, Building, Briefcase, Phone, QrCode, 
  KeyRound, ShieldCheck, Save, ArrowLeft, CheckCircle2, Copy, Sparkles,
  Download, Printer, Award, Clock, Check, Shield
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function FullPageProfile({ user, onUpdateUser, onBack }) {
  const [activeTab, setActiveTab] = useState('biodata'); // 'biodata' | 'security' | 'id_card'
  
  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [instansi, setInstansi] = useState(user?.instansi || 'Universitas / Instansi Umum');
  const [jabatan, setJabatan] = useState(user?.jabatan || (user?.role === 'super_admin' ? 'Super Administrator' : user?.role === 'admin' ? 'Panitia Operator' : 'Peserta Training'));
  const [phone, setPhone] = useState(user?.phone || '0812-3456-7890');
  const [bioNote, setBioNote] = useState('Peserta aktif pelatihan sistem presensi digital PresenTrain.');
  
  // Security states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [notification, setNotification] = useState('');
  const [copied, setCopied] = useState(false);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const qrTokenDisplay = user?.qrToken || `ABSEN-PESERTA-${(user?.name || 'USER').toUpperCase().replace(/\s+/g, '-')}-88291`;

  const handleCopyQrToken = () => {
    navigator.clipboard.writeText(qrTokenDisplay);
    setCopied(true);
    showToast('Token QR Presensi berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveBiodata = (e) => {
    e.preventDefault();
    if (!name || !email) {
      showToast('Nama dan Email tidak boleh kosong!');
      return;
    }

    const updatedUserObj = {
      ...user,
      name,
      email,
      instansi,
      jabatan,
      phone
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUserObj);
    }

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err) {}

    showToast('Data Profil & Biodata Akun Berhasil Diperbarui!');
  };

  const handleSaveSecurity = (e) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast('Masukkan password saat ini!');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password baru minimal 6 karakter!');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password baru tidak cocok!');
      return;
    }

    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err) {}

    showToast('Password Akun Berhasil Diperbarui!');
  };

  const handlePrintIDCard = () => {
    const printWindow = window.open('', '_blank', 'width=480,height=640');
    if (!printWindow) {
      window.print();
      return;
    }

    const qrSvgElement = document.getElementById('printable-idcard-qr');
    const qrSvgHtml = qrSvgElement ? qrSvgElement.outerHTML : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kartu Peserta - ${name}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: portrait;
              margin: 15mm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .id-card {
              width: 320px;
              background: linear-gradient(135deg, #065f46 0%, #047857 50%, #115e59 100%);
              color: #ffffff;
              border-radius: 24px;
              padding: 24px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card-header {
              border-bottom: 1px solid rgba(16, 185, 129, 0.3);
              padding-bottom: 14px;
              margin-bottom: 20px;
              text-align: center;
            }
            .badge {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              background: rgba(52, 211, 153, 0.2);
              color: #a7f3d0;
              padding: 4px 10px;
              border-radius: 9999px;
              display: inline-block;
              border: 1px solid rgba(110, 231, 183, 0.3);
            }
            .title {
              font-size: 18px;
              font-weight: 900;
              margin-top: 6px;
              margin-bottom: 0;
              color: #ffffff;
            }
            .qr-container {
              background: #ffffff;
              padding: 14px;
              border-radius: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 0 auto 20px auto;
              width: 140px;
              height: 140px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              box-sizing: border-box;
            }
            .user-info {
              text-align: center;
              margin-bottom: 20px;
            }
            .user-name {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 4px 0;
              color: #ffffff;
            }
            .user-instansi {
              font-size: 12px;
              color: #d1fae5;
              font-weight: 500;
              margin: 0 0 6px 0;
            }
            .user-token {
              font-size: 10.5px;
              color: #a7f3d0;
              font-family: monospace;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .card-footer {
              border-top: 1px solid rgba(16, 185, 129, 0.3);
              padding-top: 14px;
              font-size: 10px;
              color: #d1fae5;
              text-align: center;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="card-header">
              <span class="badge">KARTU TANDA PESERTA RESMI</span>
              <h3 class="title">PresenTrain Digital ID</h3>
            </div>
            
            <div class="qr-container">
              ${qrSvgHtml}
            </div>
            
            <div class="user-info">
              <h4 class="user-name">${name}</h4>
              <p class="user-instansi">${instansi}</p>
              <p class="user-token">${qrTokenDisplay}</p>
            </div>
            
            <div class="card-footer">
              Status: Terverifikasi Panitia
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 350);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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



      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: QR TOKEN & USER SUMMARY CARD */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5 text-center">
            
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{user?.name}</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{instansi}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-xl border border-emerald-200">
                {jabatan}
              </span>
            </div>

            {/* SVG QR CODE CONTAINER */}
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200/90 space-y-3">

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-inner flex justify-center">
                <QRCodeSVG
                  value={qrTokenDisplay}
                  size={170}
                  level="H"
                  includeMargin={true}
                  className="rounded-xl"
                />
              </div>

              <div className="font-mono font-bold text-slate-900 bg-white p-2.5 rounded-xl border border-emerald-300 text-center tracking-wider text-xs break-all shadow-xs">
                {qrTokenDisplay}
              </div>

              <button
                type="button"
                onClick={handleCopyQrToken}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Token Tersalin!' : 'Salin Kode QR'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: EDIT FORM TABS */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-4 space-x-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('biodata')}
              className={`pb-3.5 border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'biodata' ? 'border-emerald-600 text-emerald-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Informasi</span>
            </button>


            <button
              onClick={() => setActiveTab('id_card')}
              className={`pb-3.5 border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'id_card' ? 'border-emerald-600 text-emerald-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Kartu Digital</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 flex-1">
            
            {/* TAB 1: BIODATA */}
            {activeTab === 'biodata' && (
              <form onSubmit={handleSaveBiodata} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 font-semibold outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Alamat Email <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 font-semibold outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Instansi / Universitas</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={instansi}
                        onChange={(e) => setInstansi(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jabatan / Peran</label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={jabatan}
                        onChange={(e) => setJabatan(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp / Telepon Kontak</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Biodata Ringkas</label>
                  <textarea
                    rows={2}
                    value={bioNote}
                    onChange={(e) => setBioNote(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white transition-all text-xs"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 btn-emerald text-xs font-bold rounded-2xl flex items-center space-x-2 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Biodata</span>
                  </button>
                </div>

              </form>
            )}


            {/* TAB 3: ID CARD PRESENSI DIGITAL */}
            {activeTab === 'id_card' && (
              <div className="space-y-5 text-xs">
                <div className="max-w-[340px] w-full mx-auto p-6 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl border border-emerald-600/40 shadow-xl relative overflow-hidden space-y-5 text-center">
                  <div className="border-b border-emerald-500/30 pb-4 text-center">
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-400/20 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-300/30 inline-block">
                      KARTU TANDA PESERTA RESMI
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">PresenTrain Digital ID</h3>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className="bg-white p-3.5 rounded-2xl shadow-md shrink-0 mx-auto">
                      <QRCodeSVG id="printable-idcard-qr" value={qrTokenDisplay} size={140} level="H" />
                    </div>
                    <div className="space-y-1 text-center w-full">
                      <h4 className="text-lg font-extrabold text-white leading-tight">{name}</h4>
                      <p className="text-xs text-emerald-100 font-medium">{instansi}</p>
                      <p className="text-[11px] text-emerald-200 font-mono pt-1.5">{qrTokenDisplay}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/30 text-[10px] text-emerald-100 font-semibold text-center">
                    Status: Terverifikasi Panitia
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handlePrintIDCard}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl border border-slate-300 flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Cetak Kartu Peserta</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
