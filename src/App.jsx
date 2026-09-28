import React, { useState } from 'react';
import Onboarding from './components/Onboarding';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DesktopTopBar from './components/DesktopTopBar';
import BottomNav from './components/BottomNav';
import PesertaDashboard from './components/PesertaDashboard';
import AdminDashboard from './components/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import FullQRModal from './components/FullQRModal';
import MaintenanceScreen from './components/MaintenanceScreen';
import PublicSessionView from './components/PublicSessionView';
import { 
  INITIAL_TRAINING, 
  INITIAL_PARTICIPANTS, 
  INITIAL_ADMIN_LIST, 
  INITIAL_QUIZZES, 
  INITIAL_QUIZ_SUBMISSIONS, 
  INITIAL_QUIZ_GRADE_REQUESTS 
} from './data/mockData';

export default function App() {
  // Check URL routes
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const tokenMatch = currentPath.match(/\/(ABSEN-SESI-(\d+)[^\/]*)/i);
  const sesiMatch = currentPath.match(/\/sesi-(\d+)/i);
  const quizMatch = currentPath.match(/\/quiz\/([a-zA-Z0-9_-]+)/i);

  let publicSesiIndex = null;
  let urlToken = null;
  let urlQuizCode = quizMatch ? quizMatch[1] : null;

  if (tokenMatch) {
    publicSesiIndex = parseInt(tokenMatch[2], 10);
    urlToken = tokenMatch[1];
  } else if (sesiMatch) {
    publicSesiIndex = parseInt(sesiMatch[1], 10);
  }

  // App Global States
  const [isOnboarded, setIsOnboarded] = useState(!!urlQuizCode);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(urlQuizCode ? 'quizzes' : '');
  const [training, setTraining] = useState(INITIAL_TRAINING);
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [adminList, setAdminList] = useState(INITIAL_ADMIN_LIST);
  const [quizzes, setQuizzes] = useState(INITIAL_QUIZZES);
  const [quizSubmissions, setQuizSubmissions] = useState(INITIAL_QUIZ_SUBMISSIONS);
  const [quizRequests, setQuizRequests] = useState(INITIAL_QUIZ_GRADE_REQUESTS);
  const [isFullQROpen, setIsFullQROpen] = useState(false);
  const [overrideMaintenance, setOverrideMaintenance] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Derive active admin permissions
  const activeAdminPermission = adminList.find(a => a.email === currentUser?.email) || {
    canManageAttendance: true,
    canManageQuiz: true
  };

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

  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    if (userObj.role === 'super_admin') {
      setActiveTab('overview');
    } else if (userObj.role === 'admin') {
      const adminPerm = adminList.find(a => a.email === userObj.email);
      if (adminPerm && adminPerm.canManageAttendance === false && adminPerm.canManageQuiz === true) {
        setActiveTab('quizzes');
      } else {
        setActiveTab('sessions_scanner');
      }
    } else {
      if (urlQuizCode) {
        setActiveTab('quizzes');
      } else {
        setActiveTab('overview');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('');
    setOverrideMaintenance(false);
  };

  const isShowMaintenanceScreen = siteSettings.isMaintenance && 
    (!currentUser || currentUser.role !== 'super_admin') && 
    !overrideMaintenance;

  return (
    <div className="h-screen h-[100dvh] w-full bg-slate-50 text-slate-900 flex flex-col font-sans antialiased overflow-hidden">
      {publicSesiIndex !== null ? (
        <PublicSessionView
          sessionIndex={publicSesiIndex}
          urlToken={urlToken}
          training={training}
          siteSettings={siteSettings}
          onGoBack={() => {
            window.history.pushState({}, '', '/');
            window.location.reload();
          }}
        />
      ) : isShowMaintenanceScreen ? (
        <MaintenanceScreen
          siteSettings={siteSettings}
          onAdminAccess={() => {
            setOverrideMaintenance(true);
            setIsOnboarded(true);
          }}
        />
      ) : !isOnboarded ? (
        <Onboarding
          onFinish={() => setIsOnboarded(true)}
          siteSettings={siteSettings}
        />
      ) : !currentUser ? (
        <AuthScreen
          onLoginSuccess={handleLoginSuccess}
          siteSettings={siteSettings}
          urlQuizCode={urlQuizCode}
        />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden min-h-0">
          
          {/* Desktop Left Sidebar */}
          <Sidebar
            user={currentUser}
            userPermissions={activeAdminPermission}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            siteSettings={siteSettings}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />

          {/* Main Workspace Container */}
          <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-slate-50">
            
            {/* Desktop Top Header Bar */}
            <DesktopTopBar
              user={currentUser}
              onLogout={handleLogout}
              siteSettings={siteSettings}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onUpdateUser={(updated) => setCurrentUser(updated)}
            />

            {/* Mobile Top Header */}
            <div className="block md:hidden shrink-0 w-full z-40 relative">
              <Header
                user={currentUser}
                onLogout={handleLogout}
                siteSettings={siteSettings}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onUpdateUser={(updated) => setCurrentUser(updated)}
              />
            </div>

            {/* Scrollable Main Viewport */}
            <main className="flex-1 min-h-0 overflow-y-auto mobile-scroll-viewport no-scrollbar pb-32 md:pb-8">
              {currentUser.role === 'super_admin' && (
                <SuperAdminDashboard
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  training={training}
                  setTraining={setTraining}
                  participants={participants}
                  setParticipants={setParticipants}
                  siteSettings={siteSettings}
                  setSiteSettings={setSiteSettings}
                  adminList={adminList}
                  setAdminList={setAdminList}
                  quizzes={quizzes}
                  setQuizzes={setQuizzes}
                  quizSubmissions={quizSubmissions}
                  setQuizSubmissions={setQuizSubmissions}
                  quizRequests={quizRequests}
                  setQuizRequests={setQuizRequests}
                />
              )}

              {currentUser.role === 'admin' && (
                <AdminDashboard
                  training={training}
                  participants={participants}
                  setParticipants={setParticipants}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  siteSettings={siteSettings}
                  currentUser={currentUser}
                  userPermissions={activeAdminPermission}
                  quizzes={quizzes}
                  setQuizzes={setQuizzes}
                  quizSubmissions={quizSubmissions}
                  setQuizSubmissions={setQuizSubmissions}
                  quizRequests={quizRequests}
                  setQuizRequests={setQuizRequests}
                />
              )}

              {currentUser.role === 'participant' && (
                <PesertaDashboard
                  user={currentUser}
                  onUpdateUser={(updated) => setCurrentUser(updated)}
                  participants={participants}
                  setParticipants={setParticipants}
                  training={training}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onOpenFullQR={() => setIsFullQROpen(true)}
                  siteSettings={siteSettings}
                  quizzes={quizzes}
                  quizSubmissions={quizSubmissions}
                  setQuizSubmissions={setQuizSubmissions}
                  urlQuizCode={urlQuizCode}
                />
              )}
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="block md:hidden">
              <BottomNav
                role={currentUser.role}
                userPermissions={activeAdminPermission}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>

            {/* Fullscreen QR Modal */}
            {isFullQROpen && (
              <FullQRModal
                user={currentUser}
                onClose={() => setIsFullQROpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
