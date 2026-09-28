// LocalStorage key constants
const USER_CACHE_KEY = 'presentrain_cached_user';
const PENDING_SCANS_KEY = 'presentrain_pending_scans';
const ONBOARDED_KEY = 'presentrain_onboarded';
const LAST_ACTIVE_KEY = 'presentrain_last_active';
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 Hari

export const offlineSync = {
  // 1. User Profile Cache
  cacheUserProfile: (userObj) => {
    try {
      if (typeof window === 'undefined') return;
      if (userObj) {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userObj));
        localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      } else {
        localStorage.removeItem(USER_CACHE_KEY);
      }
    } catch (e) {
      console.warn('Failed to cache user profile to localStorage', e);
    }
  },

  getCachedUserProfile: () => {
    try {
      if (typeof window === 'undefined') return null;
      const data = localStorage.getItem(USER_CACHE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  getCachedUser: () => {
    return offlineSync.getCachedUserProfile();
  },

  clearSession: () => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem('presentrain_token');
      localStorage.removeItem(LAST_ACTIVE_KEY);
    } catch (e) {
      console.warn('Failed to clear session', e);
    }
  },

  // 2. Onboarding Status
  isOnboarded: () => {
    try {
      if (typeof window === 'undefined') return true;
      return localStorage.getItem(ONBOARDED_KEY) === 'true';
    } catch (e) {
      return true;
    }
  },

  setOnboarded: (status = true) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(ONBOARDED_KEY, status ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to set onboarded flag', e);
    }
  },

  // 3. 30-Day Session Expiry Watcher
  updateLastActive: () => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    } catch (e) {
      // ignore
    }
  },

  isSessionExpired: () => {
    try {
      if (typeof window === 'undefined') return false;
      const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
      if (!lastActive) return false;
      const elapsed = Date.now() - parseInt(lastActive, 10);
      return elapsed > SESSION_EXPIRY_MS;
    } catch (e) {
      return false;
    }
  },

  // 4. Offline Scans Queue
  getPendingScans: () => {
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(PENDING_SCANS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  savePendingScan: (scanData) => {
    try {
      if (typeof window === 'undefined') return;
      const current = offlineSync.getPendingScans();
      current.push({ ...scanData, timestamp: new Date().toISOString() });
      localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to save pending scan', e);
    }
  },

  clearPendingScans: () => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(PENDING_SCANS_KEY);
    } catch (e) {
      console.warn('Failed to clear pending scans', e);
    }
  }
};
