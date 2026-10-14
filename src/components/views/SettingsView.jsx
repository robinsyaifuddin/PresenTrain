import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '@/services/api';
import NotificationPopup from '@/components/ui/Feedback/NotificationPopup';
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
  };

  const [resetTargetEmail, setResetTargetEmail] = useState(user?.email || 'peserta@absentraining.com');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [resetStep, setResetStep] = useState('form');
  const [resetOtpInput, setResetOtpInput] = useState('');
  const [resetTimer, setResetTimer] = useState(60);
  const [resetLoading, setResetLoading] = useState(false);

  const currentEmail = user?.email || 'peserta@absentraining.com';
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailStep, setEmailStep] = useState('form');
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [emailTimer, setEmailTimer] = useState(60);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setResetTargetEmail(user.email);
    }
  }, [user?.email]);

  const [loginGmailInput, setLoginGmailInput] = useState(user?.email || '');
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

  const handleSendResetOtp = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('⚠️ Kata sandi baru minimal harus 6 karakter!');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('⚠️ Konfirmasi kata sandi baru tidak cocok!');
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.sendForgotPasswordOtp(resetTargetEmail.trim().toLowerCase());
      if (res.ok) {
        setResetOtpInput('');
        setResetTimer(60);
        setResetStep('otp');
        showToast(`Kode OTP 6-digit telah dikirimkan ke ${resetTargetEmail.trim()}`);
      } else {
        showToast(res.data?.message || 'Gagal mengirim kode OTP. Pastikan email terdaftar.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan saat mengirim email OTP.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = resetOtpInput.trim();
    if (cleanOtp.length !== 6) {
      showToast('Harap masukkan 6 digit kode OTP secara lengkap.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.resetPasswordWithOtp(
        resetTargetEmail.trim().toLowerCase(),
        cleanOtp,
        newPassword
      );

      if (res.ok) {
        setResetStep('success');
        setNewPassword('');
        setConfirmPassword('');
        try { confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } }); } catch (err) {}
        showToast('Kata sandi akun Anda berhasil diperbarui!');
      } else {
        showToast(res.data?.message || 'Kode OTP tidak cocok atau sudah kedaluwarsa.');
      }
    } catch (err) {
      showToast('Gagal memverifikasi kode OTP.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendEmailOtp = async (e) => {
    if (e) e.preventDefault();
    if (!newEmailInput || !newEmailInput.includes('@')) {
      showToast('⚠️ Masukkan alamat Gmail baru yang valid!');
      return;
    }
    if (newEmailInput.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
      showToast('⚠️ Email baru tidak boleh sama dengan email saat ini!');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await api.sendChangeEmailOtp(newEmailInput.trim().toLowerCase());
      if (res.ok) {
        setEmailOtpInput('');
        setEmailTimer(60);
        setEmailStep('otp');
        showToast(`Kode OTP verifikasi telah dikirim ke ${newEmailInput.trim()}`);
      } else {
        showToast(res.data?.message || 'Gagal mengirim kode OTP ke email baru.');
      }
    } catch (err) {
      showToast('Terjadi kesalahan koneksi saat mengirim kode OTP.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = emailOtpInput.trim();
    if (cleanOtp.length !== 6) {
      showToast('Harap masukkan 6 digit kode OTP secara lengkap.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await api.verifyChangeEmailOtp(
        currentEmail.trim().toLowerCase(),
        newEmailInput.trim().toLowerCase(),
        cleanOtp
      );

      if (res.ok) {
        setEmailStep('success');
        const updatedUser = res.data?.user || { ...user, email: newEmailInput.trim() };
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
        setResetTargetEmail(updatedUser.email);
        try { confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } }); } catch (err) {}
        showToast(`Email utama berhasil diperbarui menjadi: ${updatedUser.email}`);
      } else {
        showToast(res.data?.message || 'Kode OTP tidak cocok.');
      }
    } catch (err) {
      showToast('Gagal memverifikasi kode OTP perubahan email.');
    } finally {
      setEmailLoading(false);
    }
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans animate-fade-in w-full">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: RESET KATA SANDI AKUN */}
        <div className="bg-white rounded-md p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
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
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-md border border-slate-300 font-medium text-slate-800 outline-none focus:border-emerald-600 focus:bg-white transition-colors"
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
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-50 rounded-md border border-slate-300 font-medium text-slate-800 outline-none focus:border-emerald-600 focus:bg-white transition-colors"
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
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-50 rounded-md border border-slate-300 font-medium text-slate-800 outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                      placeholder="Ulangi kata sandi baru"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {resetLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim Kode OTP...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Kode OTP Ke Gmail</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {resetStep === 'otp' && (
              <form onSubmit={handleVerifyResetOtp} className="space-y-3 pt-3 text-xs animate-fade-in">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md space-y-1">
                  <p className="font-bold flex items-center space-x-1.5 text-emerald-950 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kode OTP Terkirim ke: {resetTargetEmail}</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    Silakan periksa kotak masuk atau spam email Anda untuk melihat 6-digit kode OTP verifikasi.
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
                    className="w-full tracking-[0.5em] text-center py-3 bg-slate-50 rounded-md border-2 border-emerald-500 font-mono text-lg font-black text-slate-900 outline-none focus:bg-white"
                    placeholder="000000"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleSendResetOtp}
                    disabled={resetTimer > 0 || resetLoading}
                    className="text-[11px] font-bold text-emerald-700 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? 'Mengirim...' : 'Kirim Ulang OTP'}
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setResetStep('form')}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-60"
                  >
                    {resetLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verifikasi & Reset</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'success' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md space-y-3 text-center animate-fade-in my-3">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto font-bold shadow-xs">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Kata Sandi Berhasil Diperbarui!</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">Kata sandi akun Anda telah berhasil diubah via verifikasi OTP Gmail.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetStep('form')}
                  className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-md transition-colors cursor-pointer"
                >
                  Reset Ulang Lagi
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: UBAH ALAMAT EMAIL UTAMA */}
        <div className="bg-white rounded-md p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <Mail className="w-5 h-5 text-emerald-600" />
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
                    className="w-full px-3 py-2.5 bg-slate-100 rounded-md border border-slate-200 font-semibold text-slate-500 cursor-not-allowed"
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
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-md border border-slate-300 font-medium text-slate-800 outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                      placeholder="email.baru@gmail.com"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] text-emerald-900">
                  <p className="flex items-center space-x-1 font-semibold">
                    <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Kode verifikasi OTP akan dikirimkan langsung ke Gmail baru tersebut.</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {emailLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim Kode OTP...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim OTP Ke Gmail Baru</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {emailStep === 'otp' && (
              <form onSubmit={handleVerifyEmailOtp} className="space-y-3 pt-3 text-xs animate-fade-in">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md space-y-1">
                  <p className="font-bold flex items-center space-x-1.5 text-emerald-950 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kode OTP Terkirim ke: {newEmailInput}</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    Silakan periksa kotak masuk atau spam di email baru Anda untuk melihat 6-digit kode OTP verifikasi.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Masukkan 6-Digit Kode OTP</label>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{emailTimer} detik</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtpInput}
                    onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full tracking-[0.5em] text-center py-3 bg-slate-50 rounded-md border-2 border-emerald-500 font-mono text-lg font-black text-slate-900 outline-none focus:bg-white"
                    placeholder="000000"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={emailTimer > 0 || emailLoading}
                    className="text-[11px] font-bold text-emerald-700 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {emailLoading ? 'Mengirim...' : 'Kirim Ulang OTP'}
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEmailStep('form')}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-60"
                  >
                    {emailLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Verifikasi & Perbarui</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {emailStep === 'success' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md space-y-3 text-center animate-fade-in my-3">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto font-bold shadow-xs">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Alamat Email Berhasil Diperbarui!</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">Email utama akun kini telah aktif menggunakan: <strong className="font-bold">{newEmailInput}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailStep('form')}
                  className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-md transition-colors cursor-pointer"
                >
                  Ubah Email Lainnya
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

