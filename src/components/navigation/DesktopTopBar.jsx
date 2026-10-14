import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Clock, LogOut, User, BookOpen, ChevronDown, 
  ShieldCheck, QrCode, Smartphone, Settings, LifeBuoy, RotateCw
} from 'lucide-react';
import { useFeedback } from '@/context/FeedbackContext';
import { useClass } from '@/context/ClassContext';

export default function DesktopTopBar({ user, onLogout, siteSettings, activeTab, setActiveTab, onRefresh, isRefreshing }) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLocalRefreshing, setIsLocalRefreshing] = useState(false);
  const { showNotification } = useFeedback() || {};
  
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

  const handleRefreshClick = async () => {
    if (isRefreshing || isLocalRefreshing) return;
    setIsLocalRefreshing(true);
    try {
      if (typeof onRefresh === 'function') {
        await onRefresh();
      }
      if (typeof showNotification === 'function') {
        showNotification('Data berhasil diperbarui!');
      }
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setIsLocalRefreshing(false);
    }
  };

  const { selectedClassId, setSelectedClassId, classes } = useClass();
  const isAdmin = user?.role === 'admin';

  // Opsi kelas yang dapat diakses oleh admin
  const adminClasses = React.useMemo(() => {
    if (isAdmin) {
      if (Array.isArray(user?.managed_classes) && user.managed_classes.length > 0) {
        return user.managed_classes;
      }
      return classes;
    }
    return classes;
  }, [isAdmin, user?.managed_classes, classes]);

  return (
    <header className="hidden md:flex h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 items-center justify-between shrink-0 w-full z-20 select-none">
      
      {/* Left Title / Branding Spacer */}
      <div className="flex items-center space-x-3">
        {/* Left area can be empty or brand indicator */}
      </div>

      {/* Right Info Widgets, Class Dropdown, Refresh & User Avatar Menu */}
      <div className="flex items-center space-x-3.5">
        
        {/* Time Badge */}
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 font-mono">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>{timeStr || '08.05 WIB'}</span>
        </div>

        {/* Date Badge */}
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>{dateStr || '24/09/2026'}</span>
        </div>

        {/* Class Switcher for Admin Panitia (Samping Kiri Refresh, Disembunyikan untuk Admin Utama) */}
        {isAdmin && (
          <div className="flex items-center">
            <select
              value={selectedClassId || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClassId(val);
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem('presentrain_selected_class_id', val);
                  window.dispatchEvent(new Event('presentrain_class_changed'));
                  window.dispatchEvent(new CustomEvent('presentrain_open_class', { detail: { classId: val } }));
                }
              }}
              className="bg-transparent text-slate-800 text-xs font-bold py-1 pl-1 pr-6 outline-none transition-colors cursor-pointer border-none hover:text-emerald-700 focus:text-emerald-800"
            >
              {adminClasses.length === 0 ? (
                <option value="NONE" disabled>Belum Ditugaskan Kelas</option>
              ) : (
                adminClasses.map(c => {
                  const displayName = (c.name || '').replace(/\s*\(\s*KLS[^\)]*\)/gi, '').trim() || c.name;
                  return (
                    <option key={c.id} value={String(c.id)}>{displayName}</option>
                  );
                })
              )}
            </select>
          </div>
        )}

        {/* REFRESH ICON BUTTON (SAMPING KIRI ICON PROFIL) */}
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={isRefreshing || isLocalRefreshing}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-emerald-700 transition-all cursor-pointer active:scale-90 disabled:opacity-50 flex items-center justify-center border border-transparent hover:border-emerald-200/50"
          title="Segarkan data terbaru (Tetap di halaman ini)"
        >
          <RotateCw className={`w-4 h-4 ${(isRefreshing || isLocalRefreshing) ? 'animate-spin text-emerald-600' : 'text-slate-600 hover:text-emerald-600'}`} />
        </button>

        {/* USER AVATAR / PERSON ICON WITH DROPDOWN */}
        {user && (
          <div className="relative pl-3 border-l border-slate-200/80" ref={dropdownRef}>
            
            {/* User Avatar Button (No Container Shape Box) */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1.5 py-0.5 px-0.5 group cursor-pointer transition-all"
              title="Menu Profil & Pengaturan"
            >
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-7 h-7 rounded-full object-cover border border-emerald-400/80 group-hover:scale-105 transition-transform shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-6 h-6 text-emerald-600 group-hover:scale-105 transition-transform stroke-[2.2]" />
              )}
              
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
            </button>

            {/* DROPDOWN MENU */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* Header: User Detail */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center space-x-3">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-9 h-9 rounded-full object-cover border border-emerald-300 shrink-0 shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.2]" />
                    )}
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
                    className={`w-full px-3.5 py-2.5 rounded-md text-xs flex items-center justify-between transition-all group cursor-pointer ${
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
                    className={`w-full px-3.5 py-2.5 rounded-md text-xs flex items-center justify-between transition-all group cursor-pointer ${
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
                    className={`w-full px-3.5 py-2.5 rounded-md text-xs flex items-center justify-between transition-all group cursor-pointer ${
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
                    className={`w-full px-3.5 py-2.5 rounded-md text-xs flex items-center justify-between transition-all group cursor-pointer ${
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
                    className="w-full px-3.5 py-2.5 rounded-md hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-semibold text-xs flex items-center justify-between transition-colors group cursor-pointer"
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
