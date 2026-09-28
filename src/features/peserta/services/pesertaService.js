import { api } from '@/services/api';

export const pesertaService = {
  async getMySchedule() {
    return await api.getTrainings();
  },

  async getMyAttendance() {
    return [];
  }
};
