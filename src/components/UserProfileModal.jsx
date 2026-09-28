import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  User, Mail, Building, Briefcase, Phone, QrCode, 
  KeyRound, ShieldCheck, Save, X, CheckCircle2, Copy, Sparkles 
} from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, user, onUpdateUser }) {
  if (!isOpen || !user) return null;

  const [activeTab, setActiveTab] = useState('biodata'); // 'biodata' | 'security'
  
  // Form states
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [instansi, setInstansi] = useState(user.instansi || 'Universitas / Instansi Umum');
  const [jabatan, setJabatan] = useState(user.jabatan || (user.role === 'super_admin' ? 'Super Administrator' : user.role === 'admin' ? 'Panitia Operator' : 'Peserta Training'));
  const [phone, setPhone] = useState(user.phone || '0812-3456-7890');
  
  // Security states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [notification, setNotification] = useState('');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleCopyQrToken = () => {
    const tokenStr = user.qrToken || `ABSEN-PESERTA-${user.name.toUpperCase().replace(/\s+/g, '-')}-88291`;
    navigator.clipboard.writeText(tokenStr);
    showToast('Token QR Presensi berhasil disalin!');
  };

  const handleSaveBiodata = (e) => {
    e.preventDefault();
    if (!name || !email) {
      alert('Nama dan Email tidak boleh kosong!');
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
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (err) {}

    showToast('Data Profil berhasil diperbarui!');
    setTimeout(() => onClose(), 1200);
  };

  const handleSaveSecurity = (e) => {
    e.preventDefault();
    if (!oldPassword) {
      alert('Masukkan password saat ini!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password baru minimal 6 karakter!');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Konfirmasi password baru tidak cocok!');
      return;
    }

    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (err) {}

    showToast('Password Akun berhasil diperbarui!');
    setTimeout(() => onClose(), 1200);
  };

  const qrTokenDisplay = user.qrToken || `ABSEN-PESERTA-${(user.name || 'USER').toUpperCase().replace(/\s+/g, '-')}-88291`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
        
        {/* Toast Notification */}
        {notification && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Modal Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/30">
                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Panitia Admin' : 'Peserta Pelatihan'}
              </span>
              <h3 className="text-xl font-extrabold mt-1 leading-tight">{user.name}</h3>
              <p className="text-xs text-emerald-100">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 space-x-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('biodata')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'biodata' ? 'border-emerald-600 text-emerald-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Informasi Biodata</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'security' ? 'border-emerald-600 text-emerald-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Keamanan Password</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6">
          {activeTab === 'biodata' ? (
            <form onSubmit={handleSaveBiodata} className="space-y-4 text-xs">
              
              {/* QR Token Presensi Info Card */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1.5">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span className="flex items-center space-x-1.5 text-emerald-800">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Token Kode Presensi Unik Akun</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyQrToken}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Salin Token</span>
                  </button>
                </div>
                <div className="font-mono font-bold text-slate-900 bg-white p-2.5 rounded-xl border border-emerald-300/80 text-center tracking-wider text-xs">
                  {qrTokenDisplay}
                </div>
              </div>

              {/* Grid Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Email <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instansi / Lembaga</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={instansi}
                      onChange={(e) => setInstansi(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan / Posisi</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={jabatan}
                      onChange={(e) => setJabatan(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp / Kontak HP</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-emerald text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>

            </form>
          ) : (
            <form onSubmit={handleSaveSecurity} className="space-y-4 text-xs">
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong className="block font-bold">Keamanan Akun Protected:</strong>
                Gunakan kombinasi kata sandi kuat yang terdiri dari huruf besar, angka, dan karakter khusus.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password Saat Ini <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password Baru <span className="text-rose-500">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 Karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Konfirmasi Password Baru <span className="text-rose-500">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Ulangi Password Baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
