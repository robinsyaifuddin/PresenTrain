// 0. Fungsi Normalisasi Role (Menghindari typo atau variasi nama role)
export function normalizeRole(role) {
  if (!role) return 'participant';
  const r = String(role).toLowerCase().trim().replace('-', '_');
  if (r === 'super_admin' || r === 'superadmin' || r === 'adminutama') {
    return 'super_admin';
  }
  if (r === 'admin' || r === 'administrator' || r === 'panitia') {
    return 'admin';
  }
  return 'participant';
}

// 1. Prefix URL Berdasarkan Role Pengguna
export const ROLE_PREFIXES = {
  super_admin: '/adminutama',
  admin: '/administrator',
  participant: '/peserta',
};

// 2. Pemetaan Tab ID Internal <-> Semantic URL Slug
export const TAB_ROUTES = {
  super_admin: {
    overview: 'overview',
    events_management: 'event-sesi',
    admin_management: 'admin-panitia',
    participants_master: 'master-peserta',
    site_settings: 'pengaturan-web',
    system_stats: 'audit-log',
    guide: 'panduan',
    helpdesk: 'helpdesk',
    profile: 'profil',
    settings: 'pengaturan-akun',
  },
  admin: {
    sessions_scanner: 'scanner-barcode',
    participants: 'daftar-peserta',
    recap: 'rekap-presensi',
    rekap_data: 'rekap-presensi',
    rekap_penilaian: 'rekap-penilaian',
    quizzes: 'quiz-evaluasi',
    helpdesk: 'helpdesk',
    guide: 'panduan',
    profile: 'profil',
    settings: 'pengaturan',
  },
  participant: {
    overview: 'beranda',
    scan_presensi: 'scan-presensi',
    quizzes: 'quiz',
    schedule: 'jadwal',
    my_attendances: 'riwayat-presensi',
    helpdesk: 'helpdesk',
    guide: 'panduan',
    profile: 'profil',
    settings: 'pengaturan',
  },
};

// 3. Pemetaan Sebaliknya (URL Slug / Alias -> Internal Tab ID)
export const SLUG_TO_TAB = {
  super_admin: {
    '': 'overview',
    'overview': 'overview',
    'beranda': 'overview',
    'dashboard': 'overview',
    'event-sesi': 'events_management',
    'events_management': 'events_management',
    'admin-panitia': 'admin_management',
    'admin_management': 'admin_management',
    'master-peserta': 'participants_master',
    'participants_master': 'participants_master',
    'pengaturan-web': 'site_settings',
    'pengaturan': 'site_settings',
    'site_settings': 'site_settings',
    'audit-log': 'system_stats',
    'system_stats': 'system_stats',
    'panduan': 'guide',
    'guide': 'guide',
    'helpdesk': 'helpdesk',
    'profil': 'profile',
    'profile': 'profile',
    'pengaturan-akun': 'settings',
    'settings': 'settings',
  },
  admin: {
    '': 'sessions_scanner',
    'scanner-barcode': 'sessions_scanner',
    'sessions_scanner': 'sessions_scanner',
    'scanner': 'sessions_scanner',
    'daftar-peserta': 'participants',
    'participants': 'participants',
    'peserta': 'participants',
    'rekap-presensi': 'recap',
    'recap': 'recap',
    'rekap_data': 'recap',
    'rekap': 'recap',
    'rekap-penilaian': 'rekap_penilaian',
    'penilaian': 'rekap_penilaian',
    'quiz-evaluasi': 'quizzes',
    'quizzes': 'quizzes',
    'quiz': 'quizzes',
    'helpdesk': 'helpdesk',
    'panduan': 'guide',
    'guide': 'guide',
    'profil': 'profile',
    'profile': 'profile',
    'pengaturan': 'settings',
    'settings': 'settings',
  },
  participant: {
    '': 'overview',
    'beranda': 'overview',
    'overview': 'overview',
    'dashboard': 'overview',
    'scan-presensi': 'scan_presensi',
    'scan_presensi': 'scan_presensi',
    'scan': 'scan_presensi',
    'quiz': 'quizzes',
    'quizzes': 'quizzes',
    'jadwal': 'schedule',
    'schedule': 'schedule',
    'riwayat-presensi': 'my_attendances',
    'my_attendances': 'my_attendances',
    'presensi': 'my_attendances',
    'helpdesk': 'helpdesk',
    'panduan': 'guide',
    'guide': 'guide',
    'profil': 'profile',
    'profile': 'profile',
    'pengaturan': 'settings',
    'settings': 'settings',
  },
};

