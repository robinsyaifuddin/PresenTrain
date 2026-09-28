import React from 'react';
import { normalizeRole } from '@/routes/routeConfig';

/**
 * ProtectedRoute Guard
 * Verifies if the current user is logged in and authorized for the requested role.
 */
export default function ProtectedRoute({ currentUser, allowedRoles = [], children, fallback = null }) {
  if (!currentUser) {
    return fallback;
  }

  const userRole = normalizeRole(currentUser.role);
  const normalizedAllowedRoles = allowedRoles.map(r => normalizeRole(r));

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(userRole)) {
    return fallback;
  }

  return <>{children}</>;
}
