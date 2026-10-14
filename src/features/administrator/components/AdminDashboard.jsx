import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Camera, QrCode, Search, CheckCircle2, AlertTriangle, XCircle, Clock, 
  MapPin, Users, FileSpreadsheet, X, Sparkles, Printer, Share2, LifeBuoy, 
  Check, PlayCircle, StopCircle, RefreshCw, AlertCircle, FileText, Send, UserCheck, ShieldAlert,
  MoreVertical, User, Eye, Edit, Trash2, Save, Calendar, BarChart3, Plus, Copy, Lock, ShieldCheck, ToggleLeft, ToggleRight,
  ChevronRight, ChevronDown, Filter, ArrowLeft, GraduationCap, Award, Minus, RotateCcw, SlidersHorizontal, Calculator, HelpCircle, Maximize2, Building2,
  ClipboardCheck, Loader2
} from 'lucide-react';
import CameraScannerModal from './CameraScannerModal';
import SessionBarcodeModal from './SessionBarcodeModal';
import GoogleFormQuizBuilder from './GoogleFormQuizBuilder';
import QuizResultsView, { isSubmissionForQuiz, isSubmissionForParticipant } from './QuizResultsView';
import QuizPreviewModal from './QuizPreviewModal';
import ProfileView from '@/components/views/ProfileView';
import SettingsView from '@/components/views/SettingsView';
import HelpdeskView from '@/components/views/HelpdeskView';
import GuideView from '@/components/views/GuideView';
import AccessDeniedModal from '@/components/ui/AccessDeniedModal';
import XLSX from 'xlsx-js-style';
import { 
  downloadWorkbook, 
  createPesertaWorksheet, 
  createPesertaPerKelasWorkbook,
  createPresensiMatrixWorksheet, 
  createSingleSessionWorksheet,
  EXCEL_STYLES 
} from '@/utils/excelExportHelper';
import { useFeedback } from '@/context/FeedbackContext';
import { useClass } from '@/context/ClassContext';
import { getDynamicSessionStatus } from '@/utils/sessionStatus';
import { 
  ATTITUDE_RULES,
  AFEKTIF_RULES,
  KOGNITIF_RULES,
  PSIKOMOTORIK_RULES,
  VIOLATION_RULES, 
  CONTRIBUTION_RULES, 
  calculateAssessment, 
  INITIAL_ASSESSMENTS,
  KOMISARIAT_LIST 
} from '@/data/mockData';

