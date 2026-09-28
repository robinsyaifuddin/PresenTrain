import { api } from '@/services/api';

export const administratorService = {
  async getParticipants() {
    return await api.getTrainings();
  },

  async verifyPresence(qrCode) {
    return await api.verifyQRToken(qrCode);
  }
};
