import React, { useState, useEffect, useCallback } from 'react';
import FullQRModal from '@/features/peserta/components/FullQRModal';
import { 
  INITIAL_TRAINING, 
  INITIAL_PARTICIPANTS, 
  INITIAL_ADMIN_LIST, 
  INITIAL_QUIZZES, 
  INITIAL_QUIZ_SUBMISSIONS, 
  INITIAL_QUIZ_GRADE_REQUESTS,
  INITIAL_ASSESSMENTS,
  INITIAL_TICKETS
} from '@/data/mockData';
import { api } from '@/services/api';
import { offlineSync } from '@/services/offlineSync';
import { useAppRouter } from '@/routes/useAppRouter';
import { AuthProvider } from '@/context/AuthContext';
import { FeedbackProvider } from '@/context/FeedbackContext';
import { ClassProvider } from '@/context/ClassContext';
import CoolLoader from '@/components/ui/Feedback/CoolLoader';
import AppRoutes from '@/routes/AppRoutes';
import ErrorBoundary from '@/components/ui/ErrorBoundary';


export default function App() {
  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('presentrain_token');
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      // 1. Cek parameter redirect Google OAuth jika baru kembali dari Google
      if (window.location.search && window.location.search.includes('google_auth=success')) {
        const params = new URLSearchParams(window.location.search);
        const email = params.get('email');
        const role = params.get('role');
        if (email && role) {
          const userObj = {
            id: params.get('user_id') ? (Number(params.get('user_id')) || params.get('user_id')) : Date.now(),
            name: params.get('name') || 'Peserta Google',
            email: email,
            role: role,
            status: params.get('status') || 'Aktif',
            gender: params.get('gender') || 'L',
            instansi: params.get('instansi') || '',
            phone: params.get('phone') || '',
            avatar: params.get('avatar') || null,
            qrToken: params.get('qr_token') || `ABSEN-PESERTA-GOOGLE-${Date.now()}`,
            user_qr_token: params.get('qr_token'),
          };
          offlineSync.cacheUserProfile(userObj);
          return userObj;
        }
      }
      // 2. Fallback cek cached user dari localStorage
      const cached = offlineSync.getCachedUserProfile();
      if (cached && cached.id) {
        return cached;
      }
    }
    return null;
  });
  const [isVerifyingSession, setIsVerifyingSession] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.search && window.location.search.includes('google_auth=success')) {
        return false;
      }
      return hasToken;
    }
    return false;
  });

  const initialQuizMatch = typeof window !== 'undefined' ? window.location.pathname.match(/\/quiz\/([a-zA-Z0-9_-]+)/i) : null;
  const initialQuizCode = initialQuizMatch ? initialQuizMatch[1] : null;

  const { 
    activeTab, 
    setActiveTab, 
    publicSesiIndex, 
    urlToken, 
    urlQuizCode, 
    handleUserLoggedIn, 
    handleUserLoggedOut 
  } = useAppRouter(currentUser, initialQuizCode);

  const isDirectAuthPath = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/login') || 
     window.location.pathname.startsWith('/register') || 
     window.location.pathname.startsWith('/masuk') || 
     window.location.pathname.startsWith('/daftar') ||
     window.location.search.includes('google_auth'));

  const initialOnboarded = typeof window !== 'undefined'
    ? (!!urlQuizCode || hasToken || isDirectAuthPath || offlineSync.isOnboarded())
    : false;
  const [isOnboarded, setIsOnboarded] = useState(initialOnboarded);

  const [googleCompletionData, setGoogleCompletionData] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('presentrain_google_completion');
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [googleAuthError, setGoogleAuthError] = useState('');
  const [training, setTraining] = useState(INITIAL_TRAINING);
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [adminList, setAdminList] = useState(INITIAL_ADMIN_LIST);
  const [quizzes, setQuizzes] = useState(INITIAL_QUIZZES);
  const [quizSubmissions, setQuizSubmissions] = useState(INITIAL_QUIZ_SUBMISSIONS);
  const [quizRequests, setQuizRequests] = useState(INITIAL_QUIZ_GRADE_REQUESTS);
  const [assessments, setAssessments] = useState(INITIAL_ASSESSMENTS);
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [isFullQROpen, setIsFullQROpen] = useState(false);
  const [overrideMaintenance, setOverrideMaintenance] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    siteName: 'PresenTrain',
    tagline: 'System Presensi Digital & Training',
    logoUrl: '/logo/logo.png',
    logoLetter: 'P',
    isMaintenance: false,
    maintenanceMsg: 'Sistem presensi sedang dalam pemeliharaan berkala untuk peningkatan kualitas layanan. Silakan kembali beberapa saat lagi.',
    contactEmail: 'support@presentrain.com',
    whatsappNumber: '62887437525303',
    appVersion: 'v1.2.0'
  });

  const formatDDMMYYYY = useCallback((dateStr) => {
    if (!dateStr) return '20/10/2026';
    if (dateStr.includes('/')) return dateStr;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
        } else if (parts[2].length === 4) {
          return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
        }
      }
    }
    return dateStr;
  }, []);

  const loadTrainings = useCallback(async () => {
    try {
      const data = await api.getTrainings();
      if (data && data.length > 0) {
        const t = data[0];
        const startFmt = formatDDMMYYYY(t.start_date);
        const endFmt = formatDDMMYYYY(t.end_date);
        setTraining({
          id: t.code || `TR-${t.id}`,
          db_id: t.id,
          title: t.title,
          dateRange: `${startFmt} - ${endFmt}`,
          location: t.location || 'Sekretariat HMI Cabang Bandar Lampung',
          totalParticipants: t.total_participants || t.registrations_count || INITIAL_PARTICIPANTS.length,
          status: t.status,
          bannerSlides: t.banner_slides || INITIAL_TRAINING.bannerSlides,
          sessions: (t.sessions && t.sessions.length > 0) ? t.sessions.map(s => ({
            id: s.session_code || `SES-${s.id}`,
            db_id: s.id,
            session_code: s.session_code,
            title: s.title,
            speaker: s.speaker || '-',
            room: s.room || 'Aula Utama Sekretariat HMI Cabang Bandar Lampung',
            start_time: s.start_time,
            end_time: s.end_time,
            session_date: s.session_date,
            barcode_token: s.barcode_token,
            barcode_expires_at: s.barcode_expires_at,
            computed_status: s.computed_status,
            time: s.start_time && s.end_time ? `${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)} WIB` : '08:00 - 10:00 WIB',
            date: formatDDMMYYYY(s.session_date),
            status: s.computed_status || s.status
          })) : INITIAL_TRAINING.sessions
        });
      }
    } catch (err) {
      console.warn('Backend training fetch fallback to INITIAL_TRAINING:', err);
    }
  }, [formatDDMMYYYY]);

  const handleLogout = useCallback(() => {
    offlineSync.clearSession();
    setCurrentUser(null);
    handleUserLoggedOut();
    setOverrideMaintenance(false);
  }, [handleUserLoggedOut]);

  const handleLoginSuccess = useCallback((userObj) => {
    offlineSync.cacheUserProfile(userObj);
    offlineSync.setOnboarded(true);
    setIsOnboarded(true);
    setGoogleCompletionData(null);
    try {
      sessionStorage.removeItem('presentrain_google_completion');
    } catch (e) {}
    setCurrentUser(userObj);
    handleUserLoggedIn(userObj);
  }, [handleUserLoggedIn]);

  const handleUpdateUser = useCallback((updatedUser) => {
    offlineSync.cacheUserProfile(updatedUser);
    setCurrentUser(updatedUser);
    if (updatedUser) {
      setParticipants(prev => (prev || []).map(p => {
        const isMatch = (updatedUser.id && (p.id === updatedUser.id || p.db_id === updatedUser.id || `USR-${updatedUser.id}` === p.id)) ||
                        (updatedUser.db_id && (p.db_id === updatedUser.db_id || p.id === `USR-${updatedUser.db_id}`)) ||
                        (updatedUser.email && p.email?.toLowerCase() === updatedUser.email?.toLowerCase());
        if (isMatch) {
          return {
            ...p,
            name: updatedUser.name || p.name,
            email: updatedUser.email || p.email,
            instansi: updatedUser.instansi || p.instansi,
            gender: updatedUser.gender !== undefined ? updatedUser.gender : p.gender,
            phone: updatedUser.phone || p.phone,
            avatar: updatedUser.avatar !== undefined ? updatedUser.avatar : p.avatar,
          };
        }
        return p;
      }));
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    offlineSync.updateLastActive();

    let lastRecorded = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 60000) {
        lastRecorded = now;
        if (offlineSync.isSessionExpired()) {
          console.warn('Sesi telah kedaluwarsa (30 hari tidak dibuka). Mengeluarkan akun...');
          handleLogout();
        } else {
          offlineSync.updateLastActive();
        }
      }
    };

    const interval = setInterval(() => {
      if (offlineSync.isSessionExpired()) {
        console.warn('Sesi telah kedaluwarsa setelah 30 hari. Logout otomatis...');
        handleLogout();
      }
    }, 5 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (offlineSync.isSessionExpired()) {
          handleLogout();
        } else {
          offlineSync.updateLastActive();
        }
      }
    };

    const handleUnauthorizedEvent = () => {
      handleLogout();
    };

    window.addEventListener('click', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('presentrain:unauthorized', handleUnauthorizedEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('presentrain:unauthorized', handleUnauthorizedEvent);
    };
  }, [currentUser, handleLogout]);

  // Validasi sesi aktif ke backend saat startup
  useEffect(() => {
    // Jika sedang dalam proses redirect callback Google OAuth, biarkan useEffect Google Auth yang memprosesnya
    if (typeof window !== 'undefined' && window.location.search && window.location.search.includes('google_auth=')) {
      return;
    }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('presentrain_token') : null;
    if (token) {
      api.getCurrentUser()
        .then((backendUser) => {
          if (backendUser && backendUser.id) {
            const refreshedUser = {
              ...backendUser,
              qrToken: backendUser.user_qr_token || backendUser.qrToken,
            };
            offlineSync.cacheUserProfile(refreshedUser);
            setCurrentUser(refreshedUser);
          } else {
            const cached = offlineSync.getCachedUserProfile();
            if (cached && cached.id) {
              setCurrentUser(cached);
            } else {
              offlineSync.clearSession();
              setCurrentUser(null);
            }
          }
        })
        .catch(() => {
          const cached = offlineSync.getCachedUserProfile();
          if (cached && cached.id) {
            setCurrentUser(cached);
          } else {
            offlineSync.clearSession();
            setCurrentUser(null);
          }
        })
        .finally(() => {
          setIsVerifyingSession(false);
        });
    } else {
      offlineSync.clearSession();
      setCurrentUser(null);
      setIsVerifyingSession(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const googleAuth = urlParams.get('google_auth');
      if (googleAuth) {
        offlineSync.setOnboarded(true);
        setIsOnboarded(true);
      }

      if (googleAuth === 'success') {
        const token = urlParams.get('token');
        if (token) {
          setIsVerifyingSession(true);
          localStorage.setItem('presentrain_token', token);

          // Jika parameter user tersedia langsung dari backend redirect, langsung hydrate user tanpa menunggu request API
          const urlUserId = urlParams.get('user_id');
          const urlName = urlParams.get('name');
          const urlEmail = urlParams.get('email');
          const urlRole = urlParams.get('role');
          const urlInstansi = urlParams.get('instansi');
          const urlPhone = urlParams.get('phone');
          const urlAvatar = urlParams.get('avatar');
          const urlQrToken = urlParams.get('qr_token');

          let initialHydratedUser = null;
          if (urlEmail && urlRole) {
            initialHydratedUser = {
              id: urlUserId ? (Number(urlUserId) || urlUserId) : Date.now(),
              name: urlName || 'Peserta Google',
              email: urlEmail,
              role: urlRole || 'participant',
              status: urlParams.get('status') || 'Aktif',
              gender: urlParams.get('gender') || 'L',
              instansi: urlInstansi || '',
              phone: urlPhone || '',
              avatar: urlAvatar || null,
              qrToken: urlQrToken || `ABSEN-PESERTA-GOOGLE-${Date.now()}`,
              user_qr_token: urlQrToken,
            };
            offlineSync.cacheUserProfile(initialHydratedUser);
            handleLoginSuccess(initialHydratedUser);
          }

          window.history.replaceState({}, document.title, window.location.pathname);

          api.getCurrentUser()
            .then((user) => {
              if (user) {
                const mappedUser = {
                  ...user,
                  qrToken: user.user_qr_token || user.qrToken,
                };
                offlineSync.cacheUserProfile(mappedUser);
                handleLoginSuccess(mappedUser);
              } else if (!initialHydratedUser) {
                setGoogleAuthError('Gagal memuat profil akun dari server. Silakan coba lagi.');
              }
            })
            .catch(() => {
              if (!initialHydratedUser) {
                setGoogleAuthError('Terjadi kesalahan jaringan saat memverifikasi sesi Google.');
              }
            })
            .finally(() => {
              setIsVerifyingSession(false);
            });
        }
      } else if (googleAuth === 'needs_completion') {
        const tempToken = urlParams.get('temp_token');
        const name = urlParams.get('name') || '';
        const email = urlParams.get('email') || '';
        const avatar = urlParams.get('avatar') || '';

        const completionObj = { tempToken, name, email, avatar };
        setGoogleCompletionData(completionObj);
        try {
          sessionStorage.setItem('presentrain_google_completion', JSON.stringify(completionObj));
        } catch (e) {}
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsVerifyingSession(false);
      } else if (googleAuth === 'error') {
        const message = urlParams.get('message') || 'Gagal login dengan Google.';
        setGoogleAuthError(message);
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsVerifyingSession(false);
      }
    }
  }, [handleLoginSuccess, setActiveTab]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.getUsers({ per_page: 500 });
      if (res && res.ok && Array.isArray(res.data)) {
        const dbUsers = res.data;
        const participantUsers = dbUsers.filter(u => u.role === 'participant');
        const mappedParticipants = participantUsers.map((u, idx) => ({
          id: u.id ? `USR-${u.id}` : `USR-${idx + 1}`,
          db_id: u.id,
          no: idx + 1,
          name: u.name || '',
          email: u.email || '',
          instansi: u.instansi || '',
          phone: u.phone || '',
          gender: u.gender || 'L',
          role: u.role || 'participant',
          class_id: u.class_id || null,
          className: u.className || (u.class_id ? 'Kelas Khusus' : 'Kelas Umum'),
          classCode: u.classCode || (u.class_id ? 'KLS' : 'KELAS-UMUM'),
          qrToken: u.user_qr_token || u.qrToken || `${u.id || idx + 1}`,
          user_qr_token: u.user_qr_token || u.qrToken || `${u.id || idx + 1}`,
          avatar: u.avatar || '',
          attendances: u.attendances || {},
          status: (u.attendances && Object.values(u.attendances).some(att => att && att.present)) ? 'Hadir' : (u.status || 'Belum'),
          trainingStatus: 'Aktif'
        }));
        setParticipants(mappedParticipants);

        const adminUsers = dbUsers.filter(u => u.role === 'admin' || u.role === 'super_admin');
        const mappedAdmins = adminUsers.map((a, idx) => ({
          id: a.id ? `ADM-${a.id}` : `ADM-${idx + 1}`,
          db_id: a.id,
          name: a.name || '',
          email: a.email || '',
          dept: a.instansi || 'Panitia Pelaksana',
          phone: a.phone || '',
          role: a.role === 'super_admin' ? 'Administrator Utama' : 'Panitia Scanner & Absensi',
          raw_role: a.role,
          assignedSession: 'Semua Sesi',
          status: a.status || 'Aktif',
          canManageAttendance: a.can_manage_attendance !== false,
          canManageGrading: a.can_manage_assessment !== false,
          canManageAssessment: a.can_manage_assessment !== false,
          canManageQuiz: a.can_manage_quiz !== false,
          managedClasses: a.managed_classes || a.managedClasses || [],
          managed_classes_names: a.managed_classes_names || (a.managedClasses ? a.managedClasses.map(c => c.name) : []),
        }));
        setAdminList(mappedAdmins);
      }
    } catch (err) {
      console.warn('Backend getUsers fetch error:', err);
    }
  }, []);

  const loadQuizzes = useCallback(async () => {
    try {
      const res = await api.getQuizzes();
      if (res && res.ok && Array.isArray(res.data)) {
        setQuizzes(res.data);
      }
    } catch (err) {
      console.warn('Backend getQuizzes error:', err);
    }
  }, []);

  const loadQuizSubmissions = useCallback(async () => {
    try {
      const res = await api.getQuizSubmissions();
      if (res && res.ok && Array.isArray(res.data)) {
        setQuizSubmissions(res.data);
      }
    } catch (err) {
      console.warn('Backend getQuizSubmissions error:', err);
    }
  }, []);

  const loadQuizRequests = useCallback(async () => {
    try {
      const res = await api.getQuizRequests();
      if (res && res.ok && Array.isArray(res.data)) {
        setQuizRequests(res.data);
      }
    } catch (err) {
      console.warn('Backend getQuizRequests error:', err);
    }
  }, []);

  const loadAssessments = useCallback(async () => {
    try {
      const res = await api.getAssessments('all');
      if (res && res.ok && res.data && typeof res.data === 'object') {
        setAssessments(res.data);
      }
    } catch (err) {
      console.warn('Backend getAssessments error:', err);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      const res = await api.getTickets();
      if (res && res.ok && Array.isArray(res.data)) {
        setTickets(res.data);
      }
    } catch (err) {
      console.warn('Backend getTickets error:', err);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.getSiteSettings();
      if (res && res.ok && res.data) {
        const s = res.data;
        setSiteSettings(prev => ({
          ...prev,
          siteName: s.app_name || prev.siteName,
          tagline: s.tagline || prev.tagline,
          contactEmail: s.support_email || prev.contactEmail,
          whatsappNumber: s.whatsapp_number || prev.whatsappNumber,
          isMaintenance: s.maintenance_mode === 'true' || s.maintenance_mode === true,
        }));
      }
    } catch (err) {
      console.warn('Backend getSiteSettings error:', err);
    }
  }, []);

  // 1. Initial essential data (Settings & Trainings for public display)
  useEffect(() => {
    loadSettings();
    loadTrainings();
  }, [loadSettings, loadTrainings]);

  // 2. Tab-Aware On-Demand Fetcher with Smart Heartbeat Sync (Zero-Refresh Realtime)
  useEffect(() => {
    if (!currentUser) return;

    const role = currentUser.role;
    const userIdOrToken = currentUser.db_id || currentUser.id || currentUser.user_qr_token || currentUser.qrToken;

    if (role === 'participant') {
      loadQuizzes();
      if (userIdOrToken) {
        api.getUserAttendances(userIdOrToken).then(attRes => {
          if (attRes && attRes.ok && attRes.attendances) {
            setCurrentUser(prev => prev ? ({ ...prev, attendances: attRes.attendances }) : prev);
          }
        }).catch(() => {});
      }
      return;
    }

    // Untuk Admin / Super Admin: muat data sesuai tab yang sedang aktif
    const syncCurrentActiveTab = () => {
      if (document.visibilityState !== 'visible') return; // Pause saat tab browser di-minimize

      // Super Admin tabs: overview, classes_management, events_management, quiz_management,
      //   admin_management, participants_master, system_stats, guide, helpdesk, profile, settings
      // Admin tabs: sessions_scanner, participants, recap, rekap_data, rekap_penilaian,
      //   quizzes, helpdesk, guide, profile, settings
      switch (activeTab) {
        case 'participants_master':   // super_admin: master-peserta
        case 'admin_management':      // super_admin: admin-panitia
        case 'participants':          // admin: daftar-peserta
        case 'sessions_scanner':      // admin: scanner-barcode
          loadUsers();
          loadAssessments();
          break;

        case 'quiz_management':       // super_admin: kelola-kuis
        case 'quizzes':               // admin: quiz-evaluasi
          loadQuizzes();
          loadQuizSubmissions();
          loadQuizRequests();
          break;

        case 'rekap_penilaian':       // admin: rekap-penilaian
          loadAssessments();
          loadUsers();
          break;

        case 'recap':                 // admin: rekap-presensi
        case 'rekap_data':            // alias rekap-presensi
          loadUsers();
          break;

        case 'helpdesk':              // both roles
          loadTickets();
          break;

        case 'classes_management':    // super_admin: kelas (Kelola Kelas & Peserta)
          loadUsers();
          loadQuizzes();
          loadQuizSubmissions();
          loadAssessments();
          break;

        case 'system_stats':          // super_admin: audit-log
          // audit log dimuat oleh komponen langsung, cukup sinkronkan trainings
          loadTrainings();
          break;

        case 'events_management':     // super_admin: event-sesi
          loadTrainings();
          break;

        case 'overview':              // super_admin: beranda/dashboard
        default:
          loadTrainings();
          loadUsers();
          loadAssessments();
          break;
      }
    };

    // Jalankan segera saat pertama login / tab berpindah
    syncCurrentActiveTab();

    // Heartbeat sync setiap 12 detik tanpa refresh manual, hanya saat tab aktif/visible
    const syncInterval = setInterval(syncCurrentActiveTab, 12000);

    return () => clearInterval(syncInterval);
  }, [currentUser?.id, currentUser?.role, activeTab, loadQuizzes, loadUsers, loadQuizSubmissions, loadQuizRequests, loadAssessments, loadTickets, loadTrainings]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const userToSync = currentUser || offlineSync.getCachedUserProfile();
      const role = userToSync?.role;
      const userIdOrToken = userToSync?.db_id || userToSync?.id || userToSync?.user_qr_token || userToSync?.qrToken;

      const refreshPromises = [
        loadTrainings()
      ];

      if (role === 'participant') {
        if (userIdOrToken) {
          refreshPromises.push(
            api.getUserAttendances(userIdOrToken).then(attRes => {
              if (attRes && attRes.ok && attRes.attendances) {
                setCurrentUser(prev => prev ? ({ ...prev, attendances: attRes.attendances }) : prev);
              }
            })
          );
        }
        refreshPromises.push(loadQuizzes());
      } else {
        refreshPromises.push(loadUsers());
        refreshPromises.push(loadAssessments());
        refreshPromises.push(loadQuizzes());
        refreshPromises.push(loadQuizSubmissions());
        refreshPromises.push(loadQuizRequests());
        refreshPromises.push(loadTickets());
      }

      await Promise.allSettled(refreshPromises);
    } catch (err) {
      console.warn('Error during manual refresh:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTrainings, loadUsers, loadQuizzes, loadQuizSubmissions, loadQuizRequests, loadAssessments, loadTickets, currentUser]);

  const activeAdminPermission = adminList.find(a => a.email === currentUser?.email) || {
    canManageAttendance: currentUser?.can_manage_attendance !== false,
    canManageGrading: currentUser?.can_manage_assessment !== false,
    canManageAssessment: currentUser?.can_manage_assessment !== false,
    canManageQuiz: currentUser?.can_manage_quiz !== false,
  };

  if (isVerifyingSession) {
    return (
      <CoolLoader
        text="Menghubungkan ke Server PresenTrain..."
        fullScreen={true}
      />
    );
  }

  return (
    <FeedbackProvider>
      <AuthProvider handleUserLoggedIn={handleUserLoggedIn} handleUserLoggedOut={handleUserLoggedOut}>
        <ClassProvider currentUser={currentUser}>
          <div className="h-[100dvh] w-full bg-slate-50 text-slate-900 flex flex-col font-sans antialiased overflow-hidden">
            <ErrorBoundary>
              <AppRoutes
                currentUser={currentUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                publicSesiIndex={publicSesiIndex}
                urlToken={urlToken}
                urlQuizCode={urlQuizCode}
                isOnboarded={isOnboarded}
                setIsOnboarded={setIsOnboarded}
                siteSettings={siteSettings}
                setSiteSettings={setSiteSettings}
                overrideMaintenance={overrideMaintenance}
                setOverrideMaintenance={setOverrideMaintenance}
                googleCompletionData={googleCompletionData}
                setGoogleCompletionData={setGoogleCompletionData}
                googleAuthError={googleAuthError}
                setGoogleAuthError={setGoogleAuthError}
                handleLoginSuccess={handleLoginSuccess}
                handleLogout={handleLogout}
                handleUpdateUser={handleUpdateUser}
                training={training}
                setTraining={setTraining}
                refreshTraining={loadTrainings}
                participants={participants}
                setParticipants={setParticipants}
                refreshParticipants={loadUsers}
                adminList={adminList}
                setAdminList={setAdminList}
                quizzes={quizzes}
                setQuizzes={setQuizzes}
                refreshQuizzes={loadQuizzes}
                quizSubmissions={quizSubmissions}
                setQuizSubmissions={setQuizSubmissions}
                refreshQuizSubmissions={loadQuizSubmissions}
                quizRequests={quizRequests}
                setQuizRequests={setQuizRequests}
                refreshQuizRequests={loadQuizRequests}
                assessments={assessments}
                setAssessments={setAssessments}
                refreshAssessments={loadAssessments}
                tickets={tickets}
                setTickets={setTickets}
                refreshTickets={loadTickets}
                activeAdminPermission={activeAdminPermission}
                setIsFullQROpen={setIsFullQROpen}
                onRefresh={handleRefreshAll}
                isRefreshing={isRefreshing}
              />
            </ErrorBoundary>

            {/* Fullscreen QR Modal */}
            {isFullQROpen && currentUser && (
              <FullQRModal
                user={currentUser}
                onClose={() => setIsFullQROpen(false)}
              />
            )}
          </div>
        </ClassProvider>
      </AuthProvider>
    </FeedbackProvider>
  );
}
