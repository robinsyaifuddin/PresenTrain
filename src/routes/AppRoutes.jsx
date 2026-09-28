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
  participants,
  setParticipants,
  adminList,
  setAdminList,
  quizzes,
  setQuizzes,
  quizSubmissions,
  setQuizSubmissions,
  quizRequests,
  setQuizRequests,
  assessments,
  setAssessments,
  activeAdminPermission,
  setIsFullQROpen
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

  if (!isOnboarded) {
    return (
      <Onboarding
        onFinish={() => {
          setIsOnboarded(true);
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
        onClearGoogleCompletion={() => setGoogleCompletionData(null)}
        googleAuthError={googleAuthError}
        onClearGoogleError={() => setGoogleAuthError('')}
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
        >
          <SuperAdminDashboard
            user={currentUser}
            onUpdateUser={handleUpdateUser}
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
        >
          <AdminDashboard
            training={training}
            participants={participants}
            setParticipants={setParticipants}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            siteSettings={siteSettings}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            userPermissions={activeAdminPermission}
            quizzes={quizzes}
            setQuizzes={setQuizzes}
            quizSubmissions={quizSubmissions}
            setQuizSubmissions={setQuizSubmissions}
            quizRequests={quizRequests}
            setQuizRequests={setQuizRequests}
            assessments={assessments}
            setAssessments={setAssessments}
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        siteSettings={siteSettings}
        onUpdateUser={handleUpdateUser}
      >
        <PesertaDashboard
          user={currentUser}
          onUpdateUser={handleUpdateUser}
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
      </PesertaLayout>
    </ProtectedRoute>
  );
}
