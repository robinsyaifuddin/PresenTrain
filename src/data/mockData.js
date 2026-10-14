// Master Rules, Constants, and Real-Data Initial Fallbacks for PresenTrain Mobile Web App

export const INITIAL_CLASSES = [];

export const INITIAL_TRAINING = {
  id: "TR-HMI-BDL-2026",
  db_id: 1,
  title: "Basic Training Raya HMI Cabang Bandar Lampung 2026",
  dateRange: "20/10/2026 - 22/10/2026",
  location: "Sekretariat HMI Cabang Bandar Lampung",
  totalParticipants: 0,
  status: "Aktif",
  bannerSlides: [
    "/slide/BALIHO BTR FIX.jpg",
    "/slide/BALIHO BTR FIX (1).jpg",
    "/slide/BALIHO BTR FIX (2).jpg",
    "/slide/BALIHO BTR FIX (3).jpg"
  ],
  drive_assignment_url: "https://drive.google.com/drive/folders/1vbiP8mnEklKnSRYFSDG9Gcc2h1tqkVwR",
  sessions: []
};

export const INITIAL_ADMIN_LIST = [];

export const DEMO_USERS = {};

export const KOMISARIAT_LIST = [
  "HMI Komisariat Tarbiyah UIN RIL",
  "HMI Komisariat Syariah UIN RIL",
  "HMI Komisariat Ushuluddin UIN RIL",
  "HMI Komisariat Dakwah UIN RIL",
  "HMI Komisariat FEBI UIN RIL",
  "HMI Komisariat Persiapan AN-NUR",
  "HMI Komisariat Sospol UNILA",
  "HMI Komisariat Pertanian UNILA",
  "HMI Komisariat UBL UIN RIL",
  "HMI Komisariat Teknik UNILA",
  "HMI Komisariat Hukum UNILA",
  "HMI Komisariat Ekonomi UNILA",
  "HMI Komisariat Persiapan POLINELA",
  "HMI Komisariat Hukum UBL",
  "HMI Komisariat IIB Darmajaya",
  "HMI Komisariat ITERA"
];

export const INITIAL_QUIZZES = [];

// Data Peserta Riil dimuat otomatis dari Database API Backend
const generateSynchronizedData = () => ({ participants: [], assessments: {}, submissions: [] });

const syncData = generateSynchronizedData();
export const INITIAL_PARTICIPANTS = syncData.participants;
export const INITIAL_ASSESSMENTS = syncData.assessments;
export const INITIAL_QUIZ_SUBMISSIONS = syncData.submissions;
export const INITIAL_QUIZ_GRADE_REQUESTS = [];
export const INITIAL_TICKETS = [];

// Master Aturan Rubrik Rekam Proses Penilaian:
// 1. AFEKTIF (50%): Pelanggaran & Kedisiplinan Forum
export const AFEKTIF_RULES = [
  {
    level: 1,
    symbol: "A1",
    label: "Pelanggaran Ringan",
    points: 1,
    type: "deduction",
    items: [
      "Terlambat Hadir Sesi Materi",
      "Tidak Menggunakan Atribut Lengkap",
      "Bermain HP / Tidak Fokus Saat Materi",
      "Makan / Minum saat Pemateri Bicara"
    ]
  },
  {
    level: 2,
    symbol: "A2",
    label: "Pelanggaran Sedang",
    points: 3,
    type: "deduction",
    items: [
      "Tidur / Mengantuk Berat Saat Materi",
      "Keluar Masuk Forum Tanpa Izin MOT",
      "Mengabaikan Instruksi Pemandu / MOT",
      "Membuat Kegaduhan di Forum"
    ]
  },
  {
    level: 3,
    symbol: "A3",
    label: "Pelanggaran Berat",
    points: 5,
    type: "deduction",
    items: [
      "Pelanggaran Etika Forum Berat",
      "Mangkir Sesi Materi Penuh",
      "Tindakan Tidak Disiplin / Melawan Forum",
      "Merusak Fasilitas / Atribut Training"
    ]
  }
];

