/**
 * Utility functions for date formatting in PresenTrain
 */

export function formatDate(dateString, options = {}) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const defaultOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      locale: 'id-ID',
      ...options,
    };

    return date.toLocaleDateString(defaultOptions.locale, {
      day: defaultOptions.day,
      month: defaultOptions.month,
      year: defaultOptions.year,
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timeString) {
  if (!timeString) return '-';
  return timeString.substring(0, 5) + ' WIB';
}
