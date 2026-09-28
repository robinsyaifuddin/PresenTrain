import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Settings, Mail, Lock, KeyRound, ShieldCheck, 
  ArrowLeft, CheckCircle2, Save, Sparkles, Globe, Shield, 
  Trash2, RefreshCw, Send, Clock, Check, AlertCircle, LogIn,
  Eye, EyeOff, Smartphone, CheckCircle, HelpCircle, Info
} from 'lucide-react';

export default function SettingsView({ siteSettings, user, onUpdateUser, onBack }) {
  const [notification, setNotification] = useState('');

  const [emailNotify, setEmailNotify] = useState(true);
  const [sessionReminder, setSessionReminder] = useState(true);
  const [language, setLanguage] = useState('id');
  const [timezone, setTimezone] = useState('WIB');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const [resetTargetEmail, setResetTargetEmail] = useState(user?.email || 'peserta@absentraining.com');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [resetStep, setResetStep] = useState('form');
  const [resetOtpGenerated, setResetOtpGenerated] = useState('');
  const [resetOtpInput, setResetOtpInput] = useState('');
  const [resetTimer, setResetTimer] = useState(60);

  const currentEmail = user?.email || 'peserta@absentraining.com';
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailStep, setEmailStep] = useState('form');
  const [emailOtpGenerated, setEmailOtpGenerated] = useState('');
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [emailTimer, setEmailTimer] = useState(60);

  const [loginGmailInput, setLoginGmailInput] = useState(user?.email || 'peserta.demo@gmail.com');
  const [loginStep, setLoginStep] = useState('form');
  const [loginOtpGenerated, setLoginOtpGenerated] = useState('');
  const [loginOtpInput, setLoginOtpInput] = useState('');
  const [loginTimer, setLoginTimer] = useState(60);

  useEffect(() => {
    let timer1, timer2, timer3;
    if (resetStep === 'otp' && resetTimer > 0) {
      timer1 = setInterval(() => setResetTimer((prev) => prev - 1), 1000);
    }
    if (emailStep === 'otp' && emailTimer > 0) {
      timer2 = setInterval(() => setEmailTimer((prev) => prev - 1), 1000);
    }
    if (loginStep === 'otp' && loginTimer > 0) {
      timer3 = setInterval(() => setLoginTimer((prev) => prev - 1), 1000);
    }

    return () => {
      clearInterval(timer1);
      clearInterval(timer2);
      clearInterval(timer3);
    };
  }, [resetStep, resetTimer, emailStep, emailTimer, loginStep, loginTimer]);

  const handleSendResetOtp = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('⚠️ Password baru minimal harus 6 karakter!');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('⚠️ Konfirmasi password baru tidak cocok!');
      return;
    }

    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setResetOtpGenerated(randomCode);
    setResetOtpInput('');
    setResetTimer(60);
    setResetStep('otp');
    showToast(`📩 SIMULASI GMAIL: Kode OTP Reset (${randomCode}) telah dikirim ke ${resetTargetEmail}`);
  };

  const handleVerifyResetOtp = (e) => {
    e.preventDefault();
    if (resetOtpInput.trim() !== resetOtpGenerated) {
      showToast('❌ Kode OTP tidak sesuai! Silakan periksa pesan demo di inbox.');
      return;
    }

    setResetStep('success');
    setNewPassword('');
    setConfirmPassword('');
    try { confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } }); } catch (err) {}
    showToast('🎉 Berhasil! Kata sandi akun Anda telah diperbarui.');
  };

  const handleSendEmailOtp = (e) => {
    e.preventDefault();
    if (!newEmailInput || !newEmailInput.includes('@')) {
      showToast('⚠️ Masukkan alamat Gmail baru yang valid!');
      return;
    }
    if (newEmailInput.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
      showToast('⚠️ Email baru tidak boleh sama dengan email saat ini!');
      return;
    }

    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setEmailOtpGenerated(randomCode);
    setEmailOtpInput('');
    setEmailTimer(60);
    setEmailStep('otp');
    showToast(`📩 SIMULASI GMAIL: Kode OTP (${randomCode}) telah dikirim ke ${newEmailInput}`);
  };

  const handleVerifyEmailOtp = (e) => {
    e.preventDefault();
    if (emailOtpInput.trim() !== emailOtpGenerated) {
      showToast('❌ Kode OTP tidak sesuai! Silakan periksa pesan demo di inbox.');
      return;
    }

    setEmailStep('success');
    const updatedEmail = newEmailInput.trim();
    if (onUpdateUser && user) {
      onUpdateUser({ ...user, email: updatedEmail });
    }
    try { confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } }); } catch (err) {}
    showToast(`🎉 Email utama akun Anda berhasil diubah menjadi: ${updatedEmail}`);
  };

  const handleSendLoginOtp = (e) => {
    e.preventDefault();
    if (!loginGmailInput || !loginGmailInput.includes('@')) {
      showToast('⚠️ Masukkan alamat Gmail untuk demo login!');
      return;
    }

    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setLoginOtpGenerated(randomCode);
    setLoginOtpInput('');
    setLoginTimer(60);
    setLoginStep('otp');
    showToast(`📩 SIMULASI GMAIL: Kode OTP Login Sesi (${randomCode}) dikirim ke ${loginGmailInput}`);
  };

  const handleVerifyLoginOtp = (e) => {
    e.preventDefault();
    if (loginOtpInput.trim() !== loginOtpGenerated) {
      showToast('❌ Kode OTP tidak sesuai!');
      return;
    }

    setLoginStep('authenticated');
    try { confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } }); } catch (err) {}
    showToast(`🎉 Autentikasi Demo Login OTP Gmail Berhasil! Sesi Aktif.`);
  };

  const handleClearCache = () => {
    showToast('Data cache lokal sementara berhasil dibersihkan!');
  };

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch (err) {}
    showToast('Konfigurasi bahasa & notifikasi berhasil disimpan!');
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans animate-fade-in">
      {notification && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs md:text-sm font-semibold shadow-lg flex items-center justify-between animate-fade-in border border-emerald-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{notification}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <KeyRound className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Reset Kata Sandi Akun</h3>
                <p className="text-[11px] text-slate-500">Mekanisme reset password aman via OTP Gmail</p>
              </div>
            </div>

            {resetStep === 'form' && (
              <form onSubmit={handleSendResetOtp} className="space-y-3 pt-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Akun Tujuan OTP</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={resetTargetEmail}
                      onChange={(e) => setResetTargetEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      placeholder="contoh@gmail.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      placeholder="Minimal 6 karakter"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      placeholder="Ulangi kata sandi baru"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Kode OTP Ke Gmail</span>
                </button>
              </form>
            )}

            {resetStep === 'otp' && (
              <form onSubmit={handleVerifyResetOtp} className="space-y-3 pt-3 text-xs animate-fade-in">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                    <span className="flex items-center space-x-1.5">
                      <Mail className="w-4 h-4 text-emerald-600" />
                      <span>Simulasi Message Inbox Gmail</span>
                    </span>
                    <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md text-[10px]">Pesan Masuk</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    📩 Kode OTP Reset Kata Sandi Anda adalah: <strong className="text-emerald-950 font-black tracking-widest text-sm bg-white px-2 py-0.5 rounded border border-emerald-300">{resetOtpGenerated}</strong>
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Masukkan 6-Digit Kode OTP</label>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{resetTimer} detik</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetOtpInput}
                    onChange={(e) => setResetOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full tracking-[0.5em] text-center py-3 bg-slate-50 rounded-2xl border-2 border-emerald-500 font-mono text-lg font-black text-slate-900 outline-none focus:bg-white"
                    placeholder="000000"
                    required
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setResetOtpInput(resetOtpGenerated)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                  >
                    ⚡ Isikan Kode Demo ({resetOtpGenerated})
                  </button>

                  <button
                    type="button"
                    onClick={handleSendResetOtp}
                    disabled={resetTimer > 0}
                    className="text-[11px] font-bold text-emerald-700 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    Kirim Ulang OTP
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setResetStep('form')}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verifikasi & Reset</span>
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'success' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-center animate-fade-in my-3">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto font-bold shadow-md">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Kata Sandi Berhasil Diperbarui!</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">Kata sandi akun Anda telah berhasil diubah via verifikasi OTP Gmail.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetStep('form')}
                  className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Reset Ulang Lagi
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold shrink-0">
                <Mail className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Ubah Alamat Email Utama</h3>
                <p className="text-[11px] text-slate-500">Verifikasi kode OTP ke alamat Gmail baru Anda</p>
              </div>
            </div>

            {emailStep === 'form' && (
              <form onSubmit={handleSendEmailOtp} className="space-y-3 pt-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Akun Saat Ini</label>
                  <input
                    type="email"
                    value={currentEmail}
                    disabled
                    className="w-full px-3 py-2.5 bg-slate-100 rounded-2xl border border-slate-200 font-semibold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Gmail Baru</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-teal-600 focus:bg-white transition-all"
                      placeholder="email.baru@gmail.com"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-[11px] text-teal-800">
                  <p className="flex items-center space-x-1 font-semibold">
                    <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Kode verifikasi OTP akan dikirimkan langsung ke Gmail baru tersebut.</span>
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim OTP Ke Gmail Baru</span>
                </button>
              </form>
            )}

            {emailStep === 'otp' && (
              <form onSubmit={handleVerifyEmailOtp} className="space-y-3 pt-3 text-xs animate-fade-in">
                <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-teal-900">
                    <span className="flex items-center space-x-1.5">
                      <Mail className="w-4 h-4 text-teal-600" />
                      <span>Simulasi Inbox Gmail Baru</span>
                    </span>
                    <span className="bg-teal-200 text-teal-800 px-2 py-0.5 rounded-md text-[10px]">OTP Gmail Baru</span>
                  </div>
                  <p className="text-[11px] text-teal-800 leading-tight">
                    📩 Kode OTP Verifikasi Email Baru Anda: <strong className="text-teal-950 font-black tracking-widest text-sm bg-white px-2 py-0.5 rounded border border-teal-300">{emailOtpGenerated}</strong>
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Masukkan 6-Digit Kode OTP</label>
                    <span className="text-[11px] font-bold text-teal-700 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{emailTimer} detik</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtpInput}
                    onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full tracking-[0.5em] text-center py-3 bg-slate-50 rounded-2xl border-2 border-teal-500 font-mono text-lg font-black text-slate-900 outline-none focus:bg-white"
                    placeholder="000000"
                    required
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailOtpInput(emailOtpGenerated)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                  >
                    ⚡ Isikan Kode Demo ({emailOtpGenerated})
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={emailTimer > 0}
                    className="text-[11px] font-bold text-teal-700 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    Kirim Ulang OTP
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEmailStep('form')}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Verifikasi & Perbarui</span>
                  </button>
                </div>
              </form>
            )}

            {emailStep === 'success' && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-3 text-center animate-fade-in my-3">
                <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto font-bold shadow-md">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-teal-950 text-sm">Alamat Email Berhasil Diperbarui!</h4>
                  <p className="text-[11px] text-teal-800 mt-0.5">Email utama akun kini telah aktif menggunakan: <strong className="font-bold">{newEmailInput}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailStep('form')}
                  className="px-4 py-2 bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Ubah Email Lainnya
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                <LogIn className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Demo Login Mekanisme OTP Gmail</h3>
                <p className="text-[11px] text-slate-500">Uji simulasi autentikasi login cepat via kode OTP Gmail</p>
              </div>
            </div>

            {loginStep === 'form' && (
              <form onSubmit={handleSendLoginOtp} className="space-y-3 pt-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Gmail Untuk Demo Login</label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={loginGmailInput}
                      onChange={(e) => setLoginGmailInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-indigo-600 focus:bg-white transition-all"
                      placeholder="peserta.demo@gmail.com"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-[11px] text-indigo-900">
                  <p className="font-semibold flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Mekanisme tanpa kata sandi (Passwordless OTP Login).</span>
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Minta OTP Login Gmail</span>
                </button>
              </form>
            )}

            {loginStep === 'otp' && (
              <form onSubmit={handleVerifyLoginOtp} className="space-y-3 pt-3 text-xs animate-fade-in">
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                    <span className="flex items-center space-x-1.5">
                      <Mail className="w-4 h-4 text-indigo-600" />
                      <span>Simulasi Message Inbox Gmail</span>
                    </span>
                    <span className="bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-md text-[10px]">Kode OTP Login</span>
                  </div>
                  <p className="text-[11px] text-indigo-900 leading-tight">
                    📩 Kode OTP Login Sesi PresenTrain Anda: <strong className="text-indigo-950 font-black tracking-widest text-sm bg-white px-2 py-0.5 rounded border border-indigo-300">{loginOtpGenerated}</strong>
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Masukkan 6-Digit OTP Login</label>
                    <span className="text-[11px] font-bold text-indigo-700 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{loginTimer} detik</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={loginOtpInput}
                    onChange={(e) => setLoginOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full tracking-[0.5em] text-center py-3 bg-slate-50 rounded-2xl border-2 border-indigo-500 font-mono text-lg font-black text-slate-900 outline-none focus:bg-white"
                    placeholder="000000"
                    required
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginOtpInput(loginOtpGenerated)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                  >
                    ⚡ Isikan Kode Demo ({loginOtpGenerated})
                  </button>

                  <button
                    type="button"
                    onClick={handleSendLoginOtp}
                    disabled={loginTimer > 0}
                    className="text-[11px] font-bold text-indigo-700 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    Kirim Ulang OTP
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLoginStep('form')}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Verifikasi & Login</span>
                  </button>
                </div>
              </form>
            )}

            {loginStep === 'authenticated' && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-3 text-center animate-fade-in my-3">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto font-bold shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-950 text-sm">Demo Login OTP Berhasil!</h4>
                  <p className="text-[11px] text-indigo-800 mt-0.5">Sesi otentikasi aktif menggunakan akun: <strong className="font-bold">{loginGmailInput}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginStep('form')}
                  className="px-4 py-2 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Uji Coba Demo Lagi
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Bahasa & Informasi Sistem</h3>
                <p className="text-[11px] text-slate-500">Pengaturan bahasa antarmuka dan notifikasi</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bahasa Pengantar</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-emerald-600"
                  >
                    <option value="id">Bahasa Indonesia (ID)</option>
                    <option value="en">English (US)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zona Waktu Sesi</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-emerald-600"
                  >
                    <option value="WIB">WIB (UTC+7)</option>
                    <option value="WITA">WITA (UTC+8)</option>
                    <option value="WIT">WIT (UTC+9)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="block font-semibold text-slate-700">Preferensi Notifikasi</span>
                
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <span className="font-medium text-slate-800">Email Bukti Presensi Kehadiran</span>
                  <input
                    type="checkbox"
                    checked={emailNotify}
                    onChange={(e) => setEmailNotify(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <span className="font-medium text-slate-800">Pengingat Sesi Pelatihan H-1 Jam</span>
                  <input
                    type="checkbox"
                    checked={sessionReminder}
                    onChange={(e) => setSessionReminder(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500 font-sans">Status Sistem:</span>
                <span className="font-bold text-emerald-600 font-sans flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online Normal</span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <button
                type="button"
                onClick={handleClearCache}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-slate-500" />
                <span>Bersihkan Cache</span>
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-white" />
                <span>Simpan Preferensi</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
