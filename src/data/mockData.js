// Mock Data for PresenTrain Mobile Web App

export const INITIAL_TRAINING = {
  id: "TR-HMI-BDL-2026",
  title: "Basic Training Raya HMI Cabang Bandar Lampung 2026",
  dateRange: "20/10/2026 - 22/10/2026",
  location: "Sekretariat HMI Cabang Bandar Lampung",
  totalParticipants: 48,
  status: "Aktif",
  sessions: [
    {
      id: "SES-01",
      title: "Sesi 1: Pembukaan & Orientasi Latihan (Contract Learning)",
      speaker: "Master of Training (MOT) BPL HMI",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "08:00 - 10:00 WIB",
      date: "20/10/2026",
      status: "Selesai",
    },
    {
      id: "SES-02",
      title: "Sesi 2: Sejarah Perjuangan HMI (Latar Belakang & Fase Perjuangan)",
      speaker: "Kanda Yudi Pratama, S.H. (Senior HMI Cabang Bandar Lampung)",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "10:15 - 12:30 WIB",
      date: "20/10/2026",
      status: "Berlangsung",
    },
    {
      id: "SES-03",
      title: "Sesi 3: Nilai-Nilai Dasar Perjuangan (NDP) HMI - Bab I & II",
      speaker: "Kanda Ahmad Rifa'i, M.Pd. (Instruktur BPL HMI)",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "13:30 - 16:00 WIB",
      date: "20/10/2026",
      status: "Mendatang",
    },
    {
      id: "SES-04",
      title: "Sesi 4: Nilai-Nilai Dasar Perjuangan (NDP) HMI - Bab III - VII",
      speaker: "Yanda Dr. Fauzan Azim, M.Ag.",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "19:30 - 22:00 WIB",
      date: "20/10/2026",
      status: "Mendatang",
    },
    {
      id: "SES-05",
      title: "Sesi 5: Konstitusi HMI & Pedoman Perkaderan (AD/ART)",
      speaker: "Yanda M. Rezki, S.H., M.H.",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "08:30 - 11:30 WIB",
      date: "21/10/2026",
      status: "Mendatang",
    },
    {
      id: "SES-06",
      title: "Sesi 6: Mission HMI (Tujuan, Status, Sifat, Peran, & Fungsi HMI)",
      speaker: "Kanda Rizky Febrianto, S.IP.",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "13:30 - 16:30 WIB",
      date: "21/10/2026",
      status: "Mendatang",
    },
    {
      id: "SES-07",
      title: "Sesi 7: Kepemimpinan, Manajemen, dan Organisasi (KMO)",
      speaker: "Kanda Aris Munandar, S.E.",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "19:30 - 22:00 WIB",
      date: "21/10/2026",
      status: "Mendatang",
    },
    {
      id: "SES-08",
      title: "Sesi 8: Muatan Lokal: Peran Kader HMI se-Sirkum Bandar Lampung",
      speaker: "Ketua Umum HMI Cabang Bandar Lampung",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "08:30 - 11:30 WIB",
      date: "22/10/2026",
      status: "Mendatang",
    },
    {
      id: "SES-09",
      title: "Sesi 9: Post-Test, Evaluasi & Rencana Tindak Lanjut (RTL)",
      speaker: "MOT & Tim BPL HMI Cabang Bandar Lampung",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "13:30 - 16:00 WIB",
      date: "22/10/2026",
      status: "Mendatang",
    },
    {
      id: "SES-10",
      title: "Sesi 10: Closing Ceremony & Pengukuhan Anggota Muda HMI",
      speaker: "Presidium BPL & Pengurus HMI Cabang Bandar Lampung",
      room: "Aula Utama Sekretariat HMI Cabang Bandar Lampung",
      time: "16:30 - 18:00 WIB",
      date: "22/10/2026",
      status: "Mendatang",
    }
  ]
};