/**
 * Mendapatkan URL Path lengkap untuk role dan tabId tertentu.
 * Contoh: formatRouteUrl('admin', 'participants') -> '/administrator/daftar-peserta'
 */
export function formatRouteUrl(role, tabId) {
  const prefix = ROLE_PREFIXES[role] || '/peserta';
  const roleTabMap = TAB_ROUTES[role] || {};
  const slug = roleTabMap[tabId] || tabId || '';
  
  if (!slug) return prefix;
  return `${prefix}/${slug}`;
}

/**
 * Mendapatkan Tab ID default berdasarkan role dan hak akses.
 */
export function getDefaultTabForRole(role, permissions = {}) {
  const normRole = normalizeRole(role);
  if (normRole === 'super_admin') {
    return 'overview';
  }
  if (normRole === 'admin') {
    if (permissions?.canManageAttendance === false && permissions?.canManageQuiz === true) {
      return 'quizzes';
    }
    return 'sessions_scanner';
  }
  return 'overview';
}

/**
 * Menganalisis URL pathname saat ini dan memvalidasi akses user.
 */
export function resolveCurrentRoute(pathname = '/', currentUser = null) {
  // 1. Cek Rute Publik Khusus: Barcode Sesi / Absensi Token
  const tokenMatch = pathname.match(/\/(ABSEN-SESI-(\d+)[^\/]*)/i);
  const sesiMatch = pathname.match(/\/sesi-(\d+)/i);
  const quizMatch = pathname.match(/\/quiz\/([a-zA-Z0-9_-]+)/i);

  if (tokenMatch) {
    return {
      type: 'public_session',
      sessionIndex: parseInt(tokenMatch[2], 10),
      urlToken: tokenMatch[1],
      quizCode: null,
    };
  }

  if (sesiMatch) {
    return {
      type: 'public_session',
      sessionIndex: parseInt(sesiMatch[1], 10),
      urlToken: null,
      quizCode: null,
    };
  }

  if (quizMatch) {
    return {
      type: 'quiz',
      sessionIndex: null,
      urlToken: null,
      quizCode: quizMatch[1],
    };
  }

  // 2. Cek Prefix Role dari URL
  let targetRole = null;
  let remainingPath = '';

  if (pathname.startsWith('/adminutama')) {
    targetRole = 'super_admin';
    remainingPath = pathname.replace(/^\/adminutama\/?/, '');
  } else if (pathname.startsWith('/administrator')) {
    targetRole = 'admin';
    remainingPath = pathname.replace(/^\/administrator\/?/, '');
  } else if (pathname.startsWith('/peserta')) {
    targetRole = 'participant';
    remainingPath = pathname.replace(/^\/peserta\/?/, '');
  }

  // Clean slug
  const slug = remainingPath.split('/')[0].toLowerCase().trim();

  // 3. User belum login (Unauthenticated)
  if (!currentUser) {
    return {
      type: 'auth',
      targetRole,
      requestedSlug: slug,
      tabId: null,
      isRedirectRequired: targetRole !== null,
    };
  }

  // 4. User sudah login
  const userRole = normalizeRole(currentUser.role);

  // Jika URL role tidak cocok dengan role user yang login (Role Guard)
  if (targetRole && targetRole !== userRole) {
    const defaultTab = getDefaultTabForRole(userRole);
    return {
      type: 'dashboard',
      userRole,
      tabId: defaultTab,
      isRedirectRequired: true,
      redirectPath: formatRouteUrl(userRole, defaultTab),
    };
  }

  // URL cocok dengan role, atau berada di root '/' saat sudah login
  const roleSlugMap = SLUG_TO_TAB[userRole] || {};
  const matchedTabId = roleSlugMap[slug] || getDefaultTabForRole(userRole);

  return {
    type: 'dashboard',
    userRole,
    tabId: matchedTabId,
    isRedirectRequired: pathname === '/' || pathname === '',
    redirectPath: formatRouteUrl(userRole, matchedTabId),
  };
}
