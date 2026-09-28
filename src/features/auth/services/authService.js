import { api } from '@/services/api';
import { offlineSync } from '@/services/offlineSync';

export const authService = {
  async login(email, password) {
    const user = await api.login(email, password);
    if (user) {
      offlineSync.cacheUserProfile(user);
    }
    return user;
  },

  async register(data) {
    return await api.register(data);
  },

  logout() {
    offlineSync.clearSession();
  },

  getCurrentUser() {
    return offlineSync.getCachedUserProfile();
  }
};
