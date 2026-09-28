import React, { useState } from 'react';
import { 
  UserPlus, ToggleLeft, ToggleRight, Key, Search, CheckCircle, X, 
  ShieldCheck, Settings, Wrench, Globe, Mail, FileText, Sparkles, 
  Plus, Calendar, Users, BarChart3, Clock, FileSpreadsheet, MapPin, 
  CheckCircle2, ChevronRight, LayoutDashboard, Sliders, ChevronDown, ChevronUp, Save, Edit, Trash2, UserCheck,
  MoreVertical, User, AlertCircle
} from 'lucide-react';
import { INITIAL_ADMIN_LIST } from '@/data/mockData';
import ProfileView from '@/components/views/ProfileView';
import SettingsView from '@/components/views/SettingsView';
import HelpdeskView from '@/components/views/HelpdeskView';
import GuideView from '@/components/views/GuideView';

// Custom Date Picker Component to strictly display dates in DD/MM/YYYY format with browser date picker popover
const DatePickerInput = ({ value, onChange, placeholder = '20/09/2026', required = false, className = '' }) => {
  const hiddenDateRef = React.useRef(null);

  const getYYYYMMDD = (val) => {
    if (!val) return '';
    if (val.includes('/') && val.split('/').length === 3) {
      const [d, m, y] = val.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return '';
  };

  const handleCalendarClick = () => {
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        hiddenDateRef.current.showPicker();
      } else {
        hiddenDateRef.current.click();
      }
    }
  };

  const handleHiddenDateChange = (e) => {
    const yyyymmdd = e.target.value;
    if (yyyymmdd) {
      const [y, m, d] = yyyymmdd.split('-');
      const formatted = `${d}/${m}/${y}`;
      onChange(formatted);
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 pr-10 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium ${className}`}
        required={required}
      />
      <button
        type="button"
        onClick={handleCalendarClick}
        className="absolute right-3 p-1.5 text-slate-500 hover:text-emerald-700 cursor-pointer transition-colors"
        title="Buka Kalender Pemilih Tanggal"
      >
        <Calendar className="w-4 h-4 text-slate-700" />
      </button>
      <input
        ref={hiddenDateRef}
        type="date"
        value={getYYYYMMDD(value)}
        onChange={handleHiddenDateChange}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
        tabIndex={-1}
      />
    </div>
  );
};

export default function SuperAdminDashboard({ 
  user,
  onUpdateUser,
  activeTab, 
  setActiveTab,
  training, 
  setTraining, 
  participants, 
  setParticipants, 
  siteSettings, 
  setSiteSettings,
  adminList: propAdminList,
  setAdminList: propSetAdminList,
  quizzes,
  setQuizzes,
  quizSubmissions,
  setQuizSubmissions,
  quizRequests,
  setQuizRequests
}) {
  const [localAdminList, setLocalAdminList] = useState(INITIAL_ADMIN_LIST);
  const adminList = propAdminList || localAdminList;
  const setAdminList = propSetAdminList || setLocalAdminList;

  const [searchAdmin, setSearchAdmin] = useState('');
  const [searchParticipant, setSearchParticipant] = useState('');
  const [filterSession, setFilterSession] = useState('ALL');

  const handleToggleAdminPermission = (adminId, permKey) => {
    const updated = adminList.map(a => {
      if (a.id === adminId) {
        const isPresensi = permKey === 'canManageAttendance';
        const currentVal = isPresensi ? (a.canManageAttendance !== false) : (a.canManageQuiz === true);
        return {
          ...a,
          [permKey]: !currentVal
        };
      }
      return a;
    });
    setAdminList(updated);
    const targetAdmin = adminList.find(a => a.id === adminId);
    showNotification(`Hak akses ${permKey === 'canManageAttendance' ? 'Presensi' : 'Quiz'} untuk (${targetAdmin?.name}) berhasil diperbarui!`);
  };

  const handleApproveQuizRequest = (reqObj) => {
    const updatedRequests = (quizRequests || []).map(r => r.id === reqObj.id ? { ...r, status: 'approved' } : r);
    if (setQuizRequests) setQuizRequests(updatedRequests);

    if (reqObj.requestType === 'reset_attempt') {
      const updatedSubs = (quizSubmissions || []).filter(s => s.id !== reqObj.submissionId && (s.quizId !== reqObj.quizId || s.participantId !== reqObj.participantId));
      if (setQuizSubmissions) setQuizSubmissions(updatedSubs);
      showNotification(`Pengajuan Reset Quiz (${reqObj.participantName}) disetujui. Peserta kini dapat mengerjakan ulang!`);
    } else if (reqObj.newScoreRequested !== null) {
      const updatedSubs = (quizSubmissions || []).map(s => s.id === reqObj.submissionId ? { ...s, score: reqObj.newScoreRequested } : s);
      if (setQuizSubmissions) setQuizSubmissions(updatedSubs);
      showNotification(`Revisi Nilai (${reqObj.participantName}) disetujui menjadi ${reqObj.newScoreRequested}.`);
    }
  };

  const handleRejectQuizRequest = (reqObj) => {
    const updatedRequests = (quizRequests || []).map(r => r.id === reqObj.id ? { ...r, status: 'rejected' } : r);
    if (setQuizRequests) setQuizRequests(updatedRequests);
    showNotification(`Pengajuan revisi/reset quiz (${reqObj.participantName}) ditolak.`);
  };

  // State Menu Aksi Titik 3 & Modals (Profil & Izin/Berhalangan)
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [profileModalUser, setProfileModalUser] = useState(null);
  const [previewPhotoUser, setPreviewPhotoUser] = useState(null);
  const [excuseModalUser, setExcuseModalUser] = useState(null);
  const [excuseReasonText, setExcuseReasonText] = useState('');

  // Notification Toast State
  const [notification, setNotification] = useState('');

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // ==========================================
  // INLINE FORM TOGGLES & STATES (TANPA MODAL!)
  // ==========================================

  // 1. Event Info Inline Edit State
  const [showEditEventForm, setShowEditEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState(training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung 2026');
  const [eventOrganizer, setEventOrganizer] = useState('HMI Cabang Bandar Lampung & BPL HMI');
  const [eventLocation, setEventLocation] = useState(training?.location || 'Sekretariat HMI Cabang Bandar Lampung');
  const [eventStartDate, setEventStartDate] = useState('20/10/2026');
  const [eventEndDate, setEventEndDate] = useState('22/10/2026');
  const [eventDateRange, setEventDateRange] = useState(training?.dateRange || '20/10/2026 - 22/10/2026');

  // Date Helpers: Convert between YYYY-MM-DD (for input[type="date"]) and DD/MM/YYYY
  const formatDDMMYYYY = (dateStr) => {
    if (!dateStr) return '20/09/2026';
    if (dateStr.includes('/')) return dateStr;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
        } else if (parts[2].length === 4) {
          return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
        }
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const formatYYYYMMDD = (dateStr) => {
    if (!dateStr) return '2026-09-20';
    if (dateStr.includes('/') && dateStr.split('/').length === 3) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      return dateStr;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${year}-${month}-${day}`;
    }
    return '2026-09-20';
  };

  // 2. Sesi Training Inline States (Tambah & Edit)
  const [showAddSessionForm, setShowAddSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);

  // Form Fields Sesi Training (Simplified & Clean)
  const [sessionFormTitle, setSessionFormTitle] = useState('');
  const [sessionFormSpeaker, setSessionFormSpeaker] = useState('');
  const [sessionFormRoom, setSessionFormRoom] = useState('');
  const [sessionFormStartTime, setSessionFormStartTime] = useState('08:00');
  const [sessionFormEndTime, setSessionFormEndTime] = useState('09:30');
  const [sessionFormDate, setSessionFormDate] = useState('20/09/2026');
  const [sessionFormStatus, setSessionFormStatus] = useState('Mendatang');

  // 3. Admin Panitia Inline States (Tambah & Edit)
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [openAdminMenuId, setOpenAdminMenuId] = useState(null);

  // Form Fields Admin Panitia
  const [adminFormName, setAdminFormName] = useState('');
  const [adminFormEmail, setAdminFormEmail] = useState('');
  const [adminFormDept, setAdminFormDept] = useState('');
  const [adminFormPhone, setAdminFormPhone] = useState('');
  const [adminFormRole, setAdminFormRole] = useState('Panitia Scanner & Absensi');
  const [adminFormAssignedSession, setAdminFormAssignedSession] = useState('Semua Sesi');
  const [adminFormStatus, setAdminFormStatus] = useState('Aktif');

  // 4. Master Peserta Inline States (Tambah & Edit)
  const [showAddParticipantForm, setShowAddParticipantForm] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState(null);

  // Form Fields Peserta
  const [partFormName, setPartFormName] = useState('');
  const [partFormEmail, setPartFormEmail] = useState('');
  const [partFormInstansi, setPartFormInstansi] = useState('');
  const [partFormJabatan, setPartFormJabatan] = useState('');
  const [partFormPhone, setPartFormPhone] = useState('');
  const [partFormQR, setPartFormQR] = useState('');
  const [partFormS1, setPartFormS1] = useState(false);
  const [partFormS2, setPartFormS2] = useState(false);
  const [partFormS3, setPartFormS3] = useState(false);
  const [partFormS4, setPartFormS4] = useState(false);

  // 5. Site Settings Form State
  const [formSettings, setFormSettings] = useState(siteSettings || {
    siteName: 'PresenTrain',
    tagline: 'System Presensi Digital & Training',
    logoUrl: '/logo/logo.png',
    logoLetter: 'P',
    isMaintenance: false,
    maintenanceMsg: 'Sistem presensi sedang dalam pemeliharaan berkala untuk peningkatan kualitas layanan. Silakan kembali beberapa saat lagi.',
    contactEmail: 'support@presentrain.com',
    appVersion: 'v1.2.0'
  });

  // ==========================================
  // HANDLERS (ALL INLINE WORKFLOW)
  // ==========================================

  // --- HANDLER EVENT INFO ---
  const handleUpdateEventInfo = (e) => {
    e.preventDefault();
    const formattedRange = `${eventStartDate} - ${eventEndDate}`;
    setEventDateRange(formattedRange);
    setTraining({
      ...training,
      title: eventTitle,
      location: eventLocation,
      dateRange: formattedRange,
    });
    setShowEditEventForm(false);
    showNotification('Informasi Event Training Utama berhasil diperbarui!');
  };

  // --- HANDLERS SESI TRAINING ---
  const handleOpenAddSession = () => {
    setEditingSessionId(null);
    setSessionFormTitle('');
    setSessionFormSpeaker('');
    setSessionFormRoom('');
    setSessionFormStartTime('08:00');
    setSessionFormEndTime('09:30');
    setSessionFormDate('20/09/2026');
    setSessionFormStatus('Mendatang');
    setShowAddSessionForm(!showAddSessionForm);
  };

  const handleOpenEditSession = (ses) => {
    setShowAddSessionForm(false);
    setEditingSessionId(ses.id);
    
    let spName = ses.speaker || '';
    if (spName.includes('(') && spName.includes(')')) {
      const match = spName.match(/(.*?)\((.*?)\)/);
      if (match) {
        spName = match[1].trim();
      }
    }

    let startTime = '08:00';
    let endTime = '09:30';
    if (ses.time && ses.time.includes('-')) {
      const parts = ses.time.split('-');
      const s = parts[0].trim().match(/\d{1,2}:\d{2}/);
      const e = parts[1].trim().match(/\d{1,2}:\d{2}/);
      if (s) startTime = s[0].padStart(5, '0');
      if (e) endTime = e[0].padStart(5, '0');
    }

    setSessionFormTitle(ses.title || '');
    setSessionFormSpeaker(spName);
    setSessionFormRoom(ses.room || '');
    setSessionFormStartTime(startTime);
    setSessionFormEndTime(endTime);
    setSessionFormDate(formatDDMMYYYY(ses.date || '20/09/2026'));
    setSessionFormStatus(ses.status || 'Mendatang');
  };

  const handleSaveSessionInline = (e) => {
    e.preventDefault();
    if (!sessionFormTitle || !sessionFormSpeaker) return;

    const formattedTime = `${sessionFormStartTime || '08:00'} - ${sessionFormEndTime || '09:30'} WIB`;
    const formattedDate = formatDDMMYYYY(sessionFormDate || '20/09/2026');

    if (editingSessionId) {
      // EDIT EXISTING SESSION
      const updatedSessions = (training?.sessions || []).map(s => {
        if (s.id === editingSessionId) {
          return {
            ...s,
            title: sessionFormTitle,
            speaker: sessionFormSpeaker,
            room: sessionFormRoom || 'Auditorium Utama',
            time: formattedTime,
            date: formattedDate,
            status: sessionFormStatus
          };
        }
        return s;
      });

      setTraining({ ...training, sessions: updatedSessions });
      setEditingSessionId(null);
      showNotification(`Sesi Materi (${sessionFormTitle}) berhasil diperbarui!`);
    } else {
      // ADD NEW SESSION
      const nextSesNumber = (training?.sessions?.length || 0) + 1;
      const newSesObj = {
        id: `SES-0${nextSesNumber}`,
        title: sessionFormTitle,
        speaker: sessionFormSpeaker,
        room: sessionFormRoom || 'Auditorium Utama A',
        time: formattedTime,
        date: formattedDate,
        status: sessionFormStatus || 'Mendatang'
      };

      setTraining({
        ...training,
        sessions: [...(training?.sessions || []), newSesObj]
      });
      setShowAddSessionForm(false);
      showNotification(`Sesi Materi Baru (${sessionFormTitle}) berhasil ditambahkan!`);
    }
  };

  const handleDeleteSession = (sessionId, sessionTitle) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus Sesi: "${sessionTitle}"?`)) {
      const filtered = (training?.sessions || []).filter(s => s.id !== sessionId);
      setTraining({ ...training, sessions: filtered });
      showNotification(`Sesi "${sessionTitle}" berhasil dihapus.`);
    }
  };

  // --- HANDLERS ADMIN PANITIA ---
  const handleOpenAddAdmin = () => {
    setEditingAdminId(null);
    setAdminFormName('');
    setAdminFormEmail('');
    setAdminFormDept('');
    setAdminFormPhone('');
    setAdminFormRole('Panitia Scanner & Absensi');
    setAdminFormAssignedSession('Semua Sesi');
    setAdminFormStatus('Aktif');
    setShowAddAdminForm(!showAddAdminForm);
  };

  const handleOpenEditAdmin = (adm) => {
    setShowAddAdminForm(false);
    setEditingAdminId(adm.id);
    setAdminFormName(adm.name || '');
    setAdminFormEmail(adm.email || '');
    setAdminFormDept(adm.dept || '');
    setAdminFormPhone(adm.phone || '0812-3456-7890');
    setAdminFormRole(adm.role || 'Panitia Scanner & Absensi');
    setAdminFormAssignedSession(adm.assignedSession || 'Semua Sesi');
    setAdminFormStatus(adm.status || 'Aktif');
  };

  const handleSaveAdminInline = (e) => {
    e.preventDefault();
    if (!adminFormName || !adminFormEmail) return;

    if (editingAdminId) {
      // EDIT EXISTING ADMIN
      const updatedList = adminList.map(a => {
        if (a.id === editingAdminId) {
          return {
            ...a,
            name: adminFormName,
            email: adminFormEmail,
            dept: adminFormDept || 'Panitia Absensi',
            phone: adminFormPhone,
            role: adminFormRole,
            assignedSession: adminFormAssignedSession,
            status: adminFormStatus
          };
        }
        return a;
      });

      setAdminList(updatedList);
      setEditingAdminId(null);
      showNotification(`Data Admin Panitia (${adminFormName}) berhasil diperbarui!`);
    } else {
      // ADD NEW ADMIN
      const newAdminObj = {
        id: `ADM-${String(adminList.length + 1).padStart(2, '0')}`,
        name: adminFormName,
        email: adminFormEmail,
        dept: adminFormDept || 'Panitia Absensi Sesi',
        phone: adminFormPhone || '0812-0000-1111',
        role: adminFormRole,
        assignedSession: adminFormAssignedSession,
        status: adminFormStatus,
        createdAt: new Date().toISOString().slice(0, 10)
      };

      setAdminList([newAdminObj, ...adminList]);
      setShowAddAdminForm(false);
      showNotification(`Akun Admin Panitia Baru (${adminFormName}) berhasil disimpan!`);
    }
  };

  const handleToggleAdminStatus = (adminId) => {
    setAdminList(prev => prev.map(adm => {
      if (adm.id === adminId) {
        const newStatus = adm.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
        showNotification(`Status akun admin ${adm.name} diubah menjadi ${newStatus}.`);
        return { ...adm, status: newStatus };
      }
      return adm;
    }));
  };

  const handleResetPassword = (adminName) => {
    showNotification(`Password akun ${adminName} telah direset ke default ('admin123').`);
  };

  const handleDeleteAdmin = (adminId, adminName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus akun Admin: "${adminName}"?`)) {
      setAdminList(prev => prev.filter(a => a.id !== adminId));
      showNotification(`Akun Admin "${adminName}" telah dihapus.`);
    }
  };

  // --- HANDLERS MASTER PESERTA ---
  const handleOpenAddParticipant = () => {
    setEditingParticipantId(null);
    setPartFormName('');
    setPartFormEmail('');
    setPartFormInstansi('');
    setPartFormJabatan('');
    setPartFormPhone('');
    const randomToken = `ABSEN-PESERTA-${Math.floor(100000 + Math.random() * 900000)}`;
    setPartFormQR(randomToken);
    setPartFormS1(false);
    setPartFormS2(false);
    setPartFormS3(false);
    setPartFormS4(false);
    setShowAddParticipantForm(!showAddParticipantForm);
  };

  const handleOpenEditParticipant = (p) => {
    setShowAddParticipantForm(false);
    setEditingParticipantId(p.id);
    setPartFormName(p.name || '');
    setPartFormEmail(p.email || '');
    setPartFormInstansi(p.instansi || '');
    setPartFormJabatan(p.jabatan || 'Peserta Training');
    setPartFormPhone(p.phone || '0812-3344-5566');
    setPartFormQR(p.qrToken || '');
    setPartFormS1(!!p.attendances?.['SES-01']?.present);
    setPartFormS2(!!p.attendances?.['SES-02']?.present);
    setPartFormS3(!!p.attendances?.['SES-03']?.present);
    setPartFormS4(!!p.attendances?.['SES-04']?.present);
  };

  const handleSaveParticipantInline = (e) => {
    e.preventDefault();
    if (!partFormName || !partFormEmail) return;

    const attendancesObj = {
      'SES-01': { present: partFormS1, time: partFormS1 ? '08:30 WIB' : null },
      'SES-02': { present: partFormS2, time: partFormS2 ? '10:15 WIB' : null },
      'SES-03': { present: partFormS3, time: partFormS3 ? '13:45 WIB' : null },
      'SES-04': { present: partFormS4, time: partFormS4 ? '15:45 WIB' : null }
    };

    if (editingParticipantId) {
      // EDIT EXISTING PARTICIPANT
      const updatedP = (participants || []).map(p => {
        if (p.id === editingParticipantId) {
          return {
            ...p,
            name: partFormName,
            email: partFormEmail,
            instansi: partFormInstansi || 'Umum',
            jabatan: partFormJabatan,
            phone: partFormPhone,
            qrToken: partFormQR,
            attendances: attendancesObj
          };
        }
        return p;
      });

      setParticipants(updatedP);
      setEditingParticipantId(null);
      showNotification(`Data Peserta (${partFormName}) berhasil diperbarui!`);
    } else {
      // ADD NEW PARTICIPANT
      const newPartObj = {
        id: `USR-${String((participants?.length || 0) + 501).padStart(4, '0')}`,
        name: partFormName,
        email: partFormEmail,
        instansi: partFormInstansi || 'Instansi Umum',
        jabatan: partFormJabatan || 'Peserta Training',
        phone: partFormPhone || '0812-0000-2222',
        qrToken: partFormQR || `ABSEN-PESERTA-${Math.floor(100000 + Math.random() * 900000)}`,
        role: 'participant',
        attendances: attendancesObj
      };

      setParticipants([newPartObj, ...(participants || [])]);
      setShowAddParticipantForm(false);
      showNotification(`Peserta Baru (${partFormName}) berhasil ditambahkan!`);
    }
  };

  const handleDeleteParticipant = (partId, partName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus peserta: "${partName}"?`)) {
      setParticipants(prev => prev.filter(p => p.id !== partId));
      showNotification(`Data peserta "${partName}" telah dihapus.`);
    }
  };

  // --- HANDLER WEBSITE SETTINGS ---
  const handleSaveSiteSettings = (e) => {
    e.preventDefault();
    setSiteSettings(formSettings);
    showNotification('Pengaturan Website & Modus Maintenance berhasil disimpan!');
  };

  const handleExportRekap = () => {
    const sessionsList = training?.sessions || [];
    const sessionHeaders = sessionsList.map(s => `"${s.title.replace(/"/g, '""')}"`).join(',');
    const csvHeader = `"ID","Nama Peserta","Email","Instansi","QR Token",${sessionHeaders}\n`;
    
    const csvRows = (participants || []).map(p => {
      const sessionValues = sessionsList.map(s => {
        const isPresent = p.attendances?.[s.id]?.present;
        const isExcused = p.attendances?.[s.id]?.status === 'Izin' || (!isPresent && p.isExcused);
        if (isPresent) return `"HADIR (${p.attendances?.[s.id]?.time || '-'})"`;
        if (isExcused) return `"IZIN (${p.attendances?.[s.id]?.note || p.excuseReason || 'Izin'})"`;
        return `"BELUM ABSEN"`;
      }).join(',');

      return `"${p.id}","${p.name}","${p.email}","${p.instansi}","${p.qrToken}",${sessionValues}`;
    }).join("\n");

    const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Presensi_SuperAdmin_LK1_HMI_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification('File CSV Rekapitulasi Presensi Seluruh Sesi berhasil diekspor!');
  };

  const handleSetPresensi = (participant) => {
    const targetSessionId = training?.sessions?.[0]?.id || 'SES-01';
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const updatedParticipants = participants.map(p => {
      if (p.id === participant.id) {
        return {
          ...p,
          status: 'Hadir',
          isExcused: false,
          excuseReason: null,
          attendances: {
            ...p.attendances,
            [targetSessionId]: { present: true, time: nowTime, note: 'Diset Hadir oleh Super Admin' }
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Presensi Berhasil! ${participant.name} diset HADIR.`);
    setActiveActionMenuId(null);
  };

  const handleSetAbsent = (participant) => {
    const targetSessionId = training?.sessions?.[0]?.id || 'SES-01';

    const updatedParticipants = participants.map(p => {
      if (p.id === participant.id) {
        return {
          ...p,
          status: 'Belum',
          isExcused: false,
          excuseReason: null,
          attendances: {
            ...p.attendances,
            [targetSessionId]: { present: false, time: null, note: null }
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Status presensi ${participant.name} diubah menjadi Tidak Hadir / Belum.`);
    setActiveActionMenuId(null);
  };

  const handleSaveExcuse = (e) => {
    e.preventDefault();
    if (!excuseModalUser) return;

    const targetSessionId = training?.sessions?.[0]?.id || 'SES-01';
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const finalReason = excuseReasonText.trim() || 'Izin / Berhalangan';

    const updatedParticipants = participants.map(p => {
      if (p.id === excuseModalUser.id) {
        return {
          ...p,
          status: 'Izin',
          isExcused: true,
          excuseReason: finalReason,
          attendances: {
            ...p.attendances,
            [targetSessionId]: { present: false, status: 'Izin', time: nowTime, note: finalReason }
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Status & Alasan Izin untuk ${excuseModalUser.name} berhasil disimpan!`);
    setExcuseModalUser(null);
    setExcuseReasonText('');
  };

  // Filters
  const filteredAdmins = adminList.filter(adm =>
    adm.name.toLowerCase().includes(searchAdmin.toLowerCase()) ||
    adm.email.toLowerCase().includes(searchAdmin.toLowerCase()) ||
    (adm.phone && adm.phone.toLowerCase().includes(searchAdmin.toLowerCase())) ||
    (adm.dept && adm.dept.toLowerCase().includes(searchAdmin.toLowerCase()))
  );

  const filteredParticipants = (participants || []).filter(p => {
    const matches = p.name.toLowerCase().includes(searchParticipant.toLowerCase()) ||
                    p.email.toLowerCase().includes(searchParticipant.toLowerCase()) ||
                    p.qrToken.toLowerCase().includes(searchParticipant.toLowerCase()) ||
                    p.instansi.toLowerCase().includes(searchParticipant.toLowerCase());
    if (filterSession === 'ALL') return matches;
    if (filterSession === 'BELUM') return matches && !p.attendances?.['SES-01']?.present && !p.isExcused && p.status !== 'Izin';
    if (filterSession === 'HADIR') return matches && (p.attendances?.['SES-01']?.present || p.status === 'Hadir');
    if (filterSession === 'IZIN') return matches && (p.isExcused || p.status === 'Izin' || p.attendances?.['SES-01']?.status === 'Izin');
    if (filterSession === 'SES-01') return matches && p.attendances?.['SES-01']?.present;
    if (filterSession === 'SES-02') return matches && p.attendances?.['SES-02']?.present;
    if (filterSession === 'SES-03') return matches && p.attendances?.['SES-03']?.present;
    return matches;
  });

  const activeAdminCount = adminList.filter(a => a.status === 'Aktif').length;
  const totalPCount = participants?.length || 500;

  // ==========================================
  // VIEW RENDERER (SUB-PAGES)
  // ==========================================

  if (activeTab === 'profile') {
    return (
      <ProfileView
        user={user || { name: 'Super Admin', email: 'admin@presentrain.com', role: 'super_admin' }}
        onUpdateUser={onUpdateUser}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  if (activeTab === 'settings') {
    return (
      <SettingsView
        siteSettings={siteSettings}
        user={user}
        onUpdateUser={onUpdateUser}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  if (activeTab === 'helpdesk') {
    return (
      <HelpdeskView
        user={{ name: 'Super Admin', email: 'admin@presentrain.com', role: 'super_admin' }}
        siteSettings={siteSettings}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  if (activeTab === 'guide') {
    return (
      <GuideView
        user={{ name: 'Super Admin', email: 'admin@presentrain.com', role: 'super_admin' }}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  // TAB 1: OVERVIEW (BERANDA APP DASHBOARD & DEFAULT FALLBACK)
  if (
    activeTab === 'overview' || 
    !activeTab || 
    !['events_management', 'admin_management', 'participants_master', 'site_settings', 'system_stats', 'profile', 'settings', 'helpdesk', 'guide'].includes(activeTab)
  ) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* ================= APP BERANDA HERO WELCOME CARD ================= */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 md:p-5 relative overflow-hidden shadow-xl shadow-emerald-950/10 border border-emerald-600/30">
          
          {/* Subtle Ambient Background Orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between min-h-[90px] sm:min-h-[110px] md:min-h-[125px]">
            {/* Header Text */}
            <div className="pr-24 sm:pr-40 md:pr-52">
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-emerald-200 uppercase tracking-widest">
                  BERANDA PRESENSI DIGITAL
                </span>
              </div>
              <div className="mt-0.5 sm:mt-1 leading-tight">
                <p className="text-xs sm:text-base md:text-lg font-normal text-emerald-100 tracking-tight">
                  Selamat Datang,
                </p>
                <h2 className="text-xs sm:text-base md:text-lg font-bold text-white tracking-tight mt-0.5">
                  Super Admin
                </h2>
              </div>
            </div>

            {/* Mini Ringkasan Dashboard - Proporsional untuk Desktop & Tablet */}
            <div className="mt-1.5 sm:mt-2.5 max-w-[170px] xs:max-w-[195px] sm:max-w-[270px] md:max-w-[310px]">
              <div className="grid grid-cols-3 divide-x divide-white/20">
                
                {/* Stat 1: Total Sesi */}
                <div className="flex flex-col items-center justify-center px-0.5 sm:px-1.5 text-center">
                  <div className="relative w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="19" className="stroke-white/20" strokeWidth="5.5" fill="transparent" />
                      <circle
                        cx="24"
                        cy="24"
                        r="19"
                        className="stroke-emerald-300 transition-all duration-1000 ease-out"
                        strokeWidth="5.5"
                        strokeDasharray={2 * Math.PI * 19}
                        strokeDashoffset={(2 * Math.PI * 19) * (1 - 0.75)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[7px] sm:text-[10px] md:text-xs font-black text-white tracking-tight">
                        0{(training?.sessions || []).length || 4}
                      </span>
                    </div>
                  </div>
                  <span className="text-[6.5px] sm:text-[9px] md:text-[10px] font-bold text-emerald-100 mt-0.5 text-center tracking-tight leading-tight">
                    Total Sesi
                  </span>
                </div>

                {/* Stat 2: Admin Panitia */}
                <div className="flex flex-col items-center justify-center px-0.5 sm:px-1.5 text-center">
                  <div className="relative w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="19" className="stroke-white/20" strokeWidth="5.5" fill="transparent" />
                      <circle
                        cx="24"
                        cy="24"
                        r="19"
                        className="stroke-emerald-300 transition-all duration-1000 ease-out"
                        strokeWidth="5.5"
                        strokeDasharray={2 * Math.PI * 19}
                        strokeDashoffset={(2 * Math.PI * 19) * (1 - 0.50)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[7px] sm:text-[10px] md:text-xs font-black text-white tracking-tight">
                        0{(siteSettings?.admins || []).length || 2}
                      </span>
                    </div>
                  </div>
                  <span className="text-[6.5px] sm:text-[9px] md:text-[10px] font-bold text-emerald-100 mt-0.5 text-center tracking-tight leading-tight">
                    Admin Panitia
                  </span>
                </div>

                {/* Stat 3: Total Peserta */}
                <div className="flex flex-col items-center justify-center px-0.5 sm:px-1.5 text-center">
                  <div className="relative w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="19" className="stroke-white/20" strokeWidth="5.5" fill="transparent" />
                      <circle
                        cx="24"
                        cy="24"
                        r="19"
                        className="stroke-emerald-300 transition-all duration-1000 ease-out"
                        strokeWidth="5.5"
                        strokeDasharray={2 * Math.PI * 19}
                        strokeDashoffset={(2 * Math.PI * 19) * (1 - 0.90)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[7px] sm:text-[10px] md:text-xs font-black text-white tracking-tight">
                        {(participants || []).length || 45}
                      </span>
                    </div>
                  </div>
                  <span className="text-[6.5px] sm:text-[9px] md:text-[10px] font-bold text-emerald-100 mt-0.5 text-center tracking-tight leading-tight">
                    Total Peserta
                  </span>
                </div>

              </div>
            </div>

            {/* 3D Welcome Chibi Characters - Compact & Responsive */}
            <div className="absolute bottom-0 right-0 sm:right-2 md:right-4 h-[95%] sm:h-[102%] md:h-[108%] max-h-[90px] sm:max-h-[125px] md:max-h-[145px] flex items-end justify-end pointer-events-none z-10">
              <img 
                src="/welcome_3d_icon.png" 
                alt="Selamat Datang 3D" 
                className="h-full w-auto object-contain object-bottom drop-shadow-lg select-none"
                style={{
                  maskImage: 'linear-gradient(to bottom, black 84%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 84%, transparent 100%)'
                }}
              />
            </div>
          </div>
        </div>

        {/* ================= APP GRID MENU (PUSAT LAYANAN BERANDA - GLASSMORPHISM STYLE) ================= */}
        <div className="glass-panel-light rounded-3xl border border-white/70 shadow-lg overflow-hidden">
          <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-y md:divide-y-0 divide-slate-100/90">
            
            {/* Tile 1: Kelola Event */}
            <button
              onClick={() => setActiveTab('events_management')}
              className="p-3.5 sm:p-5 md:p-6 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2.5 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Kelola Event
              </span>
            </button>

            {/* Tile 2: Admin Panitia */}
            <button
              onClick={() => setActiveTab('admin_management')}
              className="p-3.5 sm:p-5 md:p-6 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2.5 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Admin Panitia
              </span>
            </button>

            {/* Tile 3: Master Peserta */}
            <button
              onClick={() => setActiveTab('participants_master')}
              className="p-3.5 sm:p-5 md:p-6 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2.5 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Master Peserta
              </span>
            </button>

            {/* Tile 4: Pengaturan Web */}
            <button
              onClick={() => setActiveTab('site_settings')}
              className="p-3.5 sm:p-5 md:p-6 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2.5 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <Settings className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Pengaturan Web
              </span>
            </button>

            {/* Tile 5: Audit Log */}
            <button
              onClick={() => setActiveTab('system_stats')}
              className="p-3.5 sm:p-5 md:p-6 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2.5 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Audit Log Server
              </span>
            </button>

            {/* Tile 6: Ekspor CSV */}
            <button
              onClick={handleExportRekap}
              className="p-3.5 sm:p-5 md:p-6 flex flex-col items-center justify-center space-y-1.5 sm:space-y-2.5 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Ekspor Rekap
              </span>
            </button>

          </div>
        </div>

        {/* ================= LIVE EVENT STATUS & ACTIVITY FEED ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left 7 Cols: Live Status Sesi Training */}
          <div className="lg:col-span-7 light-card rounded-3xl p-6 space-y-4 border border-slate-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Status Operasional Pelatihan Real-Time</h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Sesi Active
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
                      SESI 2 BERLANGSUNG
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1.5">{training?.sessions?.[1]?.title || 'Praktikum Live Coding & Web API'}</h4>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    10:00 - 12:00 WIB
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span>Ruangan: <strong className="text-slate-800">{training?.sessions?.[1]?.room || 'Lab Komputer 2'}</strong></span>
                  <span>Pemateri: <strong className="text-slate-800">{training?.sessions?.[1]?.speaker || 'Ir. Agus Wijaya'}</strong></span>
                </div>
              </div>

              {/* Attendance Progress */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-900">Total Progres Kehadiran Peserta</span>
                  <span className="font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-md border border-emerald-200 font-mono">
                    {Math.round((participants?.filter(p => p.attendances?.['SES-01']?.present || p.status === 'Hadir').length / (participants?.length || 1)) * 100)}% Selesai
                  </span>
                </div>
                
                <div className="w-full h-3 bg-white rounded-full overflow-hidden p-0.5 border border-emerald-200">
                  <div 
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((participants?.filter(p => p.attendances?.['SES-01']?.present || p.status === 'Hadir').length / (participants?.length || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Activity Log Feed */}
          <div className="lg:col-span-5 light-card rounded-3xl p-6 space-y-4 border border-slate-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Aktivitas Terkini System</h4>
              <button onClick={() => setActiveTab('system_stats')} className="text-[11px] font-bold text-emerald-600 hover:underline">
                Lihat Semua Log →
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start space-x-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  ✓
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Presensi Sesi 2 Terverifikasi</h5>
                  <p className="text-[11px] text-slate-500">Panitia Siska Putri memindai QR Budi Santoso</p>
                  <span className="text-[10px] text-slate-400 font-mono">10:05 WIB</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold shrink-0">
                  +
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Peserta Baru Terdaftar</h5>
                  <p className="text-[11px] text-slate-500">Siti Aminah mendaftar & generate QR Token</p>
                  <span className="text-[10px] text-slate-400 font-mono">09:40 WIB</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  }

  // TAB 2: KELOLA EVENT & SESI TRAINING
  if (activeTab === 'events_management') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{training?.title || 'Manajemen Event & Sesi Materi'}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEditEventForm(!showEditEventForm)}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-2xl text-[11px] sm:text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>{showEditEventForm ? 'Tutup Edit Event' : 'Edit Detail Event'}</span>
            </button>

            <button
              onClick={handleOpenAddSession}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 btn-emerald text-[11px] sm:text-xs font-semibold rounded-2xl flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span>{showAddSessionForm ? 'Tutup Form Sesi' : 'Tambah Sesi Baru'}</span>
            </button>
          </div>
        </div>

        {/* 1. KOTAK MODAL EDIT INFORMASI EVENT UTAMA */}
        {showEditEventForm && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl md:max-w-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-5 border border-slate-200 relative my-auto max-h-[calc(100vh-2rem)] overflow-y-auto font-sans text-slate-900">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <Sliders className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      PENGATURAN EVENT UTAMA
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">Form Edit Informasi Event Utama</h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditEventForm(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateEventInfo} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Event Pelatihan Utama <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Penyelenggara / Instansi Utama</label>
                    <input
                      type="text"
                      value={eventOrganizer}
                      onChange={(e) => setEventOrganizer(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-7">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Rentang Tanggal Pelaksanaan (Tanggal Mulai s/d Selesai) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <DatePickerInput
                        value={eventStartDate}
                        onChange={(val) => setEventStartDate(val)}
                        placeholder="20/09/2026"
                        required
                      />
                      <span className="text-slate-400 font-bold shrink-0">s/d</span>
                      <DatePickerInput
                        value={eventEndDate}
                        onChange={(val) => setEventEndDate(val)}
                        placeholder="22/09/2026"
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-5">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Lokasi Gedung / Ruangan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditEventForm(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl text-xs transition-colors cursor-pointer"
                  >
                    Batal / Tutup
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 btn-emerald font-semibold rounded-2xl shadow-md flex items-center space-x-1.5 text-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Event</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. KOTAK MODAL FORM TAMBAH / EDIT SESI MATERI */}
        {(showAddSessionForm || editingSessionId) && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl md:max-w-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-5 border border-slate-200 relative my-auto max-h-[calc(100vh-2rem)] overflow-y-auto font-sans text-slate-900">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <Calendar className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {editingSessionId ? `SESI MATERI ${editingSessionId}` : 'TAMBAH SESI MATERI BARU'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {editingSessionId ? `Form Edit Sesi Materi (${editingSessionId})` : 'Form Tambah Sesi Materi Training Baru'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddSessionForm(false);
                    setEditingSessionId(null);
                  }}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSessionInline} className="space-y-4 text-xs">
                
                {/* Row 1: Judul Sesi & Tanggal Sesi Pelaksanaan (date picker) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Judul Sesi Materi Training <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sesi 5 - Digital Marketing Strategy & Social Media Branding"
                      value={sessionFormTitle}
                      onChange={(e) => setSessionFormTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tanggal Sesi Pelaksanaan <span className="text-rose-500">*</span>
                    </label>
                    <DatePickerInput
                      value={sessionFormDate}
                      onChange={(val) => setSessionFormDate(val)}
                      placeholder="20/09/2026"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Pemateri & Ruangan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Pemateri / Speaker <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Dr. Irfan Subagyo"
                      value={sessionFormSpeaker}
                      onChange={(e) => setSessionFormSpeaker(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ruangan / Hall / Lab</label>
                    <input
                      type="text"
                      placeholder="Contoh: Hall A - Lantai 3"
                      value={sessionFormRoom}
                      onChange={(e) => setSessionFormRoom(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>
                </div>

                {/* Row 3: Jam Pelaksanaan (Time Range 24h) & Status Sesi */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-7">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Jam Pelaksanaan (Rentang Waktu 24 Jam) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={sessionFormStartTime}
                        onChange={(e) => setSessionFormStartTime(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer text-center"
                        required
                      />
                      <span className="text-slate-400 font-bold shrink-0">s/d</span>
                      <input
                        type="time"
                        value={sessionFormEndTime}
                        onChange={(e) => setSessionFormEndTime(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer text-center"
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-5">
                    <label className="block font-semibold text-slate-700 mb-1">Status Sesi</label>
                    <select
                      value={sessionFormStatus}
                      onChange={(e) => setSessionFormStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer"
                    >
                      <option value="Mendatang">Mendatang</option>
                      <option value="Berlangsung">Berlangsung (Live Scan)</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSessionForm(false);
                      setEditingSessionId(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl text-xs transition-colors cursor-pointer"
                  >
                    Batal / Tutup
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 btn-emerald font-semibold rounded-2xl shadow-md flex items-center space-x-1.5 text-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingSessionId ? 'Simpan Perubahan Sesi' : 'Tambah Sesi Baru'}</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* 3. DAFTAR SESI TRAINING DENGAN TOMBOL EDIT/HAPUS INLINE */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Daftar Sesi Pelatihan Terdaftar ({training?.sessions?.length || 0})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {training?.sessions?.map((ses, idx) => (
              <div key={ses.id} className="light-card rounded-3xl p-5 space-y-3 relative group">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                      Sesi {idx + 1} • {ses.status}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 mt-2">{ses.title}</h4>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditSession(ses)}
                      className="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
                      title="Edit Sesi Inline"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteSession(ses.id, ses.title)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ses.time} ({formatDDMMYYYY(ses.date)})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ses.room} • Pemateri: {ses.speaker}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // TAB 3: KELOLA ADMIN PANITIA
  if (activeTab === 'admin_management') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Kelola Akun Admin Panitia</h2>
          </div>

          <button
            onClick={handleOpenAddAdmin}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 btn-emerald text-[11px] sm:text-xs font-semibold rounded-2xl flex items-center justify-center space-x-1.5 shadow-md active:scale-95 shrink-0 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>{showAddAdminForm ? 'Tutup Form Admin' : 'Tambah Admin Baru'}</span>
          </button>
        </div>

        {/* KOTAK MODAL FORM TAMBAH / EDIT ADMIN PANITIA */}
        {(showAddAdminForm || editingAdminId) && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl md:max-w-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-5 border border-slate-200 relative my-auto max-h-[calc(100vh-2rem)] overflow-y-auto font-sans text-slate-900">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {editingAdminId ? `AKUN ADMIN ${editingAdminId}` : 'AKUN ADMIN PANITIA BARU'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {editingAdminId ? `Form Edit Admin Panitia (${editingAdminId})` : 'Form Buat Akun Admin Panitia Baru'}
                    </h3>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAdminForm(false);
                    setEditingAdminId(null);
                  }}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAdminInline} className="space-y-4 text-xs">
                {/* Row 1: Nama Lengkap & Email Resmi Login (2 Cols) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Lengkap Admin Panitia <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Rendi Pangalila"
                      value={adminFormName}
                      onChange={(e) => setAdminFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email Resmi Admin (Login) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="rendi.admin@presentraining.com"
                      value={adminFormEmail}
                      onChange={(e) => setAdminFormEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: WhatsApp & Status Akun (2 Cols) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp Panitia</label>
                    <input
                      type="text"
                      placeholder="Contoh: 0812-3456-7890"
                      value={adminFormPhone}
                      onChange={(e) => setAdminFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Akun Admin</label>
                    <select
                      value={adminFormStatus}
                      onChange={(e) => setAdminFormStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer"
                    >
                      <option value="Aktif">Aktif (Dapat Login & Scan)</option>
                      <option value="Nonaktif">Nonaktif (Akses Ditolak)</option>
                    </select>
                  </div>
                </div>

                {editingAdminId && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800 text-xs">Keamanan & Password Akun</div>
                      <div className="text-[11px] text-slate-500">Kirim tautan reset kata sandi ke email {adminFormEmail || 'admin'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetPassword(adminFormName)}
                      className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Key className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reset Password Admin</span>
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAdminForm(false);
                      setEditingAdminId(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl text-xs transition-colors cursor-pointer"
                  >
                    Batal / Tutup
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 btn-emerald font-semibold rounded-2xl shadow-md flex items-center space-x-1.5 text-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingAdminId ? 'Simpan Perubahan Admin' : 'Simpan Akun Admin'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search Admin */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Cari nama admin, email, atau nomor HP..."
            value={searchAdmin}
            onChange={(e) => setSearchAdmin(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 outline-none shadow-xs"
          />
        </div>

        {/* Tabel Data Akun Admin Panitia */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Daftar Akun Admin Panitia ({filteredAdmins.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Tampilan Tabel Data Admin</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 text-center w-12">#</th>
                    <th className="py-3.5 px-4">Nama Administrator</th>
                    <th className="py-3.5 px-4 text-center">Status Akun</th>
                    <th className="py-3.5 px-4 text-center">Akses Presensi</th>
                    <th className="py-3.5 px-4 text-center">Akses Quiz</th>
                    <th className="py-3.5 px-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        Tidak ada akun admin panitia yang sesuai pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAdmins.map((adm, idx) => {
                      const isActive = adm.status === 'Aktif';
                      const canPresensi = adm.canManageAttendance !== false;
                      const canQuiz = adm.canManageQuiz === true;

                      return (
                        <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-xs shadow-xs shrink-0 ${
                                isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                              }`}>
                                {adm.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{adm.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{adm.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-block ${
                              isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}>
                              {adm.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAdminPermission(adm.id, 'canManageAttendance')}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border mx-auto ${
                                canPresensi
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                              }`}
                              title="Klik untuk membuka/menutup izin scanner presensi"
                            >
                              {canPresensi ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                              <span>{canPresensi ? 'Presensi ON' : 'Presensi OFF'}</span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAdminPermission(adm.id, 'canManageQuiz')}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border mx-auto ${
                                canQuiz
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                              }`}
                              title="Klik untuk membuka/menutup izin kelola Quiz"
                            >
                              {canQuiz ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                              <span>{canQuiz ? 'Quiz ON' : 'Quiz OFF'}</span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenAdminMenuId(openAdminMenuId === adm.id ? null : adm.id);
                                }}
                                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                title="Menu Aksi Admin"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openAdminMenuId === adm.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-30" 
                                    onClick={() => setOpenAdminMenuId(null)}
                                  />
                                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-left font-sans text-xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenAdminMenuId(null);
                                        handleOpenEditAdmin(adm);
                                      }}
                                      className="w-full px-4 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 font-semibold transition-colors cursor-pointer"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Edit Data</span>
                                    </button>

                                    <div className="my-1 border-t border-slate-100"></div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenAdminMenuId(null);
                                        handleDeleteAdmin(adm.id, adm.name);
                                      }}
                                      className="w-full px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 font-semibold transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Hapus Admin</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION PERSETUJUAN REVISI / RESET NILAI QUIZ */}
        <div className="pt-6 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2.5 py-0.5 rounded-full">
                KONTROL INTEGRITAS PENILAIAN
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center space-x-2">
                <span>Pengajuan Reset & Revisi Nilai Quiz</span>
                {(quizRequests || []).filter(r => r.status === 'pending').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-pulse">
                    {(quizRequests || []).filter(r => r.status === 'pending').length} Menunggu Persetujuan
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Permohonan dari Panitia untuk mereset kuis atau mengoreksi nilai peserta akibat kendala teknis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(!quizRequests || quizRequests.length === 0) ? (
              <div className="col-span-2 p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                Belum ada pengajuan revisi atau reset nilai kuis dari administrator panitia.
              </div>
            ) : (
              quizRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isApproved = req.status === 'approved';
                return (
                  <div key={req.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isPending ? 'bg-amber-100 text-amber-900 border border-amber-300' : isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {isPending ? 'Menunggu Approval' : isApproved ? 'Disetujui (Approved)' : 'Ditolak (Rejected)'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">{req.quizTitle}</h4>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Peserta:</span>
                        <strong className="text-slate-900">{req.participantName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Diajukan Oleh:</span>
                        <span className="text-slate-700">{req.requestedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nilai Awal:</span>
                        <span className="text-rose-600 font-bold">{req.oldScore} / 100</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">Tipe Aksus:</span>
                        <span className="font-bold text-emerald-700">{req.requestType === 'reset_attempt' ? 'Reset Ulang Kuis' : `Koreksi Nilai → ${req.newScoreRequested}`}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
                      <strong>Alasan Panitia:</strong> "{req.reason}"
                    </div>

                    {isPending && (
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => handleRejectQuizRequest(req)}
                          className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => handleApproveQuizRequest(req)}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          Setujui Pengajuan
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // TAB 4: MASTER DATA PESERTA & INLINE FORM PESERTA
  if (activeTab === 'participants_master') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle className="w-4 h-4 shrink-0" />
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Master Data & Presensi Peserta ({participants?.length || 0})</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleOpenAddParticipant}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 btn-emerald text-[11px] sm:text-xs font-semibold rounded-2xl flex items-center space-x-1.5 shadow-md active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span>{showAddParticipantForm ? 'Tutup Form Peserta' : 'Tambah Peserta Baru'}</span>
            </button>

            <button
              onClick={handleExportRekap}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-[11px] sm:text-xs font-semibold rounded-2xl flex items-center space-x-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* INLINE CARD FORM TAMBAH / EDIT DATA PESERTA (LENGKAP & TANPA MODAL OVERLAY!) */}
        {(showAddParticipantForm || editingParticipantId) && (
          <div className="light-card rounded-3xl p-6 md:p-8 space-y-4 border-2 border-emerald-500 bg-white shadow-lg animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editingParticipantId ? `Form Edit Data Peserta (${editingParticipantId})` : 'Form Registrasi Peserta Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Isi data identitas peserta, instansi, QR Token, dan toggle presensi sesi</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddParticipantForm(false);
                  setEditingParticipantId(null);
                }}
                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParticipantInline} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap Peserta <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Anita Wijaya"
                    value={partFormName}
                    onChange={(e) => setPartFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Peserta <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="anita@domain.com"
                    value={partFormEmail}
                    onChange={(e) => setPartFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asal Komisariat</label>
                  <input
                    type="text"
                    placeholder="Contoh: HMI Komisariat Tarbiyah UIN RIL"
                    value={partFormInstansi}
                    onChange={(e) => setPartFormInstansi(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan / Program Studi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Mahasiswa / Software Engineer"
                    value={partFormJabatan}
                    onChange={(e) => setPartFormJabatan(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812-9988-7766"
                    value={partFormPhone}
                    onChange={(e) => setPartFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">QR Token Presensi (Auto-Generated)</label>
                <input
                  type="text"
                  value={partFormQR}
                  onChange={(e) => setPartFormQR(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-emerald-600"
                  required
                />
              </div>

              {/* Status Presensi Per Sesi Checkboxes */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block font-semibold text-slate-800">Status Presensi Manual (Override)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={partFormS1}
                      onChange={(e) => setPartFormS1(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Hadir Sesi 1</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={partFormS2}
                      onChange={(e) => setPartFormS2(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Hadir Sesi 2</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={partFormS3}
                      onChange={(e) => setPartFormS3(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Hadir Sesi 3</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={partFormS4}
                      onChange={(e) => setPartFormS4(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Hadir Sesi 4</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddParticipantForm(false);
                    setEditingParticipantId(null);
                  }}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl text-[11px] sm:text-xs"
                >
                  Batal / Sembunyikan Form
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 sm:px-5 sm:py-2.5 btn-emerald font-semibold rounded-2xl shadow-md active:scale-98 transition-all flex items-center space-x-1.5 text-[11px] sm:text-xs"
                >
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{editingParticipantId ? 'Simpan Perubahan Peserta' : 'Simpan Data Peserta'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filters */}
        <div className="light-card rounded-3xl p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Cari nama peserta, email, asal komisariat, atau token QR..."
              value={searchParticipant}
              onChange={(e) => setSearchParticipant(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 outline-none"
            />
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setFilterSession('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                filterSession === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Semua Peserta ({participants?.length || 0})
            </button>
            <button
              onClick={() => setFilterSession('BELUM')}
              className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                filterSession === 'BELUM' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Belum Hadir
            </button>
            <button
              onClick={() => setFilterSession('HADIR')}
              className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                filterSession === 'HADIR' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Hadir
            </button>
            <button
              onClick={() => setFilterSession('IZIN')}
              className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                filterSession === 'IZIN' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Izin / Berhalangan
            </button>
            <button
              onClick={() => setFilterSession('SES-01')}
              className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                filterSession === 'SES-01' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Hadir Sesi 1
            </button>
          </div>
        </div>

        {/* Backdrop overlay for 3-dots dropdown dismissal */}
        {activeActionMenuId && (
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setActiveActionMenuId(null)} 
          />
        )}

        {/* Participants Table List Format */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 md:px-6">Nama Peserta</th>
                <th className="py-3.5 px-4 md:px-6">Asal Komisariat</th>
                <th className="py-3.5 px-4 md:px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 font-medium">
                    Tidak ada data peserta yang sesuai dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors group">
                      {/* Column 1: Nama Peserta */}
                      <td className="py-3.5 px-4 md:px-6">
                        <div className="flex items-center space-x-3">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                            className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all shadow-xs overflow-hidden"
                            title="Klik untuk melihat foto peserta"
                          >
                            {p.avatar ? (
                              <img src={p.avatar} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              p.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 text-xs md:text-sm block">{p.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Asal Komisariat */}
                      <td className="py-3.5 px-4 md:px-6">
                        <div className="text-slate-800 font-medium text-xs md:text-sm">
                          {p.instansi || '-'}
                        </div>
                      </td>

                      {/* Column 3: Aksi */}
                      <td className="py-3.5 px-4 md:px-6 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(activeActionMenuId === p.id ? null : p.id);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none"
                          title="Menu Aksi Peserta"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Popup Menu */}
                        {activeActionMenuId === p.id && (
                          <div 
                            className="absolute right-4 top-11 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi Peserta</p>
                              <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                            </div>

                            <button
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setProfileModalUser(p);
                              }}
                              className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                              <User className="w-4 h-4 text-emerald-600" />
                              <span>Lihat Profil</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveActionMenuId(null);
                                handleOpenEditParticipant(p);
                              }}
                              className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                              <span>Edit Data Peserta</span>
                            </button>

                            <div className="border-t border-slate-100 my-1"></div>

                            <button
                              onClick={() => {
                                setActiveActionMenuId(null);
                                handleDeleteParticipant(p.id, p.name);
                              }}
                              className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                              <span>Hapus Peserta</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL 1: DETAIL PROFIL PESERTA */}
        {profileModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-slate-100">
              <button 
                onClick={() => setProfileModalUser(null)} 
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-xl flex items-center justify-center border-2 border-emerald-200 shrink-0">
                  {profileModalUser.name.charAt(0)}
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Informasi Profil Peserta
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{profileModalUser.name}</h3>
                  <p className="text-xs text-slate-500">{profileModalUser.instansi}</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 rounded-2xl p-4 text-xs">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">Email</span>
                  <span className="font-semibold text-slate-900">{profileModalUser.email}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">QR Token Presensi</span>
                  <span className="font-mono font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">{profileModalUser.qrToken}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">Asal Komisariat</span>
                  <span className="font-semibold text-slate-900">{profileModalUser.instansi}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Status Utama</span>
                  {profileModalUser.attendances?.['SES-01']?.present || profileModalUser.status === 'Hadir' ? (
                    <span className="font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">Hadir</span>
                  ) : profileModalUser.isExcused || profileModalUser.status === 'Izin' ? (
                    <span className="font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px]">Izin / Berhalangan</span>
                  ) : (
                    <span className="font-semibold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full text-[11px]">Belum Absen</span>
                  )}
                </div>

                {(profileModalUser.isExcused || profileModalUser.status === 'Izin' || profileModalUser.excuseReason) && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                    <span className="font-semibold text-[10px] uppercase tracking-wider text-amber-700 block">Alasan Izin / Berhalangan:</span>
                    <p className="text-xs italic font-medium">"{profileModalUser.excuseReason || profileModalUser.attendances?.['SES-01']?.note || 'Berhalangan Hadir'}"</p>
                  </div>
                )}
              </div>

              {/* Status Sesi Breakdown */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Status Kehadiran per Sesi</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex justify-between items-center">
                    <span>Sesi 1</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${profileModalUser.attendances?.['SES-01']?.present ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {profileModalUser.attendances?.['SES-01']?.present ? 'Hadir' : '-'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex justify-between items-center">
                    <span>Sesi 2</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${profileModalUser.attendances?.['SES-02']?.present ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {profileModalUser.attendances?.['SES-02']?.present ? 'Hadir' : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Profile Modal */}
              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    const u = profileModalUser;
                    setProfileModalUser(null);
                    handleSetPresensi(u);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-2xl shadow-sm flex items-center justify-center space-x-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Set Presensi (Hadir)</span>
                </button>
                <button
                  onClick={() => {
                    const u = profileModalUser;
                    setProfileModalUser(null);
                    setExcuseModalUser(u);
                    setExcuseReasonText(u.excuseReason || u.attendances?.['SES-01']?.note || '');
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-2xl shadow-sm flex items-center justify-center space-x-1.5 transition-all"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Catat Izin</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: FORM IZIN / BERHALANGAN */}
        {excuseModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-slate-100">
              <button 
                onClick={() => setExcuseModalUser(null)} 
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pencatatan Izin / Berhalangan</h3>
                  <p className="text-xs text-slate-500">Peserta: <strong className="text-slate-800">{excuseModalUser.name}</strong></p>
                </div>
              </div>

              <form onSubmit={handleSaveExcuse} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Alasan Izin / Berhalangan</label>
                  {(excuseModalUser.excuseReason || excuseModalUser.attendances?.['SES-01']?.note) && (
                    <div className="mb-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-amber-700 block">Alasan / Catatan Saat Ini:</span>
                      <p className="italic font-medium">"{excuseModalUser.excuseReason || excuseModalUser.attendances?.['SES-01']?.note}"</p>
                    </div>
                  )}
                  <textarea
                    value={excuseReasonText}
                    onChange={(e) => setExcuseReasonText(e.target.value)}
                    rows={3}
                    placeholder="Tuliskan alasan izin / berhalangan peserta..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all text-xs"
                    required
                  />
                </div>

                {/* Quick Chips */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilihan Cepat Alasan:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Sakit dengan Surat Dokter',
                      'Tugas Dinas / Kantor',
                      'Izin Acara Keluarga',
                      'Kendala Transportasi / Jaringan'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setExcuseReasonText(chip)}
                        className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-medium border border-amber-200 transition-colors"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setExcuseModalUser(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-2xl shadow-md flex items-center space-x-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Status Izin</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* MODAL PREVIEW FOTO PESERTA (FAST, LIGHTWEIGHT, ZERO BACKEND BURDEN) */}
        {previewPhotoUser && (
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setPreviewPhotoUser(null)}
          >
            <div 
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200/80 p-6 space-y-4 text-center font-sans relative animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setPreviewPhotoUser(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Tutup Foto"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Tag */}
              <div className="text-left pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Foto Peserta
                </span>
              </div>

              {/* Large Photo Preview Container */}
              <div className="flex justify-center py-2">
                {previewPhotoUser.avatar ? (
                  <img
                    src={previewPhotoUser.avatar}
                    alt={previewPhotoUser.name}
                    className="w-44 h-44 sm:w-52 sm:h-52 rounded-full object-cover border-4 border-emerald-500/30 shadow-xl"
                  />
                ) : (
                  <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 font-extrabold text-6xl flex items-center justify-center border-4 border-emerald-300 shadow-lg">
                    {previewPhotoUser.name?.charAt(0) || 'P'}
                  </div>
                )}
              </div>

              {/* Participant Name & Komisariat */}
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {previewPhotoUser.name}
                </h4>
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 py-1 px-3 rounded-xl inline-block mt-1">
                  {previewPhotoUser.instansi || 'Peserta LK 1'}
                </p>
                {previewPhotoUser.email && (
                  <p className="text-[11px] text-slate-400 font-mono block mt-1">
                    {previewPhotoUser.email}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPreviewPhotoUser(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TAB 5: PENGATURAN WEBSITE & MAINTENANCE (FULL WIDTH & COMPLETE CONTENT)
  if (activeTab === 'site_settings') {
    return (
      <div className="p-4 md:p-8 space-y-6 w-full max-w-7xl mx-auto font-sans">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Pengaturan Identitas, Presensi & Maintenance</h2>
          </div>

          <div className="shrink-0 flex items-center space-x-3">
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
              <span className="block text-[10px] text-emerald-700 font-bold uppercase">Status Sistem</span>
              <span className="text-xs font-extrabold text-emerald-900">PRO 2.0 ACTIVE</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveSiteSettings} className="space-y-6">
          
          {/* Grid 2 Column Main Settings Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Maintenance Mode Control */}
            <div className="light-card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-semibold shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Modus Pemeliharaan (Maintenance Mode)</h3>
                      <p className="text-[11px] text-slate-500">Tutup akses umum saat pembaruan sistem</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormSettings({ ...formSettings, isMaintenance: !formSettings.isMaintenance })}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all ${
                      formSettings.isMaintenance 
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {formSettings.isMaintenance ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    <span>{formSettings.isMaintenance ? 'MAINTENANCE ON' : 'NORMAL OFF'}</span>
                  </button>
                </div>

                {formSettings.isMaintenance && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
                    <p className="font-bold flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /> Modus Pemeliharaan Sedang Aktif!</p>
                    <p className="text-[11px]">Pengunjung biasa akan dialihkan ke layar pemeliharaan. Super Admin tetap memiliki akses penuh ke dashboard ini.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Pesan Pengumuman Maintenance</label>
                  <textarea
                    rows={3}
                    value={formSettings.maintenanceMsg}
                    onChange={(e) => setFormSettings({ ...formSettings, maintenanceMsg: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    placeholder="Tuliskan pesan pemeliharaan..."
                  />
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100">
                <span>*Perubahan status maintenance langsung aktif saat disimpan.</span>
              </div>
            </div>

            {/* 2. Identitas & Brand Website */}
            <div className="light-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Globe className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Identitas & Branding Website</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Sistem / Title (Default: PresenTrain)</label>
                  <input
                    type="text"
                    value={formSettings.siteName}
                    onChange={(e) => setFormSettings({ ...formSettings, siteName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tagline / Sub-judul Utama</label>
                  <input
                    type="text"
                    value={formSettings.tagline}
                    onChange={(e) => setFormSettings({ ...formSettings, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Logo Website (Default: /logo/logo.png)</label>
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-xs">
                      <img 
                        src={formSettings.logoUrl || '/logo/logo.png'} 
                        alt="Preview Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <input
                      type="text"
                      value={formSettings.logoUrl || '/logo/logo.png'}
                      onChange={(e) => setFormSettings({ ...formSettings, logoUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Grid 2 Column Secondary Settings Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 3. Pengaturan Presensi, Toleransi & GPS */}
            <div className="light-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Aturan Presensi & Toleransi Waktu</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Toleransi Keterlambatan</label>
                  <select 
                    value={formSettings.lateTolerance || '15 Menit'}
                    onChange={(e) => setFormSettings({ ...formSettings, lateTolerance: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  >
                    <option value="Tepat Waktu (0 Menit)">Tepat Waktu (0 Menit)</option>
                    <option value="5 Menit">5 Menit</option>
                    <option value="10 Menit">10 Menit</option>
                    <option value="15 Menit">15 Menit</option>
                    <option value="30 Menit">30 Menit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Radius Geofencing GPS</label>
                  <select 
                    value={formSettings.gpsRadius || '50 Meter'}
                    onChange={(e) => setFormSettings({ ...formSettings, gpsRadius: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  >
                    <option value="Bebas (Non-GPS)">Bebas (Non-GPS)</option>
                    <option value="25 Meter">25 Meter (Presisi Tinggi)</option>
                    <option value="50 Meter">50 Meter (Area Ruangan)</option>
                    <option value="100 Meter">100 Meter (Area Kompleks)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs font-medium space-y-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Proteksi Anti-Duplicate Scanner Aktif</span>
                </div>
                <p className="text-[11px] text-emerald-800">Sistem otomatis menolak scan ganda untuk peserta yang sudah absen dalam sesi yang sama.</p>
              </div>
            </div>

            {/* 4. Kontak Support & Helpdesk */}
            <div className="light-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Mail className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Kontak Helpdesk & Operasional</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Support Panitia</label>
                  <input
                    type="email"
                    value={formSettings.contactEmail || 'support@presentrain.com'}
                    onChange={(e) => setFormSettings({ ...formSettings, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp Panitia (Helpdesk)</label>
                  <input
                    type="text"
                    value={formSettings.whatsappNumber || '62887437525303'}
                    onChange={(e) => setFormSettings({ ...formSettings, whatsappNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Versi Rilis Aplikasi</label>
                  <input
                    type="text"
                    value={formSettings.appVersion || 'v2.0 PRO Emerald Edition'}
                    onChange={(e) => setFormSettings({ ...formSettings, appVersion: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teks Sukses Scan Presensi</label>
                  <input
                    type="text"
                    value={formSettings.successMessage || 'Presensi Berhasil Dicatat!'}
                    onChange={(e) => setFormSettings({ ...formSettings, successMessage: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Action Save Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 sm:px-7 sm:py-3.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Simpan Semua Pengaturan Sistem</span>
            </button>
          </div>

        </form>
      </div>
    );
  }

  // TAB 6: AUDIT LOG & SERVER
  if (activeTab === 'system_stats') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Ringkasan Operasional & Server Log</h2>
        </div>

        <div className="light-card rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Aktivitas Terakhir Sistem</h3>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3 text-xs border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-semibold">
                ✓
              </div>
              <div>
                <p className="font-semibold text-slate-900">Scan Absensi Sukses - Sesi 2</p>
                <p className="text-xs text-slate-500">Admin Siska Putri memindai QR Budi Santoso • 10:05 WIB</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 text-xs border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 font-semibold">
                +
              </div>
              <div>
                <p className="font-semibold text-slate-900">Registrasi Peserta Baru Auto-Approved</p>
                <p className="text-xs text-slate-500">Siti Aminah mendaftar & generate QR Token • 09:40 WIB</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 text-xs">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-semibold">
                <Key className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Login Super Admin Utama</p>
                <p className="text-xs text-slate-500">Super Admin (Drs. Bambang Hidayat) • 08:00 WIB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT / TAB KELOLA ADMIN PANITIA (admin_management)
  return null;
}
