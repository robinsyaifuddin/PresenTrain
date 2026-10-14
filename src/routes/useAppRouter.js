/**
 * useAppRouter.js
 * Custom Router Hook untuk sinkronisasi URL semantic, role prefixes,
 * deep linking, dan proteksi hak akses (Role-Based Protected Route).
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  ROLE_PREFIXES, 
  formatRouteUrl, 
  getDefaultTabForRole, 
  resolveCurrentRoute 
} from './routeConfig';

export function useAppRouter(currentUser, initialQuizCode = null) {
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return {
        tabId: currentUser ? getDefaultTabForRole(currentUser.role) : '',
        routeType: 'dashboard',
        publicSesiIndex: null,
        urlToken: null,
        urlQuizCode: initialQuizCode,
      };
    }

    const currentPath = window.location.pathname;
    const resolved = resolveCurrentRoute(currentPath, currentUser);

    if (resolved.type === 'public_session') {
      return {
        tabId: '',
        routeType: 'public_session',
        publicSesiIndex: resolved.sessionIndex,
        urlToken: resolved.urlToken,
        urlQuizCode: null,
      };
    }

    if (resolved.type === 'quiz') {
      return {
        tabId: 'quizzes',
        routeType: 'quiz',
        publicSesiIndex: null,
        urlToken: null,
        urlQuizCode: resolved.quizCode,
      };
    }

    if (currentUser) {
      const tabId = resolved.tabId || (initialQuizCode ? 'quizzes' : getDefaultTabForRole(currentUser.role));
      return {
        tabId,
        routeType: 'dashboard',
        publicSesiIndex: null,
        urlToken: null,
        urlQuizCode: initialQuizCode,
      };
    }

    return {
      tabId: initialQuizCode ? 'quizzes' : '',
      routeType: 'auth',
      publicSesiIndex: null,
      urlToken: null,
      urlQuizCode: initialQuizCode,
    };
  };

  const [routerState, setRouterState] = useState(getInitialState);

  // Fungsi sinkronisasi URL tanpa reload halaman (SPA Push State)
  const syncUrl = useCallback((role, tabId, replace = false) => {
    if (typeof window === 'undefined' || !role) return;

    const targetUrl = formatRouteUrl(role, tabId);
    if (window.location.pathname !== targetUrl) {
      if (replace) {
        window.history.replaceState({ role, tabId }, '', targetUrl);
      } else {
        window.history.pushState({ role, tabId }, '', targetUrl);
      }
    }
  }, []);

  // Helper to clear any lingering notification from previous views
  const dismissNotifications = () => {
    if (typeof window !== 'undefined') {
      if (typeof window.presentrainCloseNotification === 'function') {
        window.presentrainCloseNotification();
      }
      window.dispatchEvent(new Event('presentrain:clearnotifications'));
    }
  };

  // Handler pergantian Tab dari Komponen UI (Sidebar, BottomNav, TopBar, dsb)
  const setActiveTab = useCallback((nextTabId) => {
    dismissNotifications();

    setRouterState((prev) => {
      if (prev.tabId === nextTabId) return prev;
      return {
        ...prev,
        tabId: nextTabId,
        routeType: 'dashboard',
      };
    });

    if (currentUser && currentUser.role) {
      syncUrl(currentUser.role, nextTabId, false);
    }
  }, [currentUser, syncUrl]);

  // Handler saat user berhasil Login
  const handleUserLoggedIn = useCallback((userObj) => {
    dismissNotifications();
    const defaultTab = getDefaultTabForRole(userObj.role);
    setRouterState({
      tabId: defaultTab,
      routeType: 'dashboard',
      publicSesiIndex: null,
      urlToken: null,
      urlQuizCode: initialQuizCode,
    });
    syncUrl(userObj.role, defaultTab, true);
  }, [initialQuizCode, syncUrl]);

  // Handler saat user Logout
  const handleUserLoggedOut = useCallback(() => {
    dismissNotifications();
    setRouterState({
      tabId: '',
      routeType: 'auth',
      publicSesiIndex: null,
      urlToken: null,
      urlQuizCode: null,
    });
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Listen Event Browser Back/Forward (PopState)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      dismissNotifications();
      const currentPath = window.location.pathname;
      const resolved = resolveCurrentRoute(currentPath, currentUser);

      if (resolved.type === 'public_session') {
        setRouterState({
          tabId: '',
          routeType: 'public_session',
          publicSesiIndex: resolved.sessionIndex,
          urlToken: resolved.urlToken,
          urlQuizCode: null,
        });
        return;
      }

      if (resolved.type === 'quiz') {
        setRouterState({
          tabId: 'quizzes',
          routeType: 'quiz',
          publicSesiIndex: null,
          urlToken: null,
          urlQuizCode: resolved.quizCode,
        });
        return;
      }

      if (resolved.type === 'dashboard' && currentUser) {
        if (resolved.isRedirectRequired && resolved.redirectPath) {
          window.history.replaceState({}, '', resolved.redirectPath);
        }
        setRouterState((prev) => ({
          ...prev,
          tabId: resolved.tabId,
          routeType: 'dashboard',
        }));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // Initial URL Normalization / Role Guard Enforcement saat pertama kali mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname;
    const resolved = resolveCurrentRoute(currentPath, currentUser);

    if (resolved.type === 'dashboard' && currentUser) {
      const targetTab = resolved.tabId || getDefaultTabForRole(currentUser.role);
      const targetUrl = formatRouteUrl(currentUser.role, targetTab);
      setRouterState((prev) => ({
        ...prev,
        tabId: targetTab,
        routeType: 'dashboard',
      }));
      if (currentPath !== targetUrl) {
        window.history.replaceState({ role: currentUser.role, tabId: targetTab }, '', targetUrl);
      }
    } else if (resolved.type === 'auth' && !currentUser) {
      const hasGoogleAuthParam = typeof window !== 'undefined' && window.location.search.includes('google_auth');
      const isExplicitAuth = currentPath.startsWith('/login') || 
                             currentPath.startsWith('/register') || 
                             currentPath.startsWith('/masuk') || 
                             currentPath.startsWith('/daftar') || 
                             currentPath.startsWith('/quiz') || 
                             currentPath.startsWith('/sesi-') || 
                             currentPath.startsWith('/ABSEN-SESI-') ||
                             hasGoogleAuthParam;
      if (!isExplicitAuth && currentPath !== '/') {
        window.history.replaceState({}, '', '/');
      }
    }
  }, [currentUser]);

  return {
    activeTab: routerState.tabId,
    setActiveTab,
    routeType: routerState.routeType,
    publicSesiIndex: routerState.publicSesiIndex,
    urlToken: routerState.urlToken,
    urlQuizCode: routerState.urlQuizCode,
    handleUserLoggedIn,
    handleUserLoggedOut,
  };
}
