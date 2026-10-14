import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Sparkles, Share2, PlusSquare, ArrowDownToLine } from 'lucide-react';

export const triggerDirectPWAInstall = async (onFallbackModal) => {
  if (typeof window !== 'undefined' && window.deferredPWAInstallPrompt) {
    const promptEvent = window.deferredPWAInstallPrompt;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      window.deferredPWAInstallPrompt = null;
    }
  } else if (onFallbackModal) {
    onFallbackModal();
  }
};

export default function PWAInstallModal({ isOpen, onClose, siteSettings }) {
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    return typeof window !== 'undefined' ? window.deferredPWAInstallPrompt : null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPWAInstallPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.deferredPWAInstallPrompt : null);
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        if (typeof window !== 'undefined') window.deferredPWAInstallPrompt = null;
      }
      setDeferredPrompt(null);
      if (onClose) onClose();
    } else {
      // Show manual install guidance
      setShowInstructions(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none font-sans overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative border border-slate-100 overflow-hidden text-slate-800 my-auto max-h-[92dvh] overflow-y-auto animate-spring-popup"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Background Decorative Accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button 
          type="button"
          onClick={onClose}
          aria-label="Tutup Dialog Install"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {!showInstructions ? (
          /* Main Onboarding Install Modal */
          <div className="text-center space-y-5 pt-2">
            
            {/* Logo Badge (White Circle Shape) */}
            <div className="relative inline-block">
              <div className="w-20 h-20 mx-auto rounded-full bg-white p-2.5 shadow-xl border border-slate-200/80 flex items-center justify-center overflow-hidden">
                <img 
                  src={siteSettings?.logoUrl || '/logo/logo.png'} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Install {siteSettings?.siteName || 'PresenTrain'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
                Pasang di HP Anda untuk akses presensi QR instan, scanner kamera cepat, dan penggunaan offline tanpa kuota internet.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Unduh & Install Aplikasi</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors"
              >
                Nanti Saja (Lanjutkan di Web Browser)
              </button>
            </div>

          </div>
        ) : (
          /* Manual Installation Instructions Popup */
          <div className="text-left space-y-4 pt-1">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Panduan Install Manual</h4>
                <p className="text-xs text-slate-500 font-medium">Langkah mudah menambahkan ke Layar Utama HP</p>
              </div>
            </div>

            {isIOS ? (
              /* iOS Safari Instructions */
              <div className="space-y-3 text-xs text-slate-700 font-medium">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                  <div>Buka menu opsi browser Safari dan tekan tombol <strong>Bagikan (Share)</strong> <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-1" />.</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                  <div>Gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600 mx-1" />.</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                  <div>Tekan tombol <strong>Tambah (Add)</strong> di kanan atas. Aplikasi siap digunakan!</div>
                </div>
              </div>
            ) : (
              /* Android Chrome Instructions */
              <div className="space-y-3 text-xs text-slate-700 font-medium">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                  <div>Tekan ikon <strong>Titik Tiga (⋮)</strong> di sudut kanan atas browser Chrome HP Anda.</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                  <div>Pilih menu <strong>"Install Aplikasi"</strong> atau <strong>"Tambah ke Layar Utama"</strong>.</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                  <div>Konfirmasi dengan menekan <strong>Install</strong>. Aplikasi PresenTrain akan muncul di HP Anda!</div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowInstructions(false);
                if (onClose) onClose();
              }}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors"
            >
              Mengerti & Tutup
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
