import React from 'react';
import { Lock, ShieldAlert, MessageCircle, X } from 'lucide-react';

export default function AccessDeniedModal({
  isOpen,
  onClose,
  title = 'Akses Dibatasi',
  featureName = 'Fitur Ini',
  description,
  whatsappNumber = '62887437525303'
}) {
  React.useEffect(() => {
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

  const defaultDesc = description || `Akun Administrator Anda saat ini belum diberikan hak akses untuk mengelola ${featureName} oleh Koordinator / Admin Utama. Silakan hubungi Admin Utama untuk mengaktifkan izin ini.`;

  const cleanPhone = String(whatsappNumber).replace(/[^0-9]/g, '') || '62887437525303';
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Halo Koordinator / Admin Utama PresenTrain, akun Administrator saya ingin mengajukan pembukaan hak akses fitur: ${featureName}. Mohon bantuannya. Terima kasih.`)}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans select-none overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-5 relative my-auto animate-spring-popup text-slate-800 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          title="Tutup"
          aria-label="Tutup Dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider bg-amber-100/80 px-2.5 py-0.5 rounded-full">
              Izin Ditolak
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1.5">{title}</h3>
          </div>
        </div>

        {/* Description Body */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed text-center">
          <p>{defaultDesc}</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-98 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Hubungi Admin Utama via WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
