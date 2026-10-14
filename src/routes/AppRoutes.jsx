import React from 'react';
import ProtectedRoute from '@/routes/ProtectedRoute';
import AdminUtamaLayout from '@/layouts/AdminUtamaLayout';
import AdminLayout from '@/layouts/AdminLayout';
import PesertaLayout from '@/layouts/PesertaLayout';

import AuthScreen from '@/features/auth/components/AuthScreen';
import Onboarding from '@/features/auth/components/Onboarding';
import MaintenanceScreen from '@/components/views/MaintenanceScreen';
import PublicSessionView from '@/components/views/PublicSessionView';

import SuperAdminDashboard from '@/features/admin-utama/components/SuperAdminDashboard';
import AdminDashboard from '@/features/administrator/components/AdminDashboard';
import PesertaDashboard from '@/features/peserta/components/PesertaDashboard';

import { normalizeRole } from '@/routes/routeConfig';
import { offlineSync } from '@/services/offlineSync';

export default function AppRoutes({
  currentUser,
  activeTab,
  setActiveTab,
  publicSesiIndex,
  urlToken,
  urlQuizCode,
  isOnboarded,
  setIsOnboarded,
  siteSettings,
  setSiteSettings,
  overrideMaintenance,
  setOverrideMaintenance,
  googleCompletionData,
  setGoogleCompletionData,
  googleAuthError,
  setGoogleAuthError,
  handleLoginSuccess,
  handleLogout,
  handleUpdateUser,
  training,
  setTraining,
  refreshTraining,
  participants,
  setParticipants,
  refreshParticipants,
  adminList,
  setAdminList,
  quizzes,
  setQuizzes,
  refreshQuizzes,
  quizSubmissions,
  setQuizSubmissions,
  refreshQuizSubmissions,
  quizRequests,
  setQuizRequests,
  refreshQuizRequests,
  assessments,
  setAssessments,
  refreshAssessments,
  tickets,
  setTickets,
  refreshTickets,
  activeAdminPermission,
  setIsFullQROpen,
  onRefresh,
  isRefreshing
}) {
  const isShowMaintenanceScreen = siteSettings.isMaintenance && 
    (!currentUser || currentUser.role !== 'super_admin') && 
    !overrideMaintenance;

  if (publicSesiIndex !== null) {
    return (
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
    );
  }

  if (isShowMaintenanceScreen) {
    return (
      <MaintenanceScreen
        siteSettings={siteSettings}
        onAdminAccess={() => {
          setOverrideMaintenance(true);
          setIsOnboarded(true);
        }}
      />
    );
  }

  // Check if current path is explicit login or register route, or returning from Google OAuth
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const hasGoogleAuthParam = typeof window !== 'undefined' && window.location.search.includes('google_auth');
  const isAuthRoute = currentPath.startsWith('/login') || currentPath.startsWith('/register') || currentPath.startsWith('/masuk') || currentPath.startsWith('/daftar') || hasGoogleAuthParam;

  if (!currentUser && !isOnboarded && !isAuthRoute) {
    return (
      <Onboarding
        onFinish={() => {
          offlineSync.setOnboarded(true);
          setIsOnboarded(true);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/login');
          }
        }}
        siteSettings={siteSettings}
      />
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={handleLoginSuccess}
        siteSettings={siteSettings}
        urlQuizCode={urlQuizCode}
        googleCompletionData={googleCompletionData}
        onClearGoogleCompletion={() => {
          setGoogleCompletionData(null);
          try {
            sessionStorage.removeItem('presentrain_google_completion');
          } catch (e) {}
        }}
        googleAuthError={googleAuthError}
        onClearGoogleError={() => setGoogleAuthError('')}
        initialAuthMode={currentPath.startsWith('/register') || currentPath.startsWith('/daftar') ? 'register' : 'login'}
      />
    );
  }

  const role = normalizeRole(currentUser.role);

  if (role === 'super_admin') {
    return (
      <ProtectedRoute currentUser={currentUser} allowedRoles={['super_admin']}>
        <AdminUtamaLayout
          user={currentUser}
          userPermissions={activeAdminPermission}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          siteSettings={siteSettings}
          onUpdateUser={handleUpdateUser}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        >
          <SuperAdminDashboard
            user={currentUser}
            onUpdateUser={handleUpdateUser}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            training={training}
            setTraining={setTraining}
            refreshTraining={refreshTraining}
            participants={participants}
            setParticipants={setParticipants}
            refreshParticipants={refreshParticipants}
            siteSettings={siteSettings}
            setSiteSettings={setSiteSettings}
            adminList={adminList}
            setAdminList={setAdminList}
            quizzes={quizzes}
            setQuizzes={setQuizzes}
            refreshQuizzes={refreshQuizzes}
            quizSubmissions={quizSubmissions}
            setQuizSubmissions={setQuizSubmissions}
            refreshQuizSubmissions={refreshQuizSubmissions}
            quizRequests={quizRequests}
            setQuizRequests={setQuizRequests}
            refreshQuizRequests={refreshQuizRequests}
            assessments={assessments}
            setAssessments={setAssessments}
            refreshAssessments={refreshAssessments}
            tickets={tickets}
            setTickets={setTickets}
            refreshTickets={refreshTickets}
          />
        </AdminUtamaLayout>
      </ProtectedRoute>
    );
  }

  if (role === 'admin') {
    return (
      <ProtectedRoute currentUser={currentUser} allowedRoles={['admin']}>
        <AdminLayout
          user={currentUser}
          userPermissions={activeAdminPermission}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          siteSettings={siteSettings}
          onUpdateUser={handleUpdateUser}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        >
          <AdminDashboard
            training={training}
            refreshTraining={refreshTraining}
            participants={participants}
            setParticipants={setParticipants}
            refreshParticipants={refreshParticipants}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            siteSettings={siteSettings}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            userPermissions={activeAdminPermission}
            quizzes={quizzes}
            setQuizzes={setQuizzes}
            refreshQuizzes={refreshQuizzes}
            quizSubmissions={quizSubmissions}
            setQuizSubmissions={setQuizSubmissions}
            refreshQuizSubmissions={refreshQuizSubmissions}
            quizRequests={quizRequests}
            setQuizRequests={setQuizRequests}
            refreshQuizRequests={refreshQuizRequests}
            assessments={assessments}
            setAssessments={setAssessments}
            refreshAssessments={refreshAssessments}
            tickets={tickets}
            setTickets={setTickets}
            refreshTickets={refreshTickets}
          />
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute currentUser={currentUser} allowedRoles={['participant']}>
      <PesertaLayout
        user={currentUser}
        userPermissions={activeAdminPermission}
        activeTab={activeTab || 'overview'}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        siteSettings={siteSettings}
        onUpdateUser={handleUpdateUser}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      >
        <PesertaDashboard
          user={currentUser}
          onUpdateUser={handleUpdateUser}
          participants={participants}
          setParticipants={setParticipants}
          refreshParticipants={refreshParticipants}
          training={training}
          refreshTraining={refreshTraining}
          activeTab={activeTab || 'overview'}
          setActiveTab={setActiveTab}
          onOpenFullQR={() => setIsFullQROpen(true)}
          siteSettings={siteSettings}
          quizzes={quizzes}
          refreshQuizzes={refreshQuizzes}
          quizSubmissions={quizSubmissions}
          setQuizSubmissions={setQuizSubmissions}
          refreshQuizSubmissions={refreshQuizSubmissions}
          urlQuizCode={urlQuizCode}
          tickets={tickets}
          setTickets={setTickets}
          refreshTickets={refreshTickets}
        />
      </PesertaLayout>
    </ProtectedRoute>
  );
}
