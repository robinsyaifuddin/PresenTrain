/**
 * PresenTrain Application Route Mapping & URL Helper
 * Provides seamless bidirectional mapping between internal tab state and clean URL slugs.
 */

// Mapping of tab names to clean URL slugs for each role
export const ROLE_ROUTE_MAP = {
  super_admin: {
    prefix: '/adminutama',
    routes: {
      overview: '/adminutama/beranda',
      events_management: '/adminutama/event-sesi',
      admin_management: '/adminutama/admin-panitia',
      participants_master: '/adminutama/master-peserta',
      site_settings: '/adminutama/pengaturan-web',
      system_stats: '/adminutama/audit-log',
      profile: '/adminutama/profil',
      settings: '/adminutama/pengaturan',
      helpdesk: '/adminutama/helpdesk',
      guide: '/adminutama/panduan',
    },
    defaultTab: 'overview',
  },
  admin: {
    prefix: '/administrator',
    routes: {
      sessions_scanner: '/administrator/manajemen-sesi',
      participants: '/administrator/daftar-peserta',
      rekap_data: '/administrator/rekap-data',
      recap: '/administrator/rekap-presensi',
      rekap_penilaian: '/administrator/rekap-penilaian',
      quizzes: '/administrator/quiz-evaluasi',
      helpdesk: '/administrator/helpdesk',
      profile: '/administrator/profil',
      settings: '/administrator/pengaturan',
      guide: '/administrator/panduan',
    },
    defaultTab: 'sessions_scanner',
  },
  participant: {
    prefix: '/peserta',
    routes: {
      overview: '/peserta/beranda',
      scan_presensi: '/peserta/scan-presensi',
      quizzes: '/peserta/quiz-test',
      schedule: '/peserta/jadwal',
      my_attendances: '/peserta/riwayat-presensi',
      helpdesk: '/peserta/helpdesk',
      profile: '/peserta/profil',
      settings: '/peserta/pengaturan',
      guide: '/peserta/panduan',
    },
    defaultTab: 'overview',
  },
};

/**
 * Get the full clean URL path for a given role and tab.
 */
export function getUrlForTab(role, tabId) {
  if (!role || !ROLE_ROUTE_MAP[role]) return '/';
  const roleConfig = ROLE_ROUTE_MAP[role];
  return roleConfig.routes[tabId] || `${roleConfig.prefix}/${tabId}`;
}

/**
 * Parse the current browser pathname to find the matching role & tabId.
 */
export function parseCurrentRoute(pathname) {
  if (!pathname || pathname === '/' || pathname === '/login') {
    return { isPublic: true, role: null, tabId: null };
  }

  // Check super_admin routes
  if (pathname.startsWith('/adminutama') || pathname.startsWith('/superadmin')) {
    for (const [tabId, routePath] of Object.entries(ROLE_ROUTE_MAP.super_admin.routes)) {
      if (pathname.toLowerCase() === routePath.toLowerCase()) {
        return { isPublic: false, role: 'super_admin', tabId };
      }
    }
    return { isPublic: false, role: 'super_admin', tabId: 'overview' };
  }

  // Check admin routes
  if (pathname.startsWith('/administrator') || pathname.startsWith('/admin')) {
    for (const [tabId, routePath] of Object.entries(ROLE_ROUTE_MAP.admin.routes)) {
      if (pathname.toLowerCase() === routePath.toLowerCase()) {
        return { isPublic: false, role: 'admin', tabId };
      }
    }
    return { isPublic: false, role: 'admin', tabId: 'sessions_scanner' };
  }

  // Check participant routes
  if (pathname.startsWith('/peserta') || pathname.startsWith('/participant')) {
    for (const [tabId, routePath] of Object.entries(ROLE_ROUTE_MAP.participant.routes)) {
      if (pathname.toLowerCase() === routePath.toLowerCase()) {
        return { isPublic: false, role: 'participant', tabId };
      }
    }
    return { isPublic: false, role: 'participant', tabId: 'overview' };
  }

  return { isPublic: true, role: null, tabId: null };
}

/**
 * Safely push browser URL state without page reload.
 */
export function syncBrowserUrl(role, tabId) {
  if (typeof window === 'undefined' || !role || !tabId) return;
  
  const targetUrl = getUrlForTab(role, tabId);
  const currentPath = window.location.pathname;

  if (currentPath !== targetUrl) {
    window.history.pushState({ role, tabId }, '', targetUrl);
  }
}
