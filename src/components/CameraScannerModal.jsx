import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  X, 
  SwitchCamera, 
  Zap, 
  ZapOff, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
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
import { api } from '../services/api';
import { offlineSync } from '../services/offlineSync';

export default function CameraScannerModal({ 
  selectedSession, 
  participants, 
  setParticipants, 
  onClose 
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [simulatedTokenInput, setSimulatedTokenInput] = useState('');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentScans, setRecentScans] = useState([]);
  const [pausedForFeedback, setPausedForFeedback] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(true);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isFitCover, setIsFitCover] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

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

  // Get available camera devices on mount
  useEffect(() => {
    let isMounted = true;

    const fetchDevices = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isMounted && devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else if (isMounted) {
          setCameraError('Tidak ada perangkat kamera yang terdeteksi pada sistem Anda.');
        }
      } catch (err) {
        console.warn('Failed to get cameras:', err);
        if (isMounted) {
          setCameraError(
            err?.message || 'Izin akses kamera ditolak atau browser tidak mendukung streaming video.'
          );
        }
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

        instance = new Html5Qrcode(scannerContainerId);
        html5QrcodeRef.current = instance;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            const boxSize = Math.max(220, Math.floor(minDim * 0.65));
            return {
              width: boxSize,
              height: boxSize
            };
          }
        };

        const cameraConfig = selectedCameraId 
          ? selectedCameraId 
          : { facingMode: 'environment' };

        await instance.start(
          cameraConfig,
          config,
          (decodedText) => {
            handleDecodedQR(decodedText);
          },
          () => {
            // Silence frame scan errors
          }
        );

        // Ensure video element is not mirrored
        const videoElem = element.querySelector('video');
        if (videoElem) {
          videoElem.style.transform = 'none';
          videoElem.style.webkitTransform = 'none';
        }

        setIsScanning(true);

        try {
          const capabilities = instance.getRunningTrackCapabilities();
          if (capabilities && capabilities.torch) {
            setHasTorch(true);
          }
          // Reset zoom to default minimum / 1.0 if supported by device
          if (capabilities && capabilities.zoom) {
            try {
              const track = instance.getRunningTrack();
              if (track && track.applyConstraints) {
                track.applyConstraints({
                  advanced: [{ zoom: capabilities.zoom.min || 1.0 }]
                }).catch(() => {});
              }
            } catch (e) {}
          }
        } catch (e) {
          setHasTorch(false);
        }

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
  }, [selectedCameraId, selectedSession]);

  const handleDecodedQR = (qrToken) => {
    if (pausedForFeedback) return;
    processQRScan(qrToken);
  };

  // Switch camera devices
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) {
      setSelectedCameraId(prev => (prev === 'user' ? 'environment' : 'user'));
      return;
    }
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  const handleSelectFrontCamera = () => {
    const frontCam = cameras.find(d => 
      d.label.toLowerCase().includes('front') || 
      d.label.toLowerCase().includes('user') ||
      d.label.toLowerCase().includes('selfie') ||
      d.label.toLowerCase().includes('integrated')
    );
    if (frontCam) {
      setSelectedCameraId(frontCam.id);
    } else if (cameras.length > 0) {
      setSelectedCameraId(cameras[0].id);
    } else {
      setSelectedCameraId('user');
    }
  };

  const handleSelectBackCamera = () => {
    const backCam = cameras.find(d => 
      d.label.toLowerCase().includes('back') || 
      d.label.toLowerCase().includes('rear') ||
      d.label.toLowerCase().includes('environment')
    );
    if (backCam) {
      setSelectedCameraId(backCam.id);
    } else if (cameras.length > 1) {
      setSelectedCameraId(cameras[1].id);
    } else {
      setSelectedCameraId('environment');
    }
  };

  // Main QR Verification logic with Backend API & Offline-First Support
  const processQRScan = async (qrToken) => {
    if (!selectedSession || !qrToken || pausedForFeedback) return;

    const trimmedToken = qrToken.trim();
    const foundUser = participants.find(p => p.qrToken?.trim() === trimmedToken);

    // Call Laravel Backend API
    const res = await api.scanAttendance(trimmedToken, selectedSession.id, foundUser);

    if (res.status === 'error' || res.isNetworkError && !foundUser) {
      playBeep('error');
      setScanResult({
        type: 'error',
        title: res.title || 'VERIFIKASI GAGAL!',
        msg: res.message || `Token (${trimmedToken}) tidak terdaftar dalam database peserta.`,
        token: trimmedToken
      });
      return;
    }

    if (res.status === 'warning') {
      playBeep('warning');
      setScanResult({
        type: 'warning',
        title: res.title || 'SUDAH ABSEN SEBELUMNYA!',
        msg: res.message || `${foundUser?.name || 'Peserta'} telah melakukan absensi pada sesi ini.`,
        user: res.user || foundUser
      });
      return;
    }

    const nowTime = res.scanned_at || (new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
    const userToRecord = res.user || foundUser || { name: 'Peserta', email: '-', instansi: '-' };

    const updatedParticipants = participants.map(p => {
      if (p.id === userToRecord.id || p.qrToken === trimmedToken) {
        return {
          ...p,
          attendances: {
            ...p.attendances,
            [selectedSession.id]: { present: true, time: nowTime }
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    playBeep('success');

    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.5 }
      });
    } catch (e) {}

    const resultObj = {
      type: 'success',
      title: res.isOfflineMode ? 'ABSENSI OFFLINE DICATAT!' : (res.title || 'ABSENSI BERHASIL!'),
      msg: res.message || `Terverifikasi! ${userToRecord.name} berhasil melakukan presensi.`,
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
  };

  // Test handlers
  const handleTestSuccess = () => {
    const unAttended = participants.find(p => !p.attendances?.[selectedSession.id]?.present) || participants[0];
    if (unAttended) {
      processQRScan(unAttended.qrToken);
    }
  };

  const handleTestFailure = () => {
    processQRScan('ABSEN-INVALID-TOKEN-9999');
  };

  const handleTestAlreadyAttended = () => {
    const attended = participants.find(p => p.attendances?.[selectedSession.id]?.present) || participants[0];
    if (attended) {
      processQRScan(attended.qrToken);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrcodeRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

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
  const currentCamLabel = activeCamObj?.label || (selectedCameraId === 'user' ? 'Kamera Depan' : 'Kamera Utama');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden h-screen w-screen font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Background Live Camera Feed - Styled to 100% full screen via CSS overrides */}
      <div className="absolute inset-0 w-full h-full object-cover z-0 bg-slate-950 flex items-center justify-center overflow-hidden">
        <div 
          id={scannerContainerId} 
          className={`w-full h-full ${isMirrored ? 'is-mirrored' : 'no-mirror'} ${isFitCover ? 'is-cover' : ''}`} 
        />
      </div>

      {/* Viewfinder Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/80 pointer-events-none z-0" />

      {/* Native 1:1 Square QR Scanner Box Viewfinder Overlay */}
      {isScanning && !cameraError && (
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center p-4">
          
          {/* Centered 1:1 Square Box with Outer Shadow Vignette Overlay */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 aspect-square flex items-center justify-center rounded-3xl shadow-[0_0_0_9999px_rgba(2,6,23,0.78)] border border-emerald-500/40 overflow-hidden transition-all duration-300">
            
            {/* Corner Bracket Reticles with Glow Effect */}
            <div className="absolute top-0 left-0 w-9 h-9 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20" />
            <div className="absolute top-0 right-0 w-9 h-9 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20" />
            <div className="absolute bottom-0 left-0 w-9 h-9 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20" />
            <div className="absolute bottom-0 right-0 w-9 h-9 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20" />

            {/* Laser Scanner Line Animation */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_#10b981] animate-bounce z-10 opacity-90" />

            {/* Center Target Crosshair */}
            <div className="w-7 h-7 border-2 border-dashed border-emerald-400/40 rounded-full flex items-center justify-center z-10">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            </div>
          </div>

          {/* Guide Instruction Badge */}
          <div className="bg-slate-900/80 backdrop-blur-xl text-slate-200 text-center px-5 py-2.5 rounded-full border border-slate-700/80 text-xs font-medium shadow-2xl mt-8 flex items-center space-x-2 pointer-events-auto">
            <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Posisikan QR Code Peserta di dalam area kotak</span>
          </div>
        </div>
      )}

      {/* Camera Error Fallback */}
      {cameraError && (
        <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center z-30 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-2xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white">Akses Kamera Tidak Diizinkan</h4>
          <p className="text-xs text-slate-300 max-w-md leading-relaxed">{cameraError}</p>
          <button
            onClick={() => setSelectedCameraId(prev => prev)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-semibold flex items-center space-x-2 shadow-lg active:scale-95 transition-all mt-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Hubungkan Kamera Kembali</span>
          </button>
        </div>
      )}

      {/* Modern Floating Top Control Bar */}
      <div className="relative z-20 bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/60 p-3.5 md:p-5 flex items-center justify-between shadow-xl">
        
        {/* Left: Back Button & Session Title */}
        <div className="flex items-center space-x-3 overflow-hidden">
          <button
            onClick={handleClose}
            className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-md active:scale-95 transition-all shrink-0"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="overflow-hidden">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                LIVE SCANNER
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-[340px] md:max-w-[480px]">
              {selectedSession?.title}
            </h2>
          </div>
        </div>

        {/* Right Action Toolbar */}
        <div className="flex items-center space-x-2 shrink-0">
          
          {/* Offline Scans Badge & 1-Click Sync Button */}
          {pendingOfflineCount > 0 && (
            <button
              onClick={handleManualSyncQueue}
              disabled={isSyncingQueue}
              className="px-3 py-1.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/60 hover:bg-amber-500/30 flex items-center space-x-1.5 text-xs font-bold shadow-md shadow-amber-500/10 active:scale-95 transition-all animate-pulse"
              title="Klik untuk sinkronisasi seluruh antrean presensi offline ke database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>{isSyncingQueue ? 'Syncing...' : `🟡 ${pendingOfflineCount} Offline`}</span>
            </button>
          )}
          
          {/* Torch Switch */}
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-2xl backdrop-blur-md border shadow-md transition-all active:scale-95 ${
                isTorchOn 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10' 
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-700/80'
              }`}
              title={isTorchOn ? "Matikan Flash" : "Nyalakan Flash"}
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-amber-300" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Sound Feedback Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl backdrop-blur-md border shadow-md transition-all active:scale-95 ${
              soundEnabled 
                ? 'bg-slate-900/90 text-emerald-400 border-slate-700/80' 
                : 'bg-slate-900/90 text-slate-500 border-slate-700/80'
            }`}
            title={soundEnabled ? "Matikan Suara Beep" : "Nyalakan Suara Beep"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Mirror Toggle Button (Default: No Mirror) */}
          <button
            onClick={() => setIsMirrored(!isMirrored)}
            className={`p-2.5 rounded-2xl backdrop-blur-md border shadow-md transition-all active:scale-95 flex items-center space-x-1.5 ${
              isMirrored 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                : 'bg-slate-900/90 text-emerald-400 border-slate-700/80'
            }`}
            title={isMirrored ? "Matikan Mode Cermin (Kembali ke Kamera Asli)" : "Aktifkan Mode Cermin"}
          >
            <FlipHorizontal className="w-4 h-4" />
            <span className="hidden md:inline text-xs font-medium">
              {isMirrored ? "Cermin (Flipped)" : "Asli (No Mirror)"}
            </span>
          </button>

          {/* Camera Fit Mode Button (Default: Contain / Standar) */}
          <button
            onClick={() => setIsFitCover(!isFitCover)}
            className={`p-2.5 rounded-2xl backdrop-blur-md border shadow-md transition-all active:scale-95 flex items-center space-x-1.5 ${
              isFitCover 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/80'
            }`}
            title={isFitCover ? "Ubah ke Tampilan Jauh Standar" : "Ubah ke Layar Penuh"}
          >
            {isFitCover ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-slate-400" />}
            <span className="hidden lg:inline text-xs font-medium">
              {isFitCover ? "Layar Penuh" : "Jarak Standar"}
            </span>
          </button>

          {/* Camera Flip Button */}
          <button
            onClick={handleSwitchCamera}
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl border border-slate-700/80 shadow-md active:scale-95 transition-all flex items-center space-x-1.5"
            title="Ganti Kamera"
          >
            <SwitchCamera className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline text-xs font-medium">Ganti Kamera</span>
          </button>

          {/* Device Selector Dropdown for Desktop */}
          {cameras.length > 0 && (
            <div className="hidden lg:block">
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="px-3 py-2 bg-slate-900/90 text-slate-200 border border-slate-700/80 rounded-2xl text-xs font-medium outline-none cursor-pointer hover:border-slate-600 transition-colors"
              >
                {cameras.map((cam, i) => (
                  <option key={cam.id} value={cam.id} className="bg-slate-900 text-white">
                    {cam.label || `Kamera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>
      </div>

      {/* Bottom Dock Control Area */}
      <div className="relative z-20 p-4 md:p-6 flex flex-col items-center justify-end space-y-3 pointer-events-none">
        
        {/* Collapsible Simulation / Test Panel */}
        {showTestPanel && (
          <div className="pointer-events-auto max-w-lg w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 p-4 sm:p-5 rounded-3xl shadow-2xl space-y-3.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2 font-semibold text-slate-200">
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>Panel Simulasi & Uji Coba Presensi</span>
              </div>
              <button
                onClick={() => setShowTestPanel(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Sembunyikan Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Test Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTestSuccess}
                className="py-2.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-semibold flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm"
              >
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Uji Scan Berhasil</span>
              </button>

              <button
                onClick={handleTestFailure}
                className="py-2.5 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-2xl text-xs font-semibold flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm"
              >
                <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Uji Scan Gagal</span>
              </button>
            </div>

            {/* Second Row: Already Attended & Manual Input */}
            <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
              <button
                onClick={handleTestAlreadyAttended}
                className="py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shrink-0"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Status "Sudah Absen"</span>
              </button>
              
              <div className="flex-1 flex items-center bg-slate-950/80 border border-slate-700/80 rounded-2xl p-1 focus-within:border-emerald-500 transition-colors">
                <input
                  type="text"
                  placeholder="Token QR manual..."
                  value={simulatedTokenInput}
                  onChange={(e) => setSimulatedTokenInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && simulatedTokenInput) {
                      processQRScan(simulatedTokenInput);
                      setSimulatedTokenInput('');
                    }
                  }}
                  className="w-full px-3 py-1 text-white text-xs bg-transparent outline-none placeholder:text-slate-500"
                />
                <button
                  onClick={() => {
                    if (simulatedTokenInput) {
                      processQRScan(simulatedTokenInput);
                      setSimulatedTokenInput('');
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all shrink-0"
                >
                  Scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clean Bottom Navigation Toolbar */}
        <div className="pointer-events-auto max-w-lg w-full flex items-center justify-between text-xs bg-slate-950/80 backdrop-blur-2xl border border-slate-800/80 px-4 py-2.5 rounded-2xl shadow-xl">
          
          <div className="flex items-center space-x-2 text-slate-400 overflow-hidden">
            <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] truncate">
              Kamera: <strong className="text-slate-200 font-medium">{currentCamLabel}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {!showTestPanel && (
              <button
                onClick={() => setShowTestPanel(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700/80 rounded-xl font-medium text-[11px] flex items-center space-x-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Simulasi</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold rounded-xl text-xs transition-all active:scale-95 flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>

        </div>

      </div>

      {/* POP-UP OVERLAY RESULT MODAL */}
      {scanResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className={`w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5 text-slate-900 transform transition-all animate-in zoom-in-95 duration-200 max-h-[calc(100vh-2rem)] overflow-y-auto my-auto`}>
            
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
                    {scanResult.time || '10:42 WIB'}
                  </span>
                </div>
              </div>
            )}

            {/* Pop-up Action Buttons */}
            <div className="pt-1 flex flex-col space-y-2">
              <button
                onClick={handleDismissPopup}
                className={`w-full py-3 px-4 font-bold text-xs rounded-2xl shadow-lg active:scale-95 transition-all text-white flex items-center justify-center space-x-2 ${
                  scanResult.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : scanResult.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                <span>Lanjutkan Scan Peserta Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleDismissPopup}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold"
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
