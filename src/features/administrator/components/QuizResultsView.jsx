import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Search, FileSpreadsheet, X, CheckCircle2, XCircle, Clock,
  MoreVertical, Pencil, Eye, Check, AlertCircle, FileText, RotateCcw,
  Save, Award, HelpCircle, ChevronRight, SlidersHorizontal, BookOpen, Undo2,
  GraduationCap, School, Loader2
} from 'lucide-react';
import { api } from '@/services/api';
import { useClass } from '@/context/ClassContext';

export const isSubmissionForQuiz = (sub, quiz) => {
  if (!sub || !quiz) return false;
  const subKeys = [
    sub.quizId, 
    sub.quiz_id, 
    sub.quiz?.id, 
    sub.quiz?.quiz_code, 
    sub.quiz_code,
    sub.quizTitle,
    sub.quiz_title,
    sub.quiz?.title
  ].filter(Boolean).map(v => String(v).trim().toLowerCase());

  const quizKeys = [
    quiz.id, 
    quiz.db_id, 
    quiz.quiz_code, 
    quiz.linkCode, 
    quiz.link_code,
    quiz.title
  ].filter(Boolean).map(v => String(v).trim().toLowerCase());

  return subKeys.some(k => quizKeys.includes(k));
};

export const isSubmissionForParticipant = (sub, p) => {
  if (!sub || !p) return false;

  const cleanId = (v) => {
    if (v === null || v === undefined) return null;
    const str = String(v).trim().replace(/^USR-/i, '');
    if (!str || str === '0' || str === 'null' || str === 'undefined') return null;
    return str.toLowerCase();
  };

  // HANYA ambil ID yang merujuk ke Akun Pengguna (User ID), BUKAN primary key tabel quiz_submissions (sub.db_id)!
  const subUserIds = [
    cleanId(sub.user_id),
    cleanId(sub.user?.id),
    cleanId(sub.userId),
    cleanId(sub.participantId),
    cleanId(sub.participant_id)
  ].filter(Boolean);

  const pIds = [
    cleanId(p.id),
    cleanId(p.db_id),
    cleanId(p.user_id),
    cleanId(p.userId)
  ].filter(Boolean);

  const hasSubId = subUserIds.length > 0;
  const hasPId = pIds.length > 0;

  // 1. Cek User ID: Jika submission dan peserta sama-sama punya ID valid,
  // maka ID ini WAJIB cocok. Jika ID berbeda, MUTLAK bukan orang yang sama!
  if (hasSubId && hasPId) {
    const isIdMatch = subUserIds.some(sid => pIds.includes(sid));
    if (!isIdMatch) {
      return false; // Akun A dan Akun B berbeda ID -> Tolak!
    }
    return true; // ID cocok sempurna
  }

  // 2. Cek Email Resmi: Email akun bersifat unik per pengguna
  const subEmail = (sub.participantEmail || sub.participant_email || sub.user?.email || '').trim().toLowerCase();
  const pEmail = (p.email || '').trim().toLowerCase();
  const isValidEmail = (em) => em && em.includes('@') && !em.includes('example.com') && em !== 'null' && em !== 'undefined';

  if (isValidEmail(subEmail) && isValidEmail(pEmail)) {
    if (subEmail !== pEmail) {
      return false; // Email berbeda -> Tolak!
    }
    return true; // Email cocok sempurna
  }

  // 3. Fallback Nama: HANYA jika ID atau Email tidak tersedia di salah satu sisi,
  // dan nama BUKAN nama umum/generik
  const subName = (sub.participantName || sub.participant_name || sub.user?.name || '').trim().toLowerCase();
  const pName = (p.name || '').trim().toLowerCase();
  const genericNames = ['', 'peserta', 'peserta lk1', 'peserta lk 1', 'admin', 'user', 'null', 'undefined'];

  if (subName && pName && !genericNames.includes(subName) && !genericNames.includes(pName)) {
    return subName === pName;
  }

  return false;
};

export const findSubmissionForParticipant = (p, submissions, quiz) => {
  if (!p || !submissions) return null;
  return (submissions || []).find(s => isSubmissionForQuiz(s, quiz) && isSubmissionForParticipant(s, p)) || null;
};

export const normalizeAnswerText = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    val = val.text || val.label || val.value || val.title || '';
  }
  return String(val)
    .replace(/\u00A0/g, ' ') // replace non-breaking spaces
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/[\u2018\u2019]/g, "'") // smart quotes
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
};

export const isAnswerMatch = (userAns, correctAns, options = []) => {
  if (userAns === null || userAns === undefined || correctAns === null || correctAns === undefined) return false;
  
  const normUser = normalizeAnswerText(userAns);
  const normCorrect = normalizeAnswerText(correctAns);
  
  if (!normUser || !normCorrect) return false;
  
  // 1. Direct exact match (case insensitive)
  if (normUser.toLowerCase() === normCorrect.toLowerCase()) {
    return true;
  }
  
  // Helper strip prefix: "A. ", "A) ", "A - ", "[A] "
  const stripPrefix = (str) => {
    return str.replace(/^[A-Za-z0-9][\.\)\-\:\s\]]+\s*/i, '').trim();
  };
  
  const extractPrefix = (str) => {
    const match = str.match(/^([A-Za-z0-9])[\.\)\-\:\s\]]/);
    if (match) return match[1].toUpperCase();
    if (str.length <= 2) return str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return '';
  };
  
  const userNoPrefix = stripPrefix(normUser);
  const correctNoPrefix = stripPrefix(normCorrect);
  
  // 2. Bandingkan isi teks tanpa prefix huruf (jika keduanya memiliki teks substansi)
  if (userNoPrefix && correctNoPrefix && userNoPrefix.toLowerCase() === correctNoPrefix.toLowerCase()) {
    return true;
  }
  
  // 3. Jika salah satu hanya berupa huruf "A" / "B" dan yang lain berformat "A. Teks..."
  const userPrefix = extractPrefix(normUser);
  const correctPrefix = extractPrefix(normCorrect);
  
  // Hanya cocokan prefix murni jika salah satu sisi memang HANYA huruf singkat
  const isUserOnlyLetter = normUser.length <= 2 || !userNoPrefix;
  const isCorrectOnlyLetter = normCorrect.length <= 2 || !correctNoPrefix;
  
  if ((isUserOnlyLetter || isCorrectOnlyLetter) && userPrefix && correctPrefix && userPrefix === correctPrefix) {
    return true;
  }
  
  // 4. Match against options array jika disediakan
  if (Array.isArray(options) && options.length > 0) {
    let correctIdx = -1;
    let userIdx = -1;
    
    options.forEach((opt, idx) => {
      const optLetter = String.fromCharCode(65 + idx); // 'A', 'B', 'C', ...
      const normOpt = normalizeAnswerText(opt);
      const optNoPrefix = stripPrefix(normOpt);
      const optPrefix = extractPrefix(normOpt);
      
      // Cek apakah correctAns merujuk ke opsi ini
      if (
        normCorrect.toLowerCase() === normOpt.toLowerCase() ||
        (correctNoPrefix && optNoPrefix && correctNoPrefix.toLowerCase() === optNoPrefix.toLowerCase()) ||
        (isCorrectOnlyLetter && (correctPrefix === optLetter || correctPrefix === optPrefix))
      ) {
        correctIdx = idx;
      }
      
      // Cek apakah userAns merujuk ke opsi ini
      if (
        normUser.toLowerCase() === normOpt.toLowerCase() ||
        (userNoPrefix && optNoPrefix && userNoPrefix.toLowerCase() === optNoPrefix.toLowerCase()) ||
        (isUserOnlyLetter && (userPrefix === optLetter || userPrefix === optPrefix))
      ) {
        userIdx = idx;
      }
    });
    
    if (correctIdx !== -1 && userIdx !== -1 && correctIdx === userIdx) {
      return true;
    }
  }
  
  return false;
};