export const DEMO_USERS = {
  superAdmin: {
    id: "USR-HMI-SA01",
    name: "Kanda M. Alfarizi, S.H.",
    username: "adminutama",
    email: "superadmin@presentraining.com",
    role: "super_admin",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    phone: "0812-7890-1947",
    title: "Ketua Umum HMI Cabang Bandar Lampung"
  },
  admin: {
    id: "USR-HMI-ADM01",
    name: "Kanda Yudi Pratama, S.H. (MOT)",
    username: "administrator",
    email: "admin@presentraining.com",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    phone: "0813-1947-2026",
    assignedDepartment: "Master of Training (MOT) BPL HMI Cabang Bandar Lampung",
  },
  participant: {
    id: "USR-HMI-01",
    name: "Ahmad Syahputra",
    username: "peserta",
    email: "peserta@presentraining.com",
    role: "participant",
    qrToken: "HMI-LK1-2026-TARBIYAH-01",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    phone: "0857-1947-0001",
    instansi: "HMI Komisariat Tarbiyah UIN RIL",
    registeredAt: "18/10/2026",
  }
};

export const INITIAL_ADMIN_LIST = [
  { id: "ADM-HMI-01", name: "Kanda Yudi Pratama", email: "admin@presentraining.com", dept: "Master of Training (MOT)", status: "Aktif", createdAt: "01/10/2026", canManageAttendance: true, canManageQuiz: true },
  { id: "ADM-HMI-02", name: "Kanda Ahmad Rifa'i", email: "rifai.bpl@presentraining.com", dept: "Co-MOT / Instruktur NDP", status: "Aktif", createdAt: "02/10/2026", canManageAttendance: true, canManageQuiz: true },
  { id: "ADM-HMI-03", name: "Yanda M. Rezki", email: "rezki.bpl@presentraining.com", dept: "Instruktur Konstitusi HMI", status: "Aktif", createdAt: "02/10/2026", canManageAttendance: true, canManageQuiz: false },
  { id: "ADM-HMI-04", name: "Kanda Aris Munandar", email: "aris.sc@presentraining.com", dept: "Steering Committee (SC)", status: "Aktif", createdAt: "03/10/2026", canManageAttendance: true, canManageQuiz: false },
  { id: "ADM-HMI-05", name: "Yunda Siti Fatimah", email: "fatimah.bpl@presentraining.com", dept: "Presidium BPL Cabang BDL", status: "Aktif", createdAt: "04/10/2026", canManageAttendance: true, canManageQuiz: true },
  { id: "ADM-HMI-06", name: "Kanda Rizky Febrianto", email: "rizky.sc@presentraining.com", dept: "Sie. Absensi & Kesekretariatan", status: "Aktif", createdAt: "05/10/2026", canManageAttendance: true, canManageQuiz: false },
];

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

export const INITIAL_PARTICIPANTS = [
  {
    id: "USR-HMI-01",
    name: "Ahmad Syahputra",
    email: "peserta@presentraining.com",
    qrToken: "HMI-LK1-2026-TARBIYAH-01",
    instansi: KOMISARIAT_LIST[0],
    attendances: {
      "SES-01": { present: true, time: "07:50 WIB" },
      "SES-02": { present: true, time: "10:10 WIB" }
    }
  },
  {
    id: "USR-HMI-02",
    name: "Siti Nurul Aini",
    email: "siti.nurul@mail.com",
    qrToken: "HMI-LK1-2026-SYARIAH-02",
    instansi: KOMISARIAT_LIST[1],
    attendances: {
      "SES-01": { present: true, time: "07:55 WIB" },
      "SES-02": { present: true, time: "10:14 WIB" }
    }
  },
  {
    id: "USR-HMI-03",
    name: "Muhammad Rizky",
    email: "m.rizky@mail.com",
    qrToken: "HMI-LK1-2026-USHULUDDIN-03",
    instansi: KOMISARIAT_LIST[2],
    attendances: {
      "SES-01": { present: true, time: "08:02 WIB" },
      "SES-02": { present: false, time: null }
    }
  },
  {
    id: "USR-HMI-04",
    name: "Rahmawati Putri",
    email: "rahma.putri@mail.com",
    qrToken: "HMI-LK1-2026-DAKWAH-04",
    instansi: KOMISARIAT_LIST[3],
    attendances: {
      "SES-01": { present: true, time: "07:48 WIB" },
      "SES-02": { present: true, time: "10:05 WIB" }
    }
  },
  {
    id: "USR-HMI-05",
    name: "Fajar Pratama",
    email: "fajar.pratama@mail.com",
    qrToken: "HMI-LK1-2026-FEBI-05",
    instansi: KOMISARIAT_LIST[4],
    attendances: {
      "SES-01": { present: true, time: "07:52 WIB" },
      "SES-02": { present: true, time: "10:08 WIB" }
    }
  },
  {
    id: "USR-HMI-06",
    name: "Annisa Tri Wahyuni",
    email: "annisa.tri@mail.com",
    qrToken: "HMI-LK1-2026-ANNUR-06",
    instansi: KOMISARIAT_LIST[5],
    attendances: {
      "SES-01": { present: true, time: "08:00 WIB" },
      "SES-02": { present: true, time: "10:15 WIB" }
    }
  }
];

