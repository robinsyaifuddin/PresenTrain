import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, Calendar, Users, BarChart3, ShieldCheck, Settings, LayoutDashboard, LifeBuoy, FileText, GraduationCap } from 'lucide-react';

export default function BottomNav({ role, userPermissions, activeTab, setActiveTab }) {
  const [isNavHidden, setIsNavHidden] = useState(false);

  useEffect(() => {
    const checkNavVisibility = () => {
      if (typeof document !== 'undefined' && document.body) {
        const isHiddenByClass = 
          document.body.classList.contains('quiz-taking-active') ||
          document.body.classList.contains('hide-bottom-nav') ||
          document.body.classList.contains('modal-open');

        // Deteksi elemen overlay modal/dialog yang benar-benar aktif (z-index tinggi atau fullscreen page/backdrop), abaikan backdrop dropdown z-20/z-40 yang transparan
        const hasVisibleModal = Boolean(
          document.querySelector(
            '.fixed.inset-0.z-50:not(.mobile-bottom-dock):not(.pointer-events-none), ' +
            '.fixed.inset-0.z-\\[9999\\]:not(.mobile-bottom-dock):not(.pointer-events-none), ' +
            '.fixed.inset-0.z-\\[10000\\]:not(.mobile-bottom-dock):not(.pointer-events-none), ' +
            '.fixed.inset-0.z-\\[10001\\]:not(.mobile-bottom-dock):not(.pointer-events-none), ' +
            '[role="dialog"]:not(.mobile-bottom-dock)'
          )
        );

        setIsNavHidden(isHiddenByClass || hasVisibleModal);
      }
    };

    checkNavVisibility();

    if (typeof document !== 'undefined' && document.body) {
      const observer = new MutationObserver(checkNavVisibility);
      observer.observe(document.body, { 
        attributes: true, 
        attributeFilter: ['class'],
        childList: true,
        subtree: true 
      });
      return () => observer.disconnect();
    }
  }, []);

  if (isNavHidden) {
    return null;
  }

  const getNavItems = () => {
    if (role === 'super_admin') {
      return [
        { id: 'overview', label: 'Beranda', icon: <LayoutDashboard className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'classes_management', label: 'Kelas', icon: <GraduationCap className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'quiz_management', label: 'Kuis', icon: <FileText className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'admin_management', label: 'Admin', icon: <ShieldCheck className="w-5 h-5 stroke-[2.2]" /> },
        { id: 'participants_master', label: 'Peserta', icon: <Users className="w-5 h-5 stroke-[2.2]" /> },
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
      { id: 'my_attendances', label: 'Riwayat', icon: <BarChart3 className="w-5 h-5 stroke-[2.2]" /> },
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

  const navElement = (
    <div 
      className="fixed z-50 md:hidden left-0 right-0 px-4 sm:px-6 flex justify-center pointer-events-none mobile-bottom-dock"
      style={{
        bottom: 'max(22px, calc(16px + env(safe-area-inset-bottom, 0px)))',
      }}
    >
      <div className="w-full max-w-[420px] pointer-events-auto">
        <nav className="bg-emerald-800/95 backdrop-blur-xl border border-emerald-700/60 shadow-2xl shadow-emerald-950/40 rounded-[18px] relative px-1.5 py-1 flex items-center h-[62px] select-none">
          
          {/* Dynamic Sliding Active Indicator with Circular White Shape */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              width: `${itemWidthPercent}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          >
            {/* Circular Shape Dibelakang Menu Aktif (Bulat Penuh) */}
            <div className="w-[46px] h-[46px] rounded-full bg-white text-emerald-800 shadow-lg shadow-emerald-950/25 flex items-center justify-center -translate-y-3.5 border-2 border-emerald-100 ring-4 ring-emerald-900/10 transition-all duration-300 z-10">
              {React.cloneElement(navItems[activeIndex]?.icon, {
                className: 'w-5 h-5 stroke-[2.8] text-emerald-700',
              })}
            </div>

            {/* Active Label */}
            <span className="absolute bottom-1.5 text-[8.5px] font-extrabold text-white tracking-wide transition-all duration-300 truncate max-w-full px-1 uppercase drop-shadow-xs">
              {navItems[activeIndex]?.label}
            </span>
          </div>

          {/* Navigation Tab Buttons */}
          {navItems.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className="flex-1 flex flex-col items-center justify-center relative z-10 h-full cursor-pointer focus:outline-none select-none group py-1 active:scale-95 transition-transform touch-manipulation"
              >
                <div
                  className={`transition-all duration-300 flex items-center justify-center ${
                    isActive ? 'opacity-0 scale-75' : 'opacity-100 scale-100 text-emerald-100/75 group-hover:text-white'
                  }`}
                >
                  {item.icon}
                </div>
                <span
                  className={`text-[8.5px] mt-0.5 tracking-tight transition-all duration-300 truncate max-w-full px-0.5 ${
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
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(navElement, document.body);
  }

  return navElement;
}
