import axios from 'axios';
// API client service for PresenTrain REST API Backend

export const getBackendUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocalhost) {
      // Saat berjalan di komputer lokal (dev), arahkan ke backend lokal agar tidak terblokir CORS
      return import.meta.env.VITE_BACKEND_LOCAL_URL || 'http://localhost:8000';
    }
    // Saat di deployment / production, gunakan domain website
    return import.meta.env.VITE_BACKEND_URL || window.location.origin;
  }
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
};

const getAuthHeaders = () => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('presentrain_token') : null;
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// In-flight promise map for deduplication
const inFlightRequests = new Map();
const apiCache = new Map();
const DEFAULT_CACHE_TTL = 3000; // 3 seconds cache for rapid duplicated calls

export const clearApiCache = (pattern = null) => {
  if (!pattern) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.includes(pattern)) {
        apiCache.delete(key);
      }
    }
  }
};

export const safeFetchJson = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `FETCH:${method}:${url}`;

  // Check cache for GET requests
  if (method === 'GET') {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < (options.ttl || DEFAULT_CACHE_TTL)) {
      return cached.data;
    }
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(url, options);
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = {
          message: response.status >= 500
            ? `Layanan server backend sedang mengalami beban tinggi (HTTP ${response.status}). Mohon tunggu sebentar.`
            : 'Gagal memproses respon server.'
        };
      }
      const resObj = { ok: response.ok, status: response.status, data };
      if (method === 'GET' && response.ok) {
        apiCache.set(cacheKey, { data: resObj, timestamp: Date.now() });
      } else if (method !== 'GET') {
        clearApiCache();
      }
      return resObj;
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (method === 'GET') {
    inFlightRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
};


const axiosInstance = axios.create({
  baseURL: getBackendUrl() + '/api',
});

