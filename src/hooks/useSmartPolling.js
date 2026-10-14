import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

/**
 * Custom Hook: useSmartPolling
 * Polling status tiket background queue secara cerdas:
 * 1. Exponential backoff (interval memanjang perlahan 2s -> 3s -> 4s)
 * 2. Tab-visibility aware (pause saat tab tidak aktif agar hemat bandwidth & CPU server)
 * 3. Max retry limit (mencegah infinite request ke server)
 * 4. Callback terstruktur (onSuccess, onError, onProgress)
 */
export const useSmartPolling = ({
  initialInterval = 800, // Cepat dan responsif (0.8 detik)
  maxInterval = 2500,
  backoffFactor = 1.15,
  maxAttempts = 40, // Mencakup durasi antrean hingga ~80-100 detik
  onSuccess = null,
  onError = null,
  persistenceKey = null,
} = {}) => {
  const [ticketId, setTicketId] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'timeout'
  const [progressPercent, setProgressPercent] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const timeoutRef = useRef(null);
  const currentIntervalRef = useRef(initialInterval);
  const attemptsRef = useRef(0);
  const isPollingRef = useRef(false);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(async (currentTicketId) => {
    if (!isPollingRef.current || !currentTicketId) return;

    // Jika tab browser sedang di-minimize/pindah tab, jangan spam server
    if (typeof document !== 'undefined' && document.hidden) {
      timeoutRef.current = setTimeout(() => {
        checkStatus(currentTicketId);
      }, currentIntervalRef.current);
      return;
    }

    attemptsRef.current += 1;
    setAttempts(attemptsRef.current);

    if (attemptsRef.current > maxAttempts) {
      stopPolling();
      setStatus('timeout');
      setMessage('Antrean membutuhkan waktu lebih lama karena server sedang sibuk. Silakan cek berkala.');
      if (onError) onError(new Error('Polling timed out'));
      return;
    }

    try {
      const res = await api.getTicketStatus(currentTicketId);

      if (!isPollingRef.current) return;

      if (res.ok && res.data?.success && res.data?.ticket) {
        const ticket = res.data.ticket;
        setStatus(ticket.status);
        setProgressPercent(ticket.progress_percent || 0);
        setMessage(ticket.message || '');
        setResult(ticket.result || null);

        if (ticket.status === 'completed') {
          stopPolling();
          if (onSuccess) onSuccess(ticket.result, ticket);
          return;
        }

        if (ticket.status === 'failed') {
          stopPolling();
          const errReason = ticket.message || 'Proses antrean gagal.';
          if (onError) onError(new Error(errReason), ticket);
          return;
        }
      } else if (res.status === 404) {
        // Tiket tidak ditemukan
        stopPolling();
        setStatus('failed');
        setMessage('Tiket antrean tidak ditemukan di server.');
        if (onError) onError(new Error('Ticket not found'));
        return;
      }
    } catch (err) {
      console.warn('[SmartPolling] Error checking ticket:', err);
    }

    // Schedule next polling with gentle backoff
    currentIntervalRef.current = Math.min(
      currentIntervalRef.current * backoffFactor,
      maxInterval
    );

    if (isPollingRef.current) {
      timeoutRef.current = setTimeout(() => {
        checkStatus(currentTicketId);
      }, currentIntervalRef.current);
    }
  }, [backoffFactor, maxAttempts, maxInterval, onError, onSuccess, stopPolling]);

  const startPolling = useCallback((newTicketId) => {
    if (!newTicketId) return;
    stopPolling();

    setTicketId(newTicketId);
    setStatus('pending');
    setProgressPercent(10);
    setMessage('Menghubungkan ke antrean server...');
    setResult(null);
    attemptsRef.current = 0;
    setAttempts(0);
    currentIntervalRef.current = initialInterval;
    isPollingRef.current = true;

    if (persistenceKey && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(`polling_ticket_${persistenceKey}`, newTicketId);
      } catch (e) {}
    }

    // Langsung cek pertama kali setelah interval awal
    timeoutRef.current = setTimeout(() => {
      checkStatus(newTicketId);
    }, currentIntervalRef.current);
  }, [checkStatus, initialInterval, persistenceKey, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    if (persistenceKey && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(`polling_ticket_${persistenceKey}`);
      } catch (e) {}
    }
    setTicketId(null);
    setStatus('idle');
    setProgressPercent(0);
    setMessage('');
    setResult(null);
    setAttempts(0);
  }, [persistenceKey, stopPolling]);

  // Restore on mount if persistenceKey exists
  useEffect(() => {
    if (persistenceKey && typeof sessionStorage !== 'undefined') {
      try {
        const savedTicket = sessionStorage.getItem(`polling_ticket_${persistenceKey}`);
        if (savedTicket) {
          startPolling(savedTicket);
        }
      } catch (e) {}
    }
  }, [persistenceKey, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    ticketId,
    status,
    progressPercent,
    message,
    result,
    attempts,
    isLoading: status === 'pending' || status === 'processing',
    isCompleted: status === 'completed',
    isFailed: status === 'failed' || status === 'timeout',
    startPolling,
    stopPolling,
    reset,
  };
};

export default useSmartPolling;