export default function AdminDashboard({ 
  training, 
  refreshTraining,
  participants, 
  setParticipants, 
  refreshParticipants,
  activeTab, 
  setActiveTab,
  siteSettings,
  currentUser,
  onUpdateUser,
  userPermissions,
  quizzes,
  setQuizzes,
  refreshQuizzes,
  quizSubmissions,
  setQuizSubmissions,
  refreshQuizSubmissions,
  quizRequests,
  setQuizRequests,
  refreshQuizRequests,
  assessments,
  setAssessments,
  refreshAssessments,
  tickets,
  setTickets,
  refreshTickets
}) {
  const hasAttendanceAccess = (userPermissions?.canManageAttendance !== false && currentUser?.can_manage_attendance !== false);
  const hasAssessmentAccess = (userPermissions?.canManageGrading !== false && currentUser?.can_manage_assessment !== false);
  const hasQuizAccess = (userPermissions?.canManageQuiz === true || currentUser?.can_manage_quiz === true || currentUser?.can_manage_quiz === 1);

  const { selectedClassId, setSelectedClassId, classes } = useClass() || { selectedClassId: 'ALL', setSelectedClassId: () => {}, classes: [] };
  const [classQuizAccessList, setClassQuizAccessList] = useState([]);
  const [isLoadingQuizAccess, setIsLoadingQuizAccess] = useState(false);
  const [togglingQuizId, setTogglingQuizId] = useState(null);

  const [rekapData, setRekapData] = useState({
    training: null,
    classes: [],
    participants: [],
    sessions: [],
    attendance_map: {},
    quizzes: [],
    quiz_map: {},
    assessment_map: {}
  });

  const fetchClassQuizAccess = async () => {
    if (!selectedClassId || selectedClassId === 'ALL') return;
    setIsLoadingQuizAccess(true);
    try {
      const res = await api.getClassQuizAccess(selectedClassId);
      if (res && res.ok && Array.isArray(res.data)) {
        setClassQuizAccessList(res.data);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoadingQuizAccess(false);
    }
  };

  const fetchRekapData = async (classId = selectedClassId) => {
    try {
      const targetClass = (!classId || classId === 'ALL') ? 'all' : classId;
      const res = await api.getRekapGlobalSheets(targetClass);
      if (res && res.ok && res.data) {
        setRekapData(res.data);
      }
    } catch (e) {
      console.warn('Gagal memuat rekapData global sheets:', e);
    }
  };

  useEffect(() => {
    fetchClassQuizAccess();
    fetchRekapData(selectedClassId);
  }, [selectedClassId]);

  const [accessDeniedConfig, setAccessDeniedConfig] = useState({
    isOpen: false,
    title: 'Akses Dibatasi',
    featureName: '',
    description: ''
  });

  const triggerAccessDenied = (featureName, description) => {
    setAccessDeniedConfig({
      isOpen: true,
      title: 'Akses Fitur Terbatas',
      featureName,
      description: description || `Akun Administrator Anda belum memiliki izin untuk mengelola ${featureName}. Silakan hubungi Koordinator / Admin Utama untuk meminta pembukaan akses.`
    });
  };

  const [internalAssessments, setInternalAssessments] = useState(INITIAL_ASSESSMENTS);
  const currentAssessments = assessments || internalAssessments;
  const updateAssessments = setAssessments || setInternalAssessments;
  const [selectedSession, setSelectedSession] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [barcodeModalSession, setBarcodeModalSession] = useState(null);
  const [barcodeModalSessionIndex, setBarcodeModalSessionIndex] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSession, setFilterSession] = useState('ALL');
  const [simulatedTokenInput, setSimulatedTokenInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isVerifyingFastToken, setIsVerifyingFastToken] = useState(false);
  const [fastTokenSessionId, setFastTokenSessionId] = useState('');

  // States Presensi Manual Sesi
  const [manualAttendanceSession, setManualAttendanceSession] = useState(null);
  const [manualAttendanceToken, setManualAttendanceToken] = useState('');
  const [manualAttendanceSelectedParticipantId, setManualAttendanceSelectedParticipantId] = useState('');
  const [manualAttendanceFeedback, setManualAttendanceFeedback] = useState(null);
  const [manualAttendanceTab, setManualAttendanceTab] = useState('token'); // 'token' | 'picker'
  const [manualAttendanceStatus, setManualAttendanceStatus] = useState('present'); // 'present' | 'permission' | 'absent'
  const [manualAttendanceNote, setManualAttendanceNote] = useState('');
  const [participantAttendanceModalUser, setParticipantAttendanceModalUser] = useState(null);
  const [isSubmittingManualAttendance, setIsSubmittingManualAttendance] = useState(false);

  // States Sesi Manual Control & Status
  const [sessionStatuses, setSessionStatuses] = useState(
    training?.sessions?.reduce((acc, s) => ({ ...acc, [s.id]: s.status }), {}) || {}
  );

  // State Presensi Manual Note
  const [manualNoteModal, setManualNoteModal] = useState(null);
  const [manualNoteText, setManualNoteText] = useState('Presensi Manual Panitia - Layar HP Rusak/Bawaan');

  // State Menu Aksi Titik 3 & Modals (Profil & Izin/Berhalangan)
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [activeSessionActionMenuId, setActiveSessionActionMenuId] = useState(null);
  const [activeRecapSessionActionMenuId, setActiveRecapSessionActionMenuId] = useState(null);
  const [profileModalUser, setProfileModalUser] = useState(null);
  const [previewPhotoUser, setPreviewPhotoUser] = useState(null);
  const [excuseModalUser, setExcuseModalUser] = useState(null);
  const [excuseReasonText, setExcuseReasonText] = useState('');
  const [excuseModalSessionId, setExcuseModalSessionId] = useState(null);

  // State Modal Edit Peserta
  const [editModalUser, setEditModalUser] = useState(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormEmail, setEditFormEmail] = useState('');
  const [editFormInstansi, setEditFormInstansi] = useState('');
  const [editFormJabatan, setEditFormJabatan] = useState('');
  const [editFormPhone, setEditFormPhone] = useState('');
  const [editFormGender, setEditFormGender] = useState('L');
  const [editFormPassword, setEditFormPassword] = useState('');

  // State Filter Peserta
  const [filterKomisariat, setFilterKomisariat] = useState('ALL');
  const [filterGender, setFilterGender] = useState('ALL');

  // State Modal Tabel Kehadiran & Ekspor Excel
  const [recapModalSession, setRecapModalSession] = useState(null);
  const [recapModalSelectedSessionId, setRecapModalSelectedSessionId] = useState('ALL');
  const [recapModalFilter, setRecapModalFilter] = useState('ALL');
  const [recapModalKomisariatFilter, setRecapModalKomisariatFilter] = useState('ALL');
  const [recapSearchQuery, setRecapSearchQuery] = useState('');
  const [recapModalActionMenuId, setRecapModalActionMenuId] = useState(null);

  const handleOpenRecapModal = (sessionObj) => {
    setRecapModalSession(sessionObj);
    setRecapModalSelectedSessionId(sessionObj && sessionObj !== 'ALL' ? sessionObj.id : 'ALL');
    setRecapModalFilter('ALL');
    setRecapModalKomisariatFilter('ALL');
    setRecapSearchQuery('');
    setRecapModalActionMenuId(null);
  };

  // State Helpdesk Incidents
  const [incidents, setIncidents] = useState([]);
  const [newIncidentUser, setNewIncidentUser] = useState('');
  const [newIncidentIssue, setNewIncidentIssue] = useState('');
  const [activeIncidentMenuId, setActiveIncidentMenuId] = useState(null);
  const [previewIncidentModal, setPreviewIncidentModal] = useState(null);
  const [editSolutionInput, setEditSolutionInput] = useState('');

  const handleUpdateIncidentStatus = (incId, newStatus, newSolution = null) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incId) {
        return {
          ...inc,
          status: newStatus,
          ...(newSolution !== null ? { solution: newSolution } : {})
        };
      }
      return inc;
    }));
    showNotification(`Status kendala berhasil diperbarui menjadi "${newStatus}"!`);
  };

  // --- QUIZ MANAGEMENT STATES ---
  const [quizFilterType, setQuizFilterType] = useState('ALL');
  const [activeQuizBuilder, setActiveQuizBuilder] = useState(null); // Full Page Google Forms Quiz Builder
  const [previewQuiz, setPreviewQuiz] = useState(null); // Quiz Preview Modal
  const [copiedQuizId, setCopiedQuizId] = useState(null); // Feedback indicator for copy button
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [quizFormTitle, setQuizFormTitle] = useState('');
  const [quizFormType, setQuizFormType] = useState('pretest');
  const [quizFormDuration, setQuizFormDuration] = useState(15);
  const [quizFormGrade, setQuizFormGrade] = useState(70);
  const [quizFormLink, setQuizFormLink] = useState('');
  const [quizFormDesc, setQuizFormDesc] = useState('');
  const [quizFormInstructions, setQuizFormInstructions] = useState('');

  const [activeQuizForQuestions, setActiveQuizForQuestions] = useState(null);
  const [questionFormType, setQuestionFormType] = useState('multiple_choice');
  const [questionFormText, setQuestionFormText] = useState('');
  const [questionFormOptA, setQuestionFormOptA] = useState('');
  const [questionFormOptB, setQuestionFormOptB] = useState('');
  const [questionFormOptC, setQuestionFormOptC] = useState('');
  const [questionFormOptD, setQuestionFormOptD] = useState('');
  const [questionFormCorrect, setQuestionFormCorrect] = useState('A');
  const [questionFormScore, setQuestionFormScore] = useState(25);

  const [activeQuizForResults, setActiveQuizForResults] = useState(null);
  const [activeQuizActionMenu, setActiveQuizActionMenu] = useState(null);

  const handleToggleQuizActionMenu = (e, qz) => {
    e.stopPropagation();
    if (activeQuizActionMenu?.qz?.id === qz.id) {
      setActiveQuizActionMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 224; // w-56
    const menuHeight = 140;

    const canOpenLeft = rect.left > menuWidth + 16;
    const topPos = Math.max(12, Math.min(rect.top, window.innerHeight - menuHeight - 12));

    setActiveQuizActionMenu({
      qz,
      top: canOpenLeft ? topPos : Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 12),
      right: canOpenLeft ? (window.innerWidth - rect.left + 8) : Math.max(12, window.innerWidth - rect.right),
    });
  };

  const [requestResetSub, setRequestResetSub] = useState(null);
  const [requestResetReason, setRequestResetReason] = useState('');

  // --- PARTICIPANT ASSESSMENT (PENILAIAN PESERTA LK 1) STATES ---
  const [sessionGradingModal, setSessionGradingModal] = useState(null); // { session, sessionIndex }
  const [selectedParticipantForGrading, setSelectedParticipantForGrading] = useState(null); // Individual participant detail sheet
  const [violationPickerModal, setViolationPickerModal] = useState(null); // { participant, session }
  const [contributionPickerModal, setContributionPickerModal] = useState(null); // { participant, session }
  const [kognitifPickerModal, setKognitifPickerModal] = useState(null); // { participant, session, mode }
  const [attitudePickerModal, setAttitudePickerModal] = useState(null); // { participant, session, initialTab }
  const [attitudeModalTab, setAttitudeModalTab] = useState('afektif'); // 'afektif' | 'kognitif' | 'psikomotorik'
  const [penilaianSearchQuery, setPenilaianSearchQuery] = useState('');
  const [penilaianFilterKomisariat, setPenilaianFilterKomisariat] = useState('ALL');
  const [penilaianFilterStatus, setPenilaianFilterStatus] = useState('ALL');
  const [activeAssessmentActionMenuId, setActiveAssessmentActionMenuId] = useState(null);
  const [penilaianFullscreenModalOpen, setPenilaianFullscreenModalOpen] = useState(false);
  const [penilaianModalSession, setPenilaianModalSession] = useState(null);
  const [penilaianModalSearchQuery, setPenilaianModalSearchQuery] = useState('');
  const [penilaianModalFilter, setPenilaianModalFilter] = useState('ALL');
  const [qualitativeNoteInput, setQualitativeNoteInput] = useState('');

  const handleOpenParticipantGrading = (participant) => {
    setSelectedParticipantForGrading(participant);
    setQualitativeNoteInput(participant?.assessment?.qualitativeNote || '');
  };

  const handleOpenSessionGrading = (sessionConfig) => {
    if (!hasAssessmentAccess) {
      triggerAccessDenied('Penilaian Peserta Sesi', 'Fitur input penilaian evaluasi peserta pada sesi ini terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
      return;
    }
    setSessionGradingModal(sessionConfig);
    setPenilaianSearchQuery('');
  };

  // Deteksi apakah sedang ada modal/popup/halaman fullscreen aktif di AdminDashboard
  const isAnyModalOpen = Boolean(
    isScannerOpen ||
    barcodeModalSession ||
    manualAttendanceSession ||
    participantAttendanceModalUser ||
    manualNoteModal ||
    profileModalUser ||
    previewPhotoUser ||
    excuseModalUser ||
    editModalUser ||
    recapModalSession ||
    previewIncidentModal ||
    activeQuizBuilder ||
    previewQuiz ||
    showCreateQuizModal ||
    activeQuizForQuestions ||
    activeQuizForResults ||
    requestResetSub ||
    sessionGradingModal ||
    selectedParticipantForGrading ||
    violationPickerModal ||
    contributionPickerModal ||
    kognitifPickerModal ||
    attitudePickerModal ||
    penilaianFullscreenModalOpen ||
    penilaianModalSession ||
    accessDeniedConfig?.isOpen
  );

  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      if (isAnyModalOpen) {
        document.body.classList.add('hide-bottom-nav');
      } else {
        document.body.classList.remove('hide-bottom-nav');
      }
    }
    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('hide-bottom-nav');
      }
    };
  }, [isAnyModalOpen]);

  
  useEffect(() => {
    const fetchApiData = async () => {
      try {
        const [qRes, aRes, tRes] = await Promise.all([
          api.getQuizzes(),
          api.getAssessments('all'),
          api.getTickets()
        ]);
        if (qRes && qRes.ok && typeof setQuizzes === 'function') setQuizzes(qRes.data);
        if (aRes && aRes.ok && typeof updateAssessments === 'function') updateAssessments(aRes.data);
        if (tRes && tRes.ok && typeof setTickets === 'function') setTickets(tRes.data);
      } catch (err) {
        console.error('Error fetching API data', err);
      }
    };
    fetchApiData();
  }, []);

  useEffect(() => {
    setPreviewPhotoUser(null);
  }, [activeTab]);

  // ON-DEMAND AUTO SYNC: Saat admin membuka tab Rekap Presensi / Data Peserta
  useEffect(() => {
    if (activeTab === 'recap' || activeTab === 'rekap_data' || activeTab === 'participants') {
      if (typeof refreshParticipants === 'function') refreshParticipants();
      if (typeof refreshTraining === 'function') refreshTraining();
    }
  }, [activeTab]);

  // ON-DEMAND AUTO SYNC: Saat admin membuka modal Rekap Presensi Sesi
  useEffect(() => {
    if (recapModalSession) {
      if (typeof refreshParticipants === 'function') refreshParticipants();
    }
  }, [recapModalSession]);

  // ON-DEMAND AUTO SYNC: Saat admin membuka tab Rekap Penilaian
  useEffect(() => {
    if (activeTab === 'rekap_penilaian') {
      if (typeof refreshAssessments === 'function') refreshAssessments();
      if (typeof refreshParticipants === 'function') refreshParticipants();
    }
  }, [activeTab]);

  // ON-DEMAND AUTO SYNC: Saat admin membuka lembar/modal penilaian peserta
  useEffect(() => {
    if (sessionGradingModal || selectedParticipantForGrading || penilaianFullscreenModalOpen) {
      if (typeof refreshAssessments === 'function') refreshAssessments();
    }
  }, [sessionGradingModal, selectedParticipantForGrading, penilaianFullscreenModalOpen]);

  // ON-DEMAND AUTO SYNC: Saat admin membuka tab Kuis
  useEffect(() => {
    if (activeTab === 'quizzes') {
      if (typeof refreshQuizzes === 'function') refreshQuizzes();
      if (typeof refreshQuizSubmissions === 'function') refreshQuizSubmissions();
      if (typeof refreshQuizRequests === 'function') refreshQuizRequests();
    }
  }, [activeTab]);

  // ON-DEMAND AUTO SYNC: Saat admin membuka tab Helpdesk
  useEffect(() => {
    if (activeTab === 'helpdesk') {
      if (typeof refreshTickets === 'function') refreshTickets();
    }
  }, [activeTab]);

  // Scoped participants according to Admin's assigned class / selectedClassId
  const scopedParticipants = useMemo(() => {
    const list = Array.isArray(participants) 
      ? participants 
      : (participants && Array.isArray(participants.data) ? participants.data : []);
    if (!list || list.length === 0) return [];
    
    // Administrator Panitia: strictly filter to their managed class / selectedClassId
    if (currentUser?.role === 'admin') {
      const managedIds = Array.isArray(currentUser.managed_classes)
        ? currentUser.managed_classes.map(c => String(c.id))
        : [];

      return list.filter(p => {
        const pClassId = p.class_id ? String(p.class_id) : null;
        
        // If a specific class is selected in topbar
        if (selectedClassId && selectedClassId !== 'ALL') {
          return pClassId === String(selectedClassId);
        }
        
        // Otherwise, only show if participant belongs to one of admin's managed classes
        if (managedIds.length > 0) {
          return pClassId && managedIds.includes(pClassId);
        }
        
        return true;
      });
    }

    // Super Admin: can view all or filter by selectedClassId
    if (currentUser?.role === 'super_admin' && selectedClassId && selectedClassId !== 'ALL') {
      if (selectedClassId === 'general') {
        return list.filter(p => !p.class_id);
      }
      return list.filter(p => String(p.class_id) === String(selectedClassId));
    }

    return list;
  }, [participants, currentUser, selectedClassId]);

  const totalP = scopedParticipants.length;

  const { confirm: confirmDialog, showNotification, closeNotification } = useFeedback();

  // Bersihkan notifikasi dan seluruh modal saat berpindah tab menu agar tidak bocor ke menu lain
  useEffect(() => {
    if (typeof closeNotification === 'function') {
      closeNotification();
    }
    setProfileModalUser(null);
    setExcuseModalUser(null);
    setEditModalUser(null);
    setManualNoteModal(null);
    setManualAttendanceSession(null);
    setParticipantAttendanceModalUser(null);
    setShowCreateQuizModal(false);
    setActiveQuizForQuestions(null);
    setRequestResetSub(null);
    setPreviewQuiz(null);
    setPreviewIncidentModal(null);
    setViolationPickerModal(null);
    setContributionPickerModal(null);
    setKognitifPickerModal(null);
    setSelectedParticipantForGrading(null);
    setActiveQuizActionMenu(null);
    setActiveQuizForResults(null);
    setRecapModalSession(null);
    setPenilaianModalSession(null);
  }, [activeTab, closeNotification]);

  // Tutup modal aktif dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (violationPickerModal) { setViolationPickerModal(null); return; }
        if (contributionPickerModal) { setContributionPickerModal(null); return; }
        if (kognitifPickerModal) { setKognitifPickerModal(null); return; }
        if (excuseModalUser) { setExcuseModalUser(null); return; }
        if (profileModalUser) { setProfileModalUser(null); return; }
        if (editModalUser) { setEditModalUser(null); return; }
        if (manualNoteModal) { setManualNoteModal(null); return; }
        if (manualAttendanceSession) { setManualAttendanceSession(null); return; }
        if (participantAttendanceModalUser) { setParticipantAttendanceModalUser(null); return; }
        if (previewIncidentModal) { setPreviewIncidentModal(null); return; }
        if (showCreateQuizModal) { setShowCreateQuizModal(false); return; }
        if (activeQuizForQuestions) { setActiveQuizForQuestions(null); return; }
        if (requestResetSub) { setRequestResetSub(null); return; }
        if (previewQuiz) { setPreviewQuiz(null); return; }
        if (activeQuizActionMenu) { setActiveQuizActionMenu(null); return; }
        if (selectedParticipantForGrading) { setSelectedParticipantForGrading(null); return; }
        if (penilaianModalSession) { setPenilaianModalSession(null); return; }
        if (recapModalSession) { setRecapModalSession(null); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    violationPickerModal, contributionPickerModal, excuseModalUser, profileModalUser,
    editModalUser, manualNoteModal, manualAttendanceSession, participantAttendanceModalUser,
    previewIncidentModal, showCreateQuizModal, activeQuizForQuestions, requestResetSub,
    previewQuiz, activeQuizActionMenu, selectedParticipantForGrading, penilaianModalSession, recapModalSession
  ]);

  // Memoized Assessment per participant (Sinkron 100% dengan Rekap Sheet TOTAL KESELURUHAN)
  const assessedParticipants = useMemo(() => {
    const preQuiz = (rekapData.quizzes || []).find(q => q.type === 'pretest' || q.type === 'pre-test') || 
                    (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('pre')) || 
                    { id: 6, title: 'Pre-Test' };
    const midQuiz = (rekapData.quizzes || []).find(q => q.type === 'midtest' || q.type === 'mid-test' || q.type === 'evaluasi') || 
                    (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('mid') || (q.title || '').toLowerCase().includes('tengah')) || 
                    { id: 8, title: 'Mid-Test' };
    const postQuiz = (rekapData.quizzes || []).find(q => q.type === 'posttest' || q.type === 'post-test') || 
                     (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('post')) || 
                     { id: 7, title: 'Post-Test' };

    return scopedParticipants.map(p => {
      const rawAss = currentAssessments[p.id] || {
        participantId: p.id,
        afektif: 100,
        kognitif: 75,
        psikomotorik: 50,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };

      // 1. Kognitif: Screening & Tes Tulis
      const assGlobal = rekapData.assessment_map ? rekapData.assessment_map[`${p.id}_global`] : null;
      const conGlobal = assGlobal?.contributions || {};
      const rawIsl = conGlobal.screening_keislaman;
      const rawHmi = conGlobal.screening_kehmi;
      const rawInd = conGlobal.screening_keindonesiaan;
      const rawOrg = conGlobal.screening_keorganisasian;
      const rawSup = conGlobal.screening_suplemen;

      const hasScr = [rawIsl, rawHmi, rawInd, rawOrg, rawSup].some(v => v !== '' && v !== null && v !== undefined);
      const sumScrRaw = (Number(rawIsl) || 0) + (Number(rawHmi) || 0) + (Number(rawInd) || 0) + (Number(rawOrg) || 0) + (Number(rawSup) || 0);
      const computedScrAvg = hasScr ? Math.round(sumScrRaw / 5) : 0;
      // BUG FIX: jika screening terisi 0 atau kosong, pertahankan fallback ke rawAss.kognitif / modal 75
      const assGlobalKognitif = (assGlobal?.kognitif !== null && assGlobal?.kognitif !== undefined && Number(assGlobal.kognitif) > 0)
        ? Number(assGlobal.kognitif)
        : Number(rawAss.kognitif ?? 75);
      const kogScr = hasScr ? (computedScrAvg > 0 ? computedScrAvg : assGlobalKognitif) : assGlobalKognitif;

      let sumQuiz = 0;
      let countQuiz = 0;
      [preQuiz, midQuiz, postQuiz].forEach(qz => {
        if (qz && qz.id && rekapData.quiz_map) {
          const val = rekapData.quiz_map[`${p.id}_${qz.id}`];
          if (val !== undefined && val !== null && val !== '') {
            sumQuiz += Number(val) || 0;
            countQuiz++;
          }
        }
      });
      const avgTes = countQuiz > 0 ? Math.round(sumQuiz / countQuiz) : 0;
      const hasQuizData = countQuiz > 0;
      const kogJumlah = kogScr + avgTes;
      const kogRata = hasQuizData ? Number((kogJumlah / 2).toFixed(1)) : kogScr;

      // 2. Psikomotorik: Tugas & Absensi
      let sumTask = 0;
      let taskCount = 0;
      (rekapData.sessions || []).forEach(s => {
        const assS = rekapData.assessment_map 
          ? (rekapData.assessment_map[`${p.id}_${s.id}`] || (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null))
          : null;
        const conS = assS?.contributions || {};
        const rawScore = conS.tugas;
        if (rawScore !== null && rawScore !== undefined && rawScore !== '') {
          sumTask += Number(rawScore) || 0;
          taskCount++;
        }
      });
      // BUG FIX: fallback ke assGlobal.psikomotorik hanya jika > 0, else pakai rawAss (currentAssessments lokal) atau default LK 1 (50)
      const assGlobalPsiko = (assGlobal?.psikomotorik !== null && assGlobal?.psikomotorik !== undefined && Number(assGlobal.psikomotorik) > 0)
        ? Number(assGlobal.psikomotorik)
        : Number(rawAss.psikomotorik ?? 50);
      const computedTaskAvg = taskCount > 0 ? Math.round(sumTask / taskCount) : assGlobalPsiko;
      const psiTugas = computedTaskAvg;

      let hadirCount = 0;
      let hasAttendanceRecord = false;
      (rekapData.sessions || []).forEach(s => {
        const currentStatus = rekapData.attendance_map ? rekapData.attendance_map[`${p.id}_${s.id}`] : null;
        if (currentStatus !== null && currentStatus !== undefined && currentStatus !== '') {
          hasAttendanceRecord = true;
          if (currentStatus === 'present' || currentStatus === 'Hadir' || currentStatus === '1') {
            hadirCount++;
          }
        }
      });
      const totalSessionsCount = (rekapData.sessions || []).length;
      const psiAbsen = (totalSessionsCount > 0 && hasAttendanceRecord) ? Math.round((hadirCount / totalSessionsCount) * 100) : 0;
      
      let psiRata = psiTugas;
      if (taskCount > 0 && hasAttendanceRecord) {
        psiRata = Number(((psiTugas + psiAbsen) / 2).toFixed(1));
      } else if (hasAttendanceRecord && hadirCount > 0) {
        psiRata = psiAbsen;
      } else {
        psiRata = psiTugas > 0 ? psiTugas : (Number(rawAss.psikomotorik) > 0 ? Number(rawAss.psikomotorik) : 50);
      }

      // 3. Afektif: Forum Sesi
      let sumForumAvg = 0;
      let forumCount = 0;
      (rekapData.sessions || []).forEach(s => {
        const assS = rekapData.assessment_map 
          ? (rekapData.assessment_map[`${p.id}_${s.id}`] || (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null))
          : null;
        // BUG FIX: Jika tidak ada data dari backend, coba pakai data sesi dari currentAssessments lokal
        const localSessData = rawAss.sessions?.[s.id] || rawAss.sessions?.[s.session_code] || null;
        const conS = assS?.contributions || {};
        const vios = Array.isArray(assS?.violations) ? assS.violations : (Array.isArray(rawAss.violations) ? rawAss.violations.filter(v => v.sessionId === s.id || String(v.sessionId) === String(s.id)) : []);
        const consList = Array.isArray(conS) ? conS : (Array.isArray(conS.contributions) ? conS.contributions : (Array.isArray(rawAss.contributions) ? rawAss.contributions.filter(c => c.sessionId === s.id || String(c.sessionId) === String(s.id)) : []));

        let logA1 = 0, logA2 = 0, logA3 = 0, logA4 = 0, logA5 = 0;
        if (conS.afektif_1 === undefined && vios.length > 0) {
          vios.forEach(v => {
            const sym = String(v.symbol || '').toUpperCase();
            const pts = Math.abs(Number(v.points) || 1);
            if (sym === 'A1' || sym.includes('A1')) logA1 += pts;
            else if (sym === 'A2' || sym.includes('A2')) logA2 += pts;
            else if (sym === 'A3' || sym.includes('A3')) logA3 += pts;
            else if (sym === 'A4' || sym.includes('A4')) logA4 += pts;
            else if (sym === 'A5' || sym.includes('A5')) logA5 += pts;
            else {
              if (pts <= 1) logA1 += pts;
              else if (pts <= 3) logA2 += pts;
              else logA3 += pts;
            }
          });
        }

        let logP1 = 0, logP2 = 0, logP3 = 0, logP4 = 0, logP5 = 0;
        if (conS.psiko_1 === undefined && consList.length > 0) {
          consList.forEach(c => {
            const sym = String(c.symbol || '').toUpperCase();
            const pts = Math.abs(Number(c.points) || 1);
            if (sym === 'P1' || sym.includes('P1')) logP1 += pts;
            else if (sym === 'P2' || sym.includes('P2')) logP2 += pts;
            else if (sym === 'P3' || sym.includes('P3')) logP3 += pts;
            else if (sym === 'P4' || sym.includes('P4')) logP4 += pts;
            else if (sym === 'P5' || sym.includes('P5')) logP5 += pts;
            else {
              if (pts <= 2) logP1 += pts;
              else if (pts <= 3) logP2 += pts;
              else logP3 += pts;
            }
          });
        }

        const a1 = Number(conS.afektif_1 ?? logA1 ?? 0);
        const a2 = Number(conS.afektif_2 ?? logA2 ?? 0);
        const a3 = Number(conS.afektif_3 ?? logA3 ?? 0);
        const a4 = Number(conS.afektif_4 ?? logA4 ?? 0);
        const a5 = Number(conS.afektif_5 ?? logA5 ?? 0);
        const sumAfk = a1 + a2 + a3 + a4 + a5;

        const psi1 = Number(conS.psiko_1 ?? logP1 ?? 0);
        const psi2 = Number(conS.psiko_2 ?? logP2 ?? 0);
        const psi3 = Number(conS.psiko_3 ?? logP3 ?? 0);
        const psi4 = Number(conS.psiko_4 ?? logP4 ?? 0);
        const psi5 = Number(conS.psiko_5 ?? logP5 ?? 0);
        const sumPsi = psi1 + psi2 + psi3 + psi4 + psi5;

        const hasSub = (sumAfk > 0 || sumPsi > 0);
        if (hasSub) {
          const afkAkhir = Math.max(0, 100 - sumAfk);
          const psiAkhir = Math.min(100, 50 + sumPsi);
          sumForumAvg += (afkAkhir * 0.5) + (75 * 0.3) + (psiAkhir * 0.2);
          forumCount++;
        } else if (assS && (assS.nilai_akhir !== null && assS.nilai_akhir !== undefined && Number(assS.nilai_akhir) > 0)) {
          sumForumAvg += Number(assS.nilai_akhir);
          forumCount++;
        } else if (assS && (assS.afektif !== null && assS.afektif !== undefined && Number(assS.afektif) > 0)) {
          const sAfk = Number(assS.afektif);
          const sKog = Number(assS.kognitif ?? 75);
          const sPsi = Number(assS.psikomotorik ?? 50);
          sumForumAvg += (sAfk * 0.5) + (sKog * 0.3) + (sPsi * 0.2);
          forumCount++;
        } else if (localSessData && localSessData.afektif !== undefined && localSessData.afektif !== null) {
          sumForumAvg += Number(localSessData.nilaiAkhir ?? localSessData.afektif);
          forumCount++;
        } else {
          sumForumAvg += 82.5;
          forumCount++;
        }
      });
      const assGlobalAfektif = (assGlobal?.afektif !== null && assGlobal?.afektif !== undefined && Number(assGlobal.afektif) > 0)
        ? Number(assGlobal.afektif)
        : Number(rawAss.afektif ?? 100);
      const computedForumAvg = forumCount > 0 ? Math.round(sumForumAvg / forumCount) : assGlobalAfektif;
      const afkRata = Number(Number(computedForumAvg).toFixed(1));

      // Rumus Final Score LK 1 Identik TOTAL KESELURUHAN:
      // Total Score = (Kognitif Rata2 x 30%) + (Psikomotorik Rata2 x 20%) + (Afektif Rata2 x 50%)
      const totalScore = Math.round((kogRata * 0.3) + (psiRata * 0.2) + (afkRata * 0.5));
      const isLulus = totalScore >= 70;
      const predicate = totalScore >= 85 ? 'Baik Sekali' : (totalScore >= 75 ? 'Baik' : (totalScore >= 60 ? 'Cukup' : 'Kurang'));
      const status = isLulus ? 'Lulus' : (totalScore >= 60 ? 'Perbaikan' : 'Tidak Lulus');

      const computed = {
        afektif: afkRata,
        kognitif: kogRata,
        psikomotorik: psiRata,
        finalScore: totalScore,
        predicate,
        status,
        isPassed: isLulus
      };

      return {
        ...p,
        assessment: rawAss,
        computed
      };
    });
  }, [scopedParticipants, currentAssessments, rekapData]);

  const filteredAssessedParticipants = useMemo(() => {
    const q = penilaianSearchQuery.toLowerCase().trim();
    return assessedParticipants.filter(p => {
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.instansi && p.instansi.toLowerCase().includes(q)) ||
        (p.qrToken && p.qrToken.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (penilaianFilterKomisariat !== 'ALL' && p.instansi !== penilaianFilterKomisariat) return false;
      if (penilaianFilterStatus !== 'ALL') {
        if (penilaianFilterStatus === 'Baik Sekali' && p.computed.predicate !== 'Baik Sekali') return false;
        if (penilaianFilterStatus === 'Baik' && p.computed.predicate !== 'Baik') return false;
        if (penilaianFilterStatus === 'Perbaikan' && p.computed.status !== 'Perbaikan') return false;
        if (penilaianFilterStatus === 'Tidak Lulus' && p.computed.status !== 'Tidak Lulus') return false;
      }
      return true;
    });
  }, [assessedParticipants, penilaianSearchQuery, penilaianFilterKomisariat, penilaianFilterStatus]);

  // Auto-save assessment to backend API (Debounced 300ms)
  const saveTimeoutMapRef = useRef({});
  const saveAssessmentDebounced = useCallback((participantId, updatedAss, sessionId = null) => {
    if (!participantId) return;
    const sessId = sessionId ? String(sessionId) : null;
    const key = `${participantId}_${sessId || 'global'}`;
    if (saveTimeoutMapRef.current[key]) {
      clearTimeout(saveTimeoutMapRef.current[key]);
    }

    saveTimeoutMapRef.current[key] = setTimeout(async () => {
      try {
        const sessScore = sessId && updatedAss.sessions?.[sessId] ? updatedAss.sessions[sessId] : null;
        
        // Saring pelanggaran dan kontribusi khusus sesi jika sessId ada (dengan proteksi tipe array)
        const rawVios = updatedAss.violations;
        const allVios = Array.isArray(rawVios) 
          ? rawVios 
          : (rawVios && typeof rawVios === 'object' ? Object.values(rawVios).filter(v => v && typeof v === 'object' && ('points' in v || 'item' in v)) : []);
        const rawCons = updatedAss.contributions;
        const allCons = Array.isArray(rawCons)
          ? rawCons
          : (Array.isArray(rawCons?.contributions) 
            ? rawCons.contributions 
            : (rawCons && typeof rawCons === 'object' ? Object.values(rawCons).filter(c => c && typeof c === 'object' && ('points' in c || 'item' in c)) : []));

        const sessViolations = sessId 
          ? allVios.filter(v => v.sessionId === sessId || String(v.sessionId) === String(sessId))
          : allVios;
        const sessContributions = sessId
          ? allCons.filter(c => c.sessionId === sessId || String(c.sessionId) === String(sessId))
          : allCons;

        const vioDeduction = sessViolations.reduce((acc, v) => acc + Math.abs(Number(v?.points) || 0), 0);
        const conBonus = sessContributions.reduce((acc, c) => acc + Math.abs(Number(c?.points) || 0), 0);

        const currentAfektif = sessScore?.afektif !== undefined 
          ? sessScore.afektif 
          : (sessId ? Math.max(0, 100 - vioDeduction) : (updatedAss.afektif !== undefined ? updatedAss.afektif : Math.max(0, 100 - vioDeduction)));
        
        const currentKognitif = sessScore?.kognitif !== undefined 
          ? sessScore.kognitif 
          : (updatedAss.kognitif !== undefined ? updatedAss.kognitif : 75);
        
        const currentPsikomotorik = sessScore?.psikomotorik !== undefined 
          ? sessScore.psikomotorik 
          : (sessId ? Math.min(100, 50 + conBonus) : (updatedAss.psikomotorik !== undefined ? updatedAss.psikomotorik : Math.min(100, 50 + conBonus)));

        const payload = {
          participantId,
          sessionId: sessId,
          session_key: sessId,
          afektif: currentAfektif,
          kognitif: currentKognitif,
          psikomotorik: currentPsikomotorik,
          violations: sessId ? sessViolations : (updatedAss.violations || []),
          contributions: sessId ? sessContributions : (updatedAss.contributions || []),
          notes: updatedAss.notes || updatedAss.qualitativeNote || '',
        };
        await api.saveAssessment(payload);
        // BUG FIX: Refresh data rekap dari backend agar nilai akhir langsung ter-update
        if (typeof refreshAssessments === 'function') refreshAssessments();
        if (typeof fetchRekapData === 'function') fetchRekapData();
      } catch (err) {
        console.warn('Auto-save assessment error:', err);
      }
    }, 300);
  }, [refreshAssessments, fetchRekapData]);

  // Memoized Assessment for Single Session Penilaian Modal (Khusus Sesi Tertentu)
  const modalSessionAssessedParticipants = useMemo(() => {
    if (!penilaianModalSession) return [];
    const sessId = penilaianModalSession.id;
    const q = (penilaianModalSearchQuery || '').toLowerCase().trim();
    return (participants || []).map(p => {
      const rawAss = currentAssessments[p.id] || {
        participantId: p.id,
        afektif: 100,
        kognitif: 75,
        psikomotorik: 50,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      const computed = calculateAssessment(rawAss, sessId);
      return {
        ...p,
        assessment: rawAss,
        computed
      };
    }).filter(p => {
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.instansi && p.instansi.toLowerCase().includes(q)) ||
        (p.qrToken && p.qrToken.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (penilaianModalFilter !== 'ALL') {
        if (penilaianModalFilter === 'Baik Sekali' && p.computed.predicate !== 'Baik Sekali') return false;
        if (penilaianModalFilter === 'Baik' && p.computed.predicate !== 'Baik') return false;
        if (penilaianModalFilter === 'Perbaikan' && p.computed.status !== 'Perbaikan') return false;
        if (penilaianModalFilter === 'Tidak Lulus' && p.computed.status !== 'Tidak Lulus') return false;
      }
      return true;
    });
  }, [participants, currentAssessments, penilaianModalSession, penilaianModalSearchQuery, penilaianModalFilter]);

  // Memoized Assessment for Session Grading Modal (Lembar Penilaian Sesi)
  const sessionGradingParticipants = useMemo(() => {
    if (!sessionGradingModal?.session) return [];
    const sessId = sessionGradingModal.session.id;
    const q = (penilaianSearchQuery || '').toLowerCase().trim();
    return (participants || []).map(p => {
      const rawAss = currentAssessments[p.id] || {
        participantId: p.id,
        afektif: 100,
        kognitif: 75,
        psikomotorik: 50,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      const computed = calculateAssessment(rawAss, sessId);
      return {
        ...p,
        assessment: rawAss,
        computed
      };
    }).filter(p => {
      if (!q) return true;
      return p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.instansi && p.instansi.toLowerCase().includes(q)) ||
        (p.qrToken && p.qrToken.toLowerCase().includes(q));
    });
  }, [participants, currentAssessments, sessionGradingModal, penilaianSearchQuery]);

  // Handler: Quick Add Violation (Pengurangan Nilai Afektif)
  const handleQuickAddViolation = (participant, sessionObj, ruleItem, points, symbol) => {
    if (!hasAssessmentAccess) {
      triggerAccessDenied('Penilaian & Evaluasi Peserta', 'Fitur pengurangan/penilaian nilai afektif peserta terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
      return;
    }
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const sessId = sessionObj?.id || 'SES-01';
    const newVio = {
      id: `VIO-${participant.id}-${Date.now()}`,
      sessionId: sessId,
      sessionTitle: sessionObj?.title || 'Sesi Pelatihan',
      item: ruleItem,
      points: points,
      symbol: symbol,
      timestamp: `${new Date().toLocaleDateString('id-ID')} ${nowTime}`,
      note: ''
    };

    updateAssessments(prev => {
      const current = prev[participant.id] || {
        participantId: participant.id,
        kognitif: 75,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      const allVios = [newVio, ...(current.violations || [])];
      const sessVios = allVios.filter(v => v.sessionId === sessId || String(v.sessionId) === String(sessId));
      const sessVioPts = sessVios.reduce((acc, v) => acc + Math.abs(v.points || 0), 0);
      const newSessAfektif = Math.max(0, 100 - sessVioPts);

      const curSessions = current.sessions || {};
      const curSessData = curSessions[sessId] || {};

      const updatedAss = {
        ...current,
        violations: allVios,
        sessions: {
          ...curSessions,
          [sessId]: {
            ...curSessData,
            afektif: newSessAfektif,
            kognitif: curSessData.kognitif !== undefined ? curSessData.kognitif : 75,
            psikomotorik: curSessData.psikomotorik !== undefined ? curSessData.psikomotorik : 50,
          }
        }
      };
      saveAssessmentDebounced(participant.id, updatedAss, sessId);
      return {
        ...prev,
        [participant.id]: updatedAss
      };
    });

    showNotification(`Pengurangan -${points} Poin (${symbol} ${ruleItem}) dicatat untuk ${participant.name}.`);
    setViolationPickerModal(null);
    setAttitudePickerModal(null);
  };

  // Handler: Quick Add Contribution (Penambahan Nilai Psikomotorik - Sikap Kesadaran & Inisiatif)
  const handleQuickAddContribution = (participant, sessionObj, ruleItem, points, symbol) => {
    if (!hasAssessmentAccess) {
      triggerAccessDenied('Penilaian & Evaluasi Peserta', 'Fitur penambahan/penilaian nilai psikomotorik peserta terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
      return;
    }
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const sessId = sessionObj?.id || 'SES-01';
    const newCon = {
      id: `CON-${participant.id}-${Date.now()}`,
      sessionId: sessId,
      sessionTitle: sessionObj?.title || 'Sesi Pelatihan',
      item: ruleItem,
      points: points,
      symbol: symbol,
      timestamp: `${new Date().toLocaleDateString('id-ID')} ${nowTime}`,
      note: ''
    };

    updateAssessments(prev => {
      const current = prev[participant.id] || {
        participantId: participant.id,
        kognitif: 75,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      const allCons = [newCon, ...(current.contributions || [])];
      const sessCons = allCons.filter(c => c.sessionId === sessId || String(c.sessionId) === String(sessId));
      const sessConPts = sessCons.reduce((acc, c) => acc + Math.abs(c.points || 0), 0);
      const newSessPsiko = Math.min(100, 50 + sessConPts);

      const curSessions = current.sessions || {};
      const curSessData = curSessions[sessId] || {};

      const updatedAss = {
        ...current,
        contributions: allCons,
        sessions: {
          ...curSessions,
          [sessId]: {
            ...curSessData,
            afektif: curSessData.afektif !== undefined ? curSessData.afektif : 100,
            kognitif: curSessData.kognitif !== undefined ? curSessData.kognitif : 75,
            psikomotorik: newSessPsiko,
          }
        }
      };
      saveAssessmentDebounced(participant.id, updatedAss, sessId);
      return {
        ...prev,
        [participant.id]: updatedAss
      };
    });

    showNotification(`Penambahan +${points} Poin (${symbol} ${ruleItem}) dicatat untuk ${participant.name}.`);
    setContributionPickerModal(null);
    setAttitudePickerModal(null);
  };

  // Handler: Quick Add Kognitif (Bentuk Sikap Ditanya Pemateri / Interaksi Forum)
  const handleQuickAddKognitif = (participant, sessionObj, ruleItem, points, symbol, type = 'bonus') => {
    if (!hasAssessmentAccess) {
      triggerAccessDenied('Penilaian & Evaluasi Peserta', 'Fitur pencatatan respon kognitif peserta terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
      return;
    }
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const sessId = sessionObj?.id || 'SES-01';
    const newKog = {
      id: `KOG-${participant.id}-${Date.now()}`,
      sessionId: sessId,
      sessionTitle: sessionObj?.title || 'Sesi Pelatihan',
      item: ruleItem,
      points: points,
      symbol: symbol,
      type: type,
      timestamp: `${new Date().toLocaleDateString('id-ID')} ${nowTime}`,
      note: ''
    };

    updateAssessments(prev => {
      const current = prev[participant.id] || {
        participantId: participant.id,
        kognitif: 75,
        violations: [],
        contributions: [],
        kognitifLogs: [],
        qualitativeNote: ''
      };
      const allKogs = [newKog, ...(current.kognitifLogs || [])];
      const curSessions = current.sessions || {};
      const curSessData = curSessions[sessId] || {};
      const prevKog = curSessData.kognitif !== undefined ? Number(curSessData.kognitif) : 75;
      const delta = type === 'deduction' ? -Math.abs(points) : Math.abs(points);
      const newSessKog = Math.max(0, Math.min(100, prevKog + delta));

      const updatedAss = {
        ...current,
        kognitifLogs: allKogs,
        sessions: {
          ...curSessions,
          [sessId]: {
            ...curSessData,
            afektif: curSessData.afektif !== undefined ? curSessData.afektif : 100,
            kognitif: newSessKog,
            psikomotorik: curSessData.psikomotorik !== undefined ? curSessData.psikomotorik : 50,
          }
        }
      };
      saveAssessmentDebounced(participant.id, updatedAss, sessId);
      return {
        ...prev,
        [participant.id]: updatedAss
      };
    });

    const prefix = type === 'deduction' ? `Pengurangan -${points}` : `Penambahan +${points}`;
    showNotification(`${prefix} Poin Kognitif (${symbol} ${ruleItem}) dicatat untuk ${participant.name}.`);
    setKognitifPickerModal(null);
    setAttitudePickerModal(null);
    setViolationPickerModal(null);
    setContributionPickerModal(null);
  };

  // Handler: Undo Last Violation (Mendukung Pembatalan Khusus Sesi Tertentu)
  const handleUndoViolation = (participantId, participantName, sessionId = null) => {
    if (!hasAssessmentAccess) {
      triggerAccessDenied('Penilaian & Evaluasi Peserta', 'Fitur pembatalan pelanggaran terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
      return;
    }
    updateAssessments(prev => {
      const current = prev[participantId];
      if (!current) return prev;
      const rawVios = current.violations;
      const currentVios = Array.isArray(rawVios) ? rawVios : (rawVios && typeof rawVios === 'object' ? Object.values(rawVios).filter(v => v && typeof v === 'object' && ('points' in v || 'item' in v)) : []);
      if (currentVios.length === 0) return prev;
      
      let rest = [];
      let removed = null;
      if (sessionId) {
        const targetIdx = currentVios.findIndex(v => v.sessionId === sessionId || String(v.sessionId) === String(sessionId));
        if (targetIdx !== -1) {
          removed = currentVios[targetIdx];
          rest = [...currentVios.slice(0, targetIdx), ...currentVios.slice(targetIdx + 1)];
        } else {
          return prev;
        }
      } else {
        [removed, ...rest] = currentVios;
      }
      
      showNotification(`Pelanggaran terakhir ("${removed.item}") dibatalkan untuk ${participantName}.`);
      
      let curSessions = current.sessions || {};
      if (sessionId) {
        const remainingSessVios = rest.filter(v => v.sessionId === sessionId || String(v.sessionId) === String(sessionId));
        const remPts = remainingSessVios.reduce((acc, v) => acc + Math.abs(Number(v.points) || 0), 0);
        const curSessData = curSessions[sessionId] || {};
        curSessions = {
          ...curSessions,
          [sessionId]: {
            ...curSessData,
            afektif: Math.max(0, 100 - remPts)
          }
        };
      }

      const updatedAss = {
        ...current,
        violations: rest,
        sessions: curSessions
      };
      saveAssessmentDebounced(participantId, updatedAss, sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
  };

  // Handler: Undo Last Contribution (Mendukung Pembatalan Khusus Sesi Tertentu)
  const handleUndoContribution = (participantId, participantName, sessionId = null) => {
    if (!hasAssessmentAccess) {
      triggerAccessDenied('Penilaian & Evaluasi Peserta', 'Fitur pembatalan keaktifan terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
      return;
    }
    updateAssessments(prev => {
      const current = prev[participantId];
      if (!current) return prev;
      const rawCons = current.contributions;
      const currentCons = Array.isArray(rawCons) ? rawCons : (Array.isArray(rawCons?.contributions) ? rawCons.contributions : (rawCons && typeof rawCons === 'object' ? Object.values(rawCons).filter(c => c && typeof c === 'object' && ('points' in c || 'item' in c)) : []));
      if (currentCons.length === 0) return prev;
      
      let rest = [];
      let removed = null;
      if (sessionId) {
        const targetIdx = currentCons.findIndex(c => c.sessionId === sessionId || String(c.sessionId) === String(sessionId));
        if (targetIdx !== -1) {
          removed = currentCons[targetIdx];
          rest = [...currentCons.slice(0, targetIdx), ...currentCons.slice(targetIdx + 1)];
        } else {
          return prev;
        }
      } else {
        [removed, ...rest] = currentCons;
      }
      
      showNotification(`Poin keaktifan ("${removed.item}") dibatalkan untuk ${participantName}.`);
      
      let curSessions = current.sessions || {};
      if (sessionId) {
        const remainingSessCons = rest.filter(c => c.sessionId === sessionId || String(c.sessionId) === String(sessionId));
        const remPts = remainingSessCons.reduce((acc, c) => acc + Math.abs(Number(c.points) || 0), 0);
        const curSessData = curSessions[sessionId] || {};
        curSessions = {
          ...curSessions,
          [sessionId]: {
            ...curSessData,
            psikomotorik: Math.min(100, 50 + remPts)
          }
        };
      }

      const updatedAss = {
        ...current,
        contributions: rest,
        sessions: curSessions
      };
      saveAssessmentDebounced(participantId, updatedAss, sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
  };

  // Handler: Undo Last Kognitif (Mendukung Pembatalan / Pengurangan Sesi Tertentu)
  const handleUndoKognitif = (participantId, participantName, sessionId = null) => {
    if (!hasAssessmentAccess) {
      triggerAccessDenied('Penilaian & Evaluasi Peserta', 'Fitur pembatalan kognitif terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
      return;
    }
    updateAssessments(prev => {
      const current = prev[participantId];
      if (!current) return prev;

      const curLogs = current.kognitifLogs || [];
      let rest = [];
      let removed = null;

      if (sessionId) {
        const targetIdx = curLogs.findIndex(k => k.sessionId === sessionId || String(k.sessionId) === String(sessionId));
        if (targetIdx !== -1) {
          removed = curLogs[targetIdx];
          rest = [...curLogs.slice(0, targetIdx), ...curLogs.slice(targetIdx + 1)];
        }
      } else if (curLogs.length > 0) {
        [removed, ...rest] = curLogs;
      }

      let curSessions = current.sessions || {};
      const curSessData = (sessionId ? curSessions[sessionId] : null) || {};
      const prevKog = curSessData.kognitif !== undefined ? Number(curSessData.kognitif) : (current.kognitif !== undefined ? Number(current.kognitif) : 75);

      let newSessKog = 75;
      if (removed) {
        const delta = removed.type === 'deduction' ? -Math.abs(removed.points) : Math.abs(removed.points);
        newSessKog = Math.max(0, Math.min(100, prevKog - delta));
        showNotification(`Aksi kognitif terakhir ("${removed.item}") dibatalkan untuk ${participantName}.`);
      } else {
        const deductAmount = prevKog > 75 ? 2 : 1;
        newSessKog = Math.max(0, prevKog - deductAmount);
        showNotification(`Nilai kognitif ${participantName} dikurangi (-${deductAmount}).`);
      }

      if (sessionId) {
        curSessions = {
          ...curSessions,
          [sessionId]: {
            ...curSessData,
            kognitif: newSessKog
          }
        };
      }

      const updatedAss = {
        ...current,
        kognitifLogs: rest,
        sessions: curSessions
      };
      saveAssessmentDebounced(participantId, updatedAss, sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
  };

  // Handler: Remove Specific Violation
  const handleRemoveViolationItem = (participantId, violationId) => {
    updateAssessments(prev => {
      const current = prev[participantId];
      if (!current) return prev;
      const rawVios = current.violations;
      const currentVios = Array.isArray(rawVios) ? rawVios : (rawVios && typeof rawVios === 'object' ? Object.values(rawVios).filter(v => v && typeof v === 'object' && ('points' in v || 'item' in v)) : []);
      const targetVio = currentVios.find(v => v.id === violationId);
      const updatedAss = {
        ...current,
        violations: currentVios.filter(v => v.id !== violationId)
      };
      saveAssessmentDebounced(participantId, updatedAss, targetVio?.sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
    showNotification('Item pelanggaran berhasil dihapus.');
  };

  // Handler: Remove Specific Contribution
  const handleRemoveContributionItem = (participantId, contributionId) => {
    updateAssessments(prev => {
      const current = prev[participantId];
      if (!current) return prev;
      const rawCons = current.contributions;
      const currentCons = Array.isArray(rawCons) ? rawCons : (Array.isArray(rawCons?.contributions) ? rawCons.contributions : (rawCons && typeof rawCons === 'object' ? Object.values(rawCons).filter(c => c && typeof c === 'object' && ('points' in c || 'item' in c)) : []));
      const targetCon = currentCons.find(c => c.id === contributionId);
      const updatedAss = {
        ...current,
        contributions: currentCons.filter(c => c.id !== contributionId)
      };
      saveAssessmentDebounced(participantId, updatedAss, targetCon?.sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
    showNotification('Item keaktifan berhasil dihapus.');
  };

  // Handler: Set Kognitif Score (Mendukung Sesi Spesifik atau Global)
  const handleSetKognitifScore = (participantId, score, sessionId = null) => {
    const validScore = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        kognitif: 75,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      
      let updatedAss = { ...current };
      if (sessionId) {
        const currentSessions = current.sessions || {};
        const sessData = currentSessions[sessionId] || { kognitif: 75 };
        updatedAss = {
          ...current,
          sessions: {
            ...currentSessions,
            [sessionId]: {
              ...sessData,
              kognitif: validScore
            }
          }
        };
      } else {
        updatedAss = {
          ...current,
          kognitif: validScore
        };
      }
      saveAssessmentDebounced(participantId, updatedAss, sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
  };

  // Handler aliases for consistency across components
  const handleDeleteViolation = handleRemoveViolationItem;
  const handleDeleteContribution = handleRemoveContributionItem;
  const handleUpdateKognitifScore = handleSetKognitifScore;

  // Handler: Adjust Kognitif Score with Delta (Mendukung Sesi Spesifik)
  const handleAdjustKognitifScore = (participantId, delta, sessionId = null) => {
    if (!hasAssessmentAccess) {
      triggerAccessDenied('Penilaian & Evaluasi Peserta', 'Fitur pengubahan nilai kognitif peserta terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
      return;
    }
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        kognitif: 75,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      
      let currentKog = current.kognitif || 75;
      if (sessionId && current.sessions?.[sessionId]?.kognitif !== undefined) {
        currentKog = current.sessions[sessionId].kognitif;
      }
      const newScore = Math.min(100, Math.max(0, currentKog + delta));

      let updatedAss = { ...current };
      if (sessionId) {
        const currentSessions = current.sessions || {};
        const sessData = currentSessions[sessionId] || { kognitif: 75 };
        updatedAss = {
          ...current,
          sessions: {
            ...currentSessions,
            [sessionId]: {
              ...sessData,
              kognitif: newScore
            }
          }
        };
      } else {
        updatedAss = {
          ...current,
          kognitif: newScore
        };
      }
      saveAssessmentDebounced(participantId, updatedAss, sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
  };

  // Handler: Set Afektif Score (Mendukung Sesi Spesifik atau Global)
  const handleSetAfektifScore = (participantId, score, sessionId = null) => {
    const validScore = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        afektif: 100,
        kognitif: 75,
        psikomotorik: 50,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      
      let updatedAss = { ...current };
      if (sessionId) {
        const currentSessions = current.sessions || {};
        const sessData = currentSessions[sessionId] || { afektif: 100 };
        updatedAss = {
          ...current,
          sessions: {
            ...currentSessions,
            [sessionId]: {
              ...sessData,
              afektif: validScore
            }
          }
        };
      } else {
        updatedAss = {
          ...current,
          afektif: validScore
        };
      }
      saveAssessmentDebounced(participantId, updatedAss, sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
  };

  // Handler: Adjust Afektif Score with Delta
  const handleAdjustAfektifScore = (participantId, delta, sessionId = null) => {
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        afektif: 100,
        kognitif: 75,
        psikomotorik: 50,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      
      let currentScore = current.afektif !== undefined ? current.afektif : 100;
      if (sessionId && current.sessions?.[sessionId]?.afektif !== undefined) {
        currentScore = current.sessions[sessionId].afektif;
      }
      const newScore = Math.min(100, Math.max(0, currentScore + delta));

      let updatedAss = { ...current };
      if (sessionId) {
        const currentSessions = current.sessions || {};
        const sessData = currentSessions[sessionId] || { afektif: 100 };
        updatedAss = {
          ...current,
          sessions: {
            ...currentSessions,
            [sessionId]: {
              ...sessData,
              afektif: newScore
            }
          }
        };
      } else {
        updatedAss = {
          ...current,
          afektif: newScore
        };
      }
      saveAssessmentDebounced(participantId, updatedAss, sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
  };

  // Handler: Set Psikomotorik Score (Mendukung Sesi Spesifik atau Global)
  const handleSetPsikomotorikScore = (participantId, score, sessionId = null) => {
    const validScore = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        afektif: 100,
        kognitif: 75,
        psikomotorik: 50,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      
      let updatedAss = { ...current };
      if (sessionId) {
        const currentSessions = current.sessions || {};
        const sessData = currentSessions[sessionId] || { psikomotorik: 50 };
        updatedAss = {
          ...current,
          sessions: {
            ...currentSessions,
            [sessionId]: {
              ...sessData,
              psikomotorik: validScore
            }
          }
        };
      } else {
        updatedAss = {
          ...current,
          psikomotorik: validScore
        };
      }
      saveAssessmentDebounced(participantId, updatedAss, sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
  };

  // Handler: Adjust Psikomotorik Score with Delta
  const handleAdjustPsikomotorikScore = (participantId, delta, sessionId = null) => {
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        afektif: 100,
        kognitif: 75,
        psikomotorik: 50,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      
      let currentScore = current.psikomotorik !== undefined ? current.psikomotorik : 50;
      if (sessionId && current.sessions?.[sessionId]?.psikomotorik !== undefined) {
        currentScore = current.sessions[sessionId].psikomotorik;
      }
      const newScore = Math.min(100, Math.max(0, currentScore + delta));

      let updatedAss = { ...current };
      if (sessionId) {
        const currentSessions = current.sessions || {};
        const sessData = currentSessions[sessionId] || { psikomotorik: 50 };
        updatedAss = {
          ...current,
          sessions: {
            ...currentSessions,
            [sessionId]: {
              ...sessData,
              psikomotorik: newScore
            }
          }
        };
      } else {
        updatedAss = {
          ...current,
          psikomotorik: newScore
        };
      }
      saveAssessmentDebounced(participantId, updatedAss, sessionId);
      return {
        ...prev,
        [participantId]: updatedAss
      };
    });
  };


  // Handler: Save Qualitative Note (Mendukung Sesi & Auto-save ke Backend)
  const handleSaveQualitativeNote = (participantId, note, sessionId = null) => {
    if (!hasAssessmentAccess) {
      triggerAccessDenied('Penilaian & Evaluasi Peserta', 'Fitur penyimpanan catatan kualitatif terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
      return;
    }
    let targetAss = null;
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        kognitif: 75,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      targetAss = {
        ...current,
        notes: note,
        qualitativeNote: note
      };
      if (sessionId) {
        const currentSessions = current.sessions || {};
        const sessData = currentSessions[sessionId] || {};
        targetAss.sessions = {
          ...currentSessions,
          [sessionId]: {
            ...sessData,
            notes: note
          }
        };
      }
      saveAssessmentDebounced(participantId, targetAss, sessionId);
      return {
        ...prev,
        [participantId]: targetAss
      };
    });

    showNotification('Catatan kualitatif pemandu berhasil disimpan ke database!');
  };

  // MODAL TERPISAH PER NILAI: AFEKTIF SENDIRI, KOGNITIF SENDIRI, PSIKOMOTORIK SENDIRI
  const renderUnifiedAttitudeModal = () => {
    const target = attitudePickerModal || violationPickerModal || contributionPickerModal || kognitifPickerModal;
    if (!target) return null;

    const participant = target.participant;
    const session = target.session || sessionGradingModal?.session || penilaianModalSession || training?.sessions?.[0];
    
    // Tentukan domain aktif secara eksklusif:
    let domain = 'afektif';
    if (violationPickerModal || target.initialTab === 'afektif') {
      domain = 'afektif';
    } else if (kognitifPickerModal || target.initialTab === 'kognitif') {
      domain = 'kognitif';
    } else if (contributionPickerModal || target.initialTab === 'psikomotorik') {
      domain = 'psikomotorik';
    } else if (attitudePickerModal) {
      domain = attitudeModalTab || 'afektif';
    }

    const handleClose = () => {
      setAttitudePickerModal(null);
      setViolationPickerModal(null);
      setContributionPickerModal(null);
      setKognitifPickerModal(null);
    };

    const currentAss = currentAssessments[participant?.id] || {};
    const sessAssessment = calculateAssessment(currentAss, session?.id);

    return (
      <div 
        onClick={handleClose}
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-2.5 sm:p-4 pb-[84px] sm:pb-4 overflow-y-auto"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-3.5 sm:p-5 space-y-3 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 max-h-[calc(100dvh-100px)] sm:max-h-[88dvh] overflow-y-auto"
        >
          {/* Header Spesifik Per-Nilai */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 ${
                domain === 'afektif' ? 'bg-rose-100 text-rose-800' : domain === 'kognitif' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'
              }`}>
                {domain === 'afektif' ? (
                  <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-700" />
                ) : domain === 'kognitif' ? (
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                ) : (
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                    {domain === 'afektif' && 'Penilaian Afektif (50%)'}
                    {domain === 'kognitif' && 'Penilaian Kognitif (30%)'}
                    {domain === 'psikomotorik' && 'Penilaian Psikomotorik (20%)'}
                  </h3>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border shrink-0 ${
                    domain === 'afektif' ? 'bg-rose-50 text-rose-700 border-rose-200' : domain === 'kognitif' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-teal-50 text-teal-700 border-teal-200'
                  }`}>
                    {domain === 'afektif' && 'Kurang Poin'}
                    {domain === 'kognitif' && 'Respon & Forum'}
                    {domain === 'psikomotorik' && 'Tambah Poin'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                  Peserta: <strong className="text-slate-800">{participant?.name}</strong> • {session?.title || 'Sesi Pelatihan'}
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={handleClose} 
              className="p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* 1. DOMAIN AFEKTIF SENDIRI (Pelanggaran & Kedisiplinan) */}
          {domain === 'afektif' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                  Pilih Jenis Pelanggaran Tata Tertib
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Modal Awal: 100 Poin</span>
              </div>
              <div className="space-y-2">
                {AFEKTIF_RULES.map((rule) => (
                  <div key={rule.level} className="p-2.5 rounded-xl bg-rose-50/40 border border-rose-100/90 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-800">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-rose-100 text-rose-700 font-mono flex items-center justify-center text-[9px] sm:text-[10px] font-bold">
                          {rule.symbol}
                        </span>
                        <span>{rule.label} (-{rule.points} Poin)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {rule.items.map((item, iIdx) => (
                        <button
                          key={iIdx}
                          type="button"
                          onClick={() => handleQuickAddViolation(participant, session, item, rule.points, rule.symbol)}
                          className="p-2 sm:p-2.5 rounded-lg bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-900 border border-slate-200 hover:border-rose-300 text-[11px] sm:text-xs font-semibold text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                        >
                          <span className="truncate mr-1">{item}</span>
                          <span className="text-[9px] sm:text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">-{rule.points}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. DOMAIN KOGNITIF SENDIRI (Respon Tanya Jawab & Keaktifan Forum) */}
          {domain === 'kognitif' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                  Pilihan Rubrik Interaksi Kognitif
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Tambah / Kurang Poin</span>
              </div>
              <div className="space-y-2">
                {KOGNITIF_RULES.map((rule, rIdx) => {
                  const isDeduction = rule.type === 'deduction';
                  return (
                    <div key={rIdx} className="p-2.5 rounded-xl bg-blue-50/40 border border-blue-100/90 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-800">
                        <span className="flex items-center space-x-1.5">
                          <span className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md font-mono flex items-center justify-center text-[9px] sm:text-[10px] font-bold ${
                            isDeduction ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {rule.symbol}
                          </span>
                          <span>{rule.label} ({isDeduction ? `-${rule.points}` : `+${rule.points}`} Poin)</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {rule.items.map((item, iIdx) => (
                          <button
                            key={iIdx}
                            type="button"
                            onClick={() => handleQuickAddKognitif(participant, session, item, rule.points, rule.symbol, rule.type)}
                            className="p-2 sm:p-2.5 rounded-lg bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-900 border border-slate-200 hover:border-blue-300 text-[11px] sm:text-xs font-semibold text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                          >
                            <span className="truncate mr-1">{item}</span>
                            <span className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                              isDeduction ? 'text-amber-700 bg-amber-50' : 'text-blue-600 bg-blue-50'
                            }`}>
                              {isDeduction ? `-${rule.points}` : `+${rule.points}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. DOMAIN PSIKOMOTORIK SENDIRI (Sikap Kesadaran & Inisiatif Aksi) */}
          {domain === 'psikomotorik' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                  Pilih Rubrik Keaktifan & Inisiatif Nyata
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Modal Awal: 50 Poin (Tambah Poin)</span>
              </div>
              <div className="space-y-2">
                {PSIKOMOTORIK_RULES.map((rule, rIdx) => (
                  <div key={rIdx} className="p-2.5 rounded-xl bg-teal-50/40 border border-teal-100/90 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-800">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-teal-100 text-teal-700 font-mono flex items-center justify-center text-[9px] sm:text-[10px] font-bold">
                          {rule.symbol}
                        </span>
                        <span>{rule.label} (+{rule.points} Poin)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {rule.items.map((item, iIdx) => (
                        <button
                          key={iIdx}
                          type="button"
                          onClick={() => handleQuickAddContribution(participant, session, item, rule.points, rule.symbol)}
                          className="p-2 sm:p-2.5 rounded-lg bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-[11px] sm:text-xs font-semibold text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                        >
                          <span className="truncate mr-1">{item}</span>
                          <span className="text-[9px] sm:text-[10px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded shrink-0">+{rule.points}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  // Handler: Export Rekap Penilaian to Excel (Mendukung Ekspor Sesi & Master Rekap Semua Sesi)
  const handleExportPenilaianExcel = (sessionObj = null) => {
    const eventTitle = training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung 2026';
    const isPerSession = Boolean(sessionObj && sessionObj !== 'ALL');
    const sessionLabel = isPerSession ? `Sesi: ${sessionObj.title}` : 'Master Rekapitulasi Seluruh Sesi Pelatihan';
    const nowStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const allSessions = training?.sessions || [];

    // Calculate assessment for each participant based on export mode
    const exportParticipants = (participants || []).map(p => {
      const rawAss = currentAssessments[p.id] || { participantId: p.id };
      const computed = isPerSession 
        ? calculateAssessment(rawAss, sessionObj.id) 
        : calculateAssessment(rawAss);
      
      // Breakdown per sesi jika master rekap
      const sessionBreakdowns = isPerSession ? [] : allSessions.map(s => {
        return {
          session: s,
          computed: calculateAssessment(rawAss, s.id)
        };
      });

      return {
        ...p,
        computed,
        sessionBreakdowns
      };
    });

    // Perhitungan lebar kolom otomatis (autofit)
    const maxNameLen = exportParticipants.reduce((max, p) => Math.max(max, (p.name || '').length), 14);
    const maxInstansiLen = exportParticipants.reduce((max, p) => Math.max(max, (p.instansi || '-').length), 16);
    const colNameW = Math.max(220, Math.ceil(maxNameLen * 9.5) + 30);
    const colInstansiW = Math.max(220, Math.ceil(maxInstansiLen * 9.5) + 30);

    const wb = XLSX.utils.book_new();
    const rows = [
      ['TATA CARA PENILAIAN PESERTA LATIHAN KADER I (BASIC TRAINING)'],
      [sessionLabel.toUpperCase()],
      [`Event: ${eventTitle} • Waktu Ekspor: ${nowStr}`],
      []
    ];

    let headerRow = [];
    if (isPerSession) {
      headerRow = [
        'No', 'Nama Peserta', 'Asal Komisariat',
        'Afektif (50%)', 'Kognitif (30%)', 'Psikomotorik (20%)',
        'Nilai Akhir (NA)', 'Predikat & Status', 'Pelanggaran Sesi', 'Keaktifan Sesi'
      ];
    } else {
      headerRow = [
        'No', 'Nama Peserta', 'Asal Komisariat',
        ...allSessions.map((s, idx) => `Sesi ${idx + 1}: ${s.title?.slice(0, 15) || 'Materi'}`),
        'Afektif (50%)', 'Kognitif (30%)', 'Psikomotorik (20%)',
        'Nilai Akhir (NA)', 'Predikat & Kelulusan'
      ];
    }
    rows.push(headerRow);

    exportParticipants.forEach((p, idx) => {
      const { afektif, kognitif, psikomotorik, finalScore, predicate, status, violations, contributions } = p.computed;
      if (isPerSession) {
        const vioText = (violations || []).map(v => `[${v.symbol}] ${v.item} (-${v.points})`).join('; ') || '-';
        const conText = (contributions || []).map(c => `[${c.symbol}] ${c.item} (+${c.points})`).join('; ') || '-';
        rows.push([
          idx + 1,
          p.name || '-',
          p.instansi || '-',
          afektif,
          kognitif,
          psikomotorik,
          finalScore,
          `${status} (${predicate})`,
          vioText,
          conText
        ]);
      } else {
        const sessionScores = p.sessionBreakdowns.map(sb => sb.computed.finalScore);
        rows.push([
          idx + 1,
          p.name || '-',
          p.instansi || '-',
          ...sessionScores,
          afektif,
          kognitif,
          psikomotorik,
          finalScore,
          `${status} (${predicate})`
        ]);
      }
    });

    rows.push([]);
    rows.push([
      'Rumus Penilaian: NA = (Afektif x 50%) + (Kognitif x 30%) + (Psikomotorik x 20%) | Standar Lulus: NA >= 70.0'
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const totalCols = headerRow.length;

    // Lebar kolom
    ws['!cols'] = [
      { wch: 7 },
      { wch: Math.max(26, colNameW / 9.5) },
      { wch: Math.max(26, colInstansiW / 9.5) },
      ...Array(totalCols - 3).fill({ wch: 18 })
    ];

    // Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
      { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: totalCols - 1 } }
    ];

    // Styles
    ws['A1'].s = EXCEL_STYLES.title;
    ws['A2'].s = EXCEL_STYLES.subtitle;
    ws['A3'].s = EXCEL_STYLES.meta;

    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: 4, c });
      if (ws[addr]) ws[addr].s = EXCEL_STYLES.headerMain;
    }

    exportParticipants.forEach((p, idx) => {
      const r = idx + 5;
      const aNo = XLSX.utils.encode_cell({ r, c: 0 });
      const aName = XLSX.utils.encode_cell({ r, c: 1 });
      const aInstansi = XLSX.utils.encode_cell({ r, c: 2 });
      if (ws[aNo]) ws[aNo].s = EXCEL_STYLES.cellCenter;
      if (ws[aName]) ws[aName].s = EXCEL_STYLES.cellBold;
      if (ws[aInstansi]) ws[aInstansi].s = EXCEL_STYLES.cellNormal;

      for (let c = 3; c < totalCols - 2; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) ws[addr].s = EXCEL_STYLES.cellCenter;
      }

      const aScore = XLSX.utils.encode_cell({ r, c: totalCols - 2 });
      const aStat = XLSX.utils.encode_cell({ r, c: totalCols - 1 });
      if (ws[aScore]) ws[aScore].s = EXCEL_STYLES.cellTotal;
      if (ws[aStat]) {
        const isPass = String(ws[aStat].v || '').includes('Lulus') || String(ws[aStat].v || '').includes('Baik');
        ws[aStat].s = isPass ? EXCEL_STYLES.statusHadir : EXCEL_STYLES.statusIzin;
      }
    });

    const sheetName = isPerSession ? (sessionObj.id || 'Penilaian Sesi') : 'Master Rekap';
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));

    const fileName = isPerSession 
      ? `Rekap_Penilaian_${sessionObj.id}_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Master_Rekap_Penilaian_Peserta_LK1_${new Date().toISOString().slice(0, 10)}.xlsx`;

    downloadWorkbook(wb, fileName);
    showNotification(`File Excel XLSX ${isPerSession ? `Sesi (${sessionObj.title})` : 'Master Rekap Seluruh Sesi'} berhasil diekspor!`);
  };

  const handleOpenScanner = (session) => {
    if (!hasAttendanceAccess) {
      triggerAccessDenied('Scan QR Presensi Peserta', 'Fitur pemindaian QR Code kehadiran peserta terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
      return;
    }
    setSelectedSession(session);
    setScanResult(null);
    setIsScannerOpen(true);
  };

  const processSimulatedScan = async (e) => {
    e.preventDefault();
    if (!simulatedTokenInput.trim()) return;

    if (!hasAttendanceAccess) {
      triggerAccessDenied('Scan Presensi Peserta', 'Fitur input presensi terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
      return;
    }

    const sessionsList = training?.sessions || [];
    const targetSession = (fastTokenSessionId && sessionsList.find(s => s.id === fastTokenSessionId || s.db_id === fastTokenSessionId))
      || selectedSession
      || sessionsList[0];

    if (!targetSession) {
      setScanResult({
        type: 'error',
        msg: 'Belum ada sesi pelatihan yang tersedia untuk dicatat presensinya.'
      });
      return;
    }

    const token = simulatedTokenInput.trim();
    const foundUser = participants.find(p => {
      const pToken = (p.qrToken || p.user_qr_token || '').trim();
      return pToken === token || 
             (token && pToken.endsWith(`-${token}`)) ||
             (p.id && String(p.id) === token) ||
             (p.db_id && String(p.db_id) === token);
    });

    setIsVerifyingFastToken(true);
    const targetSessionId = targetSession.db_id || targetSession.id;
    const res = await api.scanAttendance(token, targetSessionId, foundUser, { source: 'barcode_gun' });
    setIsVerifyingFastToken(false);

    if (res.status === 'error' || (!res.ok && res.status !== 'warning')) {
      setScanResult({
        type: 'error',
        msg: res.message || `Token QR (${token}) tidak terdaftar dalam database peserta!`
      });
      return;
    }

    if (res.status === 'warning') {
      setScanResult({
        type: 'warning',
        msg: res.message || `${foundUser?.name || 'Peserta'} sudah tercatat presensi sebelumnya pada sesi ini.`,
        user: res.user || foundUser
      });
      return;
    }

    const nowTime = res.scanned_at || (new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
    const userToRecord = res.user || foundUser || { name: 'Peserta', email: '-' };

    const updatedParticipants = participants.map(p => {
      const isMatch = (userToRecord.id && (p.id === userToRecord.id || p.db_id === userToRecord.id || p.id === `USR-${userToRecord.id}`)) ||
                      (p.qrToken && p.qrToken.trim() === token) ||
                      (p.user_qr_token && p.user_qr_token.trim() === token) ||
                      (userToRecord.email && p.email && p.email.toLowerCase() === userToRecord.email.toLowerCase());

      if (isMatch) {
        return {
          ...p,
          status: 'Hadir',
          attendances: {
            ...p.attendances,
            [targetSession.id]: { present: true, time: nowTime, status: 'present' },
            ...(targetSession.db_id ? { [targetSession.db_id]: { present: true, time: nowTime, status: 'present' } } : {})
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    setSimulatedTokenInput('');

    setScanResult({
      type: 'success',
      msg: `PRESENSI BERHASIL! ${userToRecord.name} terdaftar hadir di ${targetSession.title}`,
      user: userToRecord,
      time: nowTime
    });
  };

  const handleSubmitManualAttendance = async (e) => {
    e?.preventDefault();
    if (!manualAttendanceSession) return;

    if (!hasAttendanceAccess) {
      triggerAccessDenied('Presensi Manual Sesi', 'Fitur input presensi manual peserta terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
      return;
    }

    let tokenToVerify = manualAttendanceToken.trim();
    let targetUser = null;

    if (manualAttendanceTab === 'picker' && manualAttendanceSelectedParticipantId) {
      targetUser = participants.find(p => 
        String(p.id) === String(manualAttendanceSelectedParticipantId) || 
        String(p.db_id) === String(manualAttendanceSelectedParticipantId)
      );
      if (targetUser) {
        tokenToVerify = targetUser.qrToken || targetUser.user_qr_token;
      }
    } else if (tokenToVerify) {
      targetUser = participants.find(p => {
        const pToken = (p.qrToken || p.user_qr_token || '').trim();
        return pToken === tokenToVerify || 
               (tokenToVerify && pToken.endsWith(`-${tokenToVerify}`)) ||
               (p.id && String(p.id) === tokenToVerify) ||
               (p.db_id && String(p.db_id) === tokenToVerify);
      });
    }

    if (!tokenToVerify) {
      setManualAttendanceFeedback({
        type: 'error',
        msg: 'Silakan ketik Kode Token QR atau pilih nama peserta dari daftar!'
      });
      return;
    }

    setIsSubmittingManualAttendance(true);
    setManualAttendanceFeedback(null);

    const targetSessionId = manualAttendanceSession.db_id || manualAttendanceSession.id;
    let res;

    if (manualAttendanceStatus === 'present') {
      res = await api.scanAttendance(tokenToVerify, targetSessionId, targetUser, { source: 'manual_admin' });
    } else {
      res = await api.setAttendanceStatus({
        user_id: targetUser?.db_id || targetUser?.id,
        training_session_id: targetSessionId,
        status: manualAttendanceStatus,
        note: manualAttendanceStatus === 'permission' ? (manualAttendanceNote || 'Izin / Berhalangan') : 'Tidak Hadir / Alpa',
        source: 'manual_admin'
      });
    }
    setIsSubmittingManualAttendance(false);

    if (res.status === 'error' || (!res.ok && res.status !== 'warning')) {
      setManualAttendanceFeedback({
        type: 'error',
        msg: res.message || `Gagal memproses status presensi untuk token (${tokenToVerify}).`
      });
      return;
    }

    if (res.status === 'warning') {
      setManualAttendanceFeedback({
        type: 'warning',
        msg: res.message || `Peserta sudah tercatat hadir pada sesi ini sebelumnya.`,
        user: res.user || targetUser,
        time: res.scanned_at
      });
      return;
    }

    const nowTime = res.scanned_at || (new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
    const userToRecord = res.user || targetUser || { name: 'Peserta', email: '-' };
    const finalStatusLabel = manualAttendanceStatus === 'present' ? 'Hadir' : (manualAttendanceStatus === 'permission' ? 'Izin' : 'Tidak Hadir');
    const finalNote = manualAttendanceStatus === 'permission' ? (manualAttendanceNote || 'Izin / Berhalangan') : (manualAttendanceStatus === 'absent' ? 'Tidak Hadir / Alpa' : 'Diset Hadir oleh Panitia');

    setParticipants(prev => (prev || []).map(p => {
      const isMatch = (userToRecord.id && (p.id === userToRecord.id || p.db_id === userToRecord.id || p.id === `USR-${userToRecord.id}`)) ||
                      (p.qrToken && p.qrToken.trim() === tokenToVerify) ||
                      (p.user_qr_token && p.user_qr_token.trim() === tokenToVerify) ||
                      (userToRecord.email && p.email && p.email.toLowerCase() === userToRecord.email.toLowerCase());

      if (isMatch) {
        const attItem = { 
          present: manualAttendanceStatus === 'present', 
          time: nowTime, 
          status: finalStatusLabel, 
          raw_status: manualAttendanceStatus,
          note: finalNote 
        };
        return {
          ...p,
          status: finalStatusLabel,
          isExcused: false,
          excuseReason: null,
          attendances: {
            ...p.attendances,
            [manualAttendanceSession.id]: attItem,
            ...(manualAttendanceSession.db_id ? { [manualAttendanceSession.db_id]: attItem } : {}),
            ...(typeof manualAttendanceSession.id === 'string' && manualAttendanceSession.id.startsWith('SES-') ? { [manualAttendanceSession.id.replace(/\D/g, '')]: attItem } : {})
          }
        };
      }
      return p;
    }));

    setManualAttendanceFeedback({
      type: 'success',
      msg: `Presensi Berhasil! ${userToRecord.name} diset ${finalStatusLabel.toUpperCase()} pada ${manualAttendanceSession.title}.`,
      user: userToRecord,
      time: nowTime
    });

    setManualAttendanceToken('');
    setManualAttendanceSelectedParticipantId('');
    setManualAttendanceNote('');
    showNotification(`Presensi manual (${finalStatusLabel}) untuk ${userToRecord.name} berhasil disimpan!`);
  };

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!hasAttendanceAccess) {
      triggerAccessDenied('Input Manual Presensi Peserta', 'Fitur pencatatan kehadiran manual terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
      return;
    }
    if (!manualNoteModal) return;

    const targetSessionId = manualNoteModal?.sessionId || manualNoteModal?.session?.id || training?.sessions?.[0]?.id || 'SES-01';
    const sessionObj = training?.sessions?.find(s => s.id === targetSessionId || s.db_id === targetSessionId) || training?.sessions?.[0] || { id: targetSessionId };
    const sessionDbId = sessionObj?.db_id || targetSessionId;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const updatedParticipants = participants.map(p => {
      if (p.id === manualNoteModal.id) {
        return {
          ...p,
          status: 'Hadir',
          attendances: {
            ...p.attendances,
            [targetSessionId]: { present: true, time: nowTime, note: manualNoteText, status: 'Hadir' },
            ...(sessionDbId ? { [sessionDbId]: { present: true, time: nowTime, note: manualNoteText, status: 'Hadir' } } : {})
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Presensi manual untuk ${manualNoteModal.name} berhasil dicatat!`);
    const modalUserToSave = manualNoteModal;
    setManualNoteModal(null);

    try {
      await api.setAttendanceStatus({
        user_id: modalUserToSave.db_id || modalUserToSave.id,
        training_session_id: sessionDbId,
        status: 'present',
        note: manualNoteText,
        source: 'manual_admin'
      });
    } catch (err) {
      console.error('Failed to sync manualCheckIn to backend:', err);
    }
  };

  const handleSetPresensi = async (participant, sessionOrId) => {
    if (!hasAttendanceAccess) {
      triggerAccessDenied('Input Manual Presensi Peserta', 'Fitur pengubahan status kehadiran peserta secara manual terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
      return;
    }
    const sessionObj = typeof sessionOrId === 'object' ? sessionOrId : (training?.sessions?.find(s => s.id === sessionOrId || s.db_id === sessionOrId) || { id: sessionOrId || 'SES-01' });
    const targetSessionId = sessionObj?.id || 'SES-01';
    const sessionDbId = sessionObj?.db_id || targetSessionId;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const attItem = { 
      present: true, 
      status: 'Hadir', 
      raw_status: 'present',
      time: nowTime, 
      note: 'Diset Hadir oleh Panitia' 
    };

    const updatedParticipants = participants.map(p => {
      if (p.id === participant.id) {
        return {
          ...p,
          status: 'Hadir',
          isExcused: false,
          excuseReason: null,
          attendances: {
            ...p.attendances,
            [targetSessionId]: attItem,
            ...(sessionDbId ? { [sessionDbId]: attItem } : {}),
            ...(typeof targetSessionId === 'string' && targetSessionId.startsWith('SES-') ? { [targetSessionId.replace(/\D/g, '')]: attItem } : {})
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Presensi Berhasil! ${participant.name} telah diset HADIR pada ${sessionObj.title || targetSessionId}.`);
    setActiveActionMenuId(null);
    setRecapModalActionMenuId(null);

    try {
      await api.setAttendanceStatus({
        user_id: participant.db_id || participant.id,
        training_session_id: sessionDbId,
        status: 'present',
        note: 'Diset Hadir oleh Panitia',
        source: 'manual_admin'
      });
    } catch (err) {
      console.error('Failed to sync setPresensi to backend:', err);
    }
  };

  const handleSetAbsent = async (participant, sessionOrId) => {
    if (!hasAttendanceAccess) {
      triggerAccessDenied('Input Manual Presensi Peserta', 'Fitur pengubahan status kehadiran peserta secara manual terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
      return;
    }
    const sessionObj = typeof sessionOrId === 'object' ? sessionOrId : (training?.sessions?.find(s => s.id === sessionOrId || s.db_id === sessionOrId) || { id: sessionOrId || 'SES-01' });
    const targetSessionId = sessionObj?.id || 'SES-01';
    const sessionDbId = sessionObj?.db_id || targetSessionId;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const attItem = { 
      present: false, 
      status: 'Tidak Hadir', 
      raw_status: 'absent',
      time: nowTime, 
      note: 'Tidak Hadir / Alpa' 
    };

    const updatedParticipants = participants.map(p => {
      if (p.id === participant.id) {
        return {
          ...p,
          isExcused: false,
          excuseReason: null,
          attendances: {
            ...p.attendances,
            [targetSessionId]: attItem,
            ...(sessionDbId ? { [sessionDbId]: attItem } : {}),
            ...(typeof targetSessionId === 'string' && targetSessionId.startsWith('SES-') ? { [targetSessionId.replace(/\D/g, '')]: attItem } : {})
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Status presensi ${participant.name} diubah menjadi TIDAK HADIR (Alpa) pada ${sessionObj.title || targetSessionId}.`);
    setActiveActionMenuId(null);
    setRecapModalActionMenuId(null);

    try {
      await api.setAttendanceStatus({
        user_id: participant.db_id || participant.id,
        training_session_id: sessionDbId,
        status: 'absent',
        note: 'Tidak Hadir / Alpa',
        source: 'manual_admin'
      });
    } catch (err) {
      console.error('Failed to sync setAbsent to backend:', err);
    }
  };

  const handleResetAttendance = async (participant, sessionOrId) => {
    if (!hasAttendanceAccess) {
      triggerAccessDenied('Input Manual Presensi Peserta', 'Fitur pengubahan status kehadiran peserta secara manual terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
      return;
    }
    const sessionObj = typeof sessionOrId === 'object' ? sessionOrId : (training?.sessions?.find(s => s.id === sessionOrId || s.db_id === sessionOrId) || { id: sessionOrId || 'SES-01' });
    const targetSessionId = sessionObj?.id || 'SES-01';
    const sessionDbId = sessionObj?.db_id || targetSessionId;

    const updatedParticipants = participants.map(p => {
      if (p.id === participant.id) {
        const nextAtt = { ...p.attendances };
        delete nextAtt[targetSessionId];
        if (sessionDbId) delete nextAtt[sessionDbId];
        if (typeof targetSessionId === 'string' && targetSessionId.startsWith('SES-')) {
          delete nextAtt[targetSessionId.replace(/\D/g, '')];
        }
        return {
          ...p,
          isExcused: false,
          excuseReason: null,
          attendances: nextAtt
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Status presensi ${participant.name} berhasil di-reset menjadi Belum Absen pada ${sessionObj.title || targetSessionId}.`);
    setActiveActionMenuId(null);
    setRecapModalActionMenuId(null);

    try {
      await api.setAttendanceStatus({
        user_id: participant.db_id || participant.id,
        training_session_id: sessionDbId,
        status: 'reset',
        source: 'manual_admin'
      });
    } catch (err) {
      console.error('Failed to sync resetAttendance to backend:', err);
    }
  };

  const handleSaveExcuse = async (e) => {
    e.preventDefault();
    if (!hasAttendanceAccess) {
      triggerAccessDenied('Pencatatan Izin / Dispensasi', 'Fitur pemberian status izin kehadiran peserta terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
      return;
    }
    if (!excuseModalUser) return;

    const targetSessionId = excuseModalSessionId || training?.sessions?.[0]?.id || 'SES-01';
    const sessionObj = training?.sessions?.find(s => s.id === targetSessionId || s.db_id === targetSessionId) || { id: targetSessionId };
    const sessionDbId = sessionObj?.db_id || targetSessionId;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const finalReason = excuseReasonText.trim() || 'Izin / Berhalangan';
    const targetUserId = excuseModalUser.db_id || excuseModalUser.id;
    const targetUserName = excuseModalUser.name;

    const attItem = { 
      present: false, 
      status: 'Izin', 
      raw_status: 'permission',
      time: nowTime, 
      note: finalReason 
    };

    const updatedParticipants = participants.map(p => {
      if (p.id === excuseModalUser.id) {
        return {
          ...p,
          isExcused: false,
          excuseReason: null,
          attendances: {
            ...p.attendances,
            [targetSessionId]: attItem,
            ...(sessionDbId ? { [sessionDbId]: attItem } : {}),
            ...(typeof targetSessionId === 'string' && targetSessionId.startsWith('SES-') ? { [targetSessionId.replace(/\D/g, '')]: attItem } : {})
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Status & Alasan Izin untuk ${targetUserName} pada ${sessionObj.title || targetSessionId} berhasil disimpan!`);
    setExcuseModalUser(null);
    setExcuseReasonText('');
    setExcuseModalSessionId(null);

    try {
      await api.setAttendanceStatus({
        user_id: targetUserId,
        training_session_id: sessionDbId,
        status: 'permission',
        note: finalReason,
        source: 'manual_admin'
      });
    } catch (err) {
      console.error('Failed to sync saveExcuse to backend:', err);
    }
  };

  const handleOpenEditParticipant = (p) => {
    setEditModalUser(p);
    setEditFormName(p.name || '');
    setEditFormEmail(p.email || '');
    setEditFormInstansi(p.instansi || '');
    setEditFormJabatan(p.jabatan || 'Peserta Training');
    setEditFormPhone(p.phone || '0812-3344-5566');
    setEditFormGender(p.gender || 'L');
    setEditFormPassword('');
  };

  const handleSaveEditParticipant = async (e) => {
    e.preventDefault();
    if (!editFormName || !editFormEmail) return;

    const parsedId = parseInt(String(editModalUser?.id).replace(/\D/g, ''), 10);
    const dbId = editModalUser?.db_id || (isNaN(parsedId) ? null : parsedId);

    const updatedP = (participants || []).map(p => {
      if (p.id === editModalUser.id) {
        return {
          ...p,
          name: editFormName,
          email: editFormEmail,
          instansi: editFormInstansi || 'Umum',
          jabatan: editFormJabatan,
          phone: editFormPhone,
          gender: editFormGender || 'L'
        };
      }
      return p;
    });

    setParticipants(updatedP);
    setEditModalUser(null);
    showNotification(`Data Peserta (${editFormName}) berhasil diperbarui!`);

    if (dbId) {
      try {
        const updatePayload = {
          name: editFormName,
          email: editFormEmail,
          instansi: editFormInstansi || 'Umum',
          phone: editFormPhone,
          jabatan: editFormJabatan,
          gender: editFormGender || 'L'
        };
        if (editFormPassword && editFormPassword.trim()) {
          updatePayload.password = editFormPassword.trim();
        }
        await api.updateUser(dbId, updatePayload);
      } catch (err) {
        console.warn('Backend updateUser error:', err);
      }
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

  const handleToggleSessionStatus = (sessionId) => {
    setSessionStatuses(prev => {
      const current = prev[sessionId] || 'Mendatang';
      const nextStatus = current === 'Berlangsung' ? 'Ditutup' : 'Berlangsung';
      showNotification(`Status presensi sesi ${sessionId} diubah menjadi "${nextStatus}".`);
      return {
        ...prev,
        [sessionId]: nextStatus
      };
    });
  };


  const handleShareWA = (p) => {
    const text = `Halo ${p.name}, berikut adalah QR Token presensi Anda untuk ${training?.title}: ${p.qrToken}`;
    const url = `https://wa.me/${p.phone ? p.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleAddIncident = (e) => {
    e.preventDefault();
    if (!newIncidentUser || !newIncidentIssue) return;

    const newInc = {
      id: `INC-0${incidents.length + 1}`,
      user: newIncidentUser,
      issue: newIncidentIssue,
      solution: 'Sedang Ditangani Panitia Helpdesk',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      status: 'Proses'
    };

    setIncidents([newInc, ...incidents]);
    setNewIncidentUser('');
    setNewIncidentIssue('');
    showNotification('Laporan kendala peserta berhasil didaftarkan di Helpdesk!');
  };

  const handleExportSessionExcel = (session) => {
    const isAll = session === 'ALL';
    const sessionsList = training?.sessions || [];
    const eventTitle = training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung 2026';
    const nowStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const wb = XLSX.utils.book_new();

    if (isAll) {
      const ws = createPresensiMatrixWorksheet({
        eventTitle,
        nowStr,
        participants: participants || [],
        sessions: sessionsList
      });
      XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan Seluruh Sesi');
    } else {
      const ws = createSingleSessionWorksheet({
        eventTitle,
        session,
        nowStr,
        participants: participants || []
      });
      XLSX.utils.book_append_sheet(wb, ws, (session.title || 'Sesi').slice(0, 30));
    }

    const fileName = isAll 
      ? `Rekap_Presensi_Ringkasan_Seluruh_Sesi_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Rekap_Presensi_${(session.title || session.id || 'Sesi').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    downloadWorkbook(wb, fileName);
    showNotification(isAll 
      ? 'File Excel XLSX Matrix Ringkasan Seluruh Sesi berhasil diekspor!' 
      : `File Excel XLSX untuk ${session.title || 'Sesi'} berhasil diekspor!`
    );
  };

  const handleExportRekap = () => {
    handleExportSessionExcel('ALL');
  };

  const handleExportExcelPeserta = () => {
    const eventTitle = training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung';
    const now = new Date();
    const nowStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + 
                   now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.') + ' WIB';

    const wb = createPesertaPerKelasWorkbook({
      eventTitle,
      nowStr,
      participants: scopedParticipants || participants || [],
      classes: classes || []
    });

    const fileName = `Data_Peserta_PerKelas_Admin_${new Date().toISOString().slice(0, 10)}.xlsx`;
    downloadWorkbook(wb, fileName);
    showNotification('Data peserta berformat Excel XLSX (Sheet per Kelas + Semua Peserta) berhasil diekspor!');
  };

  const filteredParticipants = scopedParticipants.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.qrToken.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.instansi.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Filter Komisariat
    if (filterKomisariat !== 'ALL') {
      if ((p.instansi || '').trim().toLowerCase() !== filterKomisariat.trim().toLowerCase()) {
        return false;
      }
    }

    // Filter Gender
    if (filterGender !== 'ALL') {
      if ((p.gender || 'L') !== filterGender) {
        return false;
      }
    }

    const activeSesId = training?.sessions?.[0]?.id || 'SES-01';
    const activeAtt = p.attendances?.[activeSesId] || (training?.sessions?.[0]?.db_id && p.attendances?.[training.sessions[0].db_id]);
    const isActPresent = !!activeAtt?.present;
    const isActExcused = !isActPresent && (activeAtt?.status === 'Izin' || activeAtt?.raw_status === 'permission');

    if (filterSession === 'ALL') return true;
    if (filterSession === 'BELUM') return !isActPresent && !isActExcused;
    if (filterSession === 'HADIR') return isActPresent;
    if (filterSession === 'IZIN') return isActExcused;
    if (filterSession.startsWith('SES-') || !isNaN(Number(filterSession))) {
      return !!p.attendances?.[filterSession]?.present;
    }
    return true;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));

  const modalAllParticipants = useMemo(() => {
    const q = recapSearchQuery.toLowerCase().trim();
    const sessionsList = training?.sessions || [];

    return (scopedParticipants || []).filter(p => {
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.instansi && p.instansi.toLowerCase().includes(q)) ||
        (p.qrToken && p.qrToken.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (recapModalKomisariatFilter !== 'ALL' && p.instansi !== recapModalKomisariatFilter) return false;

      const presentCount = sessionsList.filter(s => {
        const att = p.attendances?.[s.id] || (s.db_id && p.attendances?.[s.db_id]) || (typeof s.id === 'string' && p.attendances?.[s.id.replace(/\D/g, '')]);
        return !!att?.present;
      }).length;
      const excuseCount = sessionsList.filter(s => {
        const att = p.attendances?.[s.id] || (s.db_id && p.attendances?.[s.db_id]) || (typeof s.id === 'string' && p.attendances?.[s.id.replace(/\D/g, '')]);
        return !att?.present && (att?.status === 'Izin' || att?.raw_status === 'permission');
      }).length;

      if (recapModalFilter === 'HADIR_ALL') return presentCount === sessionsList.length;
      if (recapModalFilter === 'IZIN_ANY') return excuseCount > 0;
      if (recapModalFilter === 'BELUM_ANY') return (presentCount + excuseCount) < sessionsList.length;

      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));
  }, [scopedParticipants, training?.sessions, recapSearchQuery, recapModalFilter, recapModalKomisariatFilter]);

  const modalSingleParticipants = useMemo(() => {
    if (!recapModalSession || recapModalSession === 'ALL') return [];
    const sesId = recapModalSession.id;
    const sesDbId = recapModalSession.db_id;
    const q = recapSearchQuery.toLowerCase().trim();

    return (scopedParticipants || []).filter(p => {
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.instansi && p.instansi.toLowerCase().includes(q));

      const att = p.attendances?.[sesId] || 
                  (sesDbId && p.attendances?.[sesDbId]) ||
                  (typeof sesId === 'string' && p.attendances?.[sesId.replace(/\D/g, '')]);
      const isSessionEnded = recapModalSession.status === 'Selesai' || recapModalSession.computed_status === 'Selesai' || recapModalSession.is_passed === true;
      const isPresent = !!att?.present;
      const isExcused = !isPresent && (att?.status === 'Izin' || att?.raw_status === 'permission');
      const isAbsent = !isPresent && !isExcused && (att?.status === 'Tidak Hadir' || att?.raw_status === 'absent' || isSessionEnded);

      if (!matchesSearch) return false;
      if (recapModalFilter === 'ALL') return true;
      if (recapModalFilter === 'HADIR') return isPresent;
      if (recapModalFilter === 'IZIN') return isExcused;
      if (recapModalFilter === 'TIDAK_HADIR') return isAbsent;
      if (recapModalFilter === 'BELUM') return !isPresent && !isExcused && !isAbsent;

      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));
  }, [scopedParticipants, recapModalSession, recapSearchQuery, recapModalFilter]);

  const handleCreateQuiz = (e) => {
    e.preventDefault();
    if (!quizFormTitle) return;

    const defaultInstructions = "1. KONEKSI & PERANGKAT: Pastikan koneksi internet stabil sebelum memulai ujian.\n2. DURASI UJIAN: Waktu pengerjaan dihitung mundur sejak tombol mulai ditekan. Apabila waktu habis, kotak konfirmasi penyerahan akan langsung muncul untuk mengumpulkan lembar jawaban Anda.\n3. INTEGRITAS & ANTI-KECURANGAN: Dilarang keras berpindah tab browser atau beralih ke aplikasi lain selama ujian. Sistem mencatat perpindahan tab dengan batas maksimal 2x peringatan. Pada percobaan ke-3, ujian akan otomatis dihentikan dan jawaban langsung disubmit.\n4. PENGUNCIAN HASIL: Begitu ujian disubmit, jawaban bersifat final, terkunci secara permanen, dan siap diperiksa oleh Administrator Panitia.";

    const newQuizObj = {
      id: `QZ-${Date.now().toString().slice(-3)}`,
      title: quizFormTitle,
      type: quizFormType,
      durationMinutes: parseInt(quizFormDuration, 10) || 15,
      passingGrade: parseInt(quizFormGrade, 10) || 70,
      status: 'Aktif',
      createdBy: currentUser?.name || 'Siska Putri (Admin Panitia)',
      createdAt: new Date().toLocaleDateString('id-ID'),
      description: quizFormDesc || 'Quiz evaluasi pelatihan.',
      instructions: quizFormInstructions || defaultInstructions,
      questions: []
    };

    try {
      api.createQuiz(newQuizObj);
    } catch (err) {
      console.warn('API createQuiz error:', err);
    }

    if (setQuizzes) {
      setQuizzes((prev) => [newQuizObj, ...(prev || [])]);
    }

    setShowCreateQuizModal(false);
    setQuizFormTitle('');
    setQuizFormDesc('');
    setQuizFormInstructions('');
    showNotification(`Quiz Baru ("${newQuizObj.title}") Berhasil Dibuat!`);
  };

  const handleAddQuestionToQuiz = (e) => {
    e.preventDefault();
    if (!questionFormText || !activeQuizForQuestions) return;

    let optionsArr = [];
    let correctVal = questionFormCorrect;

    if (questionFormType === 'multiple_choice') {
      optionsArr = [
        `A. ${questionFormOptA}`,
        `B. ${questionFormOptB}`,
        `C. ${questionFormOptC}`,
        `D. ${questionFormOptD}`
      ];
      if (questionFormCorrect === 'A') correctVal = `A. ${questionFormOptA}`;
      else if (questionFormCorrect === 'B') correctVal = `B. ${questionFormOptB}`;
      else if (questionFormCorrect === 'C') correctVal = `C. ${questionFormOptC}`;
      else if (questionFormCorrect === 'D') correctVal = `D. ${questionFormOptD}`;
    }

    const newQ = {
      id: `Q-${Date.now().toString().slice(-3)}`,
      type: questionFormType,
      text: questionFormText,
      options: optionsArr,
      correctAnswer: correctVal,
      scoreWeight: parseInt(questionFormScore, 10) || 25
    };

    const updatedQuizzes = (quizzes || []).map(q => {
      if (q.id === activeQuizForQuestions.id) {
        return {
          ...q,
          questions: [...(q.questions || []), newQ]
        };
      }
      return q;
    });

    if (setQuizzes) setQuizzes(updatedQuizzes);
    setActiveQuizForQuestions({
      ...activeQuizForQuestions,
      questions: [...(activeQuizForQuestions.questions || []), newQ]
    });

    setQuestionFormText('');
    setQuestionFormOptA('');
    setQuestionFormOptB('');
    setQuestionFormOptC('');
    setQuestionFormOptD('');
    showNotification(`Soal berhasil ditambahkan ke ${activeQuizForQuestions.title}!`);
  };

  const handleDeleteQuestionFromQuiz = (questionId) => {
    if (!activeQuizForQuestions) return;
    const filteredQs = (activeQuizForQuestions.questions || []).filter(q => q.id !== questionId);
    
    const updatedQuizzes = (quizzes || []).map(q => {
      if (q.id === activeQuizForQuestions.id) {
        return {
          ...q,
          questions: filteredQs
        };
      }
      return q;
    });

    if (setQuizzes) setQuizzes(updatedQuizzes);
    setActiveQuizForQuestions({
      ...activeQuizForQuestions,
      questions: filteredQs
    });

    showNotification(`Soal berhasil dihapus dari kuis.`);
  };

  const handleSendResetRequestToSuperAdmin = async (e) => {
    e.preventDefault();
    if (!requestResetSub || !requestResetReason) return;

    const newReq = {
      id: `REQ-${Date.now().toString().slice(-4)}`,
      submissionId: requestResetSub.id,
      quizId: requestResetSub.quizId,
      quizTitle: activeQuizForResults?.title || 'Quiz Pelatihan',
      participantId: requestResetSub.participantId,
      participantName: requestResetSub.participantName,
      requestedBy: currentUser?.name || 'Siska Putri (Admin Panitia)',
      requestType: 'reset_attempt',
      reason: requestResetReason,
      oldScore: requestResetSub.score,
      newScoreRequested: null,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    };

    if (setQuizRequests) {
      setQuizRequests((prev) => [newReq, ...(prev || [])]);
    }

    try {
      await api.createQuizRequest(newReq);
    } catch (err) {
      console.warn('Backend createQuizRequest error:', err);
    }

    setRequestResetSub(null);
    setRequestResetReason('');
    showNotification(`Permohonan Reset Nilai (${newReq.participantName}) berhasil dikirim ke Super Admin!`);
  };

  const copyQuizLink = (linkCode, quizId = null) => {
    const fullUrl = `${window.location.origin}/quiz/${linkCode}`;
    navigator.clipboard.writeText(fullUrl);
    if (quizId) {
      setCopiedQuizId(quizId);
      setTimeout(() => setCopiedQuizId(null), 2000);
    }
    showNotification(`Link Quiz (${fullUrl}) berhasil disalin ke clipboard!`);
  };

  const handleDeleteQuiz = async (quizId, quizTitle) => {
    const isConfirmed = await confirmDialog({
      title: 'Hapus Kuis',
      message: `Apakah Anda yakin ingin menghapus kuis "${quizTitle || 'ini'}"? Seluruh butir pertanyaan dan respon nilai peserta akan dihapus secara permanen.`,
      confirmText: 'Ya, Hapus Kuis',
      cancelText: 'Batal',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.deleteQuiz(quizId);
      } catch (err) {
        console.warn('API deleteQuiz error:', err);
      }

      if (setQuizzes) {
        setQuizzes((prev) => (prev || []).filter((q) => q.id !== quizId));
      }
      showNotification(`Kuis "${quizTitle}" berhasil dihapus.`);
    }
  };

  const renderPreviewPhotoModal = () => {
    if (!previewPhotoUser) return null;
    return (
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in"
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
    );
  };

  const renderRecapSingleSessionModal = () => {
    if (!recapModalSession || recapModalSession === 'ALL') return null;
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
        <header className="bg-white border-b border-slate-200/90 px-4 md:px-6 py-3 flex items-center justify-between gap-3 shadow-xs shrink-0 z-30">
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setRecapModalSession(null)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-xs md:text-sm text-slate-900 tracking-tight truncate max-w-xs md:max-w-xl" title={`Presensi: ${recapModalSession.title || 'Detail Sesi'}`}>
              Presensi: {recapModalSession.title || 'Detail Sesi'}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Search Bar & Mobile Icon Filter */}
            <div className="relative w-28 sm:w-36 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari peserta..."
                value={recapSearchQuery}
                onChange={(e) => setRecapSearchQuery(e.target.value)}
                className="w-full pl-7 pr-6 py-1.5 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition-all truncate"
              />
              {recapSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRecapSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative shrink-0">
              {/* Mobile View: Icon Button */}
              <div className="sm:hidden relative w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                <SlidersHorizontal className={`w-3.5 h-3.5 ${recapModalFilter !== 'ALL' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`} />
                {recapModalFilter !== 'ALL' && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-600 ring-1 ring-white" />
                )}
                <select
                  value={recapModalFilter}
                  onChange={(e) => setRecapModalFilter(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  title="Filter Status"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="HADIR">Hadir</option>
                  <option value="IZIN">Izin</option>
                  <option value="TIDAK_HADIR">Tidak Hadir</option>
                  <option value="BELUM">Belum Hadir</option>
                </select>
              </div>
              {/* Desktop View: Full Select Dropdown */}
              <select
                value={recapModalFilter}
                onChange={(e) => setRecapModalFilter(e.target.value)}
                className="hidden sm:block px-2.5 py-1.5 bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="HADIR">Hadir</option>
                <option value="IZIN">Izin</option>
                <option value="TIDAK_HADIR">Tidak Hadir</option>
                <option value="BELUM">Belum Hadir</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleExportSessionExcel(recapModalSession)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh Data</span>
            </button>

            <button
              type="button"
              onClick={() => setRecapModalSession(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
              title="Tutup Halaman"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Banner Mode Hanya Lihat jika Akses Presensi di-OFF-kan */}
        {!hasAttendanceAccess && (
          <div className="bg-amber-50/95 border-b border-amber-200 px-4 md:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0 z-20">
            <div className="flex items-center space-x-2 text-amber-900 font-semibold">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Mode Hanya Lihat:</strong> Akses pengelolaan presensi dinonaktifkan oleh Admin Utama. Anda dapat melihat data namun tidak dapat mengubah status presensi.
              </span>
            </div>
            <button
              type="button"
              onClick={() => triggerAccessDenied('Akses Presensi & Scanner', 'Izin Akses Presensi & Scanner diperlukan untuk mengubah status kehadiran peserta atau melakukan pemindaian.')}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer shrink-0"
            >
              Minta Akses Admin Utama
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-white relative">
          {recapModalActionMenuId && (
            <div 
              className="fixed inset-0 z-20" 
              onClick={() => setRecapModalActionMenuId(null)} 
            />
          )}
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-30 border-b border-slate-200 shadow-2xs">
              <tr className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 sm:py-3 px-1 sm:px-2 md:px-4 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center sticky top-0 left-0 z-40 bg-slate-100">No</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3 md:px-5 min-w-[125px] sm:min-w-[180px] sticky top-0 left-[32px] sm:left-[40px] md:left-[48px] z-40 bg-slate-100 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">Nama Peserta</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 min-w-[130px] sm:min-w-[170px]">Asal Komisariat</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 min-w-[100px] sm:min-w-[130px]">Status</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 min-w-[110px] sm:min-w-[140px]">Waktu / Catatan</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 text-right w-14 sm:w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modalSingleParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Tidak ada data peserta yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                modalSingleParticipants.map((p, idx) => {
                  const targetSesId = recapModalSession.id;
                  const targetDbId = recapModalSession.db_id;
                  const att = p.attendances?.[targetSesId] || 
                              (targetDbId && p.attendances?.[targetDbId]) ||
                              (typeof targetSesId === 'string' && p.attendances?.[targetSesId.replace(/\D/g, '')]);
                  const isSessionEnded = recapModalSession.status === 'Selesai' || recapModalSession.computed_status === 'Selesai' || recapModalSession.is_passed === true;
                  const isPresent = !!att?.present;
                  const isExcused = !isPresent && (att?.status === 'Izin' || att?.raw_status === 'permission');
                  const isAbsent = !isPresent && !isExcused && (att?.status === 'Tidak Hadir' || att?.raw_status === 'absent' || isSessionEnded);
                  const excuseNote = att?.note || (isSessionEnded && !isPresent && !isExcused ? 'Tidak Hadir / Alpa (Sesi telah berakhir)' : '');
                  const timeStr = att?.time || '-';

                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors group">
                      <td className="py-2 sm:py-3 px-1 sm:px-2 md:px-4 font-semibold text-slate-400 text-center sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 transition-colors text-[10px] sm:text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-5 sticky left-[32px] sm:left-[40px] md:left-[48px] z-20 bg-white group-hover:bg-slate-50/90 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)] transition-colors">
                        <div className="flex items-center space-x-2 sm:space-x-2.5">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all"
                            title="Klik untuk melihat foto profil peserta"
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
                          <div className="min-w-0">
                            <span 
                              onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                              className="font-semibold text-slate-900 text-[11px] sm:text-xs md:text-sm truncate block cursor-pointer hover:text-emerald-700 transition-colors max-w-[95px] sm:max-w-[160px] md:max-w-none"
                              title={`${p.name} (Klik untuk lihat profil)`}
                            >
                              {p.name}
                            </span>
                            {p.instansi && (
                              <span className="text-[9px] sm:text-[10px] text-slate-400 truncate block sm:hidden max-w-[95px]">
                                {p.instansi}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 md:px-6">
                        <div className="text-slate-800 font-medium text-[11px] sm:text-xs">{p.instansi}</div>
                      </td>
                      <td className="py-3 px-4 md:px-6">
                        {isPresent ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Hadir</span>
                          </span>
                        ) : isExcused ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Izin</span>
                          </span>
                        ) : isAbsent ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Tidak Hadir</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Belum Hadir</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 md:px-6 font-mono text-[11px] text-slate-500">
                        {isPresent ? (
                          <span className="text-emerald-700 font-medium">{timeStr}</span>
                        ) : isExcused ? (
                          <span className="text-amber-700 italic font-sans" title={excuseNote}>
                            {excuseNote ? `"${excuseNote.length > 25 ? excuseNote.substring(0, 25) + '...' : excuseNote}"` : 'Izin'}
                          </span>
                        ) : isAbsent ? (
                          <span className="text-rose-700 font-medium">Alpa (Tidak Hadir)</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 md:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecapModalActionMenuId(recapModalActionMenuId === p.id ? null : p.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Ubah Status Presensi"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {recapModalActionMenuId === p.id && (
                            <div 
                              className="absolute right-full top-0 mr-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{recapModalSession.id}</p>
                                <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setRecapModalActionMenuId(null);
                                  handleSetPresensi(p, recapModalSession);
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Set Hadir</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRecapModalActionMenuId(null);
                                  setExcuseModalUser(p);
                                  setExcuseModalSessionId(recapModalSession.id);
                                  setExcuseReasonText(excuseNote || '');
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Set Izin / Alasan...</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRecapModalActionMenuId(null);
                                  handleSetAbsent(p, recapModalSession);
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Set Tidak Hadir (Alpa)</span>
                              </button>

                              <div className="border-t border-slate-100 my-1"></div>

                              <button
                                type="button"
                                onClick={() => {
                                  setRecapModalActionMenuId(null);
                                  handleResetAttendance(p, recapModalSession);
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Reset ke Belum Absen</span>
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

        <footer className="px-4 md:px-6 py-2.5 border-t border-slate-200/90 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-semibold text-slate-600">
            Menampilkan {modalSingleParticipants.length} dari {participants.length} peserta
          </span>
          <span className="text-[11px] text-slate-400">
            PresenTrain System
          </span>
        </footer>
      </div>
    );
  };

  const renderExcuseModal = () => {
    if (!excuseModalUser) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
        <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-slate-100 my-auto">
          <button 
            type="button"
            onClick={() => setExcuseModalUser(null)} 
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center border border-amber-200 shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Form Izin / Dispensasi</h3>
              <p className="text-xs text-slate-500">{excuseModalUser.name} ({excuseModalSessionId || 'Sesi Terkait'})</p>
            </div>
          </div>

          <form onSubmit={handleSaveExcuse} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilih Sesi Pelatihan yang Diberikan Izin</label>
              <select
                value={excuseModalSessionId || training?.sessions?.[0]?.id || 'SES-01'}
                onChange={(e) => {
                  const newSid = e.target.value;
                  setExcuseModalSessionId(newSid);
                  const curNote = excuseModalUser.attendances?.[newSid]?.note;
                  if (curNote) setExcuseReasonText(curNote);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold cursor-pointer"
              >
                {(training?.sessions || []).map((ses, sIdx) => (
                  <option key={ses.id} value={ses.id}>
                    Sesi {sIdx + 1}: {ses.title} ({ses.time})
                  </option>
                ))}
              </select>
              <p className="text-[10.5px] text-slate-400 mt-1">Status Izin hanya akan berlaku khusus pada sesi yang dipilih ini.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alasan Berhalangan Hadir</label>
              <textarea
                rows={1}
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = `${el.scrollHeight}px`;
                  }
                }}
                value={excuseReasonText}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onChange={(e) => {
                  setExcuseReasonText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                placeholder="Contoh: Tugas luar kota / Sakit / Mengikuti agenda mendesak..."
                className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:border-amber-500 focus:bg-white outline-none resize-none overflow-hidden [field-sizing:content] min-h-[46px]"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setExcuseModalUser(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 shadow-md cursor-pointer"
              >
                Simpan Status Izin
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ==========================================
  // TAB SUB-VIEWS RENDERER
  // ==========================================

  if (activeTab === 'profile') {
    return (
      <ProfileView
        user={currentUser}
        onUpdateUser={(updated) => {
          if (onUpdateUser) onUpdateUser(updated);
          if (setParticipants) setParticipants(prev => prev.map(p => p.email === updated.email ? updated : p));
        }}
        onBack={() => setActiveTab && setActiveTab('sessions_scanner')}
      />
    );
  }

  if (activeTab === 'settings') {
    return (
      <SettingsView
        siteSettings={siteSettings}
        user={currentUser}
        onUpdateUser={onUpdateUser}
        onBack={() => setActiveTab && setActiveTab('sessions_scanner')}
      />
    );
  }

  if (activeTab === 'guide') {
    return (
      <GuideView
        user={currentUser}
        onBack={() => setActiveTab && setActiveTab('sessions_scanner')}
      />
    );
  }

  // SUBVIEW: QUIZZES MANAGEMENT (`quizzes`)
  if (activeTab === 'quizzes') {
    if (!hasQuizAccess) {
      return (
        <div className="p-6 md:p-12 max-w-4xl mx-auto font-sans text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border-2 border-amber-200 shadow-inner">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider bg-amber-100 px-3 py-1 rounded-full">
              Akses Dibatasi
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">Akses Quiz & Test Terkunci</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Akun Administrator Anda belum diberikan hak akses untuk membuat, mengedit kuis, ataupun mengoreksi nilai jawaban peserta oleh Admin Utama.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => triggerAccessDenied('Akses Quiz & Test', 'Izin Akses Quiz & Test diperlukan untuk membuat, mengubah, menghapus kuis, dan mengoreksi jawaban peserta.')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center space-x-2 active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Minta Hak Akses ke Koordinator</span>
            </button>
          </div>

          <AccessDeniedModal
            isOpen={accessDeniedConfig.isOpen}
            onClose={() => setAccessDeniedConfig(prev => ({ ...prev, isOpen: false }))}
            title={accessDeniedConfig.title}
            featureName={accessDeniedConfig.featureName}
            description={accessDeniedConfig.description}
            adminName={currentUser?.name}
            whatsappNumber={siteSettings?.contactPhone || '62887437525303'}
          />
        </div>
      );
    }

    // IF FULL PAGE GOOGLE FORM BUILDER IS ACTIVE:
    if (activeQuizBuilder !== null) {
      return (
        <GoogleFormQuizBuilder
          initialQuiz={activeQuizBuilder.id ? activeQuizBuilder : null}
          currentUser={currentUser}
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

    // IF FULL PAGE QUIZ PREVIEW IS ACTIVE:
    if (previewQuiz !== null) {
      return (
        <QuizPreviewModal
          quiz={previewQuiz}
          onClose={() => setPreviewQuiz(null)}
          onEdit={(q) => {
            setPreviewQuiz(null);
            setActiveQuizBuilder(q);
          }}
          onViewResults={(q) => {
            setPreviewQuiz(null);
            if (typeof refreshQuizSubmissions === 'function') refreshQuizSubmissions();
            setActiveQuizForResults(q);
          }}
        />
      );
    }

    // IF FULL PAGE QUIZ RESULTS VIEW IS ACTIVE:
    if (activeQuizForResults !== null) {
      return (
        <QuizResultsView
          quiz={activeQuizForResults}
          participants={scopedParticipants}
          quizSubmissions={quizSubmissions}
          onRefresh={refreshQuizSubmissions}
          onUpdateSubmission={async (updatedSub) => {
            let savedResult = null;
            try {
              const quizId = activeQuizForResults.id || updatedSub.quizId || updatedSub.quiz_id;
              const isExistingInDb = updatedSub.db_id || (updatedSub.id && !String(updatedSub.id).startsWith('SUB-MANUAL-'));

              if (isExistingInDb) {
                const targetId = updatedSub.db_id || updatedSub.id;
                savedResult = await api.updateQuizSubmission(targetId, updatedSub);
              } else {
                // Peserta belum pernah submit kuis (belum ada baris di database): buat entri baru via submitQuiz
                savedResult = await api.submitQuiz(quizId, updatedSub);
                if (!savedResult?.ok) {
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
            if (typeof refreshQuizSubmissions === 'function') {
              try {
                await refreshQuizSubmissions();
              } catch (e) {
                console.warn('refreshQuizSubmissions error:', e);
              }
            }
          }}
          isSuperAdmin={false}
          currentUser={currentUser}
          onBack={() => setActiveQuizForResults(null)}
          showNotification={showNotification}
        />
      );
    }

    const filteredQuizzes = quizzes || [];

    const renderQuizAccessToggle = (qz) => {
      const quizKey = qz.db_id || qz.id;
      const accessObj = classQuizAccessList.find(a => 
        (qz.db_id && String(a.quiz_id) === String(qz.db_id)) ||
        String(a.quiz_id) === String(qz.id) ||
        (a.quiz_code && String(a.quiz_code) === String(qz.quiz_code || qz.id)) ||
        (a.id && String(a.id) === String(qz.id))
      );
      const isOpen = accessObj?.status === 'buka';
      const targetClass = classes.find(c => String(c.id) === String(selectedClassId));
      const isGeneral = !selectedClassId || selectedClassId === 'ALL';
      const isToggling = togglingQuizId === (qz.id || qz.db_id) || togglingQuizId === quizKey;

      if (isGeneral) {
        return (
          <span className="text-[11px] font-medium text-slate-400 italic">
            Pilih kelas tertentu
          </span>
        );
      }

      return (
        <div className="inline-flex flex-col items-center">
          <button
            type="button"
            disabled={isToggling}
            onClick={async () => {
              if (isToggling) return;
              const nextStatus = isOpen ? 'tutup' : 'buka';
              setTogglingQuizId(quizKey);
              try {
                const res = await api.toggleClassQuizAccess(selectedClassId, quizKey, nextStatus);
                if (res && res.ok) {
                  // Update state lokal secara optimis
                  setClassQuizAccessList(prev => {
                    const prevList = Array.isArray(prev) ? prev : [];
                    const idx = prevList.findIndex(a =>
                      (qz.db_id && String(a.quiz_id) === String(qz.db_id)) ||
                      String(a.quiz_id) === String(qz.id) ||
                      (a.quiz_code && String(a.quiz_code) === String(qz.quiz_code || qz.id))
                    );
                    if (idx >= 0) {
                      const copy = [...prevList];
                      copy[idx] = { ...copy[idx], status: nextStatus };
                      return copy;
                    }
                    return [...prevList, { quiz_id: qz.db_id || qz.id, quiz_code: qz.quiz_code || qz.id, status: nextStatus }];
                  });
                  showNotification(`Akses kuis untuk kelas "${targetClass?.name || 'ini'}" berhasil diubah ke: ${nextStatus.toUpperCase()}`);
                  await fetchClassQuizAccess();
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
            title="Klik untuk Buka atau Tutup kuis bagi peserta kelas ini"
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
      );
    };

    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Kuis & Akses Kelas</h2>
            <p className="text-xs text-slate-500 mt-1">
              Buka / tutup akses kuis untuk peserta kelas Anda, tinjau hasil pengerjaan, dan import nilai evaluasi
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            {typeof refreshQuizSubmissions === 'function' && (
              <button
                type="button"
                onClick={async () => {
                  if (typeof refreshQuizzes === 'function') await refreshQuizzes();
                  if (typeof refreshQuizSubmissions === 'function') await refreshQuizSubmissions();
                  await fetchClassQuizAccess();
                  showNotification('Data kuis dan responden berhasil diperbarui dari server!');
                }}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 shadow-xs"
                title="Segarkan data kuis & responden dari server"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Segarkan</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. DESKTOP / TABLET: QUIZ TABLE VIEW */}
        <div className="hidden sm:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse font-sans text-xs min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 text-center w-12">NO</th>
                  <th className="py-3.5 px-4">JUDUL KUIS</th>
                  <th className="py-3.5 px-4 text-center">TIPE KUIS</th>
                  <th className="py-3.5 px-4 text-center">STATUS KELAS</th>
                  <th className="py-3.5 px-4 text-center">PASSING GRADE</th>
                  <th className="py-3.5 px-4 text-center">RESPONDEN</th>
                  <th className="py-3.5 px-4 text-center w-24">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredQuizzes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Belum ada kuis yang dibuat. Silakan klik tombol "+ Buat Quiz Baru" di atas.
                    </td>
                  </tr>
                ) : (
                  filteredQuizzes.map((qz, idx) => {
                    const questionCount = (qz.questions || []).length;
                    const subCount = (quizSubmissions || []).filter(s => isSubmissionForQuiz(s, qz)).length;
                    const isMenuOpen = activeQuizActionMenu?.qz?.id === qz.id;

                    return (
                      <tr key={qz.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* NO */}
                        <td className="py-4 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* JUDUL KUIS */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm leading-tight hover:text-emerald-700 transition-colors">
                            {qz.title}
                          </div>
                        </td>

                        {/* TIPE KUIS */}
                        <td className="py-4 px-4 text-center">
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

                        {/* STATUS KELAS (BUKA / TUTUP TOGGLE) */}
                        <td className="py-4 px-4 text-center">
                          {renderQuizAccessToggle(qz)}
                        </td>

                        {/* PASSING GRADE */}
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-slate-700 text-xs">
                            {qz.passingGrade || 70} Poin
                          </span>
                        </td>

                        {/* RESPONDEN */}
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-slate-700 text-xs">
                            {subCount} Peserta
                          </span>
                        </td>

                        {/* AKSI */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => handleToggleQuizActionMenu(e, qz)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                              title="Pilihan Aksi"
                              aria-label="Pilihan Aksi"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
            <div>
              Menampilkan {filteredQuizzes.length} kuis aktif
            </div>
            <div className="font-semibold text-slate-400 text-[11px]">
              PresenTrain System
            </div>
          </div>
        </div>

        {/* 2. MOBILE: RESPONSIVE CARDS VIEW */}
        <div className="block sm:hidden space-y-3">
          {filteredQuizzes.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Belum ada kuis yang dibuat. Silakan klik tombol "+ Buat Quiz Baru" di atas.
            </div>
          ) : (
            filteredQuizzes.map((qz, idx) => {
              const questionCount = (qz.questions || []).length;
              const subCount = (quizSubmissions || []).filter(s => isSubmissionForQuiz(s, qz)).length;

              return (
                <div key={qz.id} className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 relative">
                  {/* Top Bar with Type, Duration and 3-Dots Button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        qz.type === 'pretest' || qz.type === 'pre_test'
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : qz.type === 'midtest' || qz.type === 'mid_test' || qz.type === 'evaluasi'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : qz.type === 'quiz'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {qz.type === 'pretest' || qz.type === 'pre_test' ? 'Pre-Test' : (qz.type === 'midtest' || qz.type === 'mid_test' || qz.type === 'evaluasi' ? 'Mid-Test' : (qz.type === 'quiz' ? 'Quiz Materi' : 'Post-Test'))}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        • {qz.durationMinutes || 15} Menit
                      </span>
                    </div>

                    {/* Mobile 3-Dots Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleQuizActionMenu(e, qz)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                      title="Pilihan Aksi"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{qz.title}</h3>
                    {qz.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {qz.description}
                      </p>
                    )}
                  </div>

                  {/* Stats Badges */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 text-center text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Soal</div>
                      <div className="font-bold text-slate-800 mt-0.5">{questionCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Target</div>
                      <div className="font-bold text-emerald-700 mt-0.5">{qz.passingGrade || 70} Pts</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Responden</div>
                      <div className="font-bold text-teal-700 mt-0.5">{subCount}</div>
                    </div>
                  </div>

                  {/* Status Akses Kelas (Buka / Tutup Kuis) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600">
                      Akses Kelas:
                    </span>
                    <div>
                      {renderQuizAccessToggle(qz)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FLOATING ACTION DROPDOWN (LAYER TERATAS FIXED / BEBAS CLIPPING) */}
        {activeQuizActionMenu && (
          <>
            <div 
              className="fixed inset-0 z-40 cursor-default" 
              onClick={() => setActiveQuizActionMenu(null)} 
            />
            <div 
              style={{ 
                position: 'fixed',
                top: `${activeQuizActionMenu.top}px`, 
                right: `${activeQuizActionMenu.right}px`,
              }}
              className="w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1 text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Aksi Kuis</p>
                <p className="text-xs font-semibold text-slate-800 truncate text-left">{activeQuizActionMenu.qz.title}</p>
              </div>

              {/* 1. Nilai & Hasil */}
              <button
                type="button"
                onClick={() => {
                  const qz = activeQuizActionMenu.qz;
                  setActiveQuizActionMenu(null);
                  if (typeof refreshQuizSubmissions === 'function') refreshQuizSubmissions();
                  setActiveQuizForResults(qz);
                }}
                className="w-full px-3.5 py-2 flex items-center space-x-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer text-left group"
              >
                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <div className="font-bold text-slate-800 group-hover:text-emerald-800">Nilai & Hasil</div>
                  <div className="text-[10px] text-slate-400 font-normal">Lihat respon & koreksi</div>
                </div>
              </button>

              {/* 2. Pratinjau Kuis */}
              <button
                type="button"
                onClick={() => {
                  const qz = activeQuizActionMenu.qz;
                  setActiveQuizActionMenu(null);
                  setPreviewQuiz(qz);
                }}
                className="w-full px-3.5 py-2 flex items-center space-x-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer text-left group"
              >
                <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <div className="font-bold text-slate-800 group-hover:text-emerald-800">Pratinjau Kuis</div>
                  <div className="text-[10px] text-slate-400 font-normal">Simulasi pengerjaan kuis</div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* MODAL 1: BUAT QUIZ BARU */}
        {showCreateQuizModal && (
          <div 
            onClick={() => setShowCreateQuizModal(false)}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Buat Quiz Baru</h3>
                    <p className="text-xs text-slate-500">Atur parameter awal evaluasi Pre-Test / Mid-Test / Post-Test</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateQuizModal(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateQuiz} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Judul Quiz <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mid-Test Sesi 5: Keorganisasian"
                    value={quizFormTitle}
                    onChange={(e) => setQuizFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Quiz</label>
                    <select
                      value={quizFormType}
                      onChange={(e) => setQuizFormType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-bold cursor-pointer"
                    >
                      <option value="pretest">Pre-Test (Awal)</option>
                      <option value="midtest">Mid-Test (Tengah)</option>
                      <option value="posttest">Post-Test (Akhir)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Durasi (Menit)</label>
                    <input
                      type="number"
                      value={quizFormDuration}
                      onChange={(e) => setQuizFormDuration(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Passing Grade (0-100)</label>
                  <input
                    type="number"
                    value={quizFormGrade}
                    onChange={(e) => setQuizFormGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deskripsi Singkat Quiz</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Evaluasi kemampuan awal peserta sebelum memasuki sesi pelatihan..."
                    value={quizFormDesc}
                    onChange={(e) => setQuizFormDesc(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Petunjuk & Aturan Khusus Kuis (Tampil Sebelum Ujian)</label>
                  <textarea
                    rows={3}
                    placeholder="1) Pastikan koneksi internet stabil&#10;2) Dilarang menutup browser selama ujian&#10;3) Nilai dikunci otomatis saat submit..."
                    value={quizFormInstructions}
                    onChange={(e) => setQuizFormInstructions(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                  <button type="button" onClick={() => setShowCreateQuizModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl">Batal</button>
                  <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md">Simpan Quiz</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: KELOLA SOAL (QUESTION BUILDER) */}
        {activeQuizForQuestions && (
          <div 
            onClick={() => setActiveQuizForQuestions(null)}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Kelola Soal: {activeQuizForQuestions.title}</h3>
                    <p className="text-xs text-slate-500">Tambah dan atur pertanyaan Pilihan Ganda & Essay</p>
                  </div>
                </div>
                <button onClick={() => setActiveQuizForQuestions(null)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Tambah Soal Baru */}
              <form onSubmit={handleAddQuestionToQuiz} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] text-emerald-800">Form Tambah Pertanyaan Baru</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipe Soal</label>
                    <select
                      value={questionFormType}
                      onChange={(e) => setQuestionFormType(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-slate-900 font-bold"
                    >
                      <option value="multiple_choice">Pilihan Ganda (Multiple Choice)</option>
                      <option value="essay">Isian / Essay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bobot Skor Poin</label>
                    <input
                      type="number"
                      value={questionFormScore}
                      onChange={(e) => setQuestionFormScore(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teks Pertanyaan Soal <span className="text-rose-500">*</span></label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Tuliskan pertanyaan kuis di sini..."
                    value={questionFormText}
                    onChange={(e) => setQuestionFormText(e.target.value)}
                    className="w-full p-3 bg-white rounded-xl border border-slate-300 text-slate-900 font-medium"
                  />
                </div>

                {questionFormType === 'multiple_choice' && (
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    <label className="block font-bold text-slate-700">Opsi Jawaban & Kunci Jawaban Benar:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Opsi A" value={questionFormOptA} onChange={(e) => setQuestionFormOptA(e.target.value)} className="p-2 bg-white rounded-xl border border-slate-300" required />
                      <input type="text" placeholder="Opsi B" value={questionFormOptB} onChange={(e) => setQuestionFormOptB(e.target.value)} className="p-2 bg-white rounded-xl border border-slate-300" required />
                      <input type="text" placeholder="Opsi C" value={questionFormOptC} onChange={(e) => setQuestionFormOptC(e.target.value)} className="p-2 bg-white rounded-xl border border-slate-300" required />
                      <input type="text" placeholder="Opsi D" value={questionFormOptD} onChange={(e) => setQuestionFormOptD(e.target.value)} className="p-2 bg-white rounded-xl border border-slate-300" required />
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                      <span className="font-bold text-slate-700">Kunci Jawaban Benar:</span>
                      <select value={questionFormCorrect} onChange={(e) => setQuestionFormCorrect(e.target.value)} className="px-3 py-1.5 bg-emerald-100 text-emerald-900 font-extrabold rounded-xl border border-emerald-300">
                        <option value="A">Opsi A</option>
                        <option value="B">Opsi B</option>
                        <option value="C">Opsi C</option>
                        <option value="D">Opsi D</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs">
                    + Tambahkan Soal Ke Quiz
                  </button>
                </div>
              </form>

              {/* List Soal Terdaftar */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  Daftar Soal Terpasang ({(activeQuizForQuestions.questions || []).length} Soal)
                </h4>
                {(!activeQuizForQuestions.questions || activeQuizForQuestions.questions.length === 0) ? (
                  <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">Belum ada soal ditambahkan.</div>
                ) : (
                  activeQuizForQuestions.questions.map((q, idx) => (
                    <div key={q.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-1.5 relative group">
                      <div className="flex justify-between items-start font-bold text-slate-900 pr-8">
                        <span>{idx + 1}. {q.text}</span>
                        <span className="text-emerald-700 font-mono text-[11px] shrink-0 ml-2">[{q.scoreWeight} Poin]</span>
                      </div>
                      <button
                        onClick={() => handleDeleteQuestionFromQuiz(q.id)}
                        className="absolute right-3 top-3 p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus Soal Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {q.type === 'multiple_choice' ? (
                        <div className="text-[11px] text-slate-500 pl-4 space-y-0.5">
                          {q.options?.map((opt, oIdx) => (
                            <div key={oIdx} className={opt === q.correctAnswer ? 'font-bold text-emerald-700' : ''}>
                              {opt} {opt === q.correctAnswer && '✓ (Kunci)'}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                          {q.correctAnswer}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}







      </div>
    );
  }



  // 2. CARI & PRESENSI MANUAL PESERTA (`participants`)
  if (activeTab === 'participants') {
    const isParticipantsFilteringActive = Boolean(
      (searchQuery && searchQuery.trim() !== '') ||
      filterKomisariat !== 'ALL' ||
      filterGender !== 'ALL'
    );
    const countGenderL = (scopedParticipants || []).filter(p => (p.gender || '').toUpperCase() === 'L').length;
    const countGenderP = (scopedParticipants || []).filter(p => (p.gender || '').toUpperCase() === 'P').length;
    const uniqueKomisariats = Array.from(new Set((scopedParticipants || []).map(p => (p.instansi || '').trim()).filter(Boolean))).sort();

    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans relative w-full">
        {/* Backdrop for 3-dots menu popup dismissal */}
        {activeActionMenuId && (
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setActiveActionMenuId(null)} 
          />
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Daftar Peserta Training {isParticipantsFilteringActive ? `(${filteredParticipants.length} dari ${scopedParticipants?.length || 0})` : `(${scopedParticipants?.length || 0})`}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcelPeserta}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-[11px] sm:text-xs font-semibold rounded-2xl flex items-center space-x-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Ekspor Data Peserta Terformat Excel (Sheet per Kelas & Semua Peserta)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>Ekspor Excel Peserta</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Cari nama peserta, email, asal komisariat, atau QR Token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <option value="ALL">Semua Komisariat ({scopedParticipants?.length || 0})</option>
                {uniqueKomisariats.map((kom) => {
                  const countKom = (scopedParticipants || []).filter(p => (p.instansi || '').trim().toLowerCase() === kom.toLowerCase()).length;
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

            {/* Filter Jenis Kelamin */}
            <div className="relative">
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="pl-3 pr-8 py-2.5 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 transition-colors cursor-pointer appearance-none shadow-2xs"
              >
                <option value="ALL">Semua Gender ({scopedParticipants?.length || 0})</option>
                <option value="L">Laki-laki ({countGenderL})</option>
                <option value="P">Perempuan ({countGenderP})</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400">
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

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                <span>Pencarian: <strong>"{searchQuery}"</strong></span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
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

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterKomisariat('ALL');
                setFilterGender('ALL');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2.5 py-1 rounded-xl hover:bg-rose-50 cursor-pointer transition-all ml-auto"
            >
              Reset Semua Filter
            </button>
          </div>
        )}

        {/* Inline Form Presensi Catatan Manual jika dipanggil */}
        {manualNoteModal && (
          <div className="light-card rounded-3xl p-6 border-2 border-emerald-500 bg-white shadow-lg space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Form Presensi Manual - {manualNoteModal.name}</h3>
              <button onClick={() => setManualNoteModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Presensi Manual Panitia</label>
                <input
                  type="text"
                  value={manualNoteText}
                  onChange={(e) => setManualNoteText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualNoteModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-2xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-emerald text-white font-semibold rounded-2xl shadow-md flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Absenkan Peserta</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Participants Table List Format */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 md:px-6">Nama Peserta</th>
                <th className="py-3.5 px-2 md:px-4 text-center">Gender</th>
                <th className="py-3.5 px-4 md:px-6">Asal Komisariat</th>
                <th className="py-3.5 px-4 md:px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
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
                            setSearchQuery('');
                            setFilterKomisariat('ALL');
                            setFilterGender('ALL');
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
                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors group">
                      {/* Column 1: Nama Peserta */}
                      <td className="py-3.5 px-4 md:px-6">
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

                      {/* Column 4: Aksi (3-Dots Menu) */}
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
                              className="absolute right-full top-0 mr-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 text-left"
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
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL 1: DETAIL PROFIL PESERTA (DIGITAL ID CARD) */}
        {profileModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="relative max-w-[340px] w-full mx-auto p-6 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl border border-emerald-500/40 shadow-2xl space-y-4 text-center my-auto animate-scale-in">
              {/* Close Button X */}
              <button 
                onClick={() => setProfileModalUser(null)} 
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-emerald-100 hover:text-white transition-colors cursor-pointer"
                title="Tutup Kartu"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Card Header */}
              <div className="border-b border-emerald-500/30 pb-3 text-center">
                <span className="text-[10px] font-extrabold uppercase bg-emerald-400/20 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-300/30 inline-block">
                  KARTU TANDA PESERTA RESMI
                </span>
                <h3 className="text-lg font-black text-white mt-1">{siteSettings?.siteName || 'PresenTrain'} Digital ID</h3>
              </div>

              {/* Circular Avatar */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-950 text-white font-black text-2xl flex items-center justify-center border-2 border-emerald-300 shadow-md relative overflow-hidden">
                  <span>{profileModalUser.name ? profileModalUser.name.charAt(0).toUpperCase() : 'P'}</span>
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
              </div>

              {/* White QR Code Card */}
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <div className="bg-white p-3.5 rounded-2xl shadow-md shrink-0 mx-auto">
                  <QRCodeSVG 
                    value={profileModalUser.qrToken || `${Math.floor(100000 + Math.random() * 900000)}`} 
                    size={140} 
                    level="H" 
                  />
                </div>
                <div className="space-y-1 text-center w-full">
                  <h4 className="text-lg font-extrabold text-white leading-tight">{profileModalUser.name}</h4>
                  <p className="text-xs text-emerald-100 font-medium">{profileModalUser.instansi || 'HMI Komisariat ITERA'}</p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-emerald-500/30 text-[10px] text-emerald-100 font-semibold text-center">
                Status: Terverifikasi Panitia
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: FORM IZIN / BERHALANGAN */}
        {excuseModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-slate-100 max-h-[calc(100vh-2rem)] overflow-y-auto my-auto">
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
                  <label className="block font-semibold text-slate-700 mb-1.5">Pilih Sesi Pelatihan yang Diberikan Izin</label>
                  <select
                    value={excuseModalSessionId || training?.sessions?.[0]?.id || 'SES-01'}
                    onChange={(e) => {
                      const newSid = e.target.value;
                      setExcuseModalSessionId(newSid);
                      const curNote = excuseModalUser.attendances?.[newSid]?.note;
                      if (curNote) setExcuseReasonText(curNote);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold cursor-pointer"
                  >
                    {(training?.sessions || []).map((ses, sIdx) => (
                      <option key={ses.id} value={ses.id}>
                        Sesi {sIdx + 1}: {ses.title} ({ses.time})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10.5px] text-slate-400 mt-1">Status Izin hanya akan berlaku khusus pada sesi yang dipilih ini.</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Alasan Izin / Berhalangan</label>
                  {(() => {
                    const curSid = excuseModalSessionId || training?.sessions?.[0]?.id || 'SES-01';
                    const curNote = excuseModalUser.attendances?.[curSid]?.note;
                    return curNote ? (
                      <div className="mb-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                        <span className="font-semibold text-[10px] uppercase tracking-wider text-amber-700 block">Alasan Saat Ini Pada Sesi Ini:</span>
                        <p className="italic font-medium">"{curNote}"</p>
                      </div>
                    ) : null;
                  })()}
                  <textarea
                    rows={1}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                    value={excuseReasonText}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onChange={(e) => {
                      setExcuseReasonText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    placeholder="Tuliskan alasan izin / berhalangan peserta..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all text-xs resize-none overflow-hidden [field-sizing:content] min-h-[46px]"
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

        {/* MODAL EDIT PESERTA */}
        {editModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-slate-100 max-h-[calc(100vh-2rem)] overflow-y-auto my-auto">
              <button 
                onClick={() => setEditModalUser(null)} 
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center border border-blue-200 shrink-0">
                  <Edit className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Data Peserta</h3>
                  <p className="text-xs text-slate-500">Perbarui informasi profil {editModalUser.name}</p>
                </div>
              </div>

              <form onSubmit={handleSaveEditParticipant} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={editFormName}
                    onChange={(e) => setEditFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editFormEmail}
                    onChange={(e) => setEditFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asal Komisariat</label>
                  <input
                    type="text"
                    value={editFormInstansi}
                    onChange={(e) => setEditFormInstansi(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={editFormGender}
                      onChange={(e) => setEditFormGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-600 outline-none font-medium cursor-pointer"
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp / HP</label>
                    <input
                      type="text"
                      value={editFormPhone}
                      onChange={(e) => setEditFormPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Masukkan sandi baru jika ingin mengubah"
                    value={editFormPassword}
                    onChange={(e) => setEditFormPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-600 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Kosongkan jika tidak ingin mengubah kata sandi peserta.</p>
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditModalUser(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 btn-emerald font-semibold rounded-xl shadow-md flex items-center space-x-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: PREVIEW FOTO PESERTA */}
        {renderPreviewPhotoModal()}
      </div>
    );
  }

  // 3. REKAP DATA (TABEL SESI DENGAN AKSI DATA PRESENSI & DATA PENILAIAN)
  if (activeTab === 'rekap_data') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans relative">
        {/* Backdrop for 3-dots popup dismissal */}
        {activeSessionActionMenuId && (
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setActiveSessionActionMenuId(null)} 
          />
        )}

        {/* 1. Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Laporan & Rekapitulasi Data Training
            </h2>
          </div>

          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('recap')}
              className="px-2 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] sm:text-xs font-bold rounded-md flex items-center justify-center space-x-1 sm:space-x-2 shadow-xs transition-all cursor-pointer text-center min-h-[36px]"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Rekap Presensi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rekap_penilaian')}
              className="px-2 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] sm:text-xs font-bold rounded-md flex items-center justify-center space-x-1 sm:space-x-2 shadow-xs transition-all cursor-pointer text-center min-h-[36px]"
            >
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Rekap Penilaian</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportSessionExcel('ALL')}
              className="px-2 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-bold rounded-md flex items-center justify-center space-x-1 sm:space-x-2 shadow-xs transition-all cursor-pointer text-center min-h-[36px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Unduh Data</span>
            </button>
          </div>
        </div>

        {/* 2. Section Heading */}
        <div className="pt-2">
          <h3 className="text-sm md:text-base font-extrabold text-slate-900">
            Daftar Rekapitulasi Sesi Pelatihan
          </h3>
        </div>

        {/* 3. Master Table Sesi Pelatihan */}
        <div className="bg-white rounded-md border border-slate-200/80 shadow-xs overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 md:px-6 w-14 text-center">NO</th>
                  <th className="py-3.5 px-4 md:px-6 min-w-[280px]">JUDUL SESI</th>
                  <th className="py-3.5 px-4 md:px-6 min-w-[260px]">WAKTU & TEMPAT</th>
                  <th className="py-3.5 px-4 md:px-6 min-w-[220px]">PEMATERI</th>
                  <th className="py-3.5 px-4 md:px-6 w-20 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(training?.sessions || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      Belum ada sesi pelatihan terdaftar.
                    </td>
                  </tr>
                ) : (
                  training.sessions.map((ses, idx) => {
                    const isOpen = activeSessionActionMenuId === ses.id;
                    return (
                      <tr key={ses.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="py-4 px-4 md:px-6 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-4 px-4 md:px-6">
                          <span className="font-extrabold text-slate-900 text-xs md:text-sm">
                            {ses.title}
                          </span>
                        </td>
                        <td className="py-4 px-4 md:px-6">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5 text-slate-700 font-medium text-xs">
                              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{ses.time} • {ses.date}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{ses.room || 'Aula Utama Sekretariat HMI Cabang Bandar Lampung'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 md:px-6">
                          <div className="font-medium text-slate-700 text-xs md:text-sm">
                            {ses.speaker || 'Master of Training (MOT) BPL HMI'}
                          </div>
                        </td>
                        <td className="py-4 px-4 md:px-6 text-center relative overflow-visible">
                          <div className="inline-block relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSessionActionMenuId(isOpen ? null : ses.id);
                              }}
                              className={`p-2 rounded-xl transition-all cursor-pointer touch-manipulation ${
                                isOpen 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                              title="Opsi Aksi Sesi"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Floating Action Dropdown Popover */}
                            {isOpen && (
                              <div 
                                className="absolute right-0 top-full mt-1 sm:right-full sm:top-0 sm:mt-0 sm:mr-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
                                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    AKSI SESI
                                  </p>
                                </div>

                                <div className="p-1 space-y-0.5">
                                  {/* Action 1: Data Presensi */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSessionActionMenuId(null);
                                      setRecapModalSession(ses);
                                      setRecapModalFilter('ALL');
                                      setRecapSearchQuery('');
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer touch-manipulation"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Data Presensi</span>
                                  </button>

                                  {/* Action 2: Data Penilaian */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSessionActionMenuId(null);
                                      setPenilaianModalSession(ses);
                                      setPenilaianModalSearchQuery('');
                                      setPenilaianModalFilter('ALL');
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer touch-manipulation"
                                  >
                                    <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Data Penilaian</span>
                                  </button>
                                </div>
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
        </div>

        {/* MODAL DETAIL / EDIT PRESENSI SATU SESI (Ketika Aksi Data Presensi dipilih) */}
        {recapModalSession && recapModalSession !== 'ALL' && (
          <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
            <header className="bg-white border-b border-slate-200/90 px-4 md:px-6 py-3 flex items-center justify-between gap-3 shadow-xs shrink-0 z-30">
              <div className="flex items-center space-x-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setRecapModalSession(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-extrabold text-xs md:text-sm text-slate-900 tracking-tight truncate max-w-xs md:max-w-xl" title={`Presensi: ${recapModalSession.title || 'Detail Sesi'}`}>
                  Presensi: {recapModalSession.title || 'Detail Sesi'}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* Search Bar & Mobile Icon Filter */}
                <div className="relative w-28 sm:w-36 md:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari peserta..."
                    value={recapSearchQuery}
                    onChange={(e) => setRecapSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-6 py-1.5 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition-all truncate"
                  />
                  {recapSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRecapSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative shrink-0">
                  {/* Mobile View: Icon Button */}
                  <div className="sm:hidden relative w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                    <SlidersHorizontal className={`w-3.5 h-3.5 ${recapModalFilter !== 'ALL' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`} />
                    {recapModalFilter !== 'ALL' && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-600 ring-1 ring-white" />
                    )}
                    <select
                      value={recapModalFilter}
                      onChange={(e) => setRecapModalFilter(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      title="Filter Status"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="HADIR">Hadir</option>
                      <option value="IZIN">Izin</option>
                      <option value="TIDAK_HADIR">Tidak Hadir</option>
                      <option value="BELUM">Belum Hadir</option>
                    </select>
                  </div>
                  {/* Desktop View: Full Select Dropdown */}
                  <select
                    value={recapModalFilter}
                    onChange={(e) => setRecapModalFilter(e.target.value)}
                    className="hidden sm:block px-2.5 py-1.5 bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="HADIR">Hadir</option>
                    <option value="IZIN">Izin</option>
                    <option value="TIDAK_HADIR">Tidak Hadir</option>
                    <option value="BELUM">Belum Hadir</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportSessionExcel(recapModalSession)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecapModalSession(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Tutup Halaman"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Banner Mode Hanya Lihat jika Akses Presensi di-OFF-kan */}
            {!hasAttendanceAccess && (
              <div className="bg-amber-50/95 border-b border-amber-200 px-4 md:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0 z-20">
                <div className="flex items-center space-x-2 text-amber-900 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Mode Hanya Lihat:</strong> Akses pengelolaan presensi dinonaktifkan oleh Admin Utama. Anda dapat melihat data kehadiran namun tidak dapat memodifikasi status presensi.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAccessDenied('Akses Presensi & Scanner', 'Izin Akses Presensi & Scanner diperlukan untuk mengubah status kehadiran peserta atau melakukan pemindaian.')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Minta Akses Admin Utama
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto bg-white relative pb-24 md:pb-0">
              {recapModalActionMenuId && (
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setRecapModalActionMenuId(null)} 
                />
              )}
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-30 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 sm:py-3 px-1 sm:px-2 md:px-4 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center sticky top-0 left-0 z-40 bg-slate-100">No</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-3 md:px-5 min-w-[125px] sm:min-w-[200px] sticky top-0 left-[32px] sm:left-[40px] md:left-[48px] z-40 bg-slate-100 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">Nama Peserta</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 min-w-[110px] sm:min-w-[170px]">Asal Komisariat</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 min-w-[90px] sm:min-w-[130px]">Status</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 min-w-[100px] sm:min-w-[140px]">Waktu / Catatan</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 text-right w-12 sm:w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalSingleParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        Tidak ada data peserta yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    modalSingleParticipants.map((p, idx) => {
                      const targetSesId = recapModalSession.id;
                      const targetDbId = recapModalSession.db_id;
                      const att = p.attendances?.[targetSesId] || 
                                  (targetDbId && p.attendances?.[targetDbId]) ||
                                  (typeof targetSesId === 'string' && p.attendances?.[targetSesId.replace(/\D/g, '')]);
                      const isPresent = !!att?.present;
                      const isExcused = !isPresent && (att?.status === 'Izin' || att?.raw_status === 'permission');
                      const isAbsent = !isPresent && !isExcused && (att?.status === 'Tidak Hadir' || att?.raw_status === 'absent');
                      const excuseNote = att?.note || '';
                      const timeStr = att?.time || '-';

                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors group">
                          <td className="py-2 sm:py-3 px-1 sm:px-2 md:px-4 font-semibold text-slate-400 text-center sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 transition-colors text-[10px] sm:text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-5 sticky left-[32px] sm:left-[40px] md:left-[48px] z-20 bg-white group-hover:bg-slate-50/90 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)] transition-colors">
                            <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0">
                              <div 
                                onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all"
                                title="Klik untuk melihat foto profil peserta"
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
                              <div className="min-w-0 flex-1">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                  className="font-semibold text-slate-900 text-[11px] sm:text-xs md:text-sm truncate block cursor-pointer hover:text-emerald-700 transition-colors max-w-[95px] sm:max-w-none leading-tight"
                                  title={`${p.name} (Klik untuk lihat profil)`}
                                >
                                  {p.name}
                                </span>
                                {p.instansi && (
                                  <span className="text-[9px] sm:text-[10px] text-slate-400 truncate block sm:hidden max-w-[95px] leading-tight">
                                    {p.instansi}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 md:px-6">
                            <div className="text-slate-800 font-medium text-[10px] sm:text-xs truncate max-w-[130px] sm:max-w-none">{p.instansi}</div>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 md:px-6">
                            {isPresent ? (
                              <span className="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Hadir</span>
                              </span>
                            ) : isExcused ? (
                              <span className="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                <span>Izin</span>
                              </span>
                            ) : isAbsent ? (
                              <span className="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Tidak Hadir</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                <span>Belum Absen</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-slate-600">
                            {isPresent ? (
                              <span className="font-semibold text-emerald-700">{timeStr}</span>
                            ) : isExcused ? (
                              <span className="italic text-amber-700 font-medium">"{excuseNote || 'Berhalangan'}"</span>
                            ) : isAbsent ? (
                              <span className="italic text-rose-700 font-medium">"{excuseNote || 'Tidak Hadir'}"</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 md:px-6 text-right">
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecapModalActionMenuId(recapModalActionMenuId === p.id ? null : p.id);
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                                title="Ubah Status Presensi"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {recapModalActionMenuId === p.id && (
                                <div 
                                  className="absolute right-full top-0 mr-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{recapModalSession.id}</p>
                                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecapModalActionMenuId(null);
                                      handleSetPresensi(p, recapModalSession);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Set Hadir</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecapModalActionMenuId(null);
                                      setExcuseModalUser(p);
                                      setExcuseModalSessionId(recapModalSession.id);
                                      setExcuseReasonText(excuseNote || '');
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Set Izin / Alasan...</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecapModalActionMenuId(null);
                                      handleSetAbsent(p, recapModalSession);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Set Tidak Hadir (Alpa)</span>
                                  </button>

                                  <div className="border-t border-slate-100 my-1"></div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecapModalActionMenuId(null);
                                      handleResetAttendance(p, recapModalSession);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Reset ke Belum Absen</span>
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

            <footer className="px-4 md:px-6 py-2.5 border-t border-slate-200/90 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="font-semibold text-slate-600">
                Menampilkan {modalSingleParticipants.length} dari {participants.length} peserta
              </span>
              <span className="text-[11px] text-slate-400">
                PresenTrain System
              </span>
            </footer>
          </div>
        )}

        {/* MODAL DETAIL PENILAIAN SATU SESI (Ketika Aksi Data Penilaian dipilih - Sesuai Gambar 2) */}
        {penilaianModalSession && (
          <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
            {/* Header Bar */}
            <header className="bg-white border-b border-slate-200/90 px-4 md:px-6 py-3 flex items-center justify-between gap-3 shadow-xs shrink-0 z-30">
              <div className="flex items-center space-x-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPenilaianModalSession(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-extrabold text-xs md:text-sm text-slate-900 tracking-tight truncate max-w-xs md:max-w-xl" title={`Penilaian: ${penilaianModalSession.title || 'Detail Sesi'}`}>
                  Penilaian: {penilaianModalSession.title || 'Detail Sesi'}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* Search Bar */}
                {/* Search Bar & Mobile Icon Filter */}
                <div className="relative w-28 sm:w-36 md:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari peserta..."
                    value={penilaianModalSearchQuery}
                    onChange={(e) => setPenilaianModalSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-6 py-1.5 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition-all truncate"
                  />
                  {penilaianModalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPenilaianModalSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status / Predikat Filter Dropdown */}
                <div className="relative shrink-0">
                  {/* Mobile View: Icon Button */}
                  <div className="sm:hidden relative w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                    <SlidersHorizontal className={`w-3.5 h-3.5 ${penilaianModalFilter !== 'ALL' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`} />
                    {penilaianModalFilter !== 'ALL' && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-600 ring-1 ring-white" />
                    )}
                    <select
                      value={penilaianModalFilter}
                      onChange={(e) => setPenilaianModalFilter(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      title="Filter Predikat"
                    >
                      <option value="ALL">Semua Predikat</option>
                      <option value="Baik Sekali">Baik Sekali (80-100)</option>
                      <option value="Baik">Baik (70-79)</option>
                      <option value="Perbaikan">Perbaikan (60-69)</option>
                      <option value="Tidak Lulus">Tidak Lulus (&lt;60)</option>
                    </select>
                  </div>
                  {/* Desktop View: Full Select Dropdown */}
                  <select
                    value={penilaianModalFilter}
                    onChange={(e) => setPenilaianModalFilter(e.target.value)}
                    className="hidden sm:block px-2.5 py-1.5 bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="ALL">Semua Predikat</option>
                    <option value="Baik Sekali">Baik Sekali (80-100)</option>
                    <option value="Baik">Baik (70-79)</option>
                    <option value="Perbaikan">Perbaikan (60-69)</option>
                    <option value="Tidak Lulus">Tidak Lulus (&lt;60)</option>
                  </select>
                </div>

                {/* Unduh Data Button */}
                <button
                  type="button"
                  onClick={() => handleExportPenilaianExcel(penilaianModalSession)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh Data</span>
                </button>

                {/* Close Button (X) */}
                <button
                  type="button"
                  onClick={() => setPenilaianModalSession(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Tutup Halaman"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Banner Mode Hanya Lihat jika Akses Penilaian di-OFF-kan */}
            {!hasAssessmentAccess && (
              <div className="bg-amber-50/95 border-b border-amber-200 px-4 md:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0 z-20">
                <div className="flex items-center space-x-2 text-amber-900 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Mode Hanya Lihat:</strong> Akses penilaian dinonaktifkan oleh Admin Utama. Anda dapat melihat hasil penilaian sesi ini, namun pengelolaan/pengeditan nilai dikunci.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAccessDenied('Akses Penilaian Peserta', 'Izin Akses Penilaian Peserta diperlukan untuk mengedit nilai peserta.')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Minta Akses Admin Utama
                </button>
              </div>
            )}

            {/* Body Table */}
            <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-30 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 sm:py-3 px-1 sm:px-2 md:px-4 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center sticky top-0 left-0 z-40 bg-slate-100">No</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-3 md:px-5 min-w-[125px] sm:min-w-[180px] sticky top-0 left-[32px] sm:left-[40px] md:left-[48px] z-40 bg-slate-100 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">Nama Peserta</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 min-w-[130px] sm:min-w-[170px]">Asal Komisariat</th>
                    <th className="py-2.5 sm:py-3 px-1.5 sm:px-4 md:px-6 text-center min-w-[70px] sm:min-w-[110px]">Afektif (50%)</th>
                    <th className="py-2.5 sm:py-3 px-1.5 sm:px-4 md:px-6 text-center min-w-[70px] sm:min-w-[110px]">Kognitif (30%)</th>
                    <th className="py-2.5 sm:py-3 px-1.5 sm:px-4 md:px-6 text-center min-w-[75px] sm:min-w-[120px]">Psikomotorik (20%)</th>
                    <th className="py-2.5 sm:py-3 px-1.5 sm:px-4 md:px-6 text-center min-w-[70px] sm:min-w-[110px]">Nilai Akhir (NA)</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 md:px-6 text-center min-w-[110px] sm:min-w-[190px]">Status Penilaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalSessionAssessedParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        Tidak ada data peserta yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    modalSessionAssessedParticipants.map((p, idx) => {
                      const { afektif, kognitif, psikomotorik, finalScore, predicate, status, statusClass } = p.computed;
                      
                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors group">
                          <td className="py-2 sm:py-3 px-1 sm:px-2 md:px-4 font-semibold text-slate-400 text-center sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 transition-colors text-[10px] sm:text-xs">{idx + 1}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-5 sticky left-[32px] sm:left-[40px] md:left-[48px] z-20 bg-white group-hover:bg-slate-50/90 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)] transition-colors">
                            <div className="flex items-center space-x-2 sm:space-x-2.5">
                              <div 
                                onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all"
                                title="Klik untuk melihat foto profil peserta"
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
                              <div className="min-w-0">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                  className="font-semibold text-slate-900 text-[11px] sm:text-xs md:text-sm truncate block cursor-pointer hover:text-emerald-700 transition-colors max-w-[95px] sm:max-w-[160px] md:max-w-none"
                                  title={`${p.name} (Klik untuk lihat profil)`}
                                >
                                  {p.name}
                                </span>
                                {p.instansi && (
                                  <span className="text-[9px] sm:text-[10px] text-slate-400 truncate block sm:hidden max-w-[95px]">
                                    {p.instansi}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 md:px-6">
                            <div className="text-slate-800 font-medium text-[11px] sm:text-xs">{p.instansi || '-'}</div>
                          </td>
                          <td className="py-3 px-4 md:px-6 text-center font-mono font-bold text-emerald-700">
                            {afektif}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-center font-mono font-bold text-emerald-700">
                            {kognitif}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-center font-mono font-bold text-emerald-700">
                            {psikomotorik}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-center font-mono font-black text-slate-900 text-sm">
                            {finalScore}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${statusClass} shadow-2xs whitespace-nowrap`}>
                              {status === 'Lulus' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : status === 'Perbaikan' ? (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                              <span className="whitespace-nowrap">{status} ({predicate})</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Bar */}
            <footer className="px-4 md:px-6 py-2.5 border-t border-slate-200/90 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="font-semibold text-slate-600">
                Menampilkan {modalSessionAssessedParticipants.length} dari {assessedParticipants.length} peserta
              </span>
              <span className="text-[11px] text-slate-400">
                PresenTrain System
              </span>
            </footer>
          </div>
        )}

        {/* MODAL ALASAN IZIN / DISPENSASI */}
        {excuseModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-slate-100 my-auto">
              <button 
                onClick={() => setExcuseModalUser(null)} 
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center border border-amber-200 shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Form Izin / Dispensasi</h3>
                  <p className="text-xs text-slate-500">{excuseModalUser.name} ({excuseModalSessionId || 'Sesi Terkait'})</p>
                </div>
              </div>

              <form onSubmit={handleSaveExcuse} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilih Sesi Pelatihan yang Diberikan Izin</label>
                  <select
                    value={excuseModalSessionId || training?.sessions?.[0]?.id || 'SES-01'}
                    onChange={(e) => {
                      const newSid = e.target.value;
                      setExcuseModalSessionId(newSid);
                      const curNote = excuseModalUser.attendances?.[newSid]?.note;
                      if (curNote) setExcuseReasonText(curNote);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold cursor-pointer"
                  >
                    {(training?.sessions || []).map((ses, sIdx) => (
                      <option key={ses.id} value={ses.id}>
                        Sesi {sIdx + 1}: {ses.title} ({ses.time})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10.5px] text-slate-400 mt-1">Status Izin hanya akan berlaku khusus pada sesi yang dipilih ini.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alasan Berhalangan Hadir</label>
                  <textarea
                    rows={1}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                    value={excuseReasonText}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onChange={(e) => {
                      setExcuseReasonText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    placeholder="Contoh: Tugas luar kota / Sakit / Mengikuti agenda mendesak..."
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:border-amber-500 focus:bg-white outline-none resize-none overflow-hidden [field-sizing:content] min-h-[46px]"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setExcuseModalUser(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 shadow-md cursor-pointer"
                  >
                    Simpan Status Izin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FULL PAGE: DETAIL LEMBAR PENILAIAN INDIVIDUAL (INPUT / EDIT NILAI) */}
        {selectedParticipantForGrading && (
          <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
            {/* Header Bar */}
            <header className="bg-white border-b border-slate-200/90 px-4 md:px-8 py-3.5 flex items-center justify-between gap-3 shadow-xs shrink-0 z-30">
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedParticipantForGrading(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base shadow-2xs shrink-0">
                    {selectedParticipantForGrading.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight truncate max-w-xs sm:max-w-md">{selectedParticipantForGrading.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{selectedParticipantForGrading.instansi} • {selectedParticipantForGrading.email}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedParticipantForGrading(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                title="Tutup Halaman"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-slate-50">
              <div className="w-full max-w-7xl mx-auto space-y-5 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm">
                
                {/* Live Calculation Formula Card */}
                {(() => {
                  const ass = calculateAssessment(currentAssessments[selectedParticipantForGrading.id]);
                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Formula Nilai Akhir (NA)</span>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-base font-black text-slate-900 font-mono">
                            NA = {ass.finalScore} <span className="text-xs text-slate-500 font-sans">({ass.finalScore1000} Skala 1000)</span>
                          </span>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${ass.statusClass}`}>
                            {ass.status} ({ass.predicate})
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-center pt-1">
                        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Afektif (50%)</span>
                          <strong className="text-emerald-800 font-mono text-sm">{ass.afektif}</strong>
                          <span className="text-[10px] text-slate-500 block">x 0.50 = {(ass.afektif * 0.5).toFixed(1)}</span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Kognitif (30%)</span>
                          <strong className="text-blue-800 font-mono text-sm">{ass.kognitif}</strong>
                          <span className="text-[10px] text-slate-500 block">x 0.30 = {(ass.kognitif * 0.3).toFixed(1)}</span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Psikomotorik (20%)</span>
                          <strong className="text-teal-800 font-mono text-sm">{ass.psikomotorik}</strong>
                          <span className="text-[10px] text-slate-500 block">x 0.20 = {(ass.psikomotorik * 0.2).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Riwayat Log Pelanggaran & Tindakan */}
                {(() => {
                  const targetAss = currentAssessments[selectedParticipantForGrading.id] || {};
                  const rawVios = targetAss.violations;
                  const viosList = Array.isArray(rawVios) 
                    ? rawVios 
                    : (rawVios && typeof rawVios === 'object' ? Object.values(rawVios).filter(v => v && typeof v === 'object' && ('points' in v || 'item' in v)) : []);
                  const rawCons = targetAss.contributions;
                  const consList = Array.isArray(rawCons)
                    ? rawCons
                    : (Array.isArray(rawCons?.contributions) 
                      ? rawCons.contributions 
                      : (rawCons && typeof rawCons === 'object' ? Object.values(rawCons).filter(c => c && typeof c === 'object' && ('points' in c || 'item' in c)) : []));
                  const totalVioPoints = viosList.reduce((s, v) => s + (Math.abs(Number(v?.points)) || 0), 0);
                  const totalConPoints = consList.reduce((s, c) => s + (Math.abs(Number(c?.points)) || 0), 0);

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Box 1: Log Pelanggaran Afektif */}
                      <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                        <div className="flex items-center justify-between font-bold text-rose-950">
                          <span>Log Pelanggaran Afektif (Modal 100)</span>
                          <span className="text-rose-700 font-mono">
                            -{totalVioPoints} Poin
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {viosList.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px] py-3">Tidak ada catatan pelanggaran (Nilai 100 sempurna).</p>
                          ) : (
                            viosList.map((vio, vIdx) => (
                              <div key={vio.id || vIdx} className="p-2.5 rounded-xl bg-white border border-rose-100 flex items-center justify-between text-[11px] shadow-2xs">
                                <div className="truncate pr-2">
                                  <span className="font-bold text-rose-900 block truncate">{vio.item}</span>
                                  <span className="text-[9px] text-slate-400">{vio.sessionTitle || 'Sesi'} • {vio.timestamp || '-'}</span>
                                </div>
                                <div className="flex items-center space-x-1 shrink-0">
                                  <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">-{vio.points}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteViolation(selectedParticipantForGrading.id, vio.id)}
                                    className="p-1 hover:bg-rose-100 text-rose-400 hover:text-rose-700 rounded transition-colors"
                                    title="Hapus Pelanggaran"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setViolationPickerModal({ participant: selectedParticipantForGrading, session: penilaianModalSession || training?.sessions?.[0] })}
                          className="w-full py-2.5 bg-rose-100/80 hover:bg-rose-200/90 text-rose-900 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Catat Pelanggaran Baru...</span>
                        </button>
                      </div>

                      {/* Box 2: Log Keaktifan Psikomotorik */}
                      <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
                        <div className="flex items-center justify-between font-bold text-teal-950">
                          <span>Log Keaktifan Psikomotorik (Modal 50)</span>
                          <span className="text-teal-700 font-mono">
                            +{totalConPoints} Poin
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {consList.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px] py-3">Belum ada catatan keaktifan khusus (Nilai standar 50).</p>
                          ) : (
                            consList.map((con, cIdx) => (
                              <div key={con.id || cIdx} className="p-2.5 rounded-xl bg-white border border-teal-100 flex items-center justify-between text-[11px] shadow-2xs">
                                <div className="truncate pr-2">
                                  <span className="font-bold text-teal-900 block truncate">{con.item}</span>
                                  <span className="text-[9px] text-slate-400">{con.sessionTitle || 'Sesi'} • {con.timestamp || '-'}</span>
                                </div>
                                <div className="flex items-center space-x-1 shrink-0">
                                  <span className="font-mono font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded text-[10px]">+{con.points}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteContribution(selectedParticipantForGrading.id, con.id)}
                                    className="p-1 hover:bg-teal-100 text-teal-400 hover:text-teal-700 rounded transition-colors"
                                    title="Hapus Keaktifan"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setContributionPickerModal({ participant: selectedParticipantForGrading, session: penilaianModalSession || training?.sessions?.[0] })}
                          className="w-full py-2.5 bg-teal-100/80 hover:bg-teal-200/90 text-teal-900 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Catat Keaktifan Baru...</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Form Input Kognitif & Catatan Kualitatif */}
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Nilai Kognitif (30%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentAssessments[selectedParticipantForGrading.id]?.kognitif ?? 75}
                        onChange={(e) => handleUpdateKognitifScore(selectedParticipantForGrading.id, e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Catatan Kualitatif / Evaluasi Pemandu</label>
                      <input
                        type="text"
                        value={currentAssessments[selectedParticipantForGrading.id]?.qualitativeNote || ''}
                        onChange={(e) => handleSaveQualitativeNote(selectedParticipantForGrading.id, e.target.value)}
                        placeholder="Contoh: Sangat aktif, analisis kritis pada materi..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Bar */}
            <footer className="bg-white border-t border-slate-200/90 px-4 md:px-8 py-3.5 flex items-center justify-between shrink-0 z-30">
              <span className="text-xs text-slate-500 font-medium">
                PresenTrain Assessment Engine
              </span>
              <button
                type="button"
                onClick={() => setSelectedParticipantForGrading(null)}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                Selesai & Simpan
              </button>
            </footer>
          </div>
        )}

        {/* MODAL TERPADU PILIHAN SIKAP (AFEKTIF, KOGNITIF, PSIKOMOTORIK) */}
        {renderUnifiedAttitudeModal()}

        {/* MODAL PREVIEW FOTO PESERTA */}
        {renderPreviewPhotoModal()}
      </div>
    );
  }

  // 4. REKAPITULASI PRESENSI (`recap`)
  if (activeTab === 'recap') {
    

  const totalP = (participants || []).length;
    const sessionsList = training?.sessions || [];
    const totalSlots = totalP * (sessionsList.length || 1);
    let totalPresentSlots = 0;
    let allPresentCount = 0;
    let anyExcusedCount = 0;
    let anyAbsentCount = 0;

    (participants || []).forEach(p => {
      let pPres = 0;
      let pEx = 0;
      sessionsList.forEach(s => {
        const att = p.attendances?.[s.id] || (s.db_id && p.attendances?.[s.db_id]) || (typeof s.id === 'string' && p.attendances?.[s.id.replace(/\D/g, '')]);
        if (att?.present) pPres++;
        else if (att?.status === 'Izin' || att?.raw_status === 'permission') pEx++;
      });
      totalPresentSlots += pPres;
      if (pPres === sessionsList.length) allPresentCount++;
      if (pEx > 0) anyExcusedCount++;
      if (pPres + pEx < sessionsList.length) anyAbsentCount++;
    });

    const allSessionsAvgPct = totalSlots > 0 ? Number(((totalPresentSlots / totalSlots) * 100).toFixed(1)) : 0;

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans relative">
        {/* 1. Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else if (setActiveTab) {
                  setActiveTab('attendance');
                }
              }}
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200/80 shadow-2xs shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Laporan Rekapitulasi Presensi Seluruh Sesi
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExportSessionExcel('ALL')}
              className="px-4 py-2.5 btn-emerald text-xs font-semibold rounded-2xl flex items-center justify-center space-x-2 shadow-md active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor File Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* 2. 4 KPI Summary Cards (All Green Circular Rings Sesuai Rekap Penilaian) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Rata Kehadiran */}
          <div className="light-card rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md transition-all">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" className="stroke-emerald-100/80" strokeWidth="4.2" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="4.2"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={(2 * Math.PI * 19) * (1 - Math.min(1, allSessionsAvgPct / 100))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight font-mono">
                  {allSessionsAvgPct}%
                </span>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2.5 tracking-tight">
              Rata Kehadiran
            </span>
          </div>

          {/* Card 2: Hadir Penuh */}
          <div className="light-card rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md transition-all">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" className="stroke-emerald-100/80" strokeWidth="4.2" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="4.2"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={(2 * Math.PI * 19) * (1 - (totalP > 0 ? allPresentCount / totalP : 0))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight font-mono">
                  {allPresentCount}
                </span>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2.5 tracking-tight">
              Hadir Penuh (100%)
            </span>
          </div>

          {/* Card 3: Izin / Dispensasi */}
          <div className="light-card rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md transition-all">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" className="stroke-emerald-100/80" strokeWidth="4.2" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="4.2"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={(2 * Math.PI * 19) * (1 - (totalP > 0 ? anyExcusedCount / totalP : 0))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight font-mono">
                  {anyExcusedCount}
                </span>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2.5 tracking-tight">
              Izin / Dispensasi
            </span>
          </div>

          {/* Card 4: Belum Absen */}
          <div className="light-card rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md transition-all">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" className="stroke-emerald-100/80" strokeWidth="4.2" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="4.2"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={(2 * Math.PI * 19) * (1 - (totalP > 0 ? anyAbsentCount / totalP : 0))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight font-mono">
                  {anyAbsentCount}
                </span>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2.5 tracking-tight">
              Belum Absen
            </span>
          </div>
        </div>

        {/* 3. Search & Filter Bar (Side-by-side with icon filters on mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama peserta, email, komisariat..."
              value={recapSearchQuery}
              onChange={(e) => setRecapSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-white rounded-md border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 outline-none font-medium transition-colors shadow-xs truncate"
            />
            {recapSearchQuery && (
              <button
                type="button"
                onClick={() => setRecapSearchQuery('')}
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Hapus Pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter 1: Asal Komisariat */}
          <div className="relative shrink-0">
            {/* Mobile View: Icon Button */}
            <div className="sm:hidden relative w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-md shadow-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              <Building2 className={`w-4 h-4 ${recapModalKomisariatFilter !== 'ALL' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`} />
              {recapModalKomisariatFilter !== 'ALL' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-600 ring-1 ring-white" />
              )}
              <select
                value={recapModalKomisariatFilter}
                onChange={(e) => setRecapModalKomisariatFilter(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Filter Asal Komisariat"
              >
                <option value="ALL">Semua Asal Komisariat</option>
                {KOMISARIAT_LIST.map((kom, kIdx) => (
                  <option key={kIdx} value={kom}>{kom}</option>
                ))}
              </select>
            </div>
            {/* Desktop View: Full Select Dropdown */}
            <select
              value={recapModalKomisariatFilter}
              onChange={(e) => setRecapModalKomisariatFilter(e.target.value)}
              className="hidden sm:block px-3 py-2 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
            >
              <option value="ALL">Semua Asal Komisariat</option>
              {KOMISARIAT_LIST.map((kom, kIdx) => (
                <option key={kIdx} value={kom}>{kom}</option>
              ))}
            </select>
          </div>

          {/* Filter 2: Status Kehadiran */}
          <div className="relative shrink-0">
            {/* Mobile View: Icon Button */}
            <div className="sm:hidden relative w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-md shadow-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              <SlidersHorizontal className={`w-4 h-4 ${recapModalFilter !== 'ALL' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`} />
              {recapModalFilter !== 'ALL' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-600 ring-1 ring-white" />
              )}
              <select
                value={recapModalFilter}
                onChange={(e) => setRecapModalFilter(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Filter Status Kehadiran"
              >
                <option value="ALL">Semua Status Kehadiran</option>
                <option value="HADIR_ALL">Hadir Semua Sesi (100%)</option>
                <option value="IZIN_ANY">Ada Izin Sesi</option>
                <option value="BELUM_ANY">Ada Belum Absen</option>
              </select>
            </div>
            {/* Desktop View: Full Select Dropdown */}
            <select
              value={recapModalFilter}
              onChange={(e) => setRecapModalFilter(e.target.value)}
              className="hidden sm:block px-3 py-2 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
            >
              <option value="ALL">Semua Status Kehadiran</option>
              <option value="HADIR_ALL">Hadir Semua Sesi (100%)</option>
              <option value="IZIN_ANY">Ada Izin Sesi</option>
              <option value="BELUM_ANY">Ada Belum Absen</option>
            </select>
          </div>
        </div>

        {/* 4. Master Table Matrix Semua Sesi */}
        <div className="bg-white rounded-md border border-slate-200/80 shadow-xs overflow-hidden mb-24 md:mb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-30 border-b border-slate-200 shadow-2xs">
                <tr className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 md:px-3 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center sticky top-0 left-0 z-40 bg-slate-100">No</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 min-w-[125px] sm:min-w-[180px] sticky top-0 left-[32px] sm:left-[40px] md:left-[48px] z-40 bg-slate-100 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">Nama Peserta</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 min-w-[130px] sm:min-w-[180px]">Asal Komisariat</th>
                  {training.sessions.map((ses, sIdx) => {
                    // Pisahkan judul menjadi 2 baris: Baris 1: Sesi X, Baris 2: Nama Materi (tanpa jam/waktu)
                    let sessionLabel = `SESI ${sIdx + 1}`;
                    let sessionSubtitle = ses.title;

                    if (ses.title.includes(':')) {
                      const colonIdx = ses.title.indexOf(':');
                      sessionLabel = ses.title.substring(0, colonIdx).trim().toUpperCase();
                      sessionSubtitle = ses.title.substring(colonIdx + 1).trim();
                    } else if (/^sesi\s*\d+/i.test(ses.title)) {
                      const match = ses.title.match(/^(sesi\s*\d+)\s*[-:]?\s*(.*)$/i);
                      if (match) {
                        sessionLabel = match[1].trim().toUpperCase();
                        sessionSubtitle = match[2]?.trim() || '';
                      }
                    }

                    return (
                      <th 
                        key={ses.id} 
                        className="py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-center min-w-[105px] sm:min-w-[130px] max-w-[140px] sm:max-w-[170px] border-l border-slate-200/80 bg-slate-100/90 cursor-pointer hover:bg-emerald-50/70 transition-colors select-none"
                        onClick={() => {
                          setRecapModalSession(ses);
                          setRecapModalFilter('ALL');
                          setRecapSearchQuery('');
                        }}
                        title={`Klik untuk melihat / mengubah data presensi ${ses.title}`}
                      >
                        <div className="flex flex-col items-center justify-center text-center">
                          <span className="font-extrabold text-[10px] sm:text-[11px] text-slate-900 tracking-tight leading-tight uppercase">
                            {sessionLabel}
                          </span>
                          {sessionSubtitle && (
                            <span 
                              className="text-[9px] sm:text-[10px] font-semibold text-slate-600 leading-tight line-clamp-2 mt-0.5" 
                              title={sessionSubtitle}
                            >
                              {sessionSubtitle}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 text-center min-w-[70px] sm:min-w-[95px] border-l border-slate-200/80 bg-slate-100/90 text-slate-800 font-extrabold text-[10px] sm:text-[11px]">
                    Total Hadir
                  </th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 text-center min-w-[75px] sm:min-w-[95px] border-l border-slate-200/80 bg-slate-100/90 text-slate-800 font-extrabold text-[10px] sm:text-[11px]">
                    Persentase
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modalAllParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={5 + training.sessions.length} className="py-12 text-center text-slate-400 font-medium">
                      Tidak ada data peserta yang sesuai dengan pencarian / filter ini.
                    </td>
                  </tr>
                ) : (
                  modalAllParticipants.map((p, idx) => {
                    let presentCount = 0;
                    training.sessions.forEach((ses) => {
                      const att = p.attendances?.[ses.id] || (ses.db_id && p.attendances?.[ses.db_id]) || (typeof ses.id === 'string' && p.attendances?.[ses.id.replace(/\D/g, '')]);
                      if (att?.present) presentCount++;
                    });
                    const totalSes = training.sessions.length;
                    const pct = totalSes > 0 ? Math.round((presentCount / totalSes) * 100) : 0;
                    const pctBadgeClass = pct >= 75 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : (pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200');

                    return (
                      <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors group">
                        <td className="py-2 sm:py-3.5 px-1 sm:px-2 md:px-3 font-semibold text-slate-400 text-center sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 transition-colors text-[10px] sm:text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3 md:px-5 sticky left-[32px] sm:left-[40px] md:left-[48px] z-20 bg-white group-hover:bg-slate-50/90 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)] transition-colors">
                          <div className="flex items-center space-x-2 sm:space-x-2.5">
                            <div 
                              onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all"
                              title="Klik untuk melihat foto profil peserta"
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
                            <div className="min-w-0">
                              <span 
                                onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                className="font-semibold text-slate-900 text-[11px] sm:text-xs md:text-sm truncate block cursor-pointer hover:text-emerald-700 transition-colors max-w-[95px] sm:max-w-[160px] md:max-w-none"
                                title={`${p.name} (Klik untuk lihat profil)`}
                              >
                                {p.name}
                              </span>
                              {p.instansi && (
                                <span className="text-[9px] sm:text-[10px] text-slate-400 truncate block sm:hidden max-w-[95px]">
                                  {p.instansi}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3 md:px-5">
                          <div className="text-slate-800 font-medium text-[11px] sm:text-xs">{p.instansi}</div>
                        </td>
                        
                        {/* Kolom-kolom Sesi */}
                        {training.sessions.map((ses) => {
                          const att = p.attendances?.[ses.id] || (ses.db_id && p.attendances?.[ses.db_id]) || (typeof ses.id === 'string' && p.attendances?.[ses.id.replace(/\D/g, '')]);
                          const isPresent = !!att?.present;
                          const isExcused = !isPresent && (att?.status === 'Izin' || att?.raw_status === 'permission');
                          const isAbsent = !isPresent && !isExcused && (att?.status === 'Tidak Hadir' || att?.raw_status === 'absent');
                          const excuseNote = att?.note || '';

                          return (
                            <td 
                              key={ses.id} 
                              className="py-2 sm:py-3.5 px-1.5 sm:px-3 md:px-4 text-center border-l border-slate-100 cursor-pointer hover:bg-emerald-50/50"
                              onClick={() => {
                                setRecapModalSession(ses);
                                setRecapSearchQuery(p.name);
                              }}
                              title="Klik untuk ubah presensi peserta pada sesi ini"
                            >
                              {isPresent ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                                  <span>Hadir</span>
                                </span>
                              ) : isExcused ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap" title={excuseNote}>
                                  <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
                                  <span>Izin</span>
                                </span>
                              ) : isAbsent ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs whitespace-nowrap" title={excuseNote || 'Tidak Hadir / Alpa'}>
                                  <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 shrink-0" />
                                  <span>Tidak Hadir</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200 whitespace-nowrap">
                                  <span>Belum Absen</span>
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Kolom Total Hadir */}
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3 md:px-5 text-center border-l border-slate-100 font-bold text-slate-900 text-[11px] sm:text-xs md:text-sm font-mono">
                          {presentCount}
                        </td>

                        {/* Kolom Persentase */}
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3 md:px-5 text-center border-l border-slate-100">
                          <span className={`inline-block px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border font-mono ${pctBadgeClass}`}>
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Full-Width Clean Footer */}
          <footer className="px-6 py-3.5 border-t border-slate-200/90 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">
              Menampilkan {modalAllParticipants.length} dari {participants.length} peserta terdaftar
            </span>
            <span className="text-[11px] text-slate-400">
              PresenTrain Digital Attendance System
            </span>
          </footer>
        </div>

        {/* MODAL DETAIL / EDIT PRESENSI SATU SESI */}
        {recapModalSession && recapModalSession !== 'ALL' && (
          <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
            {/* Header Bar */}
            <header className="bg-white border-b border-slate-200/90 px-4 md:px-6 py-3 flex items-center justify-between gap-3 shadow-xs shrink-0 z-30">
              <div className="flex items-center space-x-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setRecapModalSession(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-extrabold text-xs md:text-sm text-slate-900 tracking-tight truncate max-w-xs md:max-w-xl" title={`Presensi: ${recapModalSession.title || 'Detail Sesi'}`}>
                  Presensi: {recapModalSession.title || 'Detail Sesi'}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <div className="relative w-36 md:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari peserta..."
                    value={recapSearchQuery}
                    onChange={(e) => setRecapSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition-all"
                  />
                  {recapSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRecapSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative shrink-0">
                  <select
                    value={recapModalFilter}
                    onChange={(e) => setRecapModalFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="HADIR">Hadir</option>
                    <option value="IZIN">Izin</option>
                    <option value="BELUM">Belum Hadir</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportSessionExcel(recapModalSession)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecapModalSession(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Tutup Halaman"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Banner Mode Hanya Lihat jika Akses Presensi di-OFF-kan */}
            {!hasAttendanceAccess && (
              <div className="bg-amber-50/95 border-b border-amber-200 px-4 md:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0 z-20">
                <div className="flex items-center space-x-2 text-amber-900 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Mode Hanya Lihat:</strong> Akses pengelolaan presensi dinonaktifkan oleh Admin Utama. Anda dapat melihat data presensi namun tidak dapat mengubah status kehadiran peserta.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAccessDenied('Akses Presensi & Scanner', 'Izin Akses Presensi & Scanner diperlukan untuk mengubah status kehadiran peserta atau melakukan pemindaian.')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Minta Akses Admin Utama
                </button>
              </div>
            )}

            {/* Body Table */}
            <div className="flex-1 overflow-auto bg-white relative">
              {recapModalActionMenuId && (
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setRecapModalActionMenuId(null)} 
                />
              )}
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 md:px-6 w-12 text-center">No</th>
                    <th className="py-3 px-4 md:px-6 min-w-[180px]">Nama Peserta</th>
                    <th className="py-3 px-4 md:px-6 min-w-[170px]">Asal Komisariat</th>
                    <th className="py-3 px-4 md:px-6 min-w-[130px]">Status</th>
                    <th className="py-3 px-4 md:px-6 min-w-[140px]">Waktu / Catatan</th>
                    <th className="py-3 px-4 md:px-6 text-right w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalSingleParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        Tidak ada data peserta yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    modalSingleParticipants.map((p, idx) => {
                      const targetSesId = recapModalSession.id;
                      const targetDbId = recapModalSession.db_id;
                      const att = p.attendances?.[targetSesId] || 
                                  (targetDbId && p.attendances?.[targetDbId]) ||
                                  (typeof targetSesId === 'string' && p.attendances?.[targetSesId.replace(/\D/g, '')]);
                      const isPresent = !!att?.present;
                      const isExcused = !isPresent && (att?.status === 'Izin' || att?.raw_status === 'permission');
                      const isAbsent = !isPresent && !isExcused && (att?.status === 'Tidak Hadir' || att?.raw_status === 'absent');
                      const excuseNote = att?.note || '';
                      const timeStr = att?.time || '-';

                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-3 px-4 md:px-6 font-semibold text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-3 px-4 md:px-6">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative">
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
                              <span className="font-semibold text-slate-900 text-xs md:text-sm">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 md:px-6">
                            <div className="text-slate-800 font-medium">{p.instansi}</div>
                          </td>
                          <td className="py-3 px-4 md:px-6">
                            {isPresent ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Hadir</span>
                              </span>
                            ) : isExcused ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                <span>Izin</span>
                              </span>
                            ) : isAbsent ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Tidak Hadir</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                <span>Belum Absen</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-slate-600">
                            {isPresent ? (
                              <span className="font-semibold text-emerald-700">{timeStr}</span>
                            ) : isExcused ? (
                              <span className="italic text-amber-700 font-medium">"{excuseNote || 'Berhalangan'}"</span>
                            ) : isAbsent ? (
                              <span className="italic text-rose-700 font-medium">"{excuseNote || 'Tidak Hadir'}"</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 md:px-6 text-right relative overflow-visible">
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecapModalActionMenuId(recapModalActionMenuId === p.id ? null : p.id);
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer touch-manipulation"
                                title="Ubah Status Presensi"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {recapModalActionMenuId === p.id && (
                                <div 
                                  className="absolute right-0 top-full mt-1 sm:right-full sm:top-0 sm:mt-0 sm:mr-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{recapModalSession.id}</p>
                                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecapModalActionMenuId(null);
                                      handleSetPresensi(p, recapModalSession);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer touch-manipulation"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Set Hadir</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecapModalActionMenuId(null);
                                      setExcuseModalUser(p);
                                      setExcuseModalSessionId(recapModalSession.id);
                                      setExcuseReasonText(excuseNote || '');
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer touch-manipulation"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Set Izin / Alasan...</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecapModalActionMenuId(null);
                                      handleSetAbsent(p, recapModalSession);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer touch-manipulation"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Set Tidak Hadir (Alpa)</span>
                                  </button>

                                  <div className="border-t border-slate-100 my-1"></div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecapModalActionMenuId(null);
                                      handleResetAttendance(p, recapModalSession);
                                    }}
                                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer touch-manipulation"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Reset ke Belum Absen</span>
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

            <footer className="px-4 md:px-6 py-2.5 border-t border-slate-200/90 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="font-semibold text-slate-600">
                Menampilkan {modalSingleParticipants.length} dari {participants.length} peserta
              </span>
              <span className="text-[11px] text-slate-400">
                PresenTrain System
              </span>
            </footer>
          </div>
        )}

        {/* MODAL ALASAN IZIN / DISPENSASI */}
        {excuseModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-slate-100 my-auto">
              <button 
                onClick={() => setExcuseModalUser(null)} 
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center border border-amber-200 shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Form Izin / Dispensasi</h3>
                  <p className="text-xs text-slate-500">{excuseModalUser.name} ({excuseModalSessionId || 'Sesi Terkait'})</p>
                </div>
              </div>

              <form onSubmit={handleSaveExcuse} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Pilih Sesi Pelatihan yang Diberikan Izin</label>
                  <select
                    value={excuseModalSessionId || training?.sessions?.[0]?.id || 'SES-01'}
                    onChange={(e) => {
                      const newSid = e.target.value;
                      setExcuseModalSessionId(newSid);
                      const curNote = excuseModalUser.attendances?.[newSid]?.note;
                      if (curNote) setExcuseReasonText(curNote);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-amber-500 focus:bg-white text-xs font-semibold cursor-pointer"
                  >
                    {(training?.sessions || []).map((ses, sIdx) => (
                      <option key={ses.id} value={ses.id}>
                        Sesi {sIdx + 1}: {ses.title} ({ses.time})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10.5px] text-slate-400 mt-1">Status Izin hanya akan berlaku khusus pada sesi yang dipilih ini.</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alasan Izin / Berhalangan:
                  </label>
                  <textarea
                    rows={1}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                    required
                    value={excuseReasonText}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onChange={(e) => {
                      setExcuseReasonText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    placeholder="Contoh: Sakit, Dinas luar kota, Dispensasi ormawa..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 focus:border-amber-600 outline-none text-xs resize-none overflow-hidden [field-sizing:content] min-h-[46px]"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setExcuseModalUser(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors"
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

        {/* MODAL PREVIEW FOTO PESERTA */}
        {renderPreviewPhotoModal()}
      </div>
    );
  }


  // 4. REKAPITULASI PENILAIAN PESERTA LK 1 (`rekap_penilaian`)
  if (activeTab === 'rekap_penilaian') {
    const safeAssessed = Array.isArray(assessedParticipants) ? assessedParticipants : [];
    const totalPeserta = safeAssessed.length;
    const passedCount = safeAssessed.filter(p => p?.computed?.isPassed).length;
    const passedPct = totalPeserta > 0 ? Math.round((passedCount / totalPeserta) * 100) : 0;
    const avgScore = totalPeserta > 0 ? Number((safeAssessed.reduce((sum, p) => sum + (p?.computed?.finalScore || 0), 0) / totalPeserta).toFixed(1)) : 0;
    const avgScore1000 = Math.round(avgScore * 10);
    const baikSekaliCount = safeAssessed.filter(p => p?.computed?.predicate === 'Baik Sekali').length;
    const baikCount = safeAssessed.filter(p => p?.computed?.predicate === 'Baik').length;
    const cukupCount = safeAssessed.filter(p => p?.computed?.status === 'Perbaikan').length;
    const tidakLulusCount = safeAssessed.filter(p => p?.computed?.status === 'Tidak Lulus').length;

    // Filter list kelas binaan / kelas tersedia sesuai peran
    const userRole = currentUser?.role || 'admin';
    const isSuperAdmin = userRole === 'super_admin';
    const rawManaged = Array.isArray(currentUser?.managed_classes) ? currentUser.managed_classes : [];
    const rawClasses = Array.isArray(classes) ? classes : [];
    const availableClassOptions = isSuperAdmin ? rawClasses : (rawManaged.length > 0 ? rawManaged : rawClasses);

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans relative">
        {/* Backdrop for 3-dots popup dismissal */}
        {activeAssessmentActionMenuId && (
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setActiveAssessmentActionMenuId(null)} 
          />
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else if (setActiveTab) {
                  setActiveTab('assessments');
                }
              }}
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200/80 shadow-2xs shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Laporan Rekapitulasi Nilai Akhir Peserta</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Rekapitulasi seluruh nilai afektif, kognitif, psikomotorik, dan kelulusan peserta pelatihan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Dropdown Kategori Kelas */}
            <div className="relative flex items-center">
              <div className="relative flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-emerald-500 transition-colors">
                <div className="pl-3 py-2 flex items-center pointer-events-none text-emerald-700">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <select
                  value={selectedClassId || 'ALL'}
                  onChange={(e) => {
                    const newClassId = e.target.value;
                    if (typeof setSelectedClassId === 'function') {
                      setSelectedClassId(newClassId);
                    }
                  }}
                  className="pl-2 pr-8 py-2 bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer appearance-none"
                  title="Pilih Kategori Kelas"
                >
                  <option value="ALL">Semua Kelas ({Array.isArray(participants) ? participants.length : 0} Peserta)</option>
                  {isSuperAdmin && (
                    <option value="general">Kelas Umum (Tanpa Kelas)</option>
                  )}
                  {availableClassOptions.map((c) => {
                    const countInClass = (Array.isArray(participants) ? participants : []).filter(p => String(p.class_id) === String(c.id)).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name || `Kelas ${c.id}`} ({countInClass} Peserta)
                      </option>
                    );
                  })}
                </select>
                <div className="pr-2.5 pointer-events-none text-slate-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportPenilaianExcel}
              className="px-4 py-2.5 btn-emerald text-xs font-semibold rounded-2xl flex items-center justify-center space-x-2 shadow-md active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor File Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* Banner Mode Hanya Lihat jika Akses Penilaian di-OFF-kan */}
        {!hasAssessmentAccess && (
          <div className="bg-amber-50/95 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs animate-fade-in">
            <div className="flex items-center space-x-3 text-amber-900">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm">Mode Hanya Lihat: Akses Penilaian Dibatasi</p>
                <p className="text-[11px] text-amber-800/80 mt-0.5">
                  Izin pengelolaan dan pengeditan nilai peserta dinonaktifkan oleh Admin Utama. Anda dapat memantau data rekapitulasi nilai, tetapi fitur pengubahan nilai dan catatan kualitatif dikunci.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerAccessDenied('Akses Penilaian Peserta', 'Izin Akses Penilaian Peserta diperlukan untuk mengedit nilai kognitif, afektif, psikomotorik, serta catatan kualitatif.')}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer shrink-0"
            >
              Minta Akses Admin Utama
            </button>
          </div>
        )}

        {/* 4 KPI Summary Cards - Style Circular Ring Sesuai Gambar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* Card 1: Rata-Rata Nilai */}
          <div className="light-card rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md transition-all">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" className="stroke-emerald-100/80" strokeWidth="4.2" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="4.2"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={(2 * Math.PI * 19) * (1 - Math.min(1, avgScore / 100))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight font-mono">
                  {avgScore}
                </span>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2.5 tracking-tight">
              Rata-Rata Nilai
            </span>
          </div>

          {/* Card 2: Tingkat Lulus */}
          <div className="light-card rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md transition-all">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" className="stroke-emerald-100/80" strokeWidth="4.2" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="4.2"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={(2 * Math.PI * 19) * (1 - Math.min(1, passedPct / 100))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight font-mono">
                  {passedPct}%
                </span>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2.5 tracking-tight">
              Tingkat Lulus
            </span>
          </div>

          {/* Card 3: Baik Sekali & Baik */}
          <div className="light-card rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md transition-all">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" className="stroke-emerald-100/80" strokeWidth="4.2" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="4.2"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={(2 * Math.PI * 19) * (1 - (totalPeserta > 0 ? (baikSekaliCount + baikCount) / totalPeserta : 0))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight font-mono">
                  {baikSekaliCount + baikCount}
                </span>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2.5 tracking-tight">
              Baik Sekali & Baik
            </span>
          </div>

          {/* Card 4: Perbaikan & Gagal */}
          <div className="light-card rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md transition-all">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" className="stroke-emerald-100/80" strokeWidth="4.2" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="19"
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="4.2"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={(2 * Math.PI * 19) * (1 - (totalPeserta > 0 ? (cukupCount + tidakLulusCount) / totalPeserta : 0))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight font-mono">
                  {cukupCount + tidakLulusCount}
                </span>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 mt-2.5 tracking-tight">
              Perbaikan & Gagal
            </span>
          </div>

        </div>

        {/* Filter & Search Bar (Side-by-side with icon filters on mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama peserta, email, komisariat..."
              value={penilaianSearchQuery}
              onChange={(e) => setPenilaianSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-white rounded-md border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 outline-none font-medium transition-colors shadow-xs truncate"
            />
            {penilaianSearchQuery && (
              <button
                type="button"
                onClick={() => setPenilaianSearchQuery('')}
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Hapus Pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter 0: Kategori Kelas */}
          <div className="relative shrink-0">
            {/* Mobile View: Icon Button */}
            <div className="sm:hidden relative w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-md shadow-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              <GraduationCap className={`w-4 h-4 ${selectedClassId !== 'ALL' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`} />
              {selectedClassId !== 'ALL' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-600 ring-1 ring-white" />
              )}
              <select
                value={selectedClassId || 'ALL'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (typeof setSelectedClassId === 'function') {
                    setSelectedClassId(val);
                  }
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Filter Kategori Kelas"
              >
                <option value="ALL">Semua Kelas</option>
                {isSuperAdmin && (
                  <option value="general">Kelas Umum</option>
                )}
                {availableClassOptions.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name || `Kelas ${cls.id}`}
                  </option>
                ))}
              </select>
            </div>
            {/* Desktop View: Full Select Dropdown */}
            <select
              value={selectedClassId || 'ALL'}
              onChange={(e) => {
                const val = e.target.value;
                if (typeof setSelectedClassId === 'function') {
                  setSelectedClassId(val);
                }
              }}
              className="hidden sm:block px-3 py-2 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
            >
              <option value="ALL">Semua Kelas ({Array.isArray(participants) ? participants.length : 0})</option>
              {isSuperAdmin && (
                <option value="general">Kelas Umum</option>
              )}
              {availableClassOptions.map((cls) => {
                const countInClass = (Array.isArray(participants) ? participants : []).filter(p => String(p.class_id) === String(cls.id)).length;
                return (
                  <option key={cls.id} value={cls.id}>
                    {cls.name || `Kelas ${cls.id}`} ({countInClass})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filter 1: Asal Komisariat */}
          <div className="relative shrink-0">
            {/* Mobile View: Icon Button */}
            <div className="sm:hidden relative w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-md shadow-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              <Building2 className={`w-4 h-4 ${penilaianFilterKomisariat !== 'ALL' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`} />
              {penilaianFilterKomisariat !== 'ALL' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-600 ring-1 ring-white" />
              )}
              <select
                value={penilaianFilterKomisariat}
                onChange={(e) => setPenilaianFilterKomisariat(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Filter Asal Komisariat"
              >
                <option value="ALL">Semua Asal Komisariat</option>
                {KOMISARIAT_LIST.map((kom, kIdx) => (
                  <option key={kIdx} value={kom}>{kom}</option>
                ))}
              </select>
            </div>
            {/* Desktop View: Full Select Dropdown */}
            <select
              value={penilaianFilterKomisariat}
              onChange={(e) => setPenilaianFilterKomisariat(e.target.value)}
              className="hidden sm:block px-3 py-2 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
            >
              <option value="ALL">Semua Asal Komisariat</option>
              {KOMISARIAT_LIST.map((kom, kIdx) => (
                <option key={kIdx} value={kom}>{kom}</option>
              ))}
            </select>
          </div>

          {/* Filter 2: Status Kelulusan */}
          <div className="relative shrink-0">
            {/* Mobile View: Icon Button */}
            <div className="sm:hidden relative w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-md shadow-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              <SlidersHorizontal className={`w-4 h-4 ${penilaianFilterStatus !== 'ALL' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`} />
              {penilaianFilterStatus !== 'ALL' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-600 ring-1 ring-white" />
              )}
              <select
                value={penilaianFilterStatus}
                onChange={(e) => setPenilaianFilterStatus(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Filter Status Kelulusan"
              >
                <option value="ALL">Semua Status Kelulusan</option>
                <option value="Baik Sekali">Baik Sekali (NA ≥ 80)</option>
                <option value="Baik">Baik (NA 70 - 79)</option>
                <option value="Perbaikan">Perbaikan / Cukup (NA 60 - 69)</option>
                <option value="Tidak Lulus">Tidak Lulus (NA &lt; 60)</option>
              </select>
            </div>
            {/* Desktop View: Full Select Dropdown */}
            <select
              value={penilaianFilterStatus}
              onChange={(e) => setPenilaianFilterStatus(e.target.value)}
              className="hidden sm:block px-3 py-2 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
            >
              <option value="ALL">Semua Status Kelulusan</option>
              <option value="Baik Sekali">Baik Sekali (NA ≥ 80)</option>
              <option value="Baik">Baik (NA 70 - 79)</option>
              <option value="Perbaikan">Perbaikan / Cukup (NA 60 - 69)</option>
              <option value="Tidak Lulus">Tidak Lulus (NA &lt; 60)</option>
            </select>
          </div>
        </div>

        {/* Master Rekapitulasi Table (Style Persis Rekap Presensi Gambar 2) */}
        <div className="bg-white rounded-md border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto pb-24 md:pb-0">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-30 border-b border-slate-200 shadow-2xs">
                <tr className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 md:px-3 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center sticky top-0 left-0 z-40 bg-slate-100">No</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 min-w-[125px] sm:min-w-[190px] sticky top-0 left-[32px] sm:left-[40px] md:left-[48px] z-40 bg-slate-100 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">Nama Peserta</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 min-w-[100px] sm:min-w-[130px]">Kelas</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 min-w-[110px] sm:min-w-[170px]">Asal Komisariat</th>
                  <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-center min-w-[70px] sm:min-w-[95px]">
                    Afektif (50%)
                  </th>
                  <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-center min-w-[70px] sm:min-w-[95px]">
                    Kognitif (30%)
                  </th>
                  <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-center min-w-[80px] sm:min-w-[105px]">
                    Psikomotorik (20%)
                  </th>
                  <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-center min-w-[70px] sm:min-w-[95px]">
                    Nilai Akhir (NA)
                  </th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 text-center min-w-[110px] sm:min-w-[140px]">Status Penilaian</th>
                  <th className="py-2.5 sm:py-3.5 px-2 text-right w-10 sm:w-14">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssessedParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      Tidak ada data penilaian peserta yang sesuai dengan pencarian / filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredAssessedParticipants.map((p, idx) => {
                    const { afektif, kognitif, psikomotorik, finalScore, predicate, status } = p.computed;

                    return (
                      <tr 
                        key={p.id}
                        onClick={() => handleOpenParticipantGrading(p)}
                        className="hover:bg-emerald-50/20 transition-colors cursor-pointer group"
                      >
                        {/* No */}
                        <td className="py-2 sm:py-3.5 px-1 sm:px-2 md:px-3 font-semibold text-slate-400 text-center sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 transition-colors text-[10px] sm:text-xs">
                          {idx + 1}
                        </td>

                        {/* Nama Peserta */}
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3 sticky left-[32px] sm:left-[40px] md:left-[48px] z-20 bg-white group-hover:bg-slate-50/90 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)] transition-colors">
                          <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0">
                            <div 
                              onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all"
                              title="Klik untuk melihat foto profil peserta"
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
                            <div className="min-w-0 flex-1">
                              <span 
                                onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                className="font-semibold text-slate-900 text-[11px] sm:text-xs md:text-sm group-hover:text-emerald-700 transition-colors truncate block cursor-pointer max-w-[95px] sm:max-w-none leading-tight"
                                title={`${p.name} (Klik untuk lihat profil)`}
                              >
                                {p.name}
                              </span>
                              {p.instansi && (
                                <span className="text-[9px] sm:text-[10px] text-slate-400 truncate block sm:hidden max-w-[95px] leading-tight">
                                  {p.instansi}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Kelas Peserta */}
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3">
                          {(() => {
                            const cls = classes.find(c => String(c.id) === String(p.class_id));
                            const clsName = cls ? (cls.name || `Kelas ${cls.id}`) : (p.class_id ? `Kelas ${p.class_id}` : 'Kelas Umum');
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 truncate max-w-[120px]">
                                {clsName}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Asal Komisariat / Instansi (Clean Text) */}
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3">
                          <div className="text-slate-800 font-medium text-[10px] sm:text-xs truncate max-w-[130px] sm:max-w-none">
                            {p.instansi || '-'}
                          </div>
                        </td>

                        {/* Afektif (50%) */}
                        <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 text-center font-mono font-bold text-emerald-700 text-[11px] sm:text-xs md:text-sm">
                          {afektif}
                        </td>

                        {/* Kognitif (30%) */}
                        <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 text-center font-mono font-bold text-emerald-700 text-[11px] sm:text-xs md:text-sm">
                          {kognitif}
                        </td>

                        {/* Psikomotorik (20%) */}
                        <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 text-center font-mono font-bold text-emerald-700 text-[11px] sm:text-xs md:text-sm">
                          {psikomotorik}
                        </td>

                        {/* Nilai Akhir (NA) */}
                        <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 text-center">
                          <span className="font-bold text-slate-900 font-mono text-[11px] sm:text-xs md:text-sm">
                            {finalScore}
                          </span>
                        </td>

                        {/* Predikat & Status (Pill Badge Style Persis Rekap Presensi) */}
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3 text-center">
                          {status === 'Lulus' ? (
                            <span className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[9.5px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                              <span className="whitespace-nowrap">{predicate}</span>
                            </span>
                          ) : status === 'Perbaikan' ? (
                            <span className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[9.5px] sm:text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
                              <span className="whitespace-nowrap">{predicate}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[9.5px] sm:text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
                              <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 shrink-0" />
                              <span className="whitespace-nowrap">{status} • {predicate}</span>
                            </span>
                          )}
                        </td>

                        {/* Aksi (Titik 3 Dropdown Menu) */}
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAssessmentActionMenuId(activeAssessmentActionMenuId === p.id ? null : p.id);
                              }}
                              className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Menu Aksi Penilaian Peserta"
                            >
                              <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>

                            {/* Dropdown Popup Menu */}
                            {activeAssessmentActionMenuId === p.id && (
                              <div 
                                className="absolute right-full top-0 mr-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi Penilaian</p>
                                  <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveAssessmentActionMenuId(null);
                                    handleOpenParticipantGrading(p);
                                  }}
                                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="whitespace-nowrap">Lihat Penilaian</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveAssessmentActionMenuId(null);
                                    handleOpenSessionGrading({ session: training?.sessions?.[0] || { id: 'SES-01', title: 'Sesi Presensi Utama' }, sessionIndex: 1 });
                                  }}
                                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-left cursor-pointer"
                                >
                                  <SlidersHorizontal className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="whitespace-nowrap">Kelola Penilaian</span>
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

          {/* Footer Info */}
          <footer className="p-3 sm:px-6 sm:py-3.5 border-t border-slate-200/90 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500 pb-24 sm:pb-3.5">
            <span className="font-semibold text-slate-600">
              Menampilkan {filteredAssessedParticipants.length} dari {assessedParticipants.length} peserta terdaftar
            </span>
            <span className="text-[9.5px] sm:text-[11px] text-slate-400">
              Rumus: NA = (Afektif × 50%) + (Kognitif × 30%) + (Psikomotorik × 20%)
            </span>
          </footer>
        </div>

        {/* FULLSCREEN MODAL: TABEL REKAP PENILAIAN LENGKAP (PERSIS GAMBAR 2) */}
        {penilaianFullscreenModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
            {/* Backdrop for 3-dots popup dismissal */}
            {activeAssessmentActionMenuId && (
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setActiveAssessmentActionMenuId(null)} 
              />
            )}

            {/* Top Unified Single-Row Toolbar Bar (Identik Gambar 2) */}
            <header className="bg-white border-b border-slate-200/90 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs shrink-0 z-30">
              {/* Sisi Kiri: Judul */}
              <div className="flex items-center space-x-2 shrink-0">
                <span className="font-extrabold text-xs md:text-sm text-slate-900 tracking-tight truncate max-w-xs md:max-w-xl" title={penilaianModalSession && penilaianModalSession !== 'ALL' ? `Penilaian: ${penilaianModalSession.title || 'Detail Sesi'}` : 'Penilaian: Rekapitulasi Nilai Akhir Peserta'}>
                  {penilaianModalSession && penilaianModalSession !== 'ALL' 
                    ? `Penilaian: ${penilaianModalSession.title || 'Detail Sesi'}` 
                    : 'Penilaian: Rekapitulasi Nilai Akhir Peserta'}
                </span>
              </div>

              {/* Sisi Kanan: Input Pencarian, Filter Icon Only, Unduh Data, dan Tutup */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Search Bar */}
                <div className="relative w-44 md:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari peserta, asal komisariat..."
                    value={penilaianSearchQuery}
                    onChange={(e) => setPenilaianSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition-all"
                  />
                  {penilaianSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPenilaianSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Dropdown (Icon Only) */}
                <div className="relative shrink-0">
                  <div 
                    className={`p-2 rounded-2xl border transition-colors shadow-2xs flex items-center justify-center cursor-pointer ${
                      penilaianFilterStatus !== 'ALL' || penilaianFilterKomisariat !== 'ALL'
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                    title="Filter Kategori Status Penilaian"
                  >
                    <Filter className="w-4 h-4" />
                  </div>
                  <select
                    value={penilaianFilterStatus}
                    onChange={(e) => setPenilaianFilterStatus(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                    title="Filter Kategori Status Penilaian"
                  >
                    <option value="ALL">Status: Semua Peserta</option>
                    <option value="Baik Sekali">Status: Baik Sekali (NA ≥ 80)</option>
                    <option value="Baik">Status: Baik (NA 70 - 79)</option>
                    <option value="Perbaikan">Status: Perbaikan (NA 60 - 69)</option>
                    <option value="Tidak Lulus">Status: Tidak Lulus (NA &lt; 60)</option>
                  </select>
                </div>

                {/* Keterangan Persentase Kelulusan (Di Samping Kiri Unduh Data) */}
                {(() => {
                  const safeList = Array.isArray(assessedParticipants) ? assessedParticipants : [];
                  const totalP = safeList.length;
                  const lulusCount = safeList.filter(p => p?.computed?.isPassed).length;
                  const pct = totalP > 0 ? Math.round((lulusCount / totalP) * 100) : 0;

                  return (
                    <div 
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0 shadow-2xs"
                      title={`Tingkat Kelulusan: ${pct}% (${lulusCount}/${totalP} Peserta Lulus)`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <span className="tracking-tight">{pct}% Kelulusan</span>
                    </div>
                  );
                })()}

                {/* Unduh Data */}
                <button
                  type="button"
                  onClick={handleExportPenilaianExcel}
                  className="px-3.5 md:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh Data</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPenilaianFullscreenModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Tutup Halaman Tabel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Table Data Content - Full Width & Height */}
            <div className="flex-1 overflow-auto bg-white relative">
              <div className="min-w-full inline-block align-middle">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-2xs">
                    <tr className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 md:px-5 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center sticky left-0 z-20 bg-slate-100">No</th>
                      <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 min-w-[125px] sm:min-w-[170px] md:min-w-[200px] sticky left-[32px] sm:left-[40px] md:left-[48px] z-20 bg-slate-100 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">Nama Peserta</th>
                      <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 min-w-[100px] sm:min-w-[130px]">Kelas</th>
                      <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 min-w-[130px] sm:min-w-[180px]">Asal Komisariat</th>
                      <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 md:px-5 text-center min-w-[70px] sm:min-w-[95px]">Afektif (50%)</th>
                      <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 md:px-5 text-center min-w-[70px] sm:min-w-[95px]">Kognitif (30%)</th>
                      <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 md:px-5 text-center min-w-[75px] sm:min-w-[105px]">Psikomotorik (20%)</th>
                      <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-3 md:px-5 text-center min-w-[70px] sm:min-w-[95px]">Nilai Akhir (NA)</th>
                      <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 text-center min-w-[110px] sm:min-w-[140px]">Status Penilaian</th>
                      <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 text-right w-12 sm:w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAssessedParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                          Tidak ada data penilaian peserta yang sesuai dengan pencarian / filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredAssessedParticipants.map((p, idx) => {
                        const { afektif, kognitif, psikomotorik, finalScore, predicate, status } = p.computed;
                        return (
                          <tr key={p.id} className="group hover:bg-emerald-50/20 transition-colors">
                            <td className="py-2 sm:py-3.5 px-1 sm:px-2 md:px-5 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] font-semibold text-slate-400 text-center sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 text-[10px] sm:text-xs">{idx + 1}</td>
                            <td className="py-2 sm:py-3.5 px-2 sm:px-3 md:px-5 min-w-[125px] sm:min-w-[170px] md:min-w-[200px] sticky left-[32px] sm:left-[40px] md:left-[48px] z-10 bg-white group-hover:bg-slate-50/90 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">
                              <div className="flex items-center space-x-2 sm:space-x-2.5">
                                <div 
                                  onClick={() => setPreviewPhotoUser(p)}
                                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                                  title="Klik untuk melihat foto profil"
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
                                <div 
                                  onClick={() => setPreviewPhotoUser(p)}
                                  className="cursor-pointer group/name min-w-0"
                                  title="Klik untuk melihat foto profil"
                                >
                                  <span className="font-semibold text-slate-900 text-[11px] sm:text-xs md:text-sm group-hover/name:text-emerald-700 transition-colors line-clamp-1 max-w-[95px] sm:max-w-[160px] md:max-w-none">{p.name}</span>
                                  {p.instansi && (
                                    <span className="text-[9px] sm:text-[10px] text-slate-400 truncate block sm:hidden max-w-[95px]">
                                      {p.instansi}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            {/* Kelas Peserta */}
                            <td className="py-2 sm:py-3.5 px-2 sm:px-3 md:px-5">
                              {(() => {
                                const cls = classes.find(c => String(c.id) === String(p.class_id));
                                const clsName = cls ? (cls.name || `Kelas ${cls.id}`) : (p.class_id ? `Kelas ${p.class_id}` : 'Kelas Umum');
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 truncate max-w-[120px]">
                                    {clsName}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-2 sm:py-3.5 px-2 sm:px-3 md:px-5">
                              <div className="text-slate-800 font-medium text-[11px] sm:text-xs">{p.instansi || '-'}</div>
                            </td>
                            <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 md:px-5 text-center font-mono font-bold text-emerald-700 text-[11px] sm:text-xs md:text-sm">
                              {afektif}
                            </td>
                            <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 md:px-5 text-center font-mono font-bold text-emerald-700 text-[11px] sm:text-xs md:text-sm">
                              {kognitif}
                            </td>
                            <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 md:px-5 text-center font-mono font-bold text-emerald-700 text-[11px] sm:text-xs md:text-sm">
                              {psikomotorik}
                            </td>
                            <td className="py-2 sm:py-3.5 px-1.5 sm:px-3 md:px-5 text-center">
                              <span className="font-bold text-slate-900 font-mono text-[11px] sm:text-xs md:text-sm">{finalScore}</span>
                            </td>
                            <td className="py-2 sm:py-3.5 px-2 sm:px-3 md:px-5 text-center">
                              {status === 'Lulus' ? (
                                <span className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                                  <span className="whitespace-nowrap">{predicate}</span>
                                </span>
                              ) : status === 'Perbaikan' ? (
                                <span className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
                                  <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
                                  <span className="whitespace-nowrap">{predicate}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs whitespace-nowrap">
                                  <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 shrink-0" />
                                  <span className="whitespace-nowrap">{status} • {predicate}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 md:px-5 text-right relative overflow-visible" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveAssessmentActionMenuId(activeAssessmentActionMenuId === p.id ? null : p.id);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer touch-manipulation"
                                  title="Menu Aksi Penilaian Peserta"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {activeAssessmentActionMenuId === p.id && (
                                  <div 
                                    className="absolute right-0 top-full mt-1 sm:right-full sm:top-0 sm:mt-0 sm:mr-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 text-left"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi Penilaian</p>
                                      <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAssessmentActionMenuId(null);
                                        handleOpenParticipantGrading(p);
                                      }}
                                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer touch-manipulation"
                                    >
                                      <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span className="whitespace-nowrap">Lihat Penilaian</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAssessmentActionMenuId(null);
                                        handleOpenSessionGrading({ session: training?.sessions?.[0] || { id: 'SES-01', title: 'Sesi Presensi Utama' }, sessionIndex: 1 });
                                      }}
                                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-left cursor-pointer touch-manipulation"
                                    >
                                      <SlidersHorizontal className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span className="whitespace-nowrap">Kelola Penilaian</span>
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
            </div>

            {/* Full-Width Clean Footer */}
            <footer className="px-4 md:px-8 py-3 border-t border-slate-200/90 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0 shadow-2xs">
              <span className="font-semibold text-slate-600">
                Menampilkan {filteredAssessedParticipants.length} dari {assessedParticipants.length} peserta terdaftar
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
                PresenTrain Digital Assessment System
              </span>
            </footer>

          </div>
        )}

        {/* FULL PAGE 1: LEMBAR PENILAIAN PER SESI (FAST CLICK BUTTONS) */}
        {sessionGradingModal && (
          <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
            {/* Clean White Header */}
            <header className="px-4 sm:px-8 py-4 border-b border-slate-200 bg-white text-slate-900 shrink-0 z-30 shadow-2xs">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setSessionGradingModal(null)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                    title="Kembali"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase border border-emerald-200">
                      LEMBAR PENILAIAN SESI {sessionGradingModal.sessionIndex}
                    </span>
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                      • {sessionGradingModal.session.time}
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSessionGradingModal(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                  title="Tutup Halaman"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Banner Mode Hanya Lihat jika Akses Penilaian di-OFF-kan */}
            {!hasAssessmentAccess && (
              <div className="bg-amber-50/95 border-b border-amber-200 px-4 sm:px-8 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0 z-20">
                <div className="flex items-center space-x-2 text-amber-900 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Mode Hanya Lihat:</strong> Akses penilaian dinonaktifkan oleh Admin Utama. Tombol aksi tambah/kurang nilai pada lembar sesi ini dinonaktifkan.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAccessDenied('Akses Penilaian Peserta', 'Izin Akses Penilaian Peserta diperlukan untuk mengubah nilai afektif, kognitif, dan psikomotorik.')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Minta Akses Admin Utama
                </button>
              </div>
            )}

            {/* Sub-Header Filters & Search */}
            <div className="px-4 sm:px-8 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 z-20 shadow-2xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama peserta dalam sesi ini..."
                  value={penilaianSearchQuery}
                  onChange={(e) => setPenilaianSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold">
                <span>Menampilkan {sessionGradingParticipants.length} dari {assessedParticipants.length} Peserta</span>
              </div>
            </div>

            {/* Scrollable Participants Grading Table (Matching Gambar 2) */}
            <div className="flex-1 overflow-auto bg-white relative pb-28 md:pb-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 md:px-5 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center sticky left-0 z-20 bg-slate-50">NO</th>
                    <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 min-w-[130px] sm:min-w-[200px] sticky left-[32px] sm:left-[40px] md:left-[48px] z-20 bg-slate-50 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">NAMA PESERTA</th>
                    <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-4 text-center min-w-[110px] sm:min-w-[135px]">AFEKTIF (50%)</th>
                    <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-4 text-center min-w-[110px] sm:min-w-[135px]">KOGNITIF (30%)</th>
                    <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-4 text-center min-w-[110px] sm:min-w-[135px]">PSIKOMOTORIK (20%)</th>
                    <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-2 text-center min-w-[75px] sm:min-w-[90px] w-20 sm:w-24">NILAI AKHIR (NA)</th>
                    <th className="py-2.5 sm:py-3.5 px-3 md:px-6 text-center min-w-[140px] sm:min-w-[170px]">STATUS PENILAIAN</th>
                    <th className="py-2.5 sm:py-3.5 px-2 md:px-5 text-center min-w-[90px] sm:min-w-[110px]">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessionGradingParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        Tidak ada peserta yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    sessionGradingParticipants.map((p, idx) => {
                      const { afektif, kognitif, psikomotorik, totalViolations, totalContributions, finalScore, predicate, status, statusClass } = p.computed;
                      const sessionViolations = (p.assessment?.violations || []).filter(v => v.sessionId === sessionGradingModal.session.id || String(v.sessionId) === String(sessionGradingModal.session.id));
                      const sessionContributions = (p.assessment?.contributions || []).filter(c => c.sessionId === sessionGradingModal.session.id || String(c.sessionId) === String(sessionGradingModal.session.id));

                      return (
                        <tr key={p.id} className="group hover:bg-emerald-50/20 transition-colors">
                          <td className="py-2 sm:py-3 px-1 sm:px-2 md:px-5 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] font-semibold text-slate-400 text-center sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 text-[11px] sm:text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-5 min-w-[130px] sm:min-w-[200px] sticky left-[32px] sm:left-[40px] md:left-[48px] z-10 bg-white group-hover:bg-slate-50/90 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">
                            <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                              <div 
                                onClick={() => setPreviewPhotoUser(p)}
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all touch-manipulation"
                                title="Klik untuk melihat foto profil"
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
                              <div 
                                onClick={() => setPreviewPhotoUser(p)}
                                className="cursor-pointer group/name min-w-0 flex-1 touch-manipulation"
                                title="Klik untuk melihat foto profil"
                              >
                                <div className="font-bold text-slate-900 text-[11px] sm:text-sm group-hover/name:text-emerald-700 transition-colors truncate max-w-[105px] sm:max-w-none leading-tight">{p.name}</div>
                                <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate sm:hidden max-w-[105px] leading-tight">{p.instansi || '-'}</div>
                              </div>
                            </div>
                          </td>
                          {/* AFEKTIF (40%): [-] Pilih Pelanggaran, [+] Cancel Pelanggaran Terakhir */}
                          <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-center">
                            <div className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 bg-white px-1 py-0.5 sm:px-1.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors">
                              <button
                                type="button"
                                onClick={() => setViolationPickerModal({ participant: p, session: sessionGradingModal.session })}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-[11px] sm:text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90 touch-manipulation"
                                title="Catat Pelanggaran Afektif (Pilih Jenis Pelanggaran)"
                              >
                                -
                              </button>
                              <span 
                                className="w-8 sm:w-12 text-center font-mono font-bold text-emerald-700 text-[11px] sm:text-sm block"
                                title={`Nilai Afektif Sesi: ${afektif} (${sessionViolations.length} Pelanggaran)`}
                              >
                                {afektif}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (sessionViolations.length > 0) {
                                    handleUndoViolation(p.id, p.name, sessionGradingModal.session.id);
                                  } else {
                                    showNotification('Tidak ada catatan pelanggaran yang dapat dibatalkan di sesi ini.');
                                  }
                                }}
                                disabled={sessionViolations.length === 0}
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center transition-all touch-manipulation ${
                                  sessionViolations.length > 0 
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer active:scale-90' 
                                    : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                                }`}
                                title={sessionViolations.length > 0 ? "Batalkan Pelanggaran Terakhir (+)" : "Belum ada pelanggaran di sesi ini"}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          {/* KOGNITIF (30%): [-] Batalkan / Kurangi Nilai Kognitif, [ Nilai ], [+] Tambah Rubrik Kognitif */}
                          <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-center">
                            <div className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 bg-white px-1 py-0.5 sm:px-1.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors">
                              <button
                                type="button"
                                onClick={() => handleUndoKognitif(p.id, p.name, sessionGradingModal.session.id)}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[11px] sm:text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90 touch-manipulation"
                                title="Batalkan / Kurangi Nilai Kognitif (-)"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => setKognitifPickerModal({ participant: p, session: sessionGradingModal.session, mode: 'all' })}
                                className="w-8 sm:w-12 text-center font-mono font-bold text-blue-700 text-[11px] sm:text-sm block cursor-pointer hover:bg-blue-50/60 rounded py-0.5 transition-colors touch-manipulation"
                                title="Klik untuk membuka Rubrik Kognitif Lengkap"
                              >
                                {kognitif}
                              </button>
                              <button
                                type="button"
                                onClick={() => setKognitifPickerModal({ participant: p, session: sessionGradingModal.session, mode: 'bonus' })}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[11px] sm:text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90 touch-manipulation"
                                title="Catat Respon / Rubrik Kognitif (+)"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          {/* PSIKOMOTORIK (30%): [-] Cancel Keaktifan Terakhir, [+] Pilih Keaktifan Baru */}
                          <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-center">
                            <div className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 bg-white px-1 py-0.5 sm:px-1.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs hover:border-teal-300 transition-colors">
                              <button
                                type="button"
                                onClick={() => {
                                  if (sessionContributions.length > 0) {
                                    handleUndoContribution(p.id, p.name, sessionGradingModal.session.id);
                                  } else {
                                    showNotification('Tidak ada catatan keaktifan yang dapat dibatalkan di sesi ini.');
                                  }
                                }}
                                disabled={sessionContributions.length === 0}
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center transition-all touch-manipulation ${
                                  sessionContributions.length > 0 
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer active:scale-90' 
                                    : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                                }`}
                                title={sessionContributions.length > 0 ? "Batalkan Keaktifan Terakhir (-)" : "Belum ada keaktifan di sesi ini"}
                              >
                                -
                              </button>
                              <span 
                                className="w-8 sm:w-12 text-center font-mono font-bold text-teal-700 text-[11px] sm:text-sm block"
                                title={`Nilai Psikomotorik Sesi: ${psikomotorik} (${sessionContributions.length} Keaktifan)`}
                              >
                                {psikomotorik}
                              </span>
                              <button
                                type="button"
                                onClick={() => setContributionPickerModal({ participant: p, session: sessionGradingModal.session })}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-black text-[11px] sm:text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90 touch-manipulation"
                                title="Catat Keaktifan Psikomotorik (Pilih Jenis Keaktifan)"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-2 text-center font-mono font-black text-emerald-700 text-xs sm:text-sm whitespace-nowrap">
                            {finalScore}
                          </td>
                          <td className="py-2 sm:py-3 px-3 md:px-6 text-center">
                            <span className={`inline-flex items-center space-x-1 sm:space-x-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap shadow-2xs ${statusClass}`}>
                              {status === 'Lulus' ? (
                                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                              ) : status === 'Perbaikan' ? (
                                <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 shrink-0" />
                              )}
                              <span className="whitespace-nowrap">{status} ({predicate})</span>
                            </span>
                          </td>
                          <td className="py-2 sm:py-3 px-2 md:px-5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedParticipantForGrading(p)}
                              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs shadow-2xs inline-flex items-center space-x-1 sm:space-x-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap touch-manipulation"
                              title={`Lihat Log Rincian Penilaian & Kesalahan ${p.name}`}
                            >
                              <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700" />
                              <span>Lihat Log</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <footer className="p-2.5 pb-24 md:pb-4 sm:p-4 bg-white border-t border-slate-200/90 flex items-center justify-between gap-3 shrink-0 z-30">
              <span className="text-[11px] sm:text-xs text-slate-500 hidden sm:inline">
                Semua perubahan nilai tersimpan otomatis dan langsung direkap ke nilai akhir.
              </span>
              <button
                type="button"
                onClick={() => setSessionGradingModal(null)}
                className="px-4 py-2 sm:px-6 sm:py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 ml-auto"
              >
                Selesai & Tutup
              </button>
            </footer>
          </div>
        )}

        {/* MODAL TERPADU PILIHAN SIKAP (AFEKTIF, KOGNITIF, PSIKOMOTORIK) */}
        {renderUnifiedAttitudeModal()}

        {/* FULL PAGE: DETAIL LEMBAR PENILAIAN INDIVIDUAL (FULL ASSESSMENT REVIEW & NOTES) */}
        {selectedParticipantForGrading && (
          <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
            {/* Header Bar */}
            <header className="bg-white border-b border-slate-200/90 px-4 md:px-8 py-3.5 flex items-center justify-between gap-3 shadow-xs shrink-0 z-30">
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedParticipantForGrading(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base shadow-2xs shrink-0">
                    {selectedParticipantForGrading.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight truncate max-w-xs sm:max-w-md">{selectedParticipantForGrading.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{selectedParticipantForGrading.instansi} • {selectedParticipantForGrading.email}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedParticipantForGrading(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                title="Tutup Halaman"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Banner Mode Hanya Lihat jika Akses Penilaian di-OFF-kan */}
            {!hasAssessmentAccess && (
              <div className="bg-amber-50/95 border-b border-amber-200 px-4 md:px-8 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0 z-20">
                <div className="flex items-center space-x-2 text-amber-900 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Mode Hanya Lihat:</strong> Akses penilaian dinonaktifkan oleh Admin Utama. Anda dapat melihat lembar rincian nilai ini, namun formulir pengisian catatan dan aksi simpan dinonaktifkan.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAccessDenied('Akses Penilaian Peserta', 'Izin Akses Penilaian Peserta diperlukan untuk mengisi catatan dan mengubah nilai peserta.')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Minta Akses Admin Utama
                </button>
              </div>
            )}

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-slate-50">
              <div className="w-full max-w-7xl mx-auto space-y-5 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm">
                
                {/* Live Calculation Formula Card */}
                {(() => {
                  const ass = calculateAssessment(currentAssessments[selectedParticipantForGrading.id]);
                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Formula Nilai Akhir (NA)</span>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-base font-black text-slate-900 font-mono">
                            NA = {ass.finalScore} <span className="text-xs text-slate-500 font-sans">({ass.finalScore1000} Skala 1000)</span>
                          </span>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${ass.statusClass}`}>
                            {ass.status} ({ass.predicate})
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-center pt-1">
                        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Afektif (50%)</span>
                          <strong className="text-emerald-800 font-mono text-sm">{ass.afektif}</strong>
                          <span className="text-[10px] text-slate-500 block">x 0.50 = {(ass.afektif * 0.5).toFixed(1)}</span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Kognitif (30%)</span>
                          <strong className="text-blue-800 font-mono text-sm">{ass.kognitif}</strong>
                          <span className="text-[10px] text-slate-500 block">x 0.30 = {(ass.kognitif * 0.3).toFixed(1)}</span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Psikomotorik (20%)</span>
                          <strong className="text-teal-800 font-mono text-sm">{ass.psikomotorik}</strong>
                          <span className="text-[10px] text-slate-500 block">x 0.20 = {(ass.psikomotorik * 0.2).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Riwayat Log Pelanggaran & Tindakan */}
                {(() => {
                  const targetAss = currentAssessments[selectedParticipantForGrading.id] || {};
                  const rawVios = targetAss.violations;
                  const viosList = Array.isArray(rawVios) 
                    ? rawVios 
                    : (rawVios && typeof rawVios === 'object' ? Object.values(rawVios).filter(v => v && typeof v === 'object' && ('points' in v || 'item' in v)) : []);
                  const rawCons = targetAss.contributions;
                  const consList = Array.isArray(rawCons)
                    ? rawCons
                    : (Array.isArray(rawCons?.contributions) 
                      ? rawCons.contributions 
                      : (rawCons && typeof rawCons === 'object' ? Object.values(rawCons).filter(c => c && typeof c === 'object' && ('points' in c || 'item' in c)) : []));
                  const totalVioPoints = viosList.reduce((s, v) => s + (Math.abs(Number(v?.points)) || 0), 0);
                  const totalConPoints = consList.reduce((s, c) => s + (Math.abs(Number(c?.points)) || 0), 0);

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Box 1: Log Pelanggaran Afektif */}
                      <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                        <div className="flex items-center justify-between font-bold text-rose-950">
                          <span>Log Pelanggaran Afektif (Modal 100)</span>
                          <span className="text-rose-700 font-mono">
                            -{totalVioPoints} Poin
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {viosList.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px] py-3">Tidak ada catatan pelanggaran (Nilai 100 sempurna).</p>
                          ) : (
                            viosList.map((v, vIdx) => (
                              <div key={v.id || vIdx} className="p-2.5 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-[11px] shadow-2xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">[{v.symbol || 'A'}] {v.item}</span>
                                  <span className="text-[10px] text-slate-400">{v.sessionTitle || 'Sesi'} • {v.timestamp || '-'}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <span className="font-bold text-rose-600 font-mono">-{v.points}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveViolationItem(selectedParticipantForGrading.id, v.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="Hapus Pelanggaran Ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Box 2: Log Keaktifan Psikomotorik */}
                      <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
                        <div className="flex items-center justify-between font-bold text-teal-950">
                          <span>Log Keaktifan Psikomotorik (Modal 50)</span>
                          <span className="text-teal-700 font-mono">
                            +{totalConPoints} Poin
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {consList.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px] py-3">Belum ada catatan keaktifan.</p>
                          ) : (
                            consList.map((c, cIdx) => (
                              <div key={c.id || cIdx} className="p-2.5 bg-white rounded-xl border border-teal-200 flex items-center justify-between text-[11px] shadow-2xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">[{c.symbol || 'P'}] {c.item}</span>
                                  <span className="text-[10px] text-slate-400">{c.sessionTitle || 'Sesi'} • {c.timestamp || '-'}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <span className="font-bold text-teal-600 font-mono">+{c.points}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveContributionItem(selectedParticipantForGrading.id, c.id)}
                                    className="p-1 text-slate-400 hover:text-teal-600 rounded cursor-pointer"
                                    title="Hapus Keaktifan Ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* BREAKDOWN REKAPITULASI & LOG PENILAIAN PER SESI MATERI */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        <span>Rincian & Log Penilaian Per Sesi Materi</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Histori perolehan nilai, log penambahan keaktifan, dan pengurangan pelanggaran di setiap sesi pelatihan.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 self-start sm:self-auto shrink-0">
                      {(training?.sessions || []).length} Total Sesi
                    </span>
                  </div>

                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-3 text-center w-10">Sesi</th>
                            <th className="py-3 px-4 min-w-[180px]">Materi / Waktu</th>
                            <th className="py-3 px-3 text-center min-w-[90px]">Afektif (50%)</th>
                            <th className="py-3 px-3 text-center min-w-[90px]">Kognitif (30%)</th>
                            <th className="py-3 px-3 text-center min-w-[95px]">Psikomotorik (20%)</th>
                            <th className="py-3 px-3 text-center min-w-[90px]">NA Sesi</th>
                            <th className="py-3 px-4 min-w-[200px]">Log Perubahan Nilai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 font-medium bg-white">
                          {(training?.sessions || []).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                                Belum ada jadwal sesi materi dalam pelatihan ini.
                              </td>
                            </tr>
                          ) : (
                            (training?.sessions || []).map((s, sIdx) => {
                              const sAss = currentAssessments[selectedParticipantForGrading.id]?.sessions?.[s.id] || null;
                              const sVios = (currentAssessments[selectedParticipantForGrading.id]?.violations || []).filter(v => v.sessionId === s.id || String(v.sessionId) === String(s.id));
                              const sCons = (currentAssessments[selectedParticipantForGrading.id]?.contributions || []).filter(c => c.sessionId === s.id || String(c.sessionId) === String(s.id));
                              
                              const sVioPts = sVios.reduce((acc, v) => acc + Math.abs(v.points || 0), 0);
                              const sConPts = sCons.reduce((acc, c) => acc + Math.abs(c.points || 0), 0);
                              
                              const sAf = sAss?.afektif !== undefined ? sAss.afektif : Math.max(0, 100 - sVioPts);
                              const sKog = sAss?.kognitif !== undefined ? sAss.kognitif : 75;
                              const sPsi = sAss?.psikomotorik !== undefined ? sAss.psikomotorik : Math.min(100, 50 + sConPts);
                              
                              const sNA = Math.round(((sAf * 0.5) + (sKog * 0.3) + (sPsi * 0.2)) * 10) / 10;
                              const isPassing = sNA >= 60;

                              return (
                                <tr key={s.id || sIdx} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-3 text-center font-bold text-slate-500">
                                    {sIdx + 1}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900 truncate max-w-[220px]" title={s.title}>
                                      {s.title || `Sesi Materi ${sIdx + 1}`}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-normal">
                                      {s.time || s.date || 'Waktu Sesi'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                                    {sAf}
                                    {sVioPts > 0 && (
                                      <span className="block text-[9px] text-rose-500 font-semibold font-sans">(-{sVioPts} Poin)</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">
                                    {sKog}
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-bold text-teal-700">
                                    {sPsi}
                                    {sConPts > 0 && (
                                      <span className="block text-[9px] text-teal-600 font-semibold font-sans">(+{sConPts} Poin)</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                                      isPassing ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                                    }`}>
                                      {sNA}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    {sVios.length === 0 && sCons.length === 0 ? (
                                      <span className="text-[11px] text-slate-400 italic">Standar (Tidak ada pelanggaran/keaktifan)</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1 items-center max-w-xs">
                                        {sVios.map((v, vIdx) => (
                                          <span key={vIdx} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold" title={`${v.item} (${v.timestamp})`}>
                                            <span>-{v.points}</span>
                                            <span className="truncate max-w-[80px]">{v.item}</span>
                                          </span>
                                        ))}
                                        {sCons.map((c, cIdx) => (
                                          <span key={cIdx} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-semibold" title={`${c.item} (${c.timestamp})`}>
                                            <span>+{c.points}</span>
                                            <span className="truncate max-w-[80px]">{c.item}</span>
                                          </span>
                                        ))}
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
                  </div>
                </div>

                {/* Catatan Kualitatif / Rekomendasi Pemandu */}
                <div className="space-y-2 text-xs">
                  <label className="block font-bold text-slate-700">
                    Catatan Kualitatif / Deskripsi Karakter Pemandu
                  </label>
                  <textarea
                    rows={1}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                    value={qualitativeNoteInput}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onChange={(e) => {
                      setQualitativeNoteInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    placeholder={hasAssessmentAccess ? "Tuliskan gambaran kualitatif, sikap, keaktifan dan rekomendasi untuk peserta ini..." : "Mode Hanya Lihat: Pengisian catatan kualitatif dinonaktifkan oleh Admin Utama."}
                    disabled={!hasAssessmentAccess}
                    className={`w-full p-3.5 rounded-2xl border text-xs font-medium resize-none overflow-hidden [field-sizing:content] min-h-[46px] outline-none transition-colors ${
                      hasAssessmentAccess 
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600' 
                        : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  />
                  {!hasAssessmentAccess && (
                    <p className="text-[11px] text-amber-700 font-semibold flex items-center space-x-1.5 pt-1">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Catatan kualitatif dikunci dalam mode hanya lihat. Hubungi Admin Utama untuk izin pengeditan.</span>
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* Footer Bar */}
            <footer className="bg-white border-t border-slate-200/90 px-4 md:px-8 py-3.5 flex items-center justify-between shrink-0 z-30">
              <button
                type="button"
                onClick={() => setSelectedParticipantForGrading(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Tutup
              </button>

              {hasAssessmentAccess ? (
                <button
                  type="button"
                  onClick={() => {
                    handleSaveQualitativeNote(selectedParticipantForGrading.id, qualitativeNoteInput);
                    setSelectedParticipantForGrading(null);
                  }}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
                >
                  Simpan Lembar Penilaian
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerAccessDenied('Akses Penilaian Peserta', 'Izin Akses Penilaian Peserta diperlukan untuk menyimpan lembar penilaian dan catatan kualitatif.')}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Minta Izin Simpan</span>
                </button>
              )}
            </footer>
          </div>
        )}

        {/* Modal Preview Foto Profil Peserta */}
        {renderPreviewPhotoModal()}

      </div>
    );
  }

  if (activeTab === 'helpdesk') {
    return (
      <HelpdeskView
        user={currentUser}
        siteSettings={siteSettings}
        tickets={tickets}
        setTickets={setTickets}
        onBack={() => setActiveTab('sessions_scanner')}
      />
    );
  }

  // DEFAULT / TAB 1: SESI & LIVE QR SCANNER (`sessions_scanner`)
  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans relative w-full">
      {/* Backdrop for Session Action Menu Popup Dismissal */}
      {activeSessionActionMenuId && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setActiveSessionActionMenuId(null)} 
        />
      )}

      {/* Banner Mode Hanya Lihat jika Akses Presensi di-OFF-kan */}
      {!hasAttendanceAccess && (
        <div className="bg-amber-50/95 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs animate-fade-in">
          <div className="flex items-center space-x-3 text-amber-900">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm">Mode Hanya Lihat: Akses Presensi & Scanner Dibatasi</p>
              <p className="text-[11px] text-amber-800/80 mt-0.5">
                Izin pemindaian QR code dan pencatatan presensi peserta dinonaktifkan oleh Admin Utama. Anda dapat melihat jadwal sesi dan informasi pelatihan, namun scanner serta input presensi terkunci.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerAccessDenied('Akses Presensi & Scanner', 'Izin Akses Presensi & Scanner diperlukan untuk membuka scanner QR dan mencatat kehadiran peserta.')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer shrink-0"
          >
            Minta Akses Admin Utama
          </button>
        </div>
      )}
      
      {/* ================= 2-COLUMN DESKTOP / LANDSCAPE HERO & QUICK MENU GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        
        {/* KOLOM KIRI (GREEN WELCOME CARD + 3D CHARACTER) */}
        <div className="lg:col-span-6 xl:col-span-6 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 text-white rounded-md p-3.5 sm:p-5 md:p-6 relative overflow-hidden border border-emerald-600/30 flex flex-col justify-between min-h-[145px] sm:min-h-[210px] lg:min-h-[230px]">
          
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

            {/* Mini Ringkasan Dashboard - Dynamic Real Stats */}
            <div className="mt-1.5 sm:mt-auto pt-0 sm:pt-2 max-w-[155px] xs:max-w-[180px] sm:max-w-[210px] md:max-w-[225px] lg:max-w-[235px]">
              <div className="grid grid-cols-3 divide-x divide-white/20">
                
                {/* Stat 1: Kehadiran Rata */}
                {(() => {
                  const safeSessions = training?.sessions || [];
                  let totalPossibleAttendances = (participants || []).length * safeSessions.length;
                  let totalPresentCount = 0;
                  (participants || []).forEach(p => {
                    safeSessions.forEach(s => {
                      if (p.attendances?.[s.id]?.present || (s.db_id && p.attendances?.[s.db_id]?.present)) {
                        totalPresentCount += 1;
                      }
                    });
                  });
                  const avgAttRate = totalPossibleAttendances > 0 
                    ? Math.round((totalPresentCount / totalPossibleAttendances) * 100) 
                    : 0;
                  const attRatio = Math.min(Math.max(avgAttRate / 100, 0), 1);
                  const attDashOffset = (2 * Math.PI * 18) * (1 - attRatio);

                  const activeSessionsCount = safeSessions.filter(s => {
                    return getDynamicSessionStatus(s) === 'Berlangsung';
                  }).length;
                  const activeRatio = safeSessions.length > 0 ? Math.min(Math.max(activeSessionsCount / safeSessions.length, 0), 1) : 0;
                  const activeDashOffset = (2 * Math.PI * 18) * (1 - activeRatio);

                  const totalPCount = (participants || []).length;
                  const pRatio = totalPCount > 0 ? 1 : 0;
                  const pDashOffset = (2 * Math.PI * 18) * (1 - pRatio);

                  return (
                    <>
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
                              strokeDashoffset={isNaN(attDashOffset) ? 0 : attDashOffset}
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-center">
                            <span className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-black text-white tracking-tighter leading-none whitespace-nowrap">
                              {avgAttRate}<span className="text-[4px] sm:text-[5px] md:text-[5.5px] font-bold text-emerald-200">%</span>
                            </span>
                          </div>
                        </div>
                        <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                          Rata Kehadiran
                        </span>
                      </div>

                      {/* Stat 2: Peserta Aktif */}
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
                              strokeDashoffset={isNaN(pDashOffset) ? 0 : pDashOffset}
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-center">
                            <span className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-black text-white tracking-tighter leading-none whitespace-nowrap">
                              {totalPCount < 10 ? `0${totalPCount}` : totalPCount}
                            </span>
                          </div>
                        </div>
                        <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                          Peserta Aktif
                        </span>
                      </div>

                      {/* Stat 3: Sesi Berlangsung */}
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
                              strokeDashoffset={isNaN(activeDashOffset) ? 0 : activeDashOffset}
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-center">
                            <span className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] font-black text-white tracking-tighter leading-none whitespace-nowrap">
                              {activeSessionsCount < 10 ? `0${activeSessionsCount}` : activeSessionsCount}
                            </span>
                          </div>
                        </div>
                        <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                          Sesi Berlangsung
                        </span>
                      </div>
                    </>
                  );
                })()}

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

        {/* KOLOM KANAN (QUICK MENU GRID CARD) */}
        <div className="lg:col-span-6 xl:col-span-6 bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-center">
          <div className="grid grid-cols-3 h-full divide-x divide-y divide-slate-100/90">
            
            {/* Item 1: Quiz Ujian */}
            <button
              onClick={() => setActiveTab && setActiveTab('quizzes')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Quiz Ujian
              </span>
            </button>

            {/* Item 2: Daftar Peserta */}
            <button
              onClick={() => setActiveTab && setActiveTab('participants')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Daftar Peserta
              </span>
            </button>

            {/* Item 3: Live Rekap */}
            <button
              onClick={() => setActiveTab && setActiveTab('recap')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-b border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                  Live Rekap
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              </div>
            </button>

            {/* Item 4: Helpdesk Lapangan */}
            <button
              onClick={() => setActiveTab && setActiveTab('helpdesk')}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <LifeBuoy className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Helpdesk Lapangan
              </span>
            </button>

            {/* Item 5: Scan Absensi */}
            <button
              onClick={() => setSelectedSession && handleOpenScanner(training?.sessions?.[0] || { id: 'SES-01', title: 'Sesi Presensi Utama' })}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <QrCode className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Scan Absensi
              </span>
            </button>

            {/* Item 6: Ekspor Excel */}
            <button
              onClick={handleExportRekap}
              className="p-3 sm:p-4 lg:p-5 flex flex-col items-center justify-center space-y-1.5 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
            >
              <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
                <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              </div>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                  Ekspor Excel
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              </div>
            </button>

          </div>
        </div>

      </div>

      {/* Quick Simulated Input & Scanner Feedback Box */}
      {/* Quick Simulated Input & Scanner Feedback Box */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Input Manual Fast Token / Test Scanner Barcode Gun</h3>
        </div>

        <form onSubmit={processSimulatedScan} className="flex flex-col sm:flex-row gap-2.5">
          <div className="w-full sm:w-64 shrink-0">
            <select
              value={fastTokenSessionId || (training?.sessions?.[0]?.id || '')}
              onChange={(e) => setFastTokenSessionId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 transition-colors"
            >
              {(training?.sessions || []).map((s, idx) => (
                <option key={s.id} value={s.id}>
                  Sesi {idx + 1}: {s.title}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Tempelkan atau ketik Token / Nomor Presensi (Contoh: 298692)..."
            value={simulatedTokenInput}
            onChange={(e) => setSimulatedTokenInput(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-white rounded-md border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-600 transition-colors"
          />
          <button
            type="submit"
            disabled={isVerifyingFastToken}
            className="px-6 py-2.5 btn-emerald text-xs font-semibold rounded-md flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isVerifyingFastToken ? 'Memverifikasi...' : 'Verifikasi Presensi'}</span>
          </button>
        </form>

        {scanResult && (
          <div className={`p-3.5 rounded-md text-xs font-semibold flex items-start space-x-3 animate-fade-in ${
            scanResult.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
            scanResult.type === 'warning' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
            'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            {scanResult.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> :
             scanResult.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /> :
             <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            <div>
              <p>{scanResult.msg}</p>
              {scanResult.user && (
                <p className="text-[11px] font-normal mt-1 opacity-90">Peserta: {scanResult.user.name} ({scanResult.user.instansi})</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sessions Table View */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Manajemen Sesi & Scanner Kamera Live</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 self-start sm:self-auto">
            Total {training?.sessions?.length || 0} Sesi Pelatihan
          </span>
        </div>

        <div className="bg-white rounded-md border border-slate-200/90 shadow-xs overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">No</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Materi & Sesi Pelatihan</th>
                  <th className="py-3.5 px-4 min-w-[190px]">Jadwal & Ruangan</th>
                  <th className="py-3.5 px-4 text-center min-w-[120px]">Status</th>
                  <th className="py-3.5 px-4 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {(!training?.sessions || training.sessions.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-slate-400 text-xs font-medium">
                      Belum ada sesi pelatihan yang tersedia. Data sesi akan dimuat otomatis saat panitia menambahkannya ke database.
                    </td>
                  </tr>
                ) : (
                  training.sessions.map((ses, idx) => {
                    const currentStatus = getDynamicSessionStatus(ses);
                    const isCurrent = currentStatus === 'Berlangsung';
                    const isFinished = currentStatus === 'Selesai';

                  return (
                    <tr 
                      key={ses.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-emerald-50/40 font-medium' : ''
                      }`}
                    >
                      {/* No / Sesi */}
                      <td className="py-4 px-4 text-center font-bold text-slate-500">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black ${
                          isCurrent 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>

                      {/* Detail Sesi */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight leading-snug">
                            {ses.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Pemateri: <span className="text-slate-700 font-semibold">{ses.speaker || '-'}</span>
                          </p>
                        </div>
                      </td>

                      {/* Waktu & Ruangan */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 text-slate-600">
                          <div className="flex items-center space-x-1.5 font-semibold text-xs text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{ses.time}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{ses.date}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-normal">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{ses.room || 'Ruang Training'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10.5px] font-extrabold ${
                          isCurrent 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : isFinished
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>

                      {/* Aksi Menu Titik 3 */}
                      <td className="py-4 px-4 text-center relative overflow-visible">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSessionActionMenuId(activeSessionActionMenuId === ses.id ? null : ses.id);
                            }}
                            className="p-2 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer inline-flex items-center justify-center touch-manipulation"
                            title="Menu Aksi Sesi"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {/* Dropdown Popup Menu */}
                          {activeSessionActionMenuId === ses.id && (
                            <div 
                              className="absolute right-0 top-full mt-1 sm:right-full sm:top-0 sm:mt-0 sm:mr-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi Sesi</p>
                                <p className="text-xs font-semibold text-slate-800 truncate">{ses.title}</p>
                              </div>

                              {/* Option 1: Barcode */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSessionActionMenuId(null);
                                  if (!hasAttendanceAccess) {
                                    triggerAccessDenied('Kelola QR Code Presensi Sesi', 'Fitur menampilkan QR Code presensi sesi terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
                                    return;
                                  }
                                  if (currentStatus !== 'Berlangsung') {
                                    alert(`Presensi hanya dapat dilakukan saat status sesi "Berlangsung". Saat ini sesi berstatus "${currentStatus}".`);
                                    return;
                                  }
                                  setBarcodeModalSession(ses);
                                  setBarcodeModalSessionIndex(idx + 1);
                                }}
                                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer touch-manipulation"
                              >
                                <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Tampilkan Barcode Sesi</span>
                              </button>

                              {/* Option 2: Scan Kamera */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSessionActionMenuId(null);
                                  if (currentStatus !== 'Berlangsung') {
                                    alert(`Presensi hanya dapat dipindai saat status sesi "Berlangsung". Saat ini sesi berstatus "${currentStatus}".`);
                                    return;
                                  }
                                  handleOpenScanner(ses);
                                }}
                                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer touch-manipulation"
                              >
                                <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Scan Kamera Live</span>
                              </button>

                              {/* Option 3: Presensi Manual (Input Token QR Peserta) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSessionActionMenuId(null);
                                  if (!hasAttendanceAccess) {
                                    triggerAccessDenied('Presensi Manual Sesi', 'Fitur input presensi manual peserta terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
                                    return;
                                  }
                                  if (currentStatus !== 'Berlangsung') {
                                    alert(`Presensi manual hanya dapat diinput saat status sesi "Berlangsung". Saat ini sesi berstatus "${currentStatus}".`);
                                    return;
                                  }
                                  setManualAttendanceSession(ses);
                                  setManualAttendanceToken('');
                                  setManualAttendanceSelectedParticipantId('');
                                  setManualAttendanceFeedback(null);
                                  setManualAttendanceTab('token');
                                }}
                                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer touch-manipulation"
                              >
                                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Presensi Manual</span>
                              </button>

                              <div className="border-t border-slate-100 my-1" />

                              {/* Option 4: Presensi Peserta (Data Presensi Sesi) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSessionActionMenuId(null);
                                  if (!hasAttendanceAccess) {
                                    triggerAccessDenied('Presensi Peserta Sesi', 'Fitur melihat data presensi peserta pada sesi ini terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Presensi & Scanner.');
                                    return;
                                  }
                                  setRecapModalSession(ses);
                                  setRecapModalFilter('ALL');
                                  setRecapSearchQuery('');
                                }}
                                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer touch-manipulation"
                              >
                                <ClipboardCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Presensi Peserta</span>
                              </button>

                              {/* Option 5: Penilaian Peserta (Lembar Nilai Sesi) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSessionActionMenuId(null);
                                  if (!hasAssessmentAccess) {
                                    triggerAccessDenied('Penilaian Peserta Sesi', 'Fitur input penilaian evaluasi peserta pada sesi ini terkunci. Silakan hubungi Koordinator / Admin Utama untuk mengaktifkan Akses Penilaian Peserta.');
                                    return;
                                  }
                                  if (currentStatus !== 'Berlangsung') {
                                    alert(`Penilaian (Afektif, Kognitif, Psikomotorik) hanya dapat diinput saat status sesi "Berlangsung". Saat ini sesi berstatus "${currentStatus}".`);
                                    return;
                                  }
                                  setSessionGradingModal({ session: ses, sessionIndex: idx + 1 });
                                  setPenilaianSearchQuery('');
                                }}
                                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer touch-manipulation"
                              >
                                <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Penilaian Peserta</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Scanner Camera Modal */}
      {isScannerOpen && selectedSession && (
        <CameraScannerModal
          selectedSession={selectedSession}
          participants={participants}
          setParticipants={setParticipants}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Session Barcode Activation & Countdown Modal */}
      {barcodeModalSession && (
        <SessionBarcodeModal
          session={barcodeModalSession}
          sessionIndex={barcodeModalSessionIndex}
          onClose={() => setBarcodeModalSession(null)}
        />
      )}

      {/* Modal Presensi Manual Sesi */}
      {manualAttendanceSession && (
        <div 
          onClick={() => setManualAttendanceSession(null)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90dvh] overflow-y-auto my-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 truncate">Presensi Manual Peserta</h3>
                  <p className="text-xs text-emerald-700 font-semibold truncate block" title={manualAttendanceSession.title}>
                    {manualAttendanceSession.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManualAttendanceSession(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Info Badge */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <div className="flex items-center space-x-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{manualAttendanceSession.time}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center space-x-1.5 font-medium truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{manualAttendanceSession.room || 'Aula Utama'}</span>
              </div>
            </div>

            {/* Tab selector */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setManualAttendanceTab('token');
                  setManualAttendanceFeedback(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  manualAttendanceTab === 'token'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Token QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualAttendanceTab('picker');
                  setManualAttendanceFeedback(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  manualAttendanceTab === 'picker'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dari Daftar
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitManualAttendance} className="space-y-3.5 pt-1">
              {manualAttendanceTab === 'token' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kode Token QR Peserta:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 298692"
                    value={manualAttendanceToken}
                    onChange={(e) => setManualAttendanceToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-600 transition-colors placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pilih Peserta Pelatihan:
                  </label>
                  <select
                    value={manualAttendanceSelectedParticipantId}
                    onChange={(e) => setManualAttendanceSelectedParticipantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 transition-colors"
                  >
                    <option value="">-- Pilih Peserta --</option>
                    {(participants || []).map((p) => {
                      const isPresent = p.attendances?.[manualAttendanceSession.id]?.present || (manualAttendanceSession.db_id && p.attendances?.[manualAttendanceSession.db_id]?.present);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.instansi ? `(${p.instansi})` : ''} - {isPresent ? '✓ Sudah Hadir' : '○ Belum Hadir'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Status Selector Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Status Kehadiran yang Diinput:
                </label>
                <div className="relative">
                  <select
                    value={manualAttendanceStatus}
                    onChange={(e) => setManualAttendanceStatus(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-colors appearance-none cursor-pointer pr-10 bg-white ${
                      manualAttendanceStatus === 'present'
                        ? 'border-emerald-500 text-emerald-800 focus:border-emerald-600'
                        : manualAttendanceStatus === 'permission'
                        ? 'border-amber-500 text-amber-800 focus:border-amber-600'
                        : 'border-rose-500 text-rose-800 focus:border-rose-600'
                    }`}
                  >
                    <option value="present">Hadir</option>
                    <option value="permission">Izin</option>
                    <option value="absent">Tidak Hadir</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Note / Excuse reason input if Izin */}
              {manualAttendanceStatus === 'permission' && (
                <div className="animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-amber-800 mb-1.5">
                    Alasan / Keterangan Izin:
                  </label>
                  <input
                    type="text"
                    value={manualAttendanceNote}
                    onChange={(e) => setManualAttendanceNote(e.target.value)}
                    placeholder="Contoh: Sakit dengan surat dokter, Tugas dinas..."
                    className="w-full px-3.5 py-2.5 bg-amber-50/50 rounded-xl border border-amber-300 text-xs text-slate-900 outline-none focus:border-amber-500 transition-colors"
                    autoFocus
                  />
                </div>
              )}

              {/* Feedback alert */}
              {manualAttendanceFeedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-start space-x-2.5 ${
                  manualAttendanceFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : manualAttendanceFeedback.type === 'warning'
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}>
                  {manualAttendanceFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                  {manualAttendanceFeedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                  {manualAttendanceFeedback.type === 'error' && <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p>{manualAttendanceFeedback.msg}</p>
                    {manualAttendanceFeedback.user && (
                      <p className="text-[11px] font-normal mt-0.5 opacity-90">
                        Waktu: {manualAttendanceFeedback.time || 'Tercatat'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={isSubmittingManualAttendance}
                  className={`flex-1 py-2.5 px-4 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                    manualAttendanceStatus === 'present'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : manualAttendanceStatus === 'permission'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmittingManualAttendance 
                      ? 'Menyimpan...' 
                      : manualAttendanceStatus === 'present'
                      ? 'Simpan Status Hadir'
                      : manualAttendanceStatus === 'permission'
                      ? 'Simpan Status Izin'
                      : 'Simpan Tidak Hadir'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setManualAttendanceSession(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Presensi Sesi untuk Peserta Spesifik (dari Tab Daftar Peserta) */}
      {participantAttendanceModalUser && (
        <div 
          onClick={() => setParticipantAttendanceModalUser(null)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90dvh] overflow-y-auto my-auto"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kelola Presensi Sesi Peserta</h3>
                  <p className="text-xs text-slate-500">
                    <strong className="text-slate-800">{participantAttendanceModalUser.name}</strong> • {participantAttendanceModalUser.instansi || '-'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setParticipantAttendanceModalUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner Mode Hanya Lihat jika Akses Presensi di-OFF-kan */}
            {!hasAttendanceAccess && (
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-amber-900 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Mode Hanya Lihat:</strong> Akses pengelolaan presensi dinonaktifkan oleh Admin Utama.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerAccessDenied('Akses Presensi & Scanner', 'Izin Akses Presensi & Scanner diperlukan untuk mengubah status kehadiran peserta.')}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Minta Akses Admin Utama
                </button>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Pilih tindakan kehadiran untuk setiap sesi pelatihan di bawah ini:
              </p>

              <div className="space-y-2.5">
                {(training?.sessions || []).map((ses) => {
                  const currentP = participants.find(p => p.id === participantAttendanceModalUser.id) || participantAttendanceModalUser;
                  const targetSesId = ses.id;
                  const att = currentP.attendances?.[targetSesId] || 
                              (ses.db_id && currentP.attendances?.[ses.db_id]) || 
                              (typeof targetSesId === 'string' && currentP.attendances?.[targetSesId.replace(/\D/g, '')]);
                  const isPresent = !!att?.present;
                  const isExcused = !isPresent && (att?.status === 'Izin' || att?.raw_status === 'permission');
                  const isAbsent = !isPresent && !isExcused && (att?.status === 'Tidak Hadir' || att?.raw_status === 'absent');
                  const excuseNote = att?.note || '';

                  return (
                    <div key={ses.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-white rounded border">{ses.id}</span>
                          <h4 className="text-xs font-bold text-slate-900">{ses.title}</h4>
                        </div>
                        <div className="flex items-center space-x-2 mt-1.5">
                          {isPresent ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Hadir ({att.time || 'Tercatat'})</span>
                            </span>
                          ) : isExcused ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>Izin: "{excuseNote || 'Berhalangan'}"</span>
                            </span>
                          ) : isAbsent ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Tidak Hadir (Alpa)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600">
                              <span>Belum Absen</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetPresensi(currentP, ses)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Hadir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExcuseModalUser(currentP);
                            setExcuseModalSessionId(ses.id);
                            setExcuseReasonText(excuseNote || '');
                          }}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center space-x-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>Izin</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAbsent(currentP, ses)}
                          className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center space-x-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Tidak Hadir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetAttendance(currentP, ses)}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                          title="Reset ke Belum Absen"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setParticipantAttendanceModalUser(null)}
                className="py-2 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PARTICIPANT ASSESSMENT MODALS (PENILAIAN PESERTA LK 1) */}
      {/* ========================================================================= */}

      {/* FULL PAGE 1: LEMBAR PENILAIAN PER SESI (FAST CLICK BUTTONS) */}
      {sessionGradingModal && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
          
          {/* Clean White Header */}
          <header className="px-4 sm:px-8 py-4 border-b border-slate-200 bg-white text-slate-900 shrink-0 z-30 shadow-2xs">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setSessionGradingModal(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                  title="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase border border-emerald-200">
                    LEMBAR PENILAIAN SESI {sessionGradingModal.sessionIndex}
                  </span>
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    • {sessionGradingModal.session.time}
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setSessionGradingModal(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                title="Tutup Halaman"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Sub-Header Filters & Search */}
          <div className="px-4 sm:px-8 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 z-20 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama peserta dalam sesi ini..."
                value={penilaianSearchQuery}
                onChange={(e) => setPenilaianSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold">
              <span>Menampilkan {sessionGradingParticipants.length} dari {assessedParticipants.length} Peserta</span>
            </div>
          </div>

          {/* Scrollable Participants Grading Table (Matching Gambar 2) */}
          <div className="flex-1 overflow-auto bg-white relative pb-28 md:pb-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-2xs">
                <tr className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 md:px-5 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center sticky left-0 z-20 bg-slate-50">NO</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-5 min-w-[130px] sm:min-w-[200px] sticky left-[32px] sm:left-[40px] md:left-[48px] z-20 bg-slate-50 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">NAMA PESERTA</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-4 text-center min-w-[110px] sm:min-w-[125px]">AFEKTIF (50%)</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-4 text-center min-w-[110px] sm:min-w-[125px]">KOGNITIF (30%)</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-4 text-center min-w-[110px] sm:min-w-[130px]">PSIKOMOTORIK (20%)</th>
                  <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-2 text-center min-w-[75px] sm:min-w-[90px] w-20 sm:w-24">NILAI AKHIR (NA)</th>
                  <th className="py-2.5 sm:py-3.5 px-3 md:px-6 text-center min-w-[140px] sm:min-w-[170px]">STATUS PENILAIAN</th>
                  <th className="py-2.5 sm:py-3.5 px-2 md:px-5 text-center min-w-[90px] sm:min-w-[110px]">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionGradingParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      Tidak ada peserta yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  sessionGradingParticipants.map((p, idx) => {
                    const { afektif, kognitif, psikomotorik, totalViolations, totalContributions, finalScore, predicate, status, statusClass } = p.computed;
                    const sessionViolations = (p.assessment?.violations || []).filter(v => v.sessionId === sessionGradingModal.session.id || String(v.sessionId) === String(sessionGradingModal.session.id));
                    const sessionContributions = (p.assessment?.contributions || []).filter(c => c.sessionId === sessionGradingModal.session.id || String(c.sessionId) === String(sessionGradingModal.session.id));

                    return (
                      <tr key={p.id} className="group hover:bg-emerald-50/20 transition-colors">
                        <td className="py-2 sm:py-3 px-1 sm:px-2 md:px-5 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] font-semibold text-slate-400 text-center sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 text-[11px] sm:text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-5 min-w-[130px] sm:min-w-[200px] sticky left-[32px] sm:left-[40px] md:left-[48px] z-10 bg-white group-hover:bg-slate-50/90 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">
                          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                            <div 
                              onClick={() => setPreviewPhotoUser(p)}
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all touch-manipulation"
                              title="Klik untuk melihat foto profil"
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
                            <div 
                              onClick={() => setPreviewPhotoUser(p)}
                              className="cursor-pointer group/name min-w-0 flex-1 touch-manipulation"
                              title="Klik untuk melihat foto profil"
                            >
                              <div className="font-bold text-slate-900 text-[11px] sm:text-sm group-hover/name:text-emerald-700 transition-colors truncate max-w-[105px] sm:max-w-none leading-tight">{p.name}</div>
                              <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate sm:hidden max-w-[105px] leading-tight">{p.instansi || '-'}</div>
                            </div>
                          </div>
                        </td>
                        {/* AFEKTIF (40%): [-] Pilih Pelanggaran, [+] Cancel Pelanggaran Terakhir */}
                        <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-center">
                          <div className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 bg-white px-1 py-0.5 sm:px-1.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors">
                            <button
                              type="button"
                              onClick={() => setViolationPickerModal({ participant: p, session: sessionGradingModal.session })}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-[11px] sm:text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90 touch-manipulation"
                              title="Catat Pelanggaran Afektif (Pilih Jenis Pelanggaran)"
                            >
                              -
                            </button>
                            <span 
                              className="w-8 sm:w-12 text-center font-mono font-bold text-emerald-700 text-[11px] sm:text-sm block"
                              title={`Nilai Afektif Sesi: ${afektif} (${sessionViolations.length} Pelanggaran)`}
                            >
                              {afektif}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (sessionViolations.length > 0) {
                                  handleUndoViolation(p.id, p.name, sessionGradingModal.session.id);
                                } else {
                                  showNotification('Tidak ada catatan pelanggaran yang dapat dibatalkan di sesi ini.');
                                }
                              }}
                              disabled={sessionViolations.length === 0}
                              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center transition-all touch-manipulation ${
                                sessionViolations.length > 0 
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer active:scale-90' 
                                  : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                              }`}
                              title={sessionViolations.length > 0 ? "Batalkan Pelanggaran Terakhir (+)" : "Belum ada pelanggaran di sesi ini"}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        {/* KOGNITIF (30%): [-] Batalkan / Kurangi Nilai Kognitif, [ Nilai ], [+] Tambah Rubrik Kognitif */}
                        <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-center">
                          <div className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 bg-white px-1 py-0.5 sm:px-1.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors">
                            <button
                              type="button"
                              onClick={() => handleUndoKognitif(p.id, p.name, sessionGradingModal.session.id)}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[11px] sm:text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90 touch-manipulation"
                              title="Batalkan / Kurangi Nilai Kognitif (-)"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => setKognitifPickerModal({ participant: p, session: sessionGradingModal.session, mode: 'all' })}
                              className="w-8 sm:w-12 text-center font-mono font-bold text-blue-700 text-[11px] sm:text-sm block cursor-pointer hover:bg-blue-50/60 rounded py-0.5 transition-colors touch-manipulation"
                              title="Klik untuk membuka Rubrik Kognitif Lengkap"
                            >
                              {kognitif}
                            </button>
                            <button
                              type="button"
                              onClick={() => setKognitifPickerModal({ participant: p, session: sessionGradingModal.session, mode: 'bonus' })}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[11px] sm:text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90 touch-manipulation"
                              title="Catat Respon / Rubrik Kognitif (+)"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        {/* PSIKOMOTORIK (30%): [-] Cancel Keaktifan Terakhir, [+] Pilih Keaktifan Baru */}
                        <td className="py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-center">
                          <div className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 bg-white px-1 py-0.5 sm:px-1.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs hover:border-teal-300 transition-colors">
                            <button
                              type="button"
                              onClick={() => {
                                if (sessionContributions.length > 0) {
                                  handleUndoContribution(p.id, p.name, sessionGradingModal.session.id);
                                } else {
                                  showNotification('Tidak ada catatan keaktifan yang dapat dibatalkan di sesi ini.');
                                }
                              }}
                              disabled={sessionContributions.length === 0}
                              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center transition-all touch-manipulation ${
                                sessionContributions.length > 0 
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer active:scale-90' 
                                  : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                              }`}
                              title={sessionContributions.length > 0 ? "Batalkan Keaktifan Terakhir (-)" : "Belum ada keaktifan di sesi ini"}
                            >
                              -
                            </button>
                            <span 
                              className="w-8 sm:w-12 text-center font-mono font-bold text-teal-700 text-[11px] sm:text-sm block"
                              title={`Nilai Psikomotorik Sesi: ${psikomotorik} (${sessionContributions.length} Keaktifan)`}
                            >
                              {psikomotorik}
                            </span>
                            <button
                              type="button"
                              onClick={() => setContributionPickerModal({ participant: p, session: sessionGradingModal.session })}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-black text-[11px] sm:text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90 touch-manipulation"
                              title="Catat Keaktifan Psikomotorik (Pilih Jenis Keaktifan)"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1.5 sm:px-2 text-center font-mono font-black text-emerald-700 text-xs sm:text-sm whitespace-nowrap">
                          {finalScore}
                        </td>
                        <td className="py-2 sm:py-3 px-3 md:px-6 text-center">
                          <span className={`inline-flex items-center space-x-1 sm:space-x-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap shadow-2xs ${statusClass}`}>
                            {status === 'Lulus' ? (
                              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
                            ) : status === 'Perbaikan' ? (
                              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span className="whitespace-nowrap">{status} ({predicate})</span>
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 px-2 md:px-5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedParticipantForGrading(p)}
                            className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs shadow-2xs inline-flex items-center space-x-1 sm:space-x-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap touch-manipulation"
                            title={`Lihat Log Rincian Penilaian & Kesalahan ${p.name}`}
                          >
                            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700" />
                            <span>Lihat Log</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <footer className="p-2.5 pb-24 md:pb-4 sm:p-4 bg-white border-t border-slate-200/90 flex items-center justify-between gap-3 shrink-0 z-30">
            <span className="text-[11px] sm:text-xs text-slate-500 hidden sm:inline">
              Semua perubahan nilai tersimpan otomatis dan langsung direkap ke nilai akhir.
            </span>
            <button
              type="button"
              onClick={() => setSessionGradingModal(null)}
              className="px-4 py-2 sm:px-6 sm:py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 ml-auto"
            >
              Selesai & Tutup
            </button>
          </footer>
        </div>
      )}

      {/* MODAL TERPADU PILIHAN SIKAP (AFEKTIF, KOGNITIF, PSIKOMOTORIK) */}
      {renderUnifiedAttitudeModal()}

      {/* FULL PAGE: DETAIL LEMBAR PENILAIAN INDIVIDUAL (FULL ASSESSMENT REVIEW & NOTES) */}
      {selectedParticipantForGrading && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in">
          {/* Header Bar */}
          <header className="bg-white border-b border-slate-200/90 px-4 md:px-8 py-3.5 flex items-center justify-between gap-3 shadow-xs shrink-0 z-30">
            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedParticipantForGrading(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base shadow-2xs shrink-0">
                  {selectedParticipantForGrading.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight truncate max-w-xs sm:max-w-md">{selectedParticipantForGrading.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{selectedParticipantForGrading.instansi} • {selectedParticipantForGrading.email}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedParticipantForGrading(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
              title="Tutup Halaman"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-slate-50">
            <div className="w-full max-w-7xl mx-auto space-y-5 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm">
              
              {/* Live Calculation Formula Card */}
              {(() => {
                const ass = calculateAssessment(currentAssessments[selectedParticipantForGrading.id]);
                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Formula Nilai Akhir (NA)</span>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-base font-black text-slate-900 font-mono">
                          NA = {ass.finalScore} <span className="text-xs text-slate-500 font-sans">({ass.finalScore1000} Skala 1000)</span>
                        </span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${ass.statusClass}`}>
                          {ass.status} ({ass.predicate})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-center pt-1">
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Afektif (50%)</span>
                        <strong className="text-emerald-800 font-mono text-sm">{ass.afektif}</strong>
                        <span className="text-[10px] text-slate-500 block">x 0.50 = {(ass.afektif * 0.5).toFixed(1)}</span>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Kognitif (30%)</span>
                        <strong className="text-blue-800 font-mono text-sm">{ass.kognitif}</strong>
                        <span className="text-[10px] text-slate-500 block">x 0.30 = {(ass.kognitif * 0.3).toFixed(1)}</span>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Psikomotorik (20%)</span>
                        <strong className="text-teal-800 font-mono text-sm">{ass.psikomotorik}</strong>
                        <span className="text-[10px] text-slate-500 block">x 0.20 = {(ass.psikomotorik * 0.2).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Riwayat Log Pelanggaran & Tindakan */}
              {(() => {
                const targetAss = currentAssessments[selectedParticipantForGrading.id] || {};
                const rawVios = targetAss.violations;
                const viosList = Array.isArray(rawVios) 
                  ? rawVios 
                  : (rawVios && typeof rawVios === 'object' ? Object.values(rawVios).filter(v => v && typeof v === 'object' && ('points' in v || 'item' in v)) : []);
                const rawCons = targetAss.contributions;
                const consList = Array.isArray(rawCons)
                  ? rawCons
                  : (Array.isArray(rawCons?.contributions) 
                    ? rawCons.contributions 
                    : (rawCons && typeof rawCons === 'object' ? Object.values(rawCons).filter(c => c && typeof c === 'object' && ('points' in c || 'item' in c)) : []));
                const totalVioPoints = viosList.reduce((s, v) => s + (Math.abs(Number(v?.points)) || 0), 0);
                const totalConPoints = consList.reduce((s, c) => s + (Math.abs(Number(c?.points)) || 0), 0);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Box 1: Log Pelanggaran Afektif */}
                    <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                      <div className="flex items-center justify-between font-bold text-rose-950">
                        <span>Log Pelanggaran Afektif (Modal 100)</span>
                        <span className="text-rose-700 font-mono">
                          -{totalVioPoints} Poin
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {viosList.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] py-3">Tidak ada catatan pelanggaran (Nilai 100 sempurna).</p>
                        ) : (
                          viosList.map((v, vIdx) => (
                            <div key={v.id || vIdx} className="p-2.5 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-[11px] shadow-2xs">
                              <div>
                                <span className="font-bold text-slate-900 block">[{v.symbol || 'A'}] {v.item}</span>
                                <span className="text-[10px] text-slate-400">{v.sessionTitle || 'Sesi'} • {v.timestamp || '-'}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <span className="font-bold text-rose-600 font-mono">-{v.points}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveViolationItem(selectedParticipantForGrading.id, v.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="Hapus Pelanggaran Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Box 2: Log Keaktifan Psikomotorik */}
                    <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
                      <div className="flex items-center justify-between font-bold text-teal-950">
                        <span>Log Keaktifan Psikomotorik (Modal 50)</span>
                        <span className="text-teal-700 font-mono">
                          +{totalConPoints} Poin
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {consList.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] py-3">Belum ada catatan keaktifan.</p>
                        ) : (
                          consList.map((c, cIdx) => (
                            <div key={c.id || cIdx} className="p-2.5 bg-white rounded-xl border border-teal-200 flex items-center justify-between text-[11px] shadow-2xs">
                              <div>
                                <span className="font-bold text-slate-900 block">[{c.symbol || 'P'}] {c.item}</span>
                                <span className="text-[10px] text-slate-400">{c.sessionTitle || 'Sesi'} • {c.timestamp || '-'}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <span className="font-bold text-teal-600 font-mono">+{c.points}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveContributionItem(selectedParticipantForGrading.id, c.id)}
                                  className="p-1 text-slate-400 hover:text-teal-600 rounded cursor-pointer"
                                  title="Hapus Keaktifan Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* BREAKDOWN REKAPITULASI & LOG PENILAIAN PER SESI MATERI */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                      <span>Rincian & Log Penilaian Per Sesi Materi</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Histori perolehan nilai, log penambahan keaktifan, dan pengurangan pelanggaran di setiap sesi pelatihan.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 self-start sm:self-auto shrink-0">
                    {(training?.sessions || []).length} Total Sesi
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-3 text-center w-10">Sesi</th>
                          <th className="py-3 px-4 min-w-[180px]">Materi / Waktu</th>
                          <th className="py-3 px-3 text-center min-w-[90px]">Afektif (50%)</th>
                          <th className="py-3 px-3 text-center min-w-[90px]">Kognitif (30%)</th>
                          <th className="py-3 px-3 text-center min-w-[95px]">Psikomotorik (20%)</th>
                          <th className="py-3 px-3 text-center min-w-[90px]">NA Sesi</th>
                          <th className="py-3 px-4 min-w-[200px]">Log Perubahan Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 font-medium bg-white">
                        {(training?.sessions || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                              Belum ada jadwal sesi materi dalam pelatihan ini.
                            </td>
                          </tr>
                        ) : (
                          (training?.sessions || []).map((s, sIdx) => {
                            const modalAss = currentAssessments[selectedParticipantForGrading.id] || {};
                            const sAss = modalAss.sessions?.[s.id] || null;
                            const rawAllVios = modalAss.violations;
                            const safeAllVios = Array.isArray(rawAllVios) 
                              ? rawAllVios 
                              : (rawAllVios && typeof rawAllVios === 'object' ? Object.values(rawAllVios).filter(v => v && typeof v === 'object' && ('points' in v || 'item' in v)) : []);
                            const rawAllCons = modalAss.contributions;
                            const safeAllCons = Array.isArray(rawAllCons)
                              ? rawAllCons
                              : (Array.isArray(rawAllCons?.contributions) 
                                ? rawAllCons.contributions 
                                : (rawAllCons && typeof rawAllCons === 'object' ? Object.values(rawAllCons).filter(c => c && typeof c === 'object' && ('points' in c || 'item' in c)) : []));
                            
                            const sVios = safeAllVios.filter(v => v.sessionId === s.id || String(v.sessionId) === String(s.id));
                            const sCons = safeAllCons.filter(c => c.sessionId === s.id || String(c.sessionId) === String(s.id));
                            
                            const sVioPts = sVios.reduce((acc, v) => acc + Math.abs(Number(v.points) || 0), 0);
                            const sConPts = sCons.reduce((acc, c) => acc + Math.abs(Number(c.points) || 0), 0);
                            
                            const sAf = sAss?.afektif !== undefined ? sAss.afektif : Math.max(0, 100 - sVioPts);
                            const sKog = sAss?.kognitif !== undefined ? sAss.kognitif : 75;
                            const sPsi = sAss?.psikomotorik !== undefined ? sAss.psikomotorik : Math.min(100, 50 + sConPts);
                            
                            const sNA = Math.round(((sAf * 0.5) + (sKog * 0.3) + (sPsi * 0.2)) * 10) / 10;
                            const isPassing = sNA >= 60;

                            return (
                              <tr key={s.id || sIdx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-3 text-center font-bold text-slate-500">
                                  {sIdx + 1}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 truncate max-w-[220px]" title={s.title}>
                                    {s.title || `Sesi Materi ${sIdx + 1}`}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {s.time || s.date || 'Waktu Sesi'}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                                  {sAf}
                                  {sVioPts > 0 && (
                                    <span className="block text-[9px] text-rose-500 font-semibold font-sans">(-{sVioPts} Poin)</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">
                                  {sKog}
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-teal-700">
                                  {sPsi}
                                  {sConPts > 0 && (
                                    <span className="block text-[9px] text-teal-600 font-semibold font-sans">(+{sConPts} Poin)</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                                    isPassing ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}>
                                    {sNA}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {sVios.length === 0 && sCons.length === 0 ? (
                                    <span className="text-[11px] text-slate-400 italic">Standar (Tidak ada pelanggaran/keaktifan)</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1 items-center max-w-xs">
                                      {sVios.map((v, vIdx) => (
                                        <span key={vIdx} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold" title={`${v.item} (${v.timestamp})`}>
                                          <span>-{v.points}</span>
                                          <span className="truncate max-w-[80px]">{v.item}</span>
                                        </span>
                                      ))}
                                      {sCons.map((c, cIdx) => (
                                        <span key={cIdx} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-semibold" title={`${c.item} (${c.timestamp})`}>
                                          <span>+{c.points}</span>
                                          <span className="truncate max-w-[80px]">{c.item}</span>
                                        </span>
                                      ))}
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
                </div>
              </div>

              {/* Catatan Kualitatif / Rekomendasi Pemandu */}
              <div className="space-y-2 text-xs">
                <label className="block font-bold text-slate-700">
                  Catatan Kualitatif / Deskripsi Karakter Pemandu
                </label>
                <textarea
                  rows={3}
                  value={qualitativeNoteInput}
                  onChange={(e) => setQualitativeNoteInput(e.target.value)}
                  placeholder="Tuliskan gambaran kualitatif, sikap, keaktifan dan rekomendasi untuk peserta ini..."
                  className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                />
              </div>

            </div>
          </div>

          {/* Footer Bar */}
          <footer className="bg-white border-t border-slate-200/90 px-4 md:px-8 py-3.5 flex items-center justify-between shrink-0 z-30">
            <button
              type="button"
              onClick={() => setSelectedParticipantForGrading(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={() => {
                handleSaveQualitativeNote(selectedParticipantForGrading.id, qualitativeNoteInput);
                setSelectedParticipantForGrading(null);
              }}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              Simpan Lembar Penilaian
            </button>
          </footer>
        </div>
      )}

      {/* Modal Peringatan Akses Dibatasi (RBAC) */}
      <AccessDeniedModal
        isOpen={accessDeniedConfig.isOpen}
        onClose={() => setAccessDeniedConfig(prev => ({ ...prev, isOpen: false }))}
        title={accessDeniedConfig.title}
        featureName={accessDeniedConfig.featureName}
        description={accessDeniedConfig.description}
        adminName={currentUser?.name}
        whatsappNumber={siteSettings?.contactPhone || '62887437525303'}
      />

      {/* Modal Preview Foto Profil Peserta */}
      {renderPreviewPhotoModal()}

      {/* Modal Detail / Edit Presensi Satu Sesi */}
      {renderRecapSingleSessionModal()}

      {/* Modal Form Alasan Izin / Dispensasi */}
      {renderExcuseModal()}

    </div>
  );
}
