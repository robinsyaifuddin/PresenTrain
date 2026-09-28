import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, Clock, MapPin, Calendar, CheckCircle2, 
  ShieldCheck, ArrowLeft, Download, UserCheck, Sparkles, Copy, ExternalLink,
  AlertTriangle, Lock, ShieldAlert, XCircle
} from 'lucide-react';

export default function PublicSessionView({ sessionIndex, urlToken, training, siteSettings, onGoBack }) {
  const session = training?.sessions?.[sessionIndex - 1] || {
    id: `SES-0${sessionIndex}`,
    title: `Sesi ${sessionIndex}: Pelatihan PresenTrain`,
    speaker: 'Pemateri Utama',
    room: 'Ruangan Pelatihan',
    time: '10:00 - 12:00 WIB',
    date: 'Hari Ini',
    status: 'Berlangsung'
  };

  const defaultSessionToken = `ABSEN-SESI-${sessionIndex}-${session?.id || 'KEY'}-${session?.time?.replace(/[^a-zA-Z0-9]/g, '') || '2026'}`;
  
  const [activeBarcode, setActiveBarcode] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [notification, setNotification] = useState('');
  const [copied, setCopied] = useState(false);

  // Helper to load barcode state from localStorage
  const loadBarcodeState = () => {
    try {
      const saved = localStorage.getItem(`active_barcode_sesi_${sessionIndex}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setActiveBarcode(parsed);
        if (parsed.expiryTimestamp) {
          const secs = Math.max(0, Math.floor((parsed.expiryTimestamp - Date.now()) / 1000));
          setRemainingSeconds(secs);
        }
      } else {
        setActiveBarcode(null);
        setRemainingSeconds(0);
      }
    } catch (e) {
      console.error('Error reading barcode state from localStorage:', e);
    }
  };

  // Sync state & live countdown interval
  useEffect(() => {
    loadBarcodeState();

    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem(`active_barcode_sesi_${sessionIndex}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setActiveBarcode(parsed);
          if (parsed.expiryTimestamp) {
            const secs = Math.max(0, Math.floor((parsed.expiryTimestamp - Date.now()) / 1000));
            setRemainingSeconds(secs);
          }
        } else {
          setActiveBarcode(null);
          setRemainingSeconds(0);
        }
      } catch (e) {
        console.error(e);
      }
    }, 1000);

    const handleStorageChange = () => {
      loadBarcodeState();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [sessionIndex]);

  const currentToken = activeBarcode?.sessionToken || defaultSessionToken;
  const isTokenMismatch = Boolean(urlToken && urlToken !== currentToken);
  const isActivated = activeBarcode?.isActivated ?? false;
  const isExpired = !isActivated || remainingSeconds <= 0 || isTokenMismatch;

  const previewPath = `/${currentToken}`;
  const fullPreviewUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${previewPath}` 
    : `https://presentrain.com${previewPath}`;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullPreviewUrl);
    setCopied(true);
    showToast('Link preview barcode berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (isExpired) return;
    setDownloading(true);
    try {
      const svg = document.getElementById('public-session-barcode-svg');
      if (!svg) {
        setDownloading(false);
        return;
      }
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = 600;
        canvas.height = 650;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#065f46';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`PresenTrain - BARCODE SESI ${sessionIndex}`, canvas.width / 2, 45);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(session.title, canvas.width / 2, 80);

        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.fillText(`${session.time} • ${session.room}`, canvas.width / 2, 105);

        ctx.drawImage(img, (canvas.width - 380) / 2, 125, 380, 380);

        ctx.fillStyle = '#0f766e';
        ctx.font = 'bold monospace 16px';
        ctx.fillText(`TOKEN: ${currentToken}`, canvas.width / 2, 540);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Link Preview Sesi: ${previewPath}`, canvas.width / 2, 580);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `Barcode_Sesi_${sessionIndex}_PresenTrain.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloading(false);
        showToast('Gambar Barcode Sesi berhasil diunduh!');
      };

      img.onerror = () => setDownloading(false);
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 font-sans select-none relative overflow-y-auto">
      
      {/* Background Ambient Orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center space-x-2 animate-fade-in">
          <span>{notification}</span>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        </div>
      )}

      {/* Main Wide Responsive Card Container (max-w-3xl) */}
      <div className="bg-white text-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 p-6 md:p-8 space-y-6 relative z-10 animate-fade-in my-auto">
        
        {/* Top Header Bar */}
        <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 gap-2">
          <button
            onClick={onGoBack}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>

          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-3.5 py-1 rounded-full uppercase tracking-wider">
            BARCODE SESI {sessionIndex}
          </span>
        </div>

        {/* Live Countdown & Status Banner */}
        <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between font-bold text-xs gap-2 ${
          isTokenMismatch
            ? 'bg-rose-50 text-rose-900 border-rose-300'
            : !isActivated
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : remainingSeconds <= 0
                ? 'bg-rose-50 text-rose-900 border-rose-300'
                : 'bg-emerald-50 text-emerald-950 border-emerald-300'
        }`}>
          <div className="flex items-center space-x-2">
            <Clock className={`w-4 h-4 ${isTokenMismatch ? 'text-rose-600' : !isActivated ? 'text-amber-600' : remainingSeconds <= 0 ? 'text-rose-600' : 'text-emerald-600 animate-spin'}`} />
            <span>
              {isTokenMismatch
                ? 'Token / Link Barcode Tidak Valid atau Telah Berganti'
                : !isActivated 
                  ? 'Barcode Belum Diaktifkan oleh Panitia' 
                  : remainingSeconds <= 0 
                    ? 'Barcode Expired / Sesi Presensi Mandiri Ditutup' 
                    : 'Barcode Presensi Mandiri Sesi Aktif'}
            </span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono shadow-xs flex items-center space-x-1.5 ${
            isTokenMismatch || (isActivated && remainingSeconds <= 0)
              ? 'bg-rose-600 text-white'
              : !isActivated
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white animate-pulse'
          }`}>
            <span>⏱️ {isTokenMismatch ? 'Token Mismatch' : isActivated ? formatTimer(remainingSeconds) : 'Belum Aktif'}</span>
            {isExpired && isActivated && <span className="uppercase text-[10px] bg-rose-800 px-1.5 py-0.5 rounded ml-1">KADALUARSA</span>}
          </div>
        </div>

        {/* 2-Column Grid Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: QR Code Display OR Locked Expired Notice (5/12 width) */}
          <div className="md:col-span-5 flex flex-col items-center space-y-4 text-center">
            
            <div className={`p-4 rounded-3xl border-2 w-full flex flex-col items-center justify-center min-h-[240px] transition-all ${
              isTokenMismatch || (isActivated && remainingSeconds <= 0)
                ? 'bg-rose-50/60 border-rose-300'
                : !isActivated
                  ? 'bg-amber-50/50 border-amber-300'
                  : 'bg-slate-50 border-emerald-500 shadow-inner'
            }`}>
              {isTokenMismatch ? (
                /* Token Mismatch UI */
                <div className="flex flex-col items-center justify-center space-y-2.5 text-rose-900 p-2">
                  <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center border border-rose-300 shadow-xs">
                    <ShieldAlert className="w-7 h-7 text-rose-600" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800">LINK TIDAK VALID</h4>
                  <p className="text-[10px] text-rose-950 leading-relaxed font-semibold max-w-xs">
                    Link barcode ini sudah tidak cocok dengan token aktif Sesi {sessionIndex} atau Panitia telah memperbarui barcode baru.
                  </p>
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-200/80 px-2.5 py-1 rounded-full border border-rose-300">
                    TOKEN UNIK BERUBAH
                  </span>
                </div>
              ) : !isActivated ? (
                /* Not Activated UI */
                <div className="flex flex-col items-center justify-center space-y-2 text-amber-900 p-2">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center border border-amber-300">
                    <Clock className="w-6 h-6 text-amber-700" />
                  </div>
                  <h4 className="text-xs font-bold text-amber-900">Belum Diaktifkan</h4>
                  <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                    Barcode presensi sesi ini belum diaktifkan oleh Panitia. Silakan tunggu Panitia membuka sesi di Dashboard.
                  </p>
                </div>
              ) : remainingSeconds <= 0 ? (
                /* Expired / Locked UI */
                <div className="flex flex-col items-center justify-center space-y-2.5 text-rose-900 p-2">
                  <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center border border-rose-300 shadow-xs">
                    <ShieldAlert className="w-7 h-7 text-rose-600" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800">BARCODE KADALUARSA</h4>
                  <p className="text-[10px] text-rose-950 leading-relaxed font-semibold max-w-xs">
                    Sesi presensi mandiri telah berakhir. Barcode telah dikunci dan tidak dapat dipindai lagi oleh peserta.
                  </p>
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-200/80 px-2.5 py-1 rounded-full border border-rose-300">
                    EXPIRED • HITUNG MUNDUR SELESAI
                  </span>
                </div>
              ) : (
                /* Valid Scannable QR Code UI */
                <QRCodeSVG
                  id="public-session-barcode-svg"
                  value={currentToken}
                  size={210}
                  level="H"
                  includeMargin={true}
                  className="bg-white p-2.5 rounded-2xl shadow-sm max-w-full h-auto"
                />
              )}
            </div>

            {/* Token Info Box */}
            <div className={`w-full p-3 rounded-2xl border text-center ${
              isExpired ? 'bg-slate-100 border-slate-200' : 'bg-slate-100 border-slate-200'
            }`}>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">TOKEN BARCODE UNIK SESI</p>
              <p className={`font-mono text-xs font-extrabold truncate ${
                isExpired ? 'text-slate-400 line-through' : 'text-emerald-800'
              }`}>
                {currentToken}
              </p>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading || isExpired}
              className={`w-full py-3 px-4 text-xs font-extrabold rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all ${
                isExpired || !isActivated
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                  : 'btn-emerald active:scale-95 cursor-pointer'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {downloading 
                  ? 'Mengunduh...' 
                  : isExpired 
                    ? 'Barcode Expired (Unduh Dikunci)' 
                    : 'Unduh Gambar PNG'}
              </span>
            </button>

          </div>

          {/* Right Column: Session Details, Link Info & Actions (7/12 width) */}
          <div className="md:col-span-7 space-y-4 text-left">
            <div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 border shadow-2xs ${
                isExpired 
                  ? 'bg-rose-100/80 text-rose-800 border-rose-300' 
                  : 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
              }`}>
                {isExpired ? (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Sesi Presensi Ditutup / Expired</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{session.status || 'Berlangsung'}</span>
                  </>
                )}
              </span>
              <h2 className="text-xl font-black text-slate-900 leading-snug mt-2">{session.title}</h2>
              
              <div className="space-y-1.5 pt-2 text-xs text-slate-600 font-medium">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Waktu: <strong>{session.time}</strong> • {session.date || 'Hari Ini'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ruangan: <strong>{session.room}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pemateri: <strong>{session.speaker}</strong></span>
                </div>
              </div>
            </div>

            {/* Info Text Box */}
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
              !isActivated
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : isExpired
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-center space-x-1.5 font-bold">
                {!isActivated ? (
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                ) : isExpired ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>
                  {!isActivated 
                    ? 'Status: Menunggu Aktivasi Panitia' 
                    : isExpired 
                      ? 'Status: Sesi Presensi Kadaluarsa / Ended' 
                      : 'Status: Presensi Barcode Mandiri Aktif'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed font-medium opacity-90">
                {!isActivated
                  ? 'Minta Panitia Pelatihan untuk mengaktifkan barcode sesi ini melalui modal presensi di Dashboard Admin.'
                  : isExpired
                    ? 'Durasi aktif barcode yang ditentukan oleh Panitia telah berakhir atau link token telah berganti. Barcode ini sudah tidak dapat dipindai lagi oleh peserta.'
                    : 'Arahkan pemindai kamera aplikasi ke barcode di samping untuk memverifikasi presensi kehadiran peserta secara mandiri pada Sesi ' + sessionIndex + '.'}
              </p>
            </div>

            {/* Link Preview Info */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                DIRECT URL BARCODE UNIK SESI:
              </span>
              <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                <span className="font-mono text-[11px] text-emerald-800 truncate mr-2 font-bold">
                  {fullPreviewUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg flex items-center space-x-1 text-[10px] font-bold transition-colors shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>

            {/* Return Button */}
            <div className="pt-1">
              <button
                onClick={onGoBack}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-2xl shadow-md flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Kembali Ke Dashboard App</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
