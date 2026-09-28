import React, { useState, useEffect, useCallback } from 'react';
import FullQRModal from '@/features/peserta/components/FullQRModal';
import { 
  INITIAL_TRAINING, 
  INITIAL_PARTICIPANTS, 
  INITIAL_ADMIN_LIST, 
  INITIAL_QUIZZES, 
  INITIAL_QUIZ_SUBMISSIONS, 
  INITIAL_QUIZ_GRADE_REQUESTS,
  INITIAL_ASSESSMENTS
} from '@/data/mockData';
import { api } from '@/services/api';
import { offlineSync } from '@/services/offlineSync';
import { useAppRouter } from '@/routes/useAppRouter';
import { AuthProvider } from '@/context/AuthContext';
import AppRoutes from '@/routes/AppRoutes';

export default function App() {
  const initialUser = typeof window !== 'undefined' ? offlineSync.getCachedUserProfile() : null;
  const [currentUser, setCurrentUser] = useState(initialUser);

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

  const initialOnboarded = !!urlQuizCode || !!initialUser || (typeof window !== 'undefined' && offlineSync.isOnboarded());
  const [isOnboarded, setIsOnboarded] = useState(initialOnboarded);

  const [googleCompletionData, setGoogleCompletionData] = useState(null);
  const [googleAuthError, setGoogleAuthError] = useState('');
  const [training, setTraining] = useState(INITIAL_TRAINING);
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [adminList, setAdminList] = useState(INITIAL_ADMIN_LIST);
  const [quizzes, setQuizzes] = useState(INITIAL_QUIZZES);
  const [quizSubmissions, setQuizSubmissions] = useState(INITIAL_QUIZ_SUBMISSIONS);
  const [quizRequests, setQuizRequests] = useState(INITIAL_QUIZ_GRADE_REQUESTS);
  const [assessments, setAssessments] = useState(INITIAL_ASSESSMENTS);
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
    setCurrentUser(userObj);
    handleUserLoggedIn(userObj);
  }, [handleUserLoggedIn]);

  const handleUpdateUser = useCallback((updatedUser) => {
    offlineSync.cacheUserProfile(updatedUser);
    setCurrentUser(updatedUser);
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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const googleAuth = urlParams.get('google_auth');

      if (googleAuth === 'success') {
        const token = urlParams.get('token');
        if (token) {
          localStorage.setItem('presentrain_token', token);
          window.history.replaceState({}, document.title, window.location.pathname);
          api.getCurrentUser().then((user) => {
            if (user) {
              handleLoginSuccess({
                ...user,
                qrToken: user.user_qr_token || user.qrToken,
              });
            }
          });
        }
      } else if (googleAuth === 'needs_completion') {
        const tempToken = urlParams.get('temp_token');
        const name = urlParams.get('name') || '';
        const email = urlParams.get('email') || '';
        const avatar = urlParams.get('avatar') || '';

        setGoogleCompletionData({ tempToken, name, email, avatar });
        setIsOnboarded(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (googleAuth === 'error') {
        const message = urlParams.get('message') || 'Gagal login dengan Google.';
        setGoogleAuthError(message);
        setIsOnboarded(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const cached = offlineSync.getCachedUserProfile();
    if (cached && !currentUser) {
      setCurrentUser(cached);
      setIsOnboarded(true);
      setActiveTab(cached.role === 'super_admin' ? 'overview' : cached.role === 'admin' ? 'sessions_scanner' : 'overview');
    }

    const loadTrainings = async () => {
      try {
        const data = await api.getTrainings();
        if (data && data.length > 0) {
          const t = data[0];
          setTraining({
            id: t.code || `TR-${t.id}`,
            title: t.title,
            dateRange: `${t.start_date} - ${t.end_date}`,
            location: t.location || 'Sekretariat HMI Cabang Bandar Lampung',
            totalParticipants: t.total_participants || t.registrations_count || INITIAL_PARTICIPANTS.length,
            status: t.status,
            sessions: (t.sessions && t.sessions.length > 0) ? t.sessions.map(s => ({
              id: s.session_code || `SES-${s.id}`,
              db_id: s.id,
              title: s.title,
              speaker: s.speaker || '-',
              room: s.room || 'Aula Utama Sekretariat HMI Cabang Bandar Lampung',
              time: s.start_time && s.end_time ? `${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)} WIB` : '08:00 - 10:00 WIB',
              date: s.session_date,
              status: s.status
            })) : INITIAL_TRAINING.sessions
          });
        }
      } catch (err) {
        console.warn('Backend training fetch fallback to INITIAL_TRAINING:', err);
      }
    };

    loadTrainings();
  }, [currentUser, handleLoginSuccess, setActiveTab]);

  const activeAdminPermission = adminList.find(a => a.email === currentUser?.email) || {
    canManageAttendance: true,
    canManageQuiz: true
  };

  return (
    <AuthProvider handleUserLoggedIn={handleUserLoggedIn} handleUserLoggedOut={handleUserLoggedOut}>
      <div className="h-screen h-[100dvh] w-full bg-slate-50 text-slate-900 flex flex-col font-sans antialiased overflow-hidden">
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
          participants={participants}
          setParticipants={setParticipants}
          adminList={adminList}
          setAdminList={setAdminList}
          quizzes={quizzes}
          setQuizzes={setQuizzes}
          quizSubmissions={quizSubmissions}
          setQuizSubmissions={setQuizSubmissions}
          quizRequests={quizRequests}
          setQuizRequests={setQuizRequests}
          assessments={assessments}
          setAssessments={setAssessments}
          activeAdminPermission={activeAdminPermission}
          setIsFullQROpen={setIsFullQROpen}
        />

        {/* Fullscreen QR Modal */}
        {isFullQROpen && currentUser && (
          <FullQRModal
            user={currentUser}
            onClose={() => setIsFullQROpen(false)}
          />
        )}
      </div>
    </AuthProvider>
  );
}
