import React, { useState } from 'react';
import Sidebar from '@/components/navigation/Sidebar';
import DesktopTopBar from '@/components/navigation/DesktopTopBar';
import Header from '@/components/navigation/Header';
import BottomNav from '@/components/navigation/BottomNav';

export default function AdminLayout({ 
  user, 
  userPermissions,
  activeTab, 
  setActiveTab, 
  onLogout, 
  siteSettings,
  onUpdateUser,
  children 
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden min-h-0">
      <Sidebar
        user={user}
        userPermissions={userPermissions}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        siteSettings={siteSettings}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-slate-50">
        <DesktopTopBar
          user={user}
          onLogout={onLogout}
          siteSettings={siteSettings}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onUpdateUser={onUpdateUser}
        />

        <div className="block md:hidden shrink-0 w-full z-40 relative">
          <Header
            user={user}
            onLogout={onLogout}
            siteSettings={siteSettings}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onUpdateUser={onUpdateUser}
          />
        </div>

        <main className="flex-1 min-h-0 overflow-y-auto mobile-scroll-viewport no-scrollbar pb-32 md:pb-8">
          {children}
        </main>

        <div className="block md:hidden">
          <BottomNav
            role="admin"
            userPermissions={userPermissions}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
}
