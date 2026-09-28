import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { 
  QrCode, Maximize2, Minimize2, CheckCircle2, Clock, MapPin, Calendar, 
  Sparkles, Building, Phone, Copy, Check, Download, LifeBuoy, 
  Send, AlertCircle, AlertTriangle, MessageSquare, ShieldCheck, User, HelpCircle, FileText, Lock, PlayCircle, Link, ChevronRight,
  Camera, Volume2, VolumeX, X, ArrowLeft, FlipHorizontal, Ban, SwitchCamera, RefreshCw,
  Zap, ZapOff
} from 'lucide-react';
import QuizPlayerModal from './QuizPlayerModal';
import ProfileView from './ProfileView';
import SettingsView from './SettingsView';
import GuideView from './GuideView';
import BannerSlider from './BannerSlider';

export default function PesertaDashboard({ 
  user, 
  onUpdateUser,
  participants,
  setParticipants,
  training, 
  activeTab, 
  setActiveTab, 
  onOpenFullQR, 
  siteSettings,
  quizzes,
  quizSubmissions,
  setQuizSubmissions,
  urlQuizCode
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notification, setNotification] = useState('');

  // Quiz States
  const [activePlayingQuiz, setActivePlayingQuiz] = useState(null);
  const [simulatedLinkInput, setSimulatedLinkInput] = useState('');

  useEffect(() => {
    if (urlQuizCode) {
      const found = (quizzes || []).find(q => q.linkCode.toLowerCase() === urlQuizCode.toLowerCase());
      if (found) {
        setActivePlayingQuiz(found);
      }
    }
  }, [urlQuizCode, quizzes]);

  // Helpdesk Form States
  const [incidentMsg, setIncidentMsg] = useState('');
  const [submittedIncidents, setSubmittedIncidents] = useState([
    { id: 'TKT-101', issue: 'Tanya lokasi rincian ruangan Lab 2 Sesi 3', status: 'Selesai', response: 'Ruangan Lab 2 berada di lantai 2 sebelah timur.', time: '09:00 WIB' }
  ]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const sessions = training?.sessions || [];
  
  const getInitialUserAttendances = () => {
    if (user?.attendances && Object.keys(user.attendances).length > 0) {
      return user.attendances;
    }
    const matched = (participants || []).find(p => p.email === user?.email || p.id === user?.id || p.qrToken === user?.qrToken);
    if (matched?.attendances && Object.keys(matched.attendances).length > 0) {
      return matched.attendances;
    }
    // Default generate complete fallback for 10 sessions
    const defaultAtt = {};
    sessions.forEach((s, idx) => {
      defaultAtt[s.id] = { present: idx < 2, time: idx === 0 ? "07:55 WIB" : idx === 1 ? "10:10 WIB" : null, note: idx < 2 ? "Hadir tepat waktu" : null };
    });
    return defaultAtt;
  };

  const [userAttendancesState, setUserAttendancesState] = useState(getInitialUserAttendances);

  useEffect(() => {
    if (user?.attendances && Object.keys(user.attendances).length > 0) {
      setUserAttendancesState(user.attendances);
    } else {
      const matched = (participants || []).find(p => p.email === user?.email || p.id === user?.id || p.qrToken === user?.qrToken);
      if (matched?.attendances && Object.keys(matched.attendances).length > 0) {
        setUserAttendancesState(matched.attendances);
      }
    }
  }, [user?.attendances, user?.email, user?.id, participants]);

  const userAttendances = userAttendancesState;
  const attendedCount = sessions.filter(s => userAttendances[s.id]?.present).length;
  const totalCount = sessions.length;
  const progressPercent = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;

  // Peserta Scanner States & Logic
  const [pesertaScanInput, setPesertaScanInput] = useState('');
  const [pesertaScanResult, setPesertaScanResult] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // Default: 'environment' (Kamera Belakang)
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isFitCover, setIsFitCover] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const html5QrcodeRef = useRef(null);
  const audioContextRef = useRef(null);

  // Switch between back (environment) and front (user) cameras, or cycle through available camera devices
  const handleSwitchCamera = async () => {
    if (isCameraLoading) return;
    setIsCameraLoading(true);
    setCameraError(null);

    // If multiple camera devices are detected with distinct IDs
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = currentIndex === -1 ? 1 : (currentIndex + 1) % cameras.length;
      const nextCam = cameras[nextIndex];
      setSelectedCameraId(nextCam.id);

      const isFront = (nextCam.label || '').toLowerCase().includes('front') || 
                      (nextCam.label || '').toLowerCase().includes('user') ||
                      (nextCam.label || '').toLowerCase().includes('selfie') ||
                      (nextCam.label || '').toLowerCase().includes('depan');
      const newFacing = isFront ? 'user' : 'environment';
      setFacingMode(newFacing);
      setIsMirrored(isFront);
    } else {
      // Toggle facingMode directly
      const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextFacing);
      setSelectedCameraId('');
      setIsMirrored(nextFacing === 'user');
    }
  };

  // Switch to specific camera mode (Belakang vs Depan)
  const handleSetCameraFacing = (mode) => {
    if (facingMode === mode && !selectedCameraId) return;
    setFacingMode(mode);
    setSelectedCameraId('');
    setIsMirrored(mode === 'user');
  };

  // Switch to a specific device from dropdown
  const handleSelectCameraDevice = (camId) => {
    if (!camId) {
      setSelectedCameraId('');
      return;
    }
    setSelectedCameraId(camId);
    const chosen = cameras.find(c => c.id === camId);
    if (chosen) {
      const isFront = (chosen.label || '').toLowerCase().includes('front') || 
                      (chosen.label || '').toLowerCase().includes('user') ||
                      (chosen.label || '').toLowerCase().includes('selfie') ||
                      (chosen.label || '').toLowerCase().includes('depan');
      setFacingMode(isFront ? 'user' : 'environment');
      setIsMirrored(isFront);
    }
  };

  // Toggle Torch / Flashlight for rear camera
  const handleToggleTorch = async () => {
    if (!html5QrcodeRef.current) return;
    try {
      const nextState = !isTorchOn;
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle failed', e);
      showToast('Senter/Flashlight tidak didukung pada perangkat/kamera ini.');
    }
  };

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio feedback error', e);
    }
  };

  const handleProcessScanCode = (codeStr) => {
    if (!codeStr || !codeStr.trim()) return;
    const clean = codeStr.trim();
    const sessionsList = training?.sessions || [];
    
    // Find matching session by ID, title, or code
    let matchedSession = sessionsList.find(s => {
      const u = clean.toUpperCase();
      return u.includes(s.id.toUpperCase()) || 
             s.id.toUpperCase() === u ||
             u.includes(s.title.toUpperCase()) ||
             s.title.toUpperCase().includes(u);
    });

    if (!matchedSession) {
      // Default to first un-attended session or fallback
      matchedSession = sessionsList.find(s => !userAttendancesState[s.id]?.present) || sessionsList[0];
    }

    const scanTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newAttendances = {
      ...userAttendancesState,
      [matchedSession.id]: {
        present: true,
        time: scanTime
      }
    };

    setUserAttendancesState(newAttendances);

    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        attendances: newAttendances
      });
    }

    if (setParticipants) {
      setParticipants((prev) => (prev || []).map((p) => {
        if (p.id === user.id || p.email === user.email) {
          return {
            ...p,
            status: 'Hadir',
            attendances: newAttendances
          };
        }
        return p;
      }));
    }

    playBeep();
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.warn('Confetti error', e);
    }

    setPesertaScanResult({
      success: true,
      sessionId: matchedSession.id,
      sessionTitle: matchedSession.title,
      speaker: matchedSession.speaker,
      room: matchedSession.room,
      time: scanTime,
      msg: `Absensi Berhasil! Status Sesi "${matchedSession.title}" Telah Berubah Menjadi HADIR.`
    });

    showToast(`Presensi Berhasil! Status Sesi "${matchedSession.title}" berubah menjadi HADIR (${scanTime}).`);
    setPesertaScanInput('');
  };

  // Camera initialization Effect for Peserta Full-Screen View
  useEffect(() => {
    let instance = null;
    let isMounted = true;

    if (activeTab === 'scan_presensi') {
      const containerId = 'peserta-camera-feed-box';
      setIsCameraLoading(true);
      setCameraError(null);

      const startScanner = async () => {
        // Clean up previous instance
        if (html5QrcodeRef.current) {
          try {
            if (html5QrcodeRef.current.isScanning) {
              await html5QrcodeRef.current.stop();
            }
            html5QrcodeRef.current.clear();
          } catch (e) {
            console.warn('Cleanup error', e);
          }
        }

        const element = document.getElementById(containerId);
        if (!element || !isMounted) {
          setIsCameraLoading(false);
          return;
        }

        try {
          instance = new Html5Qrcode(containerId);
          html5QrcodeRef.current = instance;

          const config = {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minDim = Math.min(viewfinderWidth, viewfinderHeight);
              const boxSize = Math.max(220, Math.floor(minDim * 0.68));
              return { width: boxSize, height: boxSize };
            },
            videoConstraints: {
              focusMode: 'continuous',
              advanced: [{ zoom: 1.0 }]
            }
          };

          // Use selected camera ID if specified by user, otherwise use facingMode (default 'environment' = kamera belakang)
          const cameraSource = selectedCameraId ? selectedCameraId : { facingMode: facingMode };

          await instance.start(
            cameraSource,
            config,
            (decodedText) => {
              handleProcessScanCode(decodedText);
            },
            () => {}
          );

          if (isMounted) {
            setIsCameraLoading(false);
            setCameraError(null);

            // Check torch / senter capability
            try {
              const track = instance.getRunningTrackCapabilities?.();
              if (track && 'torch' in track) {
                setHasTorch(true);
              }
            } catch (e) {}

            // Refresh camera devices list with actual labels after permission is granted
            try {
              const devices = await Html5Qrcode.getCameras();
              if (isMounted && devices && devices.length > 0) {
                setCameras(devices);
              }
            } catch (e) {}
          }
        } catch (err) {
          console.warn('Peserta camera start error', err);
          if (isMounted) {
            setIsCameraLoading(false);
            // If starting with specific ID failed, try falling back to generic facingMode
            if (selectedCameraId) {
              setSelectedCameraId('');
            } else {
              setCameraError(
                err?.message || 'Izin kamera belum aktif. Pastikan browser diizinkan mengakses kamera belakang/depan.'
              );
            }
          }
        }
      };

      const timer = setTimeout(() => {
        startScanner();
      }, 150);

      return () => {
        clearTimeout(timer);
        isMounted = false;
        if (html5QrcodeRef.current) {
          try {
            if (html5QrcodeRef.current.isScanning) {
              html5QrcodeRef.current.stop();
            }
          } catch (e) {}
        }
      };
    }
  }, [activeTab, selectedCameraId, facingMode]);

  const handleOpenSimulatedLink = (e) => {
    e.preventDefault();
    if (!simulatedLinkInput.trim()) return;
    const searchCode = simulatedLinkInput.trim().toLowerCase();
    const found = (quizzes || []).find(q => q.linkCode.toLowerCase() === searchCode);
    if (found) {
      setActivePlayingQuiz(found);
      setSimulatedLinkInput('');
    } else {
      showToast(`Link Quiz "${simulatedLinkInput}" tidak ditemukan! Coba masukkan "PRETEST-WEB-2026" atau "POSTTEST-REST-2026"`);
    }
  };

  const handleQuizSubmitted = (newSub) => {
    if (setQuizSubmissions) {
      setQuizSubmissions((prev) => [newSub, ...(prev || [])]);
    }
    showToast(`Quiz "${activePlayingQuiz?.title}" Berhasil Dikerjakan & Terkunci!`);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(user.qrToken || 'ABSEN-PESERTA-DEMO');
    setCopied(true);
    showToast('Token QR berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Unduh QR Code sebagai file gambar PNG
  const handleDownloadQR = () => {
    setDownloading(true);
    try {
      const svg = document.getElementById('peserta-qr-svg');
      if (!svg) {
        showToast('Gagal menemukan QR Code untuk diunduh.');
        setDownloading(false);
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = 500;
        canvas.height = 500;
        
        // White Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR
        ctx.drawImage(img, 50, 50, 400, 400);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR_Absensi_${(user.name || 'Peserta').replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setDownloading(false);
        showToast('Gambar QR Code berhasil diunduh!');
      };

      img.onerror = () => {
        setDownloading(false);
        showToast('Gagal memproses unduhan gambar QR.');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.error('Download QR Error', e);
      setDownloading(false);
      showToast('Terjadi kesalahan saat mengunduh QR Code.');
    }
  };

  const handleSendHelpdesk = (e) => {
    e.preventDefault();
    if (!incidentMsg.trim()) return;

    const newTicket = {
      id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
      issue: incidentMsg.trim(),
      status: 'Proses Panitia',
      response: 'Laporan Anda telah diteruskan ke panitia helpdesk di lokasi.',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    };

    setSubmittedIncidents([newTicket, ...submittedIncidents]);
    setIncidentMsg('');
    showToast('Laporan kendala berhasil dikirim ke Panitia!');
  };

  const handleContactWA = () => {
    const waNumber = siteSettings?.whatsappNumber || '62887437525303';
    const cleanNumber = waNumber.replace(/[^0-9]/g, '');
    const text = `Halo Panitia PresenTrain 👋\n\nSaya ingin menanyakan bantuan / kendala presensi pelatihan:\n• *Nama Lengkap*: ${user.name}\n• *Email*: ${user.email}\n• *Instansi*: ${user.instansi || 'Peserta Training'}\n• *Token QR*: ${user.qrToken || 'ABSEN-PESERTA'}\n• *Event*: ${training?.title || 'Pelatihan PresenTrain'}\n\nMohon bantuannya ya Kak, terima kasih! 🙏`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Guard if user is null or undefined
  if (!user) {
    return (
      <div className="p-8 text-center text-slate-500 font-sans">
        <p className="text-sm font-semibold">Memuat data peserta...</p>
      </div>
    );
  }

  // ==========================================
  // FULL PAGE SUBVIEWS FOR PROFILE, SETTINGS, GUIDE
  // ==========================================
  if (activeTab === 'profile') {
    return (
      <ProfileView
        user={user}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  if (activeTab === 'settings') {
    return (
      <SettingsView
        siteSettings={siteSettings}
        user={user}
        onUpdateUser={onUpdateUser}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  if (activeTab === 'guide') {
    return (
      <GuideView
        user={user}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  // ==========================================
  // TAB: LIVE FULL-SCREEN CAMERA SCANNER PRESENSI PESERTA (`scan_presensi`)
  // MATCHING USER'S IMAGE 2 EXACTLY WITH REAR & FRONT CAMERA SUPPORT
  // ==========================================
  if (activeTab === 'scan_presensi') {
    const activeCamObj = cameras.find(c => c.id === selectedCameraId);
    const currentCamLabel = activeCamObj?.label 
      ? activeCamObj.label 
      : (facingMode === 'environment' ? '📷 Kamera Belakang (Utama)' : '🤳 Kamera Depan (Selfie)');
    const currentSession = training?.sessions?.[0] || { title: 'Sesi Presensi Utama Materi Pelatihan' };

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden h-screen w-screen font-sans selection:bg-emerald-500 selection:text-white">
        
        {/* Background Live Camera Feed */}
        <div className="absolute inset-0 w-full h-full object-cover z-0 bg-slate-950 flex items-center justify-center overflow-hidden">
          <div 
            id="peserta-camera-feed-box" 
            className={`w-full h-full ${isMirrored ? 'is-mirrored' : 'no-mirror'} ${isFitCover ? 'is-cover' : ''}`} 
          />
        </div>

        {/* Viewfinder Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/80 pointer-events-none z-0" />

        {/* Camera Loading Overlay */}
        {isCameraLoading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-3 pointer-events-none animate-fade-in">
            <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
            <div className="text-center">
              <p className="text-sm font-bold text-white tracking-wide">Menghubungkan Kamera...</p>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                {facingMode === 'environment' ? 'Mode Kamera Belakang (Utama)' : 'Mode Kamera Depan (Selfie)'}
              </p>
            </div>
          </div>
        )}

        {/* Native 1:1 Square QR Scanner Box Viewfinder Overlay */}
        {!cameraError && (
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center p-4">
            
            {/* Centered 1:1 Square Box */}
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
            <div className="bg-slate-900/85 backdrop-blur-xl text-slate-200 text-center px-5 py-2.5 rounded-full border border-slate-700/80 text-xs font-medium shadow-2xl mt-6 flex items-center space-x-2 pointer-events-auto">
              <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Arahkan kamera ke QR Code Presensi di layar depan</span>
            </div>
          </div>
        )}

        {/* Camera Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center z-30 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-2xl">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Kamera Belum Terhubung</h4>
            <p className="text-xs text-slate-300 max-w-md leading-relaxed">{cameraError}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-2 cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4" />
                <span>Coba Ganti Kamera Lain</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFacingMode('environment');
                  setSelectedCameraId('');
                  setCameraError(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-600 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Kamera Belakang</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Top Control Bar (Matching Administrator Scanner & Mobile Friendly) */}
        <div className="relative z-20 bg-slate-950/85 backdrop-blur-2xl border-b border-slate-800/70 p-3 md:p-4 flex items-center justify-between shadow-xl gap-2">
          
          {/* Left: Back Button & Session Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden">
            <button
              onClick={() => setActiveTab('overview')}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>

            <div className="overflow-hidden">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  LIVE SCANNER
                </span>
              </div>
              <h2 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[130px] sm:max-w-[260px] md:max-w-[380px]">
                {currentSession.title}
              </h2>
            </div>
          </div>

          {/* Right Action Toolbar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            
            {/* Quick Facing Mode Switcher Pill (Belakang / Depan) */}
            <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => handleSetCameraFacing('environment')}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                  facingMode === 'environment' && !selectedCameraId
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Gunakan Kamera Belakang"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Belakang</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetCameraFacing('user')}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                  facingMode === 'user' && !selectedCameraId
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Gunakan Kamera Depan"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Depan</span>
              </button>
            </div>

            {/* Torch / Flashlight Toggle (For Rear Camera) */}
            {hasTorch && (
              <button
                onClick={handleToggleTorch}
                className={`p-2 sm:p-2.5 rounded-2xl backdrop-blur-md border shadow-md transition-all active:scale-95 cursor-pointer ${
                  isTorchOn 
                    ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-amber-500/20' 
                    : 'bg-slate-900/90 text-slate-400 border-slate-700/80 hover:text-white'
                }`}
                title={isTorchOn ? "Matikan Flashlight / Senter" : "Nyalakan Flashlight / Senter"}
              >
                {isTorchOn ? <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Sound Feedback Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 sm:p-2.5 rounded-2xl backdrop-blur-md border shadow-md transition-all active:scale-95 cursor-pointer ${
                soundEnabled 
                  ? 'bg-slate-900/90 text-emerald-400 border-slate-700/80' 
                  : 'bg-slate-900/90 text-slate-500 border-slate-700/80'
              }`}
              title={soundEnabled ? "Matikan Suara Beep" : "Nyalakan Suara Beep"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Mirror Toggle Button */}
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className={`p-2 sm:p-2.5 rounded-2xl backdrop-blur-md border shadow-md transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer ${
                isMirrored 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                  : 'bg-slate-900/90 text-slate-400 hover:text-emerald-400 border-slate-700/80'
              }`}
              title={isMirrored ? "Matikan Mode Cermin" : "Aktifkan Mode Cermin"}
            >
              <FlipHorizontal className="w-4 h-4" />
              <span className="hidden lg:inline text-xs font-medium">
                {isMirrored ? "Cermin" : "Asli"}
              </span>
            </button>

            {/* Camera Fit / Fullscreen Toggle Button */}
            <button
              onClick={() => setIsFitCover(!isFitCover)}
              className={`p-2 sm:p-2.5 rounded-2xl backdrop-blur-md border shadow-md transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer ${
                isFitCover 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-700/80'
              }`}
              title={isFitCover ? "Tampilan Jauh Standar" : "Ubah ke Layar Penuh"}
            >
              {isFitCover ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Camera Switch Button */}
            <button
              onClick={handleSwitchCamera}
              className="p-2 sm:p-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl border border-slate-700/80 shadow-md active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
              title={`Ganti Kamera (Sekarang: ${facingMode === 'environment' ? 'Belakang' : 'Depan'})`}
            >
              <SwitchCamera className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline text-xs font-medium">Ganti Kamera</span>
            </button>

            {/* Device Selector Dropdown */}
            {cameras.length > 0 && (
              <div className="hidden lg:block">
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleSelectCameraDevice(e.target.value)}
                  className="px-3 py-2 bg-slate-900/90 text-slate-200 border border-slate-700/80 rounded-2xl text-xs font-medium outline-none cursor-pointer hover:border-slate-600 transition-colors max-w-[180px] truncate"
                >
                  <option value="" className="bg-slate-900 text-slate-300">
                    {facingMode === 'environment' ? '📷 Otomatis Belakang' : '🤳 Otomatis Depan'}
                  </option>
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

        {/* Scan Result Celebration Modal Overlay */}
        {pesertaScanResult && (
          <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border-2 border-emerald-500 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 stroke-[2.5]" />
              </div>
              
              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs uppercase border border-emerald-300">
                  PEMINDAIAN BERHASIL • HADIR
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{pesertaScanResult.sessionTitle}</h3>
                <p className="text-xs text-slate-500 mt-1">Waktu Presensi: <strong className="text-emerald-700 font-mono text-sm">{pesertaScanResult.time}</strong></p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1 text-left">
                <div>Pemateri: <strong>{pesertaScanResult.speaker || 'Tim Panitia'}</strong></div>
                <div>Ruangan: <strong>{pesertaScanResult.room || 'Lab Training'}</strong></div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => {
                    setPesertaScanResult(null);
                    setActiveTab('my_attendances');
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lihat Rekap Kehadiran</span>
                </button>
                <button
                  onClick={() => setPesertaScanResult(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Lanjut Scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Dock Control Area (Matching Image 2 Administrator Scanner) */}
        <div className="relative z-20 p-4 md:p-6 flex flex-col items-center justify-end space-y-3 pointer-events-none">
          
          {/* Collapsible Simulation / Test Panel */}
          {showTestPanel && (
            <div className="pointer-events-auto max-w-lg w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 p-4 sm:p-5 rounded-3xl shadow-2xl space-y-3.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
              
              {/* Panel Header */}
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2 font-semibold text-slate-200">
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span>Panel Simulasi & Uji Coba Presensi</span>
                </div>
                <button
                  onClick={() => setShowTestPanel(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Sembunyikan Panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Test Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleProcessScanCode(currentSession.id)}
                  className="py-2.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-semibold flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Uji Scan Berhasil</span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast('Gagal memindai: Barcode QR tidak sesuai atau sudah tidak berlaku.')}
                  className="py-2.5 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-2xl text-xs font-semibold flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Uji Scan Gagal</span>
                </button>
              </div>

              {/* Second Row: Status "Sudah Absen" & Manual Token Input */}
              <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => showToast('Peserta ini telah tercatat HADIR sebelumnya pada sesi ini.')}
                  className="py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Status "Sudah Absen"</span>
                </button>
                
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (pesertaScanInput) {
                      handleProcessScanCode(pesertaScanInput);
                      setPesertaScanInput('');
                    }
                  }}
                  className="flex-1 flex items-center bg-slate-950/80 border border-slate-700/80 rounded-2xl p-1 focus-within:border-emerald-500 transition-colors"
                >
                  <input
                    type="text"
                    placeholder="Token QR manual..."
                    value={pesertaScanInput}
                    onChange={(e) => setPesertaScanInput(e.target.value)}
                    className="w-full px-3 py-1 text-white text-xs bg-transparent outline-none placeholder:text-slate-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    Scan
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* Clean Bottom Navigation Toolbar */}
          <div className="pointer-events-auto max-w-lg w-full flex items-center justify-between text-xs bg-slate-950/80 backdrop-blur-2xl border border-slate-800/80 px-4 py-2.5 rounded-2xl shadow-xl gap-2">
            
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="flex items-center space-x-2 text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/80 transition-colors cursor-pointer shrink overflow-hidden"
              title="Ganti antara Kamera Belakang dan Depan"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] truncate font-medium">
                {facingMode === 'environment' ? '📷 Kamera Belakang' : '🤳 Kamera Depan'}
              </span>
            </button>

            <div className="flex items-center space-x-2 shrink-0">
              {!showTestPanel && (
                <button
                  type="button"
                  onClick={() => setShowTestPanel(true)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700/80 rounded-xl font-medium text-[11px] flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Simulasi</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold rounded-xl text-xs transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // ==========================================
  // TAB 2: JADWAL SESI TRAINING (`schedule`)
  // ==========================================
  if (activeTab === 'schedule') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto font-sans">
        
        {/* Banner Event */}
        <div className="light-card-emerald rounded-3xl p-6 md:p-8 text-slate-900 relative overflow-hidden backdrop-blur-xl border border-emerald-300/40 shadow-xl">
          <span className="text-[10px] font-extrabold glass-badge-emerald border border-emerald-300/40 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
            JADWAL RESMI PELATIHAN
          </span>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mt-2">{training?.title}</h2>
          <p className="text-xs text-slate-600 mt-1 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>{training?.dateRange} • {training?.location}</span>
          </p>
        </div>

        {/* Sessions Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daftar Sesi Materi Training ({sessions.length} Sesi)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((ses, idx) => (
              <div key={ses.id} className="light-card rounded-3xl p-5 space-y-3.5 border border-slate-200/80">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                      Sesi {idx + 1}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 mt-2">{ses.title}</h4>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    ses.status === 'Berlangsung' ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ses.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{ses.time} ({ses.date || 'Hari Ini'})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ruangan: <strong>{ses.room}</strong></span>
                  </div>
                </div>

                {ses.desc && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 italic">
                    {ses.desc}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // SUBVIEW: QUIZZES (`quizzes`)
  if (activeTab === 'quizzes') {
    const userSubs = (quizSubmissions || []).filter(s => s.participantId === user.id);

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto font-sans">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Banner */}
        <div className="light-card-emerald rounded-3xl p-6 md:p-8 text-slate-900 space-y-2">
          <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-200/80 px-2.5 py-0.5 rounded-full">
            EVALUASI HASIL BELAJAR PESERTA
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Quiz Pre-Test & Post-Test Pelatihan</h2>
          <p className="text-xs text-slate-600">
            Kerjakan kuis evaluasi untuk mengukur peningkatan pemahaman materi pelatihan Anda. Nilai yang telah di-submit bersifat terkunci secara otomatis.
          </p>
        </div>

        {/* Box Simulasi Akses Link Quiz */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-slate-800 text-xs font-bold">
            <Link className="w-4 h-4 text-emerald-600" />
            <span>Simulasi Akses Tautan (Link) Quiz Unik</span>
          </div>
          <form onSubmit={handleOpenSimulatedLink} className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              placeholder="Masukkan kode link (contoh: PRETEST-WEB-2026 atau POSTTEST-REST-2026)..."
              value={simulatedLinkInput}
              onChange={(e) => setSimulatedLinkInput(e.target.value)}
              className="flex-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono font-medium outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 group"
            >
              <span>Buka Quiz</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>
        </div>

        {/* List Quizzes Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Daftar Quiz Pelatihan Tersedia
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(!quizzes || quizzes.length === 0) ? (
              <div className="col-span-2 p-8 text-center bg-white rounded-3xl border text-slate-400 text-xs">
                Belum ada kuis yang diterbitkan oleh panitia.
              </div>
            ) : (
              quizzes.map((qz) => {
                const sub = userSubs.find(s => s.quizId === qz.id);
                const isCompleted = !!sub;

                return (
                  <div key={qz.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 hover:border-emerald-300 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                          qz.type === 'pretest' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {qz.type === 'pretest' ? 'Pre-Test' : 'Post-Test'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{qz.title}</h3>
                      </div>

                      {isCompleted ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-300 shrink-0">
                          Selesai
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full border border-slate-300 shrink-0">
                          Belum Dikerjakan
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {qz.description}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Durasi: <strong>{qz.durationMinutes} Menit</strong></span>
                      <span className="text-slate-500 font-medium">Passing Grade: <strong className="text-emerald-700">{qz.passingGrade} Poin</strong></span>
                    </div>

                    {isCompleted ? (
                      <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Nilai Perolehan Anda</div>
                          <div className="text-2xl font-black text-emerald-700">{sub.score} <span className="text-xs text-slate-400 font-normal">/ 100</span></div>
                        </div>
                        <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Terkunci (Locked)</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActivePlayingQuiz(qz)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer group"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Mulai Kerjakan Quiz</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Player */}
        {activePlayingQuiz && (
          <QuizPlayerModal
            quiz={activePlayingQuiz}
            user={user}
            onClose={() => setActivePlayingQuiz(null)}
            onSubmitQuiz={handleQuizSubmitted}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // TAB 3: PRESENSI & REKAP KEHADIRAN (`my_attendances`)
  // ==========================================
  if (activeTab === 'my_attendances') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto font-sans">
        
        {/* Progress Header */}
        <div className="light-card-emerald rounded-3xl p-6 md:p-8 text-slate-900 relative overflow-hidden space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-200/70 px-3 py-1 rounded-full uppercase tracking-wider">
              REKAP PRESENSI SAYA
            </span>
            <span className="text-xs font-semibold bg-emerald-600 text-white px-3.5 py-1 rounded-full shadow-xs">
              {progressPercent}% Selesai
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
            {attendedCount} dari {totalCount} Sesi Dihadiri
          </h2>

          <div className="w-full h-3 bg-white/80 rounded-full overflow-hidden p-0.5 border border-emerald-300">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-xs text-slate-600">
            Status presensi tercatat otomatis secara transparan saat QR Code di-scan oleh Panitia.
          </p>
        </div>

        {/* Attendance List */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Kehadiran per Sesi</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((ses, idx) => {
              const att = userAttendances[ses.id];
              const isPresent = att?.present;

              return (
                <div key={ses.id} className={`light-card rounded-3xl p-5 space-y-3 ${isPresent ? 'border-l-4 border-l-emerald-500' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                        Sesi {idx + 1}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-900 mt-2">{ses.title}</h4>
                    </div>
                    {isPresent ? (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold px-3 py-1 rounded-full flex items-center space-x-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Hadir</span>
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-xs font-medium px-3 py-1 rounded-full shrink-0">
                        Belum Absen
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ses.time} ({ses.date || 'Hari Ini'})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ses.room} • Pemateri: {ses.speaker}</span>
                    </div>
                  </div>

                  {isPresent && (
                    <div className="bg-emerald-50 rounded-2xl p-2.5 text-xs text-emerald-900 flex items-center justify-between font-medium border border-emerald-200/80">
                      <span>Waktu Scan Verifikasi:</span>
                      <span className="font-semibold font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">{att.time}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // TAB 4: HELPDESK & PUSAT BANTUAN (`helpdesk`)
  // ==========================================
  if (activeTab === 'helpdesk') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto font-sans">
        
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Header Helpdesk */}
        <div className="light-card rounded-3xl p-6 space-y-2 border-l-4 border-l-emerald-600">
          <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full inline-block">
            PUSAT BANTUAN & KENDALA
          </span>
          <h2 className="text-xl font-semibold text-slate-900">Bantuan Lapangan & Lapor Kendala Presensi</h2>
          <p className="text-xs text-slate-500">Kirim laporan kendala presensi Anda atau kontak Panitia via WhatsApp langsung.</p>
        </div>

        {/* Quick Contact WA Card */}
        <div className="light-card-emerald rounded-3xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900">Bantuan Cepat via WhatsApp</h4>
            </div>
          </div>
          <button
            onClick={handleContactWA}
            className="px-4 py-2.5 btn-emerald text-xs font-semibold rounded-2xl shadow-md flex items-center space-x-1.5 shrink-0 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Chat WA Panitia</span>
          </button>
        </div>

        {/* Form Lapor Kendala */}
        <div className="light-card rounded-3xl p-6 space-y-4 border border-slate-200">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Kirim Tiket Kendala Baru</h3>

          <form onSubmit={handleSendHelpdesk} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rincian Masalah / Pertanyaan</label>
              <textarea
                rows={3}
                placeholder="Contoh: QR Code saya tidak bisa di-scan panitia di Sesi 2..."
                value={incidentMsg}
                onChange={(e) => setIncidentMsg(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 text-xs"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 btn-emerald font-semibold text-xs rounded-2xl shadow-md flex items-center space-x-1.5 active:scale-95"
              >
                <LifeBuoy className="w-4 h-4" />
                <span>Kirimkan ke Panitia</span>
              </button>
            </div>
          </form>
        </div>

        {/* Submissions History */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Riwayat Laporan Saya ({submittedIncidents.length})</h3>

          <div className="space-y-3">
            {submittedIncidents.map((tkt) => (
              <div key={tkt.id} className="light-card rounded-3xl p-4 space-y-2 border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-900">{tkt.id} • {tkt.time}</span>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    ✓ {tkt.status}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium">{tkt.issue}</p>
                {tkt.response && (
                  <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-emerald-800 border border-slate-200/80">
                    <strong>Respon Panitia:</strong> {tkt.response}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // TAB 1: PROFIL & QR CODE (`profile`)
  // ==========================================
  if (activeTab === 'profile') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Header Banner Profil & QR */}
        <div className="light-card-emerald rounded-3xl p-6 md:p-8 text-slate-900 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-200/70 border border-emerald-300 px-3 py-1 rounded-full uppercase tracking-wider">
              KARTU PRESENSI DIGITAL PESERTA
            </span>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mt-2">Profil & Barcode QR Resmi</h2>
            <p className="text-xs text-slate-600 mt-1">Tunjukkan barcode ini kepada panitia scanner di lokasi untuk mencatat kehadiran</p>
          </div>
        </div>

        {/* Main Grid: Left Profile Card, Right QR Code & Unduh Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Participant Profile Info (5/12 width) */}
          <div className="md:col-span-5 space-y-5">
            <div className="light-card rounded-3xl p-6 text-center space-y-4 border border-slate-200/80">
              <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-4xl font-semibold text-white shadow-xl shadow-emerald-600/20">
                {user?.name ? user.name.charAt(0) : 'P'}
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{user?.name || 'Peserta Pelatihan'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'peserta@presentrain.com'}</p>
              </div>
            </div>

            <div className="light-card rounded-3xl p-5 space-y-3 border border-slate-200/80">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Biodata Registrasi</h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-medium text-slate-400 uppercase">Asal Komisariat</p>
                    <p className="font-semibold text-slate-800 truncate">{user.instansi || 'HMI Komisariat ITERA'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">Nomor WhatsApp / HP</p>
                    <p className="font-semibold text-slate-800">{user.phone || '0857-1122-3344'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">Status Akun</p>
                    <p className="font-semibold text-emerald-700">Aktif & Terverifikasi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Digital QR Code & Download Action Card (7/12 width) */}
          <div className="md:col-span-7 light-card rounded-3xl p-6 text-center space-y-5 border-2 border-emerald-400/80 shadow-md">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-left">
                <QrCode className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Kartu Barcode QR Presensi</h3>
                  <p className="text-[10px] text-slate-500">Tunjukkan barcode ini pada panitia scanner di lokasi</p>
                </div>
              </div>

              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl">
                QR STATIS RESMI
              </span>
            </div>

            {/* SVG QR Container */}
            <div className="bg-slate-50 p-6 rounded-3xl inline-block border border-slate-200 shadow-inner">
              <QRCodeSVG
                id="peserta-qr-svg"
                value={user.qrToken || 'ABSEN-PESERTA-DEMO-881023'}
                size={220}
                level="H"
                includeMargin={true}
                className="mx-auto bg-white p-2.5 rounded-2xl shadow-sm"
              />
            </div>

            {/* Primary Action Buttons: UNDUH QR & ZOOM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleDownloadQR}
                disabled={downloading}
                className="py-3 px-4 btn-emerald text-xs font-semibold rounded-2xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Mengunduh...' : 'Unduh Gambar QR (PNG)'}</span>
              </button>

              <button
                onClick={onOpenFullQR}
                className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-2xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all"
              >
                <Maximize2 className="w-4 h-4 text-emerald-400" />
                <span>Zoom Layar Penuh</span>
              </button>
            </div>

            {/* Copy Token Bar */}
            <div className="bg-slate-100 rounded-2xl p-3 flex items-center justify-between">
              <div className="text-left truncate pr-2">
                <p className="text-[9px] font-medium text-slate-400 uppercase">Token QR Statis Anda</p>
                <p className="font-mono text-xs font-semibold text-emerald-800 truncate">
                  {user.qrToken || 'ABSEN-PESERTA-DEMO-881023'}
                </p>
              </div>
              <button
                onClick={handleCopyToken}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 text-xs flex items-center space-x-1 shadow-xs shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-semibold">{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // TAB 0: BERANDA / OVERVIEW PESERTA (Default Landing View)
  // ==========================================
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
      
      {notification && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
          <span>{notification}</span>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        </div>
      )}

      {/* ================= APP BERANDA HERO WELCOME CARD ================= */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 md:p-5 relative overflow-hidden shadow-xl shadow-emerald-950/10 border border-emerald-600/30">
        
        {/* Subtle Ambient Background Orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between min-h-[90px] sm:min-h-[110px] md:min-h-[125px]">
          {/* Header Text */}
          <div className="pr-24 sm:pr-40 md:pr-52">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-emerald-200 uppercase tracking-widest">
                PORTAL PRESENSI PESERTA
              </span>
            </div>
            <div className="mt-0.5 sm:mt-1 leading-tight">
              <p className="text-xs sm:text-base md:text-lg font-normal text-emerald-100 tracking-tight">
                Selamat Datang,
              </p>
              <h2 className="text-xs sm:text-base md:text-lg font-bold text-white tracking-tight mt-0.5">
                {user?.name || 'Peserta'}
              </h2>
            </div>
          </div>

          {/* Mini Ringkasan Dashboard - Proporsional & Rapat untuk Mobile, Luas untuk Desktop */}
          <div className="mt-1.5 sm:mt-2.5 max-w-[170px] xs:max-w-[195px] sm:max-w-[320px] md:max-w-[370px]">
            <div className="grid grid-cols-3 divide-x divide-white/20">
              
              {/* Stat 1: Kehadiran Saya */}
              <div className="flex flex-col items-center justify-center px-0.5 xs:px-1 sm:px-2 text-center">
                <div className="relative w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="19" className="stroke-white/20" strokeWidth="4.2" fill="transparent" />
                    <circle
                      cx="24"
                      cy="24"
                      r="19"
                      className="stroke-emerald-300 transition-all duration-1000 ease-out"
                      strokeWidth="4.2"
                      strokeDasharray={2 * Math.PI * 19}
                      strokeDashoffset={(2 * Math.PI * 19) * (1 - (progressPercent / 100))}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-white tracking-tight">
                      {progressPercent}<span className="text-[4.5px] sm:text-[6.5px] md:text-[7.5px] font-semibold text-emerald-200">%</span>
                    </span>
                  </div>
                </div>
                <span className="text-[6px] xs:text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                  Kehadiran Saya
                </span>
              </div>

              {/* Stat 2: Sesi Dihadiri */}
              <div className="flex flex-col items-center justify-center px-0.5 xs:px-1 sm:px-2 text-center">
                <div className="relative w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="19" className="stroke-white/20" strokeWidth="4.2" fill="transparent" />
                    <circle
                      cx="24"
                      cy="24"
                      r="19"
                      className="stroke-emerald-300 transition-all duration-1000 ease-out"
                      strokeWidth="4.2"
                      strokeDasharray={2 * Math.PI * 19}
                      strokeDashoffset={(2 * Math.PI * 19) * (1 - (attendedCount / (totalCount || 1)))}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-white tracking-tight">
                      0{attendedCount}
                    </span>
                  </div>
                </div>
                <span className="text-[6px] xs:text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                  Sesi Dihadiri
                </span>
              </div>

              {/* Stat 3: Sesi Berlangsung */}
              <div className="flex flex-col items-center justify-center px-0.5 xs:px-1 sm:px-2 text-center">
                <div className="relative w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="19" className="stroke-white/20" strokeWidth="4.2" fill="transparent" />
                    <circle
                      cx="24"
                      cy="24"
                      r="19"
                      className="stroke-emerald-300 transition-all duration-1000 ease-out"
                      strokeWidth="4.2"
                      strokeDasharray={2 * Math.PI * 19}
                      strokeDashoffset={(2 * Math.PI * 19) * (1 - 0.50)}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-white tracking-tight">
                      02
                    </span>
                  </div>
                </div>
                <span className="text-[6px] xs:text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                  Sesi Berlangsung
                </span>
              </div>

            </div>
          </div>

          {/* 3D Welcome Chibi Characters - Compact & Responsive */}
          <div className="absolute bottom-0 right-0 sm:right-2 md:right-4 h-[95%] sm:h-[102%] md:h-[108%] max-h-[90px] sm:max-h-[125px] md:max-h-[145px] flex items-end justify-end pointer-events-none z-10">
            <img 
              src="/welcome_3d_icon.png" 
              alt="Selamat Datang 3D" 
              className="h-full w-auto object-contain object-bottom drop-shadow-lg select-none"
              style={{
                maskImage: 'linear-gradient(to bottom, black 84%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 84%, transparent 100%)'
              }}
            />
          </div>
        </div>
      </div>

      {/* ================= IMAGE SLIDER BANNER (SLIDE BANNER DENGAN ASPEK RASIO 200:87.503) ================= */}
      <BannerSlider />

      {/* ================= 2. QUICK MENU GRID CARD (STYLE GLASSMORPHISM) ================= */}
      <div className="glass-panel-light rounded-3xl border border-white/70 shadow-lg overflow-hidden">
        <div className="grid grid-cols-3">
          
          {/* Item 1: Scan Presensi */}
          <button
            onClick={() => setActiveTab && setActiveTab('scan_presensi')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <QrCode className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
              Scan Presensi
            </span>
          </button>

          {/* Item 2: Jadwal Sesi */}
          <button
            onClick={() => setActiveTab && setActiveTab('schedule')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
              Jadwal Sesi
            </span>
          </button>

          {/* Item 3: Rekap Saya */}
          <button
            onClick={() => setActiveTab && setActiveTab('my_attendances')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-b border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <div className="flex items-center justify-center space-x-1">
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Rekap Saya
              </span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            </div>
          </button>

          {/* Item 4: Quick Quiz & Test */}
          <button
            onClick={() => setActiveTab && setActiveTab('quizzes')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
              Quiz & Test
            </span>
          </button>

          {/* Item 5: Profil Saya */}
          <button
            onClick={() => setActiveTab && setActiveTab('profile')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <User className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
              Profil & QR
            </span>
          </button>

          {/* Item 6: Pusat Bantuan */}
          <button
            onClick={() => setActiveTab && setActiveTab('helpdesk')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <LifeBuoy className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
              Pusat Bantuan
            </span>
          </button>

        </div>
      </div>

      {/* ================= APP INFORMASI KEGIATAN YANG DIIKUTI ================= */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informasi Kegiatan & Pelatihan yang Diikuti</h3>

        <div className="light-card rounded-3xl p-6 md:p-8 space-y-6 border border-slate-200/80 bg-white shadow-xs">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
                PROGRAM PELATIHAN AKTIF
              </span>
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mt-2">
                {training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung 2026'}
              </h3>
              <div className="flex items-start space-x-2 text-xs sm:text-sm text-slate-500 mt-2.5 font-medium">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex flex-col leading-tight space-y-0.5">
                  <span className="text-slate-600 font-semibold">
                    {training?.dateRange || '20/10/2026 - 22/10/2026'}
                  </span>
                  <span className="text-slate-500 font-normal">
                    • {training?.location || 'Sekretariat HMI Cabang Bandar Lampung'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab && setActiveTab('schedule')}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl shadow-xs shrink-0 self-start md:self-center flex items-center space-x-2 cursor-pointer group transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Lihat Jadwal Lengkap Sesi</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Lokasi Pelatihan</span>
              <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{training?.location || 'Auditorium Utama Lt. 3'}</span>
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Progres Kehadiran Diri</span>
              <p className="font-bold text-emerald-700 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{attendedCount} dari {totalCount} Sesi Dihadiri</span>
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status Barcode Presensi</span>
              <p className="font-mono font-bold text-slate-900 flex items-center space-x-1.5">
                <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{user.qrToken || 'ABSEN-PESERTA-DEMO'}</span>
              </p>
            </div>

          </div>

          {/* Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Progres Sesi Pelatihan Terverifikasi</span>
              <span className="text-emerald-700 font-extrabold">{progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
