import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

/**
 * QueueStatusModal / QueueStatusBanner
 * Komponen UI interaktif untuk menampilkan progress antrean kepada user.
 */
export const QueueStatusModal = ({
  isOpen,
  status, // 'pending' | 'processing' | 'completed' | 'failed' | 'timeout'
  progressPercent = 0,
  message = '',
  onClose,
  title = 'Sedang Memproses Antrean',
}) => {
  if (!isOpen) return null;

  const isPendingOrProcessing = status === 'pending' || status === 'processing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed' || status === 'timeout';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
        <div className="flex flex-col items-center text-center">
          {/* Status Icon */}
          <div className="mb-4">
            {isPendingOrProcessing && (
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-8 h-8" />
              </div>
            )}
            {isFailed && (
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {isCompleted ? 'Berhasil Selesai!' : isFailed ? 'Gagal Diproses' : title}
          </h3>

          {/* Message */}
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 mb-4 leading-relaxed">
            {message || (isPendingOrProcessing ? 'Permintaan Anda sedang dalam antrean server. Harap tunggu sejenak...' : '')}
          </p>

          {/* Progress Bar */}
          {isPendingOrProcessing && (
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(10, progressPercent)}%` }}
              ></div>
            </div>
          )}

          {isPendingOrProcessing && (
            <div className="flex items-center text-xs text-slate-400 gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Memproses tanpa menutup halaman...</span>
            </div>
          )}

          {/* Action Button */}
          {(isCompleted || isFailed) && (
            <button
              onClick={onClose}
              className={`mt-6 w-full py-2.5 px-4 rounded-xl font-medium text-white shadow-md transition-all ${
                isCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isCompleted ? 'Tutup / Lanjutkan' : 'Tutup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueStatusModal;
