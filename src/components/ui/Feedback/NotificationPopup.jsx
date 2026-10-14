import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X, Loader2 } from 'lucide-react';

export default function NotificationPopup({ 
  message, 
  onClose, 
  duration = 2000, 
  type = 'success',
  isLoading = false
}) {
  const [isClosing, setIsClosing] = useState(false);
  const isProcessingType = isLoading || type === 'loading' || type === 'processing';

  useEffect(() => {
    if (!message) return;
    setIsClosing(false);

    // Jika sedang dalam proses berputar/antrean (isProcessingType atau duration <= 0), jangan auto-dismiss!
    // Biarkan berputar sampai benar-benar selesai
    if (isProcessingType || duration <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        if (onClose) onClose();
      }, 150); // Snappy exit transition
    }, duration);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsClosing(true);
        setTimeout(() => {
          if (onClose) onClose();
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [message, duration, onClose, isProcessingType]);

  if (!message) return null;

  const handleManualClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 150);
  };

  // Icon configuration based on type
  const getIcon = () => {
    if (isProcessingType) {
      return <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-sm" />;
    }
    switch (type) {
      case 'error':
        return <XCircle className="w-8 h-8 text-white drop-shadow-sm" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-white drop-shadow-sm" />;
      case 'info':
        return <Info className="w-8 h-8 text-white drop-shadow-sm" />;
      case 'success':
      default:
        return <CheckCircle2 className="w-8 h-8 text-white drop-shadow-sm" />;
    }
  };

  const getTitle = () => {
    if (isProcessingType) {
      return 'Memproses Antrean...';
    }
    switch (type) {
      case 'error':
        return 'Pemberitahuan Sistem';
      case 'warning':
        return 'Perhatian';
      case 'info':
        return 'Informasi';
      case 'success':
      default:
        return 'Berhasil!';
    }
  };

  const getGradientTheme = () => {
    if (isProcessingType) {
      return 'from-blue-600 via-indigo-600 to-indigo-700 shadow-indigo-950/30 border-blue-400/40';
    }
    switch (type) {
      case 'error':
        return 'from-rose-600 via-rose-600 to-rose-700 shadow-rose-950/30 border-rose-400/40';
      case 'warning':
        return 'from-amber-600 via-amber-600 to-amber-700 shadow-amber-950/30 border-amber-400/40';
      case 'info':
        return 'from-sky-600 via-sky-600 to-sky-700 shadow-sky-950/30 border-sky-400/40';
      case 'success':
      default:
        return 'from-emerald-600 via-emerald-600 to-teal-700 shadow-emerald-950/30 border-emerald-400/40';
    }
  };

  return (
    <div 
      className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none w-full max-w-md px-3 sm:px-0 flex justify-center"
      role="status"
      aria-live="polite"
    >
      <div 
        className={`pointer-events-auto relative w-full sm:w-auto min-w-[280px] max-w-md bg-gradient-to-r ${getGradientTheme()} text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl border flex items-center space-x-3.5 overflow-hidden transition-all duration-200 select-none cursor-pointer ${
          !isClosing ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'
        }`}
        onClick={handleManualClose}
      >
        {/* Subtle Decorative Ambient Background Glow */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

        {/* Icon Badge */}
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-inner shrink-0">
          {getIcon()}
        </div>

        {/* Message Content */}
        <div className="flex-1 pr-6 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug drop-shadow-xs truncate">
            {getTitle()}
          </h4>
          <p className="text-[11px] sm:text-xs font-medium text-white/95 leading-snug line-clamp-2 mt-0.5">
            {message}
          </p>
        </div>

        {/* Close Button Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleManualClose();
          }}
          type="button"
          aria-label="Tutup Notifikasi"
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Visual Progress Bar (Countdown or Indeterminate Pulse when Processing) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 overflow-hidden">
          {isProcessingType ? (
            <div className="h-full bg-white/90 rounded-full animate-pulse w-full" />
          ) : (
            <div 
              className="h-full bg-white/80 rounded-full origin-left"
              style={{ 
                animation: `shrinkTimerBar ${duration}ms linear forwards` 
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
