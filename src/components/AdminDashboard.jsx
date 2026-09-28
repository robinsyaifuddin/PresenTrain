import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Camera, QrCode, Search, CheckCircle2, AlertTriangle, XCircle, Clock, 
  MapPin, Users, FileSpreadsheet, X, Sparkles, Printer, Share2, LifeBuoy, 
  Check, PlayCircle, StopCircle, RefreshCw, AlertCircle, FileText, Send, UserCheck, ShieldAlert,
  MoreVertical, User, Eye, Edit, Trash2, Save, Calendar, BarChart3, Plus, Copy, Lock, ShieldCheck, ToggleLeft, ToggleRight,
  ChevronRight, ChevronDown, Filter, ArrowLeft, GraduationCap, Award, Minus, RotateCcw, SlidersHorizontal, Calculator, HelpCircle, Maximize2,
  ClipboardCheck
} from 'lucide-react';
import CameraScannerModal from './CameraScannerModal';
import SessionBarcodeModal from './SessionBarcodeModal';
import GoogleFormQuizBuilder from './GoogleFormQuizBuilder';
import ProfileView from './ProfileView';
import SettingsView from './SettingsView';
import HelpdeskView from './HelpdeskView';
import GuideView from './GuideView';
import { 
  VIOLATION_RULES, 
  CONTRIBUTION_RULES, 
  calculateAssessment, 
  INITIAL_ASSESSMENTS,
  KOMISARIAT_LIST 
} from '../data/mockData';

