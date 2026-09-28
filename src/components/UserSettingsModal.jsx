import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Settings, Moon, Sun, Bell, Volume2, Globe, Shield, 
  X, CheckCircle2, Save, Sparkles, Monitor, Smartphone
} from 'lucide-react';

export default function UserSettingsModal({ isOpen, onClose, siteSettings }) {
  if (!isOpen) return null;

  const [themeMode, setThemeMode] = useState('light'); // 'light' | 'dark' | 'system'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [emailNotify, setEmailNotify] = useState(true);
  const [pushNotify, setPushNotify] = useState(true);
  const [language, setLanguage] = useState('id'); // 'id' | 'en'

  const [notification, setNotification] = useState('');

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (err) {}

    showToast('Pengaturan preferensi sistem berhasil disimpan!');
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
        
        {/* Toast Notification */}
        {notification && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Modal Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-extrabold text-xl flex items-center justify-center shadow-md shrink-0">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/30">
                Konfigurasi Sistem
              </span>
              <h3 className="text-lg font-extrabold mt-0.5">Pengaturan Preferensi</h3>
              <p className="text-xs text-blue-100">Sesuaikan tampilan, suara scanner, dan notifikasi</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveSettings} className="p-6 space-y-5 text-xs">
          
          {/* Section 1: Tema Tampilan */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Tema Mode Tampilan</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light', label: 'Mode Terang', icon: Sun, color: 'text-amber-500' },
                { id: 'dark', label: 'Mode Gelap', icon: Moon, color: 'text-indigo-500' },
                { id: 'system', label: 'Ikuti OS', icon: Monitor, color: 'text-slate-500' },
              ].map(t => {
                const IconComp = t.icon;
                const isSel = themeMode === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeMode(t.id)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                      isSel 
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold ring-2 ring-blue-100' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <IconComp className={`w-5 h-5 ${t.color}`} />
                    <span className="text-[11px]">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Pemindaian QR & Suara Beep */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Volume2 className="w-4 h-4 text-emerald-600" />
              <span>Pemindaian & Efek Kamera QR Scanner</span>
            </label>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block font-bold text-slate-900">Suara Audio Beep Presensi</span>
                  <span className="block text-[10px] text-slate-500">Memutar efek suara saat QR Token berhasil terisi</span>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="h-px bg-slate-200" />

              <div className="flex items-center justify-between">
                <div>
                  <span className="block font-bold text-slate-900">Getaran / Umpan Balik Vibrasi Haptic</span>
                  <span className="block text-[10px] text-slate-500">Getarkan perangkat HP panitia saat pemindaian</span>
                </div>
                <input
                  type="checkbox"
                  checked={vibrationEnabled}
                  onChange={(e) => setVibrationEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Notifikasi & Bahasa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Bahasa Aplikasi</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-blue-600"
              >
                <option value="id">Bahasa Indonesia (ID)</option>
                <option value="en">English (US)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Bell className="w-3.5 h-3.5 text-purple-600" />
                <span>Notifikasi Email & Sistem</span>
              </label>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-300 flex items-center justify-between">
                <span className="font-medium text-slate-700">Email Presensi</span>
                <input
                  type="checkbox"
                  checked={emailNotify}
                  onChange={(e) => setEmailNotify(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* App Info Footer */}
          <div className="p-3 bg-slate-100 rounded-2xl text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>PresenTrain System Version</span>
            <span className="font-bold text-slate-800">{siteSettings?.appVersion || 'v1.2.0'}</span>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
