<?php

namespace Database\Seeders;

use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\ClassAdmin;
use App\Models\ClassQuizAccess;
use App\Models\ClassRoom;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizSubmission;
use App\Models\Registration;
use App\Models\Training;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ClassDataSynchronizationSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Dapatkan atau Buat Master Training & Sesi
        $training = Training::firstOrCreate(
            ['code' => 'TR-HMI-BDL-2026'],
            [
                'title'       => 'Basic Training Raya HMI Cabang Bandar Lampung 2026',
                'description' => 'Program perkaderan utama HMI Cabang Bandar Lampung 2026.',
                'location'    => 'Sekretariat HMI Cabang Bandar Lampung',
                'start_date'  => '2026-10-09',
                'end_date'    => '2026-10-12',
                'status'      => 'Aktif',
            ]
        );

        $defaultSessionsData = [
            [
                'session_code' => 'SES-01',
                'title'        => 'Filsafat dan Logika',
                'speaker'      => '-',
                'room'         => 'Ruang Kelas',
                'session_date' => '2026-10-10',
                'start_time'   => '08:00:00',
                'end_time'     => '12:00:00',
                'status'       => 'Berlangsung',
            ],
            [
                'session_code' => 'SES-02',
                'title'        => 'Nilai-Nilai Dasar Perjuangan (NDP) HMI – Sesi 1',
                'speaker'      => '-',
                'room'         => 'Ruang Kelas',
                'session_date' => '2026-10-10',
                'start_time'   => '13:30:00',
                'end_time'     => '15:30:00',
                'status'       => 'Mendatang',
            ],
            [
                'session_code' => 'SES-03',
                'title'        => 'Nilai-Nilai Dasar Perjuangan (NDP) HMI – Sesi 2 & 3',
                'speaker'      => '-',
                'room'         => 'Ruang Kelas',
                'session_date' => '2026-10-10',
                'start_time'   => '16:00:00',
                'end_time'     => '22:00:00',
                'status'       => 'Mendatang',
            ],
            [
                'session_code' => 'SES-04',
                'title'        => 'Sejarah Peradaban Islam',
                'speaker'      => '-',
                'room'         => 'Ruang Kelas',
                'session_date' => '2026-10-11',
                'start_time'   => '08:00:00',
                'end_time'     => '12:00:00',
                'status'       => 'Mendatang',
            ],
            [
                'session_code' => 'SES-05',
                'title'        => 'Sejarah Perjuangan HMI',
                'speaker'      => '-',
                'room'         => 'Ruang Kelas',
                'session_date' => '2026-10-11',
                'start_time'   => '13:30:00',
                'end_time'     => '15:30:00',
                'status'       => 'Mendatang',
            ],
            [
                'session_code' => 'SES-06',
                'title'        => 'Kelembagaan HMI',
                'speaker'      => '-',
                'room'         => 'Ruang Kelas',
                'session_date' => '2026-10-11',
                'start_time'   => '16:00:00',
                'end_time'     => '18:00:00',
                'status'       => 'Mendatang',
            ],
            [
                'session_code' => 'SES-07',
                'title'        => 'Konstitusi HMI & Pedoman Perkaderan (AD/ART)',
                'speaker'      => '-',
                'room'         => 'Ruang Kelas',
                'session_date' => '2026-10-11',
                'start_time'   => '20:00:00',
                'end_time'     => '23:15:00',
                'status'       => 'Mendatang',
            ],
            [
                'session_code' => 'SES-08',
                'title'        => 'Mission HMI',
                'speaker'      => '-',
                'room'         => 'Ruang Kelas',
                'session_date' => '2026-10-12',
                'start_time'   => '08:00:00',
                'end_time'     => '15:30:00',
                'status'       => 'Mendatang',
            ],
            [
                'session_code' => 'SES-09',
                'title'        => 'Kepemimpinan, Manajemen, dan Organisasi (KMO)',
                'speaker'      => '-',
                'room'         => 'Ruang Kelas',
                'session_date' => '2026-10-12',
                'start_time'   => '16:00:00',
                'end_time'     => '22:00:00',
                'status'       => 'Mendatang',
            ],
        ];

        // Hapus sesi lama jika ada di luar 9 sesi
        $activeCodes = array_column($defaultSessionsData, 'session_code');
        TrainingSession::where('training_id', $training->id)->whereNotIn('session_code', $activeCodes)->delete();

        foreach ($defaultSessionsData as $s) {
            TrainingSession::updateOrCreate(
                ['training_id' => $training->id, 'session_code' => $s['session_code']],
                array_merge($s, ['training_id' => $training->id])
            );
        }

        $sessions = TrainingSession::where('training_id', $training->id)->orderBy('session_code', 'asc')->get();

        // 2. Buat 6 Kelas Training Resmi LK1 HMI
        $classDefinitions = [
            [
                'name' => 'Kelas A - Hasan Al-Banna',
                'code' => 'KLS-LK1-A',
                'description' => 'Kelas Kader Pemikiran & Karakter Kepemimpinan Dasar.',
                'status' => 'Aktif',
            ],
            [
                'name' => 'Kelas B - Nurcholish Madjid',
                'code' => 'KLS-LK1-B',
                'description' => 'Kelas Pendalaman Nilai-Nilai Dasar Perjuangan (NDP) & Falsafah.',
                'status' => 'Aktif',
            ],
            [
                'name' => 'Kelas C - Lafran Pane',
                'code' => 'KLS-LK1-C',
                'description' => 'Kelas Nilai Historis & Gerakan Independensi Kader.',
                'status' => 'Aktif',
            ],
            [
                'name' => 'Kelas D - Mohammad Hatta',
                'code' => 'KLS-LK1-D',
                'description' => 'Kelas Wawasan Kebangsaan, Etika Organisasi, & Koperasi.',
                'status' => 'Aktif',
            ],
            [
                'name' => 'Kelas E - Agus Salim',
                'code' => 'KLS-LK1-E',
                'description' => 'Kelas Retorika, Negosiasi, & Diplomasi Pergerakan.',
                'status' => 'Aktif',
            ],
            [
                'name' => 'Kelas F - Buya Hamka',
                'code' => 'KLS-LK1-F',
                'description' => 'Kelas Integritas Moral, Spiritualitas, & Pengabdian Umat.',
                'status' => 'Aktif',
            ],
        ];

        $classes = [];
        foreach ($classDefinitions as $def) {
            $classes[] = ClassRoom::updateOrCreate(['code' => $def['code']], $def);
        }

        // 3. Buat / Sinkronisasi Administrator per Kelas (MOT Utama & MOT/TM Kelas A-F)
        $this->call(AdminClassSeeder::class);

        // 4. Pastikan Quiz Ada (Pre-Test dan Post-Test)
        $quiz1 = Quiz::firstOrCreate(
            ['quiz_code' => 'QZ-HMI-001'],
            [
                'training_id' => $training->id,
                'title' => 'Pre-Test LK 1: Wawasan Ke-HMI-an, Keislaman & Keindonesiaan',
                'type' => 'pretest',
                'duration_minutes' => 15,
                'passing_grade' => 70,
                'link_code' => 'PRETEST-LK1-HMI-2026',
                'status' => 'Aktif',
                'created_by' => 'Kanda Ahmad Rifa\'i, M.Pd.',
                'description' => 'Evaluasi awal pemahaman calon kader sebelum memasuki materi perkaderan LK 1.',
                'is_active' => true,
            ]
        );

        $quiz2 = Quiz::firstOrCreate(
            ['quiz_code' => 'QZ-HMI-002'],
            [
                'training_id' => $training->id,
                'title' => 'Post-Test LK 1: Nilai-Nilai Dasar Perjuangan (NDP) & Konstitusi HMI',
                'type' => 'posttest',
                'duration_minutes' => 20,
                'passing_grade' => 75,
                'link_code' => 'POSTTEST-LK1-HMI-2026',
                'status' => 'Aktif',
                'created_by' => 'Kanda Yudi Pratama, S.H. (MOT)',
                'description' => 'Evaluasi komprehensif tingkat pemahaman materi pokok perkaderan LK 1.',
                'is_active' => true,
            ]
        );

        $quiz3 = Quiz::firstOrCreate(
            ['quiz_code' => 'QZ-HMI-003'],
            [
                'training_id' => $training->id,
                'title' => 'Mid-Test LK 1: Keorganisasian & Kepemimpinan',
                'type' => 'midtest',
                'duration_minutes' => 15,
                'passing_grade' => 70,
                'link_code' => 'MIDTEST-LK1-HMI-2026',
                'status' => 'Aktif',
                'created_by' => 'Kanda Ahmad Rifa\'i, M.Pd.',
                'description' => 'Evaluasi tengah sesi pemahaman materi keorganisasian dan kepemimpinan manajemen.',
                'is_active' => true,
            ]
        );

        // Soal Master untuk Quiz 2 (Post-Test)
        \App\Models\Question::updateOrCreate(
            ['quiz_id' => $quiz2->id, 'question_code' => 'Q-HMI-201'],
            [
                'type' => 'multiple_choice',
                'text' => 'Berapakah jumlah bab yang termuat dalam naskah utuh Nilai-Nilai Dasar Perjuangan (NDP) HMI?',
                'options' => ['A. 5 Bab', 'B. 7 Bab', 'C. 8 Bab', 'D. 10 Bab'],
                'correct_answer' => 'B. 7 Bab',
                'score_weight' => 70,
                'required' => true,
            ]
        );
        \App\Models\Question::updateOrCreate(
            ['quiz_id' => $quiz2->id, 'question_code' => 'Q-HMI-202'],
            [
                'type' => 'multiple_choice',
                'text' => 'Apakah bentuk kekuasaan tertinggi dalam struktur kepemimpinan HMI di tingkat Cabang?',
                'options' => [
                    'A. Kongres HMI',
                    'B. Konferensi Cabang (Konfercab)',
                    'C. Musyawarah Komisariat (Muskom)',
                    'D. Rapat Harian Pengurus'
                ],
                'correct_answer' => 'B. Konferensi Cabang (Konfercab)',
                'score_weight' => 30,
                'required' => true,
            ]
        );

        // Soal Master untuk Quiz 3 (Mid-Test)
        \App\Models\Question::updateOrCreate(
            ['quiz_id' => $quiz3->id, 'question_code' => 'Q-HMI-301'],
            [
                'type' => 'multiple_choice',
                'text' => 'Kepemimpinan dalam organisasi HMI bersifat kolektif kolegial yang berlandaskan pada asas ....',
                'options' => [
                    'A. Musyawarah untuk mufakat',
                    'B. Otokratis terpusat',
                    'C. Voting terbuka mutlak',
                    'D. Instruksi sepihak ketua umum'
                ],
                'correct_answer' => 'A. Musyawarah untuk mufakat',
                'score_weight' => 100,
                'required' => true,
            ]
        );

        // Buka akses kuis untuk semua kelas di class_quiz_access
        foreach ($classes as $c) {
            ClassQuizAccess::updateOrCreate(
                ['class_id' => $c->id, 'quiz_id' => $quiz1->id],
                ['status' => 'buka', 'opened_at' => now()]
            );
            ClassQuizAccess::updateOrCreate(
                ['class_id' => $c->id, 'quiz_id' => $quiz2->id],
                ['status' => 'buka', 'opened_at' => now()]
            );
            ClassQuizAccess::updateOrCreate(
                ['class_id' => $c->id, 'quiz_id' => $quiz3->id],
                ['status' => 'buka', 'opened_at' => now()]
            );
        }

        // 5. Data Peserta Lengkap & Realistis per Kelas (5 Peserta per Kelas = 30 Peserta)
        $classParticipants = [
            // KELAS A
            0 => [
                ['name' => 'Ahmad Fauzi Pratama', 'email' => 'ahmad.fauzi@uinril.ac.id', 'instansi' => 'HMI Komisariat Tarbiyah UIN RIL', 'phone' => '082188110001', 'afektif' => 95, 'kognitif' => 88, 'psikomotorik' => 85, 'q1_score' => 90, 'q2_score' => 85],
                ['name' => 'Siti Nurhaliza', 'email' => 'siti.nurhaliza@uinril.ac.id', 'instansi' => 'HMI Komisariat Syariah UIN RIL', 'phone' => '082188110002', 'afektif' => 92, 'kognitif' => 84, 'psikomotorik' => 80, 'q1_score' => 85, 'q2_score' => 80],
                ['name' => 'Muhammad Ihsan Kamil', 'email' => 'ihsan.kamil@unila.ac.id', 'instansi' => 'HMI Komisariat Sospol UNILA', 'phone' => '082188110003', 'afektif' => 88, 'kognitif' => 90, 'psikomotorik' => 86, 'q1_score' => 95, 'q2_score' => 90],
                ['name' => 'Dinda Rahmawati', 'email' => 'dinda.rahma@unila.ac.id', 'instansi' => 'HMI Komisariat Hukum UNILA', 'phone' => '082188110004', 'afektif' => 90, 'kognitif' => 78, 'psikomotorik' => 75, 'q1_score' => 80, 'q2_score' => 75],
                ['name' => 'Rizky Alamsyah', 'email' => 'rizky.alamsyah@unila.ac.id', 'instansi' => 'HMI Komisariat Teknik UNILA', 'phone' => '082188110005', 'afektif' => 85, 'kognitif' => 72, 'psikomotorik' => 70, 'q1_score' => 75, 'q2_score' => 70],
            ],
            // KELAS B
            1 => [
                ['name' => 'Budi Santoso', 'email' => 'peserta@presentraining.com', 'instansi' => 'HMI Komisariat FEBI UIN RIL', 'phone' => '085712345678', 'afektif' => 96, 'kognitif' => 92, 'psikomotorik' => 90, 'q1_score' => 100, 'q2_score' => 95],
                ['name' => 'Anisa Rahmawati', 'email' => 'anisa.rahma@uinril.ac.id', 'instansi' => 'HMI Komisariat Ushuluddin UIN RIL', 'phone' => '082188220002', 'afektif' => 94, 'kognitif' => 85, 'psikomotorik' => 82, 'q1_score' => 88, 'q2_score' => 85],
                ['name' => 'Dimas Aditya Saputra', 'email' => 'dimas.aditya@unila.ac.id', 'instansi' => 'HMI Komisariat Pertanian UNILA', 'phone' => '082188220003', 'afektif' => 86, 'kognitif' => 80, 'psikomotorik' => 78, 'q1_score' => 82, 'q2_score' => 80],
                ['name' => 'Putri Anggraini', 'email' => 'putri.anggraini@unila.ac.id', 'instansi' => 'HMI Komisariat Ekonomi UNILA', 'phone' => '082188220004', 'afektif' => 90, 'kognitif' => 88, 'psikomotorik' => 84, 'q1_score' => 90, 'q2_score' => 88],
                ['name' => 'Fajar Nugraha', 'email' => 'fajar.nugraha@darmajaya.ac.id', 'instansi' => 'HMI Komisariat IIB Darmajaya', 'phone' => '082188220005', 'afektif' => 82, 'kognitif' => 74, 'psikomotorik' => 70, 'q1_score' => 75, 'q2_score' => 72],
            ],
            // KELAS C
            2 => [
                ['name' => 'Hendra Wijaya Kusuma', 'email' => 'hendra.wijaya@ubl.ac.id', 'instansi' => 'HMI Komisariat Hukum UBL', 'phone' => '082188330001', 'afektif' => 93, 'kognitif' => 86, 'psikomotorik' => 85, 'q1_score' => 88, 'q2_score' => 85],
                ['name' => 'Nabila Putri Azzahra', 'email' => 'nabila.putri@uinril.ac.id', 'instansi' => 'HMI Komisariat Dakwah UIN RIL', 'phone' => '082188330002', 'afektif' => 91, 'kognitif' => 82, 'psikomotorik' => 80, 'q1_score' => 85, 'q2_score' => 82],
                ['name' => 'Arif Rahman Hakim', 'email' => 'arif.rahman@itera.ac.id', 'instansi' => 'HMI Komisariat ITERA', 'phone' => '082188330003', 'afektif' => 88, 'kognitif' => 84, 'psikomotorik' => 82, 'q1_score' => 86, 'q2_score' => 80],
                ['name' => 'Maya Kartika Sari', 'email' => 'maya.kartika@polinela.ac.id', 'instansi' => 'HMI Komisariat Persiapan POLINELA', 'phone' => '082188330004', 'afektif' => 87, 'kognitif' => 76, 'psikomotorik' => 75, 'q1_score' => 78, 'q2_score' => 75],
                ['name' => 'Farhan Maulana', 'email' => 'farhan.maulana@unila.ac.id', 'instansi' => 'HMI Komisariat Sospol UNILA', 'phone' => '082188330005', 'afektif' => 85, 'kognitif' => 75, 'psikomotorik' => 70, 'q1_score' => 74, 'q2_score' => 70],
            ],
            // KELAS D
            3 => [
                ['name' => 'Gilang Ramadhan', 'email' => 'gilang.ramadhan@unila.ac.id', 'instansi' => 'HMI Komisariat Teknik UNILA', 'phone' => '082188440001', 'afektif' => 94, 'kognitif' => 88, 'psikomotorik' => 86, 'q1_score' => 92, 'q2_score' => 88],
                ['name' => 'Rina Oktavia', 'email' => 'rina.oktavia@unila.ac.id', 'instansi' => 'HMI Komisariat Pertanian UNILA', 'phone' => '082188440002', 'afektif' => 90, 'kognitif' => 82, 'psikomotorik' => 80, 'q1_score' => 84, 'q2_score' => 82],
                ['name' => 'Wahyu Hidayat', 'email' => 'wahyu.hidayat@uinril.ac.id', 'instansi' => 'HMI Komisariat FEBI UIN RIL', 'phone' => '082188440003', 'afektif' => 88, 'kognitif' => 80, 'psikomotorik' => 78, 'q1_score' => 80, 'q2_score' => 78],
                ['name' => 'Tiara Lestari', 'email' => 'tiara.lestari@uinril.ac.id', 'instansi' => 'HMI Komisariat Tarbiyah UIN RIL', 'phone' => '082188440004', 'afektif' => 86, 'kognitif' => 76, 'psikomotorik' => 74, 'q1_score' => 78, 'q2_score' => 75],
                ['name' => 'Bayu Pratama Putra', 'email' => 'bayu.pratama@uinril.ac.id', 'instansi' => 'HMI Komisariat Syariah UIN RIL', 'phone' => '082188440005', 'afektif' => 84, 'kognitif' => 74, 'psikomotorik' => 72, 'q1_score' => 75, 'q2_score' => 70],
            ],
            // KELAS E
            4 => [
                ['name' => 'Reza Firmansyah', 'email' => 'reza.firmansyah@uinril.ac.id', 'instansi' => 'HMI Komisariat Ushuluddin UIN RIL', 'phone' => '082188550001', 'afektif' => 95, 'kognitif' => 89, 'psikomotorik' => 88, 'q1_score' => 94, 'q2_score' => 90],
                ['name' => 'Indah Permata Hati', 'email' => 'indah.permata@unila.ac.id', 'instansi' => 'HMI Komisariat Hukum UNILA', 'phone' => '082188550002', 'afektif' => 92, 'kognitif' => 85, 'psikomotorik' => 82, 'q1_score' => 88, 'q2_score' => 85],
                ['name' => 'Aditya Pratama', 'email' => 'aditya.pratama@unila.ac.id', 'instansi' => 'HMI Komisariat Ekonomi UNILA', 'phone' => '082188550003', 'afektif' => 89, 'kognitif' => 80, 'psikomotorik' => 76, 'q1_score' => 82, 'q2_score' => 80],
                ['name' => 'Salsa Bela Safitri', 'email' => 'salsa.bela@darmajaya.ac.id', 'instansi' => 'HMI Komisariat IIB Darmajaya', 'phone' => '082188550004', 'afektif' => 87, 'kognitif' => 78, 'psikomotorik' => 75, 'q1_score' => 80, 'q2_score' => 75],
                ['name' => 'Yusuf Alamsyah', 'email' => 'yusuf.alamsyah@ubl.ac.id', 'instansi' => 'HMI Komisariat Hukum UBL', 'phone' => '082188550005', 'afektif' => 85, 'kognitif' => 75, 'psikomotorik' => 70, 'q1_score' => 76, 'q2_score' => 72],
            ],
            // KELAS F
            5 => [
                ['name' => 'Kevin Sanjaya', 'email' => 'kevin.sanjaya@itera.ac.id', 'instansi' => 'HMI Komisariat ITERA', 'phone' => '082188660001', 'afektif' => 96, 'kognitif' => 90, 'psikomotorik' => 88, 'q1_score' => 95, 'q2_score' => 92],
                ['name' => 'Zahra Amelia', 'email' => 'zahra.amelia@annur.ac.id', 'instansi' => 'HMI Komisariat Persiapan AN-NUR', 'phone' => '082188660002', 'afektif' => 92, 'kognitif' => 84, 'psikomotorik' => 80, 'q1_score' => 86, 'q2_score' => 82],
                ['name' => 'Bagus Saputra', 'email' => 'bagus.saputra@polinela.ac.id', 'instansi' => 'HMI Komisariat Persiapan POLINELA', 'phone' => '082188660003', 'afektif' => 89, 'kognitif' => 82, 'psikomotorik' => 78, 'q1_score' => 84, 'q2_score' => 80],
                ['name' => 'Dina Mariana', 'email' => 'dina.mariana@uinril.ac.id', 'instansi' => 'HMI Komisariat Dakwah UIN RIL', 'phone' => '082188660004', 'afektif' => 88, 'kognitif' => 78, 'psikomotorik' => 76, 'q1_score' => 80, 'q2_score' => 76],
                ['name' => 'Fikri Ramadhan', 'email' => 'fikri.ramadhan@unila.ac.id', 'instansi' => 'HMI Komisariat Sospol UNILA', 'phone' => '082188660005', 'afektif' => 85, 'kognitif' => 75, 'psikomotorik' => 72, 'q1_score' => 76, 'q2_score' => 70],
            ],
        ];

        foreach ($classParticipants as $cIdx => $pList) {
            $currentClass = $classes[$cIdx];
            $classAdmin = $adminModels[$cIdx] ?? null;

            foreach ($pList as $pIdx => $pData) {
                // Buat User Peserta
                $qrToken = 'ABSEN-P-' . strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $pData['name']), 0, 5)) . '-' . rand(100, 999);
                $participant = User::updateOrCreate(
                    ['email' => $pData['email']],
                    [
                        'name' => $pData['name'],
                        'password' => Hash::make('Peserta123!'),
                        'role' => 'participant',
                        'status' => 'Aktif',
                        'class_id' => $currentClass->id,
                        'phone' => $pData['phone'],
                        'instansi' => $pData['instansi'],
                        'user_qr_token' => $qrToken,
                    ]
                );

                // Buat Registration
                $registration = Registration::firstOrCreate(
                    ['user_id' => $participant->id, 'training_id' => $training->id],
                    ['status' => 'active', 'registered_at' => now()]
                );

                // Buat Presensi untuk tiap sesi
                foreach ($sessions as $sIndex => $sess) {
                    $sessNum = $sIndex + 1;
                    $status = 'present';
                    $note = null;

                    // Buat variasi presensi realistis
                    if ($sessNum <= 6) {
                        // Sebagian besar hadir di sesi 1 - 6
                        $status = 'present';
                    } elseif ($sessNum === 7 && $pIdx === 2) {
                        // 1 peserta izin di sesi 7
                        $status = 'permission';
                        $note = 'Izin praktikum laboratorium kampus';
                    } elseif ($sessNum === 8 && $pIdx === 4) {
                        // 1 peserta izin di sesi 8
                        $status = 'permission';
                        $note = 'Dispensasi persiapan forum LK1';
                    } elseif ($sessNum > 8) {
                        // Sesi 9 & 10 belum berlangsung (atau hadir untuk peserta tertentu)
                        if ($pIdx === 0 || $pIdx === 1) {
                            $status = 'present';
                        } else {
                            continue; // Tidak ada presensi
                        }
                    }

                    Attendance::updateOrCreate(
                        [
                            'registration_id' => $registration->id,
                            'training_session_id' => $sess->id,
                        ],
                        [
                            'scanned_by' => $classAdmin ? $classAdmin->id : null,
                            'scanned_at' => now()->subHours(24 - $sessNum * 2),
                            'status' => $status,
                            'source' => 'camera_scan',
                            'note' => $note,
                        ]
                    );
                }

                // Buat Penilaian LK1
                $afektif = $pData['afektif'];
                $kognitif = $pData['kognitif'];
                $psikomotorik = $pData['psikomotorik'];
                $na = round(($afektif * 0.5) + ($kognitif * 0.3) + ($psikomotorik * 0.2), 1);
                $pred = $na >= 85 ? 'Baik Sekali' : ($na >= 75 ? 'Baik' : ($na >= 60 ? 'Cukup' : 'Kurang'));
                $stat = $na >= 75 ? 'Lulus' : ($na >= 60 ? 'Perbaikan' : 'Tidak Lulus');

                Assessment::updateOrCreate(
                    ['participant_id' => "USR-{$participant->id}"],
                    [
                        'training_id' => $training->id,
                        'user_id' => $participant->id,
                        'kognitif' => $kognitif,
                        'afektif' => $afektif,
                        'psikomotorik' => $psikomotorik,
                        'nilai_akhir' => $na,
                        'status' => $stat,
                        'violations' => $pIdx === 3 ? [
                            [
                                'id' => 'v1',
                                'item' => 'Terlambat Hadir Sesi',
                                'points' => 1,
                                'session' => 'SES-02',
                                'time' => '10:15 WIB',
                            ]
                        ] : [],
                        'contributions' => [
                            [
                                'id' => 'c1',
                                'item' => 'Bertanya Pertanyaan Substantif',
                                'points' => 2,
                                'symbol' => 'Q',
                                'session' => 'SES-01',
                                'time' => '08:30 WIB',
                            ],
                            [
                                'id' => 'c2',
                                'item' => 'Memimpin Diskusi Kelompok',
                                'points' => 3,
                                'symbol' => 'D',
                                'session' => 'SES-03',
                                'time' => '14:00 WIB',
                            ]
                        ],
                        'notes' => "Kader aktif berargumen dan disiplin mengikuti jalannya forum di {$currentClass->name}.",
                    ]
                );

                // Buat Submission Quiz 1 (Pre-Test)
                QuizSubmission::updateOrCreate(
                    [
                        'quiz_id' => $quiz1->id,
                        'user_id' => $participant->id,
                    ],
                    [
                        'submission_code' => "SUB-Q1-{$participant->id}",
                        'participant_name' => $participant->name,
                        'participant_email' => $participant->email,
                        'score' => $pData['q1_score'],
                        'original_score' => $pData['q1_score'],
                        'is_locked' => true,
                        'submitted_at' => now()->subHours(20),
                        'answers' => [
                            'Q-HMI-101' => 'B. 5 Februari 1947 di Yogyakarta',
                            'Q-HMI-102' => 'A. Prof. Drs. Lafran Pane',
                            'Q-HMI-103' => 'B. Terbinanya insan akademis, pencipta, pengabdi yang bernapaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridhoi Allah SWT',
                        ]
                    ]
                );

                // Buat Submission Quiz 2 (Post-Test)
                QuizSubmission::updateOrCreate(
                    [
                        'quiz_id' => $quiz2->id,
                        'user_id' => $participant->id,
                    ],
                    [
                        'submission_code' => "SUB-Q2-{$participant->id}",
                        'participant_name' => $participant->name,
                        'participant_email' => $participant->email,
                        'score' => $pData['q2_score'],
                        'original_score' => $pData['q2_score'],
                        'is_locked' => true,
                        'submitted_at' => now()->subHours(4),
                        'answers' => [
                            'Q-HMI-201' => 'B. 7 Bab',
                            'Q-HMI-202' => 'B. Konferensi Cabang (Konfercab)',
                        ]
                    ]
                );
            }
        }
    }
}