export default function AdminDashboard({ 
  training, 
  participants, 
  setParticipants, 
  activeTab, 
  setActiveTab,
  siteSettings,
  currentUser,
  onUpdateUser,
  userPermissions,
  quizzes,
  setQuizzes,
  quizSubmissions,
  setQuizSubmissions,
  quizRequests,
  setQuizRequests,
  assessments,
  setAssessments
}) {
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
  const [incidents, setIncidents] = useState([
    { id: 'INC-01', user: 'Rahmat Hidayat', issue: 'Token QR Terindikasi Bocor', solution: 'Reset QR Token Baru (ABSEN-RESET-881)', time: '09:15 WIB', status: 'Selesai' },
    { id: 'INC-02', user: 'Siti Nurhaliza', issue: 'Izin Pindah Ruangan Lab 1 ke Lab 2', solution: 'Disetujui Koordinator Sesi', time: '10:30 WIB', status: 'Selesai' },
  ]);
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
  const [requestResetSub, setRequestResetSub] = useState(null);
  const [requestResetReason, setRequestResetReason] = useState('');

  // --- PARTICIPANT ASSESSMENT (PENILAIAN PESERTA LK 1) STATES ---
  const [sessionGradingModal, setSessionGradingModal] = useState(null); // { session, sessionIndex }
  const [selectedParticipantForGrading, setSelectedParticipantForGrading] = useState(null); // Individual participant detail sheet
  const [violationPickerModal, setViolationPickerModal] = useState(null); // { participant, session }
  const [contributionPickerModal, setContributionPickerModal] = useState(null); // { participant, session }
  const [penilaianSearchQuery, setPenilaianSearchQuery] = useState('');
  const [penilaianFilterKomisariat, setPenilaianFilterKomisariat] = useState('ALL');
  const [penilaianFilterStatus, setPenilaianFilterStatus] = useState('ALL');
  const [activeAssessmentActionMenuId, setActiveAssessmentActionMenuId] = useState(null);
  const [penilaianFullscreenModalOpen, setPenilaianFullscreenModalOpen] = useState(false);
  const [penilaianModalSession, setPenilaianModalSession] = useState(null);
  const [penilaianModalSearchQuery, setPenilaianModalSearchQuery] = useState('');
  const [penilaianModalFilter, setPenilaianModalFilter] = useState('ALL');

  const totalP = (participants || []).length;

  // Notification Toast
  const [notification, setNotification] = useState('');
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // Memoized Assessment per participant
  const assessedParticipants = useMemo(() => {
    return (participants || []).map(p => {
      const rawAss = currentAssessments[p.id] || {
        participantId: p.id,
        kognitif: 75,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      const computed = calculateAssessment(rawAss);
      return {
        ...p,
        assessment: rawAss,
        computed
      };
    });
  }, [participants, currentAssessments]);

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

  // Memoized Assessment for Single Session Penilaian Modal
  const modalSessionAssessedParticipants = useMemo(() => {
    if (!penilaianModalSession) return [];
    const q = (penilaianModalSearchQuery || '').toLowerCase().trim();
    return assessedParticipants.filter(p => {
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
  }, [assessedParticipants, penilaianModalSession, penilaianModalSearchQuery, penilaianModalFilter]);

  // Handler: Quick Add Violation (Pengurangan Nilai Afektif)
  const handleQuickAddViolation = (participant, sessionObj, ruleItem, points, symbol) => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const newVio = {
      id: `VIO-${participant.id}-${Date.now()}`,
      sessionId: sessionObj?.id || 'SES-01',
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
      return {
        ...prev,
        [participant.id]: {
          ...current,
          violations: [newVio, ...(current.violations || [])]
        }
      };
    });

    showNotification(`Pengurangan -${points} Poin (${symbol} ${ruleItem}) dicatat untuk ${participant.name}.`);
    setViolationPickerModal(null);
  };

  // Handler: Quick Add Contribution (Penambahan Nilai Psikomotorik)
  const handleQuickAddContribution = (participant, sessionObj, ruleItem, points, symbol) => {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const newCon = {
      id: `CON-${participant.id}-${Date.now()}`,
      sessionId: sessionObj?.id || 'SES-01',
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
      return {
        ...prev,
        [participant.id]: {
          ...current,
          contributions: [newCon, ...(current.contributions || [])]
        }
      };
    });

    showNotification(`Penambahan +${points} Poin (${symbol} ${ruleItem}) dicatat untuk ${participant.name}.`);
    setContributionPickerModal(null);
  };

  // Handler: Undo Last Violation
  const handleUndoViolation = (participantId, participantName) => {
    updateAssessments(prev => {
      const current = prev[participantId];
      if (!current || !current.violations || current.violations.length === 0) return prev;
      const [removed, ...rest] = current.violations;
      showNotification(`Pelanggaran terakhir ("${removed.item}") dihapus untuk ${participantName}.`);
      return {
        ...prev,
        [participantId]: {
          ...current,
          violations: rest
        }
      };
    });
  };

  // Handler: Undo Last Contribution
  const handleUndoContribution = (participantId, participantName) => {
    updateAssessments(prev => {
      const current = prev[participantId];
      if (!current || !current.contributions || current.contributions.length === 0) return prev;
      const [removed, ...rest] = current.contributions;
      showNotification(`Poin tindakan ("${removed.item}") dihapus untuk ${participantName}.`);
      return {
        ...prev,
        [participantId]: {
          ...current,
          contributions: rest
        }
      };
    });
  };

  // Handler: Remove Specific Violation
  const handleRemoveViolationItem = (participantId, violationId) => {
    updateAssessments(prev => {
      const current = prev[participantId];
      if (!current) return prev;
      return {
        ...prev,
        [participantId]: {
          ...current,
          violations: (current.violations || []).filter(v => v.id !== violationId)
        }
      };
    });
    showNotification('Item pelanggaran berhasil dihapus.');
  };

  // Handler: Remove Specific Contribution
  const handleRemoveContributionItem = (participantId, contributionId) => {
    updateAssessments(prev => {
      const current = prev[participantId];
      if (!current) return prev;
      return {
        ...prev,
        [participantId]: {
          ...current,
          contributions: (current.contributions || []).filter(c => c.id !== contributionId)
        }
      };
    });
    showNotification('Item keaktifan berhasil dihapus.');
  };

  // Handler: Set Kognitif Score
  const handleSetKognitifScore = (participantId, score) => {
    const validScore = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        kognitif: 75,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      return {
        ...prev,
        [participantId]: {
          ...current,
          kognitif: validScore
        }
      };
    });
  };

  // Handler: Adjust Kognitif Score with Delta
  const handleAdjustKognitifScore = (participantId, delta) => {
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        kognitif: 75,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      const newScore = Math.min(100, Math.max(0, (current.kognitif || 75) + delta));
      return {
        ...prev,
        [participantId]: {
          ...current,
          kognitif: newScore
        }
      };
    });
  };

  // Handler: Save Qualitative Note
  const handleSaveQualitativeNote = (participantId, note) => {
    updateAssessments(prev => {
      const current = prev[participantId] || {
        participantId: participantId,
        kognitif: 75,
        violations: [],
        contributions: [],
        qualitativeNote: ''
      };
      return {
        ...prev,
        [participantId]: {
          ...current,
          qualitativeNote: note
        }
      };
    });
    showNotification('Catatan kualitatif pemandu berhasil disimpan!');
  };

  // Handler: Export Rekap Penilaian to Excel
  const handleExportPenilaianExcel = (sessionObj = null) => {
    const eventTitle = training?.title || 'Basic Training Raya HMI Cabang Bandar Lampung 2026';
    const sessionLabel = sessionObj ? `Sesi: ${sessionObj.title}` : 'Seluruh Sesi Materi';
    const nowStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
         <x:ExcelWorkbook>
          <x:ExcelWorksheets>
           <x:ExcelWorksheet>
            <x:Name>${sessionObj ? sessionObj.id : 'Rekap Penilaian'}</x:Name>
            <x:WorksheetOptions>
             <x:DisplayGridlines/>
            </x:WorksheetOptions>
           </x:ExcelWorksheet>
          </x:ExcelWorksheets>
         </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
          .title { text-align: center; font-size: 15pt; font-weight: bold; color: #065f46; padding: 6px; }
          .subtitle { text-align: center; font-size: 11pt; color: #334155; font-weight: bold; padding: 2px; }
          .date-info { text-align: center; font-size: 9pt; color: #64748b; padding-bottom: 12px; }
          .th-header { background-color: #059669; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #047857; padding: 10px; font-size: 10pt; vertical-align: middle; }
          .td-no { text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; }
          .td-nama { text-align: left; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; font-weight: bold; color: #0f172a; }
          .td-instansi { text-align: left; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; color: #334155; }
          .td-num { text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; font-weight: bold; }
          .status-lulus-baik { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; }
          .status-lulus { background-color: #ccfbf1; color: #115e59; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; }
          .status-perbaikan { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; }
          .status-gagal { background-color: #ffe4e6; color: #9f1239; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; }
          .formula-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; font-size: 9pt; color: #475569; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="8" class="title">TATA CARA PENILAIAN PESERTA LATIHAN KADER I (BASIC TRAINING)</td></tr>
          <tr><td colspan="8" class="subtitle">${sessionLabel.toUpperCase()}</td></tr>
          <tr><td colspan="8" class="date-info">Event: ${eventTitle} • Waktu Ekspor: ${nowStr}</td></tr>
          <tr><td colspan="8"></td></tr>
          <thead>
            <tr>
              <th class="th-header" style="width: 45px;">No</th>
              <th class="th-header" style="width: 240px;">Nama Peserta</th>
              <th class="th-header" style="width: 260px;">Asal Komisariat / Instansi</th>
              <th class="th-header" style="width: 130px;">Afektif (50%)<br/><span style="font-size: 8pt; font-weight: normal;">(Modal 100)</span></th>
              <th class="th-header" style="width: 130px;">Kognitif (30%)<br/><span style="font-size: 8pt; font-weight: normal;">(Test & Tugas)</span></th>
              <th class="th-header" style="width: 130px;">Psikomotorik (20%)<br/><span style="font-size: 8pt; font-weight: normal;">(Modal 50)</span></th>
              <th class="th-header" style="width: 120px;">Nilai Akhir (NA)<br/><span style="font-size: 8pt; font-weight: normal;">(Skala 100)</span></th>
              <th class="th-header" style="width: 160px;">Predikat & Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${assessedParticipants.map((p, idx) => {
              const { afektif, kognitif, psikomotorik, finalScore, predicate, status } = p.computed;
              let statusStyle = 'status-lulus';
              if (predicate === 'Baik Sekali') statusStyle = 'status-lulus-baik';
              else if (status === 'Perbaikan') statusStyle = 'status-perbaikan';
              else if (status === 'Tidak Lulus') statusStyle = 'status-gagal';

              return `
                <tr>
                  <td class="td-no">${idx + 1}</td>
                  <td class="td-nama">${p.name}</td>
                  <td class="td-instansi">${p.instansi || '-'}</td>
                  <td class="td-num" style="color: #047857;">${afektif}</td>
                  <td class="td-num" style="color: #2563eb;">${kognitif}</td>
                  <td class="td-num" style="color: #7c3aed;">${psikomotorik}</td>
                  <td class="td-num" style="color: #0f172a; font-size: 11pt;">${finalScore}</td>
                  <td class="${statusStyle}">${status} (${predicate})</td>
                </tr>
              `;
            }).join('')}
            <tr><td colspan="8"></td></tr>
            <tr>
              <td colspan="8" class="formula-box">
                <strong>Rumus Perhitungan:</strong> NA = (Nilai Afektif x 50%) + (Nilai Kognitif x 30%) + (Nilai Psikomotorik x 20%)<br/>
                <strong>Standar Kelulusan:</strong> Peserta dinyatakan LULUS apabila memiliki NA ≥ 60.0 (Skala 100) atau NA ≥ 600 (Skala 1000).<br/>
                <strong>Skala Nilai:</strong> 80-100: Baik Sekali | 70-79: Baik | 60-69: Cukup (Perbaikan) | &lt; 60: Kurang (Tidak Lulus).
              </td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const fileName = sessionObj 
      ? `Rekap_Penilaian_${sessionObj.id}_${new Date().toISOString().slice(0, 10)}.xls`
      : `Rekap_Penilaian_Peserta_LK1_${new Date().toISOString().slice(0, 10)}.xls`;
    const blob = new Blob(["\uFEFF" + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification(`File Excel Rekap Penilaian ${sessionObj ? `(${sessionObj.title})` : ''} berhasil diekspor!`);
  };

  const handleOpenScanner = (session) => {
    setSelectedSession(session);
    setScanResult(null);
    setIsScannerOpen(true);
  };

  const processSimulatedScan = (e) => {
    e.preventDefault();
    if (!simulatedTokenInput.trim() || !selectedSession) return;

    const token = simulatedTokenInput.trim();
    const foundUser = participants.find(p => p.qrToken.trim() === token);

    if (!foundUser) {
      setScanResult({
        type: 'error',
        msg: `Token QR (${token}) tidak terdaftar dalam sistem!`
      });
      return;
    }

    const existingAtt = foundUser.attendances?.[selectedSession.id];
    if (existingAtt && existingAtt.present) {
      setScanResult({
        type: 'warning',
        msg: `${foundUser.name} sudah tercatat presensi sebelumnya pada pukul ${existingAtt.time}.`,
        user: foundUser
      });
      return;
    }

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const updatedParticipants = participants.map(p => {
      if (p.id === foundUser.id) {
        return {
          ...p,
          attendances: {
            ...p.attendances,
            [selectedSession.id]: { present: true, time: nowTime }
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    setSimulatedTokenInput('');

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {}

    setScanResult({
      type: 'success',
      msg: `PRESENSI BERHASIL! ${foundUser.name} terdaftar hadir di ${selectedSession.title}`,
      user: foundUser,
      time: nowTime
    });
  };

  const handleManualCheckIn = (e) => {
    e.preventDefault();
    if (!manualNoteModal) return;

    const targetSessionId = training?.sessions?.[0]?.id || 'SES-01';
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const updatedParticipants = participants.map(p => {
      if (p.id === manualNoteModal.id) {
        return {
          ...p,
          attendances: {
            ...p.attendances,
            [targetSessionId]: { present: true, time: nowTime, note: manualNoteText }
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Presensi manual untuk ${manualNoteModal.name} berhasil dicatat!`);
    setManualNoteModal(null);
  };

  const handleSetPresensi = (participant, sessionOrId) => {
    const targetSessionId = typeof sessionOrId === 'string' ? sessionOrId : (sessionOrId?.id || training?.sessions?.[0]?.id || 'SES-01');
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
            [targetSessionId]: { present: true, time: nowTime, note: 'Diset Hadir oleh Panitia' }
          }
        };
      }
      return p;
    });

    setParticipants(updatedParticipants);
    showNotification(`Presensi Berhasil! ${participant.name} telah diset HADIR pada ${targetSessionId}.`);
    setActiveActionMenuId(null);
    setRecapModalActionMenuId(null);
  };

  const handleSetAbsent = (participant, sessionOrId) => {
    const targetSessionId = typeof sessionOrId === 'string' ? sessionOrId : (sessionOrId?.id || training?.sessions?.[0]?.id || 'SES-01');

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
    showNotification(`Status presensi ${participant.name} diubah menjadi Tidak Hadir / Belum Absen pada ${targetSessionId}.`);
    setActiveActionMenuId(null);
    setRecapModalActionMenuId(null);
  };

  const handleSaveExcuse = (e) => {
    e.preventDefault();
    if (!excuseModalUser) return;

    const targetSessionId = excuseModalSessionId || training?.sessions?.[0]?.id || 'SES-01';
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
    showNotification(`Status & Alasan Izin untuk ${excuseModalUser.name} (${targetSessionId}) berhasil disimpan!`);
    setExcuseModalUser(null);
    setExcuseReasonText('');
    setExcuseModalSessionId(null);
  };

  const handleOpenEditParticipant = (p) => {
    setEditModalUser(p);
    setEditFormName(p.name || '');
    setEditFormEmail(p.email || '');
    setEditFormInstansi(p.instansi || '');
    setEditFormJabatan(p.jabatan || 'Peserta Training');
    setEditFormPhone(p.phone || '0812-3344-5566');
  };

  const handleSaveEditParticipant = (e) => {
    e.preventDefault();
    if (!editFormName || !editFormEmail) return;

    const updatedP = (participants || []).map(p => {
      if (p.id === editModalUser.id) {
        return {
          ...p,
          name: editFormName,
          email: editFormEmail,
          instansi: editFormInstansi || 'Umum',
          jabatan: editFormJabatan,
          phone: editFormPhone
        };
      }
      return p;
    });

    setParticipants(updatedP);
    setEditModalUser(null);
    showNotification(`Data Peserta (${editFormName}) berhasil diperbarui!`);
  };

  const handleDeleteParticipant = (partId, partName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus peserta: "${partName}"?`)) {
      setParticipants(prev => prev.filter(p => p.id !== partId));
      showNotification(`Data peserta "${partName}" telah dihapus.`);
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

    let html = '';

    if (isAll) {
      // 1. FORMAT KHUSUS RINGKASAN SELURUH SESI (MATRIX KOLOM SEMUA SESI TANPA EMAIL)
      const sessionHeaders = sessionsList.map((ses, idx) => `
        <th class="th-header" style="min-width: 150px;">
          Sesi ${idx + 1}: ${ses.title}<br/>
          <span style="font-size: 8pt; font-weight: normal; opacity: 0.95;">(${ses.time})</span>
        </th>
      `).join('');

      html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
           <x:ExcelWorkbook>
            <x:ExcelWorksheets>
             <x:ExcelWorksheet>
              <x:Name>Ringkasan Seluruh Sesi</x:Name>
              <x:WorksheetOptions>
               <x:DisplayGridlines/>
              </x:WorksheetOptions>
             </x:ExcelWorksheet>
            </x:ExcelWorksheets>
           </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
            .title { text-align: center; font-size: 16pt; font-weight: bold; color: #065f46; padding: 6px; }
            .subtitle { text-align: center; font-size: 11pt; color: #334155; padding: 2px; }
            .date-info { text-align: center; font-size: 9.5pt; color: #64748b; padding-bottom: 12px; }
            .th-header { background-color: #059669; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #047857; padding: 10px; font-size: 10pt; vertical-align: middle; }
            .td-no { text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; }
            .td-nama { text-align: left; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; font-weight: bold; color: #0f172a; }
            .td-instansi { text-align: left; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; color: #334155; }
            .status-hadir { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; }
            .status-izin { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; }
            .status-absen { background-color: #f1f5f9; color: #64748b; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; }
            .td-stat { text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; font-weight: bold; }
            .tr-footer { background-color: #e2e8f0; font-weight: bold; border: 1px solid #94a3b8; }
          </style>
        </head>
        <body>
          <table>
            <tr><td colspan="${5 + sessionsList.length}" class="title">REKAPITULASI PRESENSI - RINGKASAN SELURUH SESI</td></tr>
            <tr><td colspan="${5 + sessionsList.length}" class="subtitle">Event: ${eventTitle} • Total Peserta Terdaftar: ${(participants || []).length} Orang</td></tr>
            <tr><td colspan="${5 + sessionsList.length}" class="date-info">Waktu Ekspor: ${nowStr}</td></tr>
            <tr><td colspan="${5 + sessionsList.length}"></td></tr>
            <thead>
              <tr>
                <th class="th-header" style="width: 45px;">No</th>
                <th class="th-header" style="width: 240px;">Nama Lengkap</th>
                <th class="th-header" style="width: 260px;">Komisariat / Instansi</th>
                ${sessionHeaders}
                <th class="th-header" style="width: 95px;">Total Hadir</th>
                <th class="th-header" style="width: 105px;">Persentase (%)</th>
              </tr>
            </thead>
            <tbody>
      `;

      (participants || []).forEach((p, idx) => {
        let presentCount = 0;
        let excuseCount = 0;

        const sessionCells = sessionsList.map((ses) => {
          const att = p.attendances?.[ses.id];
          const isPresent = !!att?.present;
          const isExcused = !!(att?.status === 'Izin' || (!isPresent && p.isExcused && p.excuseReason));
          const excuseNote = att?.note || (isExcused ? (p.excuseReason || 'Izin') : '');
          const attTime = att?.time || '';

          if (isPresent) {
            presentCount++;
            return `<td class="status-hadir">HADIR${attTime ? `<br/><span style="font-size: 8pt; font-weight: normal; color: #047857;">(${attTime})</span>` : ''}</td>`;
          } else if (isExcused) {
            excuseCount++;
            return `<td class="status-izin">IZIN${excuseNote ? `<br/><span style="font-size: 8pt; font-weight: normal; font-style: italic;">"${excuseNote}"</span>` : ''}</td>`;
          } else {
            return `<td class="status-absen">BELUM ABSEN</td>`;
          }
        }).join('');

        const totalSes = sessionsList.length;
        const pct = totalSes > 0 ? Math.round((presentCount / totalSes) * 100) : 0;
        const pctColor = pct >= 75 ? '#065f46' : (pct >= 50 ? '#d97706' : '#e11d48');

        html += `
          <tr>
            <td class="td-no">${idx + 1}</td>
            <td class="td-nama">${p.name}</td>
            <td class="td-instansi">${p.instansi || '-'}</td>
            ${sessionCells}
            <td class="td-stat" style="color: #065f46; mso-number-format: '0'; font-size: 10.5pt; text-align: center;">${presentCount}</td>
            <td class="td-stat" style="color: ${pctColor}; mso-number-format: '\\@'; font-size: 10.5pt; text-align: center;">${pct}%</td>
          </tr>
        `;
      });

      // Total summary footer row
      const sessionSummaryTds = sessionsList.map((ses) => {
        const countPresent = (participants || []).filter(p => p.attendances?.[ses.id]?.present).length;
        const pctSes = (participants || []).length > 0 ? Math.round((countPresent / (participants || []).length) * 100) : 0;
        return `<td class="td-stat" style="background-color: #ecfdf5; color: #065f46; font-size: 9pt;">${countPresent} Hadir<br/><span style="font-weight: normal;">(${pctSes}%)</span></td>`;
      }).join('');

      html += `
            <tr class="tr-footer">
              <td colspan="3" style="text-align: right; font-weight: bold; padding: 10px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-size: 10pt;">
                TOTAL KEHADIRAN PER SESI:
              </td>
              ${sessionSummaryTds}
              <td colspan="2" style="background-color: #f1f5f9; border: 1px solid #cbd5e1; text-align: center; font-size: 9.5pt; font-weight: bold; color: #0f172a;">
                Total ${(participants || []).length} Peserta
              </td>
            </tr>
          </tbody>
        </table>
        </body>
        </html>
      `;

    } else {
      // 2. FORMAT KHUSUS SATU SESI TERTENTU (TANPA KOLOM EMAIL)
      const targetSes = session;
      const targetSesId = targetSes.id;

      html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
           <x:ExcelWorkbook>
            <x:ExcelWorksheets>
             <x:ExcelWorksheet>
              <x:Name>${targetSes.title.slice(0, 30)}</x:Name>
              <x:WorksheetOptions>
               <x:DisplayGridlines/>
              </x:WorksheetOptions>
             </x:ExcelWorksheet>
            </x:ExcelWorksheets>
           </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
            .title { text-align: center; font-size: 16pt; font-weight: bold; color: #065f46; padding: 6px; }
            .subtitle { text-align: center; font-size: 11pt; color: #334155; padding: 2px; }
            .date-info { text-align: center; font-size: 9.5pt; color: #64748b; padding-bottom: 12px; }
            .th-header { background-color: #059669; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #047857; padding: 10px; font-size: 10.5pt; vertical-align: middle; }
            .td-no { text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; }
            .td-nama { text-align: left; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; font-weight: bold; color: #0f172a; }
            .td-instansi { text-align: left; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; color: #334155; }
            .status-hadir { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; }
            .status-izin { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; }
            .status-absen { background-color: #f1f5f9; color: #64748b; text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; }
            .td-time { text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; color: #047857; font-weight: bold; }
            .td-note { text-align: left; border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; color: #92400e; font-style: italic; }
          </style>
        </head>
        <body>
          <table>
            <tr><td colspan="6" class="title">REKAP PRESENSI - ${targetSes.title.toUpperCase()} (${targetSes.time})</td></tr>
            <tr><td colspan="6" class="subtitle">Event: ${eventTitle} • Ruangan: ${targetSes.room} • Pemateri: ${targetSes.speaker}</td></tr>
            <tr><td colspan="6" class="date-info">Waktu Ekspor: ${nowStr}</td></tr>
            <tr><td colspan="6"></td></tr>
            <thead>
              <tr>
                <th class="th-header" style="width: 45px;">No</th>
                <th class="th-header" style="width: 240px;">Nama Lengkap</th>
                <th class="th-header" style="width: 260px;">Komisariat / Instansi</th>
                <th class="th-header" style="width: 160px;">Status Kehadiran</th>
                <th class="th-header" style="width: 140px;">Waktu Presensi</th>
                <th class="th-header" style="width: 240px;">Catatan / Alasan</th>
              </tr>
            </thead>
            <tbody>
      `;

      (participants || []).forEach((p, idx) => {
        const isPresent = p.attendances?.[targetSesId]?.present || (targetSesId === 'SES-01' && p.status === 'Hadir');
        const isExcused = p.isExcused || p.status === 'Izin' || p.attendances?.[targetSesId]?.status === 'Izin';
        const excuseNote = p.excuseReason || p.attendances?.[targetSesId]?.note || '';
        const timeStr = p.attendances?.[targetSesId]?.time || '-';

        let statusTd = `<td class="status-absen">BELUM ABSEN</td>`;
        let timeTd = `<td class="td-no">-</td>`;
        let noteTd = `<td class="td-no">-</td>`;

        if (isPresent) {
          statusTd = `<td class="status-hadir">HADIR</td>`;
          timeTd = `<td class="td-time">${timeStr}</td>`;
          noteTd = `<td class="td-no">-</td>`;
        } else if (isExcused) {
          statusTd = `<td class="status-izin">IZIN / BERHALANGAN</td>`;
          timeTd = `<td class="td-no">-</td>`;
          noteTd = `<td class="td-note">"${excuseNote || 'Berhalangan'}"</td>`;
        }

        html += `
          <tr>
            <td class="td-no">${idx + 1}</td>
            <td class="td-nama">${p.name}</td>
            <td class="td-instansi">${p.instansi || '-'}</td>
            ${statusTd}
            ${timeTd}
            ${noteTd}
          </tr>
        `;
      });

      const countPresent = (participants || []).filter(p => p.attendances?.[targetSesId]?.present || (targetSesId === 'SES-01' && p.status === 'Hadir')).length;
      const countExcused = (participants || []).filter(p => p.isExcused || p.status === 'Izin' || p.attendances?.[targetSesId]?.status === 'Izin').length;
      const countAbsent = (participants || []).length - countPresent - countExcused;

      html += `
            <tr style="background-color: #f8fafc; font-weight: bold; border: 1px solid #cbd5e1;">
              <td colspan="3" style="text-align: right; padding: 10px; border: 1px solid #cbd5e1; font-size: 10pt;">
                RINGKASAN SESI:
              </td>
              <td colspan="3" style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; color: #065f46;">
                Hadir: ${countPresent} (${Math.round((countPresent/(participants || []).length)*100)}%) • Izin: ${countExcused} • Belum: ${countAbsent} • Total: ${(participants || []).length} Peserta
              </td>
            </tr>
          </tbody>
        </table>
        </body>
        </html>
      `;
    }

    const fileName = isAll 
      ? `Rekap_Presensi_Ringkasan_Seluruh_Sesi_${new Date().toISOString().slice(0, 10)}.xls`
      : `Rekap_Presensi_${session.id || 'Sesi'}_${new Date().toISOString().slice(0, 10)}.xls`;

    const blob = new Blob(["\uFEFF" + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification(isAll 
      ? 'File Excel Matrix Ringkasan Seluruh Sesi berhasil diekspor!' 
      : `File Excel untuk ${session.title || 'Sesi'} berhasil diekspor!`
    );
  };

  const handleExportRekap = () => {
    handleExportSessionExcel('ALL');
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.qrToken.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.instansi.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterSession === 'ALL') return matchesSearch;
    if (filterSession === 'BELUM') return matchesSearch && !p.attendances?.['SES-01']?.present && !p.isExcused && p.status !== 'Izin';
    if (filterSession === 'HADIR') return matchesSearch && (p.attendances?.['SES-01']?.present || p.status === 'Hadir');
    if (filterSession === 'IZIN') return matchesSearch && (p.isExcused || p.status === 'Izin' || p.attendances?.['SES-01']?.status === 'Izin');
    if (filterSession === 'SES-01') return matchesSearch && p.attendances?.['SES-01']?.present;
    if (filterSession === 'SES-02') return matchesSearch && p.attendances?.['SES-02']?.present;
    return matchesSearch;
  });

  const modalAllParticipants = useMemo(() => {
    const q = recapSearchQuery.toLowerCase().trim();
    const sessionsList = training?.sessions || [];

    return (participants || []).filter(p => {
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.instansi && p.instansi.toLowerCase().includes(q)) ||
        (p.qrToken && p.qrToken.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (recapModalKomisariatFilter !== 'ALL' && p.instansi !== recapModalKomisariatFilter) return false;

      const presentCount = sessionsList.filter(s => p.attendances?.[s.id]?.present).length;
      const excuseCount = sessionsList.filter(s => p.attendances?.[s.id]?.status === 'Izin' || (!p.attendances?.[s.id]?.present && p.isExcused)).length;

      if (recapModalFilter === 'HADIR_ALL') return presentCount === sessionsList.length;
      if (recapModalFilter === 'IZIN_ANY') return excuseCount > 0;
      if (recapModalFilter === 'BELUM_ANY') return (presentCount + excuseCount) < sessionsList.length;

      return true;
    });
  }, [participants, training?.sessions, recapSearchQuery, recapModalFilter, recapModalKomisariatFilter]);

  const modalSingleParticipants = useMemo(() => {
    if (!recapModalSession || recapModalSession === 'ALL') return [];
    const sesId = recapModalSession.id;
    const q = recapSearchQuery.toLowerCase().trim();

    return (participants || []).filter(p => {
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.instansi && p.instansi.toLowerCase().includes(q));

      const isPresent = !!p.attendances?.[sesId]?.present;
      const isExcused = !!(p.attendances?.[sesId]?.status === 'Izin' || (!isPresent && p.isExcused));

      if (!matchesSearch) return false;
      if (recapModalFilter === 'ALL') return true;
      if (recapModalFilter === 'HADIR') return isPresent;
      if (recapModalFilter === 'IZIN') return isExcused;
      if (recapModalFilter === 'BELUM') return !isPresent && !isExcused;

      return true;
    });
  }, [participants, recapModalSession, recapSearchQuery, recapModalFilter]);

  const handleCreateQuiz = (e) => {
    e.preventDefault();
    if (!quizFormTitle) return;

    const defaultInstructions = "1) Pastikan koneksi internet stabil sebelum menekan tombol mulai.\n2) Dilarang menutup atau berpindah halaman selama kuis berlangsung.\n3) Bacalah setiap pertanyaan dengan cermat sebelum memilih opsi jawaban.\n4) Setelah menekan Submit, nilai Anda akan langsung disimpan & dikunci.";

    const newQuizObj = {
      id: `QZ-${Date.now().toString().slice(-3)}`,
      title: quizFormTitle,
      type: quizFormType,
      durationMinutes: parseInt(quizFormDuration, 10) || 15,
      passingGrade: parseInt(quizFormGrade, 10) || 70,
      linkCode: quizFormLink || `QUIZ-${Date.now().toString().slice(-4)}`,
      status: 'Aktif',
      createdBy: currentUser?.name || 'Siska Putri (Admin Panitia)',
      createdAt: new Date().toLocaleDateString('id-ID'),
      description: quizFormDesc || 'Quiz evaluasi pelatihan.',
      instructions: quizFormInstructions || defaultInstructions,
      questions: []
    };

    if (setQuizzes) {
      setQuizzes((prev) => [newQuizObj, ...(prev || [])]);
    }

    setShowCreateQuizModal(false);
    setQuizFormTitle('');
    setQuizFormLink('');
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

  const handleSendResetRequestToSuperAdmin = (e) => {
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

    setRequestResetSub(null);
    setRequestResetReason('');
    showNotification(`Permohonan Reset Nilai (${newReq.participantName}) berhasil dikirim ke Super Admin!`);
  };

  const copyQuizLink = (linkCode) => {
    const fullUrl = `${window.location.origin}/quiz/${linkCode}`;
    navigator.clipboard.writeText(fullUrl);
    showNotification(`Link Quiz (${fullUrl}) berhasil disalin ke clipboard!`);
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
        user={user}
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
    if (userPermissions?.canManageQuiz === false) {
      return (
        <div className="p-6 md:p-12 max-w-4xl mx-auto font-sans text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Akses Menu Quiz Dibatasi</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Akun Anda belum diberikan hak akses untuk membuat dan mengelola Quiz oleh Super Admin. Silakan hubungi Super Admin untuk mengaktifkan toggle <strong>Akses Quiz</strong> pada Data Panitia.
          </p>
        </div>
      );
    }

    // IF FULL PAGE GOOGLE FORM BUILDER IS ACTIVE:
    if (activeQuizBuilder !== null) {
      return (
        <GoogleFormQuizBuilder
          initialQuiz={activeQuizBuilder.id ? activeQuizBuilder : null}
          currentUser={currentUser}
          onSaveQuiz={(savedQuiz) => {
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

    const filteredQuizzes = (quizzes || []).filter(q => {
      if (quizFilterType === 'ALL') return true;
      return q.type === quizFilterType;
    });

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Kelola Quiz Pre-Test & Post-Test</h2>
          </div>

          <button
            onClick={() => setActiveQuizBuilder({})}
            className="px-5 py-3 btn-emerald text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 active:scale-95 shrink-0 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>+ Buat Quiz Baru</span>
          </button>
        </div>



        {/* Filter Pills */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          {[
            { id: 'ALL', label: 'Semua Quiz' },
            { id: 'pretest', label: 'Pre-Test' },
            { id: 'posttest', label: 'Post-Test' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setQuizFilterType(f.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                quizFilterType === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Quiz Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredQuizzes.length === 0 ? (
            <div className="col-span-2 p-10 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
              Belum ada Quiz yang dibuat untuk kategori ini.
            </div>
          ) : (
            filteredQuizzes.map(qz => {
              const questionCount = (qz.questions || []).length;
              const subCount = (quizSubmissions || []).filter(s => s.quizId === qz.id).length;
              return (
                <div key={qz.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 hover:border-emerald-300 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                          qz.type === 'pretest' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {qz.type === 'pretest' ? 'Pre-Test' : 'Post-Test'}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">• {qz.durationMinutes} Menit</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{qz.title}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {qz.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-center font-medium">
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Jumlah Soal</div>
                      <div className="font-bold text-slate-800">{questionCount} Soal</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Passing Grade</div>
                      <div className="font-bold text-emerald-700">{qz.passingGrade} Poin</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Responden</div>
                      <div className="font-bold text-teal-700">{subCount} Peserta</div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100">
                    <button
                      onClick={() => copyQuizLink(qz.linkCode)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                      title="Salin Tautan Akses Quiz Unik"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salin Link</span>
                    </button>

                    <button
                      onClick={() => setActiveQuizBuilder(qz)}
                      className="flex-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      title="Edit Quiz & Kelola Soal"
                    >
                      <Edit className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setActiveQuizForResults(qz)}
                      className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Hasil Nilai</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL 1: BUAT QUIZ BARU */}
        {showCreateQuizModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Buat Quiz Baru</h3>
                    <p className="text-xs text-slate-500">Atur parameter awal evaluasi Pre-Test / Post-Test</p>
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
                    placeholder="Contoh: Pre-Test Sesi 1: REST API & DB"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-bold"
                    >
                      <option value="pretest">Pre-Test</option>
                      <option value="posttest">Post-Test</option>
                      <option value="evaluasi">Evaluasi Pelatihan</option>
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

                <div className="grid grid-cols-2 gap-3">
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
                    <label className="block font-semibold text-slate-700 mb-1">Kode Link Akses Unik</label>
                    <input
                      type="text"
                      placeholder="e.g. PRETEST-SESI-1"
                      value={quizFormLink}
                      onChange={(e) => setQuizFormLink(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-mono font-medium"
                    />
                  </div>
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
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
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

        {/* MODAL 3: HASIL & RESPONDEN QUIZ PESERTA */}
        {activeQuizForResults && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Hasil Responden: {activeQuizForResults.title}</h3>
                    <p className="text-xs text-slate-500">Nilai tersimpan & terkunci secara otomatis dari submit peserta</p>
                  </div>
                </div>
                <button onClick={() => setActiveQuizForResults(null)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lock Warning Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
                <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Integritas Penilaian Protected:</strong> Nilai tidak dapat disunting secara langsung oleh Administrator Panitia. Jika ingin melakukan penguncian ulang atau reset kuis peserta akibat kendala teknis, silakan tekan tombol <strong>"Ajukan Reset Nilai"</strong> untuk disetujui Super Admin.
                </div>
              </div>

              {/* Submissions Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Nama Peserta</th>
                      <th className="py-3 px-4 text-center">Score Akhir</th>
                      <th className="py-3 px-4 text-center">Waktu Submit</th>
                      <th className="py-3 px-4 text-center">Status Data</th>
                      <th className="py-3 px-4 text-center">Aksi Protection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {((quizSubmissions || []).filter(s => s.quizId === activeQuizForResults.id)).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                          Belum ada peserta yang mengumpulkan Quiz ini.
                        </td>
                      </tr>
                    ) : (
                      (quizSubmissions || []).filter(s => s.quizId === activeQuizForResults.id).map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{sub.participantName}</div>
                            <div className="text-[11px] text-slate-500">{sub.participantEmail}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-extrabold text-emerald-700 text-sm">
                            {sub.score} <span className="text-slate-400 text-xs font-normal">/ 100</span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                            {sub.submittedAt}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[10px] flex items-center justify-center space-x-1 w-fit mx-auto">
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Locked</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setRequestResetSub(sub)}
                              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] rounded-xl border border-amber-300 transition-colors cursor-pointer"
                            >
                              Ajukan Reset Nilai
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: FORM PENGAJUAN RESET NILAI KE SUPER ADMIN */}
        {requestResetSub && (
          <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center space-x-3 text-amber-700">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Permohonan Reset Nilai</h4>
                  <p className="text-xs text-slate-500">Ajukan permohonan pembukaan kuis ke Super Admin</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div>Peserta: <strong>{requestResetSub.participantName}</strong></div>
                <div>Quiz: <strong>{activeQuizForResults?.title}</strong></div>
                <div>Nilai Terkunci: <strong className="text-rose-600">{requestResetSub.score} / 100</strong></div>
              </div>

              <form onSubmit={handleSendResetRequestToSuperAdmin} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alasan Pengajuan Reset <span className="text-rose-500">*</span></label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Contoh: Peserta mengalami kendala koneksi terputus / HP freeze saat pengerjaan kuis..."
                    value={requestResetReason}
                    onChange={(e) => setRequestResetReason(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button type="button" onClick={() => setRequestResetSub(null)} className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-slate-700">Batal</button>
                  <button type="submit" className="flex-1 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md">Kirim Pengajuan</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }



  // 2. CARI & PRESENSI MANUAL PESERTA (`participants`)
  if (activeTab === 'participants') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans relative">
        {/* Backdrop for 3-dots menu popup dismissal */}
        {activeActionMenuId && (
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setActiveActionMenuId(null)} 
          />
        )}

        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Daftar Peserta Training ({filteredParticipants.length})</h2>
          </div>
        </div>

        {/* Search */}
        <div className="light-card rounded-3xl p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Cari nama peserta, email, instansi, atau QR Token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none"
            />
          </div>
        </div>

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

                      {/* Column 3: Aksi (3-Dots Menu) */}
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
                {profileModalUser.avatar ? (
                  <img 
                    src={profileModalUser.avatar} 
                    alt={profileModalUser.name} 
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-300 shadow-md"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-950 text-white font-black text-2xl flex items-center justify-center border-2 border-emerald-300 shadow-md">
                    {profileModalUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* White QR Code Card */}
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <div className="bg-white p-3.5 rounded-2xl shadow-md shrink-0 mx-auto">
                  <QRCodeSVG 
                    value={profileModalUser.qrToken || `ABSEN-PESERTA-${profileModalUser.name.toUpperCase().replace(/\s+/g, '-')}-88291`} 
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
                  <label className="block font-semibold text-slate-700 mb-1.5">Alasan Izin / Berhalangan</label>
                  {(excuseModalUser.excuseReason || excuseModalUser.attendances?.['SES-01']?.note) && (
                    <div className="mb-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-amber-700 block">Alasan / Catatan Saat Ini:</span>
                      <p className="italic font-medium">"{excuseModalUser.excuseReason || excuseModalUser.attendances?.['SES-01']?.note}"</p>
                    </div>
                  )}
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
                    <label className="block font-semibold text-slate-700 mb-1">Jabatan</label>
                    <input
                      type="text"
                      value={editFormJabatan}
                      onChange={(e) => setEditFormJabatan(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-600 outline-none"
                    />
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

        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* 1. Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Laporan & Rekapitulasi Data Training
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('recap')}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl flex items-center space-x-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Lihat Ringkasan Presensi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rekap_penilaian')}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl flex items-center space-x-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Lihat Rekap Penilaian</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportSessionExcel('ALL')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center space-x-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* 2. Section Heading & Total Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
          <div>
            <h3 className="text-sm md:text-base font-extrabold text-slate-900">
              Daftar Rekapitulasi Sesi Pelatihan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik menu aksi titik 3 untuk membuka Data Presensi atau Data Penilaian per sesi
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200/80 px-3.5 py-1.5 rounded-full self-start sm:self-auto">
            Total {training?.sessions?.length || 0} Sesi Terjadwal
          </span>
        </div>

        {/* 3. Master Table Sesi Pelatihan */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-visible">
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
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{ses.room || 'Aula Utama Sekretariat HMI Cabang Bandar Lampung'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 md:px-6">
                          <div className="font-bold text-slate-900 text-xs md:text-sm">
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
                              className={`p-2 rounded-xl transition-all cursor-pointer ${
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
                                className="absolute right-0 top-full mt-1 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-30 text-left animate-in fade-in zoom-in-95 duration-150"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
                                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    AKSI SESI
                                  </p>
                                  <p className="text-xs font-bold text-slate-800 truncate" title={ses.title}>
                                    {ses.title}
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
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
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
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl flex items-center space-x-2.5 transition-colors cursor-pointer"
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
                      const isPresent = p.attendances?.[targetSesId]?.present || (targetSesId === 'SES-01' && p.status === 'Hadir');
                      const isExcused = p.isExcused || p.status === 'Izin' || p.attendances?.[targetSesId]?.status === 'Izin';
                      const excuseNote = p.excuseReason || p.attendances?.[targetSesId]?.note || '';
                      const timeStr = p.attendances?.[targetSesId]?.time || '-';

                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-3 px-4 md:px-6 font-semibold text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-3 px-4 md:px-6">
                            <div className="flex items-center space-x-2.5">
                              <div 
                                onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all shadow-xs overflow-hidden"
                                title="Klik untuk melihat foto peserta"
                              >
                                {p.avatar ? (
                                  <img src={p.avatar} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                  p.name.charAt(0)
                                )}
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
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 md:px-6 text-right relative">
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
                                className="absolute right-4 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 text-left"
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
                                    handleSetAbsent(p, recapModalSession);
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Set Belum Absen</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecapModalActionMenuId(null);
                                    setExcuseModalUser(p);
                                    setExcuseModalSessionId(recapModalSession.id);
                                    setExcuseReasonText(p.excuseReason || p.attendances?.[targetSesId]?.note || '');
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Izin / Alasan...</span>
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
                <div className="relative w-36 md:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari peserta..."
                    value={penilaianModalSearchQuery}
                    onChange={(e) => setPenilaianModalSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition-all"
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
                  <select
                    value={penilaianModalFilter}
                    onChange={(e) => setPenilaianModalFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
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

            {/* Body Table */}
            <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 md:px-6 w-12 text-center">No</th>
                    <th className="py-3 px-4 md:px-6 min-w-[180px]">Nama Peserta</th>
                    <th className="py-3 px-4 md:px-6 min-w-[170px]">Asal Komisariat</th>
                    <th className="py-3 px-4 md:px-6 text-center min-w-[110px]">Afektif (50%)</th>
                    <th className="py-3 px-4 md:px-6 text-center min-w-[110px]">Kognitif (30%)</th>
                    <th className="py-3 px-4 md:px-6 text-center min-w-[120px]">Psikomotorik (20%)</th>
                    <th className="py-3 px-4 md:px-6 text-center min-w-[110px]">Nilai Akhir (NA)</th>
                    <th className="py-3 px-4 md:px-6 text-center min-w-[190px]">Status Penilaian</th>
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
                        <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-3 px-4 md:px-6 font-semibold text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-3 px-4 md:px-6">
                            <div className="flex items-center space-x-2.5">
                              <div 
                                onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all shadow-xs overflow-hidden"
                                title="Klik untuk melihat foto peserta"
                              >
                                {p.avatar ? (
                                  <img src={p.avatar} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                  p.name.charAt(0)
                                )}
                              </div>
                              <span className="font-semibold text-slate-900 text-xs md:text-sm">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 md:px-6">
                            <div className="text-slate-800 font-medium">{p.instansi || '-'}</div>
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

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Alasan Berhalangan Hadir</label>
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
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExcuseModalUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveExcuse(excuseModalUser, excuseModalSessionId)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 shadow-md"
                >
                  Simpan Status Izin
                </button>
              </div>
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
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${calculateAssessment(currentAssessments[selectedParticipantForGrading.id]).statusClass}`}>
                        {calculateAssessment(currentAssessments[selectedParticipantForGrading.id]).status} ({calculateAssessment(currentAssessments[selectedParticipantForGrading.id]).predicate})
                      </span>
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
              <div className="max-w-4xl mx-auto space-y-5 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm">
                
                {/* Live Calculation Formula Card */}
                {(() => {
                  const ass = calculateAssessment(currentAssessments[selectedParticipantForGrading.id]);
                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Formula Nilai Akhir (NA)</span>
                        <span className="text-base font-black text-slate-900 font-mono">NA = {ass.finalScore} <span className="text-xs text-slate-500">({ass.finalScore1000} Skala 1000)</span></span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* Box 1: Log Pelanggaran Afektif */}
                  <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                    <div className="flex items-center justify-between font-bold text-rose-950">
                      <span>Log Pelanggaran Afektif (Modal 100)</span>
                      <span className="text-rose-700 font-mono">
                        -{(currentAssessments[selectedParticipantForGrading.id]?.violations || []).reduce((s, v) => s + v.points, 0)} Poin
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {(!currentAssessments[selectedParticipantForGrading.id]?.violations || currentAssessments[selectedParticipantForGrading.id].violations.length === 0) ? (
                        <p className="text-slate-400 italic text-[11px] py-3">Tidak ada catatan pelanggaran (Nilai 100 sempurna).</p>
                      ) : (
                        currentAssessments[selectedParticipantForGrading.id].violations.map((vio) => (
                          <div key={vio.id} className="p-2.5 rounded-xl bg-white border border-rose-100 flex items-center justify-between text-[11px] shadow-2xs">
                            <div className="truncate pr-2">
                              <span className="font-bold text-rose-900 block truncate">{vio.item}</span>
                              <span className="text-[9px] text-slate-400">{vio.sessionTitle} • {vio.timestamp}</span>
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
                        +{(currentAssessments[selectedParticipantForGrading.id]?.contributions || []).reduce((s, c) => s + c.points, 0)} Poin
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {(!currentAssessments[selectedParticipantForGrading.id]?.contributions || currentAssessments[selectedParticipantForGrading.id].contributions.length === 0) ? (
                        <p className="text-slate-400 italic text-[11px] py-3">Belum ada catatan keaktifan khusus (Nilai standar 50).</p>
                      ) : (
                        currentAssessments[selectedParticipantForGrading.id].contributions.map((con) => (
                          <div key={con.id} className="p-2.5 rounded-xl bg-white border border-teal-100 flex items-center justify-between text-[11px] shadow-2xs">
                            <div className="truncate pr-2">
                              <span className="font-bold text-teal-900 block truncate">{con.item}</span>
                              <span className="text-[9px] text-slate-400">{con.sessionTitle} • {con.timestamp}</span>
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

        {/* MODAL 2: PICKER PELANGGARAN */}
        {violationPickerModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 border border-rose-100 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <div className="flex items-center space-x-2.5 text-rose-900">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base">Katalog Pelanggaran Nilai Afektif</h3>
                    <p className="text-[11px] text-slate-500">Pilih pelanggaran untuk: <strong>{violationPickerModal.participant.name}</strong></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViolationPickerModal(null)}
                  className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {VIOLATION_RULES.map((rule) => (
                  <div key={rule.level} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 font-mono flex items-center justify-center text-[10px]">
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
                          onClick={() => handleQuickAddViolation(violationPickerModal.participant, violationPickerModal.session, item, rule.points, rule.symbol)}
                          className="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-900 border border-slate-200 hover:border-rose-300 text-xs font-semibold text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                        >
                          <span>{item}</span>
                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0 ml-1">-{rule.points}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: PICKER KEAKTIFAN */}
        {contributionPickerModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 border border-teal-100 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                <div className="flex items-center space-x-2.5 text-teal-900">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base">Katalog Keaktifan Nilai Psikomotorik</h3>
                    <p className="text-[11px] text-slate-500">Pilih kontribusi untuk: <strong>{contributionPickerModal.participant.name}</strong></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContributionPickerModal(null)}
                  className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {CONTRIBUTION_RULES.map((rule) => (
                  <div key={rule.level} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-700 font-mono flex items-center justify-center text-[10px]">
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
                          onClick={() => handleQuickAddContribution(contributionPickerModal.participant, contributionPickerModal.session, item, rule.points, rule.symbol)}
                          className="p-2.5 rounded-xl bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs font-semibold text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                        >
                          <span>{item}</span>
                          <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded shrink-0 ml-1">+{rule.points}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
        if (p.attendances?.[s.id]?.present) pPres++;
        else if (p.attendances?.[s.id]?.status === 'Izin' || p.isExcused) pEx++;
      });
      totalPresentSlots += pPres;
      if (pPres === sessionsList.length) allPresentCount++;
      if (pEx > 0) anyExcusedCount++;
      if (pPres + pEx < sessionsList.length) anyAbsentCount++;
    });

    const allSessionsAvgPct = totalSlots > 0 ? Number(((totalPresentSlots / totalSlots) * 100).toFixed(1)) : 0;

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans relative">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* 1. Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
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

        {/* 3. Search & Filter Bar (Style Sesuai Rekap Penilaian) */}
        <div className="light-card rounded-3xl p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Cari nama peserta, email, asal komisariat, atau Token QR..."
                value={recapSearchQuery}
                onChange={(e) => setRecapSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none font-medium transition-all"
              />
              {recapSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRecapSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus Pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={recapModalKomisariatFilter}
                onChange={(e) => setRecapModalKomisariatFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="ALL">Semua Asal Komisariat</option>
                {KOMISARIAT_LIST.map((kom, kIdx) => (
                  <option key={kIdx} value={kom}>{kom}</option>
                ))}
              </select>

              <select
                value={recapModalFilter}
                onChange={(e) => setRecapModalFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="ALL">Semua Status Kehadiran</option>
                <option value="HADIR_ALL">Hadir Semua Sesi (100%)</option>
                <option value="IZIN_ANY">Ada Izin Sesi</option>
                <option value="BELUM_ANY">Ada Belum Absen</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Master Table Matrix Semua Sesi */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-2xs">
                <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-3 md:px-5 w-12 text-center">No</th>
                  <th className="py-3.5 px-3 md:px-5 min-w-[200px]">Nama Peserta</th>
                  <th className="py-3.5 px-3 md:px-5 min-w-[180px]">Asal Komisariat</th>
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
                        className="py-3 px-3 md:px-4 text-center min-w-[130px] max-w-[170px] border-l border-slate-200/80 bg-slate-100/90 cursor-pointer hover:bg-emerald-50/70 transition-colors select-none"
                        onClick={() => {
                          setRecapModalSession(ses);
                          setRecapModalFilter('ALL');
                          setRecapSearchQuery('');
                        }}
                        title={`Klik untuk melihat / mengubah data presensi ${ses.title}`}
                      >
                        <div className="flex flex-col items-center justify-center text-center">
                          <span className="font-extrabold text-[11px] text-slate-900 tracking-tight leading-tight uppercase">
                            {sessionLabel}
                          </span>
                          {sessionSubtitle && (
                            <span 
                              className="text-[10px] font-semibold text-slate-600 leading-tight line-clamp-2 mt-0.5" 
                              title={sessionSubtitle}
                            >
                              {sessionSubtitle}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-3.5 px-3 md:px-5 text-center min-w-[95px] border-l border-slate-200/80 bg-slate-100/90 text-slate-800 font-extrabold">
                    Total Hadir
                  </th>
                  <th className="py-3.5 px-3 md:px-5 text-center min-w-[95px] border-l border-slate-200/80 bg-slate-100/90 text-slate-800 font-extrabold">
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
                      if (p.attendances?.[ses.id]?.present) presentCount++;
                    });
                    const totalSes = training.sessions.length;
                    const pct = totalSes > 0 ? Math.round((presentCount / totalSes) * 100) : 0;
                    const pctBadgeClass = pct >= 75 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : (pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200');

                    return (
                      <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="py-3.5 px-3 md:px-5 font-semibold text-slate-400 text-center">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-3 md:px-5">
                          <div className="flex items-center space-x-2.5">
                            <div 
                              onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all shadow-xs overflow-hidden"
                              title="Klik untuk melihat foto peserta"
                            >
                              {p.avatar ? (
                                <img src={p.avatar} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                              ) : (
                                p.name.charAt(0)
                              )}
                            </div>
                            <span className="font-semibold text-slate-900 text-xs md:text-sm">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 md:px-5">
                          <div className="text-slate-800 font-medium text-xs">{p.instansi}</div>
                        </td>
                        
                        {/* Kolom-kolom Sesi */}
                        {training.sessions.map((ses) => {
                          const att = p.attendances?.[ses.id];
                          const isPresent = !!att?.present;
                          const isExcused = !!(att?.status === 'Izin' || (!att?.present && p.isExcused && p.excuseReason));
                          const excuseNote = att?.note || (isExcused ? (p.excuseReason || 'Izin') : '');

                          return (
                            <td 
                              key={ses.id} 
                              className="py-3.5 px-3 md:px-4 text-center border-l border-slate-100 cursor-pointer hover:bg-emerald-50/50"
                              onClick={() => {
                                setRecapModalSession(ses);
                                setRecapSearchQuery(p.name);
                              }}
                              title="Klik untuk ubah presensi peserta pada sesi ini"
                            >
                              {isPresent ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Hadir</span>
                                </span>
                              ) : isExcused ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap" title={excuseNote}>
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Izin</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200 whitespace-nowrap">
                                  <span>Belum Absen</span>
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Kolom Total Hadir */}
                        <td className="py-3.5 px-3 md:px-5 text-center border-l border-slate-100 font-bold text-slate-900 text-xs md:text-sm font-mono">
                          {presentCount}
                        </td>

                        {/* Kolom Persentase */}
                        <td className="py-3.5 px-3 md:px-5 text-center border-l border-slate-100">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border font-mono ${pctBadgeClass}`}>
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
                      const isPresent = p.attendances?.[targetSesId]?.present || (targetSesId === 'SES-01' && p.status === 'Hadir');
                      const isExcused = p.isExcused || p.status === 'Izin' || p.attendances?.[targetSesId]?.status === 'Izin';
                      const excuseNote = p.excuseReason || p.attendances?.[targetSesId]?.note || '';
                      const timeStr = p.attendances?.[targetSesId]?.time || '-';

                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-3 px-4 md:px-6 font-semibold text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-3 px-4 md:px-6">
                            <div className="flex items-center space-x-2.5">
                              <div 
                                onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all shadow-xs overflow-hidden"
                                title="Klik untuk melihat foto peserta"
                              >
                                {p.avatar ? (
                                  <img src={p.avatar} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                  p.name.charAt(0)
                                )}
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
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 md:px-6 text-right relative">
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
                                className="absolute right-4 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 text-left"
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
                                    handleSetAbsent(p, recapModalSession);
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Set Belum Absen</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecapModalActionMenuId(null);
                                    setExcuseModalUser(p);
                                    setExcuseModalSessionId(recapModalSession.id);
                                    setExcuseReasonText(p.excuseReason || p.attendances?.[targetSesId]?.note || '');
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Izin / Alasan...</span>
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
      </div>
    );
  }


  // 4. REKAPITULASI PENILAIAN PESERTA LK 1 (`rekap_penilaian`)
  if (activeTab === 'rekap_penilaian') {
    const totalPeserta = assessedParticipants.length;
    const passedCount = assessedParticipants.filter(p => p.computed.isPassed).length;
    const passedPct = totalPeserta > 0 ? Math.round((passedCount / totalPeserta) * 100) : 0;
    const avgScore = totalPeserta > 0 ? Number((assessedParticipants.reduce((sum, p) => sum + p.computed.finalScore, 0) / totalPeserta).toFixed(1)) : 0;
    const avgScore1000 = Math.round(avgScore * 10);
    const baikSekaliCount = assessedParticipants.filter(p => p.computed.predicate === 'Baik Sekali').length;
    const baikCount = assessedParticipants.filter(p => p.computed.predicate === 'Baik').length;
    const cukupCount = assessedParticipants.filter(p => p.computed.status === 'Perbaikan').length;
    const tidakLulusCount = assessedParticipants.filter(p => p.computed.status === 'Tidak Lulus').length;

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans relative">
        {/* Backdrop for 3-dots popup dismissal */}
        {activeAssessmentActionMenuId && (
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setActiveAssessmentActionMenuId(null)} 
          />
        )}

        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Laporan Rekapitulasi Nilai Akhir Peserta</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

        {/* Filter & Search Bar (Sesuai Style Web) */}
        <div className="light-card rounded-3xl p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Cari nama peserta, email, asal komisariat, atau Token QR..."
                value={penilaianSearchQuery}
                onChange={(e) => setPenilaianSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white outline-none font-medium transition-all"
              />
              {penilaianSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPenilaianSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus Pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={penilaianFilterKomisariat}
                onChange={(e) => setPenilaianFilterKomisariat(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="ALL">Semua Asal Komisariat</option>
                {KOMISARIAT_LIST.map((kom, kIdx) => (
                  <option key={kIdx} value={kom}>{kom}</option>
                ))}
              </select>

              <select
                value={penilaianFilterStatus}
                onChange={(e) => setPenilaianFilterStatus(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="ALL">Semua Status Kelulusan</option>
                <option value="Baik Sekali">Baik Sekali (NA ≥ 80)</option>
                <option value="Baik">Baik (NA 70 - 79)</option>
                <option value="Perbaikan">Perbaikan / Cukup (NA 60 - 69)</option>
                <option value="Tidak Lulus">Tidak Lulus (NA &lt; 60)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Master Rekapitulasi Table (Style Persis Rekap Presensi Gambar 2) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-2xs">
                <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-3 w-12 text-center">No</th>
                  <th className="py-3.5 px-3 min-w-[190px]">Nama Peserta</th>
                  <th className="py-3.5 px-3 min-w-[170px]">Asal Komisariat</th>
                  <th className="py-3.5 px-3 text-center min-w-[95px]">
                    Afektif (50%)
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[95px]">
                    Kognitif (30%)
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[105px]">
                    Psikomotorik (20%)
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[95px]">
                    Nilai Akhir (NA)
                  </th>
                  <th className="py-3.5 px-3 text-center min-w-[140px]">Status Penilaian</th>
                  <th className="py-3.5 px-3 text-right w-14">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssessedParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      Tidak ada data penilaian peserta yang sesuai dengan pencarian / filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredAssessedParticipants.map((p, idx) => {
                    const { afektif, kognitif, psikomotorik, finalScore, predicate, status } = p.computed;

                    return (
                      <tr 
                        key={p.id}
                        onClick={() => {
                          setSelectedParticipantForGrading(p);
                          setQualitativeNoteInput(p.assessment?.qualitativeNote || '');
                        }}
                        className="hover:bg-emerald-50/20 transition-colors cursor-pointer group"
                      >
                        {/* No */}
                        <td className="py-3.5 px-3 font-semibold text-slate-400 text-center">
                          {idx + 1}
                        </td>

                        {/* Nama Peserta */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center space-x-2.5">
                            <div 
                              onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all shadow-xs overflow-hidden"
                              title="Klik untuk melihat foto peserta"
                            >
                              {p.avatar ? (
                                <img src={p.avatar} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                              ) : (
                                p.name.charAt(0)
                              )}
                            </div>
                            <span className="font-semibold text-slate-900 text-xs md:text-sm group-hover:text-emerald-700 transition-colors">{p.name}</span>
                          </div>
                        </td>

                        {/* Asal Komisariat / Instansi (Clean Text) */}
                        <td className="py-3.5 px-3">
                          <div className="text-slate-800 font-medium text-xs">
                            {p.instansi || '-'}
                          </div>
                        </td>

                        {/* Afektif (50%) */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700 text-xs md:text-sm">
                          {afektif}
                        </td>

                        {/* Kognitif (30%) */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700 text-xs md:text-sm">
                          {kognitif}
                        </td>

                        {/* Psikomotorik (20%) */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700 text-xs md:text-sm">
                          {psikomotorik}
                        </td>

                        {/* Nilai Akhir (NA) */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold text-slate-900 font-mono text-xs md:text-sm">
                            {finalScore}
                          </span>
                        </td>

                        {/* Predikat & Status (Pill Badge Style Persis Rekap Presensi) */}
                        <td className="py-3.5 px-3 text-center">
                          {status === 'Lulus' ? (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="whitespace-nowrap">{predicate}</span>
                            </span>
                          ) : status === 'Perbaikan' ? (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="whitespace-nowrap">{predicate}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs whitespace-nowrap">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="whitespace-nowrap">{status} • {predicate}</span>
                            </span>
                          )}
                        </td>

                        {/* Aksi (Titik 3 Dropdown Menu) */}
                        <td className="py-3.5 px-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAssessmentActionMenuId(activeAssessmentActionMenuId === p.id ? null : p.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Menu Aksi Penilaian Peserta"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Popup Menu */}
                          {activeAssessmentActionMenuId === p.id && (
                            <div 
                              className="absolute right-4 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 text-left"
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
                                  setSelectedParticipantForGrading(p);
                                  setQualitativeNoteInput(p.assessment?.qualitativeNote || '');
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
                                  setSessionGradingModal({ session: training?.sessions?.[0] || { id: 'SES-01', title: 'Sesi Presensi Utama' }, sessionIndex: 1 });
                                }}
                                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-left cursor-pointer"
                              >
                                <SlidersHorizontal className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="whitespace-nowrap">Kelola Penilaian</span>
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

          {/* Footer Info */}
          <footer className="px-6 py-3.5 border-t border-slate-200/90 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">
              Menampilkan {filteredAssessedParticipants.length} dari {assessedParticipants.length} peserta terdaftar
            </span>
            <span className="text-[11px] text-slate-400">
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
                  const totalP = (participants || []).length;
                  const lulusCount = (participants || []).filter(p => {
                    const finalScore = p.nilaiAkhir !== undefined ? p.nilaiAkhir : (p.postTest !== undefined ? p.postTest : 85);
                    return finalScore >= 70;
                  }).length;
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
                    <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3.5 px-3 md:px-5 w-12 text-center">No</th>
                      <th className="py-3.5 px-3 md:px-5 min-w-[200px]">Nama Peserta</th>
                      <th className="py-3.5 px-3 md:px-5 min-w-[180px]">Asal Komisariat</th>
                      <th className="py-3.5 px-3 md:px-5 text-center min-w-[95px]">Afektif (50%)</th>
                      <th className="py-3.5 px-3 md:px-5 text-center min-w-[95px]">Kognitif (30%)</th>
                      <th className="py-3.5 px-3 md:px-5 text-center min-w-[105px]">Psikomotorik (20%)</th>
                      <th className="py-3.5 px-3 md:px-5 text-center min-w-[95px]">Nilai Akhir (NA)</th>
                      <th className="py-3.5 px-3 md:px-5 text-center min-w-[140px]">Status Penilaian</th>
                      <th className="py-3.5 px-3 md:px-5 text-right w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAssessedParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                          Tidak ada data penilaian peserta yang sesuai dengan pencarian / filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredAssessedParticipants.map((p, idx) => {
                        const { afektif, kognitif, psikomotorik, finalScore, predicate, status } = p.computed;
                        return (
                          <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                            <td className="py-3.5 px-3 md:px-5 font-semibold text-slate-400 text-center">{idx + 1}</td>
                            <td className="py-3.5 px-3 md:px-5">
                              <div className="flex items-center space-x-2.5">
                                <div 
                                  onClick={(e) => { e.stopPropagation(); setPreviewPhotoUser(p); }}
                                  className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:scale-105 transition-all shadow-xs overflow-hidden"
                                  title="Klik untuk melihat foto peserta"
                                >
                                  {p.avatar ? (
                                    <img src={p.avatar} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                                  ) : (
                                    p.name.charAt(0)
                                  )}
                                </div>
                                <span className="font-semibold text-slate-900 text-xs md:text-sm">{p.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 md:px-5">
                              <div className="text-slate-800 font-medium">{p.instansi || '-'}</div>
                            </td>
                            <td className="py-3.5 px-3 md:px-5 text-center font-mono font-bold text-emerald-700 text-xs md:text-sm">
                              {afektif}
                            </td>
                            <td className="py-3.5 px-3 md:px-5 text-center font-mono font-bold text-emerald-700 text-xs md:text-sm">
                              {kognitif}
                            </td>
                            <td className="py-3.5 px-3 md:px-5 text-center font-mono font-bold text-emerald-700 text-xs md:text-sm">
                              {psikomotorik}
                            </td>
                            <td className="py-3.5 px-3 md:px-5 text-center">
                              <span className="font-bold text-slate-900 font-mono text-xs md:text-sm">{finalScore}</span>
                            </td>
                            <td className="py-3.5 px-3 md:px-5 text-center">
                              {status === 'Lulus' ? (
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="whitespace-nowrap">{predicate}</span>
                                </span>
                              ) : status === 'Perbaikan' ? (
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="whitespace-nowrap">{predicate}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs whitespace-nowrap">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span className="whitespace-nowrap">{status} • {predicate}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 md:px-5 text-right relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAssessmentActionMenuId(activeAssessmentActionMenuId === p.id ? null : p.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Menu Aksi Penilaian Peserta"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeAssessmentActionMenuId === p.id && (
                                <div 
                                  className="absolute right-4 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 text-left"
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
                                      setSelectedParticipantForGrading(p);
                                      setQualitativeNoteInput(p.assessment?.qualitativeNote || '');
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
                                      setSessionGradingModal({ session: training?.sessions?.[0] || { id: 'SES-01', title: 'Sesi Presensi Utama' }, sessionIndex: 1 });
                                    }}
                                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-left cursor-pointer"
                                  >
                                    <SlidersHorizontal className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="whitespace-nowrap">Kelola Penilaian</span>
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
                <span>Menampilkan {filteredAssessedParticipants.length} dari {assessedParticipants.length} Peserta</span>
              </div>
            </div>

            {/* Scrollable Participants Grading Table (Matching Gambar 2) */}
            <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 md:px-6 w-12 text-center">NO</th>
                    <th className="py-3.5 px-4 md:px-6 min-w-[180px]">NAMA PESERTA</th>
                    <th className="py-3.5 px-4 md:px-6 min-w-[160px]">ASAL KOMISARIAT</th>
                    <th className="py-3.5 px-3 md:px-4 text-center min-w-[125px]">AFEKTIF (50%)</th>
                    <th className="py-3.5 px-3 md:px-4 text-center min-w-[125px]">KOGNITIF (30%)</th>
                    <th className="py-3.5 px-3 md:px-4 text-center min-w-[130px]">PSIKOMOTORIK (20%)</th>
                    <th className="py-3.5 px-2 text-center min-w-[90px] w-24">NILAI AKHIR (NA)</th>
                    <th className="py-3.5 px-4 md:px-6 text-center min-w-[180px]">STATUS PENILAIAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssessedParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        Tidak ada peserta yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAssessedParticipants.map((p, idx) => {
                      const { afektif, kognitif, psikomotorik, totalViolations, totalContributions, finalScore, predicate, status, statusClass } = p.computed;

                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-3 px-4 md:px-6 font-semibold text-slate-400 text-center">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 md:px-6">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{p.name}</div>
                          </td>
                          <td className="py-3 px-4 md:px-6">
                            <div className="text-slate-700 font-medium text-xs">{p.instansi || '-'}</div>
                          </td>
                          <td className="py-3 px-3 md:px-4 text-center">
                            <div className="inline-flex items-center justify-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleQuickAddViolation(p, sessionGradingModal.session, 'Pelanggaran Sesi', 1, 'x')}
                                className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                                title="Kurang Nilai Afektif (-1)"
                              >
                                -
                              </button>
                              <span className="font-mono font-bold text-emerald-700 min-w-[24px] text-center text-xs sm:text-sm">
                                {afektif}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUndoViolation(p.id, p.name)}
                                disabled={totalViolations === 0}
                                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-all active:scale-90 ${
                                  totalViolations > 0 
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer' 
                                    : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                                }`}
                                title={totalViolations > 0 ? "Batalkan Pengurangan (+1)" : "Nilai Maksimal 100"}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 md:px-4 text-center">
                            <div className="inline-flex items-center justify-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleAdjustKognitifScore(p.id, -5)}
                                className="w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                                title="Kurang 5 Nilai Kognitif (-5)"
                              >
                                -
                              </button>
                              <span className="font-mono font-bold text-emerald-700 min-w-[24px] text-center text-xs sm:text-sm">
                                {kognitif}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdjustKognitifScore(p.id, 5)}
                                className="w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                                title="Tambah 5 Nilai Kognitif (+5)"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 md:px-4 text-center">
                            <div className="inline-flex items-center justify-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleUndoContribution(p.id, p.name)}
                                disabled={totalContributions === 0}
                                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-all active:scale-90 ${
                                  totalContributions > 0 
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer' 
                                    : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                                }`}
                                title={totalContributions > 0 ? "Batalkan Keaktifan (-1)" : "Nilai Standar 50"}
                              >
                                -
                              </button>
                              <span className="font-mono font-bold text-emerald-700 min-w-[24px] text-center text-xs sm:text-sm">
                                {psikomotorik}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickAddContribution(p, sessionGradingModal.session, 'Keaktifan Sesi', 1, 'x')}
                                className="w-6 h-6 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                                title="Tambah Keaktifan Psikomotorik (+1)"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                            {finalScore}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-center">
                            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shadow-2xs ${statusClass}`}>
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

            {/* Footer */}
            <footer className="p-3 sm:p-4 bg-white border-t border-slate-200/90 flex items-center justify-between gap-3 shrink-0 z-30">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Semua perubahan nilai tersimpan otomatis dan langsung direkap ke nilai akhir.
              </span>
              <button
                type="button"
                onClick={() => setSessionGradingModal(null)}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 ml-auto"
              >
                Selesai & Tutup
              </button>
            </footer>
          </div>
        )}

        {/* MODAL 2: DETAIL PEMILIH PELANGGARAN TERPERINCI (VIOLATION PICKER) */}
        {violationPickerModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <Minus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Catat Pelanggaran Afektif</h3>
                    <p className="text-xs text-slate-500">Peserta: <strong className="text-slate-800">{violationPickerModal.participant.name}</strong> • Modal 100 Poin</p>
                  </div>
                </div>
                <button onClick={() => setViolationPickerModal(null)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {VIOLATION_RULES.map((rule, rIdx) => (
                  <div key={rIdx} className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-800 flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-900 inline-flex items-center justify-center text-[10px] font-mono">
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
                          onClick={() => handleQuickAddViolation(violationPickerModal.participant, violationPickerModal.session, item, rule.points, rule.symbol)}
                          className="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-900 border border-slate-200 hover:border-rose-300 text-xs font-semibold text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                        >
                          <span>{item}</span>
                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0 ml-1">-{rule.points}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: DETAIL PEMILIH TINDAKAN POSITIF (CONTRIBUTION PICKER) */}
        {contributionPickerModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Catat Tindakan Positif Psikomotorik</h3>
                    <p className="text-xs text-slate-500">Peserta: <strong className="text-slate-800">{contributionPickerModal.participant.name}</strong> • Modal 50 Poin</p>
                  </div>
                </div>
                <button onClick={() => setContributionPickerModal(null)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {CONTRIBUTION_RULES.map((rule, rIdx) => (
                  <div key={rIdx} className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-teal-800 flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-teal-200 text-teal-900 inline-flex items-center justify-center text-[10px] font-mono">
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
                          onClick={() => handleQuickAddContribution(contributionPickerModal.participant, contributionPickerModal.session, item, rule.points, rule.symbol)}
                          className="p-2.5 rounded-xl bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs font-semibold text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                        >
                          <span>{item}</span>
                          <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded shrink-0 ml-1">+{rule.points}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${calculateAssessment(currentAssessments[selectedParticipantForGrading.id]).statusClass}`}>
                        {calculateAssessment(currentAssessments[selectedParticipantForGrading.id]).status} ({calculateAssessment(currentAssessments[selectedParticipantForGrading.id]).predicate})
                      </span>
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
              <div className="max-w-4xl mx-auto space-y-5 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm">
                
                {/* Live Calculation Formula Card */}
                {(() => {
                  const ass = calculateAssessment(currentAssessments[selectedParticipantForGrading.id]);
                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Formula Nilai Akhir (NA)</span>
                        <span className="text-base font-black text-slate-900 font-mono">NA = {ass.finalScore} <span className="text-xs text-slate-500">({ass.finalScore1000} Skala 1000)</span></span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* Box 1: Log Pelanggaran Afektif */}
                  <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                    <div className="flex items-center justify-between font-bold text-rose-950">
                      <span>Log Pelanggaran Afektif (Modal 100)</span>
                      <span className="text-rose-700 font-mono">
                        -{(currentAssessments[selectedParticipantForGrading.id]?.violations || []).reduce((s, v) => s + v.points, 0)} Poin
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {(!currentAssessments[selectedParticipantForGrading.id]?.violations || currentAssessments[selectedParticipantForGrading.id].violations.length === 0) ? (
                        <p className="text-slate-400 italic text-[11px] py-3">Tidak ada catatan pelanggaran (Nilai 100 sempurna).</p>
                      ) : (
                        currentAssessments[selectedParticipantForGrading.id].violations.map((v) => (
                          <div key={v.id} className="p-2.5 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-[11px] shadow-2xs">
                            <div>
                              <span className="font-bold text-slate-900 block">[{v.symbol}] {v.item}</span>
                              <span className="text-[10px] text-slate-400">{v.sessionTitle} • {v.timestamp}</span>
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
                        +{(currentAssessments[selectedParticipantForGrading.id]?.contributions || []).reduce((s, c) => s + c.points, 0)} Poin
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {(!currentAssessments[selectedParticipantForGrading.id]?.contributions || currentAssessments[selectedParticipantForGrading.id].contributions.length === 0) ? (
                        <p className="text-slate-400 italic text-[11px] py-3">Belum ada catatan keaktifan.</p>
                      ) : (
                        currentAssessments[selectedParticipantForGrading.id].contributions.map((c) => (
                          <div key={c.id} className="p-2.5 bg-white rounded-xl border border-teal-200 flex items-center justify-between text-[11px] shadow-2xs">
                            <div>
                              <span className="font-bold text-slate-900 block">[{c.symbol}] {c.item}</span>
                              <span className="text-[10px] text-slate-400">{c.sessionTitle} • {c.timestamp}</span>
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
                    placeholder="Tuliskan gambaran kualitatif, sikap, keaktifan dan rekomendasi untuk peserta ini..."
                    className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600 font-medium resize-none overflow-hidden [field-sizing:content] min-h-[46px]"
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

      </div>
    );
  }

  // 5. HELPDESK & LOG KENDALA (`helpdesk`)
  if (activeTab === 'helpdesk') {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans">
        {notification && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
            <span>{notification}</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
        )}

        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Helpdesk & Pos Kendala Panitia</h2>
        </div>

        {/* Form Tambah Incident */}
        <div className="light-card rounded-3xl p-6 space-y-4 border border-slate-200">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Catat Tiket Kendala Baru</h3>

          <form onSubmit={handleAddIncident} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Peserta Bermasalah</label>
                <input
                  type="text"
                  placeholder="Contoh: Rahmat Hidayat"
                  value={newIncidentUser}
                  onChange={(e) => setNewIncidentUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rincian Kendala / Masalah</label>
                <input
                  type="text"
                  placeholder="Contoh: HP Hilang / Minta Reset Token QR Baru"
                  value={newIncidentIssue}
                  onChange={(e) => setNewIncidentIssue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-300 text-slate-900 outline-none focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 btn-emerald font-semibold text-xs rounded-2xl shadow-md flex items-center space-x-1.5"
              >
                <LifeBuoy className="w-4 h-4" />
                <span>Simpan Tiket Helpdesk</span>
              </button>
            </div>
          </form>
        </div>

        {/* Incidents Log */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Riwayat Log Kendala ({incidents.length})</h3>

          <div className="space-y-3">
            {incidents.map((inc) => (
              <div key={inc.id} className="light-card rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 relative">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-semibold">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-semibold text-slate-900">{inc.user}</h4>
                      <span className="text-[10px] text-slate-400">• {inc.time}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">{inc.issue}</p>
                    <p className="text-[11px] text-emerald-700 font-medium">Solusi: {inc.solution}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-start md:self-center">
                  <span className={`text-[10px] font-semibold px-3 py-1 rounded-full border ${
                    inc.status === 'Selesai'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : inc.status === 'Proses'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200'
                  }`}>
                    {inc.status === 'Selesai' && '✓ Selesai'}
                    {inc.status === 'Proses' && '⏳ Dalam Proses'}
                    {inc.status === 'Pending' && '⚠️ Pending'}
                    {inc.status !== 'Selesai' && inc.status !== 'Proses' && inc.status !== 'Pending' && inc.status}
                  </span>

                  {/* 3-Dots Action Menu Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveIncidentMenuId(activeIncidentMenuId === inc.id ? null : inc.id);
                      }}
                      className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Menu Opsi Kendala"
                    >
                      <MoreVertical className="w-4 h-4 stroke-[2.2]" />
                    </button>

                    {activeIncidentMenuId === inc.id && (
                      <div 
                        className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveIncidentMenuId(null);
                            setPreviewIncidentModal(inc);
                            setEditSolutionInput(inc.solution || '');
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-emerald-600" />
                          <span>Preview Rincian Masalah</span>
                        </button>

                        <div className="my-1 border-t border-slate-100" />

                        <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Ubah Status Kendala:
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateIncidentStatus(inc.id, 'Selesai');
                            setActiveIncidentMenuId(null);
                          }}
                          className={`w-full px-3.5 py-1.5 text-left text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer ${
                            inc.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Selesai (Resolved)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateIncidentStatus(inc.id, 'Proses');
                            setActiveIncidentMenuId(null);
                          }}
                          className={`w-full px-3.5 py-1.5 text-left text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer ${
                            inc.status === 'Proses' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>Dalam Proses</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateIncidentStatus(inc.id, 'Pending');
                            setActiveIncidentMenuId(null);
                          }}
                          className={`w-full px-3.5 py-1.5 text-left text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer ${
                            inc.status === 'Pending' ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>Pending / Menunggu</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= MODAL PREVIEW RINCIAN MASALAH ================= */}
        {previewIncidentModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-auto animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-emerald-300 font-bold">
                        {previewIncidentModal.id}
                      </span>
                      <span className="text-xs text-slate-300">• {previewIncidentModal.time}</span>
                    </div>
                    <h3 className="font-extrabold text-base tracking-tight text-white mt-0.5">
                      Preview Rincian Masalah Lapangan
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewIncidentModal(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 text-xs text-slate-700">
                
                {/* User Info & Current Status */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Peserta</span>
                      <h4 className="font-bold text-sm text-slate-900 mt-0.5">{previewIncidentModal.user}</h4>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`px-3 py-1 text-[11px] font-bold rounded-full border ${
                      previewIncidentModal.status === 'Selesai'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : previewIncidentModal.status === 'Proses'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {previewIncidentModal.status === 'Selesai' && '✓ Selesai'}
                      {previewIncidentModal.status === 'Proses' && '⏳ Dalam Proses'}
                      {previewIncidentModal.status === 'Pending' && '⚠️ Pending'}
                      {previewIncidentModal.status !== 'Selesai' && previewIncidentModal.status !== 'Proses' && previewIncidentModal.status !== 'Pending' && previewIncidentModal.status}
                    </span>
                  </div>
                </div>

                {/* Rincian Masalah */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Deskripsi / Rincian Kendala Masalah
                  </label>
                  <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200/80 text-rose-900 font-medium leading-relaxed">
                    {previewIncidentModal.issue}
                  </div>
                </div>

                {/* Edit Solusi / Catatan Penanganan */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Solusi / Catatan Penanganan Panitia
                  </label>
                  <textarea
                    rows={1}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                    value={editSolutionInput}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onChange={(e) => {
                      setEditSolutionInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    placeholder="Masukkan solusi atau tindakan yang diambil panitia..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none overflow-hidden [field-sizing:content] min-h-[46px]"
                  />
                </div>

                {/* Quick Status Change Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Ubah Status Tiket Kendala
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateIncidentStatus(previewIncidentModal.id, 'Selesai', editSolutionInput);
                        setPreviewIncidentModal(prev => ({ ...prev, status: 'Selesai', solution: editSolutionInput }));
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1 cursor-pointer ${
                        previewIncidentModal.status === 'Selesai'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <span>✓ Selesai</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateIncidentStatus(previewIncidentModal.id, 'Proses', editSolutionInput);
                        setPreviewIncidentModal(prev => ({ ...prev, status: 'Proses', solution: editSolutionInput }));
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1 cursor-pointer ${
                        previewIncidentModal.status === 'Proses'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <span>⏳ Proses</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateIncidentStatus(previewIncidentModal.id, 'Pending', editSolutionInput);
                        setPreviewIncidentModal(prev => ({ ...prev, status: 'Pending', solution: editSolutionInput }));
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1 cursor-pointer ${
                        previewIncidentModal.status === 'Pending'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <span>⚠️ Pending</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPreviewIncidentModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateIncidentStatus(previewIncidentModal.id, previewIncidentModal.status, editSolutionInput);
                    setPreviewIncidentModal(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // DEFAULT / TAB 1: SESI & LIVE QR SCANNER (`sessions_scanner`)
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto font-sans relative">
      {/* Backdrop for Session Action Menu Popup Dismissal */}
      {activeSessionActionMenuId && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setActiveSessionActionMenuId(null)} 
        />
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
                BERANDA PANITIA & SCANNER
              </span>
            </div>
            <div className="mt-0.5 sm:mt-1 leading-tight">
              <p className="text-xs sm:text-base md:text-lg font-normal text-emerald-100 tracking-tight">
                Selamat Datang,
              </p>
              <h2 className="text-xs sm:text-base md:text-lg font-bold text-white tracking-tight mt-0.5">
                Administrator
              </h2>
            </div>
          </div>

          {/* Mini Ringkasan Dashboard - Proporsional & Rapat untuk Mobile, Luas untuk Desktop */}
          <div className="mt-1.5 sm:mt-2.5 max-w-[170px] xs:max-w-[195px] sm:max-w-[320px] md:max-w-[370px]">
            <div className="grid grid-cols-3 divide-x divide-white/20">
              
              {/* Stat 1: Kehadiran Rata */}
              <div className="flex flex-col items-center justify-center px-0.5 xs:px-1 sm:px-2 text-center">
                <div className="relative w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="19" className="stroke-white/20" strokeWidth="4.2" fill="transparent" />
                    <circle
                      cx="24"
                      cy="24"
                      r="19"
                      className="stroke-emerald-300 transition-all duration-1000 ease-out"
                      strokeWidth="4.2"
                      strokeDasharray={2 * Math.PI * 19}
                      strokeDashoffset={(2 * Math.PI * 19) * (1 - 0.885)}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-white tracking-tight">
                      88.5<span className="text-[4.5px] sm:text-[6.5px] md:text-[7.5px] font-semibold text-emerald-200">%</span>
                    </span>
                  </div>
                </div>
                <span className="text-[6px] xs:text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                  Rata Kehadiran
                </span>
              </div>

              {/* Stat 2: Peserta Aktif */}
              <div className="flex flex-col items-center justify-center px-0.5 xs:px-1 sm:px-2 text-center">
                <div className="relative w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="19" className="stroke-white/20" strokeWidth="4.2" fill="transparent" />
                    <circle
                      cx="24"
                      cy="24"
                      r="19"
                      className="stroke-emerald-300 transition-all duration-1000 ease-out"
                      strokeWidth="4.2"
                      strokeDasharray={2 * Math.PI * 19}
                      strokeDashoffset={(2 * Math.PI * 19) * (1 - 0.75)}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-white tracking-tight">
                      {totalP < 10 ? `0${totalP}` : totalP}
                    </span>
                  </div>
                </div>
                <span className="text-[6px] xs:text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                  Peserta Aktif
                </span>
              </div>

              {/* Stat 3: Sesi Berlangsung */}
              <div className="flex flex-col items-center justify-center px-0.5 xs:px-1 sm:px-2 text-center">
                <div className="relative w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="19" className="stroke-white/20" strokeWidth="4.2" fill="transparent" />
                    <circle
                      cx="24"
                      cy="24"
                      r="19"
                      className="stroke-emerald-300 transition-all duration-1000 ease-out"
                      strokeWidth="4.2"
                      strokeDasharray={2 * Math.PI * 19}
                      strokeDashoffset={(2 * Math.PI * 19) * (1 - 0.50)}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-white tracking-tight">
                      02
                    </span>
                  </div>
                </div>
                <span className="text-[6px] xs:text-[7px] sm:text-[9.5px] md:text-[11px] font-bold text-emerald-100 mt-0.5 sm:mt-1 text-center tracking-tight leading-tight">
                  Sesi Berlangsung
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

      {/* ================= 2. QUICK MENU GRID CARD (STYLE GLASSMORPHISM) ================= */}
      <div className="glass-panel-light rounded-3xl border border-white/70 shadow-lg overflow-hidden">
        <div className="grid grid-cols-3">
          
          {/* Item 1: Quiz Ujian */}
          <button
            onClick={() => setActiveTab && setActiveTab('quizzes')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
              Quiz Ujian
            </span>
          </button>

          {/* Item 2: Daftar Peserta */}
          <button
            onClick={() => setActiveTab && setActiveTab('participants')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-b border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
              Daftar Peserta
            </span>
          </button>

          {/* Item 3: Live Rekap */}
          <button
            onClick={() => setActiveTab && setActiveTab('recap')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-b border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <div className="flex items-center justify-center space-x-1">
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Live Rekap
              </span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            </div>
          </button>

          {/* Item 4: Helpdesk Lapangan */}
          <button
            onClick={() => setActiveTab && setActiveTab('helpdesk')}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <LifeBuoy className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
              Helpdesk Lapangan
            </span>
          </button>

          {/* Item 5: Scan Absensi */}
          <button
            onClick={() => setSelectedSession && handleOpenScanner(training?.sessions?.[0] || { id: 'SES-01', title: 'Sesi Presensi Utama' })}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 border-r border-slate-100/90 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <QrCode className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
              Scan Absensi
            </span>
          </button>

          {/* Item 6: Ekspor Excel */}
          <button
            onClick={handleExportRekap}
            className="p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center space-y-1.5 sm:space-y-3 hover:bg-emerald-50/40 transition-all duration-200 group cursor-pointer relative"
          >
            <div className="flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 py-1">
              <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 stroke-[2.2]" />
            </div>
            <div className="flex items-center justify-center space-x-1">
              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors tracking-tight text-center leading-tight">
                Ekspor Excel
              </span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            </div>
          </button>

        </div>
      </div>

      {/* Quick Simulated Input & Scanner Feedback Box */}
      <div className="light-card rounded-3xl p-6 space-y-4 border-2 border-emerald-300 bg-white shadow-sm">
        <div className="flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Input Manual Fast Token / Test Scanner Barcode Gun</h3>
        </div>

        <form onSubmit={processSimulatedScan} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Tempelkan atau ketik Token QR (Contoh: ABSEN-PESERTA-BUDI-881023)..."
            value={simulatedTokenInput}
            onChange={(e) => setSimulatedTokenInput(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            className="px-6 py-3 btn-emerald text-xs font-semibold rounded-2xl shadow-md flex items-center justify-center space-x-2 shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Verifikasi Presensi</span>
          </button>
        </form>

        {scanResult && (
          <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start space-x-3 animate-fade-in ${
            scanResult.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
            scanResult.type === 'warning' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
            'bg-rose-100 text-rose-900 border border-rose-300'
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
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 self-start sm:self-auto">
            Total {training?.sessions?.length || 0} Sesi Pelatihan
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
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
                {training.sessions.map((ses, idx) => {
                  const currentStatus = sessionStatuses[ses.id] || ses.status;
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
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
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
                        <div className="space-y-1 text-slate-600">
                          <div className="flex items-center space-x-1.5 font-medium text-xs">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{ses.time}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 font-normal">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{ses.room || 'Ruang Training'} ({ses.date})</span>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-extrabold ${
                          isCurrent 
                            ? 'bg-emerald-600 text-white shadow-xs animate-pulse' 
                            : isFinished
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>

                      {/* Aksi Menu Titik 3 */}
                      <td className="py-4 px-4 text-center relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSessionActionMenuId(activeSessionActionMenuId === ses.id ? null : ses.id);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer inline-flex items-center justify-center"
                          title="Menu Aksi Sesi"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Popup Menu */}
                        {activeSessionActionMenuId === ses.id && (
                          <div 
                            className="absolute right-4 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi Sesi</p>
                              <p className="text-xs font-semibold text-slate-800 truncate">{ses.title}</p>
                            </div>

                            {/* Option 1: Buka / Tutup Status */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSessionActionMenuId(null);
                                handleToggleSessionStatus(ses.id);
                              }}
                              className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              {isCurrent ? (
                                <StopCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                              <span>{isCurrent ? 'Tutup Status Presensi' : 'Buka Status Presensi'}</span>
                            </button>

                            {/* Option 2: Barcode */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSessionActionMenuId(null);
                                setBarcodeModalSession(ses);
                                setBarcodeModalSessionIndex(idx + 1);
                              }}
                              className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Tampilkan Barcode Sesi</span>
                            </button>

                            {/* Option 3: Scan Kamera */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSessionActionMenuId(null);
                                handleOpenScanner(ses);
                              }}
                              className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Scan Kamera Live</span>
                            </button>

                            <div className="border-t border-slate-100 my-1" />

                            {/* Option 4: Penilaian Peserta (Lembar Nilai Sesi) */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSessionActionMenuId(null);
                                setSessionGradingModal({ session: ses, sessionIndex: idx + 1 });
                                setPenilaianSearchQuery('');
                              }}
                              className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Penilaian Peserta</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
              <span>Menampilkan {filteredAssessedParticipants.length} dari {assessedParticipants.length} Peserta</span>
            </div>
          </div>

          {/* Scrollable Participants Grading Table (Matching Gambar 2) */}
          <div className="flex-1 overflow-auto bg-white relative">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-2xs">
                <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 md:px-6 w-12 text-center">NO</th>
                  <th className="py-3.5 px-4 md:px-6 min-w-[180px]">NAMA PESERTA</th>
                  <th className="py-3.5 px-4 md:px-6 min-w-[160px]">ASAL KOMISARIAT</th>
                  <th className="py-3.5 px-3 md:px-4 text-center min-w-[125px]">AFEKTIF (50%)</th>
                  <th className="py-3.5 px-3 md:px-4 text-center min-w-[125px]">KOGNITIF (30%)</th>
                  <th className="py-3.5 px-3 md:px-4 text-center min-w-[130px]">PSIKOMOTORIK (20%)</th>
                  <th className="py-3.5 px-2 text-center min-w-[90px] w-24">NILAI AKHIR (NA)</th>
                  <th className="py-3.5 px-4 md:px-6 text-center min-w-[180px]">STATUS PENILAIAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssessedParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      Tidak ada peserta yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredAssessedParticipants.map((p, idx) => {
                    const { afektif, kognitif, psikomotorik, totalViolations, totalContributions, finalScore, predicate, status, statusClass } = p.computed;

                    return (
                      <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="py-3 px-4 md:px-6 font-semibold text-slate-400 text-center">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 md:px-6">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">{p.name}</div>
                        </td>
                        <td className="py-3 px-4 md:px-6">
                          <div className="text-slate-700 font-medium text-xs">{p.instansi || '-'}</div>
                        </td>
                        <td className="py-3 px-3 md:px-4 text-center">
                          <div className="inline-flex items-center justify-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleQuickAddViolation(p, sessionGradingModal.session, 'Pelanggaran Sesi', 1, 'x')}
                              className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                              title="Kurang Nilai Afektif (-1)"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-emerald-700 min-w-[24px] text-center text-xs sm:text-sm">
                              {afektif}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUndoViolation(p.id, p.name)}
                              disabled={totalViolations === 0}
                              className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-all active:scale-90 ${
                                totalViolations > 0 
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer' 
                                  : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                              }`}
                              title={totalViolations > 0 ? "Batalkan Pengurangan (+1)" : "Nilai Maksimal 100"}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 md:px-4 text-center">
                          <div className="inline-flex items-center justify-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleAdjustKognitifScore(p.id, -5)}
                              className="w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                              title="Kurang 5 Nilai Kognitif (-5)"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-emerald-700 min-w-[24px] text-center text-xs sm:text-sm">
                              {kognitif}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustKognitifScore(p.id, 5)}
                              className="w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                              title="Tambah 5 Nilai Kognitif (+5)"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 md:px-4 text-center">
                          <div className="inline-flex items-center justify-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleUndoContribution(p.id, p.name)}
                              disabled={totalContributions === 0}
                              className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-all active:scale-90 ${
                                totalContributions > 0 
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer' 
                                  : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                              }`}
                              title={totalContributions > 0 ? "Batalkan Keaktifan (-1)" : "Nilai Standar 50"}
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-emerald-700 min-w-[24px] text-center text-xs sm:text-sm">
                              {psikomotorik}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickAddContribution(p, sessionGradingModal.session, 'Keaktifan Sesi', 1, 'x')}
                              className="w-6 h-6 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                              title="Tambah Keaktifan Psikomotorik (+1)"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                          {finalScore}
                        </td>
                        <td className="py-3 px-4 md:px-6 text-center">
                          <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shadow-2xs ${statusClass}`}>
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

            {/* Footer */}
            <footer className="p-3 sm:p-4 bg-white border-t border-slate-200/90 flex items-center justify-between gap-3 shrink-0 z-30">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Semua perubahan nilai tersimpan otomatis dan langsung direkap ke nilai akhir.
              </span>
              <button
                type="button"
                onClick={() => setSessionGradingModal(null)}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 ml-auto"
              >
                Selesai & Tutup
              </button>
            </footer>
          </div>
        )}

      {/* MODAL 2: DETAIL PEMILIH PELANGGARAN TERPERINCI (VIOLATION PICKER) */}
      {violationPickerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Minus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Catat Pelanggaran Afektif</h3>
                  <p className="text-xs text-slate-500">Peserta: <strong className="text-slate-800">{violationPickerModal.participant.name}</strong> • Modal 100 Poin</p>
                </div>
              </div>
              <button onClick={() => setViolationPickerModal(null)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {VIOLATION_RULES.map((rule, rIdx) => (
                <div key={rIdx} className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-800 flex items-center space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-900 inline-flex items-center justify-center text-[10px] font-mono">
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
                        onClick={() => handleQuickAddViolation(violationPickerModal.participant, violationPickerModal.session, item, rule.points, rule.symbol)}
                        className="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-900 border border-slate-200 hover:border-rose-300 text-xs font-semibold text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                      >
                        <span>{item}</span>
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0 ml-1">-{rule.points}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DETAIL PEMILIH TINDAKAN POSITIF (CONTRIBUTION PICKER) */}
      {contributionPickerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Catat Tindakan Positif Psikomotorik</h3>
                  <p className="text-xs text-slate-500">Peserta: <strong className="text-slate-800">{contributionPickerModal.participant.name}</strong> • Modal 50 Poin</p>
                </div>
              </div>
              <button onClick={() => setContributionPickerModal(null)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {CONTRIBUTION_RULES.map((rule, rIdx) => (
                <div key={rIdx} className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-800 flex items-center space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-teal-200 text-teal-900 inline-flex items-center justify-center text-[10px] font-mono">
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
                        onClick={() => handleQuickAddContribution(contributionPickerModal.participant, contributionPickerModal.session, item, rule.points, rule.symbol)}
                        className="p-2.5 rounded-xl bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs font-semibold text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                      >
                        <span>{item}</span>
                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded shrink-0 ml-1">+{rule.points}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${calculateAssessment(currentAssessments[selectedParticipantForGrading.id]).statusClass}`}>
                      {calculateAssessment(currentAssessments[selectedParticipantForGrading.id]).status} ({calculateAssessment(currentAssessments[selectedParticipantForGrading.id]).predicate})
                    </span>
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
            <div className="max-w-4xl mx-auto space-y-5 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm">
              
              {/* Live Calculation Formula Card */}
              {(() => {
                const ass = calculateAssessment(currentAssessments[selectedParticipantForGrading.id]);
                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Formula Nilai Akhir (NA)</span>
                      <span className="text-base font-black text-slate-900 font-mono">NA = {ass.finalScore} <span className="text-xs text-slate-500">({ass.finalScore1000} Skala 1000)</span></span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Box 1: Log Pelanggaran Afektif */}
                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                  <div className="flex items-center justify-between font-bold text-rose-950">
                    <span>Log Pelanggaran Afektif (Modal 100)</span>
                    <span className="text-rose-700 font-mono">
                      -{(currentAssessments[selectedParticipantForGrading.id]?.violations || []).reduce((s, v) => s + v.points, 0)} Poin
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {(!currentAssessments[selectedParticipantForGrading.id]?.violations || currentAssessments[selectedParticipantForGrading.id].violations.length === 0) ? (
                      <p className="text-slate-400 italic text-[11px] py-3">Tidak ada catatan pelanggaran (Nilai 100 sempurna).</p>
                    ) : (
                      currentAssessments[selectedParticipantForGrading.id].violations.map((v) => (
                        <div key={v.id} className="p-2.5 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-[11px] shadow-2xs">
                          <div>
                            <span className="font-bold text-slate-900 block">[{v.symbol}] {v.item}</span>
                            <span className="text-[10px] text-slate-400">{v.sessionTitle} • {v.timestamp}</span>
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
                      +{(currentAssessments[selectedParticipantForGrading.id]?.contributions || []).reduce((s, c) => s + c.points, 0)} Poin
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {(!currentAssessments[selectedParticipantForGrading.id]?.contributions || currentAssessments[selectedParticipantForGrading.id].contributions.length === 0) ? (
                      <p className="text-slate-400 italic text-[11px] py-3">Belum ada catatan keaktifan.</p>
                    ) : (
                      currentAssessments[selectedParticipantForGrading.id].contributions.map((c) => (
                        <div key={c.id} className="p-2.5 bg-white rounded-xl border border-teal-200 flex items-center justify-between text-[11px] shadow-2xs">
                          <div>
                            <span className="font-bold text-slate-900 block">[{c.symbol}] {c.item}</span>
                            <span className="text-[10px] text-slate-400">{c.sessionTitle} • {c.timestamp}</span>
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
