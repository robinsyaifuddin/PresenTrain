import { api } from '@/services/api';

export const adminUtamaService = {
  async getSystemOverview() {
    return await api.getTrainings();
  },

  async updateSettings(settings) {
    return settings;
  }
};
