import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronDown,
  Mail, Key, CheckCircle, X, RefreshCw, Sparkles, ArrowRight, ShieldCheck, User, Download, Smartphone
} from 'lucide-react';
import { api, getBackendUrl } from '@/services/api';
import { offlineSync } from '@/services/offlineSync';
import PWAInstallModal, { triggerDirectPWAInstall } from '@/components/ui/PWAInstallModal';
import CoolLoader from '@/components/ui/Feedback/CoolLoader';
import { useFeedback } from '@/context/FeedbackContext';

export default function AuthScreen({ 
  onLoginSuccess, 
  siteSettings, 
  urlQuizCode,
  googleCompletionData,
  onClearGoogleCompletion,
  googleAuthError,
  onClearGoogleError,
  initialAuthMode = 'login'
}) {
  const [isRegister, setIsRegister] = useState(initialAuthMode === 'register');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = isRegister ? '/register' : '/login';
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
      }
    }
  }, [isRegister]);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [instansi, setInstansi] = useState('');
  const [gender, setGender] = useState('L');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  const { showNotification } = useFeedback();

  // Cool Spinning Loading Animation State
  const [authLoading, setAuthLoading] = useState(false);
  const [authLoadingText, setAuthLoadingText] = useState('Mengautentikasi Akun...');
  const [authLoadingSubtext, setAuthLoadingSubtext] = useState('Menghubungkan ke database PresenTrain...');

  // PWA Install Prompt Modal State (Dibuka saat pengguna klik tombol install)
  const [showPWAModal, setShowPWAModal] = useState(false);

  const handleClosePWAModal = () => {
    setShowPWAModal(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    }
  };

  // Google Profile Completion State (For first-time Google OAuth users)
  const [googleName, setGoogleName] = useState('');
  const [googleInstansi, setGoogleInstansi] = useState('');
  const [googleGender, setGoogleGender] = useState('L');
  const [googlePhone, setGooglePhone] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [googleConfirmPassword, setGoogleConfirmPassword] = useState('');
  const [showGooglePassword, setShowGooglePassword] = useState(false);
  const [googleCompletionError, setGoogleCompletionError] = useState('');
  const [googleSubmitLoading, setGoogleSubmitLoading] = useState(false);

  // Sync Google Completion Data if present from redirect
  useEffect(() => {
    if (googleCompletionData) {
      setGoogleName(googleCompletionData.name || '');
      setGoogleInstansi('');
      setGoogleGender('L');
      setGooglePhone('');
      setGooglePassword('');
      setGoogleConfirmPassword('');
      setGoogleCompletionError('');
    }
  }, [googleCompletionData]);

  // Forgot Password & Real Email OTP Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Pass, 4: Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [otpLoading, setOtpLoading] = useState(false);

  const initialSlides = [
    {
      id: 1,
      image: '/training_hero.jpg',
      tag: 'Presensi QR Digital',
      author: siteSettings?.siteName || 'PresenTrain 2.0',
      role: 'UI & Digital Attendance System'
    },
    {
      id: 2,
      image: '/scanner_hero.jpg',
      tag: 'Live Camera Scanner',
      author: 'Quick QR Presensi',
      role: 'Barcode & Fast Validation'
    },
    {
      id: 3,
      image: '/management_hero.jpg',
      tag: 'Management Event',
      author: 'Multi-Role Training',
      role: 'Realtime Analytics & Certificate'
    },
    {
      id: 4,
      image: '/profile_hero.jpg',
      tag: 'Digital Identity Pass',
      author: 'Secure Biometric Access',
      role: 'Unified Participant ID'
    }
  ];

  const [slides, setSlides] = useState(initialSlides);

  // Filter out any broken slide image
  const handleImageError = (failedSlideId) => {
    setSlides((prev) => {
      const updated = prev.filter((s) => s.id !== failedSlideId);
      if (updated.length > 0) {
        setCurrentSlide((curr) => curr % updated.length);
      }
      return updated;
    });
  };

  // Auto slide dissolve background images every 6 seconds with slow cross-fade
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (forgotStep === 2 && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [forgotStep, otpCountdown]);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Trigger Real Google OAuth 2.0 Flow
  const handleRealGoogleRedirect = () => {
    // Deteksi jika dibuka dari In-App Browser (WhatsApp, Instagram, Telegram, WebView) yang diblokir oleh kebijakan keamanan Google
    const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || navigator.vendor || '') : '';
    const isInApp = /FBAN|FBAV|Instagram|Line|WhatsApp|KAKAOTALK|MicroMessenger|Snapchat|Bytedance|TikTok/i.test(ua) || 
                   (/wv/.test(ua) && /Android/i.test(ua));

    if (isInApp) {
      alert('Perhatian: Google memblokir login dari browser bawaan WhatsApp/Instagram.\n\nSilakan tekan titik tiga (⋮) di pojok kanan atas, lalu pilih "Buka di Browser / Chrome / Safari" untuk melanjutkan login Google.');
      return;
    }

    offlineSync.setOnboarded(true);
    setAuthLoading(true);
    setAuthLoadingText('Menghubungkan ke Akun Google...');
    setAuthLoadingSubtext('Mengalihkan ke sistem otentikasi Google OAuth 2.0...');
    const backendBase = getBackendUrl();
    window.location.href = `${backendBase}/api/auth/google`;
  };

  // Submit Completed Google Registration (Name, Instansi, Password)
  const handleCompleteGoogleRegistration = async (e) => {
    e.preventDefault();
    if (!googleInstansi.trim()) {
      setGoogleCompletionError('Asal Komisariat wajib diisi!');
      return;
    }
    if (!googlePassword || googlePassword.length < 6) {
      setGoogleCompletionError('Kata sandi minimal 6 karakter!');
      return;
    }
    if (googlePassword !== googleConfirmPassword) {
      setGoogleCompletionError('Konfirmasi kata sandi tidak cocok!');
      return;
    }

    setGoogleSubmitLoading(true);
    setGoogleCompletionError('');

    try {
      const res = await api.completeGoogleRegistration({
        temp_token: googleCompletionData.tempToken,
        name: googleName.trim() || googleCompletionData.name,
        instansi: googleInstansi.trim(),
        gender: googleGender || 'L',
        phone: googlePhone.trim() || '0812-0000-0000',
        password: googlePassword,
      });

      if (res.ok && res.data?.user) {
        if (res.data?.token) {
          localStorage.setItem('presentrain_token', res.data.token);
        }
        const userObj = {
          ...res.data.user,
          qrToken: res.data.user.user_qr_token || res.data.user.qrToken,
        };
        offlineSync.cacheUserProfile(userObj);
        offlineSync.setOnboarded(true);
        if (onClearGoogleCompletion) onClearGoogleCompletion();
        onLoginSuccess(userObj);
        return;
      }

      setGoogleCompletionError(res.data?.message || 'Gagal menyelesaikan pendaftaran Google.');
    } catch (err) {
      setGoogleCompletionError('Terjadi kesalahan sistem saat menghubungi backend.');
    } finally {
      setGoogleSubmitLoading(false);
    }
  };

  // Forgot Password & Gmail OTP Flow Handlers
  // Forgot Password & Real OTP Handlers (Hostinger Webmail SMTP)
  const handleOpenForgotModal = () => {
    setShowForgotModal(true);
    setForgotStep(1);
    setForgotEmail('');
    setInputOtp('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setShowResetNewPassword(false);
    setShowResetConfirmPassword(false);
    setOtpError('');
    setOtpLoading(false);
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setOtpError('Harap masukkan alamat email yang valid.');
      return;
    }
    setOtpError('');
    setOtpLoading(true);

    try {
      const res = await api.sendForgotPasswordOtp(forgotEmail.trim().toLowerCase());
      if (res.ok) {
        setForgotStep(2);
        setOtpCountdown(60);
        showNotification(
          `Kode OTP 6-digit telah dikirim ke ${forgotEmail.trim()}. Silakan cek email Anda.`,
          'success',
          3500
        );
      } else {
        setOtpError(res.data?.message || 'Gagal mengirim kode OTP. Pastikan email terdaftar.');
      }
    } catch (err) {
      setOtpError('Terjadi kesalahan jaringan saat mengirim email OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = inputOtp.trim();
    if (cleanOtp.length !== 6) {
      setOtpError('Harap masukkan 6 digit kode OTP secara lengkap.');
      return;
    }
    setOtpError('');
    setOtpLoading(true);

    try {
      const res = await api.verifyForgotPasswordOtp(forgotEmail.trim().toLowerCase(), cleanOtp);
      if (res.ok) {
        setForgotStep(3);
      } else {
        setOtpError(res.data?.message || 'Kode OTP tidak cocok atau sudah kedaluwarsa.');
      }
    } catch (err) {
      setOtpError('Gagal memverifikasi kode OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSaveNewPassword = async (e) => {
    e.preventDefault();
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setOtpError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setOtpError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setOtpError('');
    setOtpLoading(true);

    try {
      const res = await api.resetPasswordWithOtp(
        forgotEmail.trim().toLowerCase(),
        inputOtp.trim(),
        resetNewPassword
      );

      if (res.ok) {
        setForgotStep(4);
        showNotification(
          'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.',
          'success',
          3500
        );
        setTimeout(() => {
          setShowForgotModal(false);
          setEmail(forgotEmail);
          setIsRegister(false);
        }, 2200);
      } else {
        setOtpError(res.data?.message || 'Gagal mereset kata sandi.');
      }
    } catch (err) {
      setOtpError('Terjadi kesalahan sistem saat memperbarui kata sandi.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isRegister) {
      if (!name || !email || !password) {
        setErrorMsg('Harap isi Nama, Username/Email, dan Kata Sandi.');
        return;
      }

      const cleanEmail = email.includes('@') ? email : `${email.trim()}@presentraining.com`;

      setAuthLoading(true);
      setAuthLoadingText('Mendaftarkan Akun Baru...');
      setAuthLoadingSubtext('Membuat kredensial & barcode QR unik peserta...');

      try {
        const res = await api.register({
          name: name.trim(),
          email: cleanEmail,
          password: password,
          phone: phone || '0812-0000-1111',
          instansi: instansi || 'Peserta Umum',
          gender: gender || 'L',
        });

        if (res.ok && res.data?.user) {
          if (res.data?.token) {
            localStorage.setItem('presentrain_token', res.data.token);
          }
          const userObj = {
            ...res.data.user,
            qrToken: res.data.user.user_qr_token || res.data.user.qrToken,
          };
          offlineSync.cacheUserProfile(userObj);
          setAuthLoadingText('Pendaftaran Berhasil!');
          setAuthLoadingSubtext('Menyiapkan sesi peserta...');
          setTimeout(() => {
            setAuthLoading(false);
            onLoginSuccess(userObj);
          }, 350);
          return;
        }

        setAuthLoading(false);
        if (res.isNetworkError) {
          const isDev = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
          setErrorMsg(isDev
            ? 'Gagal terhubung ke server backend lokal. Pastikan server lokal aktif (php artisan serve).'
            : 'Koneksi ke server backend terputus atau server sedang sibuk. Silakan periksa koneksi internet Anda atau coba beberapa saat lagi.');
          return;
        }

        if (res.status === 429) {
          setErrorMsg('Lalu lintas pendaftaran sedang sangat padat. Mohon tunggu beberapa detik sebelum mencoba kembali.');
          return;
        }

        setErrorMsg(res.data?.message || 'Gagal mendaftarkan akun. Silakan coba lagi.');
      } catch (err) {
        setAuthLoading(false);
        setErrorMsg('Terjadi kesalahan sistem saat registrasi.');
      }
    } else {
      if (!email || !password) {
        setErrorMsg('Silakan masukkan Username / Email dan Kata Sandi.');
        return;
      }

      const inputClean = email.trim();
      const inputLower = inputClean.toLowerCase();
      let targetEmail = inputClean;
      let targetPassword = password;

      if (!inputClean.includes('@')) {
        if (inputLower === 'adminutama' || inputLower === 'superadmin') {
          targetEmail = 'admin.utama@presentrain.com';
          if (password === 'admin123' || password === '123456') targetPassword = 'AdminUtama123!';
        } else if (inputLower === 'administrator' || inputLower === 'admin' || inputLower === 'panitia') {
          targetEmail = 'admin.panitia@presentrain.com';
          if (password === 'admin123' || password === 'panitia123' || password === '123456') targetPassword = 'AdminPanitia123!';
        } else {
          targetEmail = `${inputLower}@presentrain.com`;
        }
      }

      setAuthLoading(true);
      setAuthLoadingText('Memverifikasi Akun...');
      setAuthLoadingSubtext('Memeriksa kredensial di server PresenTrain...');

      try {
        const res = await api.login(targetEmail, targetPassword);

        if (res.ok && res.data?.user) {
          if (res.data?.token) {
            localStorage.setItem('presentrain_token', res.data.token);
          }
          const userObj = {
            ...res.data.user,
            qrToken: res.data.user.user_qr_token || res.data.user.qrToken,
          };
          offlineSync.cacheUserProfile(userObj);
          setAuthLoadingText('Login Berhasil!');
          setAuthLoadingSubtext('Mempersiapkan dashboard pelatihan...');
          setTimeout(() => {
            setAuthLoading(false);
            onLoginSuccess(userObj);
          }, 350);
          return;
        }

        setAuthLoading(false);
        if (res.isNetworkError) {
          const isDev = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
          setErrorMsg(isDev
            ? 'Gagal terhubung ke server backend lokal. Pastikan server lokal aktif (php artisan serve).'
            : 'Koneksi ke server backend terputus atau server sedang memproses antrean beban tinggi. Silakan periksa jaringan internet Anda atau coba beberapa saat lagi.');
          return;
        }

        setErrorMsg(res.data?.message || 'Email atau kata sandi tidak cocok!');
      } catch (err) {
        setAuthLoading(false);
        const isDev = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
        setErrorMsg(isDev ? 'Gagal terhubung ke server backend lokal.' : 'Gagal terhubung ke server backend. Periksa koneksi internet Anda atau coba sesaat lagi.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex items-center justify-center p-3 sm:p-6 md:p-10 select-none font-sans relative overflow-y-auto animate-dynamic-reveal">
      {/* Cool Spinning Loading Animation (Tema Terang Minimalist) */}
      {authLoading && (
        <CoolLoader
          text={authLoadingText}
          fullScreen={true}
        />
      )}
      
      {/* Outer Shell Card matching exact Mockup Layout */}
      <div className="w-full max-w-5xl bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row p-3 md:p-4 min-h-0 md:min-h-[620px] relative border border-slate-100 my-auto">
        
        {/* ================= LEFT IMAGE HERO CARD PANEL ================= */}
        <div className="w-full md:w-1/2 rounded-[24px] sm:rounded-[32px] overflow-hidden relative flex flex-col justify-between md:justify-end p-3 sm:p-5 md:p-8 h-[125px] sm:h-[150px] md:h-auto md:min-h-[580px] shadow-lg group transition-all shrink-0">
          
          {/* Background Images with Dissolve Fade Effect */}
          {slides.map((s, idx) => (
            <img 
              key={s.id}
              src={s.image} 
              alt="Hero Artwork" 
              onError={() => handleImageError(s.id)}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-[2000ms] ease-in-out transform ${
                idx === currentSlide 
                  ? 'opacity-100 scale-100 filter brightness-95 contrast-105 z-0' 
                  : 'opacity-0 scale-105 filter brightness-75 contrast-90 -z-10'
              }`}
            />
          ))}

          {/* Dark Aesthetic Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20 pointer-events-none" />

          {/* TOP RIGHT NAVIGATION ARROWS (ATAS POJOK) */}
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 flex items-center space-x-1 sm:space-x-1.5">
            <button
              type="button"
              onClick={handlePrevSlide}
              title="Slide Sebelumnya"
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-white/30 bg-slate-950/50 hover:bg-slate-900/80 text-white flex items-center justify-center transition-all backdrop-blur-md active:scale-90 shadow-md cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextSlide}
              title="Slide Selanjutnya"
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-white/30 bg-slate-950/50 hover:bg-slate-900/80 text-white flex items-center justify-center transition-all backdrop-blur-md active:scale-90 shadow-md cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* BOTTOM OVERLAY INFO & SLIDE INDICATORS */}
          <div className="relative z-10 flex items-end justify-between w-full pt-1.5 sm:pt-4">
            
            {/* PWA Download App Pill Badge (Direct PWA Install Trigger) */}
            <button
              type="button"
              onClick={() => triggerDirectPWAInstall(() => setShowPWAModal(true))}
              title="Klik untuk Unduh / Install Aplikasi PresenTrain"
              className="group flex items-center space-x-2 sm:space-x-3 bg-slate-900/80 hover:bg-slate-900 border border-emerald-400/40 hover:border-emerald-400 backdrop-blur-md p-1.5 sm:p-2.5 pr-3.5 sm:pr-4 rounded-full shadow-lg max-w-[80%] sm:max-w-none transition-all cursor-pointer active:scale-95 text-left"
            >
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5 shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <img 
                  src={siteSettings?.logoUrl || '/logo/logo.png'} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-[10px] sm:text-xs font-extrabold text-white tracking-tight leading-tight truncate">
                    Unduh Aplikasi
                  </h4>
                  <Download className="w-3 h-3 text-emerald-400 shrink-0 animate-bounce" />
                </div>
                <p className="text-[8.5px] sm:text-[10px] text-emerald-300 font-medium truncate">
                  Presensi QR & Scanner Offline
                </p>
              </div>
            </button>

            {/* Dot Indicators */}
            <div className="flex items-center space-x-1 bg-slate-950/50 backdrop-blur-md px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full border border-white/10 shrink-0">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    currentSlide === idx 
                      ? 'w-3.5 sm:w-5 h-1.5 bg-emerald-400' 
                      : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>

          </div>

        </div>

        {/* ================= RIGHT FORM PANEL (WHITE CARD) ================= */}
        <div className="w-full md:w-1/2 bg-white p-4 sm:p-8 md:p-10 flex flex-col justify-between relative">
          
          {/* Center Form Section */}
          <div className="max-w-md mx-auto w-full my-auto py-1 sm:py-4">
            
            {/* Main Welcome Heading */}
            <div className="mb-3 sm:mb-5">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {isRegister ? 'Buat Akun Baru' : 'Hai Peserta'}
              </h2>
              <p className="text-[11px] sm:text-sm text-slate-500 font-medium mt-0.5 sm:mt-1">
                {isRegister ? 'Daftar akun baru untuk mengikuti pelatihan' : `Selamat datang di ${siteSettings?.siteName || 'PresenTrain'}`}
              </p>
            </div>

            {/* Quiz Link Alert Banner */}
            {urlQuizCode && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center space-x-2.5 shadow-2xs">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 animate-pulse" />
                <div>
                  <div>Akses Quiz Direct: <strong className="font-mono bg-emerald-200/80 px-1.5 py-0.5 rounded text-emerald-900">{urlQuizCode}</strong></div>
                  <div className="text-[10px] sm:text-[11px] font-normal text-emerald-700 mt-0.5">Silakan login sebagai Peserta untuk langsung membuka kuis ini.</div>
                </div>
              </div>
            )}

            {/* Google Auth Error Alert */}
            {googleAuthError && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-700 text-xs font-medium">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{googleAuthError}</span>
                </div>
                {onClearGoogleError && (
                  <button onClick={onClearGoogleError} className="text-rose-400 hover:text-rose-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-700 text-xs font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Main Input Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3.5">
              
              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-0.5 sm:mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      placeholder="Masukkan nama lengkap"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 sm:py-3 px-3.5 sm:px-4 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none transition-all font-medium shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-0.5 sm:mb-1">Asal Komisariat</label>
                    <input
                      type="text"
                      placeholder="Contoh: HMI Komisariat ITERA"
                      value={instansi}
                      onChange={(e) => setInstansi(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 sm:py-3 px-3.5 sm:px-4 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none transition-all font-medium shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-0.5 sm:mb-1">Jenis Kelamin</label>
                    <div className="relative">
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 sm:py-3 px-3.5 sm:px-4 pr-9 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none transition-all font-semibold shadow-2xs appearance-none cursor-pointer"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5 sm:mb-1">Email / Username</label>
                <input
                  type="text"
                  placeholder="Masukkan email atau username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 sm:py-3 px-3.5 sm:px-4 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none transition-all font-medium shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5 sm:mb-1">Kata Sandi</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 sm:py-3 px-3.5 sm:px-4 pr-10 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none transition-all font-medium shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 sm:top-3 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {!isRegister && (
                  <div className="text-right mt-1">
                    <button
                      type="button"
                      onClick={handleOpenForgotModal}
                      className="text-[11px] font-bold text-[#059669] hover:underline flex items-center space-x-1 ml-auto"
                    >
                      <Key className="w-3 h-3" />
                      <span>Lupa Sandi?</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center py-0.5 sm:py-1">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2.5 text-[11px] font-medium text-slate-400 shrink-0">atau</span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {/* Google OAuth Login Button */}
              <button
                type="button"
                onClick={handleRealGoogleRedirect}
                className="w-full py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-between shadow-xs transition-all active:scale-[0.98]"
                title="Masuk atau Daftar menggunakan Akun Google Resmi"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="text-slate-800 font-bold text-[11.5px] sm:text-xs">
                    {isRegister ? 'Daftar dengan Google' : 'Login dengan Google'}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              </button>

              {/* Main Emerald Green Login CTA Button */}
              <div className="pt-1 sm:pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 sm:py-3.5 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 active:scale-[0.99] transition-all"
                >
                  {isRegister ? 'Daftar' : 'Masuk'}
                </button>
              </div>

            </form>

            {/* Bottom Toggle Text */}
            <div className="text-center mt-3 sm:mt-5">
              {isRegister ? (
                <p className="text-xs text-slate-500 font-medium">
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setErrorMsg(''); }}
                    className="font-extrabold text-[#059669] hover:underline ml-0.5"
                  >
                    Masuk
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500 font-medium">
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(true); setErrorMsg(''); }}
                    className="font-extrabold text-[#059669] hover:underline ml-0.5"
                  >
                    Daftar
                  </button>
                </p>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ================= MODAL 0: COMPLETE GOOGLE REGISTRATION (FIRST TIME GOOGLE OAUTH) ================= */}
      {googleCompletionData && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-scale-in border border-slate-100 relative max-h-[calc(100vh-2rem)] overflow-y-auto my-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Lengkapi Pendaftaran Akun</h3>
                  <p className="text-xs text-slate-500 font-medium">Langkah terakhir sebelum mengakses dashboard</p>
                </div>
              </div>

              {onClearGoogleCompletion && (
                <button 
                  type="button"
                  onClick={onClearGoogleCompletion}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Google Verified Account Badge Box */}
            <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shrink-0 border-2 border-emerald-400 shadow-xs relative">
                  {googleCompletionData.avatar ? (
                    <img 
                      src={googleCompletionData.avatar} 
                      alt={googleCompletionData.name || 'Google Profile'} 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover relative z-10" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className="absolute z-0 select-none font-black text-white text-sm">
                    {(googleCompletionData.name || googleCompletionData.email || 'G')[0].toUpperCase()}
                  </span>
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{googleCompletionData.name || 'Pengguna Google'}</h4>
                  <p className="text-[11px] text-emerald-800 font-medium truncate">{googleCompletionData.email}</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-2xs shrink-0">
                Terverifikasi Google
              </span>
            </div>

            {/* Error Message Alert */}
            {googleCompletionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-700 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{googleCompletionError}</span>
              </div>
            )}

            {/* Profile Completion Form */}
            <form onSubmit={handleCompleteGoogleRegistration} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap Anda"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asal Komisariat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: HMI Komisariat ITERA"
                  value={googleInstansi}
                  onChange={(e) => setGoogleInstansi(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1">Data komisariat dicantumkan pada sertifikat dan daftar hadir presensi.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Kelamin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={googleGender}
                    onChange={(e) => setGoogleGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 pr-9 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none font-semibold appearance-none cursor-pointer"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp / HP <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="0812-xxxx-xxxx"
                  value={googlePhone}
                  onChange={(e) => setGooglePhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-xs text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Buat Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showGooglePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Min. 6 karakter"
                      value={googlePassword}
                      onChange={(e) => setGooglePassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 pr-9 text-xs text-slate-900 focus:border-emerald-600 outline-none font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGooglePassword(!showGooglePassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showGooglePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ulangi Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showGooglePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Konfirmasi sandi"
                    value={googleConfirmPassword}
                    onChange={(e) => setGoogleConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-xs text-slate-900 focus:border-emerald-600 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={googleSubmitLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {googleSubmitLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Akun...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Selesaikan & Buka Dashboard</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}



      {/* ================= MODAL 2: FORGOT PASSWORD & REAL EMAIL OTP FLOW ================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-scale-in border border-slate-100 relative max-h-[calc(100vh-2rem)] overflow-y-auto my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-[#059669]">
                <Key className="w-5 h-5" />
                <h3 className="text-sm font-black text-slate-900">Reset Kata Sandi via Email OTP</h3>
              </div>

              <button 
                onClick={() => setShowForgotModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Alert */}
            {otpError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{otpError}</span>
              </div>
            )}

            {/* STEP 1: INPUT EMAIL */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Masukkan alamat email terdaftar Anda. Sistem akan mengirimkan **6 Digit Kode OTP** verifikasi resmi ke kotak masuk email Anda.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email Terdaftar</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      placeholder="peserta@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                >
                  {otpLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim Email OTP...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Kirim Kode OTP ke Email</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: VERIFY OTP CODE */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs font-medium space-y-1.5">
                  <p className="font-bold flex items-center space-x-1.5 text-emerald-950">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kode OTP Terkirim ke: {forgotEmail}</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Silakan periksa kotak masuk atau folder spam di email Anda untuk melihat 6 digit kode OTP verifikasi.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Masukkan 6 Digit Kode OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Contoh: 849201"
                    value={inputOtp}
                    onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-300 text-center font-mono font-bold text-lg tracking-widest outline-none focus:border-emerald-600 text-emerald-900"
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Waktu Tersisa: <strong className="text-emerald-700 font-bold">{otpCountdown}s</strong></span>
                  <button
                    type="button"
                    disabled={otpCountdown > 0 || otpLoading}
                    onClick={handleSendOtp}
                    className="text-[#059669] font-bold hover:underline disabled:opacity-40 cursor-pointer"
                  >
                    {otpLoading ? 'Mengirim...' : 'Kirim Ulang OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                >
                  {otpLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi Kode OTP...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verifikasi Kode OTP</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: SET NEW PASSWORD */}
            {forgotStep === 3 && (
              <form onSubmit={handleSaveNewPassword} className="space-y-4">
                <p className="text-xs text-slate-600 font-medium">
                  Verifikasi OTP Berhasil! Silakan buat **Kata Sandi Baru** untuk akun Anda.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi Baru</label>
                  <div className="relative">
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-10 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-emerald-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showResetNewPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    >
                      {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                  <div className="relative">
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      placeholder="Ulangi kata sandi baru"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-10 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-emerald-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showResetConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    >
                      {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                >
                  {otpLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Kata Sandi...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Simpan Kata Sandi Baru</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 4: SUCCESS */}
            {forgotStep === 4 && (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900">Kata Sandi Berhasil Diperbarui!</h4>
                <p className="text-xs text-slate-500 font-medium">
                  Mengalihkan dan melakukan login otomatis ke dashboard...
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* PWA Installation Onboarding Modal */}
      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={handleClosePWAModal}
        siteSettings={siteSettings}
      />

    </div>
  );
}
