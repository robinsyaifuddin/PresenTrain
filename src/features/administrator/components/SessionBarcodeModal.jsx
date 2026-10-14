import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, QrCode, Clock, CheckCircle2, ShieldCheck, 
  Download, Copy, ExternalLink, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { api } from '@/services/api';

export default function SessionBarcodeModal({ session, sessionIndex = 1, onClose }) {
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notification, setNotification] = useState('');

  const targetSessionDbId = session?.db_id || session?.id || sessionIndex;
  const currentExp = expiryTimestamp || (Date.now() + durationMinutes * 60 * 1000);
  const sessionToken = `ABSEN-SESI-${sessionIndex}-${targetSessionDbId}-EXP${currentExp}`;
  const previewPath = `/${sessionToken}`;
  const fullPreviewUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${previewPath}` 
    : `https://presentrain.com${previewPath}`;

  // Load initial active barcode state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`active_barcode_sesi_${sessionIndex}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.expiryTimestamp) {
          const now = Date.now();
          const secondsLeft = Math.max(0, Math.floor((parsed.expiryTimestamp - now) / 1000));
          setExpiryTimestamp(parsed.expiryTimestamp);
          setDurationMinutes(parsed.durationMinutes || 15);
          setIsActive(true);
          setRemainingSeconds(secondsLeft);
          setIsAgreed(true);
        }
      }
    } catch (e) {
      console.error('Failed to parse barcode storage:', e);
    }
  }, [sessionIndex]);

  // Countdown timer interval
  useEffect(() => {
    let interval = null;
    if (isActive && expiryTimestamp) {
      interval = setInterval(() => {
        const now = Date.now();
        const secondsLeft = Math.max(0, Math.floor((expiryTimestamp - now) / 1000));
        setRemainingSeconds(secondsLeft);
        if (secondsLeft <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, expiryTimestamp]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleActivateBarcode = (e) => {
    e.preventDefault();
    if (!isAgreed) return;

    const expiresAt = Date.now() + durationMinutes * 60 * 1000;
    const computedToken = `ABSEN-SESI-${sessionIndex}-${targetSessionDbId}-EXP${expiresAt}`;
    const barcodeData = {
      sessionToken: computedToken,
      expiryTimestamp: expiresAt,
      durationMinutes,
      isActivated: true,
      sessionTitle: session?.title || `Sesi ${sessionIndex}`,
      createdAt: Date.now()
    };

    try {
      localStorage.setItem(`active_barcode_sesi_${sessionIndex}`, JSON.stringify(barcodeData));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to save barcode state:', err);
    }

    // Persist to backend database for multi-device sync
    api.activateSessionBarcode(targetSessionDbId, durationMinutes, computedToken).catch(err => {
      console.warn('Sync barcode to backend error:', err);
    });

    setExpiryTimestamp(expiresAt);
    setRemainingSeconds(durationMinutes * 60);
    setIsActive(true);
    showToast(`Barcode Sesi ${sessionIndex} berhasil diaktifkan selama ${durationMinutes} menit!`);
  };

  const handleResetBarcode = () => {
    try {
      localStorage.removeItem(`active_barcode_sesi_${sessionIndex}`);
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to clear barcode state:', err);
    }

    // Deactivate on backend database
    api.deactivateSessionBarcode(targetSessionDbId).catch(() => {});

    setIsActive(false);
    setExpiryTimestamp(null);
    setRemainingSeconds(0);
    setIsAgreed(false);
    showToast('Silakan sesuaikan durasi dan klik Setuju untuk membuat Barcode baru.');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullPreviewUrl);
    setCopied(true);
    showToast('Link preview barcode berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBarcode = () => {
    setDownloading(true);
    try {
      const svg = document.getElementById('session-barcode-qr-svg');
      if (!svg) {
        showToast('Gagal menemukan elemen barcode.');
        setDownloading(false);
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = 600;
        canvas.height = 680;

        // Draw White Card Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Title
        ctx.fillStyle = '#065f46'; // Emerald 800
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`PresenTrain - BARCODE SESI ${sessionIndex}`, canvas.width / 2, 45);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(session?.title || `Sesi ${sessionIndex}`, canvas.width / 2, 75);

        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.fillText(`${session?.time || '10:00 WIB'} • ${session?.room || 'Ruangan'}`, canvas.width / 2, 100);

        // Draw QR Image
        ctx.drawImage(img, (canvas.width - 400) / 2, 120, 400, 400);

        // Footer Token
        ctx.fillStyle = '#0f766e';
        ctx.font = 'bold monospace 16px';
        ctx.fillText(`TOKEN: ${sessionToken}`, canvas.width / 2, 555);

        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.fillText(`Link Preview: ${fullPreviewUrl}`, canvas.width / 2, 590);
        ctx.fillText(`Status: Waktu Terhitung Sejak Generasi Barcode`, canvas.width / 2, 615);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `Barcode_Sesi_${sessionIndex}_PresenTrain.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setDownloading(false);
        showToast('Gambar Barcode Sesi berhasil diunduh!');
      };

      img.onerror = () => {
        setDownloading(false);
        showToast('Gagal memproses gambar barcode.');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error(err);
      setDownloading(false);
      showToast('Terjadi kesalahan saat mengunduh barcode.');
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isExpired = isActive && remainingSeconds <= 0;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl md:max-w-3xl overflow-hidden shadow-2xl p-5 sm:p-7 space-y-4 border border-slate-200 relative my-auto max-h-[92dvh] overflow-y-auto font-sans animate-spring-popup"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Sleek In-Modal Feedback Alert */}
        {notification && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-3 px-4 flex items-center justify-between text-xs font-semibold animate-spring-popup shadow-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setNotification('')}
              className="p-1 rounded-full text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <QrCode className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                SESI {sessionIndex} • BARCODE PRESENSI
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">{session?.title || `Sesi ${sessionIndex}`}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= STEP 1: PERSETUJUAN & SETUP DURASI ================= */}
        {!isActive && (
          <form onSubmit={handleActivateBarcode} className="space-y-4 text-xs">
            {/* Box Syarat & Ketentuan Persetujuan */}
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-2 text-emerald-950">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Informasi Persetujuan Presensi Barcode</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-900 font-medium">
                Dengan mengaktifkan fitur ini, Anda menyetujui untuk membuka sistem presensi mandiri bagi peserta pelatihan menggunakan barcode yang dipindai secara langsung. Barcode akan secara otomatis tidak berlaku (expired) begitu hitung mundur durasi yang dipilih selesai.
              </p>
            </div>

            {/* Selector Durasi Waktu */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 text-xs">
                Pilih Durasi Aktif Barcode (Hitung Mundur Expired):
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                {[5, 10, 15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-2.5 px-2.5 rounded-xl font-bold border transition-all text-center ${
                      durationMinutes === mins
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 font-medium pt-1">
                ⏱️ Barcode akan aktif dan dapat di-scan peserta selama <strong className="text-emerald-700">{durationMinutes} Menit</strong>.
              </p>
            </div>

            {/* Checkbox Persetujuan */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded mt-0.5"
                  required
                />
                <span className="text-[11px] font-semibold text-slate-800 leading-snug">
                  Saya setuju dan mengonfirmasi untuk mempublikasikan barcode presensi sesi ini dengan durasi {durationMinutes} menit.
                </span>
              </label>
            </div>

            {/* Button Aktifkan Barcode */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!isAgreed}
                className={`w-full sm:w-auto py-3 px-6 rounded-2xl font-extrabold text-xs flex items-center justify-center space-x-2 shadow-md transition-all ${
                  isAgreed
                    ? 'btn-emerald active:scale-98 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setuju & Aktifkan Barcode Sesi</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2: DISPLAY BARCODE, LIVE COUNTDOWN & DOWNLOAD (2-Column Grid) ================= */}
        {isActive && (
          <div className="space-y-4 animate-fade-in text-xs">
            
            {/* Live Countdown Header Badge */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between font-bold ${
              isExpired 
                ? 'bg-rose-100 text-rose-900 border-rose-300' 
                : 'bg-emerald-100 text-emerald-950 border-emerald-300'
            }`}>
              <div className="flex items-center space-x-2">
                <Clock className={`w-4 h-4 ${isExpired ? 'text-rose-600' : 'text-emerald-600 animate-spin'}`} />
                <span>{isExpired ? 'Barcode Expired (Presensi Ditutup)' : 'Barcode Sesi Presensi Aktif'}</span>
              </div>
              <div className={`px-3 py-1 rounded-xl text-sm font-black font-mono shadow-xs ${
                isExpired ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white animate-pulse'
              }`}>
                {formatTimer(remainingSeconds)}
              </div>
            </div>

            {/* 2-Column Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              
              {/* Left Column: Barcode Display & Token (5/12) */}
              <div className="md:col-span-5 flex flex-col items-center text-center space-y-3">
                <div className="relative p-4 bg-slate-50 rounded-3xl border-2 border-emerald-500 shadow-inner w-full flex items-center justify-center">
                  {isExpired ? (
                    <div className="w-[190px] h-[190px] bg-slate-100 rounded-2xl flex flex-col items-center justify-center p-3 text-slate-500 space-y-1.5 border border-slate-200">
                      <AlertTriangle className="w-8 h-8 text-rose-500" />
                      <p className="text-xs font-bold text-slate-800">Barcode Expired</p>
                      <p className="text-[10px] text-slate-400 text-center">Waktu presensi mandiri telah berakhir.</p>
                    </div>
                  ) : (
                    <QRCodeSVG
                      id="session-barcode-qr-svg"
                      value={sessionToken}
                      size={200}
                      level="H"
                      includeMargin={true}
                      className="bg-white p-2 rounded-2xl shadow-sm max-w-full h-auto"
                    />
                  )}
                </div>

                <div className="w-full p-2.5 bg-slate-100 rounded-2xl border border-slate-200">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">TOKEN BARCODE UNIK SESI</p>
                  <p className="font-mono text-xs font-bold text-emerald-800 truncate">{sessionToken}</p>
                </div>
              </div>

              {/* Right Column: Link Preview, Download & Reset Buttons (7/12) */}
              <div className="md:col-span-7 space-y-3 text-left">
                
                {/* Link Preview Box */}
                <div className="p-3 bg-emerald-50/90 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      LINK PREVIEW SESI: <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono">{previewPath}</code>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Tampilan Peserta</span>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200">
                    <span className="font-mono text-[11px] text-slate-700 truncate mr-2 font-medium">
                      {fullPreviewUrl}
                    </span>
                    <div className="flex space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 rounded-lg flex items-center space-x-1 text-[10px] font-bold transition-colors"
                        title="Salin Link Preview"
                      >
                        <Copy className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{copied ? 'Tersalin' : 'Salin'}</span>
                      </button>

                      <a
                        href={previewPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center space-x-1 text-[10px] font-bold transition-colors shadow-xs"
                        title="Buka Link Preview Di Tab Baru"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadBarcode}
                    disabled={downloading || isExpired}
                    className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all ${
                      isExpired 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'btn-emerald active:scale-95 cursor-pointer'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloading ? 'Mengunduh...' : 'Unduh Gambar Barcode (PNG)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetBarcode}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    <span>Atur Ulang / Perpanjang Durasi</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