// 2. KOGNITIF (30%): Sikap Ditanya Pemateri, Interaksi Forum & Daya Tangkap
export const KOGNITIF_RULES = [
  {
    symbol: "K1",
    label: "Respon Tanya Jawab Pemateri",
    points: 2,
    type: "bonus",
    items: [
      "Menjawab Pertanyaan Pemateri dengan Tepat",
      "Memberikan Contoh Kasus yang Kontekstual",
      "Menyampaikan Solusi Cerdas atas Kasus Pemateri"
    ]
  },
  {
    symbol: "K2",
    label: "Interaksi & Keaktifan Forum",
    points: 3,
    type: "bonus",
    items: [
      "Mengajukan Pertanyaan Kritis & Substantif",
      "Sanggahan / Argumentasi Ilmiah yang Logis",
      "Menyampaikan Resume & Sintesis Materi Sesi",
      "Memimpin Diskusi / FGD Substantif"
    ]
  },
  {
    symbol: "K0",
    label: "Catatan Daya Serap / Pasif",
    points: 1,
    type: "deduction",
    items: [
      "Tidak Mampu Menjawab saat Ditunjuk Pemateri",
      "Tidak Menyimak Inti Materi Sesi"
    ]
  }
];

// 3. PSIKOMOTORIK (20%): Sikap Kesadaran, Inisiatif & Aksi Nyata
export const PSIKOMOTORIK_RULES = [
  {
    symbol: "P1",
    label: "Inisiatif & Kepedulian Lingkungan",
    points: 2,
    type: "bonus",
    items: [
      "Inisiatif Menjaga Kebersihan & Kerapihan Forum",
      "Kesadaran Merapikan Sarana & Prasarana Forum",
      "Inisiatif Membantu Kebutuhan Teknis Forum"
    ]
  },
  {
    symbol: "P2",
    label: "Kesadaran Kedisiplinan & Barisan",
    points: 3,
    type: "bonus",
    items: [
      "Kesadaran Tertib Barisan & Waktu Ibadah",
      "Mengingatkan & Mengajak Kawan Tertib Forum",
      "Kesigapan Tanggap Bantuan Peserta Lain"
    ]
  },
  {
    symbol: "P3",
    label: "Aksi Nyata & Simulasi Praktik",
    points: 4,
    type: "bonus",
    items: [
      "Aksi Nyata Simulasi / Praktik Unggul",
      "Tanggung Jawab Eksekusi Tugas Lapangan / Tim",
      "Roleplay Kepemimpinan Sigap & Bertanggung Jawab"
    ]
  }
];

export const ATTITUDE_RULES = {
  afektif: AFEKTIF_RULES,
  kognitif: KOGNITIF_RULES,
  psikomotorik: PSIKOMOTORIK_RULES
};

// Aliases for backwards compatibility
export const VIOLATION_RULES = AFEKTIF_RULES;
export const CONTRIBUTION_RULES = [
  ...KOGNITIF_RULES.map(k => ({ ...k, symbol: k.symbol, label: `[Kognitif] ${k.label}` })),
  ...PSIKOMOTORIK_RULES.map(p => ({ ...p, symbol: p.symbol, label: `[Psikomotorik] ${p.label}` }))
];