const sampleNames = ["Agus", "Bintang", "Citra", "Dede", "Eka", "Fitri", "Galang", "Hana", "Indra", "Joko", "Kartika", "Lia", "Maman", "Nadia", "Oki", "Putri", "Qori", "Rama", "Sarah", "Taufik"];
const sampleLasts = ["Saputra", "Pratama", "Kurnia", "Utami", "Firmansyah", "Hidayat", "Wibowo", "Suryani", "Lestari", "Nugroho"];

for (let i = 7; i <= 48; i++) {
  const name = `${sampleNames[i % sampleNames.length]} ${sampleLasts[i % sampleLasts.length]}`;
  const code = 100000 + i * 357;
  const qr = `HMI-LK1-2026-SIM-${code}`;
  const instansi = KOMISARIAT_LIST[(i - 1) % KOMISARIAT_LIST.length];
  INITIAL_PARTICIPANTS.push({
    id: `USR-HMI-${i < 10 ? '0' + i : i}`,
    name: name,
    email: `${name.toLowerCase().replace(" ", ".")}@mail.com`,
    qrToken: qr,
    instansi: instansi,
    attendances: {
      "SES-01": { present: i % 4 !== 0, time: i % 4 !== 0 ? "08:10 WIB" : null },
      "SES-02": { present: i % 2 === 0, time: i % 2 === 0 ? "10:12 WIB" : null }
    }
  });
}

