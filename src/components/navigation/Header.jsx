import React, { useState } from 'react';
import { 
  LogOut, User, BookOpen, ChevronDown, 
  Settings, LifeBuoy 
} from 'lucide-react';

export default function Header({ user, onLogout, siteSettings, activeTab, setActiveTab }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleNavigate = (tabId) => {
    setIsDropdownOpen(false);
    if (setActiveTab) {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-xs px-4 py-3 sticky top-0 z-30 font-sans">
      <header className="flex items-center justify-between">
        
        {/* Mobile Logo Brand */}
        <div className="flex items-center space-x-2.5">
          <img 
            src={siteSettings?.logoUrl || '/logo/logo.png'} 
            alt={siteSettings?.siteName || 'Logo'} 
            className="w-8 h-8 object-contain shrink-0" 
          />
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 leading-none">
              {siteSettings?.siteName || 'PresenTrain'}
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">System Presensi Digital</span>
          </div>
        </div>

        {/* User Profile Avatar Dropdown */}
        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1.5 p-1 rounded-2xl hover:bg-slate-100 transition-colors"
              title="Menu Profil & Panduan"
            >
              <div className="flex items-center justify-center text-emerald-600 p-1">
                <User className="w-6 h-6 text-emerald-600 stroke-[2.2]" />
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
            </button>

            {/* DROPDOWN MENU */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* Header: User Info */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex items-center justify-center text-emerald-600 shrink-0">
                      <User className="w-5 h-5 text-emerald-600 stroke-[2.2]" />
                    </div>
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
                    className={`w-full px-3 py-2 rounded-xl text-xs flex items-center transition-all group cursor-pointer ${
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
                    className={`w-full px-3 py-2 rounded-xl text-xs flex items-center transition-all group cursor-pointer ${
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
                    className={`w-full px-3 py-2 rounded-xl text-xs flex items-center transition-all group cursor-pointer ${
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
                    className={`w-full px-3 py-2 rounded-xl text-xs flex items-center transition-all group cursor-pointer ${
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
                    className="w-full px-3 py-2 rounded-xl hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-semibold text-xs flex items-center transition-colors group cursor-pointer"
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

      </header>
    </div>
  );
}
