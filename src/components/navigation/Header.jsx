import React, { useState } from 'react';
import { 
  LogOut, User, BookOpen, ChevronDown, 
  Settings, LifeBuoy, RotateCw, GraduationCap
} from 'lucide-react';
import { useFeedback } from '@/context/FeedbackContext';
import { useClass } from '@/context/ClassContext';

export default function Header({ user, onLogout, siteSettings, activeTab, setActiveTab, onRefresh, isRefreshing }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLocalRefreshing, setIsLocalRefreshing] = useState(false);
  const { showNotification } = useFeedback() || {};
  const { selectedClassId, setSelectedClassId, classes } = useClass() || {};
  const isAdmin = user?.role === 'admin';

  const adminClasses = React.useMemo(() => {
    if (isAdmin) {
      if (Array.isArray(user?.managed_classes) && user.managed_classes.length > 0) {
        return user.managed_classes;
      }
      return classes || [];
    }
    return classes || [];
  }, [isAdmin, user?.managed_classes, classes]);

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

  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-xs px-4 py-3 sticky top-0 z-30 font-sans">
      <header className="flex items-center justify-between">
        
        {/* Mobile Logo Brand */}
        <div className="flex items-center space-x-2 min-w-0">
          <img 
            src={siteSettings?.logoUrl || '/logo/logo.png'} 
            alt={siteSettings?.siteName || 'Logo'} 
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" 
          />
          {isAdmin && adminClasses.length > 0 && (
            <div className="flex items-center min-w-0 max-w-[150px] sm:max-w-[200px]">
              <select
                value={selectedClassId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (typeof setSelectedClassId === 'function') setSelectedClassId(val);
                  if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('presentrain_selected_class_id', val);
                    window.dispatchEvent(new Event('presentrain_class_changed'));
                    window.dispatchEvent(new CustomEvent('presentrain_open_class', { detail: { classId: val } }));
                  }
                }}
                className="bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-900 text-[11px] font-bold py-1 px-2 rounded-lg outline-none truncate cursor-pointer transition-colors max-w-full"
                title="Pilih Kelas Aktif"
              >
                {adminClasses.map(c => {
                  const displayName = (c.name || '').replace(/\s*\(\s*KLS[^\)]*\)/gi, '').trim() || c.name;
                  return (
                    <option key={c.id} value={String(c.id)}>{displayName}</option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Right Navigation: Refresh Button & User Profile Avatar Dropdown */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
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

          {/* User Profile Avatar Dropdown */}
          {user && (
            <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1.5 p-1 rounded-md hover:bg-slate-100 transition-colors"
              title="Menu Profil & Panduan"
            >
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-7 h-7 rounded-full object-cover border border-emerald-300 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex items-center justify-center text-emerald-600 p-1">
                  <User className="w-6 h-6 text-emerald-600 stroke-[2.2]" />
                </div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
            </button>

            {/* DROPDOWN MENU */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* Header: User Info */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center space-x-2.5">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-8 h-8 rounded-full object-cover border border-emerald-300 shrink-0 shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex items-center justify-center text-emerald-600 shrink-0">
                        <User className="w-5 h-5 text-emerald-600 stroke-[2.2]" />
                      </div>
                    )}
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{user.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate font-medium">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Options (Clean Green Icons, No Background Shapes) */}
                <div className="p-1 space-y-1">
                  
                  {/* Item 1: Profil Saya */}
                  <button
                    type="button"
                    onClick={() => handleNavigate('profile')}
                    className={`w-full px-3 py-2 rounded-md text-xs flex items-center transition-all group cursor-pointer ${
                      activeTab === 'profile'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-bold shadow-xs'
                        : 'hover:bg-emerald-50/70 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <User className={`w-4 h-4 shrink-0 stroke-[2.2] transition-colors ${activeTab === 'profile' ? 'text-emerald-700' : 'text-emerald-600 group-hover:text-emerald-700'}`} />
                      <div className="text-left">
                        <span className={`block font-bold ${activeTab === 'profile' ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'}`}>Profil Saya</span>
                        <span className="block text-[9px] font-normal text-slate-400">Lihat & kelola data akun</span>
                      </div>
                    </div>
                  </button>

                  {/* Item 2: Pengaturan */}
                  <button
                    type="button"
                    onClick={() => handleNavigate('settings')}
                    className={`w-full px-3 py-2 rounded-md text-xs flex items-center transition-all group cursor-pointer ${
                      activeTab === 'settings'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-bold shadow-xs'
                        : 'hover:bg-emerald-50/70 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Settings className={`w-4 h-4 shrink-0 stroke-[2.2] transition-colors ${activeTab === 'settings' ? 'text-emerald-700' : 'text-emerald-600 group-hover:text-emerald-700'}`} />
                      <div className="text-left">
                        <span className={`block font-bold ${activeTab === 'settings' ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'}`}>Pengaturan</span>
                        <span className="block text-[9px] font-normal text-slate-400">Konfigurasi & preferensi sistem</span>
                      </div>
                    </div>
                  </button>

                  {/* Item 3: Helpdesk & Layanan */}
                  <button
                    type="button"
                    onClick={() => handleNavigate('helpdesk')}
                    className={`w-full px-3 py-2 rounded-md text-xs flex items-center transition-all group cursor-pointer ${
                      activeTab === 'helpdesk'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-bold shadow-xs'
                        : 'hover:bg-emerald-50/70 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <LifeBuoy className={`w-4 h-4 shrink-0 stroke-[2.2] transition-colors ${activeTab === 'helpdesk' ? 'text-emerald-700' : 'text-emerald-600 group-hover:text-emerald-700'}`} />
                      <div className="text-left">
                        <span className={`block font-bold ${activeTab === 'helpdesk' ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'}`}>Helpdesk & Layanan</span>
                        <span className="block text-[9px] font-normal text-slate-400">Pusat bantuan & lapor kendala</span>
                      </div>
                    </div>
                  </button>

                  {/* Item 4: Panduan Penggunaan */}
                  <button
                    type="button"
                    onClick={() => handleNavigate('guide')}
                    className={`w-full px-3 py-2 rounded-md text-xs flex items-center transition-all group cursor-pointer ${
                      activeTab === 'guide'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-bold shadow-xs'
                        : 'hover:bg-emerald-50/70 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <BookOpen className={`w-4 h-4 shrink-0 stroke-[2.2] transition-colors ${activeTab === 'guide' ? 'text-emerald-700' : 'text-emerald-600 group-hover:text-emerald-700'}`} />
                      <div className="text-left">
                        <span className={`block font-bold ${activeTab === 'guide' ? 'text-emerald-950' : 'text-slate-900 group-hover:text-emerald-900'}`}>Panduan Penggunaan</span>
                        <span className="block text-[9px] font-normal text-slate-400">Petunjuk & cara pakai sistem</span>
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
                    className="w-full px-3 py-2 rounded-md hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-semibold text-xs flex items-center transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <LogOut className="w-4 h-4 text-emerald-600 group-hover:text-rose-600 transition-colors shrink-0 stroke-[2.2]" />
                      <div className="text-left">
                        <span className="block font-bold text-slate-900 group-hover:text-rose-600">Keluar Akun</span>
                        <span className="block text-[9px] font-normal text-slate-400">Logout dari akun</span>
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
    </div>
  );
}
