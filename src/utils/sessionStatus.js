/**
 * Utility helper untuk menghitung status sesi secara dinamis berbasis durasi tanggal dan jam.
 * 
 * Aturan:
 * - Sebelum (start_time - toleransi 15 menit): 'Akan Datang' (Mendatang)
 * - Di antara (start_time - 15 menit) s/d end_time: 'Berlangsung'
 * - Setelah end_time: 'Selesai'
 * - Jika status di database eksplisit 'Dibatalkan' atau barcode aktif: diakomodasi.
 */

export function parseSessionDateTime(dateStr, timeStr) {
  if (!dateStr) return null;

  let year, month, day;

  // Handle format DD/MM/YYYY
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
  } 
  // Handle format YYYY-MM-DD
  else if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.trim().split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (timeStr && typeof timeStr === 'string') {
    const cleanTime = timeStr.replace(/WIB|WITA|WIT/gi, '').trim();
    const parts = cleanTime.split(':');
    if (parts.length >= 2) {
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
      seconds = parts[2] ? (parseInt(parts[2], 10) || 0) : 0;
    }
  }

  return new Date(year, month, day, hours, minutes, seconds);
}

/**
 * Menghitung status dinamis sesi pelatihan saat ini.
 * @param {Object} session - Objek sesi pelatihan (memiliki property status, computed_status, date/session_date, time/start_time/end_time)
 * @param {Date} [customNow] - Waktu saat ini (opsional untuk testing)
 * @returns {'Berlangsung' | 'Akan Datang' | 'Selesai'}
 */
export function getDynamicSessionStatus(session, customNow = new Date()) {
  if (!session) return 'Akan Datang';

  // Jika status backend sudah dihitung
  if (session.computed_status && ['Berlangsung', 'Mendatang', 'Selesai'].includes(session.computed_status)) {
    return session.computed_status === 'Mendatang' ? 'Akan Datang' : session.computed_status;
  }

  // Jika admin menutup secara manual atau membatalkan sesi
  const rawStatus = String(session.status || '').toLowerCase();
  if (rawStatus.includes('batal')) return 'Dibatalkan';
  if (rawStatus === 'ditutup_manual') return 'Selesai';

  // Cek apakah ada barcode sesi yang sedang aktif di localStorage
  try {
    const sessionIdx = session.index || session.sessionIndex || (session.id ? String(session.id).replace(/\D/g, '') : null);
    if (sessionIdx) {
      const activeBarcode = localStorage.getItem(`active_barcode_sesi_${sessionIdx}`);
      if (activeBarcode) {
        const parsed = JSON.parse(activeBarcode);
        if (parsed?.expiryTimestamp && Date.now() < parsed.expiryTimestamp) {
          return 'Berlangsung';
        }
      }
    }
  } catch (e) {
    // Ignore storage parse error
  }

  // Cek barcode_expires_at dari backend
  if (session.barcode_expires_at) {
    const expDate = new Date(session.barcode_expires_at);
    if (!isNaN(expDate.getTime()) && customNow < expDate) {
      return 'Berlangsung';
    }
  }

  // Ekstrak tanggal
  const dateStr = session.session_date || session.date;
  if (!dateStr) {
    if (rawStatus.includes('langsung') || rawStatus.includes('aktif')) return 'Berlangsung';
    if (rawStatus.includes('selesai') || rawStatus.includes('tutup')) return 'Selesai';
    return 'Akan Datang';
  }

  // Ekstrak waktu mulai dan selesai
  let startTimeStr = session.start_time;
  let endTimeStr = session.end_time;

  if ((!startTimeStr || !endTimeStr) && session.time) {
    // Format "10:15 - 12:30 WIB"
    const timeParts = session.time.replace(/WIB|WITA|WIT/gi, '').split('-');
    if (timeParts.length === 2) {
      startTimeStr = timeParts[0].trim();
      endTimeStr = timeParts[1].trim();
    }
  }

  if (!startTimeStr || !endTimeStr) {
    if (rawStatus.includes('langsung') || rawStatus.includes('aktif')) return 'Berlangsung';
    if (rawStatus.includes('selesai') || rawStatus.includes('tutup')) return 'Selesai';
    return 'Akan Datang';
  }

  const startDate = parseSessionDateTime(dateStr, startTimeStr);
  const endDate = parseSessionDateTime(dateStr, endTimeStr);

  if (!startDate || !endDate) {
    if (rawStatus.includes('langsung') || rawStatus.includes('aktif')) return 'Berlangsung';
    if (rawStatus.includes('selesai') || rawStatus.includes('tutup')) return 'Selesai';
    return 'Akan Datang';
  }

  // Handle sesi lintas tengah malam jika end < start
  if (endDate.getTime() < startDate.getTime()) {
    endDate.setDate(endDate.getDate() + 1);
  }

  // Toleransi presensi: 15 menit sebelum waktu mulai sudah dibuka
  const toleranceMinutes = 15;
  const openTime = new Date(startDate.getTime() - toleranceMinutes * 60 * 1000);

  const nowMs = customNow.getTime();

  if (nowMs < openTime.getTime()) {
    return 'Akan Datang';
  } else if (nowMs >= openTime.getTime() && nowMs <= endDate.getTime()) {
    return 'Berlangsung';
  } else {
    return 'Selesai';
  }
}
