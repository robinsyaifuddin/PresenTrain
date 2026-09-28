import React from 'react';
import { QrCode, Calendar, Users, BarChart3, ShieldCheck, Settings, LayoutDashboard, LifeBuoy, FileText } from 'lucide-react';

export default function BottomNav({ role, userPermissions, activeTab, setActiveTab }) {
  const getNavItems = () => {
    if (role === 'super_admin') {
      return [
        { id: 'events_management', label: 'Event', icon: <Calendar className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'admin_management', label: 'Admin', icon: <ShieldCheck className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'overview', label: 'Beranda', icon: <LayoutDashboard className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'participants_master', label: 'Peserta', icon: <Users className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'site_settings', label: 'Pengaturan', icon: <Settings className="w-5 h-5 stroke-[2.2]" /> },
      ];
    }

    if (role === 'admin') {
      return [
        { id: 'participants', label: 'Peserta', icon: <Users className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'rekap_data', label: 'Rekap', icon: <BarChart3 className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'sessions_scanner', label: 'Sesi', icon: <QrCode className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'quizzes', label: 'Quiz', icon: <FileText className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'helpdesk', label: 'Helpdesk', icon: <LifeBuoy className="w-5 h-5 stroke-[2.2]" /> },
      ];
    }

    // Default: Peserta (Beranda persis di tengah - Posisi 3 dari kiri)
    return [
      { id: 'scan_presensi', label: 'Scan QR', icon: <QrCode className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'quizzes', label: 'Quiz', icon: <FileText className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'overview', label: 'Beranda', icon: <LayoutDashboard className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'schedule', label: 'Jadwal', icon: <Calendar className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'helpdesk', label: 'Helpdesk', icon: <LifeBuoy className="w-5 h-5 stroke-[2.2]" /> },
    ];
  };

  const navItems = getNavItems();
  let activeIndex = navItems.findIndex((item) => item.id === activeTab);
  if (activeIndex === -1) activeIndex = 2; // Default focus to center (Beranda) if unrecognized

  const itemWidthPercent = 100 / navItems.length;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 md:hidden pb-[env(safe-area-inset-bottom,0px)]">
      <nav className="bg-emerald-950/70 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-emerald-950/60 rounded-3xl relative px-1 py-1.5 flex items-center h-16 select-none">
        
        {/* Dynamic Sliding Active Indicator with Glass White Circle Shape */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center justify-center pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            width: `${itemWidthPercent}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        >
          {/* Bulat Putih Frosted Glass Dibelakang Menu Aktif */}
          <div className="w-[54px] h-[54px] rounded-full bg-white/95 backdrop-blur-md text-emerald-700 shadow-2xl shadow-emerald-500/30 flex items-center justify-center -translate-y-4 border-2 border-white/90 ring-4 ring-white/10 transition-all duration-300 z-10 filter drop-shadow-lg">
            {React.cloneElement(navItems[activeIndex]?.icon, {
              className: 'w-6 h-6 stroke-[2.8] text-emerald-700',
            })}
          </div>

          {/* Active Label (Text Warna Putih Murni Glass Glow) */}
          <span className="absolute bottom-0.5 text-[9px] font-black text-white tracking-tight transition-all duration-300 truncate max-w-full px-1 uppercase drop-shadow-md">
            {navItems[activeIndex]?.label}
          </span>
        </div>

        {/* Navigation Tab Buttons */}
        {navItems.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center relative z-10 h-full cursor-pointer focus:outline-none group py-1"
            >
              <div
                className={`transition-all duration-300 flex items-center justify-center ${
                  isActive ? 'opacity-0 scale-75' : 'opacity-100 scale-100 text-emerald-100/75 group-hover:text-white'
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-[9px] mt-0.5 tracking-tight transition-all duration-300 truncate max-w-full px-1 ${
                  isActive ? 'opacity-0 font-bold' : 'text-emerald-100/75 group-hover:text-white font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
