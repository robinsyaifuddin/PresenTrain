import React from 'react';
import SuperAdminDashboard from '@/features/admin-utama/components/SuperAdminDashboard';

export default function KelolaAdminPage(props) {
  return <SuperAdminDashboard activeTab="admin_management" {...props} />;
}