export const getAnswerForQuestion = (answers, q, idx) => {
  if (!answers || typeof answers !== 'object') return '';
  const candidates = [
    q?.id,
    q?.db_id,
    q?.id !== undefined ? String(q.id) : null,
    q?.db_id !== undefined ? String(q.db_id) : null,
    q?.question_code,
    idx !== undefined ? idx : null,
    idx !== undefined ? idx + 1 : null,
    idx !== undefined ? String(idx) : null,
    idx !== undefined ? String(idx + 1) : null
  ].filter(v => v !== null && v !== undefined);

  for (const key of candidates) {
    if (answers[key] !== undefined && answers[key] !== null) {
      return answers[key];
    }
  }
  return '';
};

export default function QuizResultsView({ 
  quiz, 
  participants = [], 
  quizSubmissions = [], 
  onUpdateSubmission,
  onResetSubmission,
  isSuperAdmin = false,
  currentUser,
  onRequestReset, 
  onBack, 
  onRefresh,
  showNotification 
}) {
  const { classes: contextClasses = [], selectedClassId } = useClass() || {};
  const [searchQuery, setSearchQuery] = useState('');

  // Default class filter: untuk Admin Utama selalu default ke 'ALL' (Semua Kelas); untuk admin panitia, prioritaskan kelas binaannya
  const [classFilter, setClassFilter] = useState(() => {
    if (isSuperAdmin || currentUser?.role === 'super_admin' || currentUser?.role === 'admin_utama') {
      return 'ALL';
    }
    if (currentUser?.role === 'admin') {
      const managed = Array.isArray(currentUser.managed_classes) ? currentUser.managed_classes : [];
      if (selectedClassId && selectedClassId !== 'ALL') {
        return String(selectedClassId);
      }
      if (managed.length > 0) {
        return String(managed[0].id);
      }
    }
    return 'ALL';
  });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [previewPhotoUser, setPreviewPhotoUser] = useState(null);

  useEffect(() => {
    if (!previewPhotoUser) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPreviewPhotoUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewPhotoUser]);

  // Auto-refresh when opening Quiz Results to fetch newest participant submissions
  useEffect(() => {
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
  }, [onRefresh]);

  // Floating action menu (top layer fixed portal di atas tabel, bebas clipping)
  const [activeActionMenu, setActiveActionMenu] = useState(null);

  const handleToggleActionMenu = (e, participant, sub) => {
    e.stopPropagation();
    const rowKey = participant.id || participant.email || participant.name;
    if (activeActionMenu?.key === rowKey) {
      setActiveActionMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 224; // w-56
    const menuHeight = sub && onRequestReset ? 200 : 160;

    const canOpenLeft = rect.left > menuWidth + 16;
    const topPos = Math.max(12, Math.min(rect.top, window.innerHeight - menuHeight - 12));

    setActiveActionMenu({
      key: rowKey,
      participant,
      submission: sub,
      top: canOpenLeft ? topPos : Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 12),
      right: canOpenLeft ? (window.innerWidth - rect.left + 8) : Math.max(12, window.innerWidth - rect.right),
    });
  };

  // Active full-page sub-view: null (table view) | { mode: 'view' | 'grade', participant, submission }
  const [activeSubView, setActiveSubView] = useState(null);

  // Combined participant list
  const combinedParticipants = useMemo(() => {
    const list = [...participants];

    const isAdmin = currentUser && (currentUser.role === 'admin' || !isSuperAdmin);
    const managedClassIds = (isAdmin && Array.isArray(currentUser?.managed_classes))
      ? currentUser.managed_classes.map(c => String(c.id))
      : [];

    // Add any submissions whose participant isn't in the main participants list
    (quizSubmissions || []).forEach(sub => {
      if (isSubmissionForQuiz(sub, quiz)) {
        const exists = list.some(p => isSubmissionForParticipant(sub, p));
        if (!exists) {
          const subClassId = sub.class_id || sub.user?.class_id || null;
          
          // Jika admin memiliki kelas binaan khusus, jangan masukkan submission yang berasal dari kelas lain atau umum/tanpa kelas
          if (isAdmin && !isSuperAdmin && managedClassIds.length > 0) {
            if (!subClassId || !managedClassIds.includes(String(subClassId))) {
              return;
            }
          }

          list.push({
            id: sub.participantId || (sub.user_id ? `USR-${sub.user_id}` : `SUB-PART-${sub.id}`),
            name: sub.participantName || 'Peserta',
            email: sub.participantEmail || '',
            instansi: 'HMI Komisariat',
            class_id: subClassId,
            className: sub.className || sub.class_name || sub.participantClass || (sub.user?.classRoom?.name) || (sub.user?.class?.name) || 'Kelas Umum'
          });
        }
      }
    });

    return list;
  }, [participants, quizSubmissions, quiz, currentUser, isSuperAdmin]);

  // Daftar opsi kelas yang tersedia (dari context + data peserta jika ada)
  const availableClassOptions = useMemo(() => {
    let list = [...contextClasses];
    (participants || []).forEach(p => {
      if (p.class_id && !list.some(c => String(c.id) === String(p.class_id))) {
        list.push({
          id: p.class_id,
          name: p.className || p.class_name || `Kelas ${p.class_id}`,
          code: p.classCode || ''
        });
      }
    });

    if (!isSuperAdmin && currentUser?.role === 'admin') {
      const managed = Array.isArray(currentUser.managed_classes) ? currentUser.managed_classes : [];
      const managedIds = managed.map(c => String(c.id));
      if (managedIds.length > 0) {
        list = list.filter(c => managedIds.includes(String(c.id)));
      }
    }

    return list;
  }, [contextClasses, participants, currentUser, isSuperAdmin]);

  // Helper untuk mendapatkan informasi kelas peserta
  const getParticipantClass = (p) => {
    if (!p) return { isGeneral: true, name: 'Kelas Umum', id: null };
    if (p.class_id) {
      const match = availableClassOptions.find(c => String(c.id) === String(p.class_id));
      if (match) {
        return { isGeneral: false, name: match.name, code: match.code, id: match.id };
      }
    }
    const explicitName = p.className || p.class_name || (p.class && p.class.name);
    if (explicitName && !explicitName.toLowerCase().includes('umum')) {
      return { isGeneral: false, name: explicitName, code: p.classCode, id: p.class_id };
    }
    return { isGeneral: true, name: 'Kelas Umum', id: null };
  };

  // Filtered rows based on search, class filter, and predicate/status filter
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return combinedParticipants.filter(p => {
      const sub = findSubmissionForParticipant(p, quizSubmissions, quiz);
      const classInfo = getParticipantClass(p);

      // 1. Search Query Filter
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.instansi && p.instansi.toLowerCase().includes(q)) ||
        classInfo.name.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 2. Class Filter (Kategori Kelas)
      if (!isSuperAdmin && currentUser?.role === 'admin') {
        const managed = Array.isArray(currentUser.managed_classes) ? currentUser.managed_classes : [];
        const managedIds = managed.map(c => String(c.id));
        if (managedIds.length > 0) {
          const pClassId = p.class_id ? String(p.class_id) : null;
          if (!pClassId || !managedIds.includes(pClassId)) {
            return false;
          }
        }
      }

      if (classFilter !== 'ALL') {
        if (classFilter === 'general') {
          if (!classInfo.isGeneral) return false;
        } else {
          const selectedCls = availableClassOptions.find(c => String(c.id) === String(classFilter));
          const matchesId = p.class_id && String(p.class_id) === String(classFilter);
          const matchesName = selectedCls && classInfo.name && classInfo.name.toLowerCase() === selectedCls.name.toLowerCase();
          if (!matchesId && !matchesName) return false;
        }
      }

      // 3. Status / Predicate Filter
      if (statusFilter === 'LULUS') {
        return sub && Number(sub.score) >= Number(quiz.passingGrade || 70);
      }
      if (statusFilter === 'GAGAL') {
        return sub && Number(sub.score) < Number(quiz.passingGrade || 70);
      }
      if (statusFilter === 'BELUM') {
        return !sub;
      }

      return true;
    });
  }, [combinedParticipants, quizSubmissions, quiz, searchQuery, statusFilter, classFilter, availableClassOptions, currentUser, isSuperAdmin]);

  // Export data to Excel
  const handleExportExcel = () => {
    const activeClassLabel = classFilter === 'ALL' 
      ? 'Semua Kelas' 
      : (classFilter === 'general' ? 'Kelas Umum' : (availableClassOptions.find(c => String(c.id) === String(classFilter))?.name || classFilter));
    const activePredicateLabel = statusFilter === 'ALL' 
      ? 'Semua Predikat' 
      : (statusFilter === 'LULUS' ? 'Lulus' : (statusFilter === 'GAGAL' ? 'Tidak Lulus' : 'Belum Mengerjakan'));

    let html = `
      <html xmlns:o="urn:schemas-microsoft-office:office" xmlns:x="urn:schemas-microsoft-office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Hasil Quiz</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          th { background-color: #047857; color: #ffffff; font-weight: bold; border: 1px solid #065f46; text-align: center; padding: 10px; }
          td { border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; vertical-align: middle; }
          .title { font-size: 14pt; font-weight: bold; color: #047857; text-align: center; padding: 10px 0 5px 0; }
          .meta { font-size: 10pt; color: #475569; text-align: center; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="title">REKAPITULASI PENILAIAN QUIZ PESERTA</div>
        <div class="meta">Judul Quiz: ${quiz.title} | Passing Grade: ${quiz.passingGrade || 70} Poin | Filter Kelas: ${activeClassLabel} | Filter Predikat: ${activePredicateLabel} | Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}</div>
        <table>
          <thead>
            <tr>
              <th>NO</th>
              <th>NAMA PESERTA</th>
              <th>KELAS</th>
              <th>EMAIL</th>
              <th>ASAL KOMISARIAT</th>
              <th>SCORE AKHIR</th>
              <th>WAKTU SUBMIT</th>
              <th>STATUS PENILAIAN</th>
              <th>STATUS DATA</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredRows.forEach((p, idx) => {
      const sub = findSubmissionForParticipant(p, quizSubmissions, quiz);
      const classInfo = getParticipantClass(p);
      const score = sub ? sub.score : '-';
      const submitTime = sub ? sub.submittedAt : 'Belum Submit';
      let statusText = 'Belum Mengerjakan';
      if (sub) {
        statusText = Number(sub.score) >= Number(quiz.passingGrade || 70) ? 'Lulus (Baik)' : 'Tidak Lulus';
      }
      const dataStatus = sub ? (sub.isCorrected ? 'Telah Dikoreksi' : 'Terkunci') : '-';

      html += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><b>${p.name}</b></td>
          <td style="text-align: center; font-weight: 600;">${classInfo.name}</td>
          <td>${p.email || '-'}</td>
          <td>${p.instansi || '-'}</td>
          <td style="text-align: center; font-weight: bold; color: ${sub ? (Number(sub.score) >= Number(quiz.passingGrade || 70) ? '#047857' : '#b91c1c') : '#64748b'};">${score}</td>
          <td style="text-align: center;">${submitTime}</td>
          <td style="text-align: center; font-weight: bold;">${statusText}</td>
          <td style="text-align: center;">${dataStatus}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const cleanTitle = (quiz.title || 'Quiz').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const fileName = `Rekap_Nilai_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.xls`;
    const blob = new Blob(["\uFEFF" + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    if (showNotification) showNotification('File Excel Rekap Nilai Quiz berhasil diunduh!');
  };

  // Open full-page views
  const handleOpenViewPage = (participant, sub) => {
    setActiveSubView({ mode: 'view', participant, submission: sub });
  };

  const handleOpenGradePage = (participant, sub) => {
    setActiveSubView({ mode: 'grade', participant, submission: sub });
  };

  // 1. IF FULL-PAGE "LIHAT JAWABAN" IS ACTIVE
  if (activeSubView?.mode === 'view') {
    return (
      <FullPageAnswerSheetView
        quiz={quiz}
        participant={activeSubView.participant}
        submission={activeSubView.submission}
        onBack={() => setActiveSubView(null)}
        onOpenGrade={() => handleOpenGradePage(activeSubView.participant, activeSubView.submission)}
      />
    );
  }

  // 2. IF FULL-PAGE "KOREKSI JAWABAN & NILAI" IS ACTIVE
  if (activeSubView?.mode === 'grade') {
    return (
      <FullPageGradingView
        quiz={quiz}
        participant={activeSubView.participant}
        submission={activeSubView.submission}
        onBack={() => setActiveSubView(null)}
        onSaveGrade={async (updatedSubmission) => {
          try {
            if (onUpdateSubmission) {
              await onUpdateSubmission(updatedSubmission);
            }
            if (showNotification) {
              showNotification(`Koreksi nilai peserta "${activeSubView.participant?.name || 'Peserta'}" berhasil disimpan! Skor: ${updatedSubmission.score}`);
            }
            setActiveSubView(null);
            return { ok: true };
          } catch (err) {
            console.error('Failed to save grade correction:', err);
            if (showNotification) {
              showNotification(`Gagal menyimpan koreksi: ${err.message || 'Terjadi kesalahan sistem'}`, 'error');
            }
            return { ok: false, error: err.message };
          }
        }}
      />
    );
  }

  // 3. DEFAULT: FULL-PAGE TABEL REKAPITULASI PENILAIAN
  return (
    <div className="bg-slate-50 min-h-screen font-sans w-full pb-16">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left: Back button & Title */}
          <div className="flex items-center space-x-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Kembali ke Daftar Quiz"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="truncate">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                Penilaian: {quiz.title}
              </h2>
            </div>
          </div>

          {/* Right: Search, Filter, Unduh Data, Close */}
          {/* Right: Search, Filter Kelas, Filter Predikat, Unduh Data, Close */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 flex-wrap sm:flex-nowrap">
            
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari peserta / kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:bg-white font-medium"
              />
            </div>

            {/* Filter Kategori Kelas (di sebelah kiri dropdown kategori predikat) */}
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-2.5 sm:px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer max-w-[130px] sm:max-w-[160px] truncate"
              title="Kategori Kelas"
            >
              {(isSuperAdmin || (currentUser?.role === 'admin' && (!Array.isArray(currentUser.managed_classes) || currentUser.managed_classes.length > 1))) && (
                <option value="ALL">Semua Kelas</option>
              )}
              {isSuperAdmin && (
                <option value="general">Kelas Umum</option>
              )}
              {availableClassOptions.map(c => {
                const displayName = (c.name || '').replace(/\s*\(\s*KLS[^\)]*\)/gi, '').trim() || c.name || `Kelas ${c.id}`;
                return (
                  <option key={c.id} value={String(c.id)}>
                    {displayName}
                  </option>
                );
              })}
            </select>

            {/* Filter Kategori Predikat */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 sm:px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer max-w-[130px] sm:max-w-[150px] truncate"
              title="Kategori Predikat"
            >
              <option value="ALL">Semua Predikat</option>
              <option value="LULUS">Lulus (&ge; {quiz.passingGrade || 70})</option>
              <option value="GAGAL">Tidak Lulus (&lt; {quiz.passingGrade || 70})</option>
              <option value="BELUM">Belum Mengerjakan</option>
            </select>

            {/* Unduh Data Button (Hanya 1 Tombol Utama) */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md flex items-center space-x-1.5 sm:space-x-2 transition-colors shadow-xs cursor-pointer shrink-0 active:scale-95"
              title="Unduh Rekap Nilai ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Data</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Tutup Halaman Penilaian"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-4">

        {/* Table Wrapper */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] sm:text-[11px] tracking-wider">
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 md:px-4 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center sticky left-0 z-20 bg-slate-50">NO</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 md:px-4 min-w-[125px] sm:min-w-[170px] md:min-w-[200px] sticky left-[32px] sm:left-[40px] md:left-[48px] z-20 bg-slate-50 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">NAMA PESERTA</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 min-w-[110px] sm:min-w-[130px]">KELAS</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 min-w-[130px] sm:min-w-[160px]">ASAL KOMISARIAT</th>
                  <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-4 text-center min-w-[80px] sm:min-w-[110px]">SCORE AKHIR</th>
                  <th className="py-2.5 sm:py-3.5 px-1.5 sm:px-4 text-center min-w-[90px] sm:min-w-[120px]">WAKTU SUBMIT</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center min-w-[110px] sm:min-w-[150px]">STATUS PENILAIAN</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center w-16 sm:w-24">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      Tidak ada peserta yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((p, idx) => {
                    const sub = findSubmissionForParticipant(p, quizSubmissions, quiz);
                    const classInfo = getParticipantClass(p);
                    const initialLetter = (p.name || 'P').trim().charAt(0).toUpperCase();
                    const isPassed = sub && Number(sub.score) >= Number(quiz.passingGrade || 70);
                    const rowKey = p.id || `row-${idx}`;

                    return (
                      <tr key={rowKey} className="group hover:bg-slate-50/70 transition-colors">
                        {/* NO */}
                        <td className="py-2 sm:py-3.5 px-1 sm:px-2 md:px-4 w-8 sm:w-10 md:w-12 min-w-[32px] sm:min-w-[40px] md:min-w-[48px] max-w-[32px] sm:max-w-[40px] md:max-w-[48px] text-center font-bold text-slate-400 sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 text-[10px] sm:text-xs">
                          {idx + 1}
                        </td>

                        {/* NAMA PESERTA (with Avatar Circle) */}
                        <td className="py-2 sm:py-3.5 px-2 sm:px-3 md:px-4 min-w-[125px] sm:min-w-[170px] md:min-w-[200px] sticky left-[32px] sm:left-[40px] md:left-[48px] z-10 bg-white group-hover:bg-slate-50/90 border-r border-slate-200/80 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)]">
                          <div className="flex items-center space-x-2 sm:space-x-2.5">
                            <div 
                              onClick={() => setPreviewPhotoUser(p)}
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] sm:text-xs shrink-0 border border-emerald-200 shadow-xs overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                              title="Klik untuk melihat foto profil"
                            >
                              <span>{initialLetter}</span>
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
                              <div className="font-bold text-slate-900 leading-tight group-hover/name:text-emerald-700 transition-colors truncate text-[11px] sm:text-xs md:text-sm max-w-[95px] sm:max-w-[160px] md:max-w-none">{p.name}</div>
                              <div className="text-[9px] sm:text-[11px] text-slate-400 truncate max-w-[95px] sm:max-w-[160px] md:max-w-none">{p.email || p.instansi || '-'}</div>
                            </div>
                          </div>
                        </td>

                        {/* KELAS */}
                        <td className="py-3.5 px-4">
                          {!classInfo.isGeneral ? (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                              <GraduationCap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="truncate max-w-[130px]" title={classInfo.name}>{classInfo.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Kelas Umum</span>
                            </span>
                          )}
                        </td>

                        {/* ASAL KOMISARIAT */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {p.instansi || 'HMI Komisariat'}
                        </td>

                        {/* SCORE AKHIR */}
                        <td className="py-3.5 px-4 text-center">
                          {sub ? (
                            <div className="inline-flex flex-col items-center">
                              <span className={`font-extrabold text-sm ${isPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {sub.score}
                              </span>
                              {sub.isCorrected && (
                                <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                                  Dikoreksi
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>

                        {/* WAKTU SUBMIT */}
                        <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                          {sub ? (
                            <span>{sub.submittedAt}</span>
                          ) : (
                            <span className="text-slate-300 font-sans italic">Belum Submit</span>
                          )}
                        </td>

                        {/* STATUS PENILAIAN */}
                        <td className="py-3.5 px-4 text-center">
                          {sub ? (
                            isPassed ? (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-emerald-200 text-emerald-800 font-bold text-xs bg-emerald-50 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Lulus (Baik)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-rose-300 text-rose-700 font-bold text-xs bg-rose-50/50">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Tidak Lulus</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-400 font-medium text-[11px] bg-slate-50">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Belum Mengerjakan</span>
                            </span>
                          )}
                        </td>

                        {/* AKSI (Menu Titik Tiga dengan penempatan sejajar & teks rata kiri) */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleActionMenu(e, p, sub)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                              activeActionMenu?.key === rowKey
                                ? 'bg-slate-100 text-slate-900 border-slate-300'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent hover:border-slate-200'
                            }`}
                            title="Pilihan Aksi"
                            aria-label="Pilihan Aksi"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
            <div>
              Menampilkan {filteredRows.length} dari {combinedParticipants.length} peserta
            </div>
            <div className="font-semibold text-slate-400 text-[11px]">
              PresenTrain System
            </div>
          </div>
        </div>

      </div>

      {/* FLOATING ACTION MENU PORTAL (TOP LAYER DI ATAS TABEL TANPA CLIPPING) */}
      {activeActionMenu && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-transparent cursor-default" 
            onClick={() => setActiveActionMenu(null)} 
          />
          <div 
            style={{
              position: 'fixed',
              top: `${activeActionMenu.top}px`,
              right: `${activeActionMenu.right}px`,
            }}
            className="w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Aksi Penilaian</p>
              <p className="text-xs font-semibold text-slate-800 truncate text-left">{activeActionMenu.participant.name}</p>
              <p className="text-[10px] text-emerald-700 font-medium truncate text-left mt-0.5">
                {getParticipantClass(activeActionMenu.participant).name}
              </p>
            </div>

            {/* Koreksi / Berikan Nilai */}
            <button
              type="button"
              onClick={() => {
                const { participant, submission } = activeActionMenu;
                setActiveActionMenu(null);
                handleOpenGradePage(participant, submission);
              }}
              className="w-full px-3.5 py-2.5 flex items-center space-x-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer text-left group"
            >
              <Pencil className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left">
                <div className="font-bold text-slate-800 group-hover:text-emerald-800 text-left">
                  {activeActionMenu.submission ? 'Koreksi Nilai' : 'Beri Nilai Langsung'}
                </div>
                <div className="text-[10px] text-slate-400 font-normal text-left">
                  {activeActionMenu.submission ? 'Periksa & sunting lembar nilai' : 'Input nilai peserta belum submit'}
                </div>
              </div>
            </button>

            {/* Lihat Jawaban */}
            <button
              type="button"
              onClick={() => {
                const { participant, submission } = activeActionMenu;
                setActiveActionMenu(null);
                handleOpenViewPage(participant, submission);
              }}
              className="w-full px-3.5 py-2.5 flex items-center space-x-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer text-left group"
            >
              <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left">
                <div className="font-bold text-slate-800 group-hover:text-emerald-800 text-left">Lihat Jawaban</div>
                <div className="text-[10px] text-slate-400 font-normal text-left">Rincian lembar kuis</div>
              </div>
            </button>

            {/* Kembalikan ke Nilai Asli (jika submission pernah dikoreksi) */}
            {activeActionMenu.submission && activeActionMenu.submission.isCorrected && (
              <div className="border-t border-slate-100 mt-1 pt-1 text-left">
                <button
                  type="button"
                  onClick={async () => {
                    const { submission } = activeActionMenu;
                    setActiveActionMenu(null);
                    const subId = submission.db_id || submission.id;
                    if (confirm(`Kembalikan nilai ke skor asli sebelum koreksi (${submission.originalScore ?? submission.original_score ?? '-'})?`)) {
                      try {
                        const res = await api.revertQuizScore(subId);
                        if (res && res.ok) {
                          if (showNotification) showNotification('Nilai berhasil dikembalikan ke nilai awal pengerjaan peserta.');
                          if (typeof onRefresh === 'function') await onRefresh();
                        } else {
                          alert(res?.error || 'Gagal mengembalikan nilai.');
                        }
                      } catch (e) {
                        console.warn(e);
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2 flex items-center space-x-2.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer text-left"
                >
                  <Undo2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-left">Kembalikan ke Nilai Asli</span>
                </button>
              </div>
            )}

            {/* Reset Nilai / Ujian (HANYA ADMIN UTAMA) */}
            {activeActionMenu.submission && isSuperAdmin && (
              <div className="border-t border-slate-100 mt-1 pt-1 text-left">
                <button
                  type="button"
                  onClick={async () => {
                    const { participant, submission } = activeActionMenu;
                    setActiveActionMenu(null);
                    const subId = submission.db_id || submission.id;
                    if (window.confirm(`Reset hasil kuis untuk peserta "${participant.name}"?\n\nNilai dan seluruh jawaban akan dihapus dari sistem, dan peserta dapat langsung login untuk mengerjakan kuis ini kembali dari awal.`)) {
                      try {
                        let res;
                        if (typeof onResetSubmission === 'function') {
                          res = await onResetSubmission(submission, participant);
                        } else {
                          res = await api.deleteQuizSubmission(subId);
                        }
                        if (res && (res.ok || res.status === 'success' || !res.error)) {
                          if (showNotification) {
                            showNotification(`Hasil kuis untuk peserta "${participant.name}" berhasil di-reset. Peserta dapat mengerjakan ulang.`);
                          }
                          if (typeof onRefresh === 'function') {
                            await onRefresh();
                          }
                        } else {
                          alert(res?.error || res?.message || 'Gagal me-reset lembar kuis.');
                        }
                      } catch (err) {
                        console.error('Reset submission error:', err);
                        alert(err?.message || 'Terjadi kesalahan saat me-reset kuis.');
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center space-x-2.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer text-left group"
                >
                  <RotateCcw className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold text-rose-600 group-hover:text-rose-800 text-left">Reset Ujian Peserta</div>
                    <div className="text-[10px] text-slate-400 font-normal text-left">Hapus nilai & beri ujian ulang</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Preview Foto Profil Peserta */}
      {previewPhotoUser && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhotoUser(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
              {previewPhotoUser.avatar ? (
                <img 
                  src={previewPhotoUser.avatar} 
                  alt={previewPhotoUser.name} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div 
                className={`w-full h-full flex flex-col items-center justify-center text-emerald-800 bg-emerald-50 ${previewPhotoUser.avatar ? 'hidden' : 'flex'}`}
              >
                <div className="w-24 h-24 rounded-full bg-emerald-200 text-emerald-800 font-black text-4xl flex items-center justify-center border-4 border-white shadow-inner">
                  {previewPhotoUser.name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
                <span className="text-xs text-slate-400 font-semibold mt-3">Tidak ada foto profil</span>
              </div>

              <button
                type="button"
                onClick={() => setPreviewPhotoUser(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all cursor-pointer z-10"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 bg-white space-y-2 text-center">
              <h3 className="text-base font-bold text-slate-900 leading-snug">{previewPhotoUser.name}</h3>
              <div className="flex items-center justify-center space-x-2 text-xs">
                <span className="text-slate-500 font-medium">{previewPhotoUser.instansi || 'Peserta'}</span>
                <span className="text-slate-300">&bull;</span>
                <span className="font-bold text-emerald-700">{getParticipantClass(previewPhotoUser).name}</span>
              </div>
              {previewPhotoUser.email && (
                <p className="text-[11px] text-slate-400 font-mono">{previewPhotoUser.email}</p>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewPhotoUser(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// =========================================================================
// SUB-VIEW 1: FULL-PAGE LIHAT JAWABAN (UKURAN FULL SESUAI PRESTREAM)
// =========================================================================
function FullPageAnswerSheetView({ quiz, participant, submission, onBack, onOpenGrade }) {
  const questions = quiz.questions || [];
  const userAnswers = submission?.answers || {};
  const isPassed = submission && Number(submission.score) >= Number(quiz.passingGrade || 70);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 text-slate-800 animate-in fade-in duration-150 w-full">
      
      {/* Top Sticky Navbar (Full Width) */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-4 sm:px-6 md:px-8 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center space-x-3 truncate mr-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Kembali ke Rekap Nilai"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="truncate">
            <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 leading-tight truncate">
              Lembar Jawaban: {participant?.name}
            </h1>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {quiz.title} &bull; {participant?.className || participant?.instansi || 'HMI'}
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer hidden sm:block"
          >
            Kembali
          </button>

          <button
            type="button"
            onClick={onOpenGrade}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{submission ? 'Koreksi Lembar Ini' : 'Beri Nilai Peserta Ini'}</span>
          </button>
        </div>
      </div>

      {/* Main Container (Full Size: max-w-7xl) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">

        {/* Summary Banner Card */}
        {submission ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Score Akhir</div>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${isPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                {submission.score} <span className="text-xs text-slate-400 font-medium">/ 100</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Lulus</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">
                &ge; {quiz.passingGrade || 70}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Predikat Status</div>
              <div className="mt-2">
                {isPassed ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lulus (Baik)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tidak Lulus</span>
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Waktu Submit</div>
              <div className="text-xs font-medium text-slate-600 mt-2 font-mono">
                {submission.submittedAt || '-'}
              </div>
            </div>

            {/* Status Integritas Pengerjaan */}
            {(() => {
              const tabCount = Number(submission.tabViolations || 0);
              const reason = String(submission.submitReason || '').toLowerCase();
              const isViolation = reason === 'tab_violation' || reason === 'reload_violation' || reason.includes('violation') || tabCount >= 3;
              const isTimeOut = reason === 'time_out';

              return (
                <div className="col-span-2 sm:col-span-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-left">
                  {isViolation ? (
                    <div className="flex items-center space-x-2 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        {reason === 'reload_violation'
                          ? 'Diserahkan Karena Pelanggaran: Refresh / Muat Ulang Halaman Saat Ujian'
                          : `Diserahkan Karena Pelanggaran: Batas Pindah Tab Terlampaui (${tabCount >= 3 ? `${tabCount}x Pelanggaran` : '3x Pelanggaran'})`}
                      </span>
                    </div>
                  ) : isTimeOut ? (
                    <div className="flex items-center space-x-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-semibold">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Diserahkan Otomatis: Waktu Ujian Telah Habis</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Diserahkan Normal oleh Peserta</span>
                    </div>
                  )}

                  {isViolation ? (
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2.5 py-1 rounded-lg border border-rose-200">
                      Terdeteksi {tabCount > 0 ? `${tabCount}x pelanggaran tab / reload` : 'Pelanggaran Integritas Ujian'}
                    </span>
                  ) : tabCount > 0 ? (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      Terdeteksi {tabCount}x percobaan beralih tab saat ujian
                    </span>
                  ) : null}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-2.5">
            <Clock className="w-10 h-10 text-amber-500 mx-auto" />
            <h4 className="font-bold text-amber-900 text-base">Peserta Belum Mengerjakan Kuis Online</h4>
            <p className="text-xs text-amber-700 max-w-lg mx-auto">
              Peserta ini belum mengumpulkan lembar jawaban kuis online. Jika penilaian dilakukan secara luring/offline, Anda dapat langsung menginput nilai melalui tombol "Koreksi Lembar Ini".
            </p>
          </div>
        )}

        {/* Catatan Evaluator / Admin (Jika Ada) */}
        {submission?.adminNotes && (
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-1.5">
            <div className="font-bold flex items-center space-x-1.5 text-sky-800">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Catatan Koreksi & Evaluasi:</span>
            </div>
            <p className="leading-relaxed text-slate-700 text-sm whitespace-pre-wrap">{submission.adminNotes}</p>
          </div>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between pt-2">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base uppercase tracking-wide flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <span>Rincian Soal & Jawaban ({questions.length} Butir Soal)</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2.5 py-1 rounded-lg">
            Tipe: {quiz.type === 'pretest' ? 'Pre-Test' : (quiz.type === 'midtest' || quiz.type === 'evaluasi' ? 'Mid-Test' : 'Post-Test')}
          </span>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            Tidak ada butir soal yang terdaftar pada kuis ini.
          </div>
        ) : (
          questions.map((q, idx) => {
            const answer = getAnswerForQuestion(userAnswers, q, idx);
            const weight = Number(q.scoreWeight || q.score_weight || Math.round(100 / (questions.length || 1)));
            const correctAnswer = q.correctAnswer || q.correct_answer || '';
            const qScore = (submission?.questionScores && (
              submission.questionScores[q.id] !== undefined ? submission.questionScores[q.id] :
              (q.db_id && submission.questionScores[q.db_id] !== undefined ? submission.questionScores[q.db_id] :
              (submission.questionScores[String(q.id)] !== undefined ? submission.questionScores[String(q.id)] : 
              (q.question_code && submission.questionScores[q.question_code] !== undefined ? submission.questionScores[q.question_code] : undefined)))
            ));

            const isMCQ = q.type === 'multiple_choice' || !q.type;
            const isCorrect = isMCQ && isAnswerMatch(answer, correctAnswer, q.options);
            const awardedScore = (submission?.isCorrected && qScore !== undefined)
              ? Number(qScore)
              : (isMCQ
                  ? (isCorrect ? weight : 0)
                  : ((answer && String(answer).trim()) ? (qScore !== undefined ? Number(qScore) : weight) : 0));

            const questionTitle = q.text || q.question || q.title || `Pertanyaan Soal Nomor ${idx + 1}`;

            return (
              <div key={q.id || idx} className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                      {isMCQ ? 'Pilihan Ganda' : 'Essay'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Bobot Maksimal: {weight} Poin
                    </span>
                  </div>
                  
                  {/* Score Awarded Badge */}
                  <div className="shrink-0">
                    {isMCQ ? (
                      isCorrect ? (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{awardedScore} / {weight} Poin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{awardedScore} / {weight} Poin</span>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        <span>{awardedScore} / {weight} Poin</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Statement (Teks Pertanyaan Soal) */}
                <div className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  {questionTitle}
                </div>

                {/* Multiple Choice Answers Layout */}
                {isMCQ && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, optIdx) => {
                      const isUserChoice = isAnswerMatch(answer, opt, [opt]);
                      const isAnswerKey = isAnswerMatch(correctAnswer, opt, [opt]);

                      let rowClass = "p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition-colors ";
                      if (isUserChoice && isAnswerKey) {
                        rowClass += "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs";
                      } else if (isUserChoice && !isAnswerKey) {
                        rowClass += "bg-rose-50 border-rose-300 text-rose-950 font-bold shadow-2xs";
                      } else if (isAnswerKey) {
                        rowClass += "bg-emerald-50/50 border-emerald-200 text-emerald-900 font-semibold";
                      } else {
                        rowClass += "bg-slate-50/70 border-slate-200 text-slate-600";
                      }

                      // Jika opt sudah diawali "A. ", tampilkan teks aslinya secara bersih tanpa kotak badge ganda
                      const hasPrefix = /^[A-Za-z0-9][\.\)\-\:]\s*/.test(opt);

                      return (
                        <div key={optIdx} className={rowClass}>
                          <div className="flex items-center space-x-3">
                            {!hasPrefix && (
                              <span className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs bg-white border border-slate-200 text-slate-700 shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                            )}
                            <span className="leading-snug">{opt}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0 text-xs">
                            {isUserChoice && (
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${isAnswerKey ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                Pilihan Peserta
                              </span>
                            )}
                            {isAnswerKey && !isUserChoice && (
                              <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Kunci Jawaban
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Essay Answer Layout */}
                {!isMCQ && (
                  <div className="space-y-3 pt-1">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Jawaban Teks Peserta:
                      </div>
                      {answer ? (
                        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-mono text-xs sm:text-sm">
                          {answer}
                        </p>
                      ) : (
                        <span className="text-slate-400 italic">Peserta tidak mengisi respon jawaban.</span>
                      )}
                    </div>

                    {q.correctAnswer && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs sm:text-sm">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                          Kunci / Rubrik Penilaian Jawaban:
                        </div>
                        <p className="text-emerald-950 whitespace-pre-wrap leading-relaxed">
                          {q.correctAnswer}
                        </p>
                      </div>
                    )}

                    {submission?.questionFeedbacks?.[q.id] && (
                      <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
                        <strong>Catatan Korektor:</strong> {submission.questionFeedbacks[q.id]}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}

      </div>
    </div>
  );
}

// =========================================================================
// SUB-VIEW 2: FULL-PAGE KOREKSI JAWABAN & NILAI (WARNA HIJAU & UKURAN FULL)
// =========================================================================
function FullPageGradingView({ quiz, participant, submission, onBack, onSaveGrade }) {
  const questions = quiz.questions || [];
  const defaultWeight = Math.round(100 / (questions.length || 1));

  // Initialize scores per question
  const [questionScores, setQuestionScores] = useState(() => {
    const scores = {};
    questions.forEach((q, idx) => {
      const weight = Number(q.scoreWeight || q.score_weight || defaultWeight);
      const userAns = getAnswerForQuestion(submission?.answers, q, idx);
      const correctAnswer = q.correctAnswer || q.correct_answer || '';
      
      const qScore = (submission?.questionScores && (
        submission.questionScores[q.id] !== undefined ? submission.questionScores[q.id] :
        (q.db_id && submission.questionScores[q.db_id] !== undefined ? submission.questionScores[q.db_id] :
        (submission.questionScores[String(q.id)] !== undefined ? submission.questionScores[String(q.id)] : 
        (q.question_code && submission.questionScores[q.question_code] !== undefined ? submission.questionScores[q.question_code] : undefined)))
      ));

      if (q.type === 'multiple_choice' || !q.type) {
        const isMatch = isAnswerMatch(userAns, correctAnswer, q.options);
        if (submission?.isCorrected && qScore !== undefined) {
          scores[q.id] = Number(qScore);
        } else {
          scores[q.id] = isMatch ? weight : 0;
        }
      } else {
        // Essay
        if (submission?.isCorrected && qScore !== undefined) {
          scores[q.id] = Number(qScore);
        } else {
          scores[q.id] = (userAns && String(userAns).trim().length > 5) ? (qScore !== undefined ? Number(qScore) : weight) : 0;
        }
      }
    });
    return scores;
  });

  // Per-question evaluator feedback notes
  const [questionFeedbacks, setQuestionFeedbacks] = useState(() => {
    return submission?.questionFeedbacks || {};
  });

  // Overall admin feedback
  const [adminNotes, setAdminNotes] = useState(() => {
    return submission?.adminNotes || '';
  });

  // Option to override total score directly
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [manualTotalScore, setManualTotalScore] = useState(() => {
    if (submission && submission.score !== undefined && submission.score !== null) {
      return Number(submission.score);
    }
    return 0;
  });

  const [isSaving, setIsSaving] = useState(false);

  // Auto-calculated score from questions
  const calculatedSumScore = useMemo(() => {
    let sum = 0;
    questions.forEach((q) => {
      sum += Number(questionScores[q.id] || 0);
    });
    return Math.min(100, Math.max(0, sum));
  }, [questionScores, questions]);

  const activeTotalScore = isManualOverride ? manualTotalScore : calculatedSumScore;
  const isPassed = activeTotalScore >= Number(quiz.passingGrade || 70);

  // Handle setting individual question score
  const handleScoreChange = (qId, val, maxWeight) => {
    const num = Math.min(maxWeight, Math.max(0, Number(val) || 0));
    setQuestionScores(prev => ({
      ...prev,
      [qId]: num
    }));
  };

  // Submit and save correction
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const nowTime = new Date().toLocaleDateString('id-ID') + ' ' + 
                      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

      const cleanParticipantId = participant?.id || participant?.db_id || participant?.user_id;
      const parsedUserId = participant?.db_id || (participant?.user_id ? Number(participant.user_id) : (participant?.id ? Number(String(participant.id).replace(/\D/g, '')) : null));
      const finalUserId = (parsedUserId && !isNaN(parsedUserId)) ? parsedUserId : (submission?.user_id || submission?.userId || null);

      const targetId = submission?.db_id || submission?.id || `SUB-MANUAL-${cleanParticipantId || Date.now().toString().slice(-5)}`;

      const updatedSubmission = {
        ...(submission || {}),
        id: targetId,
        submission_code: submission?.submission_code || submission?.id || targetId,
        quizId: quiz.id,
        quiz_id: quiz.id,
        user_id: finalUserId,
        userId: finalUserId,
        participantId: cleanParticipantId,
        participant_id: cleanParticipantId,
        participantName: participant?.name || submission?.participantName || 'Peserta',
        participant_name: participant?.name || submission?.participant_name || 'Peserta',
        participantEmail: participant?.email || submission?.participantEmail || '',
        participant_email: participant?.email || submission?.participant_email || '',
        score: activeTotalScore,
        answers: submission?.answers || {},
        submittedAt: submission?.submittedAt || nowTime,
        submitted_at: submission?.submitted_at || new Date().toISOString(),
        submitReason: submission?.submitReason || 'manual_entry',
        submit_reason: submission?.submit_reason || 'manual_entry',
        isLocked: true,
        is_locked: true,
        isCorrected: true,
        is_corrected: true,
        correctedAt: nowTime,
        correctedBy: 'Administrator Panitia',
        questionScores,
        questionFeedbacks,
        adminNotes
      };

      if (typeof onSaveGrade === 'function') {
        await onSaveGrade(updatedSubmission);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32 text-slate-800 animate-in fade-in duration-150 w-full">
      
      {/* Top Sticky Navbar (Full Width) */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-4 sm:px-6 md:px-8 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center space-x-3 truncate mr-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Kembali ke Rekap Nilai"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="truncate">
            <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 leading-tight truncate">
              {submission ? 'Koreksi Jawaban & Nilai: ' : 'Penilaian Langsung & Koreksi: '}{participant?.name}
            </h1>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {quiz.title} &bull; {participant?.className ? `${participant.className} \u2022 ` : ''}Passing Grade: {quiz.passingGrade || 70} Poin
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 sm:px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-all ${
              isSaving 
                ? 'bg-emerald-400 cursor-not-allowed opacity-80' 
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Koreksi</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container (Full Size: max-w-7xl) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">

        {/* Live Score Dashboard Banner (Warna Hijau Emerald PresenTrain - Bukan Hitam) */}
        <div className="bg-emerald-800 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-emerald-700 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-5">
            <div>
              <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                Skor Hasil Koreksi
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white flex items-baseline space-x-1.5 mt-0.5">
                <span>{activeTotalScore}</span>
                <span className="text-sm font-semibold text-emerald-200">/ 100</span>
              </div>
            </div>

            <div className="h-10 w-px bg-emerald-700" />

            <div>
              <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                Predikat Status
              </div>
              <div className="mt-1">
                {isPassed ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-emerald-900 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Lulus (Baik)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-2xs">
                    <XCircle className="w-3.5 h-3.5 text-white" />
                    <span>Tidak Lulus</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center space-x-2 bg-emerald-900/80 p-1.5 rounded-xl border border-emerald-700">
            <button
              type="button"
              onClick={() => setIsManualOverride(false)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isManualOverride ? 'bg-emerald-500 text-white shadow-xs' : 'text-emerald-200 hover:text-white'
              }`}
            >
              Hitung Otomatis
            </button>
            <button
              type="button"
              onClick={() => setIsManualOverride(true)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isManualOverride ? 'bg-emerald-500 text-white shadow-xs' : 'text-emerald-200 hover:text-white'
              }`}
            >
              Override Manual
            </button>
          </div>
        </div>

        {/* Manual Override Input if enabled */}
        {isManualOverride && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs sm:text-sm">
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              <span>Mode Override Nilai Akhir Langsung Aktif</span>
            </div>
            <p className="text-xs text-amber-700">
              Skor akhir kuis ini akan diatur langsung sesuai angka di bawah, tanpa menjumlahkan skor tiap butir soal:
            </p>
            <div className="flex items-center space-x-3 pt-1">
              <input
                type="number"
                min="0"
                max="100"
                value={manualTotalScore}
                onChange={(e) => setManualTotalScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="w-28 px-3.5 py-2 bg-white rounded-xl border border-amber-300 font-bold text-xl text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-500 font-semibold">Poin (Skala 0 - 100)</span>
            </div>
          </div>
        )}

        {/* Info Banner Khusus untuk Peserta yang Belum Mengerjakan Online */}
        {!submission && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-start space-x-3.5 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                Peserta Ini Belum Mengumpulkan Kuis Secara Online
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Anda sedang memberikan nilai secara langsung untuk peserta ini (misalnya hasil ujian kertas/luring atau penilaian khusus). 
                Anda dapat menentukan skor per butir soal di bawah atau menggunakan tombol <strong>"Override Manual"</strong> di banner atas untuk langsung menentukan skor akhir kuis (0 - 100).
              </p>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between pt-1">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base uppercase tracking-wide">
            Lembar Per Butir Soal ({questions.length} Soal)
          </h3>
          <span className="text-xs text-slate-500">
            Sesuaikan perolehan poin per nomor di bawah ini
          </span>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            Tidak ada butir soal yang terdaftar pada kuis ini.
          </div>
        ) : (
          questions.map((q, idx) => {
            const weight = q.scoreWeight || defaultWeight;
            const userAns = getAnswerForQuestion(submission?.answers, q, idx);
            const currentScore = questionScores[q.id] !== undefined ? questionScores[q.id] : 0;
            const isMCQ = q.type === 'multiple_choice';
            const questionTitle = q.text || q.question || q.title || `Pertanyaan Soal Nomor ${idx + 1}`;

            return (
              <div key={q.id || idx} className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                      {isMCQ ? 'Pilihan Ganda' : 'Essay'}
                    </span>
                    <span className="text-xs text-slate-500">
                      Maksimal: {weight} Poin
                    </span>
                  </div>

                  {/* Score Controls */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {isMCQ && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleScoreChange(q.id, weight, weight)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            currentScore === weight
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Benar ({weight})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScoreChange(q.id, 0, weight)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            currentScore === 0
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Salah (0)
                        </button>
                      </>
                    )}

                    <div className="flex items-center space-x-1 pl-1">
                      <input
                        type="number"
                        min="0"
                        max={weight}
                        value={currentScore}
                        onChange={(e) => handleScoreChange(q.id, e.target.value, weight)}
                        className="w-16 px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-300 font-bold text-center text-xs text-slate-800 outline-none focus:border-emerald-600 focus:bg-white"
                      />
                      <span className="text-xs text-slate-400 font-medium">/{weight}</span>
                    </div>
                  </div>
                </div>

                {/* Question Statement (Teks Pertanyaan Soal Tampil Jelas) */}
                <div className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  {questionTitle}
                </div>

                {/* MCQ Options Display */}
                {isMCQ ? (
                  <div className="space-y-2 pt-1">
                    {/* List Pilihan Opsi A, B, C, D */}
                    {q.options && q.options.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {q.options.map((opt, optIdx) => {
                          const correctAnswer = q.correctAnswer || q.correct_answer || '';
                          const isUserChoice = isAnswerMatch(userAns, opt, [opt]);
                          const isAnswerKey = isAnswerMatch(correctAnswer, opt, [opt]);

                          let rowClass = "p-2.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition-colors ";
                          if (isUserChoice && isAnswerKey) {
                            rowClass += "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs";
                          } else if (isUserChoice && !isAnswerKey) {
                            rowClass += "bg-rose-50 border-rose-300 text-rose-950 font-bold shadow-2xs";
                          } else if (isAnswerKey) {
                            rowClass += "bg-emerald-50/50 border-emerald-200 text-emerald-900 font-semibold";
                          } else {
                            rowClass += "bg-slate-50/70 border-slate-200 text-slate-600";
                          }

                          // Jika opt sudah diawali "A. ", tampilkan teks aslinya secara bersih tanpa kotak badge ganda
                          const hasPrefix = /^[A-Za-z0-9][\.\)\-\:]\s*/.test(opt);

                          return (
                            <div key={optIdx} className={rowClass}>
                              <div className="flex items-center space-x-3">
                                {!hasPrefix && (
                                  <span className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs bg-white border border-slate-200 text-slate-700 shrink-0">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                )}
                                <span className="leading-snug">{opt}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0 text-xs">
                                {isUserChoice && (
                                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${isAnswerKey ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                    Pilihan Peserta
                                  </span>
                                )}
                                {isAnswerKey && !isUserChoice && (
                                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Kunci Jawaban
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-slate-700">
                        <strong>Jawaban Peserta:</strong> {userAns || <span className="text-slate-400 italic">Tidak menjawab</span>}
                      </span>
                      <span className="text-slate-700">
                        <strong>Kunci Jawaban:</strong> <span className="text-emerald-700 font-bold">{q.correctAnswer || q.correct_answer || '-'}</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Essay Answer Display */
                  <div className="space-y-3 pt-1">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Jawaban Teks Peserta:
                      </div>
                      {userAns ? (
                        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-mono text-xs sm:text-sm">
                          {userAns}
                        </p>
                      ) : (
                        <span className="text-slate-400 italic">Tidak ada respon jawaban teks.</span>
                      )}
                    </div>

                    {q.correctAnswer && (
                      <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs sm:text-sm text-emerald-900">
                        <strong>Rubrik Jawaban:</strong> {q.correctAnswer}
                      </div>
                    )}

                    {/* Feedback per question */}
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Catatan / Feedback koreksi butir ini (opsional)..."
                        value={questionFeedbacks[q.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestionFeedbacks(prev => ({ ...prev, [q.id]: val }));
                        }}
                        className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 outline-none focus:border-emerald-600 focus:bg-white placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}

        {/* General Evaluation Note Card */}
        <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white space-y-2.5">
          <label className="block text-xs sm:text-sm font-bold text-slate-700">
            Catatan Umum Evaluasi Panitia untuk Peserta Ini (Opsional)
          </label>
          <textarea
            rows={3}
            placeholder="Tuliskan catatan evaluasi kuis secara keseluruhan..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 outline-none focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 resize-none"
          />
        </div>

      </div>

      {/* Floating Bottom Sticky Bar (Full Width: max-w-7xl) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 sm:px-6 md:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Skor Terhitung:</span>
            <span className="text-base font-black text-slate-900">{activeTotalScore} Poin</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {isPassed ? 'Lulus' : 'Tidak Lulus'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-xs ${
                isSaving 
                  ? 'bg-emerald-400 cursor-not-allowed opacity-80' 
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 cursor-pointer'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Hasil Koreksi...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Hasil Koreksi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
