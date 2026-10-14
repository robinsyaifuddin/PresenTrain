import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Plus, Search, Users, ShieldCheck, MoreVertical, 
  Edit, Trash2, CheckCircle2, X, ArrowLeft, UserPlus, Filter, FileText,
  BarChart3, Check, Calendar, Award, BookOpen, Layers, CheckCircle, RefreshCw,
  Clock, AlertCircle, HelpCircle, Download, FileSpreadsheet, XCircle
} from 'lucide-react';
import { api } from '@/services/api';
import { calculateAssessment } from '@/data/mockData';
import { isSubmissionForParticipant, isSubmissionForQuiz } from '@/features/administrator/components/QuizResultsView';
import RekapDataView from './RekapDataView';

export default function ClassesManagementView({ 
  participants = [],
  adminList = [], 
  training, 
  assessments, 
  quizzes: propQuizzes = [], 
  quizSubmissions: propQuizSubmissions = [], 
  onNotification 
}) {
  const [internalQuizzes, setInternalQuizzes] = useState([]);
  const [internalSubmissions, setInternalSubmissions] = useState([]);

  const quizzes = (propQuizzes && propQuizzes.length > 0) ? propQuizzes : internalQuizzes;
  const quizSubmissions = (propQuizSubmissions && propQuizSubmissions.length > 0) ? propQuizSubmissions : internalSubmissions;

  const [classes, setClasses] = useState([]);
  const [generalCount, setGeneralCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuizFilter, setSelectedQuizFilter] = useState('ALL');

  const [openMenuClassId, setOpenMenuClassId] = useState(null);

  // Form Modal: Tambah / Edit Kelas (Hanya Nama Kelas)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [className, setClassName] = useState('');

  // Modal: Kelola Administrator Kelas
  const [assignAdminsModalClass, setAssignAdminsModalClass] = useState(null);
  const [selectedAdminIds, setSelectedAdminIds] = useState([]);
  const [adminPermissions, setAdminPermissions] = useState({});

  // View: Detail Kelas
  const [detailClass, setDetailClass] = useState(null);
  const [classDetailData, setClassDetailData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState('participants'); // 'participants' | 'admins' | 'recap'
  const [isRekapViewOpen, setIsRekapViewOpen] = useState(false);

  // Sub-filter di dalam detail kelas
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedParticipantForGrading, setSelectedParticipantForGrading] = useState(null);

  // Helper verifikasi presensi per sesi peserta
  const checkSessionAttendance = (p, s) => {
    if (!p || !s) return null;
    const atts = p.attendances;
    if (!atts) return null;

    if (Array.isArray(atts)) {
      const found = atts.find(a => 
        (s.db_id && String(a.training_session_id) === String(s.db_id)) ||
        (s.id && (a.session_code === s.id || String(a.training_session_id) === String(s.id))) ||
        (a.training_session_id === s.id) ||
        (s.session_code && a.session_code === s.session_code) ||
        (s.id && typeof s.id === 'string' && String(a.training_session_id) === s.id.replace(/\D/g, ''))
      );
      if (found) {
        const rawStatus = (found.raw_status || found.status || '').toLowerCase();
        const isPresent = found.present === true || rawStatus === 'present' || rawStatus === 'hadir';
        const isExcuse = !isPresent && (rawStatus === 'permission' || rawStatus === 'izin' || rawStatus === 'sakit' || rawStatus === 'excused' || found.excuse === true);
        const isAbsent = !isPresent && !isExcuse && (rawStatus === 'absent' || rawStatus === 'tidak hadir' || rawStatus === 'alpa');
        return {
          present: isPresent,
          excuse: isExcuse,
          absent: isAbsent,
          status: isPresent ? 'Hadir' : (isExcuse ? 'Izin' : (isAbsent ? 'Tidak Hadir' : found.status)),
          note: found.note,
          time: found.time || (found.scanned_at ? (typeof found.scanned_at === 'string' ? found.scanned_at : '') : null)
        };
      }
      return null;
    }

    const record = atts[s.id] || 
      (s.db_id && atts[s.db_id]) || 
      (typeof s.id === 'string' && atts[s.id.replace(/\D/g, '')]) ||
      (s.session_code && atts[s.session_code]) ||
      (s.db_id && atts[`SES-${s.db_id}`]) ||
      (s.db_id && atts[`SES-${String(s.db_id).padStart(2, '0')}`]);

    if (record) {
      const rawStatus = (record.raw_status || record.status || '').toLowerCase();
      const isPresent = record.present === true || rawStatus === 'present' || rawStatus === 'hadir';
      const isExcuse = !isPresent && (rawStatus === 'permission' || rawStatus === 'izin' || rawStatus === 'sakit' || rawStatus === 'excused' || record.excuse === true);
      const isAbsent = !isPresent && !isExcuse && (rawStatus === 'absent' || rawStatus === 'tidak hadir' || rawStatus === 'alpa');
      return {
        present: isPresent,
        excuse: isExcuse,
        absent: isAbsent,
        status: isPresent ? 'Hadir' : (isExcuse ? 'Izin' : (isAbsent ? 'Tidak Hadir' : record.status)),
        note: record.note,
        time: record.time || record.scanned_at
      };
    }
    return null;
  };

  // Tutup menu dropdown titik 3 saat klik di luar
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.class-action-menu')) {
        setOpenMenuClassId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Tutup modal aktif dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isClassModalOpen) { setIsClassModalOpen(false); return; }
        if (assignAdminsModalClass) { setAssignAdminsModalClass(null); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClassModalOpen, assignAdminsModalClass]);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const res = await api.getClasses();
      if (res && res.ok && Array.isArray(res.data)) {
        setClasses(res.data);
        setGeneralCount(res.meta?.general_participants_count || 0);
      }
    } catch (err) {
      console.warn('Gagal memuat kelas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuizData = async () => {
    try {
      const [qRes, sRes] = await Promise.all([
        api.getQuizzes(),
        api.getQuizSubmissions()
      ]);
      if (qRes && qRes.ok && Array.isArray(qRes.data)) {
        setInternalQuizzes(qRes.data);
      }
      if (sRes && sRes.ok && Array.isArray(sRes.data)) {
        setInternalSubmissions(sRes.data);
      }
    } catch (e) {
      console.warn('Failed to load quiz data in ClassesManagementView:', e);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchQuizData();
  }, []);

  useEffect(() => {
    if (detailTab === 'quizzes') {
      fetchQuizData();
    }
  }, [detailTab]);

  // Tangkap event saat pengguna memilih kelas di Dropdown TopBar
  useEffect(() => {
    const handleOpenClassEvent = (e) => {
      const targetClassId = e.detail?.classId;
      if (!targetClassId || targetClassId === 'ALL') {
        setDetailClass(null);
        setClassDetailData(null);
        return;
      }

      if (targetClassId === 'general') {
        handleOpenDetail({
          id: 'general',
          name: 'Kelas Umum (Default)',
          is_general: true,
          status: 'Aktif'
        });
        return;
      }

      // Cari kelas di state atau fetch langsung
      const matched = classes.find(c => String(c.id) === String(targetClassId));
      if (matched) {
        handleOpenDetail(matched);
      } else {
        // Fallback panggil getClass langsung dengan targetId
        handleOpenDetail({
          id: targetClassId,
          name: `Kelas #${targetClassId}`,
          status: 'Aktif'
        });
      }
    };

    window.addEventListener('presentrain_open_class', handleOpenClassEvent);
    return () => window.removeEventListener('presentrain_open_class', handleOpenClassEvent);
  }, [classes]);


  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setClassName('');
    setIsClassModalOpen(true);
  };

  const handleOpenEditModal = (c) => {
    setEditingClass(c);
    setClassName(c.name || '');
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!className.trim()) return;

    try {
      if (editingClass) {
        const res = await api.updateClass(editingClass.id, {
          name: className.trim(),
          status: 'Aktif',
        });
        if (res.ok) {
          if (onNotification) onNotification('Nama kelas berhasil diperbarui!');
          fetchClasses();
          setIsClassModalOpen(false);
        }
      } else {
        const res = await api.createClass({
          name: className.trim(),
          status: 'Aktif',
        });
        if (res.ok) {
          if (onNotification) onNotification('Kelas baru berhasil ditambahkan!');
          fetchClasses();
          setIsClassModalOpen(false);
        }
      }
    } catch (err) {
      console.warn('Gagal menyimpan kelas:', err);
    }
  };

  const handleDeleteClass = async (c) => {
    if (!window.confirm(`Yakin ingin menghapus kelas "${c.name}"? Semua peserta di kelas ini akan otomatis dikembalikan ke Kelas Umum.`)) {
      return;
    }

    try {
      const res = await api.deleteClass(c.id);
      if (res.ok) {
        if (onNotification) onNotification('Kelas berhasil dihapus!');
        fetchClasses();
      }
    } catch (err) {
      console.warn('Gagal menghapus kelas:', err);
    }
  };

  const handleOpenAssignAdmins = async (c) => {
    setAssignAdminsModalClass(c);
    try {
      const res = await api.getClass(c.id);
      if (res.ok && res.data) {
        const currentAdmins = res.data.admins || [];
        setSelectedAdminIds(currentAdmins.map(a => a.id));
        const permMap = {};
        currentAdmins.forEach(a => {
          permMap[a.id] = {
            can_manage_attendance: a.pivot?.can_manage_attendance !== false,
            can_manage_assessment: a.pivot?.can_manage_assessment !== false,
            can_manage_quiz: a.pivot?.can_manage_quiz !== false,
          };
        });
        setAdminPermissions(permMap);
      }
    } catch (err) {
      console.warn('Gagal mengambil data admin kelas:', err);
    }
  };

  const handleSaveAssignedAdmins = async () => {
    if (!assignAdminsModalClass) return;

    const payload = selectedAdminIds.map(adminId => ({
      user_id: adminId,
      can_manage_attendance: adminPermissions[adminId]?.can_manage_attendance ?? true,
      can_manage_assessment: adminPermissions[adminId]?.can_manage_assessment ?? true,
      can_manage_quiz: adminPermissions[adminId]?.can_manage_quiz ?? true,
    }));

    try {
      const res = await api.assignClassAdmins(assignAdminsModalClass.id, payload);
      if (res.ok) {
        if (onNotification) onNotification('Daftar administrator kelas berhasil diperbarui!');
        setAssignAdminsModalClass(null);
        fetchClasses();
        if (detailClass && detailClass.id === assignAdminsModalClass.id) {
          handleOpenDetail(detailClass);
        }
      }
    } catch (err) {
      console.warn('Gagal menyimpan penugasan admin:', err);
    }
  };

  const handleOpenDetail = async (classObj) => {
    setDetailClass(classObj);
    setDetailTab('participants');
    setIsLoadingDetail(true);
    try {
      const targetId = classObj.is_general ? 'general' : classObj.id;
      const [res, sRes, qRes] = await Promise.all([
        api.getClass(targetId),
        api.getQuizSubmissions(null, classObj.is_general ? 'general' : classObj.id),
        api.getQuizzes()
      ]);
      if (res && res.ok) {
        setClassDetailData(res.data);
      }
      if (sRes && sRes.ok && Array.isArray(sRes.data)) {
        setInternalSubmissions(prev => {
          const map = new Map(prev.map(item => [item.id, item]));
          sRes.data.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        });
      }
      if (qRes && qRes.ok && Array.isArray(qRes.data)) {
        setInternalQuizzes(qRes.data);
      }
    } catch (err) {
      console.warn('Gagal memuat detail kelas:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const filteredClasses = classes.filter(c => 
    !searchQuery || 
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));

  // Perhitungan Rekap Data Kelas dengan Fallback Props
  const fallbackParticipantsForClass = (participants || []).filter(p => {
    if (detailClass?.is_general) return !p.class_id;
    return (p.class_id && String(p.class_id) === String(detailClass?.id)) ||
           (p.classCode && detailClass?.code && p.classCode.toLowerCase() === detailClass.code.toLowerCase()) ||
           (p.className && detailClass?.name && p.className.toLowerCase() === detailClass.name.toLowerCase());
  });

  const participantsList = (classDetailData?.participants && classDetailData.participants.length > 0)
    ? classDetailData.participants
    : fallbackParticipantsForClass;

  const fallbackAdminsForClass = (adminList || []).filter(a => {
    if (detailClass?.is_general) return false;
    return a.managedClasses?.some(c => 
      String(c.id) === String(detailClass?.id) || 
      (c.code && detailClass?.code && c.code.toLowerCase() === detailClass.code.toLowerCase())
    ) || (a.assigned_class_id && String(a.assigned_class_id) === String(detailClass?.id));
  });

  const rawAdminsList = (classDetailData?.admins && classDetailData.admins.length > 0)
    ? classDetailData.admins
    : fallbackAdminsForClass;

  const adminsList = [...rawAdminsList].sort((a, b) => {
    const nameA = (a.name || '').trim();
    const nameB = (b.name || '').trim();
    const isMotA = nameA.toUpperCase().startsWith('MOT');
    const isMotB = nameB.toUpperCase().startsWith('MOT');
    if (isMotA && !isMotB) return -1;
    if (!isMotA && isMotB) return 1;
    return nameA.localeCompare(nameB, 'id', { numeric: true, sensitivity: 'base' });
  });

  const filteredParticipants = participantsList.filter(p => {
    if (!participantSearch) return true;
    const q = participantSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.instansi && p.instansi.toLowerCase().includes(q)) ||
      (p.user_qr_token && p.user_qr_token.toLowerCase().includes(q))
    );
  }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));

  const totalParticipants = participantsList.length;
  const verifiedCount = participantsList.filter(p => p.status === 'Terverifikasi' || p.status === 'Aktif' || p.email_verified_at).length;
  const totalAttendancesRecorded = participantsList.reduce((acc, p) => acc + (p.attendances ? p.attendances.length : 0), 0);

  // =========================================================================
  // TAMPILAN HALAMAN KHUSUS: REKAP SEMUA DATA (BERKAS BASIC TRAINING.XLS)
  // =========================================================================
  if (isRekapViewOpen) {
    return (
      <RekapDataView
        onBack={() => {
          setIsRekapViewOpen(false);
          fetchClasses();
        }}
        initialClassId={detailClass ? (detailClass.is_general ? 'general' : detailClass.id) : 'all'}
      />
    );
  }

  // =========================================================================
  // TAMPILAN DETAIL KELAS (BUKA KELAS)
  // =========================================================================
  if (detailClass && classDetailData) {
    return (
      <div className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto font-sans w-full animate-fade-in text-slate-800">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-emerald-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <button
              onClick={() => {
                setDetailClass(null);
                setClassDetailData(null);
                fetchClasses();
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
              title="Kembali ke Daftar Kelas"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="space-y-0.5">
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {classDetailData.name}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Kelola peserta dan administrator khusus kelas ini
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => setIsRekapViewOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
              title="Buka Spreadsheet Rekapitulasi Data Khusus Kelas Ini"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Rekap Data Excel</span>
            </button>
          </div>
        </div>

        {/* Navigasi Tab Utama Detail Kelas */}
        <div className="flex border-b border-slate-200 space-x-2 sm:space-x-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setDetailTab('participants')}
            className={`pb-3 px-1 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              detailTab === 'participants' 
                ? 'border-emerald-600 text-emerald-800 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Peserta ({participantsList.length})</span>
          </button>

          <button
            onClick={() => setDetailTab('attendance')}
            className={`pb-3 px-1 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              detailTab === 'attendance' 
                ? 'border-emerald-600 text-emerald-800 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Presensi</span>
          </button>

          <button
            onClick={() => setDetailTab('assessment')}
            className={`pb-3 px-1 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              detailTab === 'assessment' 
                ? 'border-emerald-600 text-emerald-800 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Penilaian</span>
          </button>

          <button
            onClick={() => setDetailTab('quizzes')}
            className={`pb-3 px-1 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              detailTab === 'quizzes' 
                ? 'border-emerald-600 text-emerald-800 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Hasil Quiz</span>
          </button>

          {!detailClass.is_general && (
            <button
              onClick={() => setDetailTab('admins')}
              className={`pb-3 px-1 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                detailTab === 'admins' 
                  ? 'border-emerald-600 text-emerald-800 font-black' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Daftar Administrator ({adminsList.length})</span>
            </button>
          )}

          <button
            onClick={() => setDetailTab('recap')}
            className={`pb-3 px-1 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              detailTab === 'recap' 
                ? 'border-emerald-600 text-emerald-800 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Rekap Data Kelas</span>
          </button>
        </div>

        {/* TAB 1: DAFTAR PESERTA KELAS */}
        {detailTab === 'participants' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari nama, email, instansi, atau token QR..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-600 shadow-2xs font-medium"
                />
              </div>

              <div className="text-xs text-slate-500 font-semibold text-right">
                Menampilkan {filteredParticipants.length} dari {participantsList.length} peserta
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-emerald-50/60 border-b border-slate-200 text-emerald-950 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-3 text-center w-12">#</th>
                      <th className="py-3.5 px-4">Nama Peserta</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Asal Instansi</th>
                      <th className="py-3.5 px-4 text-center">Token QR</th>
                      {!detailClass.is_general && <th className="py-3.5 px-4 text-center w-24">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={detailClass.is_general ? 5 : 6} className="py-10 text-center text-slate-400 font-medium">
                          Tidak ada data peserta yang cocok di kelas ini.
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden relative border border-emerald-200">
                                <span>{p.name ? p.name.charAt(0).toUpperCase() : 'P'}</span>
                                {p.avatar && (
                                  <img 
                                    src={p.avatar} 
                                    alt={p.name} 
                                    loading="lazy" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover absolute inset-0 z-10" 
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                )}
                              </div>
                              <span className="truncate">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{p.email}</td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{p.instansi || '-'}</td>
                          <td className="py-3 px-4 text-center font-mono text-[11px] font-bold text-emerald-700">
                            <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {p.user_qr_token || p.qrToken || '-'}
                            </span>
                          </td>
                          {!detailClass.is_general && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Keluarkan ${p.name} dari kelas "${classDetailData.name}" ke Kelas Umum?`)) {
                                    await api.removeClassParticipant(detailClass.id, p.id);
                                    handleOpenDetail(detailClass);
                                  }
                                }}
                                className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg font-bold text-[11px] transition-all cursor-pointer border border-rose-200"
                              >
                                Keluarkan
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRESENSI KELAS */}
        {detailTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari peserta presensi..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-600 shadow-2xs font-medium"
                />
              </div>
              <div className="text-xs text-slate-500 font-semibold text-right">
                {training?.sessions?.length || 0} Sesi Pelatihan
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-emerald-50/60 border-b border-slate-200 text-emerald-950 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-3 text-center w-12">#</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Nama Peserta</th>
                      {(training?.sessions || []).map((s, sIdx) => (
                        <th key={s.id || sIdx} className="py-3.5 px-3 text-center min-w-[110px]">
                          <span className="block truncate max-w-[120px]" title={s.title}>
                            {s.title || `Sesi ${sIdx + 1}`}
                          </span>
                        </th>
                      ))}
                      <th className="py-3.5 px-4 text-center min-w-[100px]">Total Hadir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={3 + (training?.sessions?.length || 0)} className="py-10 text-center text-slate-400 font-medium">
                          Tidak ada data peserta di kelas ini.
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map((p, idx) => {
                        const sessions = training?.sessions || [];
                        let presentCount = 0;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden relative border border-emerald-200">
                                  <span>{p.name ? p.name.charAt(0).toUpperCase() : 'P'}</span>
                                  {p.avatar && (
                                    <img 
                                      src={p.avatar} 
                                      alt={p.name} 
                                      loading="lazy" 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover absolute inset-0 z-10" 
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  )}
                                </div>
                                <div>
                                  <span className="truncate block max-w-[180px]">{p.name}</span>
                                </div>
                              </div>
                            </td>
                            {sessions.map((s, sIdx) => {
                              const attRecord = checkSessionAttendance(p, s);
                              if (attRecord?.present) {
                                presentCount++;
                                return (
                                  <td key={s.id || sIdx} className="py-3 px-3 text-center">
                                    <span 
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 shadow-2xs"
                                      title={attRecord.time ? `Hadir - Waktu: ${attRecord.time}` : 'Hadir'}
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                                      <span>Hadir</span>
                                    </span>
                                  </td>
                                );
                              }
                              if (attRecord?.excuse) {
                                return (
                                  <td key={s.id || sIdx} className="py-3 px-3 text-center">
                                    <span 
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200 shadow-2xs" 
                                      title={attRecord.note ? `Izin: "${attRecord.note}"` : 'Izin / Berhalangan'}
                                    >
                                      <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
                                      <span>Izin</span>
                                    </span>
                                  </td>
                                );
                              }
                              if (attRecord?.absent) {
                                return (
                                  <td key={s.id || sIdx} className="py-3 px-3 text-center">
                                    <span 
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200 shadow-2xs" 
                                      title={attRecord.note ? `Tidak Hadir: "${attRecord.note}"` : 'Tidak Hadir / Alpa'}
                                    >
                                      <XCircle className="w-3 h-3 text-rose-700 shrink-0" />
                                      <span>Tidak Hadir</span>
                                    </span>
                                  </td>
                                );
                              }
                              return (
                                <td key={s.id || sIdx} className="py-3 px-3 text-center text-slate-300 font-bold">
                                  -
                                </td>
                              );
                            })}
                            <td className="py-3 px-4 text-center">
                              <span className="font-bold text-slate-900 text-xs">
                                {presentCount} / {sessions.length} Sesi
                              </span>
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
        )}

        {/* TAB 3: PENILAIAN RESMI LK1 */}
        {detailTab === 'assessment' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari peserta penilaian..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-600 shadow-2xs font-medium"
                />
              </div>
              <div className="text-xs text-slate-500 font-semibold text-right">
                Standar Baku LK1 HMI
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-emerald-50/60 border-b border-slate-200 text-emerald-950 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-3 text-center w-12">#</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Nama Peserta</th>
                      <th className="py-3.5 px-4 text-center">Afektif (50%)</th>
                      <th className="py-3.5 px-4 text-center">Kognitif (30%)</th>
                      <th className="py-3.5 px-4 text-center">Psikomotorik (20%)</th>
                      <th className="py-3.5 px-4 text-center">Nilai Akhir (NA)</th>
                      <th className="py-3.5 px-4 text-center min-w-[120px]">Status Kelulusan</th>
                      <th className="py-3.5 px-4 text-center min-w-[110px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                          Tidak ada data peserta di kelas ini.
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map((p, idx) => {
                        const userAss = assessments?.[p.id] || 
                          assessments?.[p.db_id] || 
                          assessments?.[`USR-${p.id}`] || 
                          assessments?.[`USR-${p.db_id}`] || 
                          (typeof p.id === 'string' && assessments?.[p.id.replace(/\D/g, '')]) || 
                          p.assessment || 
                          null;
                        const calc = calculateAssessment(userAss);

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden relative border border-emerald-200">
                                  <span>{p.name ? p.name.charAt(0).toUpperCase() : 'P'}</span>
                                  {p.avatar && (
                                    <img 
                                      src={p.avatar} 
                                      alt={p.name} 
                                      loading="lazy" 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover absolute inset-0 z-10" 
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  )}
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedParticipantForGrading(p)}
                                    className="truncate block max-w-[180px] text-left hover:text-emerald-700 hover:underline cursor-pointer"
                                    title="Klik untuk lihat detail lembar penilaian"
                                  >
                                    {p.name}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">{calc.afektif}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">{calc.kognitif}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">{calc.psikomotorik}</td>
                            <td className="py-3 px-4 text-center font-black text-emerald-700 text-sm">
                              {calc.nilaiAkhir}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${calc.statusClass}`}>
                                {calc.status} ({calc.predicate})
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedParticipantForGrading(p)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-[11px] transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Lihat detail lembar penilaian dan log"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-600" />
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
            </div>

            {/* Rumus Baku LK1 Info Card */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-slate-700 flex items-start space-x-3">
              <Award className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-slate-900 block mb-0.5">Ketentuan Penilaian Resmi Pelatihan:</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>NA = (Nilai Afektif × 40%) + (Nilai Kognitif × 30%) + (Nilai Psikomotorik × 30%)</strong>. Standar kelulusan: Nilai Akhir &ge; 75 dinyatakan <strong>Lulus</strong>, 60 &ndash; 74 dinyatakan <strong>Perbaikan</strong>, dan &lt; 60 dinyatakan <strong>Tidak Lulus</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HASIL QUIZ */}
        {detailTab === 'quizzes' && (() => {
          // 1. Kumpulkan semua kuis yang ada dari master quizzes dan submissions dengan deduplikasi ketat
          const dynamicQuizzes = [];

          const registerQuiz = (q) => {
            if (!q) return;
            const titleKey = (q.title || '').trim().toLowerCase();
            const idKey = String(q.id || '');
            const codeKey = String(q.quiz_code || q.quizCode || q.link_code || q.linkCode || '');
            
            // Cek apakah kuis ini sudah terdaftar sebelumnya (berdasarkan ID, Code, atau Judul yang sama)
            const alreadyExists = dynamicQuizzes.some(existing => {
              const exTitle = (existing.title || '').trim().toLowerCase();
              const exId = String(existing.id || '');
              const exCode = String(existing.quiz_code || existing.quizCode || existing.link_code || existing.linkCode || '');
              return (idKey && exId === idKey) ||
                     (codeKey && (exCode === codeKey || exId === codeKey)) ||
                     (titleKey && exTitle && exTitle === titleKey);
            });

            if (!alreadyExists) {
              dynamicQuizzes.push(q);
            }
          };

          (quizzes || []).forEach(registerQuiz);

          // Kumpulkan semua submission dari state utama dan dari peserta
          const rawSubs = [
            ...(Array.isArray(quizSubmissions) ? quizSubmissions : []),
            ...(classDetailData?.participants || []).flatMap(p => [
              ...(Array.isArray(p.quizSubmissions) ? p.quizSubmissions : []),
              ...(Array.isArray(p.quiz_submissions) ? p.quiz_submissions : [])
            ]),
            ...filteredParticipants.flatMap(p => [
              ...(Array.isArray(p.quizSubmissions) ? p.quizSubmissions : []),
              ...(Array.isArray(p.quiz_submissions) ? p.quiz_submissions : [])
            ])
          ];

          // Deduplikasi submissions agar per peserta per kuis hanya ada 1 data (prioritaskan yang memiliki skor & terkunci)
          const allSubs = [];
          const seenSubKeys = new Set();
          rawSubs.forEach(s => {
            if (!s) return;
            const subId = s.id || s.submission_code;
            const pKey = s.user_id || s.participantEmail || (s.participantName || '').trim().toLowerCase();
            const qKey = s.quiz_id || s.quizId || (s.quizTitle || s.quiz?.title || '').trim().toLowerCase();
            const compositeKey = `${qKey}_${pKey}`;
            
            if (!seenSubKeys.has(compositeKey) && !(subId && seenSubKeys.has(`id_${subId}`))) {
              if (subId) seenSubKeys.add(`id_${subId}`);
              seenSubKeys.add(compositeKey);
              allSubs.push(s);
            }
          });

          // Ekstrak kuis yang ada di submission jika belum terdaftar di dynamicQuizzes
          allSubs.forEach(s => {
            const qId = s.quizId || s.quiz_id || s.quiz?.id;
            const qTitle = s.quizTitle || s.quiz_title || s.quiz?.title;
            const qCode = s.quiz_code || s.quiz?.quiz_code;

            const matchesExisting = dynamicQuizzes.some(dq => 
              isSubmissionForQuiz(s, dq) || 
              (qTitle && dq.title && dq.title.trim().toLowerCase() === qTitle.trim().toLowerCase())
            );

            if (!matchesExisting && (qId || qTitle)) {
              registerQuiz({
                id: qId || `QZ-${dynamicQuizzes.length + 1}`,
                title: qTitle || `Kuis #${qId}`,
                quiz_code: qCode,
                passing_grade: s.quiz?.passing_grade || 70
              });
            }
          });

          const availableQuizzes = dynamicQuizzes.length > 0 ? dynamicQuizzes : [];

          const activeQuizzes = selectedQuizFilter === 'ALL'
            ? availableQuizzes
            : availableQuizzes.filter(q => String(q.id) === String(selectedQuizFilter) || (q.title && q.title === selectedQuizFilter));

          const quizRows = [];
          filteredParticipants.forEach((p) => {
            if (activeQuizzes.length === 0) {
              // Jika tidak ada kuis terdaftar, cek apakah peserta ini memiliki riwayat submission
              const pSubs = allSubs.filter(s => isSubmissionForParticipant(s, p));
              const uniquePSubs = [];
              const seenQuizForP = new Set();
              pSubs.forEach(s => {
                const qKey = (s.quizTitle || s.quiz_title || s.quiz_id || s.quizId || 'eval').trim().toLowerCase();
                if (!seenQuizForP.has(qKey)) {
                  seenQuizForP.add(qKey);
                  uniquePSubs.push(s);
                }
              });

              if (uniquePSubs.length > 0) {
                uniquePSubs.forEach(s => {
                  quizRows.push({
                    participant: p,
                    quiz: {
                      id: s.quizId || s.quiz_id || 1,
                      title: s.quizTitle || s.quiz_title || s.quiz?.title || 'Evaluasi Kuis',
                      passing_grade: s.quiz?.passing_grade || 70
                    },
                    submission: s
                  });
                });
              } else {
                quizRows.push({
                  participant: p,
                  quiz: { id: 1, title: 'Evaluasi Kuis Belum Tersedia', passing_grade: 70 },
                  submission: null
                });
              }
            } else {
              const seenQuizTitlesForParticipant = new Set();
              activeQuizzes.forEach((quiz) => {
                const normTitle = (quiz.title || '').trim().toLowerCase();
                if (seenQuizTitlesForParticipant.has(normTitle)) {
                  return; // Cegah double row untuk variasi kuis yang sama
                }
                seenQuizTitlesForParticipant.add(normTitle);

                const sub = allSubs.find(s => 
                  isSubmissionForParticipant(s, p) && isSubmissionForQuiz(s, quiz)
                );
                quizRows.push({ participant: p, quiz, submission: sub });
              });
            }
          });

          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Cari nama peserta kuis..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-600 shadow-2xs font-medium"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={fetchQuizData}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Segarkan Data Kuis & Nilai"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-semibold">Segarkan</span>
                  </button>

                  {availableQuizzes.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <label className="text-xs font-semibold text-slate-600">Filter Kuis:</label>
                      <select
                        value={selectedQuizFilter}
                        onChange={(e) => setSelectedQuizFilter(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 shadow-2xs cursor-pointer"
                      >
                        <option value="ALL">Semua Kuis ({availableQuizzes.length})</option>
                        {availableQuizzes.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-emerald-50/60 border-b border-slate-200 text-emerald-950 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-3 text-center w-12">#</th>
                        <th className="py-3.5 px-4 min-w-[180px]">Nama Peserta</th>
                        <th className="py-3.5 px-4">Judul Kuis</th>
                        <th className="py-3.5 px-4 text-center">Nilai / Skor</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-center">Waktu Pengerjaan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quizRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                            Belum ada data pengerjaan kuis untuk kelas ini.
                          </td>
                        </tr>
                      ) : (
                        quizRows.map((row, rIdx) => {
                          const { participant: p, quiz, submission: sub } = row;
                          const score = sub ? (sub.score ?? 0) : null;
                          const isSubmitted = !!sub;
                          const passingScore = quiz.passing_grade || sub?.quiz?.passing_grade || 70;
                          const isPassed = score !== null && score >= passingScore;
                          const displayQuizTitle = sub?.quizTitle || sub?.quiz_title || sub?.quiz?.title || quiz.title || 'Evaluasi Kuis';
                          const displayDate = sub?.submittedAt || (sub?.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (isSubmitted ? 'Selesai' : '-'));

                          return (
                            <tr key={`${p.id}-${quiz.id}-${rIdx}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 text-center font-bold text-slate-400">{rIdx + 1}</td>
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden relative border border-emerald-200">
                                    <span>{p.name ? p.name.charAt(0).toUpperCase() : 'P'}</span>
                                    {p.avatar && (
                                      <img 
                                        src={p.avatar} 
                                        alt={p.name} 
                                        loading="lazy" 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover absolute inset-0 z-10" 
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <span className="truncate block max-w-[180px]">{p.name}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {displayQuizTitle}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isSubmitted ? (
                                  <span className={`font-black text-sm ${isPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                                    {score} / 100
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-medium">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isSubmitted ? (
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isPassed 
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                      : 'bg-rose-100 text-rose-800 border-rose-200'
                                  }`}>
                                    {isPassed ? 'Lulus' : 'Remedial'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    Belum Mengerjakan
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center text-slate-500 text-[11px] font-medium">
                                {displayDate}
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
        })()}

        {/* TAB 5: DAFTAR ADMINISTRATOR BERTUGAS */}
        {detailTab === 'admins' && !detailClass.is_general && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Administrator Khusus Kelas</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Administrator yang berwenang mengelola presensi, penilaian, dan kuis peserta kelas ini.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto min-h-[160px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4 text-center w-12">#</th>
                      <th className="py-3.5 px-4">NAMA ADMINISTRATOR</th>
                      <th className="py-3.5 px-4">MENGELOLA KELAS</th>
                      <th className="py-3.5 px-4 text-center">STATUS AKUN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {adminsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                          Belum ada administrator yang ditugaskan khusus untuk kelas ini.
                        </td>
                      </tr>
                    ) : (
                      adminsList.map((adm, idx) => {
                        const isActive = adm.status !== 'Nonaktif' && adm.status !== 'Inactive';
                        const canAtt = (adm.pivot?.can_manage_attendance ?? adm.can_manage_attendance ?? adm.canManageAttendance) !== false;
                        const canAss = (adm.pivot?.can_manage_assessment ?? adm.can_manage_assessment ?? adm.canManageAssessment ?? adm.canManageGrading) !== false;
                        const canQz = (adm.pivot?.can_manage_quiz ?? adm.can_manage_quiz ?? adm.canManageQuiz) !== false;

                        return (
                          <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 overflow-hidden border border-emerald-300 relative">
                                  <span>{adm.name ? adm.name.charAt(0).toUpperCase() : 'A'}</span>
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
                                  <div className="text-[11px] text-slate-400 font-normal">{adm.email || '-'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{classDetailData?.name || detailClass?.name || 'Kelas Ini'}</span>
                                </span>
                                {(canAtt || canAss || canQz) && (
                                  <div className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                    {canAtt && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Presensi</span>}
                                    {canAss && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Nilai</span>}
                                    {canQz && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Kuis</span>}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-block ${
                                isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'
                              }`}>
                                {adm.status || 'Aktif'}
                              </span>
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
        )}

        {/* TAB 3: REKAP DATA KELAS (EXCEL SPREADSHEET SINKRON) */}
        {detailTab === 'recap' && (
          <div className="pt-2">
            <RekapDataView
              initialClassId={detailClass.is_general ? 'general' : detailClass.id}
              isEmbedded={true}
              lockClassId={true}
              title={`Rekap Data Spreadsheet: ${classDetailData?.name || detailClass?.name || 'Kelas Ini'}`}
            />
          </div>
        )}

        {/* FULL PAGE / MODAL: DETAIL LEMBAR PENILAIAN INDIVIDUAL (FULL ASSESSMENT REVIEW & NOTES) */}
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
                    {selectedParticipantForGrading.name ? selectedParticipantForGrading.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight truncate max-w-xs sm:max-w-md">
                        {selectedParticipantForGrading.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {selectedParticipantForGrading.instansi || selectedParticipantForGrading.institution || 'Peserta'} • {selectedParticipantForGrading.email || '-'}
                    </p>
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
                  const userAss = assessments?.[selectedParticipantForGrading.id] || 
                    assessments?.[selectedParticipantForGrading.db_id] || 
                    assessments?.[`USR-${selectedParticipantForGrading.id}`] || 
                    assessments?.[`USR-${selectedParticipantForGrading.db_id}`] || 
                    (typeof selectedParticipantForGrading.id === 'string' && assessments?.[selectedParticipantForGrading.id.replace(/\D/g, '')]) || 
                    selectedParticipantForGrading.assessment || 
                    null;
                  const ass = calculateAssessment(userAss);

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

                {/* Riwayat Log Pelanggaran & Keaktifan */}
                {(() => {
                  const userAss = assessments?.[selectedParticipantForGrading.id] || 
                    assessments?.[selectedParticipantForGrading.db_id] || 
                    assessments?.[`USR-${selectedParticipantForGrading.id}`] || 
                    assessments?.[`USR-${selectedParticipantForGrading.db_id}`] || 
                    (typeof selectedParticipantForGrading.id === 'string' && assessments?.[selectedParticipantForGrading.id.replace(/\D/g, '')]) || 
                    selectedParticipantForGrading.assessment || 
                    null;
                  const violations = userAss?.violations || [];
                  const contributions = userAss?.contributions || [];

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Box 1: Log Pelanggaran Afektif */}
                      <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                        <div className="flex items-center justify-between font-bold text-rose-950">
                          <span>Log Pelanggaran Afektif (Modal 100)</span>
                          <span className="text-rose-700 font-mono">
                            -{violations.reduce((s, v) => s + (v.points || 0), 0)} Poin
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {violations.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px] py-3">Tidak ada catatan pelanggaran (Nilai 100 sempurna).</p>
                          ) : (
                            violations.map((v, vIdx) => (
                              <div key={v.id || vIdx} className="p-2.5 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-[11px] shadow-2xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">[{v.symbol || '!'}] {v.item}</span>
                                  <span className="text-[10px] text-slate-400">{v.sessionTitle || 'Sesi'} • {v.timestamp || '-'}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <span className="font-bold text-rose-600 font-mono">-{v.points}</span>
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
                            +{contributions.reduce((s, c) => s + (c.points || 0), 0)} Poin
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {contributions.length === 0 ? (
                            <p className="text-slate-400 italic text-[11px] py-3">Belum ada catatan keaktifan.</p>
                          ) : (
                            contributions.map((c, cIdx) => (
                              <div key={c.id || cIdx} className="p-2.5 bg-white rounded-xl border border-teal-200 flex items-center justify-between text-[11px] shadow-2xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">[{c.symbol || '+'}] {c.item}</span>
                                  <span className="text-[10px] text-slate-400">{c.sessionTitle || 'Sesi'} • {c.timestamp || '-'}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <span className="font-bold text-teal-600 font-mono">+{c.points}</span>
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
                            (() => {
                              const userAss = assessments?.[selectedParticipantForGrading.id] || 
                                assessments?.[selectedParticipantForGrading.db_id] || 
                                assessments?.[`USR-${selectedParticipantForGrading.id}`] || 
                                assessments?.[`USR-${selectedParticipantForGrading.db_id}`] || 
                                (typeof selectedParticipantForGrading.id === 'string' && assessments?.[selectedParticipantForGrading.id.replace(/\D/g, '')]) || 
                                selectedParticipantForGrading.assessment || 
                                null;

                              return (training?.sessions || []).map((s, sIdx) => {
                                const sAss = userAss?.sessions?.[s.id] || null;
                                const sVios = (userAss?.violations || []).filter(v => v.sessionId === s.id || String(v.sessionId) === String(s.id));
                                const sCons = (userAss?.contributions || []).filter(c => c.sessionId === s.id || String(c.sessionId) === String(s.id));
                                
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
                                        <span className="text-[11px] text-slate-400 italic">Standar (Tidak ada catatan perubahan)</span>
                                      ) : (
                                        <div className="flex flex-wrap gap-1 items-center max-w-xs">
                                          {sVios.map((v, vIdx) => (
                                            <span key={vIdx} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold" title={`${v.item} (${v.timestamp || ''})`}>
                                              <span>-{v.points}</span>
                                              <span className="truncate max-w-[80px]">{v.item}</span>
                                            </span>
                                          ))}
                                          {sCons.map((c, cIdx) => (
                                            <span key={cIdx} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-semibold" title={`${c.item} (${c.timestamp || ''})`}>
                                              <span>+{c.points}</span>
                                              <span className="truncate max-w-[80px]">{c.item}</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Catatan Kualitatif / Deskripsi Karakter */}
                {(() => {
                  const userAss = assessments?.[selectedParticipantForGrading.id] || 
                    assessments?.[selectedParticipantForGrading.db_id] || 
                    assessments?.[`USR-${selectedParticipantForGrading.id}`] || 
                    assessments?.[`USR-${selectedParticipantForGrading.db_id}`] || 
                    (typeof selectedParticipantForGrading.id === 'string' && assessments?.[selectedParticipantForGrading.id.replace(/\D/g, '')]) || 
                    selectedParticipantForGrading.assessment || 
                    null;

                  return (
                    <div className="space-y-2 text-xs">
                      <label className="block font-bold text-slate-700">
                        Catatan Kualitatif / Deskripsi Karakter Pemandu
                      </label>
                      <div className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs leading-relaxed min-h-[50px]">
                        {userAss?.notes ? (
                          userAss.notes
                        ) : (
                          <span className="text-slate-400 italic">Belum ada catatan kualitatif untuk peserta ini.</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // TAMPILAN UTAMA DAFTAR KELAS (WARNA TERANG, CLEAN, RESPONSIF)
  // =========================================================================
  return (
    <div className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto font-sans w-full text-slate-800">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Manajemen Kelas Pelatihan</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Kelola pengelompokan peserta, penugasan administrator panitia, dan pembagian kelas.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsRekapViewOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-600/30 hover:border-emerald-600 text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Buka Spreadsheet Rekapitulasi Seluruh Data Ala Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Rekap Semua Data</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Search Bar & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-600 shadow-2xs font-medium"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Total: {filteredClasses.length + 1} Kelas
        </div>
      </div>

      {/* Tabel Manajemen Kelas (Rapi, Terang, Bersih, Titik 3 Aksi) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-visible shadow-sm">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-emerald-50/60 border-b border-slate-200 text-emerald-950 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-3 text-center w-14">#</th>
                <th className="py-3.5 px-4">Nama Kelas</th>
                <th className="py-3.5 px-4 text-left">Jumlah Peserta</th>
                <th className="py-3.5 px-4 text-left">Administrator</th>
                <th className="py-3.5 px-4 text-center w-44 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Row 1: Kelas Umum (Default) */}
              {(!searchQuery || 'kelas umum (default)'.includes(searchQuery.toLowerCase())) && (
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 text-center font-bold text-slate-400">1</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                        <GraduationCap className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">Kelas Umum</span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          Default
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-left">
                    <span className="font-semibold text-slate-800 text-xs">
                      {generalCount} Peserta
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-left">
                    <span className="font-semibold text-slate-600 text-xs">Seluruh Admin</span>
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetail({ id: 'general', name: 'Kelas Umum', code: 'KELAS-UMUM', is_general: true })}
                        className="whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                      >
                        Buka Kelas
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Dynamic Classes */}
              {filteredClasses.length === 0 ? (
                searchQuery ? (
                  !'kelas umum (default)'.includes(searchQuery.toLowerCase()) && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                        Tidak ada kelas yang cocok dengan pencarian "{searchQuery}".
                      </td>
                    </tr>
                  )
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium bg-slate-50/50">
                      Belum ada kelas khusus yang dibuat. Seluruh peserta otomatis tergabung di Kelas Umum.
                    </td>
                  </tr>
                )
              ) : (
                filteredClasses.map((c, idx) => {
                  const isMenuOpen = openMenuClassId === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 text-center font-bold text-slate-400">
                        {idx + 2}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                            <GraduationCap className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <span className="font-semibold text-slate-800 text-xs">
                          {c.participants_count || 0} Peserta
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <span className="font-semibold text-slate-700 text-xs">
                          {c.admins_count || 0} Administrator
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2 whitespace-nowrap relative class-action-menu">
                          <button
                            onClick={() => handleOpenDetail(c)}
                            className="whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white font-bold text-xs transition-all cursor-pointer border border-emerald-200 active:scale-95 shrink-0"
                          >
                            Buka Kelas
                          </button>

                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuClassId(isMenuOpen ? null : c.id);
                              }}
                              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                                isMenuOpen 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                              }`}
                              title="Menu Aksi"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-fade-in text-xs font-semibold">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuClassId(null);
                                    handleOpenEditModal(c);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center space-x-2 cursor-pointer transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit Kelas</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuClassId(null);
                                    handleDeleteClass(c);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus Kelas</span>
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* MODAL TAMBAH / EDIT KELAS (HANYA NAMA KELAS) */}
      {isClassModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-sans select-none"
          onClick={() => setIsClassModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 border border-slate-200 relative my-auto text-slate-900 animate-spring-popup max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <GraduationCap className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingClass ? 'Edit Nama Kelas' : 'Buat Kelas Baru'}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nama Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Kelas A, Kelas Khusus 1, dll"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-900 font-semibold outline-none focus:border-emerald-600 focus:bg-white transition-all text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {editingClass ? 'Simpan Perubahan' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PENUGASAN ADMINISTRATOR KELAS */}
      {assignAdminsModalClass && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-sans select-none"
          onClick={() => setAssignAdminsModalClass(null)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 border border-slate-200 relative my-auto text-slate-900 animate-spring-popup max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Penugasan Administrator: {assignAdminsModalClass.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAssignAdminsModalClass(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {adminList.filter(a => a.status === 'Aktif').map(adm => {
                const isSelected = selectedAdminIds.includes(adm.id);
                const perms = adminPermissions[adm.id] || { can_manage_attendance: true, can_manage_assessment: true, can_manage_quiz: true };

                return (
                  <div key={adm.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAdminIds([...selectedAdminIds, adm.id]);
                            } else {
                              setSelectedAdminIds(selectedAdminIds.filter(id => id !== adm.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{adm.name}</div>
                          <div className="text-[11px] text-slate-500">{adm.email}</div>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="pl-6 pt-2 border-t border-slate-200/80 flex flex-wrap gap-2 text-[11px]">
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perms.can_manage_attendance}
                            onChange={(e) => {
                              setAdminPermissions({
                                ...adminPermissions,
                                [adm.id]: { ...perms, can_manage_attendance: e.target.checked }
                              });
                            }}
                          />
                          <span>Presensi</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perms.can_manage_assessment}
                            onChange={(e) => {
                              setAdminPermissions({
                                ...adminPermissions,
                                [adm.id]: { ...perms, can_manage_assessment: e.target.checked }
                              });
                            }}
                          />
                          <span>Penilaian</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perms.can_manage_quiz}
                            onChange={(e) => {
                              setAdminPermissions({
                                ...adminPermissions,
                                [adm.id]: { ...perms, can_manage_quiz: e.target.checked }
                              });
                            }}
                          />
                          <span>Buka/Tutup Kuis</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setAssignAdminsModalClass(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAssignedAdmins}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer text-xs"
              >
                Simpan Penugasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL PAGE / MODAL: DETAIL LEMBAR PENILAIAN INDIVIDUAL (FULL ASSESSMENT REVIEW & NOTES) */}
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
                  {selectedParticipantForGrading.name ? selectedParticipantForGrading.name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight truncate max-w-xs sm:max-w-md">
                      {selectedParticipantForGrading.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {selectedParticipantForGrading.instansi || selectedParticipantForGrading.institution || 'Peserta'} • {selectedParticipantForGrading.email || '-'}
                  </p>
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
                const userAss = assessments?.[selectedParticipantForGrading.id] || 
                  assessments?.[selectedParticipantForGrading.db_id] || 
                  assessments?.[`USR-${selectedParticipantForGrading.id}`] || 
                  assessments?.[`USR-${selectedParticipantForGrading.db_id}`] || 
                  (typeof selectedParticipantForGrading.id === 'string' && assessments?.[selectedParticipantForGrading.id.replace(/\D/g, '')]) || 
                  selectedParticipantForGrading.assessment || 
                  null;
                const ass = calculateAssessment(userAss);

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

              {/* Riwayat Log Pelanggaran & Keaktifan */}
              {(() => {
                const userAss = assessments?.[selectedParticipantForGrading.id] || 
                  assessments?.[selectedParticipantForGrading.db_id] || 
                  assessments?.[`USR-${selectedParticipantForGrading.id}`] || 
                  assessments?.[`USR-${selectedParticipantForGrading.db_id}`] || 
                  (typeof selectedParticipantForGrading.id === 'string' && assessments?.[selectedParticipantForGrading.id.replace(/\D/g, '')]) || 
                  selectedParticipantForGrading.assessment || 
                  null;
                const violations = userAss?.violations || [];
                const contributions = userAss?.contributions || [];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Box 1: Log Pelanggaran Afektif */}
                    <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                      <div className="flex items-center justify-between font-bold text-rose-950">
                        <span>Log Pelanggaran Afektif (Modal 100)</span>
                        <span className="text-rose-700 font-mono">
                          -{violations.reduce((s, v) => s + (v.points || 0), 0)} Poin
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {violations.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] py-3">Tidak ada catatan pelanggaran (Nilai 100 sempurna).</p>
                        ) : (
                          violations.map((v, vIdx) => (
                            <div key={v.id || vIdx} className="p-2.5 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-[11px] shadow-2xs">
                              <div>
                                <span className="font-bold text-slate-900 block">[{v.symbol || '!'}] {v.item}</span>
                                <span className="text-[10px] text-slate-400">{v.sessionTitle || 'Sesi'} • {v.timestamp || '-'}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <span className="font-bold text-rose-600 font-mono">-{v.points}</span>
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
                          +{contributions.reduce((s, c) => s + (c.points || 0), 0)} Poin
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {contributions.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] py-3">Belum ada catatan keaktifan.</p>
                        ) : (
                          contributions.map((c, cIdx) => (
                            <div key={c.id || cIdx} className="p-2.5 bg-white rounded-xl border border-teal-200 flex items-center justify-between text-[11px] shadow-2xs">
                              <div>
                                <span className="font-bold text-slate-900 block">[{c.symbol || '+'}] {c.item}</span>
                                <span className="text-[10px] text-slate-400">{c.sessionTitle || 'Sesi'} • {c.timestamp || '-'}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <span className="font-bold text-teal-600 font-mono">+{c.points}</span>
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
                          (() => {
                            const userAss = assessments?.[selectedParticipantForGrading.id] || 
                              assessments?.[selectedParticipantForGrading.db_id] || 
                              assessments?.[`USR-${selectedParticipantForGrading.id}`] || 
                              assessments?.[`USR-${selectedParticipantForGrading.db_id}`] || 
                              (typeof selectedParticipantForGrading.id === 'string' && assessments?.[selectedParticipantForGrading.id.replace(/\D/g, '')]) || 
                              selectedParticipantForGrading.assessment || 
                              null;

                            return (training?.sessions || []).map((s, sIdx) => {
                              const sAss = userAss?.sessions?.[s.id] || null;
                              const sVios = (userAss?.violations || []).filter(v => v.sessionId === s.id || String(v.sessionId) === String(s.id));
                              const sCons = (userAss?.contributions || []).filter(c => c.sessionId === s.id || String(c.sessionId) === String(s.id));
                              
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
                                      <span className="text-[11px] text-slate-400 italic">Standar (Tidak ada catatan perubahan)</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1 items-center max-w-xs">
                                        {sVios.map((v, vIdx) => (
                                          <span key={vIdx} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold" title={`${v.item} (${v.timestamp || ''})`}>
                                            <span>-{v.points}</span>
                                            <span className="truncate max-w-[80px]">{v.item}</span>
                                          </span>
                                        ))}
                                        {sCons.map((c, cIdx) => (
                                          <span key={cIdx} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-semibold" title={`${c.item} (${c.timestamp || ''})`}>
                                            <span>+{c.points}</span>
                                            <span className="truncate max-w-[80px]">{c.item}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Catatan Kualitatif / Deskripsi Karakter */}
              {(() => {
                const userAss = assessments?.[selectedParticipantForGrading.id] || 
                  assessments?.[selectedParticipantForGrading.db_id] || 
                  assessments?.[`USR-${selectedParticipantForGrading.id}`] || 
                  assessments?.[`USR-${selectedParticipantForGrading.db_id}`] || 
                  (typeof selectedParticipantForGrading.id === 'string' && assessments?.[selectedParticipantForGrading.id.replace(/\D/g, '')]) || 
                  selectedParticipantForGrading.assessment || 
                  null;

                return (
                  <div className="space-y-2 text-xs">
                    <label className="block font-bold text-slate-700">
                      Catatan Kualitatif / Deskripsi Karakter Pemandu
                    </label>
                    <div className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs leading-relaxed min-h-[50px]">
                      {userAss?.notes ? (
                        userAss.notes
                      ) : (
                        <span className="text-slate-400 italic">Belum ada catatan kualitatif untuk peserta ini.</span>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
