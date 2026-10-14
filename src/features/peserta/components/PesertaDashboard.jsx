import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  QrCode, Maximize2, Minimize2, CheckCircle2, Clock, MapPin, Calendar, 
  Sparkles, Building, Phone, Copy, Check, Download, LifeBuoy, 
  Send, AlertCircle, AlertTriangle, XCircle, MessageSquare, ShieldCheck, User, HelpCircle, FileText, Lock, PlayCircle, Link, ChevronRight,
  Camera, Volume2, VolumeX, X, ArrowLeft, FlipHorizontal, Ban, SwitchCamera, RefreshCw,
  BarChart3, FolderUp, ExternalLink
} from 'lucide-react';

import { api } from '@/services/api';
import { offlineSync } from '@/services/offlineSync';

import QuizPlayerModal from './QuizPlayerModal';
import { isSubmissionForQuiz, isSubmissionForParticipant } from '@/features/administrator/components/QuizResultsView';
import ProfileView from '@/components/views/ProfileView';
import SettingsView from '@/components/views/SettingsView';
import BannerSlider from '@/components/views/BannerSlider';
import HelpdeskView from '@/components/views/HelpdeskView';
import GuideView from '@/components/views/GuideView';
import { useFeedback } from '@/context/FeedbackContext';
import { useSmartPolling } from '@/hooks/useSmartPolling';
import QueueStatusModal from '@/components/common/QueueStatusModal';
import { getDynamicSessionStatus } from '@/utils/sessionStatus';
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatLongDateIndonesian(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 'Hari Ini';
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[2];
    if (!isNaN(day) && !isNaN(monthIdx) && monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${MONTH_NAMES_ID[monthIdx]} ${year}`;
    }
  }
  return dateStr;
}

export default function PesertaDashboard({ 
  user, 
  onUpdateUser,
  participants,
  setParticipants,
  refreshParticipants,
  training, 
  refreshTraining,
  activeTab, 
  setActiveTab, 
  onOpenFullQR, 
  siteSettings,
  quizzes,
  refreshQuizzes,
  quizSubmissions,
  setQuizSubmissions,
  refreshQuizSubmissions,
  urlQuizCode,
  tickets,
  setTickets,
  refreshTickets
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { showNotification, closeNotification } = useFeedback();

  // Bersihkan notifikasi saat berpindah tab menu agar tidak bocor ke menu lain
  useEffect(() => {
    if (typeof closeNotification === 'function') {
      closeNotification();
    }
  }, [activeTab, closeNotification]);

  // Quiz States
  const [activePlayingQuiz, setActivePlayingQuiz] = useState(null);
  const [simulatedLinkInput, setSimulatedLinkInput] = useState('');

  useEffect(() => {
    if (urlQuizCode) {
      const found = (quizzes || []).find(q => q.linkCode?.toLowerCase() === urlQuizCode?.toLowerCase());
      if (found) {
        if (found.access_status === 'tutup' || found.is_open === false) {
          showToast(`Kuis "${found.title}" saat ini DITUTUP oleh Administrator untuk kelas Anda.`, 'warning');
        } else {
          setActivePlayingQuiz(found);
        }
      }
    } else if (!activePlayingQuiz && quizzes && quizzes.length > 0) {
      const savedQuizId = sessionStorage.getItem('active_playing_quiz_id');
      if (savedQuizId) {
        const found = quizzes.find(q => 
          String(q.id) === String(savedQuizId) || 
          String(q.db_id) === String(savedQuizId) || 
          String(q.quiz_code) === String(savedQuizId)
        );
        if (found) {
          if (found.access_status === 'tutup' || found.is_open === false) {
            sessionStorage.removeItem('active_playing_quiz_id');
          } else {
            const userSub = (quizSubmissions || []).find(s => isSubmissionForQuiz(s, found) && isSubmissionForParticipant(s, user));
            if (!userSub) {
              setActivePlayingQuiz(found);
            } else {
              sessionStorage.removeItem('active_playing_quiz_id');
            }
          }
        }
      }
    }
  }, [urlQuizCode, quizzes, quizSubmissions, activePlayingQuiz, user]);

  // Helpdesk Form States
  const [incidentMsg, setIncidentMsg] = useState('');
  const [submittedIncidents, setSubmittedIncidents] = useState([]);

  
  useEffect(() => {
    const fetchApiData = async () => {
      try {
        const [tRes] = await Promise.all([
          api.getTickets()
        ]);
        if (tRes && tRes.ok && typeof setTickets === 'function') setTickets(tRes.data);
      } catch (err) {
        console.error('Error fetching API data', err);
      }
    };
    fetchApiData();
  }, []);

  const showToast = (msg, type = 'success') => {
    showNotification(msg, type);
  };

  // Helper to format date DD/MM/YYYY or YYYY-MM-DD to Indonesian format (e.g. 10 Oktober 2026)
  const formatDateIndonesian = (dateStr) => {
    if (!dateStr) return '10 Oktober 2026';
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    let d, m, y;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        y = parts[2];
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        y = parts[0];
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      }
    }
    if (d && !isNaN(m) && monthNames[m] && y) {
      return `${d} ${monthNames[m]} ${y}`;
    }
    return dateStr;
  };

  const sessions = training?.sessions || [];
  
  const getInitialUserAttendances = () => {
    if (user?.attendances && Object.keys(user.attendances).length > 0) {
      return user.attendances;
    }
    const matched = (participants || []).find(p => p.email === user?.email || p.id === user?.id || (user?.db_id && p.db_id === user?.db_id) || p.qrToken === user?.qrToken);
    if (matched?.attendances && Object.keys(matched.attendances).length > 0) {
      return matched.attendances;
    }
    const defaultAtt = {};
    sessions.forEach((s) => {
      defaultAtt[s.id] = { present: false, time: null, note: null };
      if (s.db_id) {
        defaultAtt[s.db_id] = { present: false, time: null, note: null };
      }
    });
    return defaultAtt;
  };

  const [userAttendancesState, setUserAttendancesState] = useState(getInitialUserAttendances);

  // Sync with user prop and participants prop
  useEffect(() => {
    if (user?.attendances && Object.keys(user.attendances).length > 0) {
      setUserAttendancesState(user.attendances);
    } else {
      const matched = (participants || []).find(p => p.email === user?.email || p.id === user?.id || (user?.db_id && p.db_id === user?.db_id) || p.qrToken === user?.qrToken);
      if (matched?.attendances && Object.keys(matched.attendances).length > 0) {
        setUserAttendancesState(matched.attendances);
      }
    }
  }, [user?.attendances, user?.email, user?.id, participants]);

  // Status sinkronisasi presensi peserta
  const [isSyncingAttendances, setIsSyncingAttendances] = useState(false);

  const fetchLatestAttendances = async (isManual = false) => {
    const userIdOrToken = user?.db_id || user?.id || user?.user_qr_token || user?.qrToken;
    if (!userIdOrToken && !user?.email) return;
    setIsSyncingAttendances(true);
    try {
      const res = await api.getUserAttendances(userIdOrToken);
      if (res && res.ok && res.attendances && Object.keys(res.attendances).length > 0) {
        setUserAttendancesState(prev => ({
          ...prev,
          ...res.attendances
        }));
      }
      if (isManual) {
        showToast('Data presensi berhasil disinkronkan dengan server.');
      }
    } catch (err) {
      console.warn('Failed to fetch participant attendances from API:', err);
    } finally {
      setIsSyncingAttendances(false);
    }
  };

  // ON-DEMAND AUTO SYNC: Saat peserta membuka tab Riwayat Presensi
  useEffect(() => {
    if (activeTab === 'my_attendances') {
      fetchLatestAttendances();
      if (typeof refreshTraining === 'function') refreshTraining();
    }
  }, [activeTab, user?.id, user?.db_id, user?.email]);

  // ON-DEMAND AUTO SYNC: Saat peserta membuka tab Jadwal Sesi
  useEffect(() => {
    if (activeTab === 'schedule') {
      if (typeof refreshTraining === 'function') refreshTraining();
    }
  }, [activeTab]);

  // ON-DEMAND AUTO SYNC: Saat peserta membuka tab Kuis
  useEffect(() => {
    if (activeTab === 'quizzes') {
      if (typeof refreshQuizzes === 'function') refreshQuizzes();
      if (typeof refreshQuizSubmissions === 'function') refreshQuizSubmissions();
    }
  }, [activeTab]);

  const userAttendances = userAttendancesState || {};
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const rawAttendedCount = safeSessions.filter(s => {
    if (!s) return false;
    const att = userAttendances[s.id] || 
      (s.db_id && userAttendances[s.db_id]) || 
      (s.session_code && userAttendances[s.session_code]) ||
      (typeof s.id === 'string' && userAttendances[s.id.replace(/\D/g, '')]) ||
      (s.db_id && userAttendances[`SES-${s.db_id}`]) ||
      (s.db_id && userAttendances[`SES-${String(s.db_id).padStart(2, '0')}`]);
    const rawStatus = (att?.raw_status || att?.status || '').toLowerCase();
    return att?.present === true || rawStatus === 'present' || rawStatus === 'hadir';
  }).length;
  const attendedCount = isNaN(rawAttendedCount) ? 0 : rawAttendedCount;
  const totalCount = safeSessions.length || 0;
  const rawProgressPercent = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;
  const progressPercent = isNaN(rawProgressPercent) || !isFinite(rawProgressPercent) ? 0 : rawProgressPercent;

  // Peserta Scanner States & Logic
  const [pesertaScanInput, setPesertaScanInput] = useState('');
  const [pesertaScanResult, setPesertaScanResult] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // Default: 'environment' (Kamera Belakang)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isFitCover, setIsFitCover] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraReloadKey, setCameraReloadKey] = useState(0);
  const isProcessingScanRef = useRef(false);
  const html5QrcodeRef = useRef(null);
  const audioContextRef = useRef(null);

  // Smart Polling Queue System for Peserta Attendance
  const {
    status: queueStatus,
    progressPercent: queueProgress,
    message: queueMessage,
    startPolling: startAttendancePolling,
    isLoading: isQueueLoading,
    isCompleted: isQueueCompleted,
    isFailed: isQueueFailed,
    reset: resetQueueModal,
  } = useSmartPolling({
    onSuccess: (result) => {
      fetchLatestAttendances();
      if (typeof refreshTraining === 'function') refreshTraining();
      playBeep('success');
      showToast(result?.message || 'Presensi Anda berhasil dicatat via antrean server!');
    },
    onError: (err) => {
      playBeep('error');
      showToast(err.message || 'Gagal memproses presensi dalam antrean.', 'error');
    }
  });

  // Discover available camera devices on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isMounted && devices && devices.length > 0) {
          setCameras(devices);
        }
      } catch (err) {
        console.warn('Initial camera enumeration error:', err);
      }
    };
    fetchCameras();
    return () => { isMounted = false; };
  }, []);

  // Switch between back (environment) and front (user) cameras cleanly
  const handleSwitchCamera = async () => {
    if (isCameraLoading) return;
    setIsCameraLoading(true);
    setCameraError(null);
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';

    // Stop active camera cleanly before starting new stream
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
    setCameraReloadKey(prev => prev + 1);
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

  const playBeep = (type = 'success') => {
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
      console.warn('Audio feedback error', e);
    }
  };

  const handleProcessScanCode = async (codeStr) => {
    if (!codeStr || !codeStr.trim()) return;
    if (isProcessingScanRef.current) return; // Kunci proses agar frame kamera beruntun tidak memicu duplicate scan
    isProcessingScanRef.current = true;
    const clean = codeStr.trim();
    const sessionsList = training?.sessions || [];
    
    // Find matching session by ID, title, or code
    if (!sessionsList || sessionsList.length === 0) {
      showToast('Belum ada Sesi Pelatihan aktif yang diterbitkan oleh panitia.');
      return;
    }

    let matchedSession = null;

    // 1. Check for explicit SES-(\d+) in token e.g. ABSEN-SESI-2-SES-02-EXP...
    const sesCodeMatch = clean.match(/SES-(\d+)/i);
    if (sesCodeMatch) {
      const sesNum = parseInt(sesCodeMatch[1], 10);
      const paddedCode = `SES-${String(sesNum).padStart(2, '0')}`;
      matchedSession = sessionsList.find(s => 
        s.id === paddedCode || 
        s.id === `SES-${sesNum}` || 
        s.session_code === paddedCode ||
        s.db_id === sesNum
      );
    }

    // 2. Check for ABSEN-SESI-(\d+) in token e.g. ABSEN-SESI-2-2-EXP...
    if (!matchedSession) {
      const absenSesiMatch = clean.match(/ABSEN-SESI-(\d+)/i);
      if (absenSesiMatch) {
        const sesIdx = parseInt(absenSesiMatch[1], 10);
        // Session index is 1-based (Sesi 1 = index 0, Sesi 2 = index 1)
        if (sesIdx >= 1 && sesIdx <= sessionsList.length) {
          matchedSession = sessionsList[sesIdx - 1];
        }
        if (!matchedSession) {
          const paddedCode = `SES-${String(sesIdx).padStart(2, '0')}`;
          matchedSession = sessionsList.find(s => 
            s.db_id === sesIdx || 
            s.id === paddedCode ||
            s.session_code === paddedCode
          );
        }
      }
    }

    // 3. Match session by title or exact code
    if (!matchedSession) {
      matchedSession = sessionsList.find(s => {
        const u = clean.toUpperCase();
        return (s.id && u === String(s.id).toUpperCase()) ||
               (s.session_code && u === String(s.session_code).toUpperCase()) ||
               (s.title && u === String(s.title).toUpperCase());
      });
    }

    if (!matchedSession) {
      playBeep('error');
      setPesertaScanResult({
        success: false,
        msg: 'Kode / Barcode tidak cocok dengan sesi pelatihan yang tersedia. Pastikan memindai Barcode Sesi resmi dari Panitia.'
      });
      setTimeout(() => {
        isProcessingScanRef.current = false;
      }, 2000);
      return;
    }

    const targetSessionId = matchedSession.db_id || matchedSession.id;

    // Call Backend API to verify barcode and time duration with Queue Async Support
    const res = await api.scanAttendance(clean, targetSessionId, user, { 
      source: 'peserta_scan',
      async: true 
    });

    // JIKA MASUK ANTREAN (HTTP 202 / status queued)
    if (res.status === 'queued' && res.ticket_id) {
      playBeep('action');
      startAttendancePolling(res.ticket_id);
      setPesertaScanInput('');
      isProcessingScanRef.current = false;
      return;
    }

    const backendSession = res.session;
    const finalSession = backendSession ? (sessionsList.find(s => s.db_id === backendSession.id || s.id === backendSession.session_code) || matchedSession) : matchedSession;

    if (res.status === 'warning') {
      playBeep('warning');
      setPesertaScanResult({
        success: true,
        already: true,
        sessionId: finalSession.id,
        sessionTitle: finalSession.title,
        speaker: finalSession.speaker,
        room: finalSession.room,
        time: res.scanned_at || 'Sebelumnya',
        msg: res.message || `Anda sudah tercatat hadir sebelumnya pada sesi ini.`
      });
      setPesertaScanInput('');
      return;
    }

    if (res.status === 'error' || (!res.ok && res.status !== 'warning')) {
      playBeep('error');
      setPesertaScanResult({
        success: false,
        msg: res.message || 'Verifikasi barcode gagal. Pastikan pencahayaan cukup dan memindai barcode sesi resmi.'
      });
      setTimeout(() => {
        isProcessingScanRef.current = false;
      }, 2000);
      return;
    }

    const scanTime = res.scanned_at || (new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
    const nowISO = new Date().toISOString();
    const finalDbId = finalSession.db_id || backendSession?.id;
    const finalSessionCode = finalSession.session_code || backendSession?.session_code || `SES-${String(finalDbId || 1).padStart(2, '0')}`;

    const newAttendances = {
      ...userAttendancesState,
      [finalSession.id]: {
        present: true,
        time: scanTime,
        timestamp: nowISO,
        status: 'present'
      },
      ...(finalDbId ? {
        [finalDbId]: {
          present: true,
          time: scanTime,
          timestamp: nowISO,
          status: 'present'
        }
      } : {}),
      ...(finalSessionCode ? {
        [finalSessionCode]: {
          present: true,
          time: scanTime,
          timestamp: nowISO,
          status: 'present'
        }
      } : {})
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
        if (p.id === user.id || p.email === user.email || (user.db_id && p.db_id === user.db_id)) {
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

    setPesertaScanResult({
      success: true,
      sessionId: finalSession.id,
      sessionTitle: finalSession.title,
      speaker: finalSession.speaker,
      room: finalSession.room,
      time: scanTime,
      msg: `Absensi Berhasil! Status Sesi "${finalSession.title}" Telah Berubah Menjadi HADIR.`
    });

    setPesertaScanInput('');
  };

  const handleDismissPesertaScanResult = (nextTab = null) => {
    setPesertaScanResult(null);
    if (nextTab) {
      setActiveTab(nextTab);
    }
    setTimeout(() => {
      isProcessingScanRef.current = false;
    }, 400);
  };

  // Tutup hasil scan dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && pesertaScanResult) {
        handleDismissPesertaScanResult();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pesertaScanResult]);

  // Camera initialization Effect for Peserta Full-Screen View
  useEffect(() => {
    let instance = null;
    let isMounted = true;

    if (activeTab === 'scan_presensi') {
      const containerId = 'peserta-camera-feed-box';
      setIsCameraLoading(true);
      setCameraError(null);

      const startScanner = async () => {
        // Wait briefly for DOM container rendering
        await new Promise((res) => setTimeout(res, 50));
        const element = document.getElementById(containerId);
        if (!element || !isMounted) return;

        // Stop any active previous instance safely
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

        try {
          instance = new Html5Qrcode(containerId, {
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
                handleProcessScanCode(decodedText);
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
                handleProcessScanCode(decodedText);
              },
              () => {}
            );
          }

          if (isMounted) {
            setIsCameraLoading(false);
            setCameraError(null);

            // Pastikan style video HD jernih memenuhi container tanpa distorsi
            const videoElem = element.querySelector('video');
            if (videoElem) {
              videoElem.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
              videoElem.style.webkitTransform = isMirrored ? 'scaleX(-1)' : 'none';
              videoElem.style.objectFit = 'cover';
              videoElem.style.width = '100%';
              videoElem.style.height = '100%';
            }

            // Aktifkan continuous autofocus lensa secara langsung pada media track jika didukung
            try {
              const track = instance.getRunningTrack();
              if (track && track.applyConstraints) {
                track.applyConstraints({
                  advanced: [{ focusMode: 'continuous' }]
                }).catch(() => {});
              }
            } catch (e) {}
          }
        } catch (err) {
          console.warn('Peserta camera start error', err);
          if (isMounted) {
            setIsCameraLoading(false);
            setCameraError(
              err?.message || 'Izin kamera belum aktif. Pastikan browser diizinkan mengakses kamera.'
            );
          }
        }
      };

      startScanner();

      return () => {
        isMounted = false;
        if (html5QrcodeRef.current) {
          try {
            if (html5QrcodeRef.current.isScanning) {
              html5QrcodeRef.current.stop().then(() => {
                try {
                  html5QrcodeRef.current.clear();
                } catch (e) {}
              }).catch(() => {});
            }
          } catch (e) {}
        }
      };
    }
  }, [activeTab, selectedCameraId, facingMode, cameraReloadKey]);

  const handleOpenSimulatedLink = (e) => {
    e.preventDefault();
    if (!simulatedLinkInput.trim()) return;
    const searchCode = simulatedLinkInput.trim().toLowerCase();
    const found = (quizzes || []).find(q => q.linkCode?.toLowerCase() === searchCode);
    if (found) {
      if (found.access_status === 'tutup' || found.is_open === false) {
        showToast(`Kuis "${found.title}" saat ini DITUTUP oleh Administrator untuk kelas Anda.`, 'warning');
        return;
      }
      setActivePlayingQuiz(found);
      setSimulatedLinkInput('');
    } else {
      showToast(`Kode / Tautan Kuis "${simulatedLinkInput}" tidak ditemukan! Pastikan kode yang dimasukkan sudah benar.`, 'warning');
    }
  };

  const handleQuizSubmitted = async (newSub) => {
    // 1. Langsung simpan ke state lokal sebagai terkunci (Optimistic Locking)
    // agar kartu kuis langsung berubah menjadi "Sudah Selesai Dikerjakan (Terkunci)" tanpa harus refresh!
    if (setQuizSubmissions) {
      setQuizSubmissions((prev) => {
        const list = prev || [];
        const idx = list.findIndex(s => 
          s.id === newSub.id || 
          (s.db_id && newSub.db_id && s.db_id === newSub.db_id) ||
          (isSubmissionForQuiz(s, activePlayingQuiz) && isSubmissionForParticipant(s, user))
        );
        if (idx >= 0) {
          const updated = [...list];
          updated[idx] = { ...updated[idx], ...newSub, isLocked: true, is_locked: true };
          return updated;
        }
        return [{ ...newSub, isLocked: true, is_locked: true }, ...list];
      });
    }

    // Kirim ke server via antrean async agar tahan lonjakan peserta
    let res = null;
    try {
      res = await api.submitQuiz(newSub.quiz_id || newSub.quizId, newSub, { async: true });
    } catch (err) {
      res = { ok: false, error: err?.message };
    }

    if (!res || !res.ok || !res.data) {
      console.warn('API submitQuiz gagal:', res?.error);
      showToast('Gagal mengirim jawaban ke server. Silakan coba kirim ulang.', 'error');
      return { ok: false, error: res?.error };
    }

    // Jika masuk antrean server
    if (res.data?.status === 'queued' && res.data?.ticket_id) {
      return { ok: true, queued: true, ticket_id: res.data.ticket_id, data: newSub };
    }

    const finalSub = { ...newSub, ...res.data, isLocked: true, is_locked: true };
    if (setQuizSubmissions) {
      setQuizSubmissions((prev) => {
        const list = prev || [];
        const idx = list.findIndex(s => 
          s.id === finalSub.id || 
          (s.db_id && finalSub.db_id && s.db_id === finalSub.db_id) ||
          (isSubmissionForQuiz(s, activePlayingQuiz) && isSubmissionForParticipant(s, user))
        );
        if (idx >= 0) {
          const updated = [...list];
          updated[idx] = finalSub;
          return updated;
        }
        return [finalSub, ...list];
      });
    }
    if (typeof refreshQuizSubmissions === 'function') {
      refreshQuizSubmissions();
    }
    showToast(`Quiz "${activePlayingQuiz?.title}" Berhasil Dikerjakan & Terkunci!`);
    return { ok: true, data: res.data };
  };

  const handleQuizSuccessFromQueue = (finalSubData) => {
    if (!finalSubData) return;
    const resolved = { ...finalSubData, isLocked: true, is_locked: true };
    if (setQuizSubmissions) {
      setQuizSubmissions((prev) => {
        const list = prev || [];
        const idx = list.findIndex(s => 
          s.id === resolved.id || 
          (s.db_id && resolved.db_id && s.db_id === resolved.db_id) ||
          (isSubmissionForQuiz(s, activePlayingQuiz) && isSubmissionForParticipant(s, user))
        );
        if (idx >= 0) {
          const updated = [...list];
          updated[idx] = { ...updated[idx], ...resolved };
          return updated;
        }
        return [resolved, ...list];
      });
    }
    if (typeof refreshQuizSubmissions === 'function') {
      refreshQuizSubmissions();
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(user.qrToken || user.user_qr_token || '');
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

  const handleSendHelpdesk = async (e) => {
    e.preventDefault();
    if (!incidentMsg.trim()) return;

    const newTicket = {
      id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
      user: user?.name || 'Peserta',
      issue: incidentMsg.trim(),
      status: 'Proses Panitia',
      response: 'Laporan Anda telah diteruskan ke panitia helpdesk di lokasi.',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    };

    setSubmittedIncidents([newTicket, ...submittedIncidents]);
    setIncidentMsg('');
    showToast('Laporan kendala berhasil dikirim ke Panitia!');

    try {
      await api.createTicket({
        title: `Kendala: ${incidentMsg.trim().slice(0, 30)}...`,
        message: incidentMsg.trim(),
        user_name: user?.name || 'Peserta',
        user_email: user?.email || '',
        status: 'Proses',
      });
      if (typeof setTickets === 'function') {
        const refreshed = await api.getTickets();
        if (refreshed && refreshed.ok && Array.isArray(refreshed.data)) {
          setTickets(refreshed.data);
        }
      }
    } catch (err) {
      console.warn('Backend createTicket error:', err);
    }
  };

  const handleContactWA = () => {
    const waNumber = siteSettings?.whatsappNumber || '62887437525303';
    const cleanNumber = waNumber.replace(/[^0-9]/g, '');
    const text = `Halo Panitia PresenTrain 👋\n\nSaya ingin menanyakan bantuan / kendala presensi pelatihan:\n• *Nama Lengkap*: ${user.name}\n• *Email*: ${user.email}\n• *Asal Komisariat*: ${user.instansi || 'Peserta Training'}\n• *Token QR*: ${user.qrToken || 'ABSEN-PESERTA'}\n• *Event*: ${training?.title || 'Pelatihan PresenTrain'}\n\nMohon bantuannya ya Kak, terima kasih! 🙏`;
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
  // MATCHING USER's LIGHT THEME REQUEST WITH REAR CAMERA ONLY
  // ==========================================
  if (activeTab === 'scan_presensi') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden h-screen w-screen font-sans selection:bg-emerald-500 selection:text-white">
        
        {/* Background Live Camera Feed (Full-Screen & Clear) */}
        <div className="absolute inset-0 w-full h-full object-cover z-0 bg-black flex items-center justify-center overflow-hidden">
          <div 
            id="peserta-camera-feed-box" 
            className={`w-full h-full ${isMirrored ? 'is-mirrored' : 'no-mirror'} ${isFitCover ? 'is-cover' : ''}`} 
          />
        </div>

        {/* Camera Loading Overlay */}
        {isCameraLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-3 pointer-events-none animate-fade-in">
            <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin shadow-lg shadow-emerald-500/20" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800 tracking-wide">Menghubungkan Kamera Belakang...</p>
            </div>
          </div>
        )}

        {/* Native Clean QR Scanner Box Viewfinder Overlay (Tanpa Layer Putih Transparan) */}
        {!cameraError && (
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
              <span>Arahkan kamera ke QR Code Presensi di layar depan</span>
            </div>
          </div>
        )}

        {/* Camera Error Fallback (Tema Terang) */}
        {cameraError && (
          <div className="absolute inset-0 bg-white/95 p-6 flex flex-col items-center justify-center text-center z-30 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center shadow-md">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Kamera Belum Terhubung</h4>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed">{cameraError}</p>
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setFacingMode('environment');
                  setSelectedCameraId('');
                  setCameraError(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Kamera Belakang</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Top Control Bar (Clean Toolbar) */}
        <div className="relative z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 p-3 md:p-4 flex items-center justify-between shadow-xs gap-2">
          
          {/* Left: Back Button Only */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className="p-2 sm:p-2.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer flex items-center space-x-1.5"
              title="Kembali ke Beranda"
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

            {/* Camera Fit / Fullscreen Toggle Button */}
            <button
              onClick={() => setIsFitCover(!isFitCover)}
              className={`p-2 sm:p-2 rounded-md border shadow-xs transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer ${
                isFitCover 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
              }`}
              title={isFitCover ? "Tampilan Jauh Standar" : "Ubah ke Layar Penuh"}
            >
              {isFitCover ? <Minimize2 className="w-4 h-4 text-emerald-600" /> : <Maximize2 className="w-4 h-4 text-slate-500" />}
            </button>

          </div>
        </div>

        {/* Scan Result Overlay Modal (Multi-State: Success, Already, Error) */}
        {pesertaScanResult && (
          <div 
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto animate-fade-in"
            onClick={() => handleDismissPesertaScanResult()}
            role="dialog"
            aria-modal="true"
          >
            <div 
              className={`bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full border-2 shadow-2xl text-center space-y-4 animate-spring-popup my-auto max-h-[92dvh] overflow-y-auto ${
                !pesertaScanResult.success 
                  ? 'border-rose-400' 
                  : pesertaScanResult.already 
                  ? 'border-amber-400' 
                  : 'border-emerald-500'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Icon Circle */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg ${
                !pesertaScanResult.success 
                  ? 'bg-rose-100 text-rose-600 shadow-rose-500/20' 
                  : pesertaScanResult.already 
                  ? 'bg-amber-100 text-amber-600 shadow-amber-500/20' 
                  : 'bg-emerald-100 text-emerald-600 shadow-emerald-500/20'
              }`}>
                {!pesertaScanResult.success ? (
                  <XCircle className="w-10 h-10 text-rose-600 stroke-[2.5]" />
                ) : pesertaScanResult.already ? (
                  <AlertTriangle className="w-10 h-10 text-amber-600 stroke-[2.5]" />
                ) : (
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 stroke-[2.5]" />
                )}
              </div>
              
              <div>
                <span className={`px-3 py-1 rounded-full font-extrabold text-xs uppercase border ${
                  !pesertaScanResult.success 
                    ? 'bg-rose-100 text-rose-800 border-rose-300' 
                    : pesertaScanResult.already 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {!pesertaScanResult.success 
                    ? 'VERIFIKASI GAGAL' 
                    : pesertaScanResult.already 
                    ? 'SUDAH HADIR SEBELUMNYA' 
                    : 'PEMINDAIAN BERHASIL • HADIR'}
                </span>

                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  {pesertaScanResult.sessionTitle || (!pesertaScanResult.success ? 'Barcode Tidak Terverifikasi' : 'Presensi Sesi')}
                </h3>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed px-2">
                  {pesertaScanResult.msg || (pesertaScanResult.success ? `Presensi berhasil dicatat pada ${pesertaScanResult.time}` : 'Terjadi kendala saat memverifikasi barcode.')}
                </p>

                {pesertaScanResult.time && (
                  <p className="text-xs text-slate-500 mt-2">
                    Waktu Catat: <strong className="text-emerald-700 font-mono text-xs">{pesertaScanResult.time}</strong>
                  </p>
                )}
              </div>

              {pesertaScanResult.speaker && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1 text-left">
                  <div>Pemateri: <strong>{pesertaScanResult.speaker || 'Tim Panitia'}</strong></div>
                  <div>Ruangan: <strong>{pesertaScanResult.room || 'Lab Training'}</strong></div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {pesertaScanResult.success ? (
                  <>
                    <button
                      onClick={() => handleDismissPesertaScanResult('my_attendances')}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lihat Rekap Kehadiran</span>
                    </button>
                    <button
                      onClick={() => handleDismissPesertaScanResult()}
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                    >
                      Lanjut Scan
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleDismissPesertaScanResult()}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Coba Scan Ulang</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Dock Control Area */}
        <div className="relative z-20 p-4 md:p-6 flex flex-col items-center justify-end space-y-3 pointer-events-none">
          <div className="pointer-events-auto max-w-lg w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 p-3 sm:p-4 rounded-3xl shadow-2xl flex items-center gap-2">
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
                placeholder="Ketik/tempel token barcode sesi jika kamera bermasalah..."
                value={pesertaScanInput}
                onChange={(e) => setPesertaScanInput(e.target.value)}
                className="w-full px-3 py-1.5 text-white text-xs bg-transparent outline-none placeholder:text-slate-500 font-mono"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                Verifikasi
              </button>
            </form>
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
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans w-full">
        
        {/* Banner Event */}
        <div className="bg-white rounded-md p-6 md:p-8 text-slate-900 relative overflow-hidden border border-emerald-300/40 shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
            JADWAL RESMI PELATIHAN
          </span>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mt-2">{training?.title}</h2>
          <div className="text-xs text-slate-600 mt-2.5 space-y-1">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-bold text-slate-800">
                {(() => {
                  const rangeStr = training?.dateRange || '20/10/2026 - 22/10/2026';
                  const dates = rangeStr.split(' - ');
                  if (dates.length === 2) {
                    return `${formatLongDateIndonesian(dates[0])} s/d ${formatLongDateIndonesian(dates[1])}`;
                  }
                  return formatLongDateIndonesian(rangeStr);
                })()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{training?.location || 'Sekretariat HMI Cabang Bandar Lampung'}</span>
            </div>
          </div>
        </div>

        {/* Sessions Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daftar Sesi Materi Training ({sessions.length} Sesi)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((ses, idx) => (
              <div key={ses.id} className="bg-white rounded-md p-5 space-y-3.5 border border-slate-200/80 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Sesi {idx + 1}</span>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{ses.title}</h4>
                  </div>
                  {(() => {
                    const currentStatus = getDynamicSessionStatus(ses);
                    const isCurrent = currentStatus === 'Berlangsung';
                    const isDone = currentStatus === 'Selesai';
                    return (
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        isCurrent 
                          ? 'bg-emerald-600 text-white shadow-xs animate-pulse' 
                          : isDone 
                          ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}>
                        {isCurrent ? '● Berlangsung' : isDone ? 'Selesai' : 'Akan Datang'}
                      </span>
                    );
                  })()}
                </div>

                <div className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100 font-medium">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Jam: <strong className="text-slate-800">{ses.time}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tanggal: <strong className="text-slate-800">{formatLongDateIndonesian(ses.date)}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ruangan: <strong className="text-slate-800">{ses.room}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pemateri: <strong className="text-slate-800">{ses.speaker || 'Tim Panitia'}</strong></span>
                  </div>
                </div>

                {ses.desc && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-200/60 italic">
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
    const userSubs = (quizSubmissions || []).filter(s => isSubmissionForParticipant(s, user));
    const assignmentDriveUrl = training?.drive_assignment_url || training?.driveAssignmentUrl || training?.drive_url || siteSettings?.driveAssignmentUrl || 'https://drive.google.com/drive/folders/1vbiP8mnEklKnSRYFSDG9Gcc2h1tqkVwR';

    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans w-full">

        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-md p-6 md:p-8 text-slate-900 space-y-2 shadow-xs">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Evaluasi Hasil Belajar Peserta</h2>
          <p className="text-xs text-slate-600">
            Kerjakan kuis evaluasi untuk mengukur peningkatan pemahaman materi pelatihan Anda. Nilai yang telah di-submit bersifat terkunci secara otomatis.
          </p>
        </div>

        {/* Card Pengumpulan Tugas Google Drive (Tema Terang) */}
        <div className="bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 border border-emerald-200 rounded-md p-5 sm:p-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Pengumpulan Tugas 
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Silakan kumpulkan tugas Anda ke folder Google Drive sesuai dengan kelas anda. Gunakan format penamaan berkas: <span className="font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-1.5 py-0.5 rounded font-mono text-[11px]">Nama_Asal Komisariat_Kelas_Nama Tugas.pdf</span>
            </p>
          </div>

          {/* Tombol Aksi Langsung ke Drive (Tanpa Tombol Salin) */}
          <div className="shrink-0 pt-1 md:pt-0">
            <a
              href={assignmentDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Buka folder pengumpulan tugas Google Drive di tab baru"
            >
              <FolderUp className="w-4 h-4 text-white shrink-0" />
              <span>Buka Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
            </a>
          </div>
        </div>

        {/* List Quizzes Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Daftar Quiz Pelatihan Tersedia
            </h3>
            <button
              onClick={() => {
                if (typeof refreshQuizzes === 'function') refreshQuizzes();
                if (typeof refreshQuizSubmissions === 'function') refreshQuizSubmissions();
                showToast('Data status kuis diperbarui dari server!');
              }}
              className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
              title="Segarkan status kuis"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Segarkan Status</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(!quizzes || quizzes.length === 0) ? (
              <div className="col-span-2 p-8 text-center bg-white rounded-md border text-slate-400 text-xs">
                Belum ada kuis yang diterbitkan oleh panitia.
              </div>
            ) : (
              quizzes.map((qz) => {
                const sub = userSubs.find(s => isSubmissionForQuiz(s, qz));
                const isCompleted = !!sub;

                return (
                  <div key={qz.id} className="bg-white rounded-md p-6 border border-slate-200 shadow-xs space-y-4 hover:border-emerald-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className={`text-xs font-bold tracking-tight ${
                          qz.type === 'pretest' || qz.type === 'pre_test'
                            ? 'text-amber-700' 
                            : (qz.type === 'midtest' || qz.type === 'mid_test' || qz.type === 'evaluasi' 
                              ? 'text-blue-700' 
                              : (qz.type === 'quiz' ? 'text-purple-700' : 'text-emerald-700'))
                        }`}>
                          {qz.type === 'pretest' || qz.type === 'pre_test' ? 'Pre-Test' : (qz.type === 'midtest' || qz.type === 'mid_test' || qz.type === 'evaluasi' ? 'Mid-Test' : (qz.type === 'quiz' ? 'Quiz Materi' : 'Post-Test'))}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{qz.title}</h3>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 text-xs flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Durasi: <strong>{qz.durationMinutes} Menit</strong></span>
                      <span className="text-slate-500 font-medium">Passing Grade: <strong className="text-emerald-700">{qz.passingGrade} Poin</strong></span>
                    </div>

                    {isCompleted ? (
                      <div className="space-y-3 pt-1">
                        <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 shadow-2xs">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                              <span>Status Ujian: Telah Dikerjakan</span>
                            </div>
                            <div className="text-xs font-bold text-slate-800">
                              <span>Nilai: <span className="text-emerald-700 font-extrabold">{sub.score} / 100</span></span>
                              {sub.isCorrected && (
                                <span className="ml-2 inline-flex items-center text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-300">
                                  Telah Dikoreksi Panitia
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-normal text-slate-500">
                              ({sub.submittedAt || 'Telah Disubmit'})
                            </div>
                          </div>
                        </div>

                        <button
                          disabled
                          className="w-full py-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 cursor-not-allowed select-none"
                          title="Kuis ini telah Anda selesaikan dan jawaban terkunci secara permanen"
                        >
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span>Sudah Selesai Dikerjakan (Terkunci)</span>
                        </button>
                      </div>
                    ) : qz.access_status === 'tutup' || qz.is_open === false ? (
                      <div className="space-y-2 pt-1">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[11px] font-bold text-slate-500 flex items-center justify-center space-x-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Kuis Saat Ini Ditutup Oleh Panitia</span>
                          </span>
                        </div>
                        <button
                          disabled
                          className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-md border border-slate-200 cursor-not-allowed select-none flex items-center justify-center space-x-2"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Belum Dibuka untuk Kelas Anda</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const existing = userSubs.find(s => isSubmissionForQuiz(s, qz));
                          if (existing) {
                            showToast(`Anda sudah menyelesaikan kuis "${qz.title}" sebelumnya.`);
                            return;
                          }
                          setActivePlayingQuiz(qz);
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer group active:scale-98"
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
            existingSubmission={userSubs.find(s => isSubmissionForQuiz(s, activePlayingQuiz))}
            onClose={() => setActivePlayingQuiz(null)}
            onSubmitQuiz={handleQuizSubmitted}
            onQueueSuccess={handleQuizSuccessFromQueue}
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
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans w-full">
        
        {/* Progress Header */}
        <div className="bg-white rounded-md p-6 md:p-8 text-slate-900 relative overflow-hidden space-y-3 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  REKAP PRESENSI SAYA
                </span>
                <button
                  type="button"
                  onClick={() => fetchLatestAttendances(true)}
                  disabled={isSyncingAttendances}
                  className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                  title="Klik untuk menyinkronkan data presensi terbaru dari server"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingAttendances ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{isSyncingAttendances ? 'Menyinkronkan...' : 'Sinkron'}</span>
                </button>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mt-1">
                {attendedCount} dari {totalCount} Sesi Dihadiri
              </h2>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('scan_presensi')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all active:scale-95 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span>Scan Presensi</span>
              </button>
            </div>
          </div>

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
            {(!sessions || sessions.length === 0) ? (
              <div className="col-span-full py-8 text-center bg-white rounded-md border border-slate-200 text-slate-400 text-xs font-medium">
                Belum ada jadwal sesi pelatihan yang diterbitkan panitia.
              </div>
            ) : (
              sessions.map((ses, idx) => {
                const att = userAttendances[ses.id] || 
                            (ses.db_id && userAttendances[ses.db_id]) || 
                            (ses.session_code && userAttendances[ses.session_code]) ||
                            (typeof ses.id === 'string' && userAttendances[ses.id.replace(/\D/g, '')]) ||
                            (ses.db_id && userAttendances[`SES-${ses.db_id}`]) ||
                            (ses.db_id && userAttendances[`SES-${String(ses.db_id).padStart(2, '0')}`]);
                // Helper untuk cek apakah sesi sudah berakhir/lewat jadwal
                const isSessionEnded = ses.status === 'Selesai' || ses.computed_status === 'Selesai' || ses.is_passed === true;

                const rawStatus = (att?.raw_status || att?.status || '').toLowerCase();
                const isPresent = att?.present === true || rawStatus === 'present' || rawStatus === 'hadir';
                const isExcused = !isPresent && (rawStatus === 'permission' || rawStatus === 'izin' || rawStatus === 'sakit' || rawStatus === 'excused' || att?.excuse === true);
                const isAbsent = !isPresent && !isExcused && (rawStatus === 'absent' || rawStatus === 'tidak hadir' || rawStatus === 'alpa' || isSessionEnded);
                const reasonNote = att?.note || (isSessionEnded && !isPresent && !isExcused ? 'Tidak Hadir / Alpa (Sesi telah berakhir)' : null);

              return (
                <div key={ses.id} className={`bg-white rounded-md p-5 space-y-3 border border-slate-200/80 shadow-xs ${
                  isPresent 
                    ? 'border-l-4 border-l-emerald-500' 
                    : isExcused 
                    ? 'border-l-4 border-l-amber-500' 
                    : isAbsent 
                    ? 'border-l-4 border-l-rose-500' 
                    : ''
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">{ses.title}</h4>
                      {ses.time && <p className="text-[11px] text-slate-500 mt-0.5">{ses.time}</p>}
                    </div>
                    {isPresent ? (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Hadir</span>
                      </span>
                    ) : isExcused ? (
                      <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Izin</span>
                      </span>
                    ) : isAbsent ? (
                      <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Tidak Hadir</span>
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-xs font-medium px-3 py-1 rounded-full shrink-0">
                        Belum Absen
                      </span>
                    )}
                  </div>

                  {isPresent && (
                    <div className="bg-emerald-50 rounded-md p-2.5 text-xs text-emerald-900 flex items-center justify-between font-medium border border-emerald-200/80">
                      <span>Waktu Scan Verifikasi:</span>
                      <span className="font-semibold font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">{att.time || 'Tercatat Hadir'}</span>
                    </div>
                  )}

                  {isExcused && (
                    <div className="bg-amber-50 rounded-md p-2.5 text-xs text-amber-900 flex flex-col space-y-1 font-medium border border-amber-200/80">
                      <span className="text-[10px] uppercase font-bold text-amber-700">Keterangan / Alasan Izin:</span>
                      <p className="italic font-medium text-slate-800">"{reasonNote || 'Izin / Berhalangan disetujui Panitia'}"</p>
                    </div>
                  )}

                  {isAbsent && (
                    <div className="bg-rose-50 rounded-md p-2.5 text-xs text-rose-900 flex flex-col space-y-1 font-medium border border-rose-200/80">
                      <span className="text-[10px] uppercase font-bold text-rose-700">Keterangan:</span>
                      <p className="italic font-medium text-slate-800">"{reasonNote || 'Tidak Hadir / Alpa pada sesi ini'}"</p>
                    </div>
                  )}
                </div>
              );
            }))}
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
      <HelpdeskView
        user={user}
        siteSettings={siteSettings}
        tickets={tickets}
        setTickets={setTickets}
        onBack={() => setActiveTab('overview')}
      />
    );
  }

  // ==========================================
  // TAB 1: PROFIL & QR CODE (`profile`)
  // ==========================================
  if (activeTab === 'profile') {
    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans w-full">

        {/* Header Banner Profil & QR */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-md p-6 md:p-8 text-slate-900 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
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
            <div className="bg-white rounded-md p-6 text-center space-y-4 border border-slate-200/80 shadow-xs">
              <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-4xl font-semibold text-white shadow-xs">
                {user?.name ? user.name.charAt(0) : 'P'}
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{user?.name || 'Peserta Pelatihan'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'peserta@presentrain.com'}</p>
              </div>
            </div>

            <div className="bg-white rounded-md p-5 space-y-3 border border-slate-200/80 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Biodata Registrasi</h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-md border border-slate-200/70">
                  <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-medium text-slate-400 uppercase">Asal Komisariat</p>
                    <p className="font-semibold text-slate-800 truncate">{user?.instansi || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-md border border-slate-200/70">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">Nomor WhatsApp / HP</p>
                    <p className="font-semibold text-slate-800">{user?.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-md border border-slate-200/70">
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
          <div className="md:col-span-7 bg-white rounded-md p-6 text-center space-y-5 border border-slate-200/80 shadow-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-left">
                <QrCode className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Kartu Barcode QR Presensi</h3>
                  <p className="text-[10px] text-slate-500">Tunjukkan barcode ini pada panitia scanner di lokasi</p>
                </div>
              </div>

              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                QR STATIS RESMI
              </span>
            </div>

            {/* SVG QR Container */}
            <div className="bg-slate-50 p-6 rounded-md inline-block border border-slate-200 shadow-inner">
              <QRCodeSVG
                id="peserta-qr-svg"
                value={user.qrToken || user.user_qr_token || ''}
                size={220}
                level="H"
                includeMargin={true}
                className="mx-auto bg-white p-2.5 rounded-md shadow-xs"
              />
            </div>

            {/* Primary Action Buttons: UNDUH QR & ZOOM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleDownloadQR}
                disabled={downloading}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md flex items-center justify-center space-x-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Mengunduh...' : 'Unduh Gambar QR (PNG)'}</span>
              </button>

              <button
                onClick={onOpenFullQR}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 text-emerald-400" />
                <span>Zoom Layar Penuh</span>
              </button>
            </div>

            {/* Nomor Unik Presensi Manual (Bantuan Presensi) */}
            {(() => {
              const fullTok = user.qrToken || user.user_qr_token || '';
              const match = String(fullTok).match(/(\d{4,})$/);
              const manualCode = match ? match[1] : (fullTok || '-');
              return (
                <div className="bg-emerald-50/80 border border-emerald-300 rounded-md p-3 text-center shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                        Nomor Unik Presensi Manual
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Berikan nomor ini jika scanner bermasalah / presensi manual
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-base font-black text-emerald-950 tracking-widest">
                        {manualCode}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Copy Token Bar */}
            <div className="bg-slate-100 rounded-md p-3 flex items-center justify-between">
              <div className="text-left truncate pr-2">
                <p className="text-[9px] font-medium text-slate-400 uppercase">Token QR Lengkap</p>
                <p className="font-mono text-xs font-semibold text-emerald-800 truncate">
                  {user.qrToken || user.user_qr_token || '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyToken}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 text-xs flex items-center space-x-1 shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all"
                title={copied ? 'Tersalin' : 'Salin Token'}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline text-[10px] font-semibold">{copied ? 'Tersalin' : 'Salin'}</span>
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans w-full">

      
      {/* ================= 2-COLUMN DESKTOP / LANDSCAPE HERO & QUICK MENU GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        
        {/* KOLOM KIRI (GREEN WELCOME CARD + 3D CHARACTER) */}
        <div className="lg:col-span-6 xl:col-span-6 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 text-white rounded-md p-3.5 sm:p-5 md:p-6 relative overflow-hidden shadow-xs border border-emerald-600/30 flex flex-col justify-between min-h-[145px] sm:min-h-[210px] lg:min-h-[230px]">
          
          {/* Subtle Ambient Background Orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between h-full space-y-2 sm:space-y-4">
            {/* Header Text */}
            <div className="pr-20 sm:pr-32 lg:pr-36">
              <div className="flex items-center">
                <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-emerald-200 uppercase tracking-widest">
                  Aplikasi Presensi & Penilaian
                </span>
              </div>
              <div className="mt-1 leading-tight">
                <p className="text-xs sm:text-sm md:text-base font-normal text-emerald-100 tracking-tight">
                  Selamat Datang,
                </p>
                <h2 className="text-sm sm:text-lg md:text-xl font-bold text-white tracking-tight mt-0.5">
                  {user?.name || 'Peserta'}
                </h2>
              </div>
            </div>

            {/* Mini Ringkasan Dashboard - Compact & Non-overflowing Circles */}
            <div className="mt-1.5 sm:mt-auto pt-0 sm:pt-2 max-w-[155px] xs:max-w-[180px] sm:max-w-[210px] md:max-w-[225px] lg:max-w-[235px]">
              <div className="grid grid-cols-3 divide-x divide-white/20">
                
                {/* Stat 1: Kehadiran Saya */}
                <div className="flex flex-col items-center justify-center px-0.5 sm:px-1 text-center">
                  <div className="relative w-5 h-5 sm:w-6.5 sm:h-6.5 md:w-7 md:h-7 flex items-center justify-center shrink-0 mx-auto">
                    {(() => {
                      const pRatio = Math.min(Math.max((progressPercent || 0) / 100, 0), 1);
                      const dashOffset = (2 * Math.PI * 18) * (1 - (isNaN(pRatio) ? 0 : pRatio));
                      return (
                        <>
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" className="stroke-white/20" strokeWidth="3.2" fill="transparent" />
                            <circle
                              cx="22"
                              cy="22"
                              r="18"
                              className="stroke-emerald-300 transition-all duration-1000 ease-out"
                              strokeWidth="3.2"
                              strokeDasharray={2 * Math.PI * 18}
                              strokeDashoffset={isNaN(dashOffset) ? 0 : dashOffset}
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-center">
                            <span className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-black text-white tracking-tighter leading-none whitespace-nowrap">
                              {progressPercent || 0}<span className="text-[4px] sm:text-[5px] md:text-[5.5px] font-bold text-emerald-200">%</span>
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                    Kehadiran Saya
                  </span>
                </div>

                {/* Stat 2: Sesi Dihadiri */}
                <div className="flex flex-col items-center justify-center px-0.5 sm:px-1 text-center">
                  <div className="relative w-5 h-5 sm:w-6.5 sm:h-6.5 md:w-7 md:h-7 flex items-center justify-center shrink-0 mx-auto">
                    {(() => {
                      const aRatio = totalCount > 0 ? Math.min(Math.max(attendedCount / totalCount, 0), 1) : 0;
                      const dashOffset = (2 * Math.PI * 18) * (1 - (isNaN(aRatio) ? 0 : aRatio));
                      const displayNum = (attendedCount || 0) < 10 ? `0${attendedCount || 0}` : `${attendedCount || 0}`;
                      return (
                        <>
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" className="stroke-white/20" strokeWidth="3.2" fill="transparent" />
                            <circle
                              cx="22"
                              cy="22"
                              r="18"
                              className="stroke-emerald-300 transition-all duration-1000 ease-out"
                              strokeWidth="3.2"
                              strokeDasharray={2 * Math.PI * 18}
                              strokeDashoffset={isNaN(dashOffset) ? 0 : dashOffset}
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-center">
                            <span className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-black text-white tracking-tighter leading-none whitespace-nowrap">
                              {displayNum}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                    Sesi Dihadiri
                  </span>
                </div>

                {/* Stat 3: Sesi Berlangsung */}
                <div className="flex flex-col items-center justify-center px-0.5 sm:px-1 text-center">
                  <div className="relative w-5 h-5 sm:w-6.5 sm:h-6.5 md:w-7 md:h-7 flex items-center justify-center shrink-0 mx-auto">
                    {(() => {
                      const activeSessionsCount = safeSessions.filter(s => {
                        const st = String(s.status || '').toLowerCase();
                        return st.includes('langsung') || st.includes('aktif') || st.includes('jalan');
                      }).length;
                      const activeRatio = totalCount > 0 ? Math.min(Math.max(activeSessionsCount / totalCount, 0), 1) : 0;
                      const dashOffset = (2 * Math.PI * 18) * (1 - (isNaN(activeRatio) ? 0 : activeRatio));
                      const displayNum = activeSessionsCount < 10 ? `0${activeSessionsCount}` : `${activeSessionsCount}`;
                      return (
                        <>
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" className="stroke-white/20" strokeWidth="3.2" fill="transparent" />
                            <circle
                              cx="22"
                              cy="22"
                              r="18"
                              className="stroke-emerald-300 transition-all duration-1000 ease-out"
                              strokeWidth="3.2"
                              strokeDasharray={2 * Math.PI * 18}
                              strokeDashoffset={isNaN(dashOffset) ? 0 : dashOffset}
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-center">
                            <span className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-black text-white tracking-tighter leading-none whitespace-nowrap">
                              {displayNum}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                    Sesi Berlangsung
                  </span>
                </div>

              </div>
            </div>

            {/* 3D Welcome Chibi Characters - Smooth Bottom Transparent Mask Gradient */}
            <div className="absolute bottom-2.5 sm:bottom-0 right-1 sm:right-2 md:right-3 h-[90%] sm:h-[98%] lg:h-[105%] max-h-[115px] sm:max-h-[150px] lg:max-h-[170px] flex items-end justify-end pointer-events-none z-10">
              <img 
                src="/welcome_3d_icon.png" 
                alt="Selamat Datang 3D" 
                className="h-full w-auto object-contain object-bottom drop-shadow-lg select-none"
                style={{
                  maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)'
                }}
              />
            </div>
          </div>
        </div>

        {/* KOLOM KANAN (QUICK MENU GRID CARD - CONSISTENT WITH ADMIN) */}
        <div className="lg:col-span-6 xl:col-span-6 bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-center">

          <div className="grid grid-cols-3 h-full divide-x divide-y divide-slate-100/90">
            
            {/* Item 1: Quiz Ujian */}
            <button
              onClick={() => setActiveTab && setActiveTab('quizzes')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Quiz Ujian
              </span>
            </button>

            {/* Item 2: Jadwal Training */}
            <button
              onClick={() => setActiveTab && setActiveTab('schedule')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Jadwal Training
              </span>
            </button>

            {/* Item 3: Live Rekap */}
            <button
              onClick={() => setActiveTab && setActiveTab('my_attendances')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-b border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                  Live Rekap
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              </div>
            </button>

            {/* Item 4: Helpdesk Lapangan */}
            <button
              onClick={() => setActiveTab && setActiveTab('helpdesk')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <LifeBuoy className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Helpdesk Lapangan
              </span>
            </button>

            {/* Item 5: Scan Absensi */}
            <button
              onClick={() => setActiveTab && setActiveTab('scan_presensi')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <QrCode className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Scan Absensi
              </span>
            </button>

            {/* Item 6: Profil & QR */}
            <button
              onClick={() => setActiveTab && setActiveTab('profile')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <User className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Profil & QR
              </span>
            </button>

          </div>
        </div>

      </div>

      {/* ================= IMAGE SLIDER BANNER (SLIDE BANNER DENGAN ASPEK RASIO 200:87.503) ================= */}
      <BannerSlider customSlides={training?.bannerSlides ? training.bannerSlides.map((img, i) => typeof img === 'string' ? { id: i+1, image: img } : img) : null} />

      {/* ================= APP INFORMASI KEGIATAN YANG DIIKUTI ================= */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informasi Kegiatan & Pelatihan yang Diikuti</h3>

        <div className="light-card rounded-3xl p-6 md:p-8 space-y-6 border border-slate-200/80 bg-white shadow-xs">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                PROGRAM PELATIHAN AKTIF
              </span>
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mt-2">
                {training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung 2026'}
              </h3>
              <div className="text-xs sm:text-sm text-slate-500 mt-2.5 space-y-1 font-medium">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-700 font-bold">
                    {(() => {
                      const rangeStr = training?.dateRange || '20/10/2026 - 22/10/2026';
                      const dates = rangeStr.split(' - ');
                      if (dates.length === 2) {
                        return `${formatLongDateIndonesian(dates[0])} s/d ${formatLongDateIndonesian(dates[1])}`;
                      }
                      return formatLongDateIndonesian(rangeStr);
                    })()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-600 font-normal">
                    {training?.location || 'Sekretariat HMI Cabang Bandar Lampung'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            
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
                <span className="truncate">{user.qrToken || user.user_qr_token || '-'}</span>
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

      {/* Global Async Queue Status Modal */}
      <QueueStatusModal
        isOpen={isQueueLoading || isQueueCompleted || isQueueFailed}
        status={queueStatus}
        progressPercent={queueProgress}
        message={queueMessage}
        onClose={resetQueueModal}
        title="Antrean Presensi Peserta"
      />

    </div>
  );
}