export const INITIAL_QUIZZES = [
  {
    id: "QZ-HMI-001",
    title: "Pre-Test LK 1: Wawasan Ke-HMI-an, Keislaman & Keindonesiaan",
    type: "pretest",
    durationMinutes: 15,
    passingGrade: 70,
    linkCode: "PRETEST-LK1-HMI-2026",
    status: "Aktif",
    createdBy: "Kanda Yudi Pratama, S.H. (MOT)",
    createdAt: "19/10/2026",
    description: "Evaluasi awal pemahaman calon kader sebelum memasuki rangkaian materi perkaderan LK 1 HMI Cabang Bandar Lampung.",
    instructions: "1) Berdoalah sebelum memulai pengerjaan pre-test.\n2) Dilarang me-refresh atau menutup halaman kuis selama ujian berlangsung.\n3) Pilih jawaban yang paling tepat sesuai dengan pemahaman Anda.\n4) Setelah menekan Submit, hasil akan terekam secara otomatis di sistem.",
    questions: [
      {
        id: "Q-HMI-101",
        type: "multiple_choice",
        text: "Kapan Himpunan Mahasiswa Islam (HMI) resmi didirikan dan di kota mana peristiwanya terjadi?",
        options: [
          "A. 14 Februari 1946 di Jakarta",
          "B. 5 Februari 1947 di Yogyakarta",
          "C. 17 Agustus 1945 di Bandung",
          "D. 10 November 1947 di Surabaya"
        ],
        correctAnswer: "B. 5 Februari 1947 di Yogyakarta",
        scoreWeight: 25
      },
      {
        id: "Q-HMI-102",
        type: "multiple_choice",
        text: "Siapakah tokoh pahlawan nasional yang menjadi pemrakarsa/pendiri utama HMI?",
        options: [
          "A. Prof. Drs. Lafran Pane",
          "B. Nurcholish Madjid",
          "C. Jenderal Soedirman",
          "D. Sultan Hamengkubuwono IX"
        ],
        correctAnswer: "A. Prof. Drs. Lafran Pane",
        scoreWeight: 25
      },
      {
        id: "Q-HMI-103",
        type: "multiple_choice",
        text: "Berdasarkan Pasal 4 Anggaran Dasar HMI, apakah tujuan utama didirikannya HMI?",
        options: [
          "A. Menjadi partai politik mahasiswa terbesar di Indonesia",
          "B. Terbinanya insan akademis, pencipta, pengabdi yang bernapaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridhoi Allah SWT",
          "C. Menguasai seluruh lembaga kemahasiswaan di kampus",
          "D. Mencari beasiswa pendidikan bagi mahasiswa muslim"
        ],
        correctAnswer: "B. Terbinanya insan akademis, pencipta, pengabdi yang bernapaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridhoi Allah SWT",
        scoreWeight: 25
      },
      {
        id: "Q-HMI-104",
        type: "essay",
        text: "Jelaskan secara singkat latar belakang sosiologis dan akademis yang melandasi berdirinya HMI pada tahun 1947!",
        correctAnswer: "Kunci jawaban acuan: Latar belakang berdirinya HMI dipengaruhi oleh kondisi umat Islam yang mengalami kemunduran pemahaman agama, kondisi perguruan tinggi dan dunia kemahasiswaan yang sekuler, serta tuntutan mempertahankan kemerdekaan NKRI dari agresi militer Belanda.",
        scoreWeight: 25
      }
    ]
  },
  {
    id: "QZ-HMI-002",
    title: "Post-Test LK 1: Nilai-Nilai Dasar Perjuangan (NDP) & Konstitusi HMI",
    type: "posttest",
    durationMinutes: 20,
    passingGrade: 75,
    linkCode: "POSTTEST-LK1-HMI-2026",
    status: "Aktif",
    createdBy: "Kanda Yudi Pratama, S.H. (MOT)",
    createdAt: "22/10/2026",
    description: "Evaluasi komprehensif tingkat pemahaman materi pokok perkaderan LK 1 (NDP, Konstitusi, Mission & KMO).",
    questions: [
      {
        id: "Q-HMI-201",
        type: "multiple_choice",
        text: "Berapakah jumlah Bab dalam rumusan ideologi Nilai-Nilai Dasar Perjuangan (NDP) HMI?",
        options: ["A. 5 Bab", "B. 7 Bab", "C. 9 Bab", "D. 12 Bab"],
        correctAnswer: "B. 7 Bab",
        scoreWeight: 30
      },
      {
        id: "Q-HMI-202",
        type: "multiple_choice",
        text: "Apakah bentuk kekuasaan tertinggi dalam struktur kepemimpinan HMI di tingkat Cabang?",
        options: [
          "A. Kongres HMI",
          "B. Konferensi Cabang (Konfercab)",
          "C. Musyawarah Komisariat (Muskom)",
          "D. Rapat Harian Pengurus"
        ],
        correctAnswer: "B. Konferensi Cabang (Konfercab)",
        scoreWeight: 30
      },
      {
        id: "Q-HMI-203",
        type: "essay",
        text: "Sebutkan 5 kualitas insan cita yang terkandung dalam Pasal 4 AD HMI beserta perannya sebagai kader mahasiswa!",
        correctAnswer: "Kunci jawaban acuan: 1) Insan Akademis, 2) Insan Pencipta, 3) Insan Pengabdi, 4) Bernapaskan Islam, 5) Bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridhoi Allah SWT.",
        scoreWeight: 40
      }
    ]
  }
];

