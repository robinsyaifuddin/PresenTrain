import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import NotificationPopup from '@/components/ui/Feedback/NotificationPopup';
import ConfirmModal from '@/components/ui/Feedback/ConfirmModal';
import CoolLoader from '@/components/ui/Feedback/CoolLoader';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  // Notification State
  const [notification, setNotification] = useState({
    message: '',
    type: 'success',
    duration: 2000,
    id: 0
  });

  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState(null);
  const confirmResolveRef = useRef(null);

  // Global Cool Loader State
  const [loadingConfig, setLoadingConfig] = useState(null);

  const showNotification = useCallback((msgOrConfig, type = 'success', duration = 2000) => {
    if (!msgOrConfig) return;
    let messageText = '';
    let notifType = type;
    let notifDuration = duration;

    if (typeof msgOrConfig === 'object') {
      messageText = msgOrConfig.message || msgOrConfig.title || '';
      notifType = msgOrConfig.type || type;
      notifDuration = msgOrConfig.duration !== undefined ? msgOrConfig.duration : duration;
    } else {
      messageText = String(msgOrConfig);
    }

    const isLoading = notifType === 'loading' || notifType === 'processing';

    setNotification({
      message: messageText,
      type: notifType,
      duration: isLoading ? 0 : notifDuration,
      isLoading: isLoading,
      id: Date.now()
    });
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, message: '' }));
  }, []);

  const confirm = useCallback(({
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    type = 'danger'
  } = {}) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmConfig({
        title,
        message,
        confirmText,
        cancelText,
        type
      });
    });
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(true);
      confirmResolveRef.current = null;
    }
    setConfirmConfig(null);
  }, []);

  const handleCancelAction = useCallback(() => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(false);
      confirmResolveRef.current = null;
    }
    setConfirmConfig(null);
  }, []);

  const showLoading = useCallback((text = 'Memuat Data...', subtext = 'Sistem Presensi & Pelatihan PresenTrain') => {
    setLoadingConfig({ text, subtext });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingConfig(null);
  }, []);

  // Expose to window for seamless global dispatch & dismiss
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.presentrainNotify = showNotification;
      window.presentrainCloseNotification = closeNotification;
      window.presentrainConfirm = confirm;
      window.presentrainShowLoading = showLoading;
      window.presentrainHideLoading = hideLoading;

      const handleClear = () => closeNotification();
      window.addEventListener('presentrain:clearnotifications', handleClear);
      window.addEventListener('popstate', handleClear);

      return () => {
        window.removeEventListener('presentrain:clearnotifications', handleClear);
        window.removeEventListener('popstate', handleClear);
      };
    }
  }, [showNotification, closeNotification, confirm, showLoading, hideLoading]);

  const value = {
    showNotification,
    closeNotification,
    confirm,
    showLoading,
    hideLoading,
    isLoading: !!loadingConfig
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {/* Global Centered Notification Popup (2 Detik, Hijau, Responsif, atau Loading spinner jika antrean) */}
      {notification.message && (
        <NotificationPopup
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          isLoading={notification.isLoading}
          onClose={closeNotification}
        />
      )}

      {/* Global Interactive Confirm Modal (Pilihan Ya/Tidak Menarik) */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={!!confirmConfig}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          type={confirmConfig.type}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
      )}

      {/* Global Cool Spinning Loader (Tema Terang Minimalist) */}
      {loadingConfig && (
        <CoolLoader
          text={loadingConfig.text}
          fullScreen={true}
        />
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    // Return fallback helpers if outside provider
    return {
      showNotification: (msg) => {
        if (typeof window !== 'undefined' && window.presentrainNotify) {
          window.presentrainNotify(msg);
        }
      },
      closeNotification: () => {
        if (typeof window !== 'undefined' && window.presentrainCloseNotification) {
          window.presentrainCloseNotification();
        }
      },
      confirm: async ({ message }) => {
        if (typeof window !== 'undefined' && window.presentrainConfirm) {
          return window.presentrainConfirm({ message });
        }
        return window.confirm(message);
      },
      showLoading: () => {},
      hideLoading: () => {},
      isLoading: false
    };
  }
  return context;
}
