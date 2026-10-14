<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Registration;
use App\Models\Training;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Super Admin User (Akun Utama)
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin.utama@presentrain.com'],
            [
                'name'          => 'Dr. Irfan Subagyo, M.Kom',
                'password'      => Hash::make('AdminUtama123!'),
                'role'          => 'super_admin',
                'phone'         => '081234567890',
                'instansi'      => 'Panitia Pusat PresenTrain',
                'user_qr_token' => 'ABSEN-SUPERADMIN-IRFAN-001',
            ]
        );

        // 3. Sample Participants (Dikosongkan - tidak ada akun demo / dummy peserta)
        $participantsData = [];

        $users = [];
        foreach ($participantsData as $p) {
            $users[] = User::updateOrCreate(['email' => $p['email']], $p);
        }

        // 4. Create Master Training
        $training = Training::updateOrCreate(
            ['code' => 'TR-HMI-BDL-2026'],
            [
                'title'       => 'Basic Training Raya HMI Cabang Bandar Lampung 2026',
                'description' => 'Program perkaderan utama HMI Cabang Bandar Lampung 2026.',
                'location'    => 'Sekretariat HMI Cabang Bandar Lampung',
                'start_date'  => '2026-10-09',
                'end_date'    => '2026-10-12',
                'status'      => 'Aktif',
                'created_by'  => $superAdmin->id,
                'banner_slides' => [
                    '/slide/BALIHO BTR FIX.jpg',
                    '/slide/BALIHO BTR FIX (1).jpg',
                    '/slide/BALIHO BTR FIX (2).jpg',
                    '/slide/BALIHO BTR FIX (3).jpg'
                ]
            ]
        );

        // 5. Create 9 Main Training Sessions (Materi Pokok LK 1)
        $sessionsData = [
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

        // Hapus sesi lama yang tidak termasuk dalam 9 sesi aktif
        $activeCodes = array_column($sessionsData, 'session_code');
        TrainingSession::where('training_id', $training->id)->whereNotIn('session_code', $activeCodes)->delete();

        $sessions = [];
        foreach ($sessionsData as $s) {
            $sessions[] = TrainingSession::updateOrCreate(
                ['training_id' => $training->id, 'session_code' => $s['session_code']],
                array_merge($s, ['training_id' => $training->id])
            );
        }

        // 6. Register Participants to Training
        foreach ($users as $user) {
            $reg = Registration::firstOrCreate([
                'user_id'     => $user->id,
                'training_id' => $training->id,
            ], [
                'status'        => 'active',
                'registered_at' => now(),
            ]);

            // Seed initial attendance for SES-01 and SES-02 for Budi Santoso
            if ($user->email === 'peserta@presentraining.com') {
                Attendance::firstOrCreate([
                    'registration_id'     => $reg->id,
                    'training_session_id' => $sessions[0]->id,
                ], [
                    'scanned_by' => $superAdmin->id,
                    'scanned_at' => '2026-09-20 08:14:00',
                    'status'     => 'present',
                    'source'     => 'camera_scan',
                ]);

                Attendance::firstOrCreate([
                    'registration_id'     => $reg->id,
                    'training_session_id' => $sessions[1]->id,
                ], [
                    'scanned_by' => $superAdmin->id,
                    'scanned_at' => '2026-09-20 10:05:00',
                    'status'     => 'present',
                    'source'     => 'camera_scan',
                ]);
            }
        }

        // 7. Seed 50 Butir Soal Pre-Test Pilihan Ganda Asli (4 Opsi A, B, C, D)
        $this->call(PretestQuestionsSeeder::class);


        // 8. Seed Submissions & Grade Requests (Hanya jika ada sample peserta)
        if (!empty($users)) {
            $sub1 = \App\Models\QuizSubmission::updateOrCreate(
                ['submission_code' => 'SUB-HMI-001'],
                [
                    'quiz_id' => $quiz1->id,
                    'user_id' => $users[0]->id,
                    'participant_name' => $users[0]->name,
                    'participant_email' => $users[0]->email,
                    'score' => 100,
                    'answers' => [
                        'Q-HMI-101' => 'B. 5 Februari 1947 di Yogyakarta',
                        'Q-HMI-102' => 'A. Prof. Drs. Lafran Pane',
                        'Q-HMI-103' => 'B. Terbinanya insan akademis, pencipta, pengabdi yang bernapaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridhoi Allah SWT',
                        'Q-HMI-104' => 'HMI didirikan untuk mempertahankan kemerdekaan Indonesia dan mensyiarkan nilai-nilai Islam yang berkemajuan di lingkungan kampus perguruan tinggi.',
                    ],
                    'is_locked' => true,
                    'submitted_at' => now(),
                ]
            );

            if (isset($users[1])) {
                $sub2 = \App\Models\QuizSubmission::updateOrCreate(
                    ['submission_code' => 'SUB-HMI-002'],
                    [
                        'quiz_id' => $quiz1->id,
                        'user_id' => $users[1]->id,
                        'participant_name' => $users[1]->name,
                        'participant_email' => $users[1]->email,
                        'score' => 75,
                        'answers' => [
                            'Q-HMI-101' => 'B. 5 Februari 1947 di Yogyakarta',
                            'Q-HMI-102' => 'A. Prof. Drs. Lafran Pane',
                            'Q-HMI-103' => 'B. Terbinanya insan akademis, pencipta, pengabdi yang bernapaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridhoi Allah SWT',
                            'Q-HMI-104' => 'Latar belakang berdirinya HMI karena dorongan semangat keislaman dan keindonesiaan.',
                        ],
                        'is_locked' => true,
                        'submitted_at' => now(),
                    ]
                );

                \App\Models\QuizGradeRequest::updateOrCreate(
                    ['request_code' => 'REQ-HMI-001'],
                    [
                        'submission_id' => $sub2->id,
                        'quiz_id' => $quiz1->id,
                        'quiz_title' => 'Pre-Test LK 1: Wawasan Ke-HMI-an, Keislaman & Keindonesiaan',
                        'participant_id' => 'USR-' . $users[1]->id,
                        'participant_name' => $users[1]->name,
                        'requested_by' => 'Kanda Yudi Pratama, S.H. (MOT)',
                        'request_type' => 'edit_score',
                        'reason' => 'Peserta menambahkan penjelasan komprehensif pada jawaban essay saat dikonfirmasi dalam forum penelaahan materi.',
                        'old_score' => 75,
                        'new_score_requested' => 90,
                        'status' => 'pending',
                    ]
                );
            }

            // 9. Seed Assessments
            foreach ($users as $idx => $u) {
                $pId = "USR-{$u->id}";
                \App\Models\Assessment::updateOrCreate(
                    ['participant_id' => $pId],
                    [
                        'training_id' => $training->id,
                        'user_id' => $u->id,
                        'kognitif' => 75 + ($idx * 4),
                        'afektif' => 100 - ($idx * 2),
                        'psikomotorik' => 50 + ($idx * 5),
                        'violations' => $idx === 0 ? [
                            [
                                'id' => 'v1',
                                'item' => 'Terlambat Hadir Sesi',
                                'points' => -1,
                                'session' => 'SES-01',
                                'time' => '08:15 WIB',
                            ]
                        ] : [],
                        'contributions' => [
                            [
                                'id' => 'c1',
                                'item' => 'Bertanya Pertanyaan Substantif',
                                'points' => 1,
                                'symbol' => 'Q',
                                'session' => 'SES-01',
                                'time' => '08:30 WIB',
                            ]
                        ],
                        'notes' => 'Catatan evaluasi instruktur',
                    ]
                );
            }

            // 10. Seed Initial Tickets
            \App\Models\Ticket::updateOrCreate(
                ['ticket_code' => 'INC-081'],
                [
                    'user_id' => $users[0]->id,
                    'category' => 'QR Token Tidak Terbaca',
                    'priority' => 'Tinggi',
                    'msg' => 'Kamera HP peserta retak sehingga scanner sulit membaca token.',
                    'status' => 'Selesai',
                    'time' => '19/09/2026 08:30 WIB',
                    'solution' => 'Presensi manual panitia telah diset Hadir.',
                    'sender_name' => $users[0]->name,
                    'sender_role' => 'participant',
                ]
            );

            if (isset($users[1])) {
                \App\Models\Ticket::updateOrCreate(
                    ['ticket_code' => 'INC-082'],
                    [
                        'user_id' => $users[1]->id,
                        'category' => 'Kendala Teknis Quiz / Ujian',
                        'priority' => 'Normal',
                        'msg' => 'Peserta mengalami koneksi putus saat pengerjaan Post-Test.',
                        'status' => 'Proses',
                        'time' => '20/09/2026 10:15 WIB',
                        'solution' => 'Menunggu peninjauan & reset kuis oleh Super Admin.',
                        'sender_name' => $users[1]->name,
                        'sender_role' => 'participant',
                    ]
                );
            }
        }

        // Jalankan Sinkronisasi Data Master Kelas, Admin, Peserta, Presensi, Penilaian, & Kuis
        $this->call(ClassDataSynchronizationSeeder::class);
    }
}