export const INITIAL_QUIZ_SUBMISSIONS = [
  {
    id: "SUB-HMI-001",
    quizId: "QZ-HMI-001",
    participantId: "USR-HMI-01",
    participantName: "Ahmad Syahputra",
    participantEmail: "peserta@presentraining.com",
    score: 100,
    submittedAt: "20/10/2026 09:15 WIB",
    isLocked: true,
    answers: {
      "Q-HMI-101": "B. 5 Februari 1947 di Yogyakarta",
      "Q-HMI-102": "A. Prof. Drs. Lafran Pane",
      "Q-HMI-103": "B. Terbinanya insan akademis, pencipta, pengabdi yang bernapaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridhoi Allah SWT",
      "Q-HMI-104": "HMI didirikan untuk mempertahankan kemerdekaan Indonesia dan mensyiarkan nilai-nilai Islam yang berkemajuan di lingkungan kampus perguruan tinggi."
    }
  },
  {
    id: "SUB-HMI-002",
    quizId: "QZ-HMI-001",
    participantId: "USR-HMI-02",
    participantName: "Siti Nurul Aini",
    participantEmail: "siti.nurul@mail.com",
    score: 75,
    submittedAt: "20/10/2026 09:25 WIB",
    isLocked: true,
    answers: {
      "Q-HMI-101": "B. 5 Februari 1947 di Yogyakarta",
      "Q-HMI-102": "A. Prof. Drs. Lafran Pane",
      "Q-HMI-103": "B. Terbinanya insan akademis, pencipta, pengabdi yang bernapaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridhoi Allah SWT",
      "Q-HMI-104": "Latar belakang berdirinya HMI karena dorongan semangat keislaman dan keindonesiaan."
    }
  }
];

export const INITIAL_QUIZ_GRADE_REQUESTS = [
  {
    id: "REQ-HMI-001",
    submissionId: "SUB-HMI-002",
    quizId: "QZ-HMI-001",
    quizTitle: "Pre-Test LK 1: Wawasan Ke-HMI-an, Keislaman & Keindonesiaan",
    participantId: "USR-HMI-02",
    participantName: "Siti Nurul Aini",
    requestedBy: "Kanda Yudi Pratama, S.H. (MOT)",
    requestType: "edit_score",
    reason: "Peserta menambahkan penjelasan komprehensif pada jawaban essay saat dikonfirmasi dalam forum penelaahan materi.",
    oldScore: 75,
    newScoreRequested: 90,
    status: "pending",
    createdAt: "20/10/2026 10:30 WIB"
  }
];

export const VIOLATION_RULES = [
  { id: "v1", label: "Terlambat Hadir Sesi", points: -1 },
  { id: "v2", label: "Tidak Menggunakan Atribut HMI", points: -2 },
  { id: "v3", label: "Bermain HP / Tidak Fokus", points: -3 },
  { id: "v4", label: "Tidur Saat Materi", points: -4 },
  { id: "v5", label: "Pelanggaran Etika Forum Berat", points: -5 }
];

export const CONTRIBUTION_RULES = [
  { id: "c1", label: "Bertanya Pertanyaan Substantif", points: 1 },
  { id: "c2", label: "Menjawab / Menanggap Pemateri", points: 2 },
  { id: "c3", label: "Menyampaikan Resume Sesi", points: 3 },
  { id: "c4", label: "Memimpin Diskusi Kelompok", points: 4 },
  { id: "c5", label: "Kontribusi Aktif Sangat Baik", points: 5 }
];

export const calculateAssessment = (assessment) => {
  const baseAfektif = 100;
  const violationDeductions = (assessment?.violations || []).reduce((acc, v) => acc + Math.abs(v.points || 0), 0);
  const contributionBonuses = (assessment?.contributions || []).reduce((acc, c) => acc + Math.abs(c.points || 0), 0);
  
  const afektifScore = Math.max(0, Math.min(100, baseAfektif - violationDeductions + contributionBonuses));
  const kognitifScore = assessment?.kognitif ?? 75;
  const psikomotorikScore = assessment?.psikomotorik ?? 50;
  
  const na = (afektifScore * 0.4) + (kognitifScore * 0.4) + (psikomotorikScore * 0.2);
  const roundedNA = Math.round(na * 10) / 10;
  
  let status = "Lulus (Baik Sekali)";
  if (roundedNA < 60) {
    status = "Tidak Lulus";
  } else if (roundedNA < 75) {
    status = "Lulus (Cukup)";
  } else if (roundedNA < 85) {
    status = "Lulus (Baik)";
  }

  return {
    afektif: afektifScore,
    kognitif: kognitifScore,
    psikomotorik: psikomotorikScore,
    nilaiAkhir: roundedNA,
    status
  };
};

export const INITIAL_ASSESSMENTS = {};

