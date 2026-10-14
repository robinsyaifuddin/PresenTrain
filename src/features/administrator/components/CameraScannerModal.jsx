import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  X, 
  SwitchCamera, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  QrCode, 
  RefreshCw, 
  UserCheck, 
  Building, 
  Mail, 
  Clock, 
  ShieldCheck,
  Volume2,
  VolumeX,
  Check,
  Ban,
  ArrowLeft,
  ArrowRight,
  FlipHorizontal,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { api } from '@/services/api';
import { offlineSync } from '@/services/offlineSync';

export default function CameraScannerModal({ 
  selectedSession, 
  participants, 
  setParticipants, 
  onClose 
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // Default: 'environment' (Kamera Belakang)
  const [reloadCounter, setReloadCounter] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentScans, setRecentScans] = useState([]);
  const [pausedForFeedback, setPausedForFeedback] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isFitCover, setIsFitCover] = useState(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const isProcessingRef = useRef(false);

  // Update pending offline count
  const updatePendingCount = () => {
    const pending = offlineSync.getPendingScans();
    setPendingOfflineCount(pending.length);
  };

  useEffect(() => {
    updatePendingCount();

    const handleOnline = async () => {
      const pending = offlineSync.getPendingScans();
      if (pending.length > 0) {
        setIsSyncingQueue(true);
        const res = await api.syncOfflineBatch();
        setIsSyncingQueue(false);
        updatePendingCount();
        if (res.syncedCount > 0) {
          playBeep('success');
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('storage', updatePendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('storage', updatePendingCount);
    };
  }, []);

  const handleManualSyncQueue = async () => {
    if (isSyncingQueue) return;
    setIsSyncingQueue(true);
    const res = await api.syncOfflineBatch();
    setIsSyncingQueue(false);
    updatePendingCount();
    if (res.syncedCount > 0) {
      playBeep('success');
      setScanResult({
        type: 'success',
        title: 'SINKRONISASI BERHASIL!',
        msg: `${res.syncedCount} presensi offline berhasil diunggah ke database server.`
      });
    }
  };

  const html5QrcodeRef = useRef(null);
  const scannerContainerId = 'qr-camera-full-feed-container';
  const audioContextRef = useRef(null);

  // Play audio feedback beep
  const playBeep = (type = 'success') => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  // Discover available camera devices on mount
  useEffect(() => {
    let isMounted = true;

    const fetchDevices = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isMounted && devices && devices.length > 0) {
          setCameras(devices);
        }
      } catch (err) {
        console.warn('Initial camera enumeration error:', err);
      }
    };

    fetchDevices();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize & start camera stream when selectedCameraId changes or modal opens
  useEffect(() => {
    let instance = null;

    const startScanner = async () => {
      setCameraError(null);
      
      const element = document.getElementById(scannerContainerId);
      if (!element) return;

      try {
        if (html5QrcodeRef.current) {
          try {
            if (html5QrcodeRef.current.isScanning) {
              await html5QrcodeRef.current.stop();
            }
            html5QrcodeRef.current.clear();
          } catch (e) {
            console.warn('Cleanup previous instance error', e);
          }
        }

        instance = new Html5Qrcode(scannerContainerId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true // Native C++ BarcodeDetector API bawaan browser untuk respon instan seperti QRIS
          }
        });
        html5QrcodeRef.current = instance;

        // Konfigurasi Full-Frame 30 FPS untuk sensitivitas maksimal dari sudut/jarak manapun
        const config = {
          fps: 30, // 30 FPS scanning kecepatan tinggi
          videoConstraints: {
            width: { min: 640, ideal: 1920, max: 2560 },
            height: { min: 480, ideal: 1080, max: 1440 },
            facingMode: facingMode,
            advanced: [{ focusMode: 'continuous' }]
          }
        };

        let cameraSource = (selectedCameraId && selectedCameraId !== 'environment' && selectedCameraId !== 'user') 
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: facingMode };

        try {
          await instance.start(
            cameraSource,
            config,
            (decodedText) => {
              handleDecodedQR(decodedText);
            },
            () => {}
          );
        } catch (firstErr) {
          console.warn('Primary camera start failed, trying facingMode fallback...', firstErr);
          const fallbackFacing = facingMode === 'environment' ? 'user' : 'environment';
          await instance.start(
            { facingMode: fallbackFacing },
            config,
            (decodedText) => {
              handleDecodedQR(decodedText);
            },
            () => {}
          );
        }

        // Pastikan style video HD jernih memenuhi container tanpa distorsi
        const videoElem = element.querySelector('video');
        if (videoElem) {
          videoElem.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
          videoElem.style.webkitTransform = isMirrored ? 'scaleX(-1)' : 'none';
          videoElem.style.objectFit = 'cover';
          videoElem.style.width = '100%';
          videoElem.style.height = '100%';
        }

        setIsScanning(true);

        // Refresh camera devices once permission is active to acquire populated labels
        try {
          const freshDevices = await Html5Qrcode.getCameras();
          if (freshDevices && freshDevices.length > 0) {
            setCameras(freshDevices);
          }
        } catch (e) {}

        // Aktifkan continuous autofocus lensa secara langsung pada media track jika didukung
        try {
          const track = instance.getRunningTrack();
          if (track && track.applyConstraints) {
            track.applyConstraints({
              advanced: [{ focusMode: 'continuous' }]
            }).catch(() => {});
          }
        } catch (e) {}

      } catch (err) {
        console.error('Error starting html5Qrcode:', err);
        setIsScanning(false);
        setCameraError(
          'Gagal membuka kamera. Pastikan izin kamera sudah diizinkan di browser dan tidak sedang digunakan oleh aplikasi lain.'
        );
      }
    };

    if (selectedSession) {
      startScanner();
    }

    return () => {
      if (html5QrcodeRef.current) {
        try {
          if (html5QrcodeRef.current.isScanning) {
            html5QrcodeRef.current.stop().then(() => {
              html5QrcodeRef.current.clear();
            }).catch(e => console.warn('Stop on unmount error', e));
          }
        } catch (e) {
          console.warn('Unmount cleanup error', e);
        }
      }
    };
  }, [selectedCameraId, facingMode, selectedSession, reloadCounter]);

  const handleDecodedQR = (qrToken) => {
    if (pausedForFeedback || isProcessingRef.current) return;
    isProcessingRef.current = true;
    processQRScan(qrToken);
  };

  // Switch between back (environment) and front (user) cameras cleanly
  const handleSwitchCamera = async () => {
    setCameraError(null);
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';

    // Stop active scanner safely before starting the new camera
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (e) {
        console.warn('Stop on switch camera error', e);
      }
    }

    // Cari device yang cocok jika ada list cameras
    let nextCamId = '';
    if (cameras.length > 0) {
      const match = cameras.find(c => {
        const lbl = (c.label || '').toLowerCase();
        const isTargetFront = lbl.includes('front') || lbl.includes('user') || lbl.includes('selfie') || lbl.includes('depan');
        return nextFacing === 'user' ? isTargetFront : !isTargetFront;
      });
      if (match) {
        nextCamId = match.id;
      }
    }

    setSelectedCameraId(nextCamId);
    setFacingMode(nextFacing);
    setIsMirrored(nextFacing === 'user');
    setReloadCounter(prev => prev + 1);
  };

  const handleSelectFrontCamera = () => {
    const frontCam = cameras.find(d => 
      d.label.toLowerCase().includes('front') || 
      d.label.toLowerCase().includes('user') || 
      d.label.toLowerCase().includes('selfie') || 
      d.label.toLowerCase().includes('depan') || 
      d.label.toLowerCase().includes('integrated')
    );
    setSelectedCameraId(frontCam ? frontCam.id : '');
    setFacingMode('user');
    setIsMirrored(true);
  };

  const handleSelectBackCamera = () => {
    const backCam = cameras.find(d => 
      d.label.toLowerCase().includes('back') || 
      d.label.toLowerCase().includes('rear') || 
      d.label.toLowerCase().includes('environment')
    );
    setSelectedCameraId(backCam ? backCam.id : '');
    setFacingMode('environment');
    setIsMirrored(false);
  };

  // Main QR Verification logic with Backend API & Offline-First Support
  const processQRScan = async (qrToken) => {
    if (!selectedSession || !qrToken || pausedForFeedback) return;

    const trimmedToken = qrToken.trim();
    const foundUser = participants.find(p => {
      const pToken = (p.qrToken || p.user_qr_token || '').trim();
      return pToken === trimmedToken || 
             (trimmedToken && pToken.endsWith(`-${trimmedToken}`)) ||
             (p.id && String(p.id) === trimmedToken) ||
             (p.db_id && String(p.db_id) === trimmedToken);
    });

    // Call Laravel Backend API
    const targetSessionId = selectedSession.db_id || selectedSession.id;
    const res = await api.scanAttendance(trimmedToken, targetSessionId, foundUser, { source: 'camera_scan' });

    if (res.status === 'error' || (!res.ok && res.status !== 'warning')) {
      playBeep('error');
      setScanResult({
        type: 'error',
        title: res.title || 'VERIFIKASI GAGAL!',
        msg: res.message || `Token/Barcode (${trimmedToken}) tidak terdaftar dalam database peserta. Pastikan pencahayaan cukup dan memindai Kartu Peserta resmi PresenTrain.`,
        token: trimmedToken
      });
      setPausedForFeedback(true);
      return;
    }

    if (res.status === 'warning') {
      playBeep('warning');
      setScanResult({
        type: 'warning',
        title: res.title || 'SUDAH ABSEN SEBELUMNYA!',
        msg: res.message || `${foundUser?.name || res.user?.name || 'Peserta'} telah melakukan absensi pada sesi ini.`,
        user: res.user || foundUser,
        time: res.scanned_at
      });
      setPausedForFeedback(true);
      return;
    }

    const nowTime = res.scanned_at || (new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
    const userToRecord = res.user || foundUser || { name: 'Peserta', email: '-', instansi: '-' };

    const updatedParticipants = participants.map(p => {
      const isMatch = (userToRecord.id && (p.id === userToRecord.id || p.db_id === userToRecord.id || p.id === `USR-${userToRecord.id}`)) ||
                      (p.qrToken && p.qrToken.trim() === trimmedToken) ||
                      (p.user_qr_token && p.user_qr_token.trim() === trimmedToken) ||
                      (userToRecord.email && p.email && p.email.toLowerCase() === userToRecord.email.toLowerCase());

      if (isMatch) {
        return {
          ...p,
          status: 'Hadir',
          attendances: {
            ...p.attendances,
            [selectedSession.id]: { present: true, time: nowTime, status: 'present' },
            ...(selectedSession.db_id ? { [selectedSession.db_id]: { present: true, time: nowTime, status: 'present' } } : {})
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    playBeep('success');

    const resultObj = {
      type: 'success',
      title: res.isOfflineMode ? 'ABSENSI OFFLINE DICATAT!' : (res.title || 'ABSENSI BERHASIL!'),
      msg: res.message || `Terverifikasi! ${userToRecord.name} berhasil melakukan presensi pada ${selectedSession.title}.`,
      user: userToRecord,
      time: nowTime
    };

    setScanResult(resultObj);
    setRecentScans(prev => [{ user: userToRecord, time: nowTime, status: 'Hadir' }, ...prev.slice(0, 4)]);
    setPausedForFeedback(true);
  };

  // Resume camera scanning after popup dismissed
  const handleDismissPopup = () => {
    setScanResult(null);
    setPausedForFeedback(false);
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 400);
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (scanResult) {
          handleDismissPopup();
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanResult]);

  const handleClose = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner on close', e);
      }
    }
    onClose();
  };

  const activeCamObj = cameras.find(c => c.id === selectedCameraId);
  const currentCamLabel = activeCamObj?.label || (facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan');

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden h-screen w-screen font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Background Live Camera Feed (Full-Screen & Clear) */}
      <div className="absolute inset-0 w-full h-full object-cover z-0 bg-black flex items-center justify-center overflow-hidden">
        <div 
          id={scannerContainerId} 
          className={`w-full h-full ${isMirrored ? 'is-mirrored' : 'no-mirror'} ${isFitCover ? 'is-cover' : ''}`} 
        />
      </div>

      {/* Native Clean QR Scanner Box Viewfinder Overlay (Tanpa Layer Putih Transparan) */}
      {isScanning && !cameraError && (
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center p-4">
          
          {/* Centered Reticle Frame (Transparan Bersih) */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 aspect-square flex items-center justify-center rounded-3xl border-2 border-emerald-500/70 overflow-hidden transition-all duration-300">
            
            {/* Corner Bracket Reticles */}
            <div className="absolute top-0 left-0 w-9 h-9 border-t-4 border-l-4 border-emerald-500 rounded-tl-2xl shadow-[0_0_15px_rgba(16,185,129,0.7)] z-20" />
            <div className="absolute top-0 right-0 w-9 h-9 border-t-4 border-r-4 border-emerald-500 rounded-tr-2xl shadow-[0_0_15px_rgba(16,185,129,0.7)] z-20" />
            <div className="absolute bottom-0 left-0 w-9 h-9 border-b-4 border-l-4 border-emerald-500 rounded-bl-2xl shadow-[0_0_15px_rgba(16,185,129,0.7)] z-20" />
            <div className="absolute bottom-0 right-0 w-9 h-9 border-b-4 border-r-4 border-emerald-500 rounded-br-2xl shadow-[0_0_15px_rgba(16,185,129,0.7)] z-20" />

            {/* Laser Scanner Line Animation */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_#10b981] animate-bounce z-10 opacity-90" />

            {/* Center Target Crosshair */}
            <div className="w-7 h-7 border-2 border-dashed border-emerald-400/50 rounded-full flex items-center justify-center z-10">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            </div>
          </div>

          {/* Guide Instruction Badge */}
          <div className="bg-white/90 backdrop-blur-md text-slate-800 text-center px-5 py-2.5 rounded-full border border-slate-200 text-xs font-semibold shadow-md mt-6 flex items-center space-x-2 pointer-events-auto">
            <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Posisikan Barcode / QR Code di layar kamera</span>
          </div>
        </div>
      )}

      {/* Camera Error Fallback */}
      {cameraError && (
        <div className="absolute inset-0 bg-white/95 p-6 flex flex-col items-center justify-center text-center z-30 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center shadow-md">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">Akses Kamera Tidak Diizinkan</h4>
          <p className="text-xs text-slate-600 max-w-md leading-relaxed">{cameraError}</p>
          <button
            onClick={() => {
              setCameraError(null);
              setSelectedCameraId('');
              setFacingMode('environment');
              setReloadCounter(c => c + 1);
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center space-x-2 shadow-md active:scale-95 transition-all mt-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Hubungkan Kamera Kembali</span>
          </button>
        </div>
      )}

      {/* Floating Top Control Bar (Clean Toolbar) */}
      <div className="relative z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 p-3 md:p-4 flex items-center justify-between shadow-xs gap-2">
        
        {/* Left: Back Button Only */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleClose}
            className="p-2 sm:px-3 sm:py-2 rounded-md bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer flex items-center space-x-1.5"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold text-slate-700">Kembali</span>
          </button>
        </div>

        {/* Right Action Toolbar */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          
          {/* Ganti Kamera Button */}
          <button
            type="button"
            onClick={handleSwitchCamera}
            className="p-2 sm:px-3 sm:py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
            title={`Ganti Kamera (Sekarang: ${facingMode === 'environment' ? 'Belakang' : 'Depan'})`}
          >
            <SwitchCamera className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline text-xs font-bold text-slate-700">Ganti Kamera</span>
          </button>

          {/* Offline Scans Badge & 1-Click Sync Button */}
          {pendingOfflineCount > 0 && (
            <button
              onClick={handleManualSyncQueue}
              disabled={isSyncingQueue}
              className="px-3 py-2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 flex items-center space-x-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all animate-pulse cursor-pointer"
              title="Klik untuk sinkronisasi seluruh antrean presensi offline ke database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>{isSyncingQueue ? 'Syncing...' : `🟡 ${pendingOfflineCount} Offline`}</span>
            </button>
          )}

          {/* Sound Feedback Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 sm:p-2 rounded-md border shadow-xs transition-all active:scale-95 cursor-pointer ${
              soundEnabled 
                ? 'bg-white text-emerald-600 border-slate-200 hover:bg-slate-50' 
                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
            }`}
            title={soundEnabled ? "Matikan Suara Beep" : "Nyalakan Suara Beep"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Mirror Toggle Button */}
          <button
            onClick={() => setIsMirrored(!isMirrored)}
            className={`p-2 sm:p-2 rounded-md border shadow-xs transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer ${
              isMirrored 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'bg-white text-slate-600 hover:text-emerald-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={isMirrored ? "Matikan Mode Cermin" : "Aktifkan Mode Cermin"}
          >
            <FlipHorizontal className="w-4 h-4" />
            <span className="hidden lg:inline text-xs font-semibold">
              {isMirrored ? "Cermin" : "Asli"}
            </span>
          </button>

          {/* Camera Fit Mode Button */}
          <button
            onClick={() => setIsFitCover(!isFitCover)}
            className={`p-2 sm:p-2 rounded-md border shadow-xs transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer ${
              isFitCover 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
            }`}
            title={isFitCover ? "Ubah ke Tampilan Jauh Standar" : "Ubah ke Layar Penuh"}
          >
            {isFitCover ? <Minimize2 className="w-4 h-4 text-emerald-600" /> : <Maximize2 className="w-4 h-4 text-slate-500" />}
          </button>

        </div>
      </div>

      {/* POP-UP OVERLAY RESULT MODAL */}
      {scanResult && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto select-none"
          onClick={handleDismissPopup}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5 text-slate-900 transform transition-all animate-spring-popup max-h-[92dvh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Pop-up Top Icon & Title */}
            <div className="text-center space-y-2">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-lg ${
                scanResult.type === 'success'
                  ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                  : scanResult.type === 'warning'
                  ? 'bg-amber-100 text-amber-600 border border-amber-200'
                  : 'bg-rose-100 text-rose-600 border border-rose-200'
              }`}>
                {scanResult.type === 'success' && <CheckCircle2 className="w-9 h-9" />}
                {scanResult.type === 'warning' && <AlertTriangle className="w-9 h-9" />}
                {scanResult.type === 'error' && <XCircle className="w-9 h-9" />}
              </div>

              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block ${
                scanResult.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800'
                  : scanResult.type === 'warning'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {scanResult.type === 'success' ? 'TERVERIFIKASI HADIR' : scanResult.type === 'warning' ? 'PERINGATAN ABSEN' : 'VERIFIKASI GAGAL'}
              </span>

              <h3 className="text-lg font-bold text-slate-900 mt-1">{scanResult.title}</h3>
              <p className="text-xs text-slate-600 px-2 leading-relaxed">{scanResult.msg}</p>
            </div>

            {/* Verified Participant Card (If Available) */}
            {scanResult.user && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold text-base flex items-center justify-center shadow-md shrink-0">
                    {scanResult.user.name.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{scanResult.user.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{scanResult.user.email}</p>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md inline-block mt-1">
                      {scanResult.user.instansi || 'Peserta Terdaftar'}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/80 flex justify-between items-center text-xs text-slate-500 font-medium">
                  <span>Waktu Scan Absensi:</span>
                  <span className="font-semibold text-emerald-700 font-mono bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                    {scanResult.time || (new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB')}
                  </span>
                </div>
              </div>
            )}

            {/* Pop-up Action Buttons */}
            <div className="pt-1 flex flex-col space-y-2">
              <button
                onClick={handleDismissPopup}
                className="w-full py-3.5 px-4 font-bold text-xs rounded-2xl shadow-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white flex items-center justify-center space-x-2 shadow-emerald-600/20 cursor-pointer"
              >
                <span>Lanjutkan Scan Peserta Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleDismissPopup}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Tutup Pop-up Ini
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
