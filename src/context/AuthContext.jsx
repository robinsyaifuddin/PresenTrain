import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { offlineSync } from '@/services/offlineSync';
import { INITIAL_ADMIN_LIST } from '@/data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children, handleUserLoggedIn, handleUserLoggedOut }) {
  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('presentrain_token');
  const initialUser = typeof window !== 'undefined' && hasToken ? offlineSync.getCachedUserProfile() : null;
  const [currentUser, setCurrentUser] = useState(initialUser);

  const initialOnboarded = !!initialUser || (typeof window !== 'undefined' && offlineSync.isOnboarded());
  const [isOnboarded, setIsOnboarded] = useState(initialOnboarded);

  const [siteSettings, setSiteSettings] = useState({
    siteName: 'PresenTrain',
    tagline: 'Sistem Presensi & Evaluasi Training Perkaderan HMI',
    logoUrl: '/logo/logo.png',
    logoLetter: 'P',
    isMaintenance: false,
    maintenanceMsg: 'Sistem presensi sedang dalam pemeliharaan berkala untuk peningkatan kualitas layanan. Silakan kembali beberapa saat lagi.',
    contactEmail: 'support@presentrain.com',
    whatsappNumber: '62887437525303',
    appVersion: 'v1.2.0'
  });

  const [adminList, setAdminList] = useState(INITIAL_ADMIN_LIST);

  const handleLogout = useCallback(() => {
    offlineSync.clearSession();
    setCurrentUser(null);
    if (handleUserLoggedOut) handleUserLoggedOut();
  }, [handleUserLoggedOut]);

  const handleLoginSuccess = useCallback((userObj) => {
    offlineSync.cacheUserProfile(userObj);
    offlineSync.setOnboarded(true);
    setIsOnboarded(true);
    setCurrentUser(userObj);
    if (handleUserLoggedIn) handleUserLoggedIn(userObj);
  }, [handleUserLoggedIn]);

  const handleUpdateUser = useCallback((updatedUser) => {
    offlineSync.cacheUserProfile(updatedUser);
    setCurrentUser(updatedUser);
  }, []);

  const activeAdminPermission = adminList.find(a => a.email === currentUser?.email) || {
    canManageAttendance: currentUser?.can_manage_attendance !== false,
    canManageGrading: currentUser?.can_manage_assessment !== false,
    canManageAssessment: currentUser?.can_manage_assessment !== false,
    canManageQuiz: currentUser?.can_manage_quiz !== false,
  };

  const value = {
    currentUser,
    setCurrentUser,
    isOnboarded,
    setIsOnboarded,
    siteSettings,
    setSiteSettings,
    adminList,
    setAdminList,
    activeAdminPermission,
    handleLoginSuccess,
    handleLogout,
    handleUpdateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
