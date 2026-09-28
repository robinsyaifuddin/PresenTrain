import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Clock, LogOut, User, BookOpen, ChevronDown, 
  ShieldCheck, QrCode, Smartphone, Settings, LifeBuoy
} from 'lucide-react';

export default function DesktopTopBar({ user, onLogout, siteSettings, activeTab, setActiveTab }) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
      
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setDateStr(`${day}/${month}/${year}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (tabId) => {
    setIsDropdownOpen(false);
    if (setActiveTab) {
      setActiveTab(tabId);
    }
  };

  return (
    <header className="hidden md:flex h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 items-center justify-between shrink-0 w-full z-20 select-none">
      
      {/* Left Title / Branding */}
      <div className="flex items-center space-x-3">
        <h2 className="text-sm font-semibold text-slate-800 tracking-tight">
          {siteSettings?.siteName || 'PresenTrain'} — Dashboard
        </h2>
      </div>

      {/* Right Info Widgets & User Avatar Menu */}
      <div className="flex items-center space-x-4">
        
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60 font-mono">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>{timeStr || '08.05 WIB'}</span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>{dateStr || '24/09/2026'}</span>
        </div>

        {/* USER AVATAR / PERSON ICON WITH DROPDOWN */}
        {user && (
          <div className="relative pl-2 border-l border-slate-200" ref={dropdownRef}>
            
            {/* User Avatar Button */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 group active:scale-95 cursor-pointer"
              title="Menu Profil & Pengaturan"
            >
              <User className="w-6 h-6 text-emerald-600 group-hover:scale-105 transition-transform stroke-[2.2]" />
              
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
            </button>

            {/* DROPDOWN MENU */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* Header: User Detail */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.2]" />
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{user.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate font-medium">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items (Clean Green Icons, No Background Shapes) */}
                <div className="p-1.5 space-y-1">
                  
                  {/* Item 1: Profil Saya */}
                  <button
                    type="button"
                    onClick={() => handleNavigate('profile')}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all group cursor-pointer ${
                      activeTab === 'profile'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-bold shadow-xs'
                        : 'hover:bg-emerald-50/70 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <User className={`w-5 h-5 shrink-0 stroke-[2.2] transition-colors ${activeTab === 'profile' ? 'text-emerald-700' : 'text-emerald-600 group-hover:text-emerald-700'}`} />
                      <div className="text-left">
                        <span className={`block font-bold ${activeTab === 'profile' ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'}`}>Profil Saya</span>
                        <span className="block text-[10px] font-normal text-slate-400">Lihat & kelola data akun</span>
                      </div>
                    </div>
                  </button>

                  {/* Item 2: Pengaturan */}
                  <button
                    type="button"
                    onClick={() => handleNavigate('settings')}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all group cursor-pointer ${
                      activeTab === 'settings'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-bold shadow-xs'
                        : 'hover:bg-emerald-50/70 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <Settings className={`w-5 h-5 shrink-0 stroke-[2.2] transition-colors ${activeTab === 'settings' ? 'text-emerald-700' : 'text-emerald-600 group-hover:text-emerald-700'}`} />
                      <div className="text-left">
                        <span className={`block font-bold ${activeTab === 'settings' ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'}`}>Pengaturan</span>
                        <span className="block text-[10px] font-normal text-slate-400">Konfigurasi & preferensi sistem</span>
                      </div>
                    </div>
                  </button>

                  {/* Item 3: Helpdesk & Layanan */}
                  <button
                    type="button"
                    onClick={() => handleNavigate('helpdesk')}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all group cursor-pointer ${
                      activeTab === 'helpdesk'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-bold shadow-xs'
                        : 'hover:bg-emerald-50/70 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <LifeBuoy className={`w-5 h-5 shrink-0 stroke-[2.2] transition-colors ${activeTab === 'helpdesk' ? 'text-emerald-700' : 'text-emerald-600 group-hover:text-emerald-700'}`} />
                      <div className="text-left">
                        <span className={`block font-bold ${activeTab === 'helpdesk' ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'}`}>Helpdesk & Layanan</span>
                        <span className="block text-[10px] font-normal text-slate-400">Pusat bantuan & lapor kendala</span>
                      </div>
                    </div>
                  </button>

                  {/* Item 4: Panduan Penggunaan */}
                  <button
                    type="button"
                    onClick={() => handleNavigate('guide')}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all group cursor-pointer ${
                      activeTab === 'guide'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-bold shadow-xs'
                        : 'hover:bg-emerald-50/70 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <BookOpen className={`w-5 h-5 shrink-0 stroke-[2.2] transition-colors ${activeTab === 'guide' ? 'text-emerald-700' : 'text-emerald-600 group-hover:text-emerald-700'}`} />
                      <div className="text-left">
                        <span className={`block font-bold ${activeTab === 'guide' ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'}`}>Panduan Penggunaan</span>
                        <span className="block text-[10px] font-normal text-slate-400">Petunjuk & cara pakai sistem</span>
                      </div>
                    </div>
                  </button>

                  {/* Item 5: Keluar Akun */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-semibold text-xs flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3.5">
                      <LogOut className="w-5 h-5 text-emerald-600 group-hover:text-rose-600 transition-colors shrink-0 stroke-[2.2]" />
                      <div className="text-left">
                        <span className="block font-bold text-slate-900 group-hover:text-rose-600">Keluar Akun</span>
                        <span className="block text-[10px] font-normal text-slate-400">Logout dari dashboard</span>
                      </div>
                    </div>
                  </button>

                </div>

              </div>
            )}

          </div>
        )}

      </div>

    </header>
  );
}
