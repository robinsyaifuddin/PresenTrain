// LocalStorage key constants
const USER_CACHE_KEY = 'presentrain_cached_user';
const PENDING_SCANS_KEY = 'presentrain_pending_scans';

export const offlineSync = {
  cacheUserProfile: (userObj) => {
    try {
      if (userObj) {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userObj));
      } else {
        localStorage.removeItem(USER_CACHE_KEY);
      }
    } catch (e) {
      console.warn('Failed to cache user profile to localStorage', e);
    }
  },

  getCachedUser: () => {
    try {
      const data = localStorage.getItem(USER_CACHE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  getPendingScans: () => {
    try {
      const data = localStorage.getItem(PENDING_SCANS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  savePendingScan: (scanData) => {
    try {
      const current = offlineSync.getPendingScans();
      current.push({ ...scanData, timestamp: new Date().toISOString() });
      localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to save pending scan', e);
    }
  },

  clearPendingScans: () => {
    try {
      localStorage.removeItem(PENDING_SCANS_KEY);
    } catch (e) {
      console.warn('Failed to clear pending scans', e);
    }
  }
};
