import React, { useEffect } from 'react';
import { HelpCircle, Trash2, AlertTriangle, X, Check } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'danger', // 'danger' | 'warning' | 'primary'
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
      } else if (e.key === 'Enter') {
        if (onConfirm) onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in overflow-y-auto"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200/80 text-center overflow-hidden animate-spring-popup transform transition-all my-auto max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Decorative Ambient Glow */}
        <div className={`absolute -top-14 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-40 ${
          isDanger ? 'bg-rose-400' : 'bg-emerald-400'
        }`} />

        {/* Close Button */}
        <button
          onClick={onCancel}
          type="button"
          aria-label="Tutup Dialog"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Icon Badge */}
        <div className={`mx-auto mb-4 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border shadow-sm ${
          isDanger 
            ? 'bg-rose-50 border-rose-200 text-rose-600' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
          {isDanger ? (
            <Trash2 className="w-7 h-7 sm:w-8 sm:h-8" />
          ) : (
            <HelpCircle className="w-7 h-7 sm:w-8 sm:h-8" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 max-w-xs sm:max-w-sm mx-auto">
          {message}
        </p>

        {/* Action Buttons: Pilihan Ya atau Tidak */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer border border-slate-200/60"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 sm:py-3 px-4 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5 active:scale-98 ${
              isDanger
                ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-rose-600/30'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30'
            }`}
          >
            {isDanger ? <Trash2 className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
