import React from 'react';
import { Wrench, Sparkles, LogIn, RefreshCw } from 'lucide-react';

export default function MaintenanceScreen({ siteSettings, onAdminAccess }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between items-center p-6 select-none relative overflow-hidden font-sans">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Logo */}
      <div className="w-full max-w-4xl flex justify-between items-center z-10 pt-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-700 flex items-center justify-center shadow-lg overflow-hidden shrink-0 p-1">
            <img 
              src={siteSettings?.logoUrl || '/logo/logo.png'} 
              alt={siteSettings?.siteName || 'Logo'} 
              className="w-full h-full object-contain" 
            />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight">{siteSettings?.siteName || 'PresenTrain'}</h1>
            <p className="text-[11px] font-medium text-emerald-300">System Presensi Digital</p>
          </div>
        </div>

        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 animate-spin" />
          <span>MODUS MAINTENANCE ACTIVE</span>
        </span>
      </div>

      {/* Main Content Card */}
      <div className="my-auto max-w-md w-full text-center space-y-6 z-10 py-8">
        
        <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 flex items-center justify-center shadow-2xl relative animate-pulse">
          <Wrench className="w-12 h-12" />
          <Sparkles className="w-6 h-6 text-emerald-400 absolute -top-2 -right-2" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-block">
            Sistem Sedang Dalam Perbaikan
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            Pemeliharaan Berkala
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed pt-2">
            {siteSettings?.maintenanceMsg || 'Sistem presensi sedang dalam pemeliharaan berkala untuk peningkatan performa. Silakan kembali beberapa saat lagi.'}
          </p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/80 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Bantuan & Informasi Hubungi:</p>
          <p className="font-mono text-emerald-400">{siteSettings?.contactEmail || 'support@presentrain.com'}</p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang Halaman</span>
          </button>

          <button
            onClick={onAdminAccess}
            className="text-xs text-slate-400 hover:text-emerald-300 transition-colors flex items-center justify-center space-x-1.5 py-1"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login Khusus Super Admin / Panitia</span>
          </button>
        </div>

      </div>

      {/* Footer Info */}
      <div className="z-10 text-[11px] text-slate-500 text-center">
        © 2026 {siteSettings?.siteName || 'PresenTrain'} • Version {siteSettings?.appVersion || 'v1.2.0'}
      </div>

    </div>
  );
}
