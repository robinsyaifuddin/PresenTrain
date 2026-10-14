import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Edit3, 
  Save, 
  RotateCcw, 
  History, 
  CheckCircle2, 
  X, 
  ArrowLeft, 
  Filter, 
  Search, 
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
  RefreshCw,
  Table as TableIcon,
  GraduationCap,
  Building2
} from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { downloadWorkbook, EXCEL_STYLES } from '@/utils/excelExportHelper';
import { api } from '@/services/api';
import { KOMISARIAT_LIST } from '@/data/mockData';

const DEFAULT_SHEETS = [
  { id: 'TOTAL', name: 'TOTAL KESELURUHAN' },
  { id: 'A1 Screening', name: 'A1 Screening' },
  { id: 'A2 Absensi', name: 'A2 Absensi' },
  { id: 'A3 Aktivitas Forum', name: 'A3 Aktivitas Forum' },
  { id: 'A4 Rekapan', name: 'A4 Rekapan Aktivitas' },
  { id: 'A5 Tugas', name: 'A5 Tugas' },
  { id: 'A6 Nilai Tes Tulis', name: 'A6 Nilai Tes Tulis' }
];

export default function RekapDataView({ 
  onBack, 
  initialClassId = 'all',
  isEmbedded = false,
  lockClassId = false,
  title = ''
}) {
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [activeSheet, setActiveSheet] = useState('TOTAL');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [forumSessionFilter, setForumSessionFilter] = useState('ALL');
  const [selectedKomisariat, setSelectedKomisariat] = useState('ALL');

  useEffect(() => {
    setSelectedClassId(initialClassId);
  }, [initialClassId]);

  // Raw data from server
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

  // Pending cell modifications { [cellKey]: { user_id, sheet_name, field_name, old_value, new_value, session_id, quiz_id } }
  const [pendingChanges, setPendingChanges] = useState({});

  // 1. Fetch Rekap Data
  const loadRekapData = async (classId = selectedClassId) => {
    setIsLoading(true);
    try {
      const res = await api.getRekapGlobalSheets(classId);
      if (res && res.ok && res.data) {
        setRekapData(res.data);
      }
    } catch (err) {
      console.error('Error fetching rekap data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRekapData(selectedClassId);
  }, [selectedClassId]);

  // 2. Fetch Audit Logs
  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await api.getRekapAuditLogs(selectedClassId === 'all' ? null : selectedClassId);
      if (res && res.ok && Array.isArray(res.data)) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error('Gagal mengambil riwayat audit log:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleOpenLogs = () => {
    setShowLogDrawer(true);
    loadAuditLogs();
  };

  // 3. Handle In-Place Cell Edit
  const handleCellChange = (changeObj) => {
    const key = `${changeObj.user_id}_${changeObj.sheet_name}_${changeObj.field_name}_${changeObj.session_id || ''}_${changeObj.quiz_id || ''}`;
    setPendingChanges(prev => ({
      ...prev,
      [key]: {
        ...changeObj,
        reason: reasonInput || 'Koreksi Langsung di Spreadsheet Rekap'
      }
    }));
  };

  // 4. Save Corrections
  const handleSaveCorrections = async () => {
    const changesArray = Object.values(pendingChanges);
    if (changesArray.length === 0) return;

    setIsSaving(true);
    try {
      // Inject reason into all changes
      const payload = changesArray.map(c => ({
        ...c,
        reason: reasonInput || 'Koreksi data spreadsheet'
      }));

      const res = await api.saveRekapCorrections(payload);
      if (res && res.ok) {
        setPendingChanges({});
        setReasonInput('');
        setIsEditMode(false);
        await loadRekapData(selectedClassId);
      } else {
        alert(res?.data?.message || 'Gagal menyimpan perubahan');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan perubahan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Excel Export Functionality (Multi-sheet Binary XLSX Workbook)
  const handleExportExcel = () => {
    if (!filteredParticipants || filteredParticipants.length === 0) {
      alert('Tidak ada data peserta untuk diekspor!');
      return;
    }

    const eventTitle = rekapData.training?.title || 'Latihan Kader I (Basic Training)';
    const selectedClassName = selectedClassId === 'all' 
      ? 'Semua Kelas' 
      : (rekapData.classes?.find(c => String(c.id) === String(selectedClassId))?.name || 'Kelas');
    const komSubTitle = selectedKomisariat === 'ALL' 
      ? 'Himpunan Mahasiswa Islam Cabang Bandar Lampung' 
      : selectedKomisariat;
    const nowStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + 
                   new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.') + ' WIB';

    const preQuiz = (rekapData.quizzes || []).find(q => q.type === 'pretest' || q.type === 'pre-test') || 
                    (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('pre')) || 
                    { id: 6, title: 'Pre-Test' };
    const midQuiz = (rekapData.quizzes || []).find(q => q.type === 'midtest' || q.type === 'mid-test' || q.type === 'evaluasi') || 
                    (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('mid') || (q.title || '').toLowerCase().includes('tengah')) || 
                    { id: 8, title: 'Mid-Test' };
    const postQuiz = (rekapData.quizzes || []).find(q => q.type === 'posttest' || q.type === 'post-test') || 
                     (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('post')) || 
                     { id: 7, title: 'Post-Test' };

    const maxNameLen = filteredParticipants.reduce((max, p) => Math.max(max, (p.name || '').length), 14);
    const maxInstansiLen = filteredParticipants.reduce((max, p) => Math.max(max, (p.instansi || '-').length), 16);
    const colNameW = Math.max(220, Math.ceil(maxNameLen * 9.5) + 30);
    const colInstansiW = Math.max(220, Math.ceil(maxInstansiLen * 9.5) + 30);

    const wb = XLSX.utils.book_new();

    // 1) SHEET TOTAL KESELURUHAN
    // Format identik berkas Basic Training: 3 header rows + nomor kolom
    const TOTAL_COLS = 20; // kolom 0-19 (No, Nama, Utusan, Scr, Tes, JmlKog, RataKog, Absen, AktForum, JmlPsi, RataPsi, AktAfk, JmlAfk, RataAfk, Total, RataTotal, Score, Status, Predikat)
    const rowsTotal = [
      // Row 0: Judul utama
      ['Total Nilai Keseluruhan'],
      // Row 1: Sub-judul event
      [`${eventTitle} / ${komSubTitle}`],
      // Row 2: Kosong (spasi)
      [],
      // Row 3: Kosong (spasi)
      [],
      // Row 4: Header baris 1 (group)
      [
        'No', 'Nama Lengkap', 'Utusan',
        'KOGNITIF', '', '', '',
        'PSIKOMOTORIK', '', '', '',
        'AFEKTIF', '', '',
        'TOTAL', 'Rata-Rata', 'SCORE', 'STATUS', 'PREDIKAT'
      ],
      // Row 5: Header baris 2 (sub-kolom)
      [
        '', '', '',
        'Screening', 'Tes Tulis', 'Jumlah', 'Rata-Rata',
        'Absen', 'Akt Forum', 'Jumlah', 'Rata-Rata',
        'Akt Forum', 'Jumlah', 'Rata-Rata',
        '', '', '', '', ''
      ],
      // Row 6: Nomor kolom
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19']
    ];

    filteredParticipants.forEach((p, idx) => {
      // 1. Kognitif: Screening & Tes Tulis
      const assGlobal = rekapData.assessment_map[`${p.id}_global`];
      const conGlobal = assGlobal?.contributions || {};
      const kIsl = `${p.id}_A1 Screening_screening_keislaman__`;
      const kHmi = `${p.id}_A1 Screening_screening_kehmi__`;
      const kInd = `${p.id}_A1 Screening_screening_keindonesiaan__`;
      const kOrg = `${p.id}_A1 Screening_screening_keorganisasian__`;
      const kSup = `${p.id}_A1 Screening_screening_suplemen__`;

      const rawIsl = pendingChanges[kIsl] !== undefined ? pendingChanges[kIsl].new_value : (conGlobal.screening_keislaman ?? '');
      const rawHmi = pendingChanges[kHmi] !== undefined ? pendingChanges[kHmi].new_value : (conGlobal.screening_kehmi ?? '');
      const rawInd = pendingChanges[kInd] !== undefined ? pendingChanges[kInd].new_value : (conGlobal.screening_keindonesiaan ?? '');
      const rawOrg = pendingChanges[kOrg] !== undefined ? pendingChanges[kOrg].new_value : (conGlobal.screening_keorganisasian ?? '');
      const rawSup = pendingChanges[kSup] !== undefined ? pendingChanges[kSup].new_value : (conGlobal.screening_suplemen ?? '');

      const hasScr = [rawIsl, rawHmi, rawInd, rawOrg, rawSup].some(v => v !== '' && v !== null && v !== undefined);
      const sumScrRaw = (Number(rawIsl) || 0) + (Number(rawHmi) || 0) + (Number(rawInd) || 0) + (Number(rawOrg) || 0) + (Number(rawSup) || 0);
      const computedScrAvg = hasScr ? Math.round(sumScrRaw / 5) : 0;
      const kogScr = Number(pendingChanges[`${p.id}_TOTAL_kognitif__`]?.new_value ?? (hasScr ? computedScrAvg : (assGlobal?.kognitif ?? 0)));

      // Tes Tulis (Rata-rata 3 Kuis)
      let sumQuiz = 0;
      let countQuiz = 0;
      [preQuiz, midQuiz, postQuiz].forEach(qz => {
        if (qz && qz.id) {
          const kQuiz = `${p.id}_A6 Nilai Tes Tulis_score__${qz.id}`;
          const val = pendingChanges[kQuiz] !== undefined ? pendingChanges[kQuiz].new_value : rekapData.quiz_map[`${p.id}_${qz.id}`];
          if (val !== undefined && val !== null && val !== '') {
            sumQuiz += Number(val) || 0;
            countQuiz++;
          }
        }
      });
      const avgTes = countQuiz > 0 ? Math.round(sumQuiz / countQuiz) : 0;
      const kogSum = kogScr + avgTes;
      const kogAvg = Number(((kogSum) / 2).toFixed(1));

      // 2. Psikomotorik: Absensi & Akt.Forum (Tugas)
      let sumTask = 0;
      let taskCount = 0;
      (rekapData.sessions || []).forEach(s => {
        const assS = rekapData.assessment_map[`${p.id}_${s.id}`] ||
          (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null);
        const conS = assS?.contributions || {};
        const cellK = `${p.id}_A5 Tugas_tugas_${s.id}_`;
        const rawScore = pendingChanges[cellK] !== undefined ? pendingChanges[cellK].new_value : conS.tugas;
        if (rawScore !== null && rawScore !== undefined && rawScore !== '') {
          sumTask += Number(rawScore) || 0;
          taskCount++;
        }
      });
      const computedTaskAvg = taskCount > 0 ? Math.round(sumTask / taskCount) : 0;
      const psiAktForum = Number(pendingChanges[`${p.id}_TOTAL_psikomotorik__`]?.new_value ?? (taskCount > 0 ? computedTaskAvg : (assGlobal?.psikomotorik ?? 0)));

      let hadirCount = 0;
      let hasAttendanceRecord = false;
      (rekapData.sessions || []).forEach(s => {
        const cellKey = `${p.id}_A2 Absensi_attendance_${s.id}_`;
        const currentStatus = pendingChanges[cellKey] ? pendingChanges[cellKey].new_value : (rekapData.attendance_map[`${p.id}_${s.id}`] || '');
        if (currentStatus !== null && currentStatus !== undefined && currentStatus !== '') {
          hasAttendanceRecord = true;
          if (currentStatus === 'present' || currentStatus === 'Hadir' || currentStatus === '1') {
            hadirCount++;
          }
        }
      });
      const totalSessionsCount = (rekapData.sessions || []).length;
      const computedAbsenPct = (totalSessionsCount > 0 && hasAttendanceRecord) ? Math.round((hadirCount / totalSessionsCount) * 100) : 0;
      const psiAbsen = computedAbsenPct;
      const psiSum = psiAbsen + psiAktForum;
      const psiAvg = (taskCount > 0 && hasAttendanceRecord) ? Number(((psiSum) / 2).toFixed(1)) : (hasAttendanceRecord ? psiAbsen : psiAktForum);

      // 3. Afektif: Forum Sesi
      let sumForumAvg = 0;
      let forumCount = 0;
      (rekapData.sessions || []).forEach(s => {
        const assS = rekapData.assessment_map[`${p.id}_${s.id}`] ||
          (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null);
        const conS = assS?.contributions || {};
        const vios = Array.isArray(assS?.violations) ? assS.violations : [];
        const consList = Array.isArray(conS) ? conS : (Array.isArray(conS.contributions) ? conS.contributions : []);

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

        const a1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_1_${s.id}_`]?.new_value ?? conS.afektif_1 ?? logA1 ?? 0);
        const a2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_2_${s.id}_`]?.new_value ?? conS.afektif_2 ?? logA2 ?? 0);
        const a3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_3_${s.id}_`]?.new_value ?? conS.afektif_3 ?? logA3 ?? 0);
        const a4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_4_${s.id}_`]?.new_value ?? conS.afektif_4 ?? logA4 ?? 0);
        const a5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_5_${s.id}_`]?.new_value ?? conS.afektif_5 ?? logA5 ?? 0);
        const sumAfk = a1 + a2 + a3 + a4 + a5;

        const psi1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_1_${s.id}_`]?.new_value ?? conS.psiko_1 ?? logP1 ?? 0);
        const psi2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_2_${s.id}_`]?.new_value ?? conS.psiko_2 ?? logP2 ?? 0);
        const psi3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_3_${s.id}_`]?.new_value ?? conS.psiko_3 ?? logP3 ?? 0);
        const psi4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_4_${s.id}_`]?.new_value ?? conS.psiko_4 ?? logP4 ?? 0);
        const psi5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_5_${s.id}_`]?.new_value ?? conS.psiko_5 ?? logP5 ?? 0);
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
        } else {
          // Sesi belum dinilai: berikan nilai awal standar 82.5 (Afk 100, Kog 75, Psi 50)
          sumForumAvg += 82.5;
          forumCount++;
        }
      });
      const computedForumAvg = forumCount > 0 ? Math.round(sumForumAvg / forumCount) : (assGlobal?.afektif !== undefined && assGlobal?.afektif !== null && Number(assGlobal.afektif) > 0 ? Number(assGlobal.afektif) : 83);
      const afkForum = Number(pendingChanges[`${p.id}_TOTAL_afektif__`]?.new_value ?? computedForumAvg);
      const afkSum = afkForum;
      const afkAvg = Number(afkForum.toFixed(1));

      // Total Score = (Kognitif Rata2 x 30%) + (Psikomotorik Rata2 x 20%) + (Afektif Rata2 x 50%)
      const totalScore = Math.round((kogAvg * 0.3) + (psiAvg * 0.2) + (afkAvg * 0.5));
      const grandTotal = Number((kogSum + psiSum + afkSum).toFixed(2));
      const rataTotal = Number((grandTotal / 9).toFixed(2));
      const statusLulus = totalScore >= 70 ? 'LULUS' : 'LULUS BERSYARAT';
      const predikat = totalScore >= 85 ? 'AMAT BAIK' : (totalScore >= 75 ? 'BAIK' : 'CUKUP');

      rowsTotal.push([
        idx + 1, p.name || '-', p.instansi || '-',
        kogScr, avgTes, kogSum, kogAvg,
        psiAbsen, psiAktForum, psiSum, psiAvg,
        afkForum, afkSum, afkAvg,
        grandTotal, rataTotal, totalScore, statusLulus, predikat
      ]);
    });

    rowsTotal.push([]);
    rowsTotal.push(['TOTAL PESERTA TERDAFTAR:', '', '', `${filteredParticipants.length} Orang`]);

    const wsTotal = XLSX.utils.aoa_to_sheet(rowsTotal);
    const LAST_COL = 18; // 0-based index kolom terakhir (PREDIKAT = kolom ke-19)
    wsTotal['!cols'] = [
      { wch: 7 }, { wch: Math.max(26, Math.round(colNameW / 9.5)) }, { wch: Math.max(26, Math.round(colInstansiW / 9.5)) },
      ...Array(16).fill({ wch: 14 })
    ];
    // Merges: judul, header group KOGNITIF/PSIKOMOTORIK/AFEKTIF, TOTAL/SCORE span row 4-5
    wsTotal['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: LAST_COL } },  // judul
      { s: { r: 1, c: 0 }, e: { r: 1, c: LAST_COL } },  // sub-judul
      // Row 4: group label merges
      { s: { r: 4, c: 0 }, e: { r: 6, c: 0 } },  // No
      { s: { r: 4, c: 1 }, e: { r: 6, c: 1 } },  // Nama
      { s: { r: 4, c: 2 }, e: { r: 6, c: 2 } },  // Utusan
      { s: { r: 4, c: 3 }, e: { r: 4, c: 6 } },  // KOGNITIF (span 4 kol)
      { s: { r: 4, c: 7 }, e: { r: 4, c: 10 } }, // PSIKOMOTORIK (span 4 kol)
      { s: { r: 4, c: 11 }, e: { r: 4, c: 13 } }, // AFEKTIF (span 3 kol)
      { s: { r: 4, c: 14 }, e: { r: 5, c: 14 } }, // TOTAL
      { s: { r: 4, c: 15 }, e: { r: 5, c: 15 } }, // Rata-Rata
      { s: { r: 4, c: 16 }, e: { r: 5, c: 16 } }, // SCORE
      { s: { r: 4, c: 17 }, e: { r: 6, c: 17 } }, // STATUS
      { s: { r: 4, c: 18 }, e: { r: 6, c: 18 } }, // PREDIKAT
      { s: { r: rowsTotal.length - 1, c: 0 }, e: { r: rowsTotal.length - 1, c: 2 } }
    ];
    wsTotal['A1'].s = EXCEL_STYLES.title;
    wsTotal['A2'].s = EXCEL_STYLES.subtitle;
    // Style header rows 4, 5, 6
    for (let c = 0; c <= LAST_COL; c++) {
      const addr4 = XLSX.utils.encode_cell({ r: 4, c });
      const addr5 = XLSX.utils.encode_cell({ r: 5, c });
      const addr6 = XLSX.utils.encode_cell({ r: 6, c });
      if (wsTotal[addr4]) wsTotal[addr4].s = EXCEL_STYLES.headerMain;
      if (wsTotal[addr5]) wsTotal[addr5].s = EXCEL_STYLES.headerSub;
      if (wsTotal[addr6]) wsTotal[addr6].s = EXCEL_STYLES.headerGreen;
    }
    filteredParticipants.forEach((_, idx) => {
      const r = idx + 7; // data mulai row 7 (setelah 3 header rows: 4,5,6)
      const aNo = XLSX.utils.encode_cell({ r, c: 0 });
      const aName = XLSX.utils.encode_cell({ r, c: 1 });
      const aInst = XLSX.utils.encode_cell({ r, c: 2 });
      if (wsTotal[aNo]) wsTotal[aNo].s = EXCEL_STYLES.cellCenter;
      if (wsTotal[aName]) wsTotal[aName].s = EXCEL_STYLES.cellBold;
      if (wsTotal[aInst]) wsTotal[aInst].s = EXCEL_STYLES.cellNormal;
      // Nilai angka (Kog, Psi, Afk, Total, Rata, Score)
      for (let c = 3; c <= 16; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (wsTotal[addr]) {
          // Kolom Rata-Rata (7, 11, 14, 15) = highlight
          wsTotal[addr].s = (c === 6 || c === 10 || c === 13 || c === 14 || c === 15 || c === 16)
            ? EXCEL_STYLES.cellHighlight
            : EXCEL_STYLES.cellCenter;
        }
      }
      const aStat = XLSX.utils.encode_cell({ r, c: 17 });
      const aPred = XLSX.utils.encode_cell({ r, c: 18 });
      if (wsTotal[aStat]) {
        wsTotal[aStat].s = wsTotal[aStat].v === 'LULUS' ? EXCEL_STYLES.statusHadir : EXCEL_STYLES.statusIzin;
      }
      if (wsTotal[aPred]) wsTotal[aPred].s = EXCEL_STYLES.cellCenter;
    });
    XLSX.utils.book_append_sheet(wb, wsTotal, 'TOTAL KESELURUHAN');

    // HELPER BUAT SHEET GENERIK (A1, A3, A4, A5)
    const buildGenericSheet = (sheetTitle) => {
      const rows = [
        [`LEMBAR PENILAIAN - ${sheetTitle.toUpperCase()}`],
        [`Event: ${eventTitle} • Kelas: ${selectedClassName}`],
        [`Waktu Ekspor: ${nowStr}`],
        [],
        ['No', 'Nama Peserta', 'Asal Komisariat / Instansi', 'Afektif (50%)', 'Kognitif (30%)', 'Psikomotorik (20%)', 'Nilai Akhir (NA)', 'Catatan / Catatan Instruktur']
      ];
      filteredParticipants.forEach((p, idx) => {
        const ass = rekapData.assessment_map[`${p.id}_global`];
        const afk = Number(ass?.afektif ?? 100);
        const kog = Number(ass?.kognitif ?? 75);
        const psi = Number(ass?.psikomotorik ?? 50);
        const na = Math.round((kog * 0.3) + (psi * 0.2) + (afk * 0.5));
        const notes = ass?.notes || '-';
        rows.push([idx + 1, p.name || '-', p.instansi || '-', afk, kog, psi, na, notes]);
      });
      rows.push([]);
      rows.push(['TOTAL PESERTA TERDAFTAR:', '', '', `${filteredParticipants.length} Orang`]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 7 }, { wch: Math.max(26, Math.round(colNameW / 9.5)) }, { wch: Math.max(26, Math.round(colInstansiW / 9.5)) },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 30 }
      ];
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
        { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 2 } }
      ];
      ws['A1'].s = EXCEL_STYLES.title;
      ws['A2'].s = EXCEL_STYLES.subtitle;
      ws['A3'].s = EXCEL_STYLES.meta;
      for (let c = 0; c < 8; c++) {
        const addr = XLSX.utils.encode_cell({ r: 4, c });
        if (ws[addr]) ws[addr].s = EXCEL_STYLES.headerMain;
      }
      filteredParticipants.forEach((_, idx) => {
        const r = idx + 5;
        const aNo = XLSX.utils.encode_cell({ r, c: 0 });
        const aName = XLSX.utils.encode_cell({ r, c: 1 });
        const aInst = XLSX.utils.encode_cell({ r, c: 2 });
        if (ws[aNo]) ws[aNo].s = EXCEL_STYLES.cellCenter;
        if (ws[aName]) ws[aName].s = EXCEL_STYLES.cellBold;
        if (ws[aInst]) ws[aInst].s = EXCEL_STYLES.cellNormal;
        for (let c = 3; c < 7; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (ws[addr]) ws[addr].s = EXCEL_STYLES.cellCenter;
        }
        const aNa = XLSX.utils.encode_cell({ r, c: 6 });
        if (ws[aNa]) ws[aNa].s = EXCEL_STYLES.cellHighlight;
        const aNote = XLSX.utils.encode_cell({ r, c: 7 });
        if (ws[aNote]) ws[aNote].s = EXCEL_STYLES.cellNormal;
      });
      return ws;
    };

    // 2) SHEET A1 SCREENING (FORMAT MATRIKS SCREENING - IDENTIK GAMBAR 2)
    const rowsScreening = [
      ['LEMBAR PENILAIAN SCREENING (A1 SCREENING)'],
      [`Event: ${eventTitle} • Kelas: ${selectedClassName}`],
      [`Waktu Ekspor: ${nowStr}`],
      [],
      [
        'No', 'Nama Peserta', 'Utusan',
        'Screening', '', '', '', '',
        'Jumlah', 'Rata-Rata'
      ],
      [
        '', '', '',
        'Keislaman', 'KeHMIan', 'KeIndonesiaan', 'Keorganisasian', 'Suplemen',
        '', ''
      ],
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    ];

    filteredParticipants.forEach((p, idx) => {
      const ass = rekapData.assessment_map[`${p.id}_global`];
      const con = ass?.contributions || {};

      const kIsl = `${p.id}_A1 Screening_screening_keislaman__`;
      const kHmi = `${p.id}_A1 Screening_screening_kehmi__`;
      const kInd = `${p.id}_A1 Screening_screening_keindonesiaan__`;
      const kOrg = `${p.id}_A1 Screening_screening_keorganisasian__`;
      const kSup = `${p.id}_A1 Screening_screening_suplemen__`;

      const rawIsl = pendingChanges[kIsl] !== undefined ? pendingChanges[kIsl].new_value : (con.screening_keislaman ?? '');
      const rawHmi = pendingChanges[kHmi] !== undefined ? pendingChanges[kHmi].new_value : (con.screening_kehmi ?? '');
      const rawInd = pendingChanges[kInd] !== undefined ? pendingChanges[kInd].new_value : (con.screening_keindonesiaan ?? '');
      const rawOrg = pendingChanges[kOrg] !== undefined ? pendingChanges[kOrg].new_value : (con.screening_keorganisasian ?? '');
      const rawSup = pendingChanges[kSup] !== undefined ? pendingChanges[kSup].new_value : (con.screening_suplemen ?? '');

      const vIsl = rawIsl !== '' && rawIsl !== null ? Number(rawIsl) : 0;
      const vHmi = rawHmi !== '' && rawHmi !== null ? Number(rawHmi) : 0;
      const vInd = rawInd !== '' && rawInd !== null ? Number(rawInd) : 0;
      const vOrg = rawOrg !== '' && rawOrg !== null ? Number(rawOrg) : 0;
      const vSup = rawSup !== '' && rawSup !== null ? Number(rawSup) : 0;

      const hasAnyScore = [rawIsl, rawHmi, rawInd, rawOrg, rawSup].some(v => v !== '' && v !== null && v !== undefined);
      const sumScr = vIsl + vHmi + vInd + vOrg + vSup;
      const avgScr = hasAnyScore ? Number((sumScr / 5).toFixed(2)) : 0;

      rowsScreening.push([
        idx + 1, p.name || '-', p.instansi || '-',
        rawIsl !== '' && rawIsl !== null && rawIsl !== undefined ? vIsl : 0,
        rawHmi !== '' && rawHmi !== null && rawHmi !== undefined ? vHmi : 0,
        rawInd !== '' && rawInd !== null && rawInd !== undefined ? vInd : 0,
        rawOrg !== '' && rawOrg !== null && rawOrg !== undefined ? vOrg : 0,
        rawSup !== '' && rawSup !== null && rawSup !== undefined ? vSup : 0,
        sumScr,
        avgScr
      ]);
    });
    rowsScreening.push([]);
    rowsScreening.push(['TOTAL PESERTA TERDAFTAR:', '', '', `${filteredParticipants.length} Orang`]);

    const wsScreening = XLSX.utils.aoa_to_sheet(rowsScreening);
    wsScreening['!cols'] = [
      { wch: 6 }, { wch: Math.max(24, Math.round(colNameW / 9.5)) }, { wch: Math.max(22, Math.round(colInstansiW / 9.5)) },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 15 }, { wch: 11 },
      { wch: 12 }, { wch: 12 }
    ];
    wsScreening['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
      { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
      { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
      { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },
      { s: { r: 4, c: 3 }, e: { r: 4, c: 7 } },
      { s: { r: 4, c: 8 }, e: { r: 5, c: 8 } },
      { s: { r: 4, c: 9 }, e: { r: 5, c: 9 } },
      { s: { r: rowsScreening.length - 1, c: 0 }, e: { r: rowsScreening.length - 1, c: 2 } }
    ];
    wsScreening['A1'].s = EXCEL_STYLES.title;
    wsScreening['A2'].s = EXCEL_STYLES.subtitle;
    wsScreening['A3'].s = EXCEL_STYLES.meta;
    for (let c = 0; c < 10; c++) {
      const addr1 = XLSX.utils.encode_cell({ r: 4, c });
      const addr2 = XLSX.utils.encode_cell({ r: 5, c });
      const addr3 = XLSX.utils.encode_cell({ r: 6, c });
      if (wsScreening[addr1]) wsScreening[addr1].s = EXCEL_STYLES.headerMain;
      if (wsScreening[addr2]) wsScreening[addr2].s = EXCEL_STYLES.headerSub;
      if (wsScreening[addr3]) wsScreening[addr3].s = EXCEL_STYLES.headerGreen;
    }
    filteredParticipants.forEach((_, idx) => {
      const r = idx + 7;
      const aNo = XLSX.utils.encode_cell({ r, c: 0 });
      const aName = XLSX.utils.encode_cell({ r, c: 1 });
      const aInst = XLSX.utils.encode_cell({ r, c: 2 });
      if (wsScreening[aNo]) wsScreening[aNo].s = EXCEL_STYLES.cellCenter;
      if (wsScreening[aName]) wsScreening[aName].s = EXCEL_STYLES.cellBold;
      if (wsScreening[aInst]) wsScreening[aInst].s = EXCEL_STYLES.cellNormal;
      for (let c = 3; c < 8; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (wsScreening[addr]) wsScreening[addr].s = EXCEL_STYLES.cellCenter;
      }
      const aTot = XLSX.utils.encode_cell({ r, c: 8 });
      const aAvg = XLSX.utils.encode_cell({ r, c: 9 });
      if (wsScreening[aTot]) wsScreening[aTot].s = EXCEL_STYLES.cellHighlight;
      if (wsScreening[aAvg]) wsScreening[aAvg].s = EXCEL_STYLES.cellTotal;
    });
    const lastRScreening = rowsScreening.length - 1;
    for (let c = 0; c < 10; c++) {
      const addr = XLSX.utils.encode_cell({ r: lastRScreening, c });
      if (wsScreening[addr]) wsScreening[addr].s = EXCEL_STYLES.footer;
    }
    XLSX.utils.book_append_sheet(wb, wsScreening, 'A1 Screening');

    // 3) SHEET A2 ABSENSI
    const sessionsList = rekapData.sessions || [];
    const rowsAbsensi = [
      ['REKAPITULASI ABSENSI PESERTA (A2 ABSENSI)'],
      [`Event: ${eventTitle} • Kelas: ${selectedClassName}`],
      [`Waktu Ekspor: ${nowStr}`],
      [],
      [
        'No', 'Nama Peserta', 'Asal Komisariat / Instansi',
        ...sessionsList.map((s, idx) => `Sesi ${idx + 1}: ${(s.title || '').slice(0, 15)}`),
        'Total Hadir', 'Persentase'
      ]
    ];
    filteredParticipants.forEach((p, idx) => {
      let hadirCount = 0;
      const sessionVals = sessionsList.map(ses => {
        const cellKey = `${p.id}_A2 Absensi_attendance_${ses.id}_`;
        const curStatus = pendingChanges[cellKey] !== undefined 
          ? pendingChanges[cellKey].new_value 
          : (rekapData.attendance_map[`${p.id}_${ses.id}`] || 'absent');
        const isPresent = curStatus === 'present' || curStatus === 'Hadir' || curStatus === '1';
        if (isPresent) {
          hadirCount++;
          return 'Hadir';
        }
        return (curStatus === 'permission' || curStatus === 'Izin' || curStatus === 'Sakit') ? 'Izin' : 'Alpha';
      });
      const pctHadir = sessionsList.length > 0 ? Math.round((hadirCount / sessionsList.length) * 100) : 0;
      rowsAbsensi.push([
        idx + 1, p.name || '-', p.instansi || '-',
        ...sessionVals,
        `${hadirCount} / ${sessionsList.length}`,
        `${pctHadir}%`
      ]);
    });
    rowsAbsensi.push([]);
    rowsAbsensi.push(['TOTAL PESERTA TERDAFTAR:', '', '', `${filteredParticipants.length} Orang`]);

    const wsAbsensi = XLSX.utils.aoa_to_sheet(rowsAbsensi);
    const absensiTotalCols = 5 + sessionsList.length;
    wsAbsensi['!cols'] = [
      { wch: 7 }, { wch: Math.max(26, Math.round(colNameW / 9.5)) }, { wch: Math.max(26, Math.round(colInstansiW / 9.5)) },
      ...sessionsList.map(() => ({ wch: 16 })),
      { wch: 14 }, { wch: 14 }
    ];
    wsAbsensi['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: absensiTotalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: absensiTotalCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: absensiTotalCols - 1 } },
      { s: { r: rowsAbsensi.length - 1, c: 0 }, e: { r: rowsAbsensi.length - 1, c: 2 } }
    ];
    wsAbsensi['A1'].s = EXCEL_STYLES.title;
    wsAbsensi['A2'].s = EXCEL_STYLES.subtitle;
    wsAbsensi['A3'].s = EXCEL_STYLES.meta;
    for (let c = 0; c < absensiTotalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: 4, c });
      if (wsAbsensi[addr]) wsAbsensi[addr].s = EXCEL_STYLES.headerMain;
    }
    filteredParticipants.forEach((p, idx) => {
      const r = idx + 5;
      const aNo = XLSX.utils.encode_cell({ r, c: 0 });
      const aName = XLSX.utils.encode_cell({ r, c: 1 });
      const aInst = XLSX.utils.encode_cell({ r, c: 2 });
      if (wsAbsensi[aNo]) wsAbsensi[aNo].s = EXCEL_STYLES.cellCenter;
      if (wsAbsensi[aName]) wsAbsensi[aName].s = EXCEL_STYLES.cellBold;
      if (wsAbsensi[aInst]) wsAbsensi[aInst].s = EXCEL_STYLES.cellNormal;
      sessionsList.forEach((_, sIdx) => {
        const addr = XLSX.utils.encode_cell({ r, c: 3 + sIdx });
        if (wsAbsensi[addr]) {
          const val = String(wsAbsensi[addr].v || '');
          if (val === 'Hadir') wsAbsensi[addr].s = EXCEL_STYLES.statusHadir;
          else if (val === 'Izin') wsAbsensi[addr].s = EXCEL_STYLES.statusIzin;
          else wsAbsensi[addr].s = EXCEL_STYLES.statusAbsen;
        }
      });
      const aTot = XLSX.utils.encode_cell({ r, c: absensiTotalCols - 2 });
      const aPct = XLSX.utils.encode_cell({ r, c: absensiTotalCols - 1 });
      if (wsAbsensi[aTot]) wsAbsensi[aTot].s = EXCEL_STYLES.cellHighlight;
      if (wsAbsensi[aPct]) wsAbsensi[aPct].s = EXCEL_STYLES.cellTotal;
    });
    XLSX.utils.book_append_sheet(wb, wsAbsensi, 'A2 Absensi');

    // 4) SHEET A3 AKTIVITAS FORUM (PER-SESI DETAIL MATRIX)
    const rowsA3 = [
      ['PENILAIAN AKTIVITAS FORUM (A3 AKTIVITAS FORUM)'],
      [`Event: ${eventTitle} • Kelas: ${selectedClassName} • Total Peserta: ${filteredParticipants.length} Orang`],
      [`Waktu Ekspor: ${nowStr} • Formula: Afektif (60 - Poin), Psikomotorik (60 + Poin)`],
      []
    ];
    const mergesA3 = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 18 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 18 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 18 } }
    ];
    let curRowA3 = 4;
    const sessionRanges = [];

    sessionsList.forEach((s, sIdx) => {
      const penilaiStr = s.penilai || (rekapData.assessment_map[`${filteredParticipants[0]?.id}_${s.id}`]?.contributions?.penilai) || 'MOT / Pemandu Kelas';
      const dateTimeStr = s.session_date ? `${s.session_date} ${s.start_time || ''}` : (s.time || nowStr);

      // Clean redundant SESI prefix from session title
      let cleanTitle = (s.title || `Materi Sesi ${sIdx + 1}`).trim();
      cleanTitle = cleanTitle.replace(/^SESI\s*\d+\s*[:\-]\s*/i, '').trim();
      const sessionBannerText = `SESI ${sIdx + 1}: ${cleanTitle.toUpperCase()}`;

      // 1. Sesi Header Row (Banner)
      const sessTitleRow = [sessionBannerText];
      for (let k = 1; k <= 12; k++) sessTitleRow.push('');
      sessTitleRow.push(`Penilai: ${penilaiStr}`);
      sessTitleRow.push('');
      sessTitleRow.push('');
      sessTitleRow.push(`Waktu: ${dateTimeStr}`);
      sessTitleRow.push('');
      sessTitleRow.push('');
      rowsA3.push(sessTitleRow);

      const bannerRow = curRowA3;
      mergesA3.push({ s: { r: bannerRow, c: 0 }, e: { r: bannerRow, c: 12 } });
      mergesA3.push({ s: { r: bannerRow, c: 13 }, e: { r: bannerRow, c: 15 } });
      mergesA3.push({ s: { r: bannerRow, c: 16 }, e: { r: bannerRow, c: 18 } });

      // 2. Table Header Row 1
      const headerRow1 = curRowA3 + 1;
      rowsA3.push([
        'No.', 'Nama Lengkap', 'Utusan',
        'AFEKTIF (PENGURANGAN NILAI)', '', '', '', '', '', '',
        'PSIKOMOTORIK (PENAMBAHAN NILAI)', '', '', '', '', '', '',
        'Jumlah', 'Rata-Rata'
      ]);
      mergesA3.push({ s: { r: headerRow1, c: 0 }, e: { r: headerRow1 + 1, c: 0 } });
      mergesA3.push({ s: { r: headerRow1, c: 1 }, e: { r: headerRow1 + 1, c: 1 } });
      mergesA3.push({ s: { r: headerRow1, c: 2 }, e: { r: headerRow1 + 1, c: 2 } });
      mergesA3.push({ s: { r: headerRow1, c: 3 }, e: { r: headerRow1, c: 9 } });
      mergesA3.push({ s: { r: headerRow1, c: 10 }, e: { r: headerRow1, c: 16 } });
      mergesA3.push({ s: { r: headerRow1, c: 17 }, e: { r: headerRow1 + 1, c: 17 } });
      mergesA3.push({ s: { r: headerRow1, c: 18 }, e: { r: headerRow1 + 1, c: 18 } });

      // 3. Table Subheader Row 2
      const headerRow2 = curRowA3 + 2;
      rowsA3.push([
        '', '', '',
        '1', '2', '3', '4', '5', 'Jumlah', 'Hasil Akhir',
        '1', '2', '3', '4', '5', 'Jumlah', 'Hasil Akhir',
        '', ''
      ]);

      curRowA3 += 3;
      const dataStartRow = curRowA3;

      let sumAfk1 = 0, sumAfk2 = 0, sumAfk3 = 0, sumAfk4 = 0, sumAfk5 = 0, sumAfkTot = 0, sumAfkAkhir = 0;
      let sumPsi1 = 0, sumPsi2 = 0, sumPsi3 = 0, sumPsi4 = 0, sumPsi5 = 0, sumPsiTot = 0, sumPsiAkhir = 0;
      let sumGrandTot = 0, sumGrandAvg = 0;

      // 4. Data Rows
      filteredParticipants.forEach((p, pIdx) => {
        const ass = rekapData.assessment_map[`${p.id}_${s.id}`] ||
          (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null);
        const con = ass?.contributions || {};
        const vios = Array.isArray(ass?.violations) ? ass.violations : [];
        const consList = Array.isArray(con) ? con : (Array.isArray(con.contributions) ? con.contributions : []);

        let logA1 = 0, logA2 = 0, logA3 = 0, logA4 = 0, logA5 = 0;
        if (con.afektif_1 === undefined && vios.length > 0) {
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
        if (con.psiko_1 === undefined && consList.length > 0) {
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

        const a1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_1_${s.id}_`]?.new_value ?? con.afektif_1 ?? logA1 ?? 0);
        const a2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_2_${s.id}_`]?.new_value ?? con.afektif_2 ?? logA2 ?? 0);
        const a3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_3_${s.id}_`]?.new_value ?? con.afektif_3 ?? logA3 ?? 0);
        const a4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_4_${s.id}_`]?.new_value ?? con.afektif_4 ?? logA4 ?? 0);
        const a5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_5_${s.id}_`]?.new_value ?? con.afektif_5 ?? logA5 ?? 0);
        const sumAfk = a1 + a2 + a3 + a4 + a5;
        const afkAkhir = Math.max(0, 60 - sumAfk);

        const psi1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_1_${s.id}_`]?.new_value ?? con.psiko_1 ?? logP1 ?? 0);
        const psi2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_2_${s.id}_`]?.new_value ?? con.psiko_2 ?? logP2 ?? 0);
        const psi3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_3_${s.id}_`]?.new_value ?? con.psiko_3 ?? logP3 ?? 0);
        const psi4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_4_${s.id}_`]?.new_value ?? con.psiko_4 ?? logP4 ?? 0);
        const psi5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_5_${s.id}_`]?.new_value ?? con.psiko_5 ?? logP5 ?? 0);
        const sumPsi = psi1 + psi2 + psi3 + psi4 + psi5;
        const psiAkhir = 60 + sumPsi;

        const totSum = afkAkhir + psiAkhir;
        const totAvg = Number((totSum / 2).toFixed(2));

        sumAfk1 += a1; sumAfk2 += a2; sumAfk3 += a3; sumAfk4 += a4; sumAfk5 += a5;
        sumAfkTot += sumAfk; sumAfkAkhir += afkAkhir;
        sumPsi1 += psi1; sumPsi2 += psi2; sumPsi3 += psi3; sumPsi4 += psi4; sumPsi5 += psi5;
        sumPsiTot += sumPsi; sumPsiAkhir += psiAkhir;
        sumGrandTot += totSum; sumGrandAvg += totAvg;

        rowsA3.push([
          pIdx + 1, p.name || '-', p.instansi || '-',
          a1, a2, a3, a4, a5, sumAfk, afkAkhir,
          psi1, psi2, psi3, psi4, psi5, sumPsi, psiAkhir,
          totSum.toFixed(2), totAvg.toFixed(2)
        ]);
        curRowA3++;
      });

      const dataEndRow = curRowA3 - 1;
      const pCount = filteredParticipants.length || 1;

      // 5. Footer Row: Rata-Rata Kelas Sesi Ini
      const footerRow = curRowA3;
      rowsA3.push([
        'RATA-RATA KELAS:', '', '',
        (sumAfk1 / pCount).toFixed(1),
        (sumAfk2 / pCount).toFixed(1),
        (sumAfk3 / pCount).toFixed(1),
        (sumAfk4 / pCount).toFixed(1),
        (sumAfk5 / pCount).toFixed(1),
        (sumAfkTot / pCount).toFixed(1),
        (sumAfkAkhir / pCount).toFixed(1),
        (sumPsi1 / pCount).toFixed(1),
        (sumPsi2 / pCount).toFixed(1),
        (sumPsi3 / pCount).toFixed(1),
        (sumPsi4 / pCount).toFixed(1),
        (sumPsi5 / pCount).toFixed(1),
        (sumPsiTot / pCount).toFixed(1),
        (sumPsiAkhir / pCount).toFixed(1),
        (sumGrandTot / pCount).toFixed(2),
        (sumGrandAvg / pCount).toFixed(2)
      ]);
      mergesA3.push({ s: { r: footerRow, c: 0 }, e: { r: footerRow, c: 2 } });
      curRowA3++;

      sessionRanges.push({
        bannerRow,
        headerRow1,
        headerRow2,
        dataStartRow,
        dataEndRow,
        footerRow
      });

      // Spacing row between sessions
      rowsA3.push([]);
      curRowA3++;
    });

    const wsA3 = XLSX.utils.aoa_to_sheet(rowsA3);
    wsA3['!cols'] = [
      { wch: 6 },
      { wch: Math.max(26, Math.round(colNameW / 9.5)) },
      { wch: Math.max(24, Math.round(colInstansiW / 9.5)) },
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 9 }, { wch: 12 },
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 9 }, { wch: 12 },
      { wch: 11 }, { wch: 11 }
    ];
    wsA3['!merges'] = mergesA3;

    // Apply Styles to Sheet A3
    wsA3['A1'].s = EXCEL_STYLES.title;
    wsA3['A2'].s = EXCEL_STYLES.subtitle;
    wsA3['A3'].s = EXCEL_STYLES.meta;

    sessionRanges.forEach(({ bannerRow, headerRow1, headerRow2, dataStartRow, dataEndRow, footerRow }) => {
      // Style 1: Session Banner Row
      for (let c = 0; c <= 12; c++) {
        const addr = XLSX.utils.encode_cell({ r: bannerRow, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.sessionBannerEmerald;
      }
      for (let c = 13; c <= 15; c++) {
        const addr = XLSX.utils.encode_cell({ r: bannerRow, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.sessionBannerPenilai;
      }
      for (let c = 16; c <= 18; c++) {
        const addr = XLSX.utils.encode_cell({ r: bannerRow, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.sessionBannerTime;
      }

      // Style 2: Table Header Row 1
      for (let c = 0; c <= 2; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow1, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.headerMain;
      }
      for (let c = 3; c <= 9; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow1, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.headerAfektifMain;
      }
      for (let c = 10; c <= 16; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow1, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.headerPsikoMain;
      }
      for (let c = 17; c <= 18; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow1, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.headerMain;
      }

      // Style 3: Table Subheader Row 2
      for (let c = 0; c <= 2; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow2, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.headerMain;
      }
      for (let c = 3; c <= 7; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow2, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.headerAfektifSub;
      }
      const addrAfkJml = XLSX.utils.encode_cell({ r: headerRow2, c: 8 });
      if (wsA3[addrAfkJml]) wsA3[addrAfkJml].s = EXCEL_STYLES.headerAfektifJml;
      const addrAfkAkhir = XLSX.utils.encode_cell({ r: headerRow2, c: 9 });
      if (wsA3[addrAfkAkhir]) wsA3[addrAfkAkhir].s = EXCEL_STYLES.headerAfektifAkhir;

      for (let c = 10; c <= 14; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow2, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.headerPsikoSub;
      }
      const addrPsiJml = XLSX.utils.encode_cell({ r: headerRow2, c: 15 });
      if (wsA3[addrPsiJml]) wsA3[addrPsiJml].s = EXCEL_STYLES.headerPsikoJml;
      const addrPsiAkhir = XLSX.utils.encode_cell({ r: headerRow2, c: 16 });
      if (wsA3[addrPsiAkhir]) wsA3[addrPsiAkhir].s = EXCEL_STYLES.headerPsikoAkhir;

      for (let c = 17; c <= 18; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow2, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.headerMain;
      }

      // Style 4: Participant Data Rows
      for (let r = dataStartRow; r <= dataEndRow; r++) {
        const aNo = XLSX.utils.encode_cell({ r, c: 0 });
        const aName = XLSX.utils.encode_cell({ r, c: 1 });
        const aInst = XLSX.utils.encode_cell({ r, c: 2 });
        if (wsA3[aNo]) wsA3[aNo].s = EXCEL_STYLES.cellCenter;
        if (wsA3[aName]) wsA3[aName].s = EXCEL_STYLES.cellBold;
        if (wsA3[aInst]) wsA3[aInst].s = EXCEL_STYLES.cellNormal;

        for (let c = 3; c <= 7; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.cellAfektifVal;
        }
        const aAfkJml = XLSX.utils.encode_cell({ r, c: 8 });
        const aAfkAkhir = XLSX.utils.encode_cell({ r, c: 9 });
        if (wsA3[aAfkJml]) wsA3[aAfkJml].s = EXCEL_STYLES.cellAfektifJml;
        if (wsA3[aAfkAkhir]) wsA3[aAfkAkhir].s = EXCEL_STYLES.cellAfektifAkhir;

        for (let c = 10; c <= 14; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.cellPsikoVal;
        }
        const aPsiJml = XLSX.utils.encode_cell({ r, c: 15 });
        const aPsiAkhir = XLSX.utils.encode_cell({ r, c: 16 });
        if (wsA3[aPsiJml]) wsA3[aPsiJml].s = EXCEL_STYLES.cellPsikoJml;
        if (wsA3[aPsiAkhir]) wsA3[aPsiAkhir].s = EXCEL_STYLES.cellPsikoAkhir;

        const aTot = XLSX.utils.encode_cell({ r, c: 17 });
        const aAvg = XLSX.utils.encode_cell({ r, c: 18 });
        if (wsA3[aTot]) wsA3[aTot].s = EXCEL_STYLES.cellHighlight;
        if (wsA3[aAvg]) wsA3[aAvg].s = EXCEL_STYLES.cellTotal;
      }

      // Style 5: Footer Row (Rata-Rata Kelas Sesi Ini)
      for (let c = 0; c <= 2; c++) {
        const addr = XLSX.utils.encode_cell({ r: footerRow, c });
        if (wsA3[addr]) wsA3[addr].s = EXCEL_STYLES.footer;
      }
      for (let c = 3; c <= 7; c++) {
        const addr = XLSX.utils.encode_cell({ r: footerRow, c });
        if (wsA3[addr]) wsA3[addr].s = { ...EXCEL_STYLES.footer, font: { ...EXCEL_STYLES.footer.font, color: { rgb: '78350F' } } };
      }
      const fAfkJml = XLSX.utils.encode_cell({ r: footerRow, c: 8 });
      const fAfkAkhir = XLSX.utils.encode_cell({ r: footerRow, c: 9 });
      if (wsA3[fAfkJml]) wsA3[fAfkJml].s = EXCEL_STYLES.cellAfektifJml;
      if (wsA3[fAfkAkhir]) wsA3[fAfkAkhir].s = EXCEL_STYLES.cellAfektifAkhir;

      for (let c = 10; c <= 14; c++) {
        const addr = XLSX.utils.encode_cell({ r: footerRow, c });
        if (wsA3[addr]) wsA3[addr].s = { ...EXCEL_STYLES.footer, font: { ...EXCEL_STYLES.footer.font, color: { rgb: '0369A1' } } };
      }
      const fPsiJml = XLSX.utils.encode_cell({ r: footerRow, c: 15 });
      const fPsiAkhir = XLSX.utils.encode_cell({ r: footerRow, c: 16 });
      if (wsA3[fPsiJml]) wsA3[fPsiJml].s = EXCEL_STYLES.cellPsikoJml;
      if (wsA3[fPsiAkhir]) wsA3[fPsiAkhir].s = EXCEL_STYLES.cellPsikoAkhir;

      const fTot = XLSX.utils.encode_cell({ r: footerRow, c: 17 });
      const fAvg = XLSX.utils.encode_cell({ r: footerRow, c: 18 });
      if (wsA3[fTot]) wsA3[fTot].s = EXCEL_STYLES.cellHighlight;
      if (wsA3[fAvg]) wsA3[fAvg].s = EXCEL_STYLES.cellTotal;
    });

    XLSX.utils.book_append_sheet(wb, wsA3, 'A3 Aktivitas Forum');

    // 5) SHEET A4 REKAPAN (REKAPITULASI AKTIVITAS FORUM - IDENTIK GAMBAR 4)
    const rowsA4 = [
      ['REKAPITULASI AKTIVITAS FORUM'],
      [`Event: ${eventTitle} • Kelas: ${selectedClassName}`],
      [`Waktu Ekspor: ${nowStr}`],
      [],
      [
        'No.', 'Nama Peserta', 'Utusan',
        ...sessionsList.map((_, i) => `MATERI Ke-${i + 1}`),
        'JUMLAH', 'RATA-RAT.'
      ]
    ];
    filteredParticipants.forEach((p, idx) => {
      let totalParticipantScore = 0;
      let evaluatedSessionCount = 0;
      const sessionAverages = sessionsList.map((s) => {
        const ass = rekapData.assessment_map[`${p.id}_${s.id}`] ||
          (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null);
        const con = ass?.contributions || {};
        const vios = Array.isArray(ass?.violations) ? ass.violations : [];
        const consList = Array.isArray(con) ? con : (Array.isArray(con.contributions) ? con.contributions : []);

        let logA1 = 0, logA2 = 0, logA3 = 0, logA4 = 0, logA5 = 0;
        if (con.afektif_1 === undefined && vios.length > 0) {
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
        if (con.psiko_1 === undefined && consList.length > 0) {
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

        const a1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_1_${s.id}_`]?.new_value ?? con.afektif_1 ?? logA1 ?? 0);
        const a2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_2_${s.id}_`]?.new_value ?? con.afektif_2 ?? logA2 ?? 0);
        const a3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_3_${s.id}_`]?.new_value ?? con.afektif_3 ?? logA3 ?? 0);
        const a4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_4_${s.id}_`]?.new_value ?? con.afektif_4 ?? logA4 ?? 0);
        const a5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_5_${s.id}_`]?.new_value ?? con.afektif_5 ?? logA5 ?? 0);
        const sumAfk = a1 + a2 + a3 + a4 + a5;

        const psi1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_1_${s.id}_`]?.new_value ?? con.psiko_1 ?? logP1 ?? 0);
        const psi2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_2_${s.id}_`]?.new_value ?? con.psiko_2 ?? logP2 ?? 0);
        const psi3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_3_${s.id}_`]?.new_value ?? con.psiko_3 ?? logP3 ?? 0);
        const psi4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_4_${s.id}_`]?.new_value ?? con.psiko_4 ?? logP4 ?? 0);
        const psi5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_5_${s.id}_`]?.new_value ?? con.psiko_5 ?? logP5 ?? 0);
        const sumPsi = psi1 + psi2 + psi3 + psi4 + psi5;

        const hasSubRubric = (sumAfk > 0 || sumPsi > 0);
        let sessionAvg = 82.50;

        if (hasSubRubric) {
          const afkAkhir = Math.max(0, 100 - sumAfk);
          const psiAkhir = Math.min(100, 50 + sumPsi);
          const kogAwal = 75;
          sessionAvg = Number(((afkAkhir * 0.5) + (kogAwal * 0.3) + (psiAkhir * 0.2)).toFixed(2));
        } else if (ass && (ass.nilai_akhir !== null && ass.nilai_akhir !== undefined && Number(ass.nilai_akhir) > 0)) {
          sessionAvg = Number(Number(ass.nilai_akhir).toFixed(2));
        } else if (ass && (ass.afektif !== null && ass.afektif !== undefined && Number(ass.afektif) > 0)) {
          const sAfk = Number(ass.afektif);
          const sKog = Number(ass.kognitif ?? 75);
          const sPsi = Number(ass.psikomotorik ?? 50);
          sessionAvg = Number(((sAfk * 0.5) + (sKog * 0.3) + (sPsi * 0.2)).toFixed(2));
        }

        totalParticipantScore += sessionAvg;
        evaluatedSessionCount++;
        return Number(sessionAvg.toFixed(2));
      });

      const grandAvg = evaluatedSessionCount > 0 ? Number((totalParticipantScore / evaluatedSessionCount).toFixed(2)) : 82.50;
      rowsA4.push([
        idx + 1, p.name || '-', p.instansi || '-',
        ...sessionAverages,
        Number(totalParticipantScore.toFixed(2)),
        grandAvg
      ]);
    });
    rowsA4.push([]);
    rowsA4.push(['TOTAL PESERTA TERDAFTAR:', '', '', `${filteredParticipants.length} Orang`]);

    const wsA4 = XLSX.utils.aoa_to_sheet(rowsA4);
    const totalColsA4 = 5 + sessionsList.length;
    wsA4['!cols'] = [
      { wch: 6 }, { wch: Math.max(24, Math.round(colNameW / 9.5)) }, { wch: Math.max(22, Math.round(colInstansiW / 9.5)) },
      ...sessionsList.map(() => ({ wch: 12 })),
      { wch: 14 }, { wch: 14 }
    ];
    wsA4['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColsA4 - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalColsA4 - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalColsA4 - 1 } },
      { s: { r: rowsA4.length - 1, c: 0 }, e: { r: rowsA4.length - 1, c: 2 } }
    ];
    wsA4['A1'].s = EXCEL_STYLES.title;
    wsA4['A2'].s = EXCEL_STYLES.subtitle;
    wsA4['A3'].s = EXCEL_STYLES.meta;
    for (let c = 0; c < totalColsA4; c++) {
      const addr = XLSX.utils.encode_cell({ r: 4, c });
      if (wsA4[addr]) wsA4[addr].s = EXCEL_STYLES.headerMain;
    }
    filteredParticipants.forEach((_, idx) => {
      const r = idx + 5;
      const aNo = XLSX.utils.encode_cell({ r, c: 0 });
      const aName = XLSX.utils.encode_cell({ r, c: 1 });
      const aInst = XLSX.utils.encode_cell({ r, c: 2 });
      if (wsA4[aNo]) wsA4[aNo].s = EXCEL_STYLES.cellCenter;
      if (wsA4[aName]) wsA4[aName].s = EXCEL_STYLES.cellBold;
      if (wsA4[aInst]) wsA4[aInst].s = EXCEL_STYLES.cellNormal;
      for (let c = 3; c < 3 + sessionsList.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (wsA4[addr]) wsA4[addr].s = EXCEL_STYLES.cellCenter;
      }
      const aTot = XLSX.utils.encode_cell({ r, c: totalColsA4 - 2 });
      const aAvg = XLSX.utils.encode_cell({ r, c: totalColsA4 - 1 });
      if (wsA4[aTot]) wsA4[aTot].s = EXCEL_STYLES.cellHighlight;
      if (wsA4[aAvg]) wsA4[aAvg].s = EXCEL_STYLES.cellTotal;
    });
    const lastRA4 = rowsA4.length - 1;
    for (let c = 0; c < totalColsA4; c++) {
      const addr = XLSX.utils.encode_cell({ r: lastRA4, c });
      if (wsA4[addr]) wsA4[addr].s = EXCEL_STYLES.footer;
    }
    XLSX.utils.book_append_sheet(wb, wsA4, 'A4 Rekapan');

    // 6) SHEET A5 TUGAS (REKAPITULASI NILAI TUGAS PER-MATERI - IDENTIK GAMBAR 2 UPLOAD 2)
    const rowsA5 = [
      ['REKAPITULASI NILAI TUGAS (A5 TUGAS)'],
      [`Event: ${eventTitle} • Kelas: ${selectedClassName}`],
      [`Waktu Ekspor: ${nowStr}`],
      [],
      [
        'No', 'Nama Peserta', 'Utusan',
        ...sessionsList.map((_, i) => `Materi ${i + 1}`),
        'Jumlah', 'Rata-Rata'
      ]
    ];
    filteredParticipants.forEach((p, idx) => {
      let sumTask = 0;
      const taskScores = sessionsList.map((s) => {
        const ass = rekapData.assessment_map[`${p.id}_${s.id}`] ||
          (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null);
        const con = ass?.contributions || {};
        const cellKey = `${p.id}_A5 Tugas_tugas_${s.id}_`;
        const rawScore = pendingChanges[cellKey] !== undefined
          ? pendingChanges[cellKey].new_value
          : (con.tugas !== undefined && con.tugas !== null && con.tugas !== '' ? con.tugas : null);

        const score = (rawScore !== null && rawScore !== undefined && rawScore !== '') ? Number(rawScore) : 0;
        sumTask += score;
        return score;
      });
      const avgTask = sessionsList.length > 0 ? Number((sumTask / sessionsList.length).toFixed(1)) : 0;
      rowsA5.push([
        idx + 1, p.name || '-', p.instansi || '-',
        ...taskScores,
        sumTask,
        avgTask
      ]);
    });
    rowsA5.push([]);
    rowsA5.push(['TOTAL PESERTA TERDAFTAR:', '', '', `${filteredParticipants.length} Orang`]);

    const wsA5 = XLSX.utils.aoa_to_sheet(rowsA5);
    const totalColsA5 = 5 + sessionsList.length;
    wsA5['!cols'] = [
      { wch: 6 }, { wch: Math.max(24, Math.round(colNameW / 9.5)) }, { wch: Math.max(22, Math.round(colInstansiW / 9.5)) },
      ...sessionsList.map(() => ({ wch: 11 })),
      { wch: 13 }, { wch: 13 }
    ];
    wsA5['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalColsA5 - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalColsA5 - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalColsA5 - 1 } },
      { s: { r: rowsA5.length - 1, c: 0 }, e: { r: rowsA5.length - 1, c: 2 } }
    ];
    wsA5['A1'].s = EXCEL_STYLES.title;
    wsA5['A2'].s = EXCEL_STYLES.subtitle;
    wsA5['A3'].s = EXCEL_STYLES.meta;
    for (let c = 0; c < totalColsA5; c++) {
      const addr = XLSX.utils.encode_cell({ r: 4, c });
      if (wsA5[addr]) wsA5[addr].s = EXCEL_STYLES.headerMain;
    }
    filteredParticipants.forEach((_, idx) => {
      const r = idx + 5;
      const aNo = XLSX.utils.encode_cell({ r, c: 0 });
      const aName = XLSX.utils.encode_cell({ r, c: 1 });
      const aInst = XLSX.utils.encode_cell({ r, c: 2 });
      if (wsA5[aNo]) wsA5[aNo].s = EXCEL_STYLES.cellCenter;
      if (wsA5[aName]) wsA5[aName].s = EXCEL_STYLES.cellBold;
      if (wsA5[aInst]) wsA5[aInst].s = EXCEL_STYLES.cellNormal;
      for (let c = 3; c < 3 + sessionsList.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (wsA5[addr]) wsA5[addr].s = EXCEL_STYLES.cellCenter;
      }
      const aTot = XLSX.utils.encode_cell({ r, c: totalColsA5 - 2 });
      const aAvg = XLSX.utils.encode_cell({ r, c: totalColsA5 - 1 });
      if (wsA5[aTot]) wsA5[aTot].s = EXCEL_STYLES.cellHighlight;
      if (wsA5[aAvg]) wsA5[aAvg].s = EXCEL_STYLES.cellTotal;
    });
    const lastRA5 = rowsA5.length - 1;
    for (let c = 0; c < totalColsA5; c++) {
      const addr = XLSX.utils.encode_cell({ r: lastRA5, c });
      if (wsA5[addr]) wsA5[addr].s = EXCEL_STYLES.footer;
    }
    XLSX.utils.book_append_sheet(wb, wsA5, 'A5 Tugas');

    // 7) SHEET A6 NILAI TES TULIS
    const rowsTesTulis = [
      ['REKAPITULASI NILAI TES TULIS (A6 NILAI TES TULIS)'],
      [`Event: ${eventTitle} • Kelas: ${selectedClassName}`],
      [`Waktu Ekspor: ${nowStr}`],
      [],
      ['No', 'Nama Peserta', 'Utusan / Instansi', preQuiz.title || 'Pre-Test', midQuiz.title || 'Mid-Test', postQuiz.title || 'Post-Test', 'Jumlah', 'Rata-Rata']
    ];
    filteredParticipants.forEach((p, idx) => {
      const preKey = `${p.id}_A6 Nilai Tes Tulis_score__${preQuiz.id}`;
      const midKey = `${p.id}_A6 Nilai Tes Tulis_score__${midQuiz.id}`;
      const postKey = `${p.id}_A6 Nilai Tes Tulis_score__${postQuiz.id}`;

      const qPre = Number(pendingChanges[preKey]?.new_value ?? rekapData.quiz_map[`${p.id}_${preQuiz.id}`] ?? 0);
      const qMid = Number(pendingChanges[midKey]?.new_value ?? rekapData.quiz_map[`${p.id}_${midQuiz.id}`] ?? 0);
      const qPost = Number(pendingChanges[postKey]?.new_value ?? rekapData.quiz_map[`${p.id}_${postQuiz.id}`] ?? 0);
      const sum = qPre + qMid + qPost;
      const avg = Number((sum / 3).toFixed(1));
      rowsTesTulis.push([idx + 1, p.name || '-', p.instansi || '-', qPre, qMid, qPost, sum, avg]);
    });
    rowsTesTulis.push([]);
    rowsTesTulis.push(['TOTAL PESERTA TERDAFTAR:', '', '', `${filteredParticipants.length} Orang`]);

    const wsTesTulis = XLSX.utils.aoa_to_sheet(rowsTesTulis);
    wsTesTulis['!cols'] = [
      { wch: 7 }, { wch: Math.max(26, Math.round(colNameW / 9.5)) }, { wch: Math.max(26, Math.round(colInstansiW / 9.5)) },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 }
    ];
    wsTesTulis['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
      { s: { r: rowsTesTulis.length - 1, c: 0 }, e: { r: rowsTesTulis.length - 1, c: 2 } }
    ];
    wsTesTulis['A1'].s = EXCEL_STYLES.title;
    wsTesTulis['A2'].s = EXCEL_STYLES.subtitle;
    wsTesTulis['A3'].s = EXCEL_STYLES.meta;
    for (let c = 0; c < 8; c++) {
      const addr = XLSX.utils.encode_cell({ r: 4, c });
      if (wsTesTulis[addr]) wsTesTulis[addr].s = EXCEL_STYLES.headerMain;
    }
    filteredParticipants.forEach((_, idx) => {
      const r = idx + 5;
      const aNo = XLSX.utils.encode_cell({ r, c: 0 });
      const aName = XLSX.utils.encode_cell({ r, c: 1 });
      const aInst = XLSX.utils.encode_cell({ r, c: 2 });
      if (wsTesTulis[aNo]) wsTesTulis[aNo].s = EXCEL_STYLES.cellCenter;
      if (wsTesTulis[aName]) wsTesTulis[aName].s = EXCEL_STYLES.cellBold;
      if (wsTesTulis[aInst]) wsTesTulis[aInst].s = EXCEL_STYLES.cellNormal;
      for (let c = 3; c < 8; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (wsTesTulis[addr]) wsTesTulis[addr].s = EXCEL_STYLES.cellCenter;
      }
      const aAvg = XLSX.utils.encode_cell({ r, c: 7 });
      if (wsTesTulis[aAvg]) wsTesTulis[aAvg].s = EXCEL_STYLES.cellHighlight;
    });
    XLSX.utils.book_append_sheet(wb, wsTesTulis, 'A6 Nilai Tes Tulis');

    const classLabel = selectedClassId === 'all' ? 'SEMUA_KELAS' : (rekapData.classes?.find(c => String(c.id) === String(selectedClassId))?.name?.replace(/\s+/g, '_') || 'KELAS');
    const komFileLabel = selectedKomisariat === 'ALL' ? '' : `_${selectedKomisariat.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const fileName = `BERKAS_REKAP_${classLabel}${komFileLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    downloadWorkbook(wb, fileName);
  };

  const selectedClassName = useMemo(() => {
    if (selectedClassId === 'all') return 'Semua Kelas Terhimpun';
    if (selectedClassId === 'general') return 'Kelas Umum (Tanpa Kelas)';
    const found = (rekapData.classes || []).find(c => String(c.id) === String(selectedClassId));
    return found ? found.name : `Kelas #${selectedClassId}`;
  }, [selectedClassId, rekapData.classes]);

  // List of all unique Komisariat available from participants and master KOMISARIAT_LIST
  const availableKomisariats = useMemo(() => {
    const setKom = new Set(KOMISARIAT_LIST);
    (rekapData.participants || []).forEach(p => {
      if (p.instansi && typeof p.instansi === 'string' && p.instansi.trim()) {
        setKom.add(p.instansi.trim());
      }
    });
    return Array.from(setKom).sort((a, b) => a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' }));
  }, [rekapData.participants]);

  // Filtered Participants based on search and selected Komisariat
  const filteredParticipants = useMemo(() => {
    if (!rekapData.participants) return [];
    let list = rekapData.participants;

    // Filter by Komisariat if chosen
    if (selectedKomisariat !== 'ALL') {
      const targetKom = selectedKomisariat.trim().toLowerCase();
      list = list.filter(p => (p.instansi || '').trim().toLowerCase() === targetKom);
    }

    if (!searchTerm) {
      return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));
    }
    const q = searchTerm.toLowerCase();
    return list.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.instansi && p.instansi.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    ).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id', { numeric: true, sensitivity: 'base' }));
  }, [rekapData.participants, searchTerm, selectedKomisariat]);

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className={isEmbedded ? "space-y-4 font-sans text-slate-800 w-full animate-fade-in" : "min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 pb-16"}>
      
      {/* Top Header Bar */}
      {isEmbedded ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                {title || `Spreadsheet Rekapitulasi: ${selectedClassName}`}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Format multi-sheet identik & sinkron otomatis dengan BERKAS BASIC TRAINING.xls
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
            {/* Toggle Edit Mode */}
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs ${
                isEditMode 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Mode Koreksi: AKTIF' : 'Koreksi Data'}</span>
            </button>

            {/* Simpan Perubahan Button */}
            {hasPendingChanges && (
              <button
                type="button"
                onClick={handleSaveCorrections}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : `Simpan (${Object.keys(pendingChanges).length})`}</span>
              </button>
            )}

            {/* Audit Logs Button */}
            <button
              type="button"
              onClick={handleOpenLogs}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
              title="Lihat Log Riwayat Koreksi"
            >
              <History className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Log Koreksi</span>
            </button>

            {/* Refresh Sync Button */}
            <button
              type="button"
              onClick={() => loadRekapData(selectedClassId)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
              title="Sinkronkan Ulang dari Database"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      ) : (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs px-4 sm:px-6 py-3.5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition cursor-pointer shrink-0"
                title="Kembali ke Manajemen Kelas"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {title || 'Rekap Semua Data'}
              </h1>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
              {/* Toggle Edit Mode */}
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs ${
                  isEditMode 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Mode Koreksi: AKTIF' : 'Koreksi Data'}</span>
              </button>

              {/* Simpan Perubahan Button */}
              {hasPendingChanges && (
                <button
                  type="button"
                  onClick={handleSaveCorrections}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : `Simpan (${Object.keys(pendingChanges).length})`}</span>
                </button>
              )}

              {/* Audit Logs Button */}
              <button
                type="button"
                onClick={handleOpenLogs}
                className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
                title="Lihat Log Riwayat Koreksi"
              >
                <History className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Log Koreksi</span>
              </button>

              {/* Refresh Sync Button */}
              <button
                type="button"
                onClick={() => loadRekapData(selectedClassId)}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                title="Sinkronkan Ulang dari Database"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Reason Input Bar when editing */}
          {isEditMode && (
            <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Klik pada sel nilai/kehadiran untuk mengedit. Masukkan catatan alasan koreksi di bawah ini:</span>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Alasan koreksi (cth: Revisi nilai pre-test / Sakit)"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs w-full sm:w-72 outline-none focus:border-amber-500 font-medium"
                />
                {hasPendingChanges && (
                  <button
                    type="button"
                    onClick={() => setPendingChanges({})}
                    className="px-2 py-1 text-slate-500 hover:text-rose-600 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Batal Semua
                  </button>
                )}
              </div>
            </div>
          )}
        </header>
      )}

      {/* Embedded Reason Bar when editing */}
      {isEmbedded && isEditMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center space-x-2 text-amber-900 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Klik pada sel tabel untuk mengedit. Masukkan catatan alasan koreksi:</span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Alasan koreksi (cth: Revisi nilai pre-test)"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              className="px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs w-full sm:w-72 outline-none focus:border-amber-500 font-medium"
            />
            {hasPendingChanges && (
              <button
                type="button"
                onClick={() => setPendingChanges({})}
                className="px-2 py-1 text-slate-500 hover:text-rose-600 text-xs font-semibold cursor-pointer shrink-0"
              >
                Batal Semua
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={isEmbedded ? "w-full space-y-4" : "flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4"}>
        
        {/* Search, Filter & Export Row (Sejajar dan Rapi) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 flex-1 max-w-4xl">
            {/* Input Pencarian */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama peserta atau instansi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500 font-medium shadow-2xs"
              />
            </div>

            {/* Filter Kelas Berada di Samping Kanan Pencarian */}
            {(!lockClassId && !isEmbedded) ? (
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs shrink-0 shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer max-w-[170px] truncate"
                  title="Pilih Kelas"
                >
                  <option value="all">Semua Kelas Terhimpun</option>
                  <option value="general">Kelas Umum (Tanpa Kelas)</option>
                  {(rekapData.classes || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-1.5 text-xs shrink-0 font-bold shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{selectedClassName}</span>
              </div>
            )}

            {/* Dropdown Pilihan Per-Komisariat */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs shrink-0 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={selectedKomisariat}
                onChange={(e) => setSelectedKomisariat(e.target.value)}
                className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer max-w-[210px] truncate"
                title="Pilih Komisariat untuk Filter & Ekspor"
              >
                <option value="ALL">Semua Komisariat</option>
                {availableKomisariats.map(kom => (
                  <option key={kom} value={kom}>{kom}</option>
                ))}
              </select>
            </div>

            {/* Button Export Sejajar di Samping Pencarian & Filter */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-2xs active:scale-95 transition cursor-pointer shrink-0"
              title="Unduh Berkas Excel Terformat Rapi (.XLSX)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>

          {/* Quick Stats Counter */}
          <div className="flex items-center space-x-4 text-xs font-medium text-slate-500 self-end md:self-center">
            <span>Total: <strong className="text-slate-800 font-bold">{filteredParticipants.length}</strong> Peserta</span>
            <span>Sesi: <strong className="text-slate-800 font-bold">{(rekapData.sessions || []).length}</strong> Pertemuan</span>
            {hasPendingChanges && (
              <span className="text-amber-600 font-bold flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                <span>{Object.keys(pendingChanges).length} sel menunggu simpan</span>
              </span>
            )}
          </div>
        </div>

        {/* Spreadsheet Container with Excel-style Grid */}
        <div className="bg-white rounded-2xl border border-slate-300/80 shadow-sm overflow-hidden flex flex-col">
          
          {/* Active Sheet Banner */}
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <TableIcon className="w-4 h-4 text-emerald-600" />
              <span>Lembar Kerja Aktif: <span className="text-emerald-700 font-mono">{activeSheet}</span></span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Formula & Skema Identik: BERKAS BASIC TRAINING.xls</span>
          </div>

          {/* Table Responsive View */}
          <div className="overflow-auto min-h-[420px] max-h-[70vh] relative">
            {isLoading ? (
              <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-xs font-semibold">Memuat rekapitulasi data seluruh sheet...</p>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="p-16 text-center text-slate-400 italic text-xs">
                Tidak ada data peserta ditemukan pada kelas atau kriteria ini.
              </div>
            ) : (
              <table className="w-full border-collapse text-xs font-sans text-left border border-slate-300">
                
                {/* 1. SHEET TOTAL */}
                {activeSheet === 'TOTAL' && (
                  <>
                    <thead className="sticky top-0 z-30 shadow-xs">
                      <tr className="bg-emerald-900 text-white font-extrabold text-[11px] uppercase tracking-wider text-center divide-x divide-emerald-800">
                        <th rowSpan={3} className="p-2.5 w-10 sticky top-0 left-0 z-40 bg-emerald-950 align-middle">No</th>
                        <th rowSpan={3} className="p-2.5 min-w-[200px] sticky top-0 left-10 z-40 bg-emerald-950 text-left align-middle">Nama Lengkap</th>
                        <th rowSpan={3} className="p-2.5 min-w-[140px] text-left bg-emerald-900 align-middle">Utusan / Instansi</th>
                        <th colSpan={4} className="p-2 bg-emerald-800">KOGNITIF (30%)</th>
                        <th colSpan={4} className="p-2 bg-emerald-700">PSIKOMOTORIK (20%)</th>
                        <th colSpan={3} className="p-2 bg-emerald-800">AFEKTIF (50%)</th>
                        <th rowSpan={2} className="p-2.5 min-w-[70px] bg-emerald-950 align-middle">TOTAL</th>
                        <th rowSpan={2} className="p-2.5 min-w-[70px] bg-emerald-950 align-middle">Rata-Rata</th>
                        <th rowSpan={2} className="p-2.5 min-w-[70px] bg-emerald-950 align-middle">SCORE</th>
                        <th rowSpan={3} className="p-2.5 min-w-[130px] bg-emerald-950 align-middle">STATUS</th>
                        <th rowSpan={3} className="p-2.5 min-w-[100px] bg-emerald-950 align-middle">PREDIKAT</th>
                      </tr>
                      <tr className="bg-emerald-50 text-emerald-950 font-bold text-[10px] text-center divide-x divide-emerald-200">
                        <th className="p-1.5 w-16">Screening</th>
                        <th className="p-1.5 w-16">Tes Tulis</th>
                        <th className="p-1.5 w-16">Jumlah</th>
                        <th className="p-1.5 w-16 bg-emerald-100 text-emerald-900 font-extrabold">Rata-Rata</th>
                        <th className="p-1.5 w-16">Absen</th>
                        <th className="p-1.5 w-20">Akt. Forum</th>
                        <th className="p-1.5 w-16">Jumlah</th>
                        <th className="p-1.5 w-16 bg-emerald-100 text-emerald-900 font-extrabold">Rata-Rata</th>
                        <th className="p-1.5 w-20">Akt. Forum</th>
                        <th className="p-1.5 w-16">Jumlah</th>
                        <th className="p-1.5 w-16 bg-emerald-100 text-emerald-900 font-extrabold">Rata-Rata</th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-500 font-mono text-[10px] text-center divide-x divide-slate-200">
                        <th className="p-1 w-16">4</th>
                        <th className="p-1 w-16">5</th>
                        <th className="p-1 w-16">6</th>
                        <th className="p-1 w-16 bg-emerald-50">7</th>
                        <th className="p-1 w-16">8</th>
                        <th className="p-1 w-20">9</th>
                        <th className="p-1 w-16">10</th>
                        <th className="p-1 w-16 bg-emerald-50">11</th>
                        <th className="p-1 w-20">12</th>
                        <th className="p-1 w-16">13</th>
                        <th className="p-1 w-16 bg-emerald-50">14</th>
                        <th className="p-1 w-16 bg-slate-200 text-slate-700 font-bold">15</th>
                        <th className="p-1 w-16 bg-slate-200 text-slate-700 font-bold">16</th>
                        <th className="p-1 w-16 bg-slate-200 text-slate-700 font-bold">17</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-medium">
                      {filteredParticipants.map((p, idx) => {
                        const preQuiz = (rekapData.quizzes || []).find(q => q.type === 'pretest' || q.type === 'pre-test') || 
                                        (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('pre')) || 
                                        { id: 6, title: 'Pre-Test' };
                        const midQuiz = (rekapData.quizzes || []).find(q => q.type === 'midtest' || q.type === 'mid-test' || q.type === 'evaluasi') || 
                                        (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('mid') || (q.title || '').toLowerCase().includes('tengah')) || 
                                        { id: 8, title: 'Mid-Test' };
                        const postQuiz = (rekapData.quizzes || []).find(q => q.type === 'posttest' || q.type === 'post-test') || 
                                         (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('post')) || 
                                         { id: 7, title: 'Post-Test' };

                        // 1. Kognitif: Screening & Tes Tulis
                        const assGlobal = rekapData.assessment_map[`${p.id}_global`];
                        const conGlobal = assGlobal?.contributions || {};
                        const kIsl = `${p.id}_A1 Screening_screening_keislaman__`;
                        const kHmi = `${p.id}_A1 Screening_screening_kehmi__`;
                        const kInd = `${p.id}_A1 Screening_screening_keindonesiaan__`;
                        const kOrg = `${p.id}_A1 Screening_screening_keorganisasian__`;
                        const kSup = `${p.id}_A1 Screening_screening_suplemen__`;

                        const rawIsl = pendingChanges[kIsl] !== undefined ? pendingChanges[kIsl].new_value : (conGlobal.screening_keislaman ?? '');
                        const rawHmi = pendingChanges[kHmi] !== undefined ? pendingChanges[kHmi].new_value : (conGlobal.screening_kehmi ?? '');
                        const rawInd = pendingChanges[kInd] !== undefined ? pendingChanges[kInd].new_value : (conGlobal.screening_keindonesiaan ?? '');
                        const rawOrg = pendingChanges[kOrg] !== undefined ? pendingChanges[kOrg].new_value : (conGlobal.screening_keorganisasian ?? '');
                        const rawSup = pendingChanges[kSup] !== undefined ? pendingChanges[kSup].new_value : (conGlobal.screening_suplemen ?? '');

                        const hasScr = [rawIsl, rawHmi, rawInd, rawOrg, rawSup].some(v => v !== '' && v !== null && v !== undefined);
                        const sumScrRaw = (Number(rawIsl) || 0) + (Number(rawHmi) || 0) + (Number(rawInd) || 0) + (Number(rawOrg) || 0) + (Number(rawSup) || 0);
                        const computedScrAvg = hasScr ? Math.round(sumScrRaw / 5) : 0;
                        const kogKey = `${p.id}_TOTAL_kognitif__`;
                        const kog = pendingChanges[kogKey] !== undefined ? pendingChanges[kogKey].new_value : (hasScr ? computedScrAvg : (assGlobal?.kognitif ?? 0));

                        let sumQuiz = 0;
                        let countQuiz = 0;
                        [preQuiz, midQuiz, postQuiz].forEach(qz => {
                          if (qz && qz.id) {
                            const kQuiz = `${p.id}_A6 Nilai Tes Tulis_score__${qz.id}`;
                            const val = pendingChanges[kQuiz] !== undefined ? pendingChanges[kQuiz].new_value : rekapData.quiz_map[`${p.id}_${qz.id}`];
                            if (val !== undefined && val !== null && val !== '') {
                              sumQuiz += Number(val) || 0;
                              countQuiz++;
                            }
                          }
                        });
                        const avgTes = countQuiz > 0 ? Math.round(sumQuiz / countQuiz) : 0;
                        const kogJumlah = Number(kog) + avgTes;
                        const kogRata = Number((kogJumlah / 2).toFixed(1));

                        // 2. Psikomotorik: Tugas & Absensi
                        let sumTask = 0;
                        let taskCount = 0;
                        (rekapData.sessions || []).forEach(s => {
                          const assS = rekapData.assessment_map[`${p.id}_${s.id}`] ||
                            (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null);
                          const conS = assS?.contributions || {};
                          const cellK = `${p.id}_A5 Tugas_tugas_${s.id}_`;
                          const rawScore = pendingChanges[cellK] !== undefined ? pendingChanges[cellK].new_value : conS.tugas;
                          if (rawScore !== null && rawScore !== undefined && rawScore !== '') {
                            sumTask += Number(rawScore) || 0;
                            taskCount++;
                          }
                        });
                        const computedTaskAvg = taskCount > 0 ? Math.round(sumTask / taskCount) : 0;
                        const psiKey = `${p.id}_TOTAL_psikomotorik__`;
                        const psiTugas = pendingChanges[psiKey] !== undefined ? pendingChanges[psiKey].new_value : (taskCount > 0 ? computedTaskAvg : (assGlobal?.psikomotorik ?? 0));

                        let hadirCount = 0;
                        let hasAttendanceRecord = false;
                        (rekapData.sessions || []).forEach(s => {
                          const cellKey = `${p.id}_A2 Absensi_attendance_${s.id}_`;
                          const currentStatus = pendingChanges[cellKey] ? pendingChanges[cellKey].new_value : (rekapData.attendance_map[`${p.id}_${s.id}`] || '');
                          if (currentStatus !== null && currentStatus !== undefined && currentStatus !== '') {
                            hasAttendanceRecord = true;
                            if (currentStatus === 'present' || currentStatus === 'Hadir' || currentStatus === '1') {
                              hadirCount++;
                            }
                          }
                        });
                        const totalSessionsCount = (rekapData.sessions || []).length;
                        const psiAbsen = (totalSessionsCount > 0 && hasAttendanceRecord) ? Math.round((hadirCount / totalSessionsCount) * 100) : 0;
                        const psiJumlah = Number(psiTugas) + psiAbsen;
                        const psiRata = (taskCount > 0 && hasAttendanceRecord) ? Number((psiJumlah / 2).toFixed(1)) : (hasAttendanceRecord ? psiAbsen : psiTugas);

                        // 3. Afektif: Forum Sesi
                        let sumForumAvg = 0;
                        let forumCount = 0;
                        (rekapData.sessions || []).forEach(s => {
                          const assS = rekapData.assessment_map[`${p.id}_${s.id}`] ||
                            (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null);
                          const conS = assS?.contributions || {};
                          const vios = Array.isArray(assS?.violations) ? assS.violations : [];
                          const consList = Array.isArray(conS) ? conS : (Array.isArray(conS.contributions) ? conS.contributions : []);

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

                          const a1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_1_${s.id}_`]?.new_value ?? conS.afektif_1 ?? logA1 ?? 0);
                          const a2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_2_${s.id}_`]?.new_value ?? conS.afektif_2 ?? logA2 ?? 0);
                          const a3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_3_${s.id}_`]?.new_value ?? conS.afektif_3 ?? logA3 ?? 0);
                          const a4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_4_${s.id}_`]?.new_value ?? conS.afektif_4 ?? logA4 ?? 0);
                          const a5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_5_${s.id}_`]?.new_value ?? conS.afektif_5 ?? logA5 ?? 0);
                          const sumAfk = a1 + a2 + a3 + a4 + a5;

                          const psi1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_1_${s.id}_`]?.new_value ?? conS.psiko_1 ?? logP1 ?? 0);
                          const psi2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_2_${s.id}_`]?.new_value ?? conS.psiko_2 ?? logP2 ?? 0);
                          const psi3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_3_${s.id}_`]?.new_value ?? conS.psiko_3 ?? logP3 ?? 0);
                          const psi4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_4_${s.id}_`]?.new_value ?? conS.psiko_4 ?? logP4 ?? 0);
                          const psi5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_5_${s.id}_`]?.new_value ?? conS.psiko_5 ?? logP5 ?? 0);
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
                          } else {
                            // Sesi belum dinilai: berikan nilai awal standar 82.5 (Afk 100, Kog 75, Psi 50)
                            sumForumAvg += 82.5;
                            forumCount++;
                          }
                        });
                        const computedForumAvg = forumCount > 0 ? Math.round(sumForumAvg / forumCount) : (assGlobal?.afektif !== undefined && assGlobal?.afektif !== null && Number(assGlobal.afektif) > 0 ? Number(assGlobal.afektif) : 83);
                        const afkKey = `${p.id}_TOTAL_afektif__`;
                        const afk = pendingChanges[afkKey] !== undefined ? pendingChanges[afkKey].new_value : computedForumAvg;
                        const afkJumlah = Number(afk);
                        const afkRata = Number(Number(afk).toFixed(1));

                        // Total Score pembobotan standar LK 1: Afektif 50% + Kognitif 30% + Psikomotorik 20%
                        const totalScore = Math.round((kogRata * 0.3) + (psiRata * 0.2) + (afkRata * 0.5));
                        const isLulus = totalScore >= 70;
                        const predikat = totalScore >= 85 ? 'AMAT BAIK' : (totalScore >= 75 ? 'BAIK' : 'CUKUP');

                        return (
                          <tr key={p.id} className="hover:bg-emerald-50/40 divide-x divide-slate-200 transition-colors">
                            <td className="p-2 text-center text-slate-500 font-mono sticky left-0 bg-white z-10">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900 sticky left-10 bg-white z-10">{p.name}</td>
                            <td className="p-2 text-slate-600">{p.instansi || '-'}</td>
                            
                            {/* Kognitif Cells */}
                            <td className="p-2 text-center font-mono">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={kog}
                                  onChange={(e) => handleCellChange({
                                    user_id: p.id,
                                    sheet_name: 'TOTAL',
                                    field_name: 'kognitif',
                                    old_value: assGlobal?.kognitif ?? 0,
                                    new_value: e.target.value
                                  })}
                                  className={`w-16 px-1.5 py-0.5 text-center rounded border font-mono font-bold ${
                                    pendingChanges[kogKey] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                  }`}
                                />
                              ) : (
                                <span>{kog}</span>
                              )}
                            </td>
                            <td className="p-2 text-center font-mono">{avgTes}</td>
                            <td className="p-2 text-center font-mono text-slate-500">{kogJumlah}</td>
                            <td className="p-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                              {kogRata}
                            </td>

                            {/* Psikomotorik Cells: Absen | Akt.Forum | Jumlah | Rata-Rata */}
                            <td className="p-2 text-center font-mono">{psiAbsen}</td>
                            <td className="p-2 text-center font-mono">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={psiTugas}
                                  onChange={(e) => handleCellChange({
                                    user_id: p.id,
                                    sheet_name: 'TOTAL',
                                    field_name: 'psikomotorik',
                                    old_value: assGlobal?.psikomotorik ?? 0,
                                    new_value: e.target.value
                                  })}
                                  className={`w-16 px-1.5 py-0.5 text-center rounded border font-mono font-bold ${
                                    pendingChanges[psiKey] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                  }`}
                                />
                              ) : (
                                <span>{psiTugas}</span>
                              )}
                            </td>
                            <td className="p-2 text-center font-mono text-slate-500">{psiJumlah}</td>
                            <td className="p-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                              {psiRata}
                            </td>

                            {/* Afektif Cells */}
                            <td className="p-2 text-center font-mono">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={afk}
                                  onChange={(e) => handleCellChange({
                                    user_id: p.id,
                                    sheet_name: 'TOTAL',
                                    field_name: 'afektif',
                                    old_value: assGlobal?.afektif ?? 0,
                                    new_value: e.target.value
                                  })}
                                  className={`w-16 px-1.5 py-0.5 text-center rounded border font-mono font-bold ${
                                    pendingChanges[afkKey] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                  }`}
                                />
                              ) : (
                                <span>{afk}</span>
                              )}
                            </td>
                            <td className="p-2 text-center font-mono text-slate-500">{afkJumlah}</td>
                            <td className="p-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                              {afkRata}
                            </td>

                            {/* TOTAL = kogJumlah + psiJumlah + afkJumlah */}
                            <td className="p-2 text-center font-mono font-black text-slate-900 bg-slate-50">
                              {Number((kogJumlah + psiJumlah + afkJumlah).toFixed(2))}
                            </td>
                            {/* Rata-Rata = TOTAL / 9 sub-nilai */}
                            <td className="p-2 text-center font-mono font-bold text-slate-700 bg-slate-50">
                              {Number(((kogJumlah + psiJumlah + afkJumlah) / 9).toFixed(2))}
                            </td>
                            {/* SCORE = nilai akhir terbobot (Kog30%+Psi20%+Afk50%) */}
                            <td className="p-2 text-center font-mono font-black text-sm text-emerald-900 bg-emerald-50/60">
                              {totalScore}
                            </td>

                            <td className="p-2 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] tracking-wide ${
                                isLulus 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {isLulus ? 'LULUS' : 'LULUS BERSYARAT'}
                              </span>
                            </td>
                            <td className="p-2 text-center font-bold text-[10px] text-slate-600">
                              {predikat}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {/* 2. SHEET A2 ABSENSI */}
                {activeSheet === 'A2 Absensi' && (
                  <>
                    <thead className="sticky top-0 z-30 shadow-xs">
                      <tr className="bg-emerald-900 text-white font-extrabold text-[11px] uppercase tracking-wider text-center divide-x divide-emerald-800">
                        <th className="p-2.5 w-10 sticky top-0 left-0 z-40 bg-emerald-950">No</th>
                        <th className="p-2.5 min-w-[200px] sticky top-0 left-10 z-40 bg-emerald-950 text-left">Nama Peserta</th>
                        <th className="p-2.5 min-w-[140px] text-left bg-emerald-900">Utusan</th>
                        {(rekapData.sessions || []).map((s, idx) => (
                          <th key={s.id} className="p-2 min-w-[80px]" title={s.title}>
                            Sesi {idx + 1}
                          </th>
                        ))}
                        <th className="p-2.5 w-24 bg-emerald-950">Total Hadir</th>
                        <th className="p-2.5 w-24 bg-emerald-950">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-medium">
                      {filteredParticipants.map((p, idx) => {
                        let hadirCount = 0;
                        const sessions = rekapData.sessions || [];

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 divide-x divide-slate-200">
                            <td className="p-2 text-center text-slate-500 font-mono sticky left-0 bg-white z-10">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900 sticky left-10 bg-white z-10">{p.name}</td>
                            <td className="p-2 text-slate-600">{p.instansi || '-'}</td>

                            {sessions.map(s => {
                              const cellKey = `${p.id}_A2 Absensi_attendance_${s.id}_`;
                              const currentStatus = pendingChanges[cellKey] 
                                ? pendingChanges[cellKey].new_value 
                                : (rekapData.attendance_map[`${p.id}_${s.id}`] || 'absent');

                              const isPresent = currentStatus === 'present' || currentStatus === 'Hadir' || currentStatus === '1';
                              if (isPresent) hadirCount++;

                              return (
                                <td key={s.id} className="p-1 text-center font-mono">
                                  {isEditMode ? (
                                    <select
                                      value={isPresent ? 'present' : (currentStatus === 'permission' ? 'permission' : 'absent')}
                                      onChange={(e) => handleCellChange({
                                        user_id: p.id,
                                        sheet_name: 'A2 Absensi',
                                        field_name: 'attendance',
                                        old_value: currentStatus,
                                        new_value: e.target.value,
                                        session_id: s.id
                                      })}
                                      className={`px-1 py-0.5 rounded text-[10px] font-bold border ${
                                        pendingChanges[cellKey] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                      }`}
                                    >
                                      <option value="present">Hadir</option>
                                      <option value="permission">Izin</option>
                                      <option value="absent">Alpha</option>
                                    </select>
                                  ) : (
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isPresent 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : currentStatus === 'permission' 
                                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                                          : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {isPresent ? 'Hadir' : (currentStatus === 'permission' ? 'Izin' : 'Alpha')}
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="p-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                              {hadirCount} / {sessions.length}
                            </td>
                            <td className="p-2 text-center font-mono font-black text-slate-800 bg-slate-50">
                              {sessions.length > 0 ? Math.round((hadirCount / sessions.length) * 100) : 0}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {/* 3. SHEET A6 NILAI TES TULIS */}
                {activeSheet === 'A6 Nilai Tes Tulis' && (() => {
                  const preQuiz = (rekapData.quizzes || []).find(q => q.type === 'pretest' || q.type === 'pre-test') || 
                                  (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('pre')) || 
                                  { id: 6, title: 'Pre-Test' };
                  const midQuiz = (rekapData.quizzes || []).find(q => q.type === 'midtest' || q.type === 'mid-test' || q.type === 'evaluasi') || 
                                  (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('mid') || (q.title || '').toLowerCase().includes('tengah')) || 
                                  { id: 8, title: 'Mid-Test' };
                  const postQuiz = (rekapData.quizzes || []).find(q => q.type === 'posttest' || q.type === 'post-test') || 
                                   (rekapData.quizzes || []).find(q => (q.title || '').toLowerCase().includes('post')) || 
                                   { id: 7, title: 'Post-Test' };

                  return (
                    <>
                      <thead className="sticky top-0 z-30 shadow-xs">
                        <tr className="bg-emerald-900 text-white font-extrabold text-[11px] uppercase tracking-wider text-center divide-x divide-emerald-800">
                          <th className="p-2.5 w-10 sticky top-0 left-0 z-40 bg-emerald-950">No</th>
                          <th className="p-2.5 min-w-[200px] sticky top-0 left-10 z-40 bg-emerald-950 text-left">Nama Peserta</th>
                          <th className="p-2.5 min-w-[140px] text-left bg-emerald-900">Utusan</th>
                          <th className="p-2.5 min-w-[110px] bg-emerald-800">{preQuiz.title}</th>
                          <th className="p-2.5 min-w-[110px] bg-emerald-700">{midQuiz.title}</th>
                          <th className="p-2.5 min-w-[110px] bg-emerald-800">{postQuiz.title}</th>
                          <th className="p-2.5 w-24 bg-emerald-900">Jumlah</th>
                          <th className="p-2.5 w-24 bg-emerald-950">Rata-Rata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white font-medium">
                        {filteredParticipants.map((p, idx) => {
                          const preKey = `${p.id}_A6 Nilai Tes Tulis_score__${preQuiz.id}`;
                          const midKey = `${p.id}_A6 Nilai Tes Tulis_score__${midQuiz.id}`;
                          const postKey = `${p.id}_A6 Nilai Tes Tulis_score__${postQuiz.id}`;

                          const preScore = pendingChanges[preKey] !== undefined
                            ? pendingChanges[preKey].new_value
                            : (rekapData.quiz_map[`${p.id}_${preQuiz.id}`] || 0);

                          const midScore = pendingChanges[midKey] !== undefined
                            ? pendingChanges[midKey].new_value
                            : (rekapData.quiz_map[`${p.id}_${midQuiz.id}`] || 0);

                          const postScore = pendingChanges[postKey] !== undefined
                            ? pendingChanges[postKey].new_value
                            : (rekapData.quiz_map[`${p.id}_${postQuiz.id}`] || 0);

                          const sum = Number(preScore) + Number(midScore) + Number(postScore);
                          const avg = (sum / 3).toFixed(1);

                          return (
                            <tr key={p.id} className="hover:bg-slate-50 divide-x divide-slate-200">
                              <td className="p-2 text-center text-slate-500 font-mono sticky left-0 bg-white z-10">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-900 sticky left-10 bg-white z-10">{p.name}</td>
                              <td className="p-2 text-slate-600">{p.instansi || '-'}</td>

                              {/* Pre-Test Score */}
                              <td className="p-2 text-center font-mono">
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={preScore}
                                    onChange={(e) => handleCellChange({
                                      user_id: p.id,
                                      sheet_name: 'A6 Nilai Tes Tulis',
                                      field_name: 'score',
                                      old_value: rekapData.quiz_map[`${p.id}_${preQuiz.id}`] || 0,
                                      new_value: e.target.value,
                                      quiz_id: preQuiz.id
                                    })}
                                    className={`w-16 px-1.5 py-0.5 text-center rounded border font-mono font-bold ${
                                      pendingChanges[preKey] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                    }`}
                                  />
                                ) : (
                                  <span className="font-bold text-emerald-800">{preScore}</span>
                                )}
                              </td>

                              {/* Mid-Test Score */}
                              <td className="p-2 text-center font-mono">
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={midScore}
                                    onChange={(e) => handleCellChange({
                                      user_id: p.id,
                                      sheet_name: 'A6 Nilai Tes Tulis',
                                      field_name: 'score',
                                      old_value: rekapData.quiz_map[`${p.id}_${midQuiz.id}`] || 0,
                                      new_value: e.target.value,
                                      quiz_id: midQuiz.id
                                    })}
                                    className={`w-16 px-1.5 py-0.5 text-center rounded border font-mono font-bold ${
                                      pendingChanges[midKey] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                    }`}
                                  />
                                ) : (
                                  <span className="font-bold text-emerald-800">{midScore}</span>
                                )}
                              </td>

                              {/* Post-Test Score */}
                              <td className="p-2 text-center font-mono">
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={postScore}
                                    onChange={(e) => handleCellChange({
                                      user_id: p.id,
                                      sheet_name: 'A6 Nilai Tes Tulis',
                                      field_name: 'score',
                                      old_value: rekapData.quiz_map[`${p.id}_${postQuiz.id}`] || 0,
                                      new_value: e.target.value,
                                      quiz_id: postQuiz.id
                                    })}
                                    className={`w-16 px-1.5 py-0.5 text-center rounded border font-mono font-bold ${
                                      pendingChanges[postKey] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                    }`}
                                  />
                                ) : (
                                  <span className="font-bold text-emerald-800">{postScore}</span>
                                )}
                              </td>

                              <td className="p-2 text-center font-mono text-slate-600">{sum}</td>
                              <td className="p-2 text-center font-mono font-black text-emerald-800 bg-emerald-50/40">{avg}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>
                  );
                })()}

                {/* 4. SHEET A3 AKTIVITAS FORUM (PER-SESI DETAIL RUBRIC MATRIX - IDENTIK GAMBAR 2) */}
                {activeSheet === 'A3 Aktivitas Forum' && (() => {
                  const sessions = rekapData.sessions || [];
                  const displaySessions = forumSessionFilter === 'ALL'
                    ? sessions
                    : sessions.filter(s => String(s.id) === String(forumSessionFilter));

                  return (
                    <div className="space-y-8 p-3">
                      {/* Session Selector Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
                        <div className="flex items-center space-x-2 text-xs text-emerald-950 font-bold">
                          <span>Tampilkan Sesi:</span>
                          <select
                            value={forumSessionFilter}
                            onChange={(e) => setForumSessionFilter(e.target.value)}
                            className="bg-white border border-emerald-300 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-900 outline-none cursor-pointer shadow-2xs"
                          >
                            <option value="ALL">Semua Sesi Terhimpun ({sessions.length} Sesi)</option>
                            {sessions.map((ses, idx) => (
                              <option key={ses.id} value={ses.id}>
                                Sesi {idx + 1}: {ses.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-[11px] text-emerald-700 italic">
                          *Formula Afektif: 60 - Jumlah | Psikomotorik: 60 + Jumlah | Rata-Rata: (Afk+Psi)/2
                        </span>
                      </div>

                      {displaySessions.map((ses, sIdx) => {
                        const actualIdx = sessions.findIndex(s => s.id === ses.id);
                        const displayNum = actualIdx !== -1 ? actualIdx + 1 : sIdx + 1;
                        const firstParticipant = filteredParticipants[0];
                        const sampleAss = firstParticipant ? rekapData.assessment_map[`${firstParticipant.id}_${ses.id}`] : null;
                        const savedPenilai = sampleAss?.contributions?.penilai || ses.penilai || 'MOT / Tim Pemandu';
                        const savedDateTime = sampleAss?.contributions?.session_date_time || (ses.session_date ? `${ses.session_date} ${ses.start_time || ''}` : (ses.time || ''));

                        const penilaiKey = `session_${ses.id}_penilai`;
                        const dateKey = `session_${ses.id}_date`;
                        const curPenilai = pendingChanges[penilaiKey] ? pendingChanges[penilaiKey].new_value : savedPenilai;
                        const curDateTime = pendingChanges[dateKey] ? pendingChanges[dateKey].new_value : savedDateTime;

                        return (
                          <div key={ses.id} className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white">
                            {/* Session Header Card Identik Excel */}
                            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <div className="flex items-center space-x-2">
                                <span className="px-2.5 py-1 rounded-md bg-emerald-800 text-white font-black text-xs uppercase tracking-wider">
                                  SESI {displayNum}
                                </span>
                                <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                                  {ses.title || `Materi Sesi ${displayNum}`}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-xs">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-slate-500 font-bold">*penilai:</span>
                                  {isEditMode ? (
                                    <input
                                      type="text"
                                      value={curPenilai}
                                      onChange={(e) => {
                                        if (firstParticipant) {
                                          handleCellChange({
                                            user_id: firstParticipant.id,
                                            sheet_name: 'A3 Aktivitas Forum',
                                            field_name: 'penilai',
                                            old_value: savedPenilai,
                                            new_value: e.target.value,
                                            session_id: ses.id
                                          });
                                        }
                                      }}
                                      placeholder="Nama MOT/TM Penilai"
                                      className="px-2 py-0.5 rounded border border-slate-300 bg-white font-semibold text-slate-800 text-xs outline-none focus:border-emerald-500"
                                    />
                                  ) : (
                                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{curPenilai}</span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-1.5">
                                  <span className="text-slate-500 font-bold">hari/tanggal:</span>
                                  {isEditMode ? (
                                    <input
                                      type="text"
                                      value={curDateTime}
                                      onChange={(e) => {
                                        if (firstParticipant) {
                                          handleCellChange({
                                            user_id: firstParticipant.id,
                                            sheet_name: 'A3 Aktivitas Forum',
                                            field_name: 'session_date_time',
                                            old_value: savedDateTime,
                                            new_value: e.target.value,
                                            session_id: ses.id
                                          });
                                        }
                                      }}
                                      placeholder="Contoh: Kamis, 09 Okt 2026"
                                      className="px-2 py-0.5 rounded border border-slate-300 bg-white font-semibold text-slate-800 text-xs outline-none focus:border-emerald-500"
                                    />
                                  ) : (
                                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{curDateTime || '-'}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Session Spreadsheet Grid */}
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-xs font-sans text-left border-t border-slate-300">
                                <thead>
                                  {/* Row 1 Headers */}
                                  <tr className="text-center font-black uppercase tracking-wider text-[11px] divide-x divide-slate-300">
                                    <th rowSpan={2} className="p-2 w-10 bg-emerald-950 text-white sticky left-0 z-20">No.</th>
                                    <th rowSpan={2} className="p-2 min-w-[190px] bg-emerald-950 text-white text-left sticky left-10 z-20">Nama Lengkap</th>
                                    <th rowSpan={2} className="p-2 min-w-[140px] bg-emerald-900 text-white text-left">Utusan</th>
                                    <th colSpan={7} className="p-1.5 bg-yellow-300 text-yellow-950 border-b border-yellow-400">AFEKTIF</th>
                                    <th colSpan={7} className="p-1.5 bg-sky-300 text-sky-950 border-b border-sky-400">PSIKOMOTORIK</th>
                                    <th rowSpan={2} className="p-2 w-20 bg-orange-500 text-white">Jumlah</th>
                                    <th rowSpan={2} className="p-2 w-20 bg-orange-600 text-white">Rata-Rat</th>
                                  </tr>
                                  {/* Row 2 Subheaders */}
                                  <tr className="text-center font-bold text-[10px] divide-x divide-slate-300">
                                    {/* Afektif Subheaders */}
                                    <th className="p-1 w-8 bg-yellow-100 text-yellow-950">1</th>
                                    <th className="p-1 w-8 bg-yellow-100 text-yellow-950">2</th>
                                    <th className="p-1 w-8 bg-yellow-100 text-yellow-950">3</th>
                                    <th className="p-1 w-8 bg-yellow-100 text-yellow-950">4</th>
                                    <th className="p-1 w-8 bg-yellow-100 text-yellow-950">5</th>
                                    <th className="p-1 w-14 bg-yellow-200 text-yellow-950 font-black">Jumlah</th>
                                    <th className="p-1 w-16 bg-yellow-300 text-yellow-950 font-black">asil akh</th>
                                    {/* Psikomotorik Subheaders */}
                                    <th className="p-1 w-8 bg-sky-100 text-sky-950">1</th>
                                    <th className="p-1 w-8 bg-sky-100 text-sky-950">2</th>
                                    <th className="p-1 w-8 bg-sky-100 text-sky-950">3</th>
                                    <th className="p-1 w-8 bg-sky-100 text-sky-950">4</th>
                                    <th className="p-1 w-8 bg-sky-100 text-sky-950">5</th>
                                    <th className="p-1 w-14 bg-sky-200 text-sky-950 font-black">Jumlah</th>
                                    <th className="p-1 w-16 bg-sky-300 text-sky-950 font-black">asil Akh</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 font-medium">
                                  {filteredParticipants.map((p, pIdx) => {
                                    const ass = rekapData.assessment_map[`${p.id}_${ses.id}`] ||
                                      (ses.session_code ? rekapData.assessment_map[`${p.id}_${ses.session_code}`] : null);
                                    const con = ass?.contributions || {};
                                    const vios = Array.isArray(ass?.violations) ? ass.violations : [];
                                    const consList = Array.isArray(con) ? con : (Array.isArray(con.contributions) ? con.contributions : []);

                                    let logA1 = 0, logA2 = 0, logA3 = 0, logA4 = 0, logA5 = 0;
                                    if (con.afektif_1 === undefined && vios.length > 0) {
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
                                    if (con.psiko_1 === undefined && consList.length > 0) {
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

                                    const kA1 = `${p.id}_A3 Aktivitas Forum_afektif_1_${ses.id}_`;
                                    const kA2 = `${p.id}_A3 Aktivitas Forum_afektif_2_${ses.id}_`;
                                    const kA3 = `${p.id}_A3 Aktivitas Forum_afektif_3_${ses.id}_`;
                                    const kA4 = `${p.id}_A3 Aktivitas Forum_afektif_4_${ses.id}_`;
                                    const kA5 = `${p.id}_A3 Aktivitas Forum_afektif_5_${ses.id}_`;

                                    const kP1 = `${p.id}_A3 Aktivitas Forum_psiko_1_${ses.id}_`;
                                    const kP2 = `${p.id}_A3 Aktivitas Forum_psiko_2_${ses.id}_`;
                                    const kP3 = `${p.id}_A3 Aktivitas Forum_psiko_3_${ses.id}_`;
                                    const kP4 = `${p.id}_A3 Aktivitas Forum_psiko_4_${ses.id}_`;
                                    const kP5 = `${p.id}_A3 Aktivitas Forum_psiko_5_${ses.id}_`;

                                    const a1 = Number(pendingChanges[kA1]?.new_value ?? con.afektif_1 ?? logA1 ?? 0);
                                    const a2 = Number(pendingChanges[kA2]?.new_value ?? con.afektif_2 ?? logA2 ?? 0);
                                    const a3 = Number(pendingChanges[kA3]?.new_value ?? con.afektif_3 ?? logA3 ?? 0);
                                    const a4 = Number(pendingChanges[kA4]?.new_value ?? con.afektif_4 ?? logA4 ?? 0);
                                    const a5 = Number(pendingChanges[kA5]?.new_value ?? con.afektif_5 ?? logA5 ?? 0);
                                    const sumAfk = a1 + a2 + a3 + a4 + a5;
                                    const afkAkhir = Math.max(0, 60 - sumAfk);

                                    const psi1 = Number(pendingChanges[kP1]?.new_value ?? con.psiko_1 ?? logP1 ?? 0);
                                    const psi2 = Number(pendingChanges[kP2]?.new_value ?? con.psiko_2 ?? logP2 ?? 0);
                                    const psi3 = Number(pendingChanges[kP3]?.new_value ?? con.psiko_3 ?? logP3 ?? 0);
                                    const psi4 = Number(pendingChanges[kP4]?.new_value ?? con.psiko_4 ?? logP4 ?? 0);
                                    const psi5 = Number(pendingChanges[kP5]?.new_value ?? con.psiko_5 ?? logP5 ?? 0);
                                    const sumPsi = psi1 + psi2 + psi3 + psi4 + psi5;
                                    const psiAkhir = 60 + sumPsi;

                                    const totSum = afkAkhir + psiAkhir;
                                    const totAvg = (totSum / 2).toFixed(2);

                                    return (
                                      <tr key={p.id} className="hover:bg-slate-50 divide-x divide-slate-200 transition-colors">
                                        <td className="p-1.5 text-center text-slate-500 font-mono sticky left-0 bg-white z-10">{pIdx + 1}</td>
                                        <td className="p-1.5 font-bold text-slate-900 sticky left-10 bg-white z-10">{p.name}</td>
                                        <td className="p-1.5 text-slate-600">{p.instansi || '-'}</td>

                                        {/* Afektif 1..5 Inputs */}
                                        {[
                                          { k: kA1, v: a1, f: 'afektif_1' },
                                          { k: kA2, v: a2, f: 'afektif_2' },
                                          { k: kA3, v: a3, f: 'afektif_3' },
                                          { k: kA4, v: a4, f: 'afektif_4' },
                                          { k: kA5, v: a5, f: 'afektif_5' },
                                        ].map((item, idxCol) => (
                                          <td key={idxCol} className="p-1 text-center font-mono">
                                            {isEditMode ? (
                                              <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={item.v}
                                                onChange={(e) => handleCellChange({
                                                  user_id: p.id,
                                                  sheet_name: 'A3 Aktivitas Forum',
                                                  field_name: item.f,
                                                  old_value: con[item.f] ?? 0,
                                                  new_value: e.target.value,
                                                  session_id: ses.id
                                                })}
                                                className={`w-9 px-1 py-0.5 text-center rounded border font-mono text-xs font-bold ${
                                                  pendingChanges[item.k] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                                }`}
                                              />
                                            ) : (
                                              <span className={item.v > 0 ? 'text-amber-800 font-bold' : 'text-slate-400'}>{item.v}</span>
                                            )}
                                          </td>
                                        ))}
                                        <td className="p-1.5 text-center font-mono font-bold bg-yellow-50 text-yellow-950">{sumAfk}</td>
                                        <td className="p-1.5 text-center font-mono font-black bg-yellow-100 text-yellow-950">{afkAkhir}</td>

                                        {/* Psikomotorik 1..5 Inputs */}
                                        {[
                                          { k: kP1, v: psi1, f: 'psiko_1' },
                                          { k: kP2, v: psi2, f: 'psiko_2' },
                                          { k: kP3, v: psi3, f: 'psiko_3' },
                                          { k: kP4, v: psi4, f: 'psiko_4' },
                                          { k: kP5, v: psi5, f: 'psiko_5' },
                                        ].map((item, idxCol) => (
                                          <td key={idxCol} className="p-1 text-center font-mono">
                                            {isEditMode ? (
                                              <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={item.v}
                                                onChange={(e) => handleCellChange({
                                                  user_id: p.id,
                                                  sheet_name: 'A3 Aktivitas Forum',
                                                  field_name: item.f,
                                                  old_value: con[item.f] ?? 0,
                                                  new_value: e.target.value,
                                                  session_id: ses.id
                                                })}
                                                className={`w-9 px-1 py-0.5 text-center rounded border font-mono text-xs font-bold ${
                                                  pendingChanges[item.k] ? 'bg-sky-100 border-sky-400 text-sky-900' : 'bg-white border-slate-300'
                                                }`}
                                              />
                                            ) : (
                                              <span className={item.v > 0 ? 'text-sky-800 font-bold' : 'text-slate-400'}>{item.v}</span>
                                            )}
                                          </td>
                                        ))}
                                        <td className="p-1.5 text-center font-mono font-bold bg-sky-50 text-sky-950">{sumPsi}</td>
                                        <td className="p-1.5 text-center font-mono font-black bg-sky-100 text-sky-950">{psiAkhir}</td>

                                        {/* Total & Rata-Rata */}
                                        <td className="p-1.5 text-center font-mono font-bold bg-orange-50/60 text-orange-950">{totSum.toFixed(2)}</td>
                                        <td className="p-1.5 text-center font-mono font-black bg-orange-100 text-orange-950">{totAvg}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 5. SHEET A4 REKAPAN (REKAPITULASI AKTIVITAS FORUM MATRIX - IDENTIK GAMBAR 4) */}
                {activeSheet === 'A4 Rekapan' && (() => {
                  const sessions = rekapData.sessions || [];

                  return (
                    <>
                      <thead className="sticky top-0 z-30 shadow-xs">
                        {/* Title Row */}
                        <tr className="bg-sky-500 text-white font-black text-xs uppercase tracking-wider text-center">
                          <th colSpan={5 + sessions.length} className="py-2 px-4 text-center">
                            REKAPITULASI AKTIVITAS FORUM
                          </th>
                        </tr>
                        {/* Column Header Row 1 */}
                        <tr className="bg-emerald-900 text-white font-extrabold text-[11px] uppercase tracking-wider text-center divide-x divide-emerald-800">
                          <th rowSpan={2} className="p-2.5 w-10 sticky top-0 left-0 z-40 bg-emerald-950">No.</th>
                          <th rowSpan={2} className="p-2.5 min-w-[200px] sticky top-0 left-10 z-40 bg-emerald-950 text-left">Nama Peserta</th>
                          <th rowSpan={2} className="p-2.5 min-w-[140px] text-left bg-emerald-900">Utusan</th>
                          <th colSpan={sessions.length} className="p-1.5 bg-emerald-800 text-white">M A T E R I Ke-</th>
                          <th rowSpan={2} className="p-2.5 w-24 bg-emerald-900 text-white">JUMLAH</th>
                          <th rowSpan={2} className="p-2.5 w-24 bg-emerald-950 text-white">RATA-RAT.</th>
                        </tr>
                        {/* Subheader Row 2 */}
                        <tr className="bg-emerald-50 text-emerald-950 font-bold text-[10px] text-center divide-x divide-emerald-200">
                          {sessions.map((s, sIdx) => (
                            <th key={s.id} className="p-1.5 min-w-[60px]" title={s.title}>
                              {sIdx + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white font-medium">
                        {filteredParticipants.map((p, idx) => {
                          let totalParticipantScore = 0;
                          let evaluatedSessionCount = 0;
                          const sessionAverages = sessions.map((s) => {
                            const ass = rekapData.assessment_map[`${p.id}_${s.id}`] ||
                              (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null);
                            const con = ass?.contributions || {};
                            const vios = Array.isArray(ass?.violations) ? ass.violations : [];
                            const consList = Array.isArray(con) ? con : (Array.isArray(con.contributions) ? con.contributions : []);

                            let logA1 = 0, logA2 = 0, logA3 = 0, logA4 = 0, logA5 = 0;
                            if (con.afektif_1 === undefined && vios.length > 0) {
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
                            if (con.psiko_1 === undefined && consList.length > 0) {
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

                            const a1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_1_${s.id}_`]?.new_value ?? con.afektif_1 ?? logA1 ?? 0);
                            const a2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_2_${s.id}_`]?.new_value ?? con.afektif_2 ?? logA2 ?? 0);
                            const a3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_3_${s.id}_`]?.new_value ?? con.afektif_3 ?? logA3 ?? 0);
                            const a4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_4_${s.id}_`]?.new_value ?? con.afektif_4 ?? logA4 ?? 0);
                            const a5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_afektif_5_${s.id}_`]?.new_value ?? con.afektif_5 ?? logA5 ?? 0);
                            const sumAfk = a1 + a2 + a3 + a4 + a5;

                            const psi1 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_1_${s.id}_`]?.new_value ?? con.psiko_1 ?? logP1 ?? 0);
                            const psi2 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_2_${s.id}_`]?.new_value ?? con.psiko_2 ?? logP2 ?? 0);
                            const psi3 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_3_${s.id}_`]?.new_value ?? con.psiko_3 ?? logP3 ?? 0);
                            const psi4 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_4_${s.id}_`]?.new_value ?? con.psiko_4 ?? logP4 ?? 0);
                            const psi5 = Number(pendingChanges[`${p.id}_A3 Aktivitas Forum_psiko_5_${s.id}_`]?.new_value ?? con.psiko_5 ?? logP5 ?? 0);
                            const sumPsi = psi1 + psi2 + psi3 + psi4 + psi5;

                            const hasSubRubric = (sumAfk > 0 || sumPsi > 0);
                            let sessionAvg = 82.50; // Nilai awal standar: (100*0.5) + (75*0.3) + (50*0.2) = 82.5

                            if (hasSubRubric) {
                              const afkAkhir = Math.max(0, 100 - sumAfk);
                              const psiAkhir = Math.min(100, 50 + sumPsi);
                              const kogAwal = 75;
                              sessionAvg = Number(((afkAkhir * 0.5) + (kogAwal * 0.3) + (psiAkhir * 0.2)).toFixed(2));
                            } else if (ass && (ass.nilai_akhir !== null && ass.nilai_akhir !== undefined && Number(ass.nilai_akhir) > 0)) {
                              sessionAvg = Number(Number(ass.nilai_akhir).toFixed(2));
                            } else if (ass && (ass.afektif !== null && ass.afektif !== undefined && Number(ass.afektif) > 0)) {
                              const sAfk = Number(ass.afektif);
                              const sKog = Number(ass.kognitif ?? 75);
                              const sPsi = Number(ass.psikomotorik ?? 50);
                              sessionAvg = Number(((sAfk * 0.5) + (sKog * 0.3) + (sPsi * 0.2)).toFixed(2));
                            }

                            totalParticipantScore += sessionAvg;
                            evaluatedSessionCount++;
                            return { val: sessionAvg, isEvaluated: true };
                          });

                          const grandAvg = evaluatedSessionCount > 0 ? (totalParticipantScore / evaluatedSessionCount).toFixed(2) : '82.50';

                          return (
                            <tr key={p.id} className="hover:bg-slate-50 divide-x divide-slate-200 font-mono text-xs">
                              <td className="p-2 text-center text-slate-500 sticky left-0 bg-white z-10">{idx + 1}</td>
                              <td className="p-2 font-bold font-sans text-slate-900 sticky left-10 bg-white z-10">{p.name}</td>
                              <td className="p-2 font-sans text-slate-600">{p.instansi || '-'}</td>

                              {sessionAverages.map((sc, sIdx) => (
                                <td key={sIdx} className="p-2 text-center font-bold text-slate-700 bg-emerald-50/20">
                                  {sc.isEvaluated ? sc.val.toFixed(2) : '-'}
                                </td>
                              ))}

                              <td className="p-2 text-center font-bold text-emerald-900 bg-emerald-50/60">
                                {totalParticipantScore.toFixed(2)}
                              </td>
                              <td className="p-2 text-center font-black text-emerald-950 bg-emerald-100">
                                {grandAvg}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>
                  );
                })()}

                {/* 6. SHEET A5 TUGAS (REKAPITULASI NILAI TUGAS MATRIX - IDENTIK GAMBAR 2 UPLOAD 2) */}
                {activeSheet === 'A5 Tugas' && (() => {
                  const sessions = rekapData.sessions || [];

                  return (
                    <>
                      <thead className="sticky top-0 z-30 shadow-xs">
                        {/* Column Header Row 1 */}
                        <tr className="bg-emerald-900 text-white font-extrabold text-[11px] uppercase tracking-wider text-center divide-x divide-emerald-800">
                          <th rowSpan={2} className="p-2.5 w-10 sticky top-0 left-0 z-40 bg-emerald-950">No</th>
                          <th rowSpan={2} className="p-2.5 min-w-[200px] sticky top-0 left-10 z-40 bg-emerald-950 text-left">Nama Peserta</th>
                          <th rowSpan={2} className="p-2.5 min-w-[140px] text-left bg-emerald-900">Utusan</th>
                          <th colSpan={sessions.length} className="p-1.5 bg-yellow-300 text-yellow-950 font-black">Materi Ke</th>
                          <th rowSpan={2} className="p-2.5 w-24 bg-emerald-900 text-white">Jumlah</th>
                          <th rowSpan={2} className="p-2.5 w-24 bg-emerald-950 text-white">Rata-Rata</th>
                        </tr>
                        {/* Subheader Row 2 */}
                        <tr className="bg-yellow-100 text-yellow-950 font-bold text-[10px] text-center divide-x divide-yellow-200">
                          {sessions.map((s, sIdx) => (
                            <th key={s.id} className="p-1.5 min-w-[55px]" title={s.title}>
                              {sIdx + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white font-medium">
                        {filteredParticipants.map((p, idx) => {
                          let sumTask = 0;
                          let hasAnyTask = false;
                          const taskScores = sessions.map((s) => {
                            const ass = rekapData.assessment_map[`${p.id}_${s.id}`] ||
                              (s.session_code ? rekapData.assessment_map[`${p.id}_${s.session_code}`] : null);
                            const con = ass?.contributions || {};
                            const cellKey = `${p.id}_A5 Tugas_tugas_${s.id}_`;
                            const rawScore = pendingChanges[cellKey] !== undefined
                              ? pendingChanges[cellKey].new_value
                              : (con.tugas !== undefined && con.tugas !== null && con.tugas !== '' ? con.tugas : null);

                            const score = (rawScore !== null && rawScore !== undefined && rawScore !== '') ? Number(rawScore) : 0;
                            if (rawScore !== null && rawScore !== undefined && rawScore !== '') {
                              hasAnyTask = true;
                            }
                            sumTask += score;
                            return { s, score, cellKey, rawVal: con.tugas ?? '', isAssigned: rawScore !== null && rawScore !== undefined && rawScore !== '' };
                          });

                          const avgTask = sessions.length > 0 ? (sumTask / sessions.length).toFixed(1) : '0.0';

                          return (
                            <tr key={p.id} className="hover:bg-slate-50 divide-x divide-slate-200 font-mono text-xs">
                              <td className="p-2 text-center text-slate-500 sticky left-0 bg-white z-10">{idx + 1}</td>
                              <td className="p-2 font-bold font-sans text-slate-900 sticky left-10 bg-white z-10">{p.name}</td>
                              <td className="p-2 font-sans text-slate-600">{p.instansi || '-'}</td>

                              {taskScores.map((item, sIdx) => (
                                <td key={sIdx} className="p-1.5 text-center">
                                  {isEditMode ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={item.isAssigned ? item.score : ''}
                                      placeholder="0"
                                      onChange={(e) => handleCellChange({
                                        user_id: p.id,
                                        sheet_name: 'A5 Tugas',
                                        field_name: 'tugas',
                                        old_value: item.rawVal,
                                        new_value: e.target.value,
                                        session_id: item.s.id
                                      })}
                                      className={`w-12 px-1 py-0.5 text-center rounded border font-mono text-xs font-bold ${
                                        pendingChanges[item.cellKey] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                      }`}
                                    />
                                  ) : (
                                    <span className={item.isAssigned && item.score > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}>
                                      {item.isAssigned ? item.score : 0}
                                    </span>
                                  )}
                                </td>
                              ))}

                              <td className="p-2 text-center font-bold text-emerald-900 bg-emerald-50/60">
                                {sumTask}
                              </td>
                              <td className="p-2 text-center font-black text-emerald-950 bg-emerald-100">
                                {avgTask}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>
                  );
                })()}

                {/* 7. SHEET A1 SCREENING (MATRIKS PENILAIAN SCREENING - IDENTIK GAMBAR 1) */}
                {activeSheet === 'A1 Screening' && (
                  <>
                    <thead className="sticky top-0 z-30 shadow-xs">
                      <tr className="bg-emerald-900 text-white font-extrabold text-[11px] uppercase tracking-wider text-center divide-x divide-emerald-800">
                        <th rowSpan={2} className="p-2.5 w-10 sticky top-0 left-0 z-40 bg-emerald-950">No</th>
                        <th rowSpan={2} className="p-2.5 min-w-[200px] sticky top-0 left-10 z-40 bg-emerald-950 text-left">Nama Peserta</th>
                        <th rowSpan={2} className="p-2.5 min-w-[140px] text-left bg-emerald-900">Utusan</th>
                        <th colSpan={5} className="p-2 bg-emerald-800 text-white font-black">Screening</th>
                        <th rowSpan={2} className="p-2.5 w-24 bg-emerald-900 text-white font-black">Jumlah</th>
                        <th rowSpan={2} className="p-2.5 w-24 bg-emerald-950 text-white font-black">Rata-Rata</th>
                      </tr>
                      <tr className="bg-emerald-700 text-white font-bold text-[10px] text-center divide-x divide-emerald-600">
                        <th className="p-1.5 min-w-[85px]">Keislaman</th>
                        <th className="p-1.5 min-w-[85px]">KeHMIan</th>
                        <th className="p-1.5 min-w-[95px]">KeIndonesiaan</th>
                        <th className="p-1.5 min-w-[100px]">Keorganisasian</th>
                        <th className="p-1.5 min-w-[85px]">Suplemen</th>
                      </tr>
                      {/* Numbering Row Identik Excel */}
                      <tr className="bg-lime-400 text-slate-950 font-black text-[10px] text-center divide-x divide-lime-500 shadow-xs">
                        <th className="py-1">1</th>
                        <th className="py-1">2</th>
                        <th className="py-1">3</th>
                        <th className="py-1">4</th>
                        <th className="py-1">5</th>
                        <th className="py-1">6</th>
                        <th className="py-1">7</th>
                        <th className="py-1">8</th>
                        <th className="py-1">9</th>
                        <th className="py-1">10</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-medium">
                      {filteredParticipants.map((p, idx) => {
                        const ass = rekapData.assessment_map[`${p.id}_global`];
                        const con = ass?.contributions || {};

                        const kIsl = `${p.id}_A1 Screening_screening_keislaman__`;
                        const kHmi = `${p.id}_A1 Screening_screening_kehmi__`;
                        const kInd = `${p.id}_A1 Screening_screening_keindonesiaan__`;
                        const kOrg = `${p.id}_A1 Screening_screening_keorganisasian__`;
                        const kSup = `${p.id}_A1 Screening_screening_suplemen__`;

                        const rawIsl = pendingChanges[kIsl] !== undefined ? pendingChanges[kIsl].new_value : (con.screening_keislaman ?? '');
                        const rawHmi = pendingChanges[kHmi] !== undefined ? pendingChanges[kHmi].new_value : (con.screening_kehmi ?? '');
                        const rawInd = pendingChanges[kInd] !== undefined ? pendingChanges[kInd].new_value : (con.screening_keindonesiaan ?? '');
                        const rawOrg = pendingChanges[kOrg] !== undefined ? pendingChanges[kOrg].new_value : (con.screening_keorganisasian ?? '');
                        const rawSup = pendingChanges[kSup] !== undefined ? pendingChanges[kSup].new_value : (con.screening_suplemen ?? '');

                        const numIsl = rawIsl !== '' && rawIsl !== null ? Number(rawIsl) : 0;
                        const numHmi = rawHmi !== '' && rawHmi !== null ? Number(rawHmi) : 0;
                        const numInd = rawInd !== '' && rawInd !== null ? Number(rawInd) : 0;
                        const numOrg = rawOrg !== '' && rawOrg !== null ? Number(rawOrg) : 0;
                        const numSup = rawSup !== '' && rawSup !== null ? Number(rawSup) : 0;

                        const hasAnyScore = [rawIsl, rawHmi, rawInd, rawOrg, rawSup].some(v => v !== '' && v !== null && v !== undefined);
                        const sumScr = numIsl + numHmi + numInd + numOrg + numSup;
                        const avgScr = hasAnyScore ? (sumScr / 5).toFixed(2) : '-';

                        const screeningFields = [
                          { k: kIsl, raw: rawIsl, num: numIsl, f: 'screening_keislaman' },
                          { k: kHmi, raw: rawHmi, num: numHmi, f: 'screening_kehmi' },
                          { k: kInd, raw: rawInd, num: numInd, f: 'screening_keindonesiaan' },
                          { k: kOrg, raw: rawOrg, num: numOrg, f: 'screening_keorganisasian' },
                          { k: kSup, raw: rawSup, num: numSup, f: 'screening_suplemen' },
                        ];

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 divide-x divide-slate-200 font-mono text-xs">
                            <td className="p-2 text-center text-slate-500 sticky left-0 bg-white z-10">{idx + 1}</td>
                            <td className="p-2 font-bold font-sans text-slate-900 sticky left-10 bg-white z-10">{p.name}</td>
                            <td className="p-2 font-sans text-slate-600">{p.instansi || '-'}</td>

                            {screeningFields.map((fieldItem, fIdx) => {
                              const isFilled = fieldItem.raw !== '' && fieldItem.raw !== null && fieldItem.raw !== undefined;
                              return (
                                <td key={fIdx} className="p-1.5 text-center">
                                  {isEditMode ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={fieldItem.raw}
                                      placeholder="0"
                                      onChange={(e) => handleCellChange({
                                        user_id: p.id,
                                        sheet_name: 'A1 Screening',
                                        field_name: fieldItem.f,
                                        old_value: con[fieldItem.f] ?? '',
                                        new_value: e.target.value
                                      })}
                                      className={`w-14 px-1 py-0.5 text-center rounded border font-mono text-xs font-bold ${
                                        pendingChanges[fieldItem.k] ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300'
                                      }`}
                                    />
                                  ) : (
                                    <span className={isFilled ? 'font-bold text-slate-800' : 'text-slate-400'}>
                                      {isFilled ? Number(fieldItem.raw) : 0}
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="p-2 text-center font-bold text-emerald-900 bg-emerald-50/60">
                              {sumScr}
                            </td>
                            <td className="p-2 text-center font-black text-emerald-950 bg-emerald-100">
                              {avgScr !== '-' ? avgScr : '0.00'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

              </table>
            )}
          </div>

          {/* Bottom Sheet Selector Tabs (Exact Excel-style UI) */}
          <div className="bg-slate-200/90 border-t border-slate-300 p-1.5 flex items-center space-x-1 overflow-x-auto no-scrollbar shadow-inner">
            <span className="text-[10px] font-bold text-slate-600 px-2 uppercase tracking-wider shrink-0 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5" />
              <span>SHEETS:</span>
            </span>
            {DEFAULT_SHEETS.map(sheet => {
              const isActive = activeSheet === sheet.id;
              return (
                <button
                  key={sheet.id}
                  onClick={() => setActiveSheet(sheet.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                    isActive 
                      ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{sheet.name}</span>
                </button>
              );
            })}
          </div>

        </div>

      </main>

      {/* Audit Log Drawer Modal */}
      {showLogDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Riwayat Log Koreksi Spreadsheet</h3>
              </div>
              <button
                onClick={() => setShowLogDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingLogs ? (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                  <span>Memuat riwayat koreksi...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs">
                  Belum ada log koreksi yang tercatat.
                </div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                      <span className="font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">{log.sheet_name}</span>
                    </div>
                    <div className="font-bold text-slate-900">
                      {log.user?.name || `Peserta #${log.user_id}`}
                      {log.class_room?.name && <span className="text-slate-500 font-normal"> ({log.class_room.name})</span>}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="text-slate-500">Kolom <strong className="font-mono text-slate-700">{log.field_name}</strong>:</span>
                      <span className="line-through text-rose-500 font-mono">{log.old_value || '(kosong)'}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="font-bold text-emerald-600 font-mono">{log.new_value}</span>
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded-md border border-slate-100">
                        "{log.reason}"
                      </p>
                    )}
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                      <span>Dikelola oleh: <strong className="text-slate-800">{log.admin?.name || 'Administrator / MOT'}</strong></span>
                      {log.admin?.role && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {log.admin.role === 'superadmin' ? 'Super Admin' : (log.admin.role === 'admin' ? 'MOT / Admin' : log.admin.role)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 text-center">
              <button
                onClick={() => setShowLogDrawer(false)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
