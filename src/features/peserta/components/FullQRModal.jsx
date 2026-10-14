import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, ShieldCheck } from 'lucide-react';

export default function FullQRModal({ user, onClose }) {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!user) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 sm:p-6 text-center space-y-4 border border-slate-200 relative animate-spring-popup max-h-[90dvh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>KARTU PESERTA DIGITAL</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Kartu Peserta"
            className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">{user.name}</h3>
          <p className="text-xs text-slate-500">{user.instansi || 'Peserta Training'}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-3xl border-2 border-emerald-500 inline-block shadow-inner">
          <QRCodeSVG
            value={user.qrToken || user.user_qr_token || ''}
            size={220}
            level="H"
            includeMargin={true}
            className="bg-white p-2 rounded-2xl shadow-sm"
          />
        </div>

        {(() => {
          const fullTok = user.qrToken || user.user_qr_token || '';
          const match = String(fullTok).match(/(\d{4,})$/);
          const manualCode = match ? match[1] : (fullTok || '-');
          return (
            <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-2xl">
              <p className="text-[9px] text-emerald-800 uppercase font-extrabold tracking-wider">NOMOR UNIK PRESENSI MANUAL</p>
              <p className="font-mono text-base font-black text-emerald-950 tracking-widest">{manualCode}</p>
            </div>
          );
        })()}

        <div className="bg-slate-100 p-2.5 rounded-2xl border border-slate-200">
          <p className="text-[9px] text-slate-400 uppercase font-medium">TOKEN QR LENGKAP</p>
          <p className="font-mono text-xs font-semibold text-emerald-800 truncate">{user.qrToken || user.user_qr_token || '-'}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 btn-emerald text-xs font-semibold rounded-2xl shadow-md"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}
