// API client service with graceful offline/demo fallbacks

const getBackendUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    return import.meta.env.VITE_BACKEND_URL || window.location.origin;
  }
  return '';
};

export const api = {
  login: async (email, password) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  register: async (userData) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  completeGoogleRegistration: async (data) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/google/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return { ok: response.ok, data: resData };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  scanAttendance: async (token, sessionId, foundUser) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/attendance/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, sessionId, userId: foundUser?.id }),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  syncOfflineBatch: async () => {
    try {
      const pendingScans = localStorage.getItem('presentrain_pending_scans');
      if (!pendingScans) return { ok: true, count: 0 };
      const parsed = JSON.parse(pendingScans);
      const response = await fetch(`${getBackendUrl()}/api/attendance/sync-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsed }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.removeItem('presentrain_pending_scans');
      }
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  getSiteSettings: async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/settings`);
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  }
};