axiosInstance.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('presentrain_token') : null;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Axios response interceptor to invalidate cache on state mutations
axiosInstance.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase();
    if (method && method !== 'GET') {
      clearApiCache();
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export const api = {

  // --- Quizzes ---
  getQuizzes: async () => {
    try {
      const res = await axiosInstance.get('/quizzes');
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  createQuiz: async (data) => {
    try {
      const res = await axiosInstance.post('/quizzes', data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  updateQuiz: async (id, data) => {
    try {
      const res = await axiosInstance.put(`/quizzes/${id}`, data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  deleteQuiz: async (id) => {
    try {
      const res = await axiosInstance.delete(`/quizzes/${id}`);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  duplicateQuiz: async (id) => {
    try {
      const res = await axiosInstance.post(`/quizzes/${id}/duplicate`);
      return { ok: true, data: res.data?.data || res.data, message: res.data?.message };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },

  // --- Questions ---
  getQuestions: async (quizId) => {
    try {
      const res = await axiosInstance.get(`/quizzes/${quizId}/questions`);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  createQuestion: async (quizId, data) => {
    try {
      const res = await axiosInstance.post(`/quizzes/${quizId}/questions`, data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  updateQuestion: async (id, data) => {
    try {
      const res = await axiosInstance.put(`/questions/${id}`, data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  deleteQuestion: async (id) => {
    try {
      const res = await axiosInstance.delete(`/questions/${id}`);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // --- QuizSubmissions ---
  startQuiz: async (quizId) => {
    try {
      const res = await axiosInstance.post(`/quizzes/${quizId}/start`);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  submitQuiz: async (quizId, data, options = {}) => {
    try {
      const payload = {
        ...data,
        ...(options.async ? { async: true } : {})
      };
      const res = await axiosInstance.post(`/quizzes/${quizId}/submissions`, payload);
      return { ok: true, data: res.data, status: res.status };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message, status: err.response?.status };
    }
  },
  importQuizScores: async (quizId, payload) => {
    try {
      const res = await axiosInstance.post(`/quizzes/${quizId}/import-scores`, payload);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  revertQuizScore: async (submissionId) => {
    try {
      const res = await axiosInstance.post(`/quiz-submissions/${submissionId}/revert`);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  getQuizSubmissions: async (quizId = null, classId = null) => {
    try {
      let url = quizId ? `/quizzes/${quizId}/submissions` : '/quiz-submissions';
      if (classId) {
        url += (url.includes('?') ? '&' : '?') + `class_id=${classId}`;
      }
      const res = await axiosInstance.get(url);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  // --- Classes Management ---
  getClasses: async () => {
    try {
      const res = await axiosInstance.get('/classes');
      return { ok: true, data: res.data?.data || [], meta: res.data?.meta || {} };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  getClass: async (id) => {
    try {
      const res = await axiosInstance.get(`/classes/${id}`);
      return { ok: true, data: res.data?.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  createClass: async (data) => {
    try {
      const res = await axiosInstance.post('/classes', data);
      return { ok: true, data: res.data?.data, message: res.data?.message };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  updateClass: async (id, data) => {
    try {
      const res = await axiosInstance.put(`/classes/${id}`, data);
      return { ok: true, data: res.data?.data, message: res.data?.message };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  deleteClass: async (id) => {
    try {
      const res = await axiosInstance.delete(`/classes/${id}`);
      return { ok: true, message: res.data?.message };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  assignClassAdmins: async (classId, admins) => {
    try {
      const res = await axiosInstance.put(`/classes/${classId}/admins`, { admins });
      return { ok: true, data: res.data?.data, message: res.data?.message };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  assignAdminToClasses: async (adminId, data) => {
    try {
      const res = await axiosInstance.put(`/classes/admin-assignment/${adminId}`, data);
      return { ok: true, data: res.data?.data, message: res.data?.message };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  addClassParticipants: async (classId, userIds) => {
    try {
      const res = await axiosInstance.post(`/classes/${classId}/participants`, { user_ids: userIds });
      return { ok: true, message: res.data?.message };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  removeClassParticipant: async (classId, userId) => {
    try {
      const res = await axiosInstance.delete(`/classes/${classId}/participants/${userId}`);
      return { ok: true, message: res.data?.message };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  getClassQuizAccess: async (classId) => {
    try {
      const res = await axiosInstance.get(`/classes/${classId}/quiz-access`);
      return { ok: true, data: res.data?.data || [] };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  toggleClassQuizAccess: async (classId, quizId, status) => {
    try {
      const res = await axiosInstance.put(`/classes/${classId}/quiz-access/${quizId}`, { status });
      return { ok: true, data: res.data?.data, message: res.data?.message };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  },
  getQuizRequests: async () => {
    try {
      const res = await axiosInstance.get('/quiz-requests');
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  createQuizRequest: async (data) => {
    try {
      const res = await axiosInstance.post('/quiz-requests', data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  updateQuizRequest: async (id, data) => {
    try {
      const res = await axiosInstance.put(`/quiz-requests/${id}`, data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  deleteQuizRequest: async (id) => {
    try {
      const res = await axiosInstance.delete(`/quiz-requests/${id}`);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  updateQuizSubmission: async (id, data) => {
    try {
      const res = await axiosInstance.put(`/quiz-submissions/${id}`, data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  deleteQuizSubmission: async (id) => {
    try {
      const res = await axiosInstance.delete(`/quiz-submissions/${id}`);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // --- Assessments ---
  getAssessments: async (params = null) => {
    try {
      let url = '/assessments';
      if (typeof params === 'string' && params && params !== 'all') {
        url = `/assessments/${params}`;
      } else if (typeof params === 'object' && params !== null) {
        const q = new URLSearchParams(params).toString();
        if (q) url = `/assessments?${q}`;
      }
      const res = await axiosInstance.get(url);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  saveAssessment: async (data) => {
    try {
      const res = await axiosInstance.post('/assessments', data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  createAssessment: async (data, type = null) => {
    try {
      const res = await axiosInstance.post('/assessments', data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  updateAssessment: async (id, data, type = null) => {
    try {
      const res = await axiosInstance.put(`/assessments/${id}`, data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  syncBatchAssessments: async (items) => {
    try {
      const res = await axiosInstance.post('/assessments/batch-sync', { items });
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  deleteAssessment: async (id, type = null) => {
    try {
      const res = await axiosInstance.delete(`/assessments/${id}`);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // --- Tickets ---
  getTickets: async () => {
    try {
      const res = await axiosInstance.get('/tickets');
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  createTicket: async (data) => {
    try {
      const res = await axiosInstance.post('/tickets', data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  updateTicket: async (id, data) => {
    try {
      const res = await axiosInstance.put(`/tickets/${id}`, data);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  deleteTicket: async (id) => {
    try {
      const res = await axiosInstance.delete(`/tickets/${id}`);
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // Auth APIs
  login: async (email, password) => {
    return safeFetchJson(`${getBackendUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData) => {
    return safeFetchJson(`${getBackendUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(userData),
    });
  },

  completeGoogleRegistration: async (data) => {
    return safeFetchJson(`${getBackendUrl()}/api/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  sendForgotPasswordOtp: async (email) => {
    return safeFetchJson(`${getBackendUrl()}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },

  verifyForgotPasswordOtp: async (email, otp) => {
    return safeFetchJson(`${getBackendUrl()}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
  },

  resetPasswordWithOtp: async (email, otp, new_password) => {
    return safeFetchJson(`${getBackendUrl()}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, otp, new_password }),
    });
  },

  sendChangeEmailOtp: async (new_email) => {
    return safeFetchJson(`${getBackendUrl()}/api/auth/change-email/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ new_email }),
    });
  },

  verifyChangeEmailOtp: async (current_email, new_email, otp) => {
    return safeFetchJson(`${getBackendUrl()}/api/auth/change-email/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ current_email, new_email, otp }),
    });
  },

  getCurrentUser: async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.user || data || null;
    } catch (err) {
      return null;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/user/profile`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  // Training CRUD APIs
  getTrainings: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = `${getBackendUrl()}/api/trainings${query ? '?' + query : ''}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) return null;
      const data = await response.json();
      return Array.isArray(data) ? data : (data?.data || null);
    } catch (err) {
      return null;
    }
  },

  getTrainingById: async (id) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/trainings/${id}`, { headers: getAuthHeaders() });
      const data = await response.json();
      return { ok: response.ok, data: data?.data || data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  createTraining: async (trainingData) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/trainings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(trainingData),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  updateTraining: async (id, trainingData) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/trainings/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(trainingData),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  deleteTraining: async (id) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/trainings/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  // Training Session CRUD APIs
  createSession: async (trainingId, sessionData) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/trainings/${trainingId}/sessions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(sessionData),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  updateSession: async (sessionId, sessionData) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(sessionData),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  deleteSession: async (sessionId) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  // User Management CRUD APIs
  getUsers: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`${getBackendUrl()}/api/users${query ? '?' + query : ''}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data?.data)) {
        list = data.data;
      } else if (Array.isArray(data?.data?.data)) {
        list = data.data.data;
      } else if (Array.isArray(data?.users)) {
        list = data.users;
      }
      return { ok: response.ok, data: list };
    } catch (err) {
      return { ok: false, error: err.message, data: [] };
    }
  },

  createUser: async (userData) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  updateUser: async (id, userData) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  deleteUser: async (id) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  // Attendance Scanning & Verification APIs
  scanAttendance: async (token, sessionId, foundUser, extra = {}) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/attendance/scan`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_qr_token: token,
          token,
          training_session_id: sessionId,
          sessionId,
          userId: foundUser?.db_id || foundUser?.id,
          ...extra
        }),
      });
      const data = await response.json();
      return { ok: response.ok, ...data };
    } catch (err) {
      return { ok: false, status: 'error', isNetworkError: true, error: err.message, message: err.message };
    }
  },

  verifyQRToken: async (qrCode, sessionId) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/attendance/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_qr_token: qrCode, qrCode, training_session_id: sessionId, sessionId }),
      });
      const data = await response.json();
      return { ok: response.ok, ...data };
    } catch (err) {
      return { ok: false, status: 'error', isNetworkError: true, error: err.message, message: err.message };
    }
  },

  activateSessionBarcode: async (sessionId, durationMinutes, sessionToken) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/sessions/${sessionId}/activate-barcode`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ duration_minutes: durationMinutes, durationMinutes, session_token: sessionToken, token: sessionToken }),
      });
      const data = await response.json();
      return { ok: response.ok, ...data };
    } catch (err) {
      return { ok: false, status: 'error', error: err.message };
    }
  },

  deactivateSessionBarcode: async (sessionId) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/sessions/${sessionId}/deactivate-barcode`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, ...data };
    } catch (err) {
      return { ok: false, status: 'error', error: err.message };
    }
  },

  getUserAttendances: async (userIdOrToken = null) => {
    try {
      const url = userIdOrToken ? `${getBackendUrl()}/api/users/${userIdOrToken}/attendances` : `${getBackendUrl()}/api/user/attendances`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, ...data };
    } catch (err) {
      return { ok: false, status: 'error', error: err.message };
    }
  },

  setAttendanceStatus: async (payload) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/attendances/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return { ok: response.ok, ...data };
    } catch (err) {
      return { ok: false, status: 'error', error: err.message };
    }
  },

  syncOfflineBatch: async () => {
    try {
      const pendingScans = localStorage.getItem('presentrain_pending_scans');
      if (!pendingScans) return { ok: true, count: 0 };
      const parsed = JSON.parse(pendingScans);
      const response = await fetch(`${getBackendUrl()}/api/attendance/sync-batch`, {
        method: 'POST',
        headers: getAuthHeaders(),
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

  getSessionStats: async (sessionId) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/sessions/${sessionId}/stats`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, data: data?.data || data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // Site Settings APIs
  getSiteSettings: async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/settings`);
      const data = await response.json();
      return { ok: response.ok, data: data?.data || data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  updateSiteSettings: async (settings) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/settings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  // Queue & Smart Polling Ticket API
  getTicketStatus: async (ticketId) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/queue/tickets/${ticketId}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  // Rekap Excel & Koreksi Data APIs
  getRekapGlobalSheets: async (classId = null) => {
    try {
      const q = classId ? `?class_id=${encodeURIComponent(classId)}` : '';
      const response = await fetch(`${getBackendUrl()}/api/rekap/global-sheets${q}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, data: data?.data || data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  saveRekapCorrections: async (corrections) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/rekap/save-corrections`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ corrections }),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  getRekapAuditLogs: async (classId = null, userId = null) => {
    try {
      const params = new URLSearchParams();
      if (classId) params.append('class_id', classId);
      if (userId) params.append('user_id', userId);
      const q = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${getBackendUrl()}/api/rekap/audit-logs${q}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, data: data?.data || data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  // --- Administrative Activity Logs ---
  getAuditLogs: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '' && val !== 'all') {
          params.append(key, val);
        }
      });
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${getBackendUrl()}/api/audit-logs${queryStr}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  },

  getAuditLogDetail: async (id) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/audit-logs/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, error: err.message };
    }
  }
};

export default api;