export const calculateAssessment = (assessment, sessionFilterId = null) => {
  if (!assessment) {
    return {
      afektif: 100,
      kognitif: 75,
      psikomotorik: 50,
      finalScore: 82.5,
      finalScore1000: 825,
      nilaiAkhir: 82.5,
      totalViolations: 0,
      totalContributions: 0,
      violationDeductions: 0,
      contributionBonuses: 0,
      violations: [],
      contributions: [],
      status: "Lulus",
      predicate: "Baik Sekali",
      statusClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      isPassed: true
    };
  }

  const rawViolations = assessment?.violations;
  const allViolations = Array.isArray(rawViolations)
    ? rawViolations
    : (rawViolations && typeof rawViolations === 'object')
      ? Object.values(rawViolations).filter(v => v && typeof v === 'object' && ('points' in v || 'item' in v))
      : [];

  const rawContributions = assessment?.contributions;
  const allContributions = Array.isArray(rawContributions)
    ? rawContributions
    : (Array.isArray(rawContributions?.contributions)
      ? rawContributions.contributions
      : (rawContributions && typeof rawContributions === 'object')
        ? Object.values(rawContributions).filter(c => c && typeof c === 'object' && ('points' in c || 'item' in c))
        : []);

  const violations = (sessionFilterId && sessionFilterId !== 'ALL')
    ? allViolations.filter(v => v.sessionId === sessionFilterId || String(v.sessionId) === String(sessionFilterId))
    : allViolations;

  const contributions = (sessionFilterId && sessionFilterId !== 'ALL')
    ? allContributions.filter(c => c.sessionId === sessionFilterId || String(c.sessionId) === String(sessionFilterId))
    : allContributions;

  const violationDeductions = violations.reduce((acc, v) => acc + Math.abs(v.points || 0), 0);
  const contributionBonuses = contributions.reduce((acc, c) => acc + Math.abs(c.points || 0), 0);
  
  // Periksa apakah ada record spesifik sesi atau sesi-sesi yang telah dinilai
  const sessionSpecific = (sessionFilterId && sessionFilterId !== 'ALL' && assessment?.sessions?.[sessionFilterId]) 
    ? assessment.sessions[sessionFilterId] 
    : null;

  // Jika merekap seluruh sesi (global/ALL), himpun rata-rata dari seluruh sesi yang tersimpan
  const sessionEntries = assessment?.sessions ? Object.values(assessment.sessions) : [];
  const hasMultipleSessions = (!sessionFilterId || sessionFilterId === 'ALL') && sessionEntries.length > 0;

  let afektifScore = 100;
  let kognitifScore = 75;
  let psikomotorikScore = 50;

  if (sessionSpecific) {
    afektifScore = violations.length > 0 
      ? Math.max(0, 100 - violationDeductions) 
      : (sessionSpecific.afektif !== undefined ? Number(sessionSpecific.afektif) : 100);

    kognitifScore = sessionSpecific.kognitif !== undefined ? Number(sessionSpecific.kognitif) : 75;

    psikomotorikScore = contributions.length > 0 
      ? Math.min(100, 50 + contributionBonuses) 
      : (sessionSpecific.psikomotorik !== undefined ? Number(sessionSpecific.psikomotorik) : 50);
  } else if (hasMultipleSessions) {
    const totalAf = sessionEntries.reduce((acc, s) => acc + (s.afektif !== undefined ? Number(s.afektif) : 100), 0);
    const totalKog = sessionEntries.reduce((acc, s) => acc + (s.kognitif !== undefined ? Number(s.kognitif) : 75), 0);
    const totalPsi = sessionEntries.reduce((acc, s) => acc + (s.psikomotorik !== undefined ? Number(s.psikomotorik) : 50), 0);

    afektifScore = Math.round((totalAf / sessionEntries.length) * 10) / 10;
    kognitifScore = Math.round((totalKog / sessionEntries.length) * 10) / 10;
    psikomotorikScore = Math.round((totalPsi / sessionEntries.length) * 10) / 10;
  } else {
    afektifScore = violations.length > 0
      ? Math.max(0, 100 - violationDeductions)
      : (assessment?.afektif !== undefined ? Number(assessment.afektif) : 100);

    kognitifScore = Number(assessment?.kognitif ?? 75);

    psikomotorikScore = contributions.length > 0
      ? Math.min(100, 50 + contributionBonuses)
      : (assessment?.psikomotorik !== undefined ? Number(assessment.psikomotorik) : 50);
  }

  // Rumus Pembobotan Penilaian LK 1: Afektif 50% + Kognitif 30% + Psikomotorik 20%
  const na = (afektifScore * 0.5) + (kognitifScore * 0.3) + (psikomotorikScore * 0.2);
  const roundedNA = Math.round(na * 10) / 10;
  const roundedNA1000 = Math.round(roundedNA * 10);
  
  let status = "Lulus";
  let predicate = "Baik Sekali";
  let statusClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
  let isPassed = true;

  if (roundedNA < 60) {
    status = "Tidak Lulus";
    predicate = "Kurang";
    statusClass = "bg-rose-100 text-rose-800 border-rose-200";
    isPassed = false;
  } else if (roundedNA < 70) {
    status = "Perbaikan";
    predicate = "Cukup";
    statusClass = "bg-amber-100 text-amber-800 border-amber-200";
    isPassed = true;
  } else if (roundedNA < 80) {
    status = "Lulus";
    predicate = "Baik";
    statusClass = "bg-blue-100 text-blue-800 border-blue-200";
    isPassed = true;
  } else {
    status = "Lulus";
    predicate = "Baik Sekali";
    statusClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
    isPassed = true;
  }

  return {
    afektif: afektifScore,
    kognitif: kognitifScore,
    psikomotorik: psikomotorikScore,
    finalScore: roundedNA,
    finalScore1000: roundedNA1000,
    nilaiAkhir: roundedNA,
    totalViolations: violations.length,
    totalContributions: contributions.length,
    violationDeductions,
    contributionBonuses,
    violations,
    contributions,
    status,
    predicate,
    statusClass,
    isPassed
  };
};
