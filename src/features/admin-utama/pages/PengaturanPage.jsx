import React from 'react';
import SuperAdminDashboard from '@/features/admin-utama/components/SuperAdminDashboard';

export default function PengaturanPage(props) {
  return <SuperAdminDashboard activeTab="site_settings" {...props} />;
}
