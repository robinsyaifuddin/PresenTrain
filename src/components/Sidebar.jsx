import React from 'react';
import { 
  QrCode, Calendar, Users, BarChart3, ShieldCheck, User, LogOut, 
  ChevronRight, Settings, LayoutDashboard, Printer, LifeBuoy, 
  PanelLeftClose, PanelLeftOpen, FileText 
} from 'lucide-react';

export default function Sidebar({ 
  user, 
  userPermissions,
  activeTab, 
  setActiveTab, 
  onLogout, 
  siteSettings,
  isCollapsed,
  setIsCollapsed
}) {
  const getNavItems = () => {
    if (!user) return [];
    if (user.role === 'super_admin') {
      return [
        { id: 'overview', label: 'Beranda', icon: <LayoutDashboard className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'events_management', label: 'Event & Sesi', icon: <Calendar className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'admin_management', label: 'Admin Panitia', icon: <ShieldCheck className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'participants_master', label: 'Master Peserta', icon: <Users className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'site_settings', label: 'Pengaturan Web', icon: <Settings className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'system_stats', label: 'Audit Log', icon: <BarChart3 className="w-5 h-5 stroke-[2.2]" /> },
      ];
    }

    if (user.role === 'admin') {
      const items = [];
      if (userPermissions?.canManageAttendance !== false) {
        items.push({ id: 'sessions_scanner', label: 'Scanner Barcode', icon: <QrCode className="w-5 h-5 stroke-[2.2]" /> });
      }
      items.push({ id: 'participants', label: 'Daftar Peserta', icon: <Users className="w-5 h-5 stroke-[2.2]" /> });
      items.push({ id: 'recap', label: 'Rekap Presensi', icon: <BarChart3 className="w-5 h-5 stroke-[2.2]" /> });
      
      if (userPermissions?.canManageQuiz === true) {
        items.push({ id: 'quizzes', label: 'Quiz & Evaluasi', icon: <FileText className="w-5 h-5 stroke-[2.2]" /> });
      }
      
      items.push({ id: 'helpdesk', label: 'Helpdesk Kendala', icon: <LifeBuoy className="w-5 h-5 stroke-[2.2]" /> });
      return items;
    }

    return [
      { id: 'overview', label: 'Beranda', icon: <LayoutDashboard className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'scan_presensi', label: 'Scan Presensi', icon: <QrCode className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'quizzes', label: 'Quiz & Test', icon: <FileText className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'schedule', label: 'Jadwal Training', icon: <Calendar className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'my_attendances', label: 'Riwayat Presensi', icon: <BarChart3 className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'helpdesk', label: 'Helpdesk Bantuan', icon: <LifeBuoy className="w-5 h-5 stroke-[2.2]" /> },
    ];
  };

  const navItems = getNavItems();


  return (
    <aside className={`hidden md:flex flex-col bg-white/75 backdrop-blur-xl border-r border-slate-200/60 h-screen max-h-screen overflow-hidden sticky top-0 left-0 shrink-0 select-none shadow-xs transition-all duration-300 ease-in-out z-30 ${
      isCollapsed ? 'w-20' : 'w-64 lg:w-72'
    }`}>
      
      {/* Brand Header & TOGGLE BUTTON */}
      <div className={`p-4 border-b border-slate-100 flex items-center shrink-0 ${isCollapsed ? 'justify-center p-3' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <img 
              src={siteSettings?.logoUrl || '/logo/logo.png'} 
              alt={siteSettings?.siteName || 'Logo'} 
              className="w-9 h-9 object-contain shrink-0" 
            />
            
            <div className="truncate">
              <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">
                {siteSettings?.siteName || 'PresenTrain'}
              </h1>
            </div>
          </div>
        )}

        {/* Dedicated Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 transition-colors shrink-0 cursor-pointer"
          title={isCollapsed ? 'Buka Sidebar (Expanded)' : 'Tutup / Ringkaskan Sidebar (Collapsed)'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5 text-emerald-600 stroke-[2.2]" /> : <PanelLeftClose className="w-5 h-5 stroke-[2.2]" />}
        </button>
      </div>

      {/* Navigation Menu Links Container (Independent Inner Scroll if needed) */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto no-scrollbar min-h-0">
        {!isCollapsed && (
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Navigasi Utama</p>
        )}
        
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`transition-colors flex items-center justify-center shrink-0 ${
                  isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}>
                  {item.icon}
                </div>
                {!isCollapsed && <span className="tracking-tight">{item.label}</span>}
              </div>
              {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 text-emerald-600 stroke-[2.2]" />}
            </button>
          );
        })}
      </div>



    </aside>
  );
}
