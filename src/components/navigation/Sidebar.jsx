import React from 'react';
import { 
  QrCode, Calendar, Users, BarChart3, ShieldCheck, User, LogOut, 
  ChevronRight, Settings, LayoutDashboard, Printer, LifeBuoy, 
  PanelLeftClose, PanelLeftOpen, FileText, Award, GraduationCap, HelpCircle
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
        { id: 'classes_management', label: 'Manajemen Kelas', icon: <GraduationCap className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'rekap_penilaian', label: 'Rekap Penilaian', icon: <Award className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'quiz_management', label: 'Kelola Kuis', icon: <FileText className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'admin_management', label: 'Admin Panitia', icon: <ShieldCheck className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'participants_master', label: 'Master Peserta', icon: <Users className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'system_stats', label: 'Audit Log', icon: <BarChart3 className="w-5 h-5 stroke-[2.2]" /> },
      ];
    }

    if (user.role === 'admin') {
      return [
        { id: 'sessions_scanner', label: 'Scanner Barcode', icon: <QrCode className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'participants', label: 'Daftar Peserta', icon: <Users className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'rekap_data', label: 'Rekap Data', icon: <BarChart3 className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'quizzes', label: 'Quiz & Evaluasi', icon: <FileText className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'helpdesk', label: 'Helpdesk Kendala', icon: <LifeBuoy className="w-5 h-5 stroke-[2.2]" /> },
      ];
    }

    return [
      { id: 'overview', label: 'Beranda', icon: <LayoutDashboard className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'schedule', label: 'Jadwal Training', icon: <Calendar className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'my_attendances', label: 'Riwayat Presensi', icon: <BarChart3 className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'quizzes', label: 'Quiz & Test', icon: <FileText className="w-5 h-5 stroke-[2.2]" /> },
      { id: 'helpdesk', label: 'Helpdesk Bantuan', icon: <LifeBuoy className="w-5 h-5 stroke-[2.2]" /> },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className={`hidden md:flex flex-col bg-gradient-to-b from-emerald-800 via-emerald-800 to-emerald-900 border-r border-emerald-700/60 h-screen max-h-screen overflow-hidden sticky top-0 left-0 shrink-0 select-none shadow-md transition-all duration-300 ease-in-out z-30 ${
      isCollapsed ? 'w-20' : 'w-64 lg:w-72'
    }`}>
      {/* Brand Header & TOGGLE BUTTON */}
      <div className={`p-4 border-b border-emerald-700/50 flex items-center shrink-0 ${isCollapsed ? 'justify-center p-3' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <img 
              src={siteSettings?.logoUrl || '/logo/logo.png'} 
              alt={siteSettings?.siteName || 'Logo'} 
              className="w-8 h-8 object-contain shrink-0 bg-white/90 p-1 rounded-lg" 
            />
            <span className="font-extrabold text-white text-base tracking-tight truncate">
              {siteSettings?.siteName || 'PresenTrain'}
            </span>
          </div>
        )}

        {/* Dedicated Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg bg-emerald-700/60 hover:bg-emerald-700 text-emerald-100 hover:text-white border border-emerald-600/50 transition-colors shrink-0 cursor-pointer shadow-xs"
          title={isCollapsed ? 'Buka Sidebar (Expanded)' : 'Tutup / Ringkaskan Sidebar (Collapsed)'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5 text-white stroke-[2.2]" /> : <PanelLeftClose className="w-5 h-5 text-emerald-100 stroke-[2.2]" />}
        </button>
      </div>

      {/* Navigation Menu Links Container */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto no-scrollbar min-h-0">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'} rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-md border border-white'
                  : 'text-emerald-100/90 hover:bg-emerald-700/60 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`transition-colors flex items-center justify-center shrink-0 ${
                  isActive ? 'text-emerald-700' : 'text-emerald-200/90 group-hover:text-white'
                }`}>
                  {item.icon}
                </div>
                {!isCollapsed && <span className="tracking-tight">{item.label}</span>}
              </div>
              {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 text-emerald-700 stroke-[2.2]" />}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
