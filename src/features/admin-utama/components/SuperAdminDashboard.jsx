import React, { useState } from 'react';
import { 
  UserPlus, ToggleLeft, ToggleRight, Key, Search, CheckCircle, X, 
  ShieldCheck, Settings, Wrench, Globe, Mail, FileText, Sparkles, 
  Plus, Calendar, Users, BarChart3, Clock, FileSpreadsheet, MapPin, 
  CheckCircle2, ChevronRight, LayoutDashboard, Sliders, ChevronDown, ChevronUp, Save, Edit, Trash2, UserCheck,
  MoreVertical, User, AlertCircle, ArrowLeft, Activity, GraduationCap, School, BookOpen, Filter, Copy,
  XCircle, Layers, Loader2, Award
} from 'lucide-react';
import { INITIAL_ADMIN_LIST, calculateAssessment } from '@/data/mockData';
import { api } from '@/services/api';
import ProfileView from '@/components/views/ProfileView';
import SettingsView from '@/components/views/SettingsView';
import HelpdeskView from '@/components/views/HelpdeskView';
import GuideView from '@/components/views/GuideView';
import { useFeedback } from '@/context/FeedbackContext';
import { useClass } from '@/context/ClassContext';
import ClassesManagementView from './ClassesManagementView';
import AuditLogView from './AuditLogView';
import GoogleFormQuizBuilder from '@/features/administrator/components/GoogleFormQuizBuilder';
import QuizResultsView, { isSubmissionForQuiz, isSubmissionForParticipant } from '@/features/administrator/components/QuizResultsView';
import AdminDashboard from '@/features/administrator/components/AdminDashboard';
import XLSX from 'xlsx-js-style';
import { downloadWorkbook, createPesertaWorksheet, createPesertaPerKelasWorkbook, createPresensiMatrixWorksheet } from '@/utils/excelExportHelper';

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
        className={`w-full px-3.5 py-2.5 pr-10 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium ${className}`}
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
  refreshParticipants,
  siteSettings, 
  setSiteSettings,
  adminList: propAdminList,
  setAdminList: propSetAdminList,
  quizzes,
  setQuizzes,
  quizSubmissions,
  setQuizSubmissions,
  quizRequests,
  setQuizRequests,
  tickets,
  setTickets,
  refreshTraining,
  assessments,
  setAssessments,
  refreshAssessments
}) {
  const [localAdminList, setLocalAdminList] = useState(INITIAL_ADMIN_LIST);
  const adminList = propAdminList || localAdminList;
  const setAdminList = propSetAdminList || setLocalAdminList;

  const [searchAdmin, setSearchAdmin] = useState('');
  const [searchParticipant, setSearchParticipant] = useState('');
  const [filterSession, setFilterSession] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');

  const handleToggleAdminPermission = async (adminId, permKey) => {
    let nextVal = false;
    let targetAdmin = adminList.find(a => a.id === adminId);
    if (!targetAdmin) return;

    if (permKey === 'canManageAttendance') nextVal = !(targetAdmin.canManageAttendance !== false);
    else if (permKey === 'canManageGrading') nextVal = !(targetAdmin.canManageGrading !== false);
    else if (permKey === 'canManageQuiz') nextVal = !(targetAdmin.canManageQuiz === true);

    const updated = adminList.map(a => {
      if (a.id === adminId) {
        return {
          ...a,
          [permKey]: nextVal
        };
      }
      return a;
    });
    setAdminList(updated);

    const labelMap = {
      canManageAttendance: 'Presensi & Scanner',
      canManageGrading: 'Penilaian Peserta',
      canManageQuiz: 'Quiz & Test'
    };
    showNotification(`Hak akses ${labelMap[permKey] || permKey} untuk (${targetAdmin?.name}) berhasil diperbarui!`);

    const backendPermMap = {
      canManageAttendance: 'can_manage_attendance',
      canManageGrading: 'can_manage_assessment',
      canManageQuiz: 'can_manage_quiz'
    };
    const parsedId = parseInt(String(adminId).replace(/\D/g, ''), 10);
    const dbId = targetAdmin?.db_id || (isNaN(parsedId) ? null : parsedId);

    if (dbId && backendPermMap[permKey]) {
      try {
        await api.updateUser(dbId, { [backendPermMap[permKey]]: nextVal });
      } catch (err) {
        console.warn('Gagal sync hak akses admin ke backend:', err);
      }
    }
  };

  const handleApproveQuizRequest = async (reqObj) => {
    const updatedRequests = (quizRequests || []).map(r => r.id === reqObj.id ? { ...r, status: 'approved' } : r);
    if (setQuizRequests) setQuizRequests(updatedRequests);

    try {
      await api.updateQuizRequest(reqObj.db_id || reqObj.id, { status: 'approved' });
    } catch (err) {
      console.warn('API updateQuizRequest error:', err);
    }

    if (reqObj.requestType === 'reset_attempt') {
      const updatedSubs = (quizSubmissions || []).filter(s => s.id !== reqObj.submissionId && (s.quizId !== reqObj.quizId || s.participantId !== reqObj.participantId));
      if (setQuizSubmissions) setQuizSubmissions(updatedSubs);
      showNotification(`Pengajuan Reset Quiz (${reqObj.participantName}) disetujui. Peserta kini dapat mengerjakan ulang!`);

      if (reqObj.submissionId) {
        try {
          await api.deleteQuizSubmission(reqObj.submissionId);
        } catch (err) {
          console.warn('API deleteQuizSubmission error:', err);
        }
      }
    } else if (reqObj.newScoreRequested !== null) {
      const updatedSubs = (quizSubmissions || []).map(s => s.id === reqObj.submissionId ? { ...s, score: reqObj.newScoreRequested } : s);
      if (setQuizSubmissions) setQuizSubmissions(updatedSubs);
      showNotification(`Revisi Nilai (${reqObj.participantName}) disetujui menjadi ${reqObj.newScoreRequested}.`);
    }
  };

  const handleRejectQuizRequest = async (reqObj) => {
    const updatedRequests = (quizRequests || []).map(r => r.id === reqObj.id ? { ...r, status: 'rejected' } : r);
    if (setQuizRequests) setQuizRequests(updatedRequests);
    showNotification(`Pengajuan revisi/reset quiz (${reqObj.participantName}) ditolak.`);

    try {
      await api.updateQuizRequest(reqObj.db_id || reqObj.id, { status: 'rejected' });
    } catch (err) {
      console.warn('API updateQuizRequest error:', err);
    }
  };

  const { classes: availableClasses = [], refreshClasses = () => {} } = useClass() || {};
  const [assignClassModalUser, setAssignClassModalUser] = useState(null);
  const [selectedClassToAssign, setSelectedClassToAssign] = useState('');
  const [isSubmittingClassAssign, setIsSubmittingClassAssign] = useState(false);

  // State Tandai / Multi-Select Peserta untuk Masuk Kelas Bersama
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkTargetClassId, setBulkTargetClassId] = useState('');
  const [isSubmittingBulkClass, setIsSubmittingBulkClass] = useState(false);

  const [assignAdminClassModal, setAssignAdminClassModal] = useState(null);
  const [selectedAdminClassIds, setSelectedAdminClassIds] = useState([]);
  const [isSubmittingAdminClass, setIsSubmittingAdminClass] = useState(false);

  // State Menu Aksi Titik 3 & Modals (Profil & Izin/Berhalangan)
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [openSessionMenuId, setOpenSessionMenuId] = useState(null);
  const [openAdminMenuId, setOpenAdminMenuId] = useState(null);
  const [openQuizMenuId, setOpenQuizMenuId] = useState(null);
  const [profileModalUser, setProfileModalUser] = useState(null);
  const [previewPhotoUser, setPreviewPhotoUser] = useState(null);
  const [excuseModalUser, setExcuseModalUser] = useState(null);
  const [excuseReasonText, setExcuseReasonText] = useState('');
  const [editAccessAdmin, setEditAccessAdmin] = useState(null);
  const [activeQuizBuilder, setActiveQuizBuilder] = useState(null);
  const [activeQuizForResults, setActiveQuizForResults] = useState(null);
  const [generalQuizAccessList, setGeneralQuizAccessList] = useState([]);
  const [isLoadingGeneralQuizAccess, setIsLoadingGeneralQuizAccess] = useState(false);
  const [togglingQuizId, setTogglingQuizId] = useState(null);

  const fetchGeneralQuizAccess = React.useCallback(async () => {
    setIsLoadingGeneralQuizAccess(true);
    try {
      const res = await api.getClassQuizAccess('general');
      if (res && res.ok && Array.isArray(res.data)) {
        setGeneralQuizAccessList(res.data);
      }
    } catch (e) {
      console.warn('Gagal memuat akses kuis kelas umum:', e);
    } finally {
      setIsLoadingGeneralQuizAccess(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === 'quiz_management') {
      fetchGeneralQuizAccess();
    }
  }, [activeTab, fetchGeneralQuizAccess]);

  const { confirm: confirmDialog, showNotification, closeNotification } = useFeedback();

  // State Ringkasan Audit Log untuk Aktivitas Terkini System
  const [auditStats, setAuditStats] = useState({
    total_today: 0,
    success_today: 0,
    failed_today: 0,
    total_all: 0,
  });

  React.useEffect(() => {
    let isMounted = true;
    const fetchAuditSummary = async () => {
      try {
        const res = await api.getAuditLogs({ per_page: 1 });
        if (isMounted && res?.ok && res?.data?.stats) {
          setAuditStats(res.data.stats);
        }
      } catch (e) {
        console.warn('Gagal memuat ringkasan audit log:', e);
      }
    };
    fetchAuditSummary();

    // Self-hydration peserta dan admin langsung saat tab master-peserta atau admin-panitia dibuka
    const fetchDirectUsers = async () => {
      try {
        const res = await api.getUsers({ per_page: 500 });
        if (isMounted && res?.ok && Array.isArray(res.data)) {
          const dbUsers = res.data;
          const pUsers = dbUsers.filter(u => u.role === 'participant');
          if (typeof setParticipants === 'function') {
            setParticipants(pUsers.map((u, idx) => ({
              id: u.id ? `USR-${u.id}` : `USR-${idx + 1}`,
              db_id: u.id,
              no: idx + 1,
              name: u.name || '',
              email: u.email || '',
              instansi: u.instansi || '',
              phone: u.phone || '',
              gender: u.gender || 'L',
              role: u.role || 'participant',
              class_id: u.class_id || null,
              className: u.className || (u.class_id ? 'Kelas Khusus' : 'Kelas Umum'),
              classCode: u.classCode || (u.class_id ? 'KLS' : 'KELAS-UMUM'),
              qrToken: u.user_qr_token || u.qrToken || `${u.id || idx + 1}`,
              user_qr_token: u.user_qr_token || u.qrToken || `${u.id || idx + 1}`,
              avatar: u.avatar || '',
              attendances: u.attendances || {},
              status: (u.attendances && Object.values(u.attendances).some(att => att && att.present)) ? 'Hadir' : (u.status || 'Belum'),
              trainingStatus: 'Aktif'
            })));
          }

          const aUsers = dbUsers.filter(u => u.role === 'admin' || u.role === 'super_admin');
          if (typeof setAdminList === 'function') {
            setAdminList(aUsers.map((a, idx) => ({
              id: a.id ? `ADM-${a.id}` : `ADM-${idx + 1}`,
              db_id: a.id,
              name: a.name || '',
              email: a.email || '',
              dept: a.instansi || 'Panitia Pelaksana',
              phone: a.phone || '',
              role: a.role === 'super_admin' ? 'Administrator Utama' : 'Panitia Scanner & Absensi',
              raw_role: a.role,
              assignedSession: 'Semua Sesi',
              status: a.status || 'Aktif',
              canManageAttendance: a.can_manage_attendance !== false,
              canManageGrading: a.can_manage_assessment !== false,
              canManageAssessment: a.can_manage_assessment !== false,
              canManageQuiz: a.can_manage_quiz !== false,
              managedClasses: a.managed_classes || a.managedClasses || [],
              managed_classes_names: a.managed_classes_names || (a.managedClasses ? a.managedClasses.map(c => c.name) : []),
            })));
          }

          if (typeof setQuizzes === 'function') {
            api.getQuizzes().then(qRes => {
              if (isMounted && qRes?.ok && Array.isArray(qRes.data)) {
                setQuizzes(qRes.data);
              }
            }).catch(() => {});
          }

          if (typeof setQuizSubmissions === 'function') {
            api.getQuizSubmissions().then(sRes => {
              if (isMounted && sRes?.ok && Array.isArray(sRes.data)) {
                setQuizSubmissions(sRes.data);
              }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Direct fetch users in SuperAdminDashboard error:', err);
      }
    };

    fetchDirectUsers();

    return () => { isMounted = false; };
  }, [setParticipants, setAdminList, activeTab]);

  // ==========================================
  // INLINE FORM TOGGLES & STATES (TANPA MODAL!)
  // ==========================================

  // 1. Event Info Inline Edit State
  const [showEditEventForm, setShowEditEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState(training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung 2026');
  const [eventLocation, setEventLocation] = useState(training?.location || 'Sekretariat HMI Cabang Bandar Lampung');
  const [eventStartDate, setEventStartDate] = useState('20/10/2026');
  const [eventEndDate, setEventEndDate] = useState('22/10/2026');
  const [eventDateRange, setEventDateRange] = useState(training?.dateRange || '20/10/2026 - 22/10/2026');
  const [eventBannerSlides, setEventBannerSlides] = useState(
    training?.bannerSlides?.map(s => typeof s === 'string' ? s : s.image) || [
      '/slide/BALIHO BTR FIX.jpg',
      '/slide/BALIHO BTR FIX (1).jpg',
      '/slide/BALIHO BTR FIX (2).jpg',
      '/slide/BALIHO BTR FIX (3).jpg'
    ]
  );

  React.useEffect(() => {
    setPreviewPhotoUser(null);
    setProfileModalUser(null);
    setExcuseModalUser(null);
    setEditAccessAdmin(null);
    setAssignClassModalUser(null);
    setAssignAdminClassModal(null);
    setActiveQuizBuilder(null);
    setActiveQuizForResults(null);
    setActiveActionMenuId(null);
    setOpenSessionMenuId(null);
    setOpenAdminMenuId(null);
    if (typeof closeNotification === 'function') {
      closeNotification();
    }
  }, [activeTab, closeNotification]);

  // Tutup modal aktif dengan tombol Escape
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewPhotoUser) { setPreviewPhotoUser(null); return; }
        if (profileModalUser) { setProfileModalUser(null); return; }
        if (excuseModalUser) { setExcuseModalUser(null); return; }
        if (editAccessAdmin) { setEditAccessAdmin(null); return; }
        if (assignClassModalUser) { setAssignClassModalUser(null); return; }
        if (assignAdminClassModal) { setAssignAdminClassModal(null); return; }
        if (activeQuizBuilder) { setActiveQuizBuilder(null); return; }
        if (activeQuizForResults) { setActiveQuizForResults(null); return; }
        if (activeActionMenuId) { setActiveActionMenuId(null); return; }
        if (openSessionMenuId) { setOpenSessionMenuId(null); return; }
        if (openAdminMenuId) { setOpenAdminMenuId(null); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    previewPhotoUser, profileModalUser, excuseModalUser, editAccessAdmin,
    assignClassModalUser, assignAdminClassModal, activeQuizBuilder,
    activeQuizForResults, activeActionMenuId, openSessionMenuId, openAdminMenuId
  ]);

  React.useEffect(() => {
    if (training) {
      if (training.title) setEventTitle(training.title);
      if (training.location) setEventLocation(training.location);
      if (training.bannerSlides && Array.isArray(training.bannerSlides)) {
        setEventBannerSlides(training.bannerSlides.map(s => typeof s === 'string' ? s : s.image));
      }

      let startDate = '20/10/2026';
      let endDate = '22/10/2026';

      if (training.dateRange && training.dateRange.includes('-')) {
        const parts = training.dateRange.split('-');
        if (parts.length === 2) {
          startDate = parts[0].trim();
          endDate = parts[1].trim();
        }
      }

      setEventStartDate(startDate);
      setEventEndDate(endDate);
      setEventDateRange(training.dateRange || `${startDate} - ${endDate}`);
    }
  }, [training]);

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

  // Form Fields Admin Panitia
  const [adminFormName, setAdminFormName] = useState('');
  const [adminFormEmail, setAdminFormEmail] = useState('');
  const [adminFormDept, setAdminFormDept] = useState('');
  const [adminFormPhone, setAdminFormPhone] = useState('');
  const [adminFormRole, setAdminFormRole] = useState('Panitia Scanner & Absensi');
  const [adminFormAssignedSession, setAdminFormAssignedSession] = useState('Semua Sesi');
  const [adminFormStatus, setAdminFormStatus] = useState('Aktif');
  const [adminFormPassword, setAdminFormPassword] = useState('AdminPanitia123!');

  // 4. Master Peserta Inline States (Tambah & Edit)
  const [showAddParticipantForm, setShowAddParticipantForm] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState(null);

  // Form Fields Peserta
  const [partFormName, setPartFormName] = useState('');
  const [partFormEmail, setPartFormEmail] = useState('');
  const [partFormInstansi, setPartFormInstansi] = useState('');
  const [partFormJabatan, setPartFormJabatan] = useState('');
  const [partFormPhone, setPartFormPhone] = useState('');
  const [partFormGender, setPartFormGender] = useState('L');
  const [partFormPassword, setPartFormPassword] = useState('Peserta123!');
  const [partFormClassId, setPartFormClassId] = useState('');
  const [partFormQR, setPartFormQR] = useState('');
  const [partFormS1, setPartFormS1] = useState(false);
  const [partFormS2, setPartFormS2] = useState(false);
  const [partFormS3, setPartFormS3] = useState(false);
  const [partFormS4, setPartFormS4] = useState(false);

  // Filter Peserta
  const [filterKomisariat, setFilterKomisariat] = useState('ALL');
  const [filterGender, setFilterGender] = useState('ALL');

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
  const handleUpdateEventInfo = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const formattedRange = `${eventStartDate} - ${eventEndDate}`;
    setEventDateRange(formattedRange);

    const targetDbId = training?.db_id || (typeof training?.id === 'number' ? training.id : 1);
    const startDateFormatted = formatYYYYMMDD(eventStartDate);
    const endDateFormatted = formatYYYYMMDD(eventEndDate);

    try {
      if (targetDbId) {
        await api.updateTraining(targetDbId, {
          title: eventTitle,
          location: eventLocation,
          start_date: startDateFormatted,
          end_date: endDateFormatted,
          banner_slides: eventBannerSlides,
        });
      }
      if (typeof refreshTraining === 'function') {
        await refreshTraining();
      }
    } catch (err) {
      console.warn('Backend updateTraining error fallback to local update:', err);
    }

    setTraining({
      ...training,
      title: eventTitle,
      location: eventLocation,
      dateRange: formattedRange,
      start_date: startDateFormatted,
      end_date: endDateFormatted,
      bannerSlides: eventBannerSlides,
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

  const handleSaveSessionInline = async (e) => {
    e.preventDefault();
    if (!sessionFormTitle || !sessionFormSpeaker) return;

    const formattedTime = `${sessionFormStartTime || '08:00'} - ${sessionFormEndTime || '09:30'} WIB`;
    const formattedDate = formatDDMMYYYY(sessionFormDate || '20/09/2026');
    const dbStatus = sessionFormStatus === 'Akan Datang' ? 'Mendatang' : sessionFormStatus;

    const sessionPayload = {
      title: sessionFormTitle,
      speaker: sessionFormSpeaker,
      room: sessionFormRoom || 'Auditorium Utama',
      session_date: formatYYYYMMDD(sessionFormDate || '20/09/2026'),
      start_time: sessionFormStartTime || '08:00',
      end_time: sessionFormEndTime || '09:30',
      status: dbStatus || 'Mendatang',
    };

    if (editingSessionId) {
      // EDIT EXISTING SESSION IN DATABASE
      const targetSession = (training?.sessions || []).find(s => s.id === editingSessionId);
      const targetId = targetSession?.db_id || editingSessionId;

      try {
        await api.updateSession(targetId, sessionPayload);
      } catch (err) {
        console.warn('API updateSession error:', err);
      }

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
      if (typeof refreshTraining === 'function') {
        await refreshTraining();
      }
      showNotification(`Sesi Materi (${sessionFormTitle}) berhasil diperbarui!`);
    } else {
      // ADD NEW SESSION TO DATABASE
      const trainingId = training?.db_id || training?.id || 1;
      let newSesId = `SES-0${(training?.sessions?.length || 0) + 1}`;
      let createdDbId = undefined;

      try {
        const res = await api.createSession(trainingId, sessionPayload);
        if (res.ok && res.data?.data) {
          newSesId = res.data.data.session_code || res.data.data.id;
          createdDbId = res.data.data.id;
        }
      } catch (err) {
        console.warn('API createSession error:', err);
      }

      const newSesObj = {
        id: newSesId,
        db_id: createdDbId,
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
      if (typeof refreshTraining === 'function') {
        await refreshTraining();
      }
      showNotification(`Sesi Materi Baru (${sessionFormTitle}) berhasil ditambahkan!`);
    }
  };

  const handleDeleteSession = async (sessionId, sessionTitle) => {
    const isConfirmed = await confirmDialog({
      title: 'Hapus Sesi Pelatihan',
      message: `Apakah Anda yakin ingin menghapus Sesi: "${sessionTitle}"?`,
      confirmText: 'Ya, Hapus Sesi',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!isConfirmed) return;

    const targetSession = (training?.sessions || []).find(s => s.id === sessionId);
    const targetId = targetSession?.db_id || sessionId;

    try {
      await api.deleteSession(targetId);
    } catch (err) {
      console.warn('API deleteSession error:', err);
    }

    const filtered = (training?.sessions || []).filter(s => s.id !== sessionId);
    setTraining({ ...training, sessions: filtered });
    if (typeof refreshTraining === 'function') {
      await refreshTraining();
    }
    showNotification(`Sesi "${sessionTitle}" berhasil dihapus.`);
  };

  const getNormalizedSessionStatus = (status) => {
    if (!status) return 'Akan Datang';
    const s = String(status).toLowerCase();
    if (s.includes('datang') || s.includes('mendatang')) return 'Akan Datang';
    if (s.includes('langsung') || s.includes('aktif') || s.includes('jalan')) return 'Berlangsung';
    if (s.includes('selesai') || s.includes('tutup')) return 'Selesai';
    return status;
  };

  const handleUpdateSessionStatus = async (ses, newStatus) => {
    const dbStatus = newStatus === 'Akan Datang' ? 'Mendatang' : newStatus;
    const targetId = ses.db_id || ses.id;

    try {
      await api.updateSession(targetId, { status: dbStatus });
    } catch (err) {
      console.error('Failed to update session status in API:', err);
    }

    const updatedSessions = (training?.sessions || []).map(s => {
      if (s.id === ses.id) {
        return {
          ...s,
          status: dbStatus
        };
      }
      return s;
    });

    setTraining({ ...training, sessions: updatedSessions });
    setOpenSessionMenuId(null);
    if (typeof refreshTraining === 'function') {
      await refreshTraining();
    }
    const displayLabel = dbStatus === 'Mendatang' ? 'Akan Datang' : dbStatus;
    showNotification(`Status sesi "${ses.title}" berhasil diubah menjadi "${displayLabel}".`);
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
    setAdminFormPassword('AdminPanitia123!');
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

  const handleSaveAdminInline = async (e) => {
    e.preventDefault();
    if (!adminFormName || !adminFormEmail) return;

    if (editingAdminId) {
      // EDIT EXISTING ADMIN
      const targetAdmin = adminList.find(a => a.id === editingAdminId);
      const parsedId = parseInt(String(editingAdminId).replace(/\D/g, ''), 10);
      const dbId = targetAdmin?.db_id || (isNaN(parsedId) ? null : parsedId);

      if (dbId) {
        try {
          await api.updateUser(dbId, {
            name: adminFormName,
            email: adminFormEmail,
            instansi: adminFormDept || 'Panitia Pelaksana',
            phone: adminFormPhone,
            role: adminFormRole === 'Administrator Utama' ? 'super_admin' : 'admin'
          });
        } catch (err) {
          console.warn('Backend updateUser admin error:', err);
        }
      }

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
      showNotification(`Data Admin Panitia (${adminFormName}) berhasil diperbarui di database!`);
    } else {
      // ADD NEW ADMIN KE BACKEND & DATABASE
      let newDbId = null;
      try {
        const res = await api.createUser({
          name: adminFormName,
          email: adminFormEmail,
          password: adminFormPassword || 'AdminPanitia123!',
          role: adminFormRole === 'Administrator Utama' ? 'super_admin' : 'admin',
          instansi: adminFormDept || 'Panitia Pelaksana',
          phone: adminFormPhone || '0812-0000-1111',
        });
        if (res && res.ok && (res.data?.data || res.data)) {
          const resUser = res.data?.data || res.data;
          newDbId = resUser.id;
        } else if (res && !res.ok) {
          showNotification(res.data?.message || 'Gagal menyimpan admin ke database backend!');
          return;
        }
      } catch (err) {
        showNotification('Gagal terhubung ke server backend saat membuat akun admin.');
        return;
      }

      const newAdminObj = {
        id: newDbId ? `ADM-${newDbId}` : `ADM-${String(adminList.length + 1).padStart(2, '0')}`,
        db_id: newDbId,
        name: adminFormName,
        email: adminFormEmail,
        dept: adminFormDept || 'Panitia Pelaksana',
        phone: adminFormPhone || '0812-0000-1111',
        role: adminFormRole,
        assignedSession: adminFormAssignedSession,
        status: adminFormStatus,
        createdAt: new Date().toISOString().slice(0, 10)
      };

      setAdminList([newAdminObj, ...adminList]);
      setShowAddAdminForm(false);
      showNotification(`Akun Admin Panitia Baru (${adminFormName}) berhasil disimpan ke database!`);
    }
  };

  const handleToggleAdminStatus = async (adminId) => {
    const targetAdmin = adminList.find(a => a.id === adminId);
    if (!targetAdmin) return;
    const newStatus = targetAdmin.status === 'Aktif' ? 'Nonaktif' : 'Aktif';

    setAdminList(prev => prev.map(adm => {
      if (adm.id === adminId) {
        return { ...adm, status: newStatus };
      }
      return adm;
    }));

    showNotification(`Status akun admin ${targetAdmin.name} diubah menjadi ${newStatus}.`);

    const parsedId = parseInt(String(adminId).replace(/\D/g, ''), 10);
    const dbId = targetAdmin?.db_id || (isNaN(parsedId) ? null : parsedId);

    if (dbId) {
      try {
        await api.updateUser(dbId, { status: newStatus });
      } catch (err) {
        console.warn('Gagal sync status admin ke backend:', err);
      }
    }
  };

  const handleResetPassword = async (adminName) => {
    const targetAdmin = adminList.find(a => a.name === adminName || a.id === editingAdminId);
    const parsedId = parseInt(String(editingAdminId || targetAdmin?.id).replace(/\D/g, ''), 10);
    const dbId = targetAdmin?.db_id || (isNaN(parsedId) ? null : parsedId);

    if (dbId) {
      try {
        await api.updateUser(dbId, { password: 'AdminPanitia123!' });
        showNotification(`Password akun ${adminName} telah direset di database menjadi 'AdminPanitia123!'.`);
        return;
      } catch (err) {
        console.warn('Backend reset password admin error:', err);
      }
    }
    showNotification(`Password akun ${adminName} telah direset.`);
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    const isConfirmed = await confirmDialog({
      title: 'Hapus Akun Admin',
      message: `Apakah Anda yakin ingin menghapus akun Admin: "${adminName}"?`,
      confirmText: 'Ya, Hapus Admin',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!isConfirmed) return;

    const targetAdmin = adminList.find(a => a.id === adminId);
    const parsedId = parseInt(String(adminId).replace(/\D/g, ''), 10);
    const dbId = targetAdmin?.db_id || (isNaN(parsedId) ? null : parsedId);

    setAdminList(prev => prev.filter(a => a.id !== adminId));
    showNotification(`Akun Admin "${adminName}" telah dihapus.`);

    if (dbId) {
      try {
        await api.deleteUser(dbId);
      } catch (err) {
        console.warn('Backend deleteUser admin error:', err);
      }
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
    setPartFormGender('L');
    setPartFormPassword('Peserta123!');
    setPartFormClassId('');
    const randomToken = `${Math.floor(100000 + Math.random() * 900000)}`;
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
    setPartFormGender(p.gender || 'L');
    setPartFormPassword('');
    setPartFormClassId(p.class_id ? String(p.class_id) : '');
    setPartFormQR(p.qrToken || '');
    setPartFormS1(!!p.attendances?.['SES-01']?.present);
    setPartFormS2(!!p.attendances?.['SES-02']?.present);
    setPartFormS3(!!p.attendances?.['SES-03']?.present);
    setPartFormS4(!!p.attendances?.['SES-04']?.present);
  };

  const handleSaveParticipantInline = async (e) => {
    e.preventDefault();
    if (!partFormName || !partFormEmail) return;

    const attendancesObj = {
      'SES-01': { present: partFormS1, time: partFormS1 ? '08:30 WIB' : null },
      'SES-02': { present: partFormS2, time: partFormS2 ? '10:15 WIB' : null },
      'SES-03': { present: partFormS3, time: partFormS3 ? '13:45 WIB' : null },
      'SES-04': { present: partFormS4, time: partFormS4 ? '15:45 WIB' : null }
    };

    const targetClassObj = (availableClasses || []).find(c => String(c.id) === String(partFormClassId));
    const assignedClassName = targetClassObj ? targetClassObj.name : 'Kelas Umum';
    const assignedClassCode = targetClassObj ? targetClassObj.code : 'KELAS-UMUM';

    if (editingParticipantId) {
      // EDIT EXISTING PARTICIPANT
      const targetP = (participants || []).find(p => p.id === editingParticipantId);
      const parsedId = parseInt(String(editingParticipantId).replace(/\D/g, ''), 10);
      const dbId = targetP?.db_id || (isNaN(parsedId) ? null : parsedId);

      const updatedP = (participants || []).map(p => {
        if (p.id === editingParticipantId) {
          return {
            ...p,
            name: partFormName,
            email: partFormEmail,
            instansi: partFormInstansi || 'Umum',
            phone: partFormPhone,
            gender: partFormGender || 'L',
            class_id: partFormClassId ? parseInt(partFormClassId, 10) : null,
            className: assignedClassName,
            classCode: assignedClassCode,
            qrToken: partFormQR || p.qrToken,
            user_qr_token: partFormQR || p.user_qr_token,
            attendances: {
              ...p.attendances,
              ...attendancesObj
            }
          };
        }
        return p;
      });

      setParticipants(updatedP);
      setEditingParticipantId(null);
      showNotification(`Data Peserta (${partFormName}) berhasil diperbarui!`);

      if (dbId) {
        try {
          const updatePayload = {
            name: partFormName,
            email: partFormEmail,
            instansi: partFormInstansi,
            phone: partFormPhone,
            gender: partFormGender || 'L',
            role: 'participant',
            class_id: partFormClassId ? parseInt(partFormClassId, 10) : null,
          };
          if (partFormPassword && partFormPassword.trim()) {
            updatePayload.password = partFormPassword.trim();
          }
          await api.updateUser(dbId, updatePayload);
        } catch (err) {
          console.warn('Backend updateUser error:', err);
        }
      }
    } else {
      // ADD NEW PARTICIPANT
      const tempId = `USR-${String((participants?.length || 0) + 501).padStart(4, '0')}`;
      let newDbId = null;
      let generatedToken = null;

      try {
        const res = await api.createUser({
          name: partFormName,
          email: partFormEmail,
          password: partFormPassword || 'Peserta123!',
          role: 'participant',
          gender: partFormGender || 'L',
          class_id: partFormClassId ? parseInt(partFormClassId, 10) : null,
          instansi: partFormInstansi || 'Instansi Umum',
          phone: partFormPhone || '0812-0000-2222',
        });
        if (res && res.ok && (res.data?.data || res.data)) {
          const resUser = res.data?.data || res.data;
          newDbId = resUser.id;
          generatedToken = resUser.user_qr_token;
        } else if (res && !res.ok) {
          showNotification(res.data?.message || 'Gagal menyimpan peserta ke database backend!');
          return;
        }
      } catch (err) {
        showNotification('Terjadi kesalahan koneksi saat menyimpan peserta ke server.');
        return;
      }

      const finalToken = generatedToken || partFormQR || `${Math.floor(100000 + Math.random() * 900000)}`;

      const newPartObj = {
        id: newDbId ? `USR-${newDbId}` : tempId,
        db_id: newDbId,
        name: partFormName,
        email: partFormEmail,
        instansi: partFormInstansi || 'Instansi Umum',
        phone: partFormPhone || '0812-0000-2222',
        gender: partFormGender || 'L',
        class_id: partFormClassId ? parseInt(partFormClassId, 10) : null,
        className: assignedClassName,
        classCode: assignedClassCode,
        qrToken: finalToken,
        user_qr_token: finalToken,
        role: 'participant',
        attendances: attendancesObj,
        trainingStatus: 'Aktif'
      };

      setParticipants([newPartObj, ...(participants || [])]);
      setShowAddParticipantForm(false);
      showNotification(`Peserta Baru (${partFormName}) berhasil disimpan ke database! Password login default: Password123!`);
    }
  };

  const handleDeleteParticipant = async (partId, partName) => {
    const isConfirmed = await confirmDialog({
      title: 'Hapus Peserta',
      message: `Apakah Anda yakin ingin menghapus peserta: "${partName}"?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!isConfirmed) return;

    const targetP = (participants || []).find(p => p.id === partId);
    const parsedId = parseInt(String(partId).replace(/\D/g, ''), 10);
    const dbId = targetP?.db_id || (isNaN(parsedId) ? null : parsedId);

    setParticipants(prev => prev.filter(p => p.id !== partId));
    showNotification(`Data peserta "${partName}" telah dihapus.`);

    if (dbId) {
      try {
        await api.deleteUser(dbId);
      } catch (err) {
        console.warn('Backend deleteUser error:', err);
      }
    }
  };

  // --- HANDLER WEBSITE SETTINGS ---
  const handleSaveSiteSettings = async (e) => {
    e.preventDefault();
    setSiteSettings(formSettings);
    showNotification('Pengaturan Website & Modus Maintenance berhasil disimpan!');

    try {
      await api.updateSiteSettings({
        app_name: formSettings.siteName,
        tagline: formSettings.tagline,
        support_email: formSettings.contactEmail,
        whatsapp_number: formSettings.whatsappNumber,
        maintenance_mode: formSettings.isMaintenance ? 'true' : 'false',
      });
    } catch (err) {
      console.warn('Backend updateSiteSettings error:', err);
    }
  };

  const handleExportExcelPeserta = () => {
    const eventTitle = training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung';
    const now = new Date();
    const nowStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + 
                   now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.') + ' WIB';

    const wb = createPesertaPerKelasWorkbook({
      eventTitle,
      nowStr,
      participants: participants || [],
      classes: availableClasses || []
    });

    const fileName = `Data_Peserta_PerKelas_SuperAdmin_${new Date().toISOString().slice(0, 10)}.xlsx`;
    downloadWorkbook(wb, fileName);
    showNotification('Data peserta berformat Excel XLSX (Sheet per Kelas + Semua Peserta) berhasil diekspor!');
  };

  const handleExportCSV = handleExportExcelPeserta;

  const handleExportRekap = () => {
    const sessionsList = training?.sessions || [];
    const eventTitle = training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung 2026';
    const nowStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const wb = XLSX.utils.book_new();
    const ws = createPresensiMatrixWorksheet({
      eventTitle,
      nowStr,
      participants: participants || [],
      sessions: sessionsList
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan Seluruh Sesi');
    const fileName = `Rekap_Presensi_SuperAdmin_LK1_HMI_${new Date().toISOString().slice(0, 10)}.xlsx`;
    downloadWorkbook(wb, fileName);
    showNotification('File Excel XLSX Rekapitulasi Presensi Seluruh Sesi rapih berhasil diekspor!');
  };

  const handleSetPresensi = async (participant) => {
    const targetSessionId = training?.sessions?.[0]?.id || 'SES-01';
    const sessionObj = training?.sessions?.[0] || { id: targetSessionId };
    const sessionDbId = sessionObj?.db_id || targetSessionId;
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
            [targetSessionId]: { present: true, time: nowTime, note: 'Diset Hadir oleh Super Admin', status: 'Hadir' },
            ...(sessionDbId ? { [sessionDbId]: { present: true, time: nowTime, note: 'Diset Hadir oleh Super Admin', status: 'Hadir' } } : {})
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Presensi Berhasil! ${participant.name} diset HADIR.`);
    setActiveActionMenuId(null);

    try {
      await api.setAttendanceStatus({
        user_id: participant.db_id || participant.id,
        training_session_id: sessionDbId,
        status: 'present',
        note: 'Diset Hadir oleh Super Admin',
        source: 'manual_superadmin'
      });
    } catch (err) {
      console.error('Failed to sync setPresensi in SuperAdminDashboard:', err);
    }
  };

  const handleSetAbsent = async (participant) => {
    const targetSessionId = training?.sessions?.[0]?.id || 'SES-01';
    const sessionObj = training?.sessions?.[0] || { id: targetSessionId };
    const sessionDbId = sessionObj?.db_id || targetSessionId;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const updatedParticipants = participants.map(p => {
      if (p.id === participant.id) {
        return {
          ...p,
          status: 'Tidak Hadir',
          isExcused: false,
          excuseReason: null,
          attendances: {
            ...p.attendances,
            [targetSessionId]: { present: false, time: nowTime, note: 'Tidak Hadir / Alpa', status: 'Tidak Hadir' },
            ...(sessionDbId ? { [sessionDbId]: { present: false, time: nowTime, note: 'Tidak Hadir / Alpa', status: 'Tidak Hadir' } } : {})
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Status presensi ${participant.name} diubah menjadi TIDAK HADIR.`);
    setActiveActionMenuId(null);

    try {
      await api.setAttendanceStatus({
        user_id: participant.db_id || participant.id,
        training_session_id: sessionDbId,
        status: 'absent',
        note: 'Tidak Hadir / Alpa',
        source: 'manual_superadmin'
      });
    } catch (err) {
      console.error('Failed to sync setAbsent in SuperAdminDashboard:', err);
    }
  };

  const handleSaveExcuse = async (e) => {
    e.preventDefault();
    if (!excuseModalUser) return;

    const targetSessionId = training?.sessions?.[0]?.id || 'SES-01';
    const sessionObj = training?.sessions?.[0] || { id: targetSessionId };
    const sessionDbId = sessionObj?.db_id || targetSessionId;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const finalReason = excuseReasonText.trim() || 'Izin / Berhalangan';
    const targetUserId = excuseModalUser.db_id || excuseModalUser.id;
    const targetUserName = excuseModalUser.name;

    const updatedParticipants = participants.map(p => {
      if (p.id === excuseModalUser.id) {
        return {
          ...p,
          status: 'Izin',
          isExcused: true,
          excuseReason: finalReason,
          attendances: {
            ...p.attendances,
            [targetSessionId]: { present: false, status: 'Izin', time: nowTime, note: finalReason },
            ...(sessionDbId ? { [sessionDbId]: { present: false, status: 'Izin', time: nowTime, note: finalReason } } : {})
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Status & Alasan Izin untuk ${targetUserName} berhasil disimpan!`);
    setExcuseModalUser(null);
    setExcuseReasonText('');

    try {
      await api.setAttendanceStatus({
        user_id: targetUserId,
        training_session_id: sessionDbId,
        status: 'permission',
        note: finalReason,
        source: 'manual_superadmin'
      });
    } catch (err) {
      console.error('Failed to sync saveExcuse in SuperAdminDashboard:', err);
    }
  };

  // Filters
  const filteredAdmins = (adminList || []).filter(adm =>
    (adm?.name || '').toLowerCase().includes((searchAdmin || '').toLowerCase()) ||
    (adm?.email || '').toLowerCase().includes((searchAdmin || '').toLowerCase()) ||
    (adm?.phone || '').toLowerCase().includes((searchAdmin || '').toLowerCase()) ||
    (adm?.dept || '').toLowerCase().includes((searchAdmin || '').toLowerCase())
  ).sort((a, b) => {
    // 1. Super Admin / MOT Utama diprioritaskan di baris pertama
    const isSuperA = a.raw_role === 'super_admin' || a.role === 'Administrator Utama' || (a.name || '').toLowerCase().includes('utama');
    const isSuperB = b.raw_role === 'super_admin' || b.role === 'Administrator Utama' || (b.name || '').toLowerCase().includes('utama');
    if (isSuperA && !isSuperB) return -1;
    if (!isSuperA && isSuperB) return 1;

    // 2. Urutkan berdasarkan Kelas yang dikelola (Kelas A -> Kelas B -> Kelas C -> Kelas D -> Kelas E -> Kelas F)
    const classA = (a.managed_classes_names?.[0] || a.managedClasses?.[0]?.name || '').trim();
    const classB = (b.managed_classes_names?.[0] || b.managedClasses?.[0]?.name || '').trim();

    if (classA && classB) {
      const classComp = classA.localeCompare(classB, 'id', { numeric: true, sensitivity: 'base' });
      if (classComp !== 0) return classComp;
    } else if (classA && !classB) {
      return -1;
    } else if (!classA && classB) {
      return 1;
    }

    // 3. Dalam kelas yang sama, akun MOT mendahului TM (contoh MOT A sebelum TM A1)
    const nameA = (a.name || '').trim();
    const nameB = (b.name || '').trim();
    const isMotA = nameA.toUpperCase().startsWith('MOT');
    const isMotB = nameB.toUpperCase().startsWith('MOT');
    if (isMotA && !isMotB) return -1;
    if (!isMotA && isMotB) return 1;

    // 4. Urutkan secara alfabetis dan numerik (TM A1, TM A2, TM A3, dst)
    return nameA.localeCompare(nameB, 'id', { numeric: true, sensitivity: 'base' });
  });

  const filteredParticipants = (participants || [])
    .filter(p => {
      const searchLower = searchParticipant.toLowerCase();
      const matches = (p.name || '').toLowerCase().includes(searchLower) ||
                      (p.email || '').toLowerCase().includes(searchLower) ||
                      (p.qrToken || p.user_qr_token || '').toLowerCase().includes(searchLower) ||
                      (p.instansi || '').toLowerCase().includes(searchLower);

      if (!matches) return false;

      // Filter berdasarkan Komisariat
      if (filterKomisariat !== 'ALL') {
        if ((p.instansi || '').trim().toLowerCase() !== filterKomisariat.trim().toLowerCase()) {
          return false;
        }
      }

      // Filter berdasarkan Gender
      if (filterGender !== 'ALL') {
        const userGender = (p.gender || '').toUpperCase();
        if (userGender !== filterGender.toUpperCase()) {
          return false;
        }
      }

      // Filter berdasarkan Kelas Binaan
      if (filterClass !== 'ALL') {
        if (filterClass === 'UMUM') {
          if (p.class_id) return false;
        } else {
          if (String(p.class_id) !== String(filterClass)) return false;
        }
      }

      if (filterSession === 'ALL') return true;
      if (filterSession === 'BELUM') return !p.attendances?.['SES-01']?.present && !p.isExcused && p.status !== 'Izin';
      if (filterSession === 'HADIR') return (p.attendances?.['SES-01']?.present || p.status === 'Hadir');
      if (filterSession === 'IZIN') return (p.isExcused || p.status === 'Izin' || p.attendances?.['SES-01']?.status === 'Izin');
      if (filterSession === 'SES-01') return !!p.attendances?.['SES-01']?.present;
      if (filterSession === 'SES-02') return !!p.attendances?.['SES-02']?.present;
      if (filterSession === 'SES-03') return !!p.attendances?.['SES-03']?.present;
      return true;
    })
    .sort((a, b) => {
      // Prioritas 1: Kelas Umum (tidak memiliki class_id) berada di urutan paling atas
      const isA_Umum = !a.class_id;
      const isB_Umum = !b.class_id;

      if (isA_Umum && !isB_Umum) return -1;
      if (!isA_Umum && isB_Umum) return 1;

      // Prioritas 2: Jika sama-sama kelas khusus, urutkan berdasarkan Nama Kelas (contoh: Kelas A, Kelas B, Kelas C, Kelas D)
      if (!isA_Umum && !isB_Umum) {
        const classNameA = (a.className || '').trim();
        const classNameB = (b.className || '').trim();
        const classComp = classNameA.localeCompare(classNameB, 'id', { sensitivity: 'base' });
        if (classComp !== 0) return classComp;
      }

      // Prioritas 3: Urutkan berdasarkan Nama Peserta
      return (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' });
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
        user={{ name: 'Super Admin Utama', email: 'admin@presentrain.com', role: 'super_admin' }}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  if (activeTab === 'helpdesk') {
    return (
      <HelpdeskView
        user={user || { name: 'Super Admin', email: 'admin@presentrain.com', role: 'super_admin' }}
        siteSettings={siteSettings}
        tickets={tickets}
        setTickets={setTickets}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  if (activeTab === 'guide') {
    return (
      <GuideView
        user={user || { name: 'Super Admin', email: 'admin@presentrain.com', role: 'super_admin' }}
        onBack={() => setActiveTab && setActiveTab('overview')}
      />
    );
  }

  if (activeTab === 'classes_management') {
    return (
      <ClassesManagementView
        participants={participants}
        adminList={adminList}
        training={training}
        assessments={assessments}
        quizzes={quizzes}
        quizSubmissions={quizSubmissions}
        onNotification={(msg) => showNotification(msg)}
      />
    );
  }

  if (activeTab === 'rekap_penilaian') {
    return (
      <AdminDashboard
        training={training}
        refreshTraining={refreshTraining}
        participants={participants}
        setParticipants={setParticipants}
        refreshParticipants={refreshParticipants}
        activeTab="rekap_penilaian"
        setActiveTab={setActiveTab}
        siteSettings={siteSettings}
        currentUser={user}
        onUpdateUser={onUpdateUser}
        userPermissions={{
          canManageAttendance: true,
          canManageGrading: true,
          canManageAssessment: true,
          canManageQuiz: true,
        }}
        quizzes={quizzes}
        setQuizzes={setQuizzes}
        quizSubmissions={quizSubmissions}
        setQuizSubmissions={setQuizSubmissions}
        quizRequests={quizRequests}
        setQuizRequests={setQuizRequests}
        assessments={assessments}
        setAssessments={setAssessments}
        refreshAssessments={refreshAssessments}
        tickets={tickets}
        setTickets={setTickets}
      />
    );
  }

  if (activeTab === 'quiz_management') {
    if (activeQuizBuilder !== null) {
      return (
        <GoogleFormQuizBuilder
          initialQuiz={activeQuizBuilder.id ? activeQuizBuilder : null}
          currentUser={user}
          onSaveQuiz={async (savedQuiz) => {
            try {
              const exists = (quizzes || []).some(q => q.id === savedQuiz.id);
              if (exists) {
                await api.updateQuiz(savedQuiz.id, savedQuiz);
              } else {
                await api.createQuiz(savedQuiz);
              }
            } catch (err) {
              console.warn('API saveQuiz error:', err);
            }

            if (setQuizzes) {
              setQuizzes((prev) => {
                const exists = (prev || []).some(q => q.id === savedQuiz.id);
                if (exists) {
                  return (prev || []).map(q => q.id === savedQuiz.id ? savedQuiz : q);
                } else {
                  return [savedQuiz, ...(prev || [])];
                }
              });
            }
            setActiveQuizBuilder(null);
            showNotification(`Quiz ("${savedQuiz.title}") Berhasil Disimpan & Dipublikasikan!`);
          }}
          onCancel={() => setActiveQuizBuilder(null)}
        />
      );
    }

    if (activeQuizForResults !== null) {
      return (
        <QuizResultsView
          quiz={activeQuizForResults}
          participants={participants}
          quizSubmissions={quizSubmissions}
          onRefresh={async () => {
            try {
              const res = await api.getQuizSubmissions(activeQuizForResults.id);
              if (res?.ok && res.data) {
                if (setQuizSubmissions) setQuizSubmissions(res.data);
              }
            } catch (e) {
              console.warn(e);
            }
          }}
          onUpdateSubmission={async (updatedSub) => {
            let savedResult = null;
            try {
              const quizId = activeQuizForResults.id || updatedSub.quizId || updatedSub.quiz_id;
              const isExistingInDb = updatedSub.db_id || (updatedSub.id && !String(updatedSub.id).startsWith('SUB-MANUAL-'));
              
              if (isExistingInDb) {
                const targetId = updatedSub.db_id || updatedSub.id;
                savedResult = await api.updateQuizSubmission(targetId, updatedSub);
              } else {
                // Peserta belum pernah submit kuis (belum ada baris di tabel database): buat entri baru via submitQuiz
                savedResult = await api.submitQuiz(quizId, updatedSub);
                if (!savedResult?.ok) {
                  // Fallback ke updateQuizSubmission jika endpoint kuis khusus tidak merespon
                  const targetId = updatedSub.db_id || updatedSub.id;
                  savedResult = await api.updateQuizSubmission(targetId, updatedSub);
                }
              }
            } catch (err) {
              console.warn('API updateQuizSubmission / submitQuiz error:', err);
            }

            const dataToMerge = (savedResult && (savedResult.data || savedResult.submission || (!savedResult.error && savedResult.id ? savedResult : null))) || updatedSub;

            if (setQuizSubmissions) {
              setQuizSubmissions(prev => {
                const list = prev || [];
                const idx = list.findIndex(s => 
                  s.id === dataToMerge.id || 
                  (s.db_id && dataToMerge.db_id && s.db_id === dataToMerge.db_id) ||
                  (s.id && dataToMerge.id && String(s.id) === String(dataToMerge.id)) ||
                  (isSubmissionForQuiz(s, activeQuizForResults) && isSubmissionForParticipant(s, dataToMerge))
                );
                if (idx >= 0) {
                  const updated = [...list];
                  updated[idx] = { ...updated[idx], ...dataToMerge };
                  return updated;
                }
                return [dataToMerge, ...list];
              });
            }

            // Sync langsung dengan server database
            if (typeof refreshAllData === 'function') {
              try {
                await refreshAllData();
              } catch (e) {
                console.warn(e);
              }
            }
          }}
          isSuperAdmin={true}
          onResetSubmission={async (sub, participant) => {
            const subId = sub.db_id || sub.id;
            try {
              const res = await api.deleteQuizSubmission(subId);
              if (res && (res.ok || res.status === 'success' || !res.error)) {
                if (setQuizSubmissions) {
                  setQuizSubmissions(prev => (prev || []).filter(s => 
                    s.id !== sub.id && 
                    (!sub.db_id || s.db_id !== sub.db_id) &&
                    !(String(s.participantId) === String(sub.participantId) && String(s.quizId) === String(sub.quizId))
                  ));
                }
                return { ok: true };
              }
              return { ok: false, error: res?.message || res?.error };
            } catch (err) {
              return { ok: false, error: err.message };
            }
          }}
          currentUser={user}
          onBack={() => setActiveQuizForResults(null)}
          showNotification={showNotification}
        />
      );
    }

    const quizList = quizzes || [];

    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Kelola Bank Soal & Kuis (Super Admin)</h2>
            <p className="text-xs text-slate-500 mt-1">Buat, perbarui, dan tinjau seluruh kuis untuk seluruh kelas dan Kelas Umum</p>
          </div>
          <button
            onClick={() => setActiveQuizBuilder({})}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Buat Kuis Baru</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[320px]">
          <div className="overflow-x-visible">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 text-center w-12">#</th>
                  <th className="py-3.5 px-4">Judul Kuis</th>
                  <th className="py-3.5 px-4 text-center">Tipe</th>
                  <th className="py-3.5 px-4 text-center w-36">Status Kelas Umum</th>
                  <th className="py-3.5 px-4 text-center w-24">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {quizList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Belum ada kuis yang dibuat. Klik tombol "+ Buat Kuis Baru" di atas.
                    </td>
                  </tr>
                ) : (
                  quizList.map((qz, idx) => {
                    const quizKey = qz.db_id || qz.id;
                    const accessObj = generalQuizAccessList.find(a => 
                      (qz.db_id && String(a.quiz_id) === String(qz.db_id)) ||
                      String(a.quiz_id) === String(qz.id) ||
                      (a.quiz_code && String(a.quiz_code) === String(qz.quiz_code || qz.id)) ||
                      (a.id && String(a.id) === String(qz.id))
                    );
                    const isOpen = accessObj?.status === 'buka';
                    const isToggling = togglingQuizId === (qz.id || qz.db_id) || togglingQuizId === quizKey;

                    return (
                    <tr key={qz.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{qz.title}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          qz.type === 'pretest' || qz.type === 'pre_test'
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : (qz.type === 'midtest' || qz.type === 'mid_test' || qz.type === 'evaluasi'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : (qz.type === 'quiz' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'))
                        }`}>
                          {qz.type === 'pretest' || qz.type === 'pre_test' ? 'Pre-Test' : (qz.type === 'midtest' || qz.type === 'mid_test' || qz.type === 'evaluasi' ? 'Mid-Test' : (qz.type === 'quiz' ? 'Quiz Materi' : 'Post-Test'))}
                        </span>
                      </td>

                      {/* STATUS KELAS UMUM (BUKA / TUTUP TOGGLE KHUSUS ADMIN UTAMA) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={async () => {
                              if (isToggling) return;
                              const nextStatus = isOpen ? 'tutup' : 'buka';
                              setTogglingQuizId(quizKey);
                              try {
                                const res = await api.toggleClassQuizAccess('general', quizKey, nextStatus);
                                if (res && res.ok) {
                                  // Update state lokal secara optimis
                                  setGeneralQuizAccessList(prev => {
                                    const prevList = Array.isArray(prev) ? prev : [];
                                    const matchIdx = prevList.findIndex(a =>
                                      (qz.db_id && String(a.quiz_id) === String(qz.db_id)) ||
                                      String(a.quiz_id) === String(qz.id) ||
                                      (a.quiz_code && String(a.quiz_code) === String(qz.quiz_code || qz.id))
                                    );
                                    if (matchIdx >= 0) {
                                      const copy = [...prevList];
                                      copy[matchIdx] = { ...copy[matchIdx], status: nextStatus };
                                      return copy;
                                    }
                                    return [...prevList, { quiz_id: qz.db_id || qz.id, quiz_code: qz.quiz_code || qz.id, status: nextStatus }];
                                  });
                                  showNotification(`Akses kuis "${qz.title}" untuk Kelas Umum berhasil diubah ke: ${nextStatus.toUpperCase()}`);
                                  await fetchGeneralQuizAccess();
                                } else {
                                  showNotification(res?.error || 'Gagal mengubah status kuis.', 'error');
                                }
                              } catch (err) {
                                console.warn(err);
                                showNotification(err?.message || 'Gagal mengubah status kuis.', 'error');
                              } finally {
                                setTogglingQuizId(null);
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all cursor-pointer flex items-center space-x-1 shadow-xs active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                              isOpen 
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Klik untuk Buka atau Tutup kuis bagi peserta Kelas Umum"
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                            ) : isOpen ? (
                              <ToggleRight className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{isToggling ? 'MENYIMPAN...' : isOpen ? 'DIBUKA' : 'DITUTUP'}</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenQuizMenuId(openQuizMenuId === qz.id ? null : qz.id);
                            }}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Menu Aksi Kuis"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openQuizMenuId === qz.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setOpenQuizMenuId(null)}
                              />
                              <div className="absolute right-full top-0 mr-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-150">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenQuizMenuId(null);
                                    setActiveQuizForResults(qz);
                                  }}
                                  className="w-full px-4 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 font-semibold transition-colors cursor-pointer"
                                >
                                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Hasil & Koreksi</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenQuizMenuId(null);
                                    setActiveQuizBuilder(qz);
                                  }}
                                  className="w-full px-4 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 font-semibold transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Edit Soal</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    setOpenQuizMenuId(null);
                                    try {
                                      const res = await api.duplicateQuiz(qz.id);
                                      if (res?.ok && res.data) {
                                        if (setQuizzes) {
                                          setQuizzes(prev => [res.data, ...(prev || [])]);
                                        }
                                        showNotification(`Kuis "${qz.title}" berhasil diduplikat! Kuis baru siap dikerjakan.`);
                                      } else {
                                        // Fallback frontend duplicate jika backend offline
                                        const newDuplicate = {
                                          ...qz,
                                          id: 'QZ-' + Date.now(),
                                          title: `${qz.title} (Duplikat)`,
                                          linkCode: 'QUIZ-' + Math.floor(1000 + Math.random() * 9000),
                                          createdAt: new Date().toLocaleDateString('id-ID'),
                                          questions: (qz.questions || []).map((q, qIdx) => ({
                                            ...q,
                                            id: `QT-${Date.now()}-${qIdx + 1}`
                                          }))
                                        };
                                        if (setQuizzes) {
                                          setQuizzes(prev => [newDuplicate, ...(prev || [])]);
                                        }
                                        showNotification(`Kuis "${qz.title}" berhasil diduplikat!`);
                                      }
                                    } catch (err) {
                                      console.warn('Gagal duplikat kuis:', err);
                                      showNotification('Terjadi kesalahan saat menduplikat kuis.');
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 font-semibold transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Duplikat Kuis</span>
                                </button>

                                <div className="my-1 border-t border-slate-100"></div>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    setOpenQuizMenuId(null);
                                    const ok = await confirmDialog({
                                      title: 'Hapus Kuis',
                                      message: `Apakah Anda yakin ingin menghapus kuis "${qz.title}"?`,
                                      confirmText: 'Hapus',
                                      cancelText: 'Batal',
                                      type: 'danger'
                                    });
                                    if (ok) {
                                      try {
                                        await api.deleteQuiz(qz.id);
                                        if (setQuizzes) setQuizzes(prev => (prev || []).filter(item => item.id !== qz.id));
                                        showNotification('Kuis berhasil dihapus.');
                                      } catch (err) {
                                        console.warn(err);
                                      }
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 font-semibold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Hapus Kuis</span>
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
    );
  }

  // TAB 1: OVERVIEW (BERANDA APP DASHBOARD & DEFAULT FALLBACK)
  if (
    activeTab === 'overview' || 
    !activeTab || 
    !['classes_management', 'rekap_penilaian', 'quiz_management', 'events_management', 'admin_management', 'participants_master', 'system_stats', 'profile', 'settings', 'helpdesk', 'guide'].includes(activeTab)
  ) {
    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans w-full">

        {/* ================= 2-COLUMN DESKTOP / LANDSCAPE HERO & QUICK MENU GRID ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          
          {/* KOLOM KIRI (GREEN WELCOME CARD + 3D CHARACTER) */}
          <div className="lg:col-span-6 xl:col-span-6 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 text-white rounded-xl p-3.5 sm:p-5 md:p-6 relative overflow-hidden shadow-xl shadow-emerald-950/10 border border-emerald-600/30 flex flex-col justify-between min-h-[145px] sm:min-h-[210px] lg:min-h-[230px]">
            
            {/* Subtle Ambient Background Orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col justify-between h-full space-y-2 sm:space-y-4">
              {/* Header Text */}
              <div className="pr-20 sm:pr-32 lg:pr-36">
                <div className="flex items-center">
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-emerald-200 uppercase tracking-widest">
                    Aplikasi Presensi & Penilaian
                  </span>
                </div>
                <div className="mt-1 leading-tight">
                  <p className="text-xs sm:text-sm md:text-base font-normal text-emerald-100 tracking-tight">
                    Selamat Datang,
                  </p>
                  <h2 className="text-sm sm:text-lg md:text-xl font-bold text-white tracking-tight mt-0.5">
                    Kanda/Yunda
                  </h2>
                </div>
              </div>

              {/* Mini Ringkasan Dashboard - Compact & Non-overflowing Circles */}
              <div className="mt-1.5 sm:mt-auto pt-0 sm:pt-2 max-w-[155px] xs:max-w-[180px] sm:max-w-[210px] md:max-w-[225px] lg:max-w-[235px]">
                <div className="grid grid-cols-3 divide-x divide-white/20">
                  
                  {/* Stat 1: Total Sesi */}
                  <div className="flex flex-col items-center justify-center px-0.5 sm:px-1 text-center">
                    <div className="relative w-5 h-5 sm:w-6.5 sm:h-6.5 md:w-7 md:h-7 flex items-center justify-center shrink-0 mx-auto">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="18" className="stroke-white/20" strokeWidth="3.2" fill="transparent" />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          className="stroke-emerald-300 transition-all duration-1000 ease-out"
                          strokeWidth="3.2"
                          strokeDasharray={2 * Math.PI * 18}
                          strokeDashoffset={(2 * Math.PI * 18) * (1 - 0.75)}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-center">
                        <span className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-black text-white tracking-tighter leading-none whitespace-nowrap">
                          0{(training?.sessions || []).length || 4}
                        </span>
                      </div>
                    </div>
                    <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                      Total Sesi
                    </span>
                  </div>

                  {/* Stat 2: Admin Panitia */}
                  <div className="flex flex-col items-center justify-center px-0.5 sm:px-1 text-center">
                    <div className="relative w-5 h-5 sm:w-6.5 sm:h-6.5 md:w-7 md:h-7 flex items-center justify-center shrink-0 mx-auto">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="18" className="stroke-white/20" strokeWidth="3.2" fill="transparent" />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          className="stroke-emerald-300 transition-all duration-1000 ease-out"
                          strokeWidth="3.2"
                          strokeDasharray={2 * Math.PI * 18}
                          strokeDashoffset={(2 * Math.PI * 18) * (1 - 0.50)}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-center">
                        <span className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-black text-white tracking-tighter leading-none whitespace-nowrap">
                          0{(siteSettings?.admins || []).length || 2}
                        </span>
                      </div>
                    </div>
                    <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                      Admin Panitia
                    </span>
                  </div>

                  {/* Stat 3: Total Peserta */}
                  <div className="flex flex-col items-center justify-center px-0.5 sm:px-1 text-center">
                    <div className="relative w-5 h-5 sm:w-6.5 sm:h-6.5 md:w-7 md:h-7 flex items-center justify-center shrink-0 mx-auto">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="18" className="stroke-white/20" strokeWidth="3.2" fill="transparent" />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          className="stroke-emerald-300 transition-all duration-1000 ease-out"
                          strokeWidth="3.2"
                          strokeDasharray={2 * Math.PI * 18}
                          strokeDashoffset={(2 * Math.PI * 18) * (1 - 0.90)}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-center">
                        <span className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-black text-white tracking-tighter leading-none whitespace-nowrap">
                          {(participants || []).length || 45}
                        </span>
                      </div>
                    </div>
                    <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                      Total Peserta
                    </span>
                  </div>

                </div>
              </div>

              {/* 3D Welcome Chibi Characters - Smooth Bottom Transparent Mask Gradient */}
              <div className="absolute bottom-2.5 sm:bottom-0 right-1 sm:right-2 md:right-3 h-[90%] sm:h-[98%] lg:h-[105%] max-h-[115px] sm:max-h-[150px] lg:max-h-[170px] flex items-end justify-end pointer-events-none z-10">
                <img 
                  src="/welcome_3d_icon.png" 
                  alt="Selamat Datang 3D" 
                  className="h-full w-auto object-contain object-bottom drop-shadow-lg select-none"
                  style={{
                    maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* KOLOM KANAN (MENU GRID CARD) */}
          <div className="lg:col-span-6 xl:col-span-6 glass-panel-light rounded-xl border border-white/70 shadow-lg overflow-hidden flex flex-col justify-center">
            <div className="grid grid-cols-3 h-full divide-x divide-y divide-slate-100/90">
              
              {/* Tile 1: Manajemen Kelas */}
              <button
                onClick={() => setActiveTab('classes_management')}
                className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
              >
                <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                  <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                  Manajemen Kelas
                </span>
              </button>

              {/* Tile 2: Kelola Kuis */}
              <button
                onClick={() => setActiveTab('quiz_management')}
                className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
              >
                <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                  Kelola Kuis
                </span>
              </button>

              {/* Tile 3: Admin Panitia */}
              <button
                onClick={() => setActiveTab('admin_management')}
                className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-b border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
              >
                <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                  Admin Panitia
                </span>
              </button>

              {/* Tile 4: Rekap Penilaian (Sinkron Administrator & Admin Utama) */}
              <button
                onClick={() => setActiveTab('rekap_penilaian')}
                className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
              >
                <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                  <Award className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                  Rekap Penilaian
                </span>
              </button>

              {/* Tile 5: Master Peserta */}
              <button
                onClick={() => setActiveTab('participants_master')}
                className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
              >
                <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                  Master Peserta
                </span>
              </button>

              {/* Tile 6: Audit Log Server */}
              <button
                onClick={() => setActiveTab('system_stats')}
                className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
              >
                <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                  <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                  Audit Log Server
                </span>
              </button>

            </div>
          </div>

        </div>

        {/* ================= ACTIVITY FEED (RINGKASAN AUDIT LOG SERVER) ================= */}
        <div className="light-card rounded-3xl p-6 space-y-4 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Aktivitas Terkini System
            </h4>
            <button onClick={() => setActiveTab('system_stats')} className="text-[11px] font-bold text-emerald-600 hover:underline">
              Lihat Semua Log →
            </button>
          </div>

          {/* 4 Kartu Ringkasan Metrik Audit Log (Sesuai Gambar 2) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Aktivitas Hari Ini */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-emerald-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aktivitas Hari Ini</p>
                <p className="text-lg sm:text-2xl font-black text-slate-900">{auditStats.total_today}</p>
              </div>
            </div>

            {/* Card 2: Berhasil (Hari Ini) */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-teal-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Berhasil (Hari Ini)</p>
                <p className="text-lg sm:text-2xl font-black text-teal-600">{auditStats.success_today}</p>
              </div>
            </div>

            {/* Card 3: Gagal / Ditolak */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-rose-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gagal / Ditolak</p>
                <p className="text-lg sm:text-2xl font-black text-rose-600">{auditStats.failed_today}</p>
              </div>
            </div>

            {/* Card 4: Total Riwayat Log */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-indigo-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Riwayat Log</p>
                <p className="text-lg sm:text-2xl font-black text-indigo-700">{auditStats.total_all}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= JADWAL RESMI & DAFTAR SESI PELATIHAN (OVERVIEW) ================= */}
        <div className="space-y-6">
          {/* Header Banner Jadwal Resmi */}
          <div className="bg-white rounded-2xl border border-emerald-500/20 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="text-[11px] sm:text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5">
                <span>JADWAL RESMI PELATIHAN</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {training?.title || 'Pelatihan Digital & Modern Web Development 2026'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium pt-0.5">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{eventDateRange || training?.dateRange || '2026-09-20 - 2026-09-22'}</span>
                </div>
                <span className="text-slate-300 font-bold">•</span>
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{training?.location || 'Auditorium Utama & Online Class'}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => setShowEditEventForm(!showEditEventForm)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-2xs transition-all cursor-pointer ${
                  showEditEventForm 
                    ? 'bg-emerald-600 text-white border border-emerald-600' 
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
                }`}
                title="Buka form edit event utama & foto slider"
              >
                <Edit className={`w-4 h-4 ${showEditEventForm ? 'text-white' : 'text-emerald-600'}`} />
                <span>Edit Event</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('events_management');
                  handleOpenAddSession();
                }}
                className="px-4 py-2.5 btn-emerald text-xs font-bold rounded-xl flex items-center space-x-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Tambah Sesi Baru</span>
              </button>
            </div>
          </div>

          {/* FORM EDIT INFORMASI EVENT UTAMA & FOTO SLIDER DI OVERVIEW */}
          {showEditEventForm && (
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-200 shadow-md space-y-4 animate-fade-in font-sans text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    PENGATURAN EVENT UTAMA
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditEventForm(false)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Tutup Form"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* UPLOAD GAMBAR SLIDER EVENT (MULTI-IMAGE SLIDER UPLOADER) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Dokumentasi & Banner Slider Event</h4>
                    <p className="text-[11px] text-slate-500">Unggah lebih dari 1 gambar untuk ditampilkan sebagai slider banner event.</p>
                  </div>
                  <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Gambar</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          const newUrls = files.map(file => URL.createObjectURL(file));
                          const updated = [...eventBannerSlides, ...newUrls];
                          setEventBannerSlides(updated);
                          if (setTraining) setTraining(prev => ({ ...prev, bannerSlides: updated }));
                          showNotification(`${files.length} Gambar slider berhasil ditambahkan!`);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Slider Image Thumbnails Preview Grid */}
                <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1">
                  {eventBannerSlides.map((imgUrl, idx) => (
                    <div key={idx} className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 group bg-white shadow-2xs">
                      <img src={imgUrl} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = eventBannerSlides.filter((_, i) => i !== idx);
                          setEventBannerSlides(updated);
                          if (setTraining) setTraining(prev => ({ ...prev, bannerSlides: updated }));
                          showNotification('Gambar slider berhasil dihapus.');
                        }}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                        title="Hapus Gambar Ini"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleUpdateEventInfo} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Event <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Lokasi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rentang Tanggal Pelaksanaan (Tanggal Mulai s/d Selesai) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2 max-w-md">
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

                <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditEventForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Batal / Tutup
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 btn-emerald font-semibold rounded-xl shadow-md flex items-center space-x-1.5 text-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Event</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grid Daftar Sesi Pelatihan Terdaftar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Daftar Sesi Pelatihan Terdaftar ({training?.sessions?.length || 0})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {training?.sessions?.map((ses, idx) => {
                const currentStatus = getNormalizedSessionStatus(ses.status);
                const isUpcoming = currentStatus === 'Akan Datang';
                const isOngoing = currentStatus === 'Berlangsung';
                const isCompleted = currentStatus === 'Selesai';

                return (
                  <div 
                    key={ses.id} 
                    className={`light-card rounded-3xl p-5 space-y-3 relative group flex flex-col justify-between transition-all bg-white border border-slate-200/80 ${
                      openSessionMenuId === ses.id ? 'z-30 ring-2 ring-emerald-500/30' : 'z-10'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{ses.title}</h4>

                      <div className="text-xs text-slate-600 space-y-2 pt-3 mt-3 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{ses.time}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{formatDDMMYYYY(ses.date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{ses.room}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Pemateri: {ses.speaker}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Card: Dropdown Status & Aksi Edit/Hapus */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {/* Dropdown Status Sesi */}
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenSessionMenuId(openSessionMenuId === ses.id ? null : ses.id);
                          }}
                          className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:shadow-xs active:scale-98 ${
                            isOngoing
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : isCompleted
                              ? 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                          }`}
                          title="Klik untuk mengubah status sesi"
                        >
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            isOngoing
                              ? 'bg-emerald-500 animate-pulse'
                              : isCompleted
                              ? 'bg-slate-500'
                              : 'bg-amber-500'
                          }`} />
                          <span>{currentStatus}</span>
                          <ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform duration-200 ${openSessionMenuId === ses.id ? 'rotate-180' : ''}`} />
                        </button>

                        {openSessionMenuId === ses.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setOpenSessionMenuId(null)}
                            />
                            <div 
                              className="absolute left-0 bottom-full mb-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ubah Status Sesi</p>
                                <p className="text-xs font-bold text-slate-800 truncate">{ses.title}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleUpdateSessionStatus(ses, 'Mendatang')}
                                className={`w-full px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                                  isUpcoming 
                                    ? 'bg-amber-50 text-amber-900 font-bold' 
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                                  <span className="text-xs">Akan Datang</span>
                                </div>
                                {isUpcoming && <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateSessionStatus(ses, 'Berlangsung')}
                                className={`w-full px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                                  isOngoing 
                                    ? 'bg-emerald-50 text-emerald-900 font-bold' 
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                  <span className="text-xs">Berlangsung</span>
                                </div>
                                {isOngoing && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateSessionStatus(ses, 'Selesai')}
                                className={`w-full px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                                  isCompleted 
                                    ? 'bg-slate-100 text-slate-900 font-bold' 
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                                  <span className="text-xs">Selesai</span>
                                </div>
                                {isCompleted && <CheckCircle className="w-4 h-4 text-slate-600 shrink-0" />}
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Tombol Edit & Hapus */}
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('events_management');
                            handleOpenEditSession(ses);
                          }}
                          className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold flex items-center space-x-1 sm:space-x-1.5 transition-colors cursor-pointer"
                          title="Edit Sesi"
                        >
                          <Edit className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSession(ses.id, ses.title)}
                          className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-semibold flex items-center space-x-1 sm:space-x-1.5 transition-colors cursor-pointer"
                          title="Hapus Sesi"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    );
  }

  // TAB 2: KELOLA EVENT & SESI TRAINING
  if (activeTab === 'events_management') {

    // JIKA DALAM MODE TAMBAH ATAU EDIT SESI MATERI (HALAMAN KHUSUS TERPISAH)
    if (showAddSessionForm || editingSessionId) {
      return (
        <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto font-sans w-full">
          {/* Top Navigation Back */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setShowAddSessionForm(false);
                setEditingSessionId(null);
              }}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600" />
              <span>Kembali ke Daftar Sesi</span>
            </button>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
              {editingSessionId ? `SESI ${editingSessionId}` : 'TAMBAH SESI BARU'}
            </span>
          </div>

          {/* HALAMAN FORM KHUSUS TAMBAH / EDIT SESI */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in font-sans text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {editingSessionId ? 'Edit Sesi Materi' : 'Tambah Sesi Materi'}
                  </h3>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSessionInline} className="space-y-5 text-xs">
              
              {/* Row 1: Judul Sesi Materi Training */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Judul Sesi Materi Training <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sesi 5 - Digital Marketing Strategy & Social Media Branding"
                  value={sessionFormTitle}
                  onChange={(e) => setSessionFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  required
                />
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>
              </div>

              {/* Row 3: Jam Pelaksanaan, Tanggal Sesi Pelaksanaan, & Status Sesi */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jam Pelaksanaan <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={sessionFormStartTime}
                      onChange={(e) => setSessionFormStartTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer text-center"
                      required
                    />
                    <span className="text-slate-400 font-bold shrink-0">s/d</span>
                    <input
                      type="time"
                      value={sessionFormEndTime}
                      onChange={(e) => setSessionFormEndTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer text-center"
                      required
                    />
                  </div>
                </div>

                <div>
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

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Sesi Pelatihan
                  </label>
                  <select
                    value={sessionFormStatus}
                    onChange={(e) => setSessionFormStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer"
                  >
                    <option value="Mendatang">Akan Datang (Mendatang)</option>
                    <option value="Berlangsung">Sedang Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-slate-100 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSessionForm(false);
                    setEditingSessionId(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal / Kembali
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 btn-emerald font-semibold rounded-xl shadow-md flex items-center space-x-2 text-xs transition-all active:scale-98 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingSessionId ? 'Simpan Perubahan Sesi' : 'Tambah Sesi Baru'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans w-full">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-emerald-500/20 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="text-[11px] sm:text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5">
              <span>JADWAL RESMI PELATIHAN</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {training?.title || 'Pelatihan Digital & Modern Web Development 2026'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium pt-0.5">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{eventDateRange || training?.dateRange || '2026-09-20 - 2026-09-22'}</span>
              </div>
              <span className="text-slate-300 font-bold">•</span>
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{training?.location || 'Auditorium Utama & Online Class'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center pt-2 md:pt-0">
            <button
              type="button"
              onClick={() => setShowEditEventForm(!showEditEventForm)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-2xs transition-all cursor-pointer ${
                showEditEventForm 
                  ? 'bg-emerald-600 text-white border border-emerald-600' 
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
              }`}
              title="Buka form edit event utama & foto slider"
            >
              <Edit className={`w-4 h-4 ${showEditEventForm ? 'text-white' : 'text-emerald-600'}`} />
              <span>Edit Event</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddSession}
              className="px-4 py-2.5 btn-emerald text-xs font-bold rounded-xl flex items-center space-x-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Tambah Sesi Baru</span>
            </button>
          </div>
        </div>

        {/* 1. EMBEDDED INLINE FORM EDIT INFORMASI EVENT UTAMA */}
        {showEditEventForm && (
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-emerald-200 shadow-md space-y-4 animate-fade-in font-sans text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  PENGATURAN EVENT UTAMA
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowEditEventForm(false)}
                className="p-1 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                title="Tutup Form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* UPLOAD GAMBAR SLIDER EVENT (MULTI-IMAGE SLIDER UPLOADER) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Dokumentasi & Banner Slider Event</h4>
                  <p className="text-[11px] text-slate-500">Unggah lebih dari 1 gambar untuk ditampilkan sebagai slider banner event.</p>
                </div>
                <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Gambar</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        const newUrls = files.map(file => URL.createObjectURL(file));
                        const updated = [...eventBannerSlides, ...newUrls];
                        setEventBannerSlides(updated);
                        if (setTraining) setTraining(prev => ({ ...prev, bannerSlides: updated }));
                        showNotification(`${files.length} Gambar slider berhasil ditambahkan!`);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Slider Image Thumbnails Preview Grid */}
              <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1">
                {eventBannerSlides.map((imgUrl, idx) => (
                  <div key={idx} className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 group bg-white shadow-2xs">
                    <img src={imgUrl} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = eventBannerSlides.filter((_, i) => i !== idx);
                        setEventBannerSlides(updated);
                        if (setTraining) setTraining(prev => ({ ...prev, bannerSlides: updated }));
                        showNotification('Gambar slider berhasil dihapus.');
                      }}
                      className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 transition-opacity"
                      title="Hapus Gambar Ini"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleUpdateEventInfo} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Event <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lokasi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rentang Tanggal Pelaksanaan (Tanggal Mulai s/d Selesai) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center space-x-2 max-w-md">
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

              <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditEventForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal / Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-emerald font-semibold rounded-xl shadow-md flex items-center space-x-1.5 text-xs transition-all active:scale-98 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Event</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. DAFTAR SESI TRAINING DENGAN TOMBOL EDIT/HAPUS INLINE */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Daftar Sesi Pelatihan Terdaftar ({training?.sessions?.length || 0})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {training?.sessions?.map((ses, idx) => {
              const currentStatus = getNormalizedSessionStatus(ses.status);
              const isUpcoming = currentStatus === 'Akan Datang';
              const isOngoing = currentStatus === 'Berlangsung';
              const isCompleted = currentStatus === 'Selesai';

              return (
                <div 
                  key={ses.id} 
                  className={`light-card rounded-3xl p-5 space-y-3 relative group flex flex-col justify-between transition-all ${
                    openSessionMenuId === ses.id ? 'z-30 ring-2 ring-emerald-500/30' : 'z-10'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 leading-snug">{ses.title}</h4>

                    <div className="text-xs text-slate-600 space-y-2 pt-3 mt-3 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{ses.time}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{formatDDMMYYYY(ses.date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{ses.room}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Pemateri: {ses.speaker}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Card: Dropdown Status sejajar dengan Edit dan Hapus */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {/* Dropdown Status Sesi */}
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenSessionMenuId(openSessionMenuId === ses.id ? null : ses.id);
                        }}
                        className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:shadow-xs active:scale-98 ${
                          isOngoing
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                            : isCompleted
                            ? 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                        }`}
                        title="Klik untuk mengubah status sesi"
                      >
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          isOngoing
                            ? 'bg-emerald-500 animate-pulse'
                            : isCompleted
                            ? 'bg-slate-500'
                            : 'bg-amber-500'
                        }`} />
                        <span>{currentStatus}</span>
                        <ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform duration-200 ${openSessionMenuId === ses.id ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu Pilihan Status Sesi (Membuka ke atas/Dropup) */}
                      {openSessionMenuId === ses.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setOpenSessionMenuId(null)}
                          />
                          <div 
                            className="absolute left-0 bottom-full mb-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ubah Status Sesi</p>
                              <p className="text-xs font-bold text-slate-800 truncate">{ses.title}</p>
                            </div>

                            {/* 1. Status: Akan Datang */}
                            <button
                              type="button"
                              onClick={() => handleUpdateSessionStatus(ses, 'Mendatang')}
                              className={`w-full px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                                isUpcoming 
                                  ? 'bg-amber-50 text-amber-900 font-bold' 
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                                <span className="text-xs">Akan Datang</span>
                              </div>
                              {isUpcoming && <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                            </button>

                            {/* 2. Status: Berlangsung */}
                            <button
                              type="button"
                              onClick={() => handleUpdateSessionStatus(ses, 'Berlangsung')}
                              className={`w-full px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                                isOngoing 
                                  ? 'bg-emerald-50 text-emerald-900 font-bold' 
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span className="text-xs">Berlangsung</span>
                              </div>
                              {isOngoing && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </button>

                            {/* 3. Status: Selesai */}
                            <button
                              type="button"
                              onClick={() => handleUpdateSessionStatus(ses, 'Selesai')}
                              className={`w-full px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                                isCompleted 
                                  ? 'bg-slate-100 text-slate-900 font-bold' 
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                                <span className="text-xs">Selesai</span>
                              </div>
                              {isCompleted && <CheckCircle className="w-4 h-4 text-slate-600 shrink-0" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Tombol Edit & Hapus */}
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSession(ses)}
                        className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold flex items-center space-x-1 sm:space-x-1.5 transition-colors cursor-pointer"
                        title="Edit Sesi Inline"
                      >
                        <Edit className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSession(ses.id, ses.title)}
                        className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-semibold flex items-center space-x-1 sm:space-x-1.5 transition-colors cursor-pointer"
                        title="Hapus Sesi"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  // TAB 3: KELOLA ADMIN PANITIA
  if (activeTab === 'admin_management') {
    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans w-full">
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

        {/* EMBEDDED INLINE FORM TAMBAH / EDIT ADMIN PANITIA */}
        {(showAddAdminForm || editingAdminId) && (
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-emerald-200 shadow-md space-y-4 animate-fade-in font-sans text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingAdminId ? 'Edit Akun Admin' : 'Buat Akun Admin Baru'}
                  </h3>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setShowAddAdminForm(false);
                  setEditingAdminId(null);
                }}
                className="p-1 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                title="Tutup Form"
              >
                <X className="w-4 h-4" />
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
                    className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
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
                    className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
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
                    className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Akun Admin</label>
                  <select
                    value={adminFormStatus}
                    onChange={(e) => setAdminFormStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer"
                  >
                    <option value="Aktif">Aktif (Dapat Login & Scan)</option>
                    <option value="Nonaktif">Nonaktif (Akses Ditolak)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Divisi Panitia & Password Akun (jika tambah baru) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Divisi / Bagian Panitia</label>
                  <input
                    type="text"
                    placeholder="Contoh: Divisi Registrasi & Presensi"
                    value={adminFormDept}
                    onChange={(e) => setAdminFormDept(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                {!editingAdminId && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kata Sandi Login <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="AdminPanitia123!"
                      value={adminFormPassword}
                      onChange={(e) => setAdminFormPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Gunakan kata sandi ini untuk login akun admin ke sistem backend.</p>
                  </div>
                )}
              </div>

              {editingAdminId && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-800 text-xs">Keamanan & Password Akun</div>
                    <div className="text-[11px] text-slate-500">Kirim tautan reset kata sandi ke email {adminFormEmail || 'admin'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetPassword(adminFormName)}
                    className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Password Admin</span>
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAdminForm(false);
                    setEditingAdminId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal / Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-emerald font-semibold rounded-xl shadow-md flex items-center space-x-1.5 text-xs transition-all active:scale-98 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingAdminId ? 'Simpan Perubahan Admin' : 'Simpan Akun Admin'}</span>
                </button>
              </div>
            </form>
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

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="overflow-x-auto min-h-[220px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 text-center w-12">#</th>
                    <th className="py-3.5 px-4">Nama Administrator</th>
                    <th className="py-3.5 px-4">Mengelola Kelas</th>
                    <th className="py-3.5 px-4 text-center">Status Akun</th>
                    <th className="py-3.5 px-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                        Tidak ada akun admin panitia yang sesuai pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAdmins.map((adm, idx) => {
                      const isActive = adm.status === 'Aktif';
                      const adminManagedClasses = adm.managedClasses || [];
                      const managedNames = adm.managed_classes_names || adminManagedClasses.map(c => c.name);

                      return (
                        <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shadow-xs shrink-0 overflow-hidden border relative ${
                                isActive ? 'bg-emerald-600 text-white border-emerald-300' : 'bg-slate-200 text-slate-500 border-slate-300'
                              }`}>
                                <span>{adm.name?.charAt(0) || 'A'}</span>
                                {adm.avatar && (
                                  <img 
                                    src={adm.avatar} 
                                    alt={adm.name} 
                                    referrerPolicy="no-referrer" 
                                    className="w-full h-full object-cover absolute inset-0 z-10" 
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{adm.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {managedNames && managedNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {managedNames.map((cName, cIdx) => (
                                  <span 
                                    key={cIdx}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                                  >
                                    <GraduationCap className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{cName}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic flex items-center space-x-1">
                                <span>Belum ditugaskan kelas</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-block ${
                              isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}>
                              {adm.status}
                            </span>
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
                                  <div className="absolute right-full top-0 mr-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-150">
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

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenAdminMenuId(null);
                                        setEditAccessAdmin(adm);
                                      }}
                                      className="w-full px-4 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 font-semibold transition-colors cursor-pointer"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Edit Akses</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenAdminMenuId(null);
                                        setAssignAdminClassModal(adm);
                                        const currIds = (adm.managedClasses || []).map(c => c.id);
                                        setSelectedAdminClassIds(currIds);
                                      }}
                                      className="w-full px-4 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2.5 font-semibold transition-colors cursor-pointer"
                                    >
                                      <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                                      <span>Atur Kelas</span>
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


        {/* MODAL EDIT AKSES ADMINISTRATOR */}
        {editAccessAdmin && (
          <div 
            onClick={() => setEditAccessAdmin(null)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-sans"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 border border-slate-200 relative my-auto text-slate-900 max-h-[90dvh] overflow-y-auto"
            >
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      AKSES ADMINISTRATOR
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditAccessAdmin(null)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Tutup Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Admin Info Header */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 text-xs">{editAccessAdmin.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{editAccessAdmin.email}</div>
                </div>

                {/* Akses Switch Controls */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pengaturan Izin Fitur</h4>

                  {/* 1. Akses Presensi */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Akses Presensi & Scanner</div>
                      <div className="text-[11px] text-slate-500">Izin memindai QR code presensi peserta</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleAdminPermission(editAccessAdmin.id, 'canManageAttendance');
                        setEditAccessAdmin(prev => ({ ...prev, canManageAttendance: !(prev.canManageAttendance !== false) }));
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                        editAccessAdmin.canManageAttendance !== false
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {editAccessAdmin.canManageAttendance !== false ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                      <span>{editAccessAdmin.canManageAttendance !== false ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  {/* 2. Akses Penilaian */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Akses Penilaian Peserta</div>
                      <div className="text-[11px] text-slate-500">Izin input & rekap nilai evaluasi peserta</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleAdminPermission(editAccessAdmin.id, 'canManageGrading');
                        setEditAccessAdmin(prev => ({ ...prev, canManageGrading: !(prev.canManageGrading !== false) }));
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                        editAccessAdmin.canManageGrading !== false
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {editAccessAdmin.canManageGrading !== false ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                      <span>{editAccessAdmin.canManageGrading !== false ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  {/* 3. Akses Quiz */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Akses Quiz & Test</div>
                      <div className="text-[11px] text-slate-500">Izin membuat & mengelola bank soal kuis</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleAdminPermission(editAccessAdmin.id, 'canManageQuiz');
                        setEditAccessAdmin(prev => ({ ...prev, canManageQuiz: !(prev.canManageQuiz === true) }));
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                        editAccessAdmin.canManageQuiz === true
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {editAccessAdmin.canManageQuiz === true ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                      <span>{editAccessAdmin.canManageQuiz === true ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  {/* 4. Status Akun */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Status Aktif Akun</div>
                      <div className="text-[11px] text-slate-500">Aktifkan atau nonaktifkan akun administrator</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleAdminStatus(editAccessAdmin.id);
                        setEditAccessAdmin(prev => ({ ...prev, status: prev.status === 'Aktif' ? 'Nonaktif' : 'Aktif' }));
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                        editAccessAdmin.status === 'Aktif'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                      }`}
                    >
                      <span>{editAccessAdmin.status === 'Aktif' ? 'Aktif' : 'Nonaktif'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditAccessAdmin(null)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Selesai
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL ATUR KELAS ADMINISTRATOR */}
        {assignAdminClassModal && (
          <div 
            onClick={() => setAssignAdminClassModal(null)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-sans"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 border border-slate-200 relative my-auto text-slate-900 max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <GraduationCap className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">PENUGASAN KELAS ADMINISTRATOR</h3>
                    <p className="text-[11px] text-slate-500">Tentukan kelas mana saja yang dikelola oleh admin ini</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAssignAdminClassModal(null)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Admin Info Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-xs">{assignAdminClassModal.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{assignAdminClassModal.email}</div>
              </div>

              {/* Class Selection Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Pilih Kelas Binaan ({selectedAdminClassIds.length} Terpilih)
                  </label>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAdminClassIds((availableClasses || []).map(c => c.id))}
                      className="text-[11px] text-emerald-600 hover:underline font-semibold"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAdminClassIds([])}
                      className="text-[11px] text-slate-500 hover:underline font-semibold"
                    >
                      Lepas Semua
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {(availableClasses || []).length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">Belum ada kelas yang terdaftar.</div>
                  ) : (
                    (availableClasses || []).map((cls) => {
                      const isChecked = selectedAdminClassIds.includes(cls.id);
                      return (
                        <div
                          key={cls.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedAdminClassIds(selectedAdminClassIds.filter(id => id !== cls.id));
                            } else {
                              setSelectedAdminClassIds([...selectedAdminClassIds, cls.id]);
                            }
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isChecked 
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{cls.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{cls.code} • {cls.participants_count || 0} Peserta</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAssignAdminClassModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAdminClass}
                  onClick={async () => {
                    setIsSubmittingAdminClass(true);
                    const targetAdmin = assignAdminClassModal;
                    const parsedId = parseInt(String(targetAdmin.id).replace(/\D/g, ''), 10);
                    const dbId = targetAdmin?.db_id || (isNaN(parsedId) ? null : parsedId);

                    try {
                      if (dbId) {
                        await api.assignAdminToClasses(dbId, {
                          class_ids: selectedAdminClassIds
                        });
                      }

                      // Update local state adminList
                      const selectedClassObjects = (availableClasses || []).filter(c => selectedAdminClassIds.includes(c.id));
                      const updated = adminList.map(a => {
                        if (a.id === targetAdmin.id) {
                          return {
                            ...a,
                            managedClasses: selectedClassObjects,
                            managed_classes_names: selectedClassObjects.map(c => c.name)
                          };
                        }
                        return a;
                      });
                      setAdminList(updated);
                      showNotification(`Penugasan kelas untuk (${targetAdmin.name}) berhasil diperbarui!`);
                      setAssignAdminClassModal(null);
                      if (refreshClasses) refreshClasses();
                    } catch (err) {
                      showNotification('Gagal memperbarui penugasan kelas administrator.');
                    } finally {
                      setIsSubmittingAdminClass(false);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmittingAdminClass ? 'Menyimpan...' : 'Simpan Penugasan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TAB 4: MASTER DATA PESERTA & INLINE FORM PESERTA
  if (activeTab === 'participants_master') {
    const isParticipantsFilteringActive = Boolean(
      (searchParticipant && searchParticipant.trim() !== '') ||
      filterKomisariat !== 'ALL' ||
      filterGender !== 'ALL' ||
      filterClass !== 'ALL'
    );
    const countGenderL = (participants || []).filter(p => (p.gender || '').toUpperCase() === 'L').length;
    const countGenderP = (participants || []).filter(p => (p.gender || '').toUpperCase() === 'P').length;
    const uniqueKomisariats = Array.from(new Set((participants || []).map(p => (p.instansi || '').trim()).filter(Boolean))).sort();

    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Master Data & Presensi Peserta {isParticipantsFilteringActive ? `(${filteredParticipants.length} dari ${participants?.length || 0})` : `(${participants?.length || 0})`}
            </h2>
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
              onClick={handleExportExcelPeserta}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-[11px] sm:text-xs font-semibold rounded-2xl flex items-center space-x-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Ekspor Data Peserta Terformat Excel (Sheet per Kelas & Semua Peserta)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>Ekspor Excel Peserta</span>
            </button>
          </div>
        </div>

        {/* INLINE CARD FORM TAMBAH DATA PESERTA BARU */}
        {showAddParticipantForm && !editingParticipantId && (
          <div className="light-card rounded-3xl p-6 md:p-8 space-y-4 border-2 border-emerald-500 bg-white shadow-lg animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Form Registrasi Peserta Baru</h3>
                  <p className="text-[11px] text-slate-500">Isi data nama, email, asal komisariat, dan nomor kontak WhatsApp peserta</p>
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
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={partFormGender}
                    onChange={(e) => setPartFormGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kata Sandi Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Peserta123!"
                    value={partFormPassword}
                    onChange={(e) => setPartFormPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Gunakan kata sandi ini untuk peserta login ke akun portal PresenTrain.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Penempatan Kelas Peserta
                  </label>
                  <select
                    value={partFormClassId}
                    onChange={(e) => setPartFormClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer"
                  >
                    <option value="">Kelas Umum (Default / Belum Ada Kelas)</option>
                    {(availableClasses || []).map((cls) => {
                      const displayName = (cls.name || '').replace(/\s*\(\s*KLS[^\)]*\)/gi, '').trim() || cls.name;
                      return (
                        <option key={cls.id} value={cls.id}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Peserta akan langsung dimasukkan ke kelas binaan yang dipilih.
                  </p>
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
                  <span>Simpan Data Peserta</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL OVERLAY FORM EDIT DATA PESERTA */}
        {editingParticipantId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-5 relative border border-slate-100 max-h-[calc(100vh-2rem)] overflow-y-auto my-auto">
              <button
                type="button"
                onClick={() => setEditingParticipantId(null)}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Form Edit Data Peserta ({editingParticipantId})</h3>
                  <p className="text-[11px] text-slate-500">Isi data nama, email, asal komisariat, dan nomor kontak WhatsApp peserta</p>
                </div>
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-emerald-600"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-emerald-600"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={partFormGender}
                      onChange={(e) => setPartFormGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer"
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Contoh: 0812-9988-7766"
                      value={partFormPhone}
                      onChange={(e) => setPartFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kata Sandi Login (Kosongkan jika tidak diubah)
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan kata sandi baru (opsional)"
                      value={partFormPassword}
                      onChange={(e) => setPartFormPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Gunakan kata sandi ini untuk peserta login ke akun portal PresenTrain.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Penempatan Kelas Peserta
                    </label>
                    <select
                      value={partFormClassId}
                      onChange={(e) => setPartFormClassId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 outline-none focus:border-emerald-600 font-semibold cursor-pointer"
                    >
                      <option value="">Kelas Umum (Default / Belum Ada Kelas)</option>
                      {(availableClasses || []).map((cls) => {
                        const displayName = (cls.name || '').replace(/\s*\(\s*KLS[^\)]*\)/gi, '').trim() || cls.name;
                        return (
                          <option key={cls.id} value={cls.id}>
                            {displayName}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Peserta akan langsung dimasukkan ke kelas binaan yang dipilih.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingParticipantId(null)}
                    className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-[11px] sm:text-xs"
                  >
                    Batal / Sembunyikan Form
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 sm:px-5 sm:py-2.5 btn-emerald font-semibold rounded-xl shadow-md active:scale-98 transition-all flex items-center space-x-1.5 text-[11px] sm:text-xs"
                  >
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Simpan Perubahan Peserta</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search Input & Filter Kelas / Komisariat / Gender */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Cari nama peserta, email, asal komisariat, atau token QR..."
              value={searchParticipant}
              onChange={(e) => setSearchParticipant(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-md border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Filter Komisariat */}
            <div className="relative">
              <select
                value={filterKomisariat}
                onChange={(e) => setFilterKomisariat(e.target.value)}
                className="pl-3 pr-8 py-2.5 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 transition-colors cursor-pointer appearance-none shadow-2xs"
              >
                <option value="ALL">Semua Komisariat ({participants?.length || 0})</option>
                {uniqueKomisariats.map((kom) => {
                  const countKom = (participants || []).filter(p => (p.instansi || '').trim().toLowerCase() === kom.toLowerCase()).length;
                  return (
                    <option key={kom} value={kom}>
                      {kom} ({countKom})
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Filter Gender */}
            <div className="relative">
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="pl-3 pr-8 py-2.5 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 transition-colors cursor-pointer appearance-none shadow-2xs"
              >
                <option value="ALL">Semua Gender ({participants?.length || 0})</option>
                <option value="L">Laki-laki ({countGenderL})</option>
                <option value="P">Perempuan ({countGenderP})</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Filter Kelas */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="pl-8 pr-8 py-2.5 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 transition-colors cursor-pointer appearance-none shadow-2xs"
              >
                <option value="ALL">Semua Kelas ({participants?.length || 0})</option>
                <option value="UMUM">Kelas Umum (Default) ({participants?.filter(p => !p.class_id).length || 0})</option>
                {(availableClasses || []).map((cls) => {
                  const countInClass = participants?.filter(p => String(p.class_id) === String(cls.id)).length || 0;
                  const displayName = (cls.name || '').replace(/\s*\(\s*KLS[^\)]*\)/gi, '').trim() || cls.name;
                  return (
                    <option key={cls.id} value={cls.id}>
                      {displayName} ({countInClass})
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Indikator Nilai Filter Aktif (Filter Pills & Reset Action) */}
        {isParticipantsFilteringActive && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl animate-in fade-in duration-200">
            <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5 pl-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filter Aktif ({filteredParticipants.length} ditemukan):</span>
            </span>

            {searchParticipant.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                <span>Pencarian: <strong>"{searchParticipant}"</strong></span>
                <button
                  type="button"
                  onClick={() => setSearchParticipant('')}
                  className="hover:bg-emerald-100 rounded-md p-0.5 text-emerald-700 transition-colors cursor-pointer"
                  title="Hapus filter pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {filterKomisariat !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white text-blue-800 border border-blue-200 shadow-2xs">
                <span>Komisariat: <strong>{filterKomisariat}</strong></span>
                <button
                  type="button"
                  onClick={() => setFilterKomisariat('ALL')}
                  className="hover:bg-blue-100 rounded-md p-0.5 text-blue-700 transition-colors cursor-pointer"
                  title="Hapus filter komisariat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {filterGender !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white text-indigo-800 border border-indigo-200 shadow-2xs">
                <span>Gender: <strong>{filterGender === 'L' ? 'Laki-laki' : filterGender === 'P' ? 'Perempuan' : filterGender}</strong></span>
                <button
                  type="button"
                  onClick={() => setFilterGender('ALL')}
                  className="hover:bg-indigo-100 rounded-md p-0.5 text-indigo-700 transition-colors cursor-pointer"
                  title="Hapus filter gender"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {filterClass !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white text-purple-800 border border-purple-200 shadow-2xs">
                <span>Kelas: <strong>
                  {filterClass === 'UMUM'
                    ? 'Kelas Umum (Default)'
                    : ((availableClasses || []).find((c) => String(c.id) === String(filterClass))?.name || filterClass)}
                </strong></span>
                <button
                  type="button"
                  onClick={() => setFilterClass('ALL')}
                  className="hover:bg-purple-100 rounded-md p-0.5 text-purple-700 transition-colors cursor-pointer"
                  title="Hapus filter kelas"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchParticipant('');
                setFilterKomisariat('ALL');
                setFilterGender('ALL');
                setFilterClass('ALL');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2.5 py-1 rounded-xl hover:bg-rose-50 cursor-pointer transition-all ml-auto"
            >
              Reset Semua Filter
            </button>
          </div>
        )}

        {/* Backdrop overlay for 3-dots dropdown dismissal */}
        {activeActionMenuId && (
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setActiveActionMenuId(null)} 
          />
        )}

        {/* Bulk Action Toolbar saat ada peserta yang ditandai */}
        {selectedParticipantIds.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                {selectedParticipantIds.length}
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  {selectedParticipantIds.length} Peserta Ditandai
                </p>
                <p className="text-[11px] text-emerald-700">
                  Siap dimasukkan atau dipindahkan ke kelas binaan secara massal
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedParticipantIds([])}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer active:scale-95 transition-all shadow-2xs"
              >
                Batal Tandai
              </button>

              <button
                type="button"
                onClick={() => {
                  setBulkTargetClassId('');
                  setIsBulkAssignModalOpen(true);
                }}
                className="px-3.5 py-1.5 btn-emerald text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
              >
                <GraduationCap className="w-4 h-4 text-white" />
                <span>Masukkan ke Kelas</span>
              </button>
            </div>
          </div>
        )}

        {/* Participants Table List Format */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-x-auto min-h-[320px]">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-3 md:px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Tandai semua peserta"
                    checked={
                      filteredParticipants.length > 0 &&
                      filteredParticipants.every((p) => selectedParticipantIds.includes(p.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = Array.from(new Set([...selectedParticipantIds, ...filteredParticipants.map((p) => p.id)]));
                        setSelectedParticipantIds(allIds);
                      } else {
                        const visibleIds = new Set(filteredParticipants.map((p) => p.id));
                        setSelectedParticipantIds(selectedParticipantIds.filter((id) => !visibleIds.has(id)));
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
                  />
                </th>
                <th className="py-3.5 px-3 md:px-5">Nama Peserta</th>
                <th className="py-3.5 px-2 md:px-4 text-center">Gender</th>
                <th className="py-3.5 px-4 md:px-6">Asal Komisariat</th>
                <th className="py-3.5 px-4 md:px-6">Kelas Binaan</th>
                <th className="py-3.5 px-4 md:px-6 text-center">Status Penilaian</th>
                <th className="py-3.5 px-4 md:px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                      <Users className="w-8 h-8 text-slate-300 stroke-1" />
                      <p className="font-semibold text-sm text-slate-700">Tidak ada data peserta yang cocok</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Kriteria filter atau pencarian saat ini tidak menghasilkan data peserta. Coba sesuaikan kata kunci atau reset filter.
                      </p>
                      {isParticipantsFilteringActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchParticipant('');
                            setFilterKomisariat('ALL');
                            setFilterGender('ALL');
                            setFilterClass('ALL');
                          }}
                          className="mt-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                        >
                          Reset Semua Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isChecked = selectedParticipantIds.includes(p.id);
                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors group ${isChecked ? 'bg-emerald-50/50' : 'hover:bg-emerald-50/30'}`}
                    >
                      {/* Checkbox Tandai */}
                      <td className="py-3.5 px-3 md:px-4 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Tandai peserta ${p.name}`}
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedParticipantIds((prev) => [...prev, p.id]);
                            } else {
                              setSelectedParticipantIds((prev) => prev.filter((id) => id !== p.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
                        />
                      </td>

                      {/* Column 1: Nama Peserta */}
                      <td className="py-3.5 px-3 md:px-5">
                        <div className="flex items-center space-x-3">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                            className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all shadow-xs overflow-hidden relative"
                            title="Klik untuk melihat foto peserta"
                          >
                            <span>{p.name?.charAt(0) || 'P'}</span>
                            {p.avatar ? (
                              <img 
                                src={p.avatar} 
                                alt={p.name} 
                                loading="lazy" 
                                referrerPolicy="no-referrer" 
                                className="w-full h-full object-cover absolute inset-0 z-10" 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : null}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 text-xs md:text-sm block">{p.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Gender */}
                      <td className="py-3.5 px-2 md:px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold border ${
                          (p.gender || '').toUpperCase() === 'P'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {(p.gender || 'L').toUpperCase() === 'P' ? 'P' : 'L'}
                        </span>
                      </td>

                      {/* Column 3: Asal Komisariat */}
                      <td className="py-3.5 px-4 md:px-6">
                        <div className="text-slate-800 font-medium text-xs md:text-sm">
                          {p.instansi || '-'}
                        </div>
                      </td>

                      {/* Column 3: Kelas Binaan */}
                      <td className="py-3.5 px-4 md:px-6">
                        {p.class_id ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                            <GraduationCap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{p.className || 'Kelas Khusus'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Kelas Umum (Default)</span>
                          </span>
                        )}
                      </td>

                      {/* Column 4: Status Penilaian (Predikat & Nilai Akhir) */}
                      <td className="py-3.5 px-4 md:px-6 text-center">
                        {(() => {
                          const userAss = assessments?.[p.id] || assessments?.[p.db_id] || (p.db_id && assessments?.[String(p.db_id)]) || null;
                          const calc = calculateAssessment(userAss || {
                            participantId: p.id,
                            afektif: 100,
                            kognitif: 75,
                            psikomotorik: 50,
                            violations: [],
                            contributions: [],
                            qualitativeNote: ''
                          });

                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('rekap_penilaian');
                              }}
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer hover:shadow-xs active:scale-95 ${
                                calc.status === 'Lulus'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : calc.status === 'Perbaikan'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              }`}
                              title={`Nilai Akhir: ${calc.nilaiAkhir || calc.finalScore} | Afektif: ${calc.afektif}%, Kognitif: ${calc.kognitif}%, Psikomotorik: ${calc.psikomotorik}% - Klik untuk lihat Rekap Penilaian`}
                            >
                              <Award className={`w-3.5 h-3.5 ${
                                calc.status === 'Lulus' ? 'text-emerald-600' : calc.status === 'Perbaikan' ? 'text-amber-600' : 'text-rose-600'
                              }`} />
                              <span className="font-semibold">{calc.predicate} ({calc.nilaiAkhir || calc.finalScore})</span>
                            </button>
                          );
                        })()}
                      </td>

                      {/* Column 5: Aksi */}
                      <td className="py-3.5 px-4 md:px-6 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(activeActionMenuId === p.id ? null : p.id);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                            title="Menu Aksi Peserta"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {/* Dropdown Popup Menu */}
                          {activeActionMenuId === p.id && (
                            <div 
                              className="absolute right-full top-0 mr-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 text-left"
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

                            <button
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setAssignClassModalUser(p);
                                setSelectedClassToAssign(p.class_id ? String(p.class_id) : '');
                              }}
                              className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                            >
                              <GraduationCap className="w-4 h-4 text-teal-600" />
                              <span>Ganti / Masukkan Kelas</span>
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
                      </div>
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
          <div 
            onClick={() => setProfileModalUser(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in font-sans overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-slate-100 my-auto max-h-[90dvh] overflow-y-auto"
            >
              <button 
                onClick={() => setProfileModalUser(null)} 
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-xl flex items-center justify-center border-2 border-emerald-200 shrink-0 overflow-hidden shadow-xs relative">
                  <span>{profileModalUser.name ? profileModalUser.name.charAt(0) : 'P'}</span>
                  {profileModalUser.avatar && (
                    <img 
                      src={profileModalUser.avatar} 
                      alt={profileModalUser.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover absolute inset-0 z-10" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{profileModalUser.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{profileModalUser.instansi}</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 rounded-2xl p-4 text-xs">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">Email</span>
                  <span className="font-semibold text-slate-900">{profileModalUser.email}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">Jenis Kelamin</span>
                  <span className="font-semibold text-slate-900">
                    {(profileModalUser.gender || '').toUpperCase() === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">Asal Komisariat</span>
                  <span className="font-semibold text-slate-900">{profileModalUser.instansi}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-medium">Status Utama</span>
                  {profileModalUser.attendances?.['SES-01']?.present || profileModalUser.status === 'Hadir' ? (
                    <span className="font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">Hadir</span>
                  ) : profileModalUser.isExcused || profileModalUser.status === 'Izin' ? (
                    <span className="font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px]">Izin / Berhalangan</span>
                  ) : (
                    <span className="font-semibold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full text-[11px]">Belum Absen</span>
                  )}
                </div>

                {/* Status Nilai Akhir & Predikat LK 1 */}
                {(() => {
                  const userAss = assessments?.[profileModalUser.id] || assessments?.[profileModalUser.db_id] || (profileModalUser.db_id && assessments?.[String(profileModalUser.db_id)]) || null;
                  const calc = calculateAssessment(userAss || {
                    participantId: profileModalUser.id,
                    afektif: 100,
                    kognitif: 75,
                    psikomotorik: 50,
                    violations: [],
                    contributions: [],
                    qualitativeNote: ''
                  });

                  return (
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-500 font-medium">Penilaian LK 1</span>
                      <div className="text-right">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          calc.status === 'Lulus'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : calc.status === 'Perbaikan'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          <Award className="w-3 h-3 shrink-0" />
                          <span>{calc.predicate} (NA {calc.nilaiAkhir || calc.finalScore})</span>
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Afektif: {calc.afektif}% • Kognitif: {calc.kognitif}% • Psikomotorik: {calc.psikomotorik}%
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {(profileModalUser.isExcused || profileModalUser.status === 'Izin' || profileModalUser.excuseReason) && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                    <span className="font-semibold text-[10px] uppercase tracking-wider text-amber-700 block">Alasan Izin / Berhalangan:</span>
                    <p className="text-xs italic font-medium">"{profileModalUser.excuseReason || profileModalUser.attendances?.['SES-01']?.note || 'Berhalangan Hadir'}"</p>
                  </div>
                )}
              </div>

              {/* Action Close Button */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setProfileModalUser(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: FORM IZIN / BERHALANGAN */}
        {excuseModalUser && (
          <div 
            onClick={() => setExcuseModalUser(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-slate-100 my-auto max-h-[90dvh] overflow-y-auto"
            >
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
                <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 font-extrabold text-6xl flex items-center justify-center border-4 border-emerald-300 shadow-lg relative overflow-hidden">
                  <span>{previewPhotoUser.name?.charAt(0) || 'P'}</span>
                  {previewPhotoUser.avatar && (
                    <img
                      src={previewPhotoUser.avatar}
                      alt={previewPhotoUser.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover absolute inset-0 z-10"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
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

        {/* MODAL 3: GANTI / MASUKKAN PESERTA KE KELAS */}
        {assignClassModalUser && (
          <div 
            onClick={() => setAssignClassModalUser(null)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-sans"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 border border-slate-200 relative my-auto text-slate-900 max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-200 text-teal-700 flex items-center justify-center font-bold shrink-0">
                    <GraduationCap className="w-5 h-5 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">PENEMPATAN KELAS PESERTA</h3>
                    <p className="text-[11px] text-slate-500">Pilih kelas pembinaan untuk peserta ini</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAssignClassModalUser(null)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Info Peserta */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-xs">{assignClassModalUser.name}</div>
                <div className="text-[11px] text-slate-500">{assignClassModalUser.instansi || 'Komisariat Umum'} • {assignClassModalUser.email}</div>
                <div className="text-[10px] text-teal-700 font-semibold pt-1">
                  Status Saat Ini: {assignClassModalUser.class_id ? (assignClassModalUser.className || 'Kelas Khusus') : 'Kelas Umum (Default)'}
                </div>
              </div>

              {/* Pilihan Kelas */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Pilih Kelas Tujuan <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div
                    onClick={() => setSelectedClassToAssign('')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      selectedClassToAssign === '' 
                        ? 'bg-emerald-50/70 border-emerald-300 font-semibold text-emerald-950' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <School className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="font-bold">Kelas Umum (Default)</div>
                        <div className="text-[10px] text-slate-400">Kembalikan ke wadah umum tanpa kelas khusus</div>
                      </div>
                    </div>
                    {selectedClassToAssign === '' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>

                  {(availableClasses || []).map((cls) => {
                    const isSelected = String(cls.id) === String(selectedClassToAssign);
                    return (
                      <div
                        key={cls.id}
                        onClick={() => setSelectedClassToAssign(String(cls.id))}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected 
                            ? 'bg-teal-50/70 border-teal-300 font-semibold text-teal-950' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <GraduationCap className="w-4 h-4 text-teal-600" />
                          <div>
                            <div className="font-bold">{cls.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{cls.code} • {cls.participants_count || 0} Peserta</div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAssignClassModalUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingClassAssign}
                  onClick={async () => {
                    setIsSubmittingClassAssign(true);
                    const targetP = assignClassModalUser;
                    const parsedId = parseInt(String(targetP.id).replace(/\D/g, ''), 10);
                    const dbId = targetP?.db_id || (isNaN(parsedId) ? null : parsedId);

                    const targetClassId = selectedClassToAssign ? parseInt(selectedClassToAssign, 10) : null;
                    const targetClassObj = (availableClasses || []).find(c => c.id === targetClassId);
                    const newClassName = targetClassObj ? targetClassObj.name : 'Kelas Umum';
                    const newClassCode = targetClassObj ? targetClassObj.code : 'KELAS-UMUM';

                    try {
                      if (dbId) {
                        await api.updateUser(dbId, {
                          class_id: targetClassId
                        });
                      }

                      // Update local participants state
                      setParticipants(prev => (prev || []).map(p => {
                        if (p.id === targetP.id) {
                          return {
                            ...p,
                            class_id: targetClassId,
                            className: newClassName,
                            classCode: newClassCode
                          };
                        }
                        return p;
                      }));

                      showNotification(`Peserta (${targetP.name}) berhasil dimasukkan ke ${newClassName}!`);
                      setAssignClassModalUser(null);
                      if (refreshClasses) refreshClasses();
                    } catch (err) {
                      showNotification('Gagal memindahkan peserta ke kelas.');
                    } finally {
                      setIsSubmittingClassAssign(false);
                    }
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmittingClassAssign ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: MASUKKAN PESERTA DITANDAI KE KELAS (BULK ASSIGN) */}
        {isBulkAssignModalOpen && (
          <div 
            onClick={() => !isSubmittingBulkClass && setIsBulkAssignModalOpen(false)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-sans"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 border border-slate-200 relative my-auto text-slate-900 max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <GraduationCap className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">MASUKKAN KE KELAS BINAAN</h3>
                    <p className="text-[11px] text-slate-500">
                      Tandai {selectedParticipantIds.length} peserta untuk dimasukkan ke kelas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmittingBulkClass}
                  onClick={() => setIsBulkAssignModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Ringkasan Peserta Ditandai */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>Jumlah Peserta Terpilih:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px]">
                    {selectedParticipantIds.length} Peserta
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Semua peserta yang ditandai akan otomatis dipindahkan ke kelas binaan di bawah ini.
                </p>
              </div>

              {/* Pilihan Kelas Tujuan */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Pilih Kelas Tujuan <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div
                    onClick={() => setBulkTargetClassId('')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      bulkTargetClassId === '' 
                        ? 'bg-emerald-50/70 border-emerald-300 font-semibold text-emerald-950' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <School className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="font-bold">Kelas Umum (Default)</div>
                        <div className="text-[10px] text-slate-400">Kembalikan peserta ke Kelas Umum</div>
                      </div>
                    </div>
                    {bulkTargetClassId === '' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>

                  {(availableClasses || []).map((cls) => {
                    const isSelected = String(cls.id) === String(bulkTargetClassId);
                    return (
                      <div
                        key={cls.id}
                        onClick={() => setBulkTargetClassId(String(cls.id))}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected 
                            ? 'bg-teal-50/70 border-teal-300 font-semibold text-teal-950' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <GraduationCap className="w-4 h-4 text-teal-600" />
                          <div>
                            <div className="font-bold">{cls.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{cls.code} • {cls.participants_count || 0} Peserta Saat Ini</div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSubmittingBulkClass}
                  onClick={() => setIsBulkAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingBulkClass}
                  onClick={async () => {
                    if (selectedParticipantIds.length === 0) return;
                    setIsSubmittingBulkClass(true);

                    const targetClassId = bulkTargetClassId ? parseInt(bulkTargetClassId, 10) : null;
                    const targetClassObj = (availableClasses || []).find(c => c.id === targetClassId);
                    const newClassName = targetClassObj ? targetClassObj.name : 'Kelas Umum (Default)';
                    const newClassCode = targetClassObj ? targetClassObj.code : 'KELAS-UMUM';

                    try {
                      // Update setiap peserta yang ditandai ke backend
                      const updatePromises = selectedParticipantIds.map(async (pId) => {
                        const targetP = (participants || []).find(p => p.id === pId);
                        const parsedId = parseInt(String(pId).replace(/\D/g, ''), 10);
                        const dbId = targetP?.db_id || (isNaN(parsedId) ? null : parsedId);
                        if (dbId) {
                          try {
                            await api.updateUser(dbId, { class_id: targetClassId });
                          } catch (err) {
                            console.warn(`Gagal update class user ${dbId}:`, err);
                          }
                        }
                      });

                      await Promise.all(updatePromises);

                      // Update state peserta secara lokal
                      setParticipants(prev => (prev || []).map(p => {
                        if (selectedParticipantIds.includes(p.id)) {
                          return {
                            ...p,
                            class_id: targetClassId,
                            className: newClassName,
                            classCode: newClassCode
                          };
                        }
                        return p;
                      }));

                      showNotification(`Berhasil memasukkan ${selectedParticipantIds.length} peserta ke ${newClassName}!`);
                      setSelectedParticipantIds([]);
                      setIsBulkAssignModalOpen(false);
                      if (refreshClasses) refreshClasses();
                    } catch (err) {
                      showNotification('Gagal memproses penempatan kelas masal.');
                    } finally {
                      setIsSubmittingBulkClass(false);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmittingBulkClass ? 'Menyimpan...' : `Simpan ke ${bulkTargetClassId ? 'Kelas Binaan' : 'Kelas Umum'}`}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TAB 6: AUDIT LOG & SERVER
  if (activeTab === 'system_stats') {
    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans w-full">
        <AuditLogView />
      </div>
    );
  }

  // DEFAULT / TAB KELOLA ADMIN PANITIA (admin_management)
  return null;
}
