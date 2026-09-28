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
        // 1. Create Super Admin User
        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@presentrain.com'],
            [
                'name'          => 'Dr. Irfan Subagyo, M.Kom',
                'password'      => Hash::make('admin123'),
                'role'          => 'super_admin',
                'phone'         => '081234567890',
                'instansi'      => 'Panitia Pusat PresenTrain',
                'user_qr_token' => 'ABSEN-SUPERADMIN-IRFAN-001',
            ]
        );

        // 2. Create Panitia / Admin User
        $panitia = User::firstOrCreate(
            ['email' => 'panitia@presentrain.com'],
            [
                'name'          => 'Rian Firmansyah (Panitia)',
                'password'      => Hash::make('panitia123'),
                'role'          => 'admin',
                'phone'         => '085678901234',
                'instansi'      => 'Divisi Registrasi & Scanner',
                'user_qr_token' => 'ABSEN-PANITIA-RIAN-002',
            ]
        );

        // 3. Create Sample Participants
        $participantsData = [
            [
                'name'          => 'Budi Santoso',
                'email'         => 'peserta@presentraining.com',
                'password'      => Hash::make('peserta123'),
                'role'          => 'participant',
                'phone'         => '081298765432',
                'instansi'      => 'Universitas Gadjah Mada',
                'user_qr_token' => 'ABSEN-PESERTA-BUDI-881023',
            ],
            [
                'name'          => 'Siti Rahmawati',
                'email'         => 'siti.rahma@gmail.com',
                'password'      => Hash::make('password123'),
                'role'          => 'participant',
                'phone'         => '082134567891',
                'instansi'      => 'Institut Teknologi Bandung',
                'user_qr_token' => 'ABSEN-PESERTA-SITI-449102',
            ],
            [
                'name'          => 'Ahmad Fauzi',
                'email'         => 'fauzi.ahmad@corporate.id',
                'password'      => Hash::make('password123'),
                'role'          => 'participant',
                'phone'         => '087789012345',
                'instansi'      => 'PT Teknologi Maju Nusantara',
                'user_qr_token' => 'ABSEN-PESERTA-FAUZI-992314',
            ],
            [
                'name'          => 'Dewi Lestari',
                'email'         => 'dewi.lestari@poltek.ac.id',
                'password'      => Hash::make('password123'),
                'role'          => 'participant',
                'phone'         => '085234567890',
                'instansi'      => 'Politeknik Negeri Jakarta',
                'user_qr_token' => 'ABSEN-PESERTA-DEWI-112345',
            ],
            [
                'name'          => 'Eko Prasetyo',
                'email'         => 'eko.prasetyo@univ.ac.id',
                'password'      => Hash::make('password123'),
                'role'          => 'participant',
                'phone'         => '081398765401',
                'instansi'      => 'Universitas Brawijaya',
                'user_qr_token' => 'ABSEN-PESERTA-EKO-776231',
            ],
        ];

        $users = [];
        foreach ($participantsData as $p) {
            $users[] = User::firstOrCreate(['email' => $p['email']], $p);
        }

        // 4. Create Master Training
        $training = Training::firstOrCreate(
            ['code' => 'TR-2026-001'],
            [
                'title'       => 'Pelatihan Digital & Modern Web Development 2026',
                'description' => 'Program pelatihan intensif arsitektur web modern, REST API performa tinggi, dan digital presensi QR code.',
                'location'    => 'Auditorium Utama & Online Class',
                'start_date'  => '2026-09-20',
                'end_date'    => '2026-09-22',
                'status'      => 'Aktif',
                'created_by'  => $superAdmin->id,
            ]
        );

        // 5. Create Sessions
        $sessionsData = [
            [
                'session_code' => 'SES-01',
                'title'        => 'Sesi 1: Keynote & Pembukaan Training',
                'speaker'      => 'Dr. Irfan Subagyo',
                'room'         => 'Hall A - Lantai 3',
                'session_date' => '2026-09-20',
                'start_time'   => '08:00:00',
                'end_time'     => '09:30:00',
                'status'       => 'Selesai',
            ],
            [
                'session_code' => 'SES-02',
                'title'        => 'Sesi 2: Arsitektur REST API & Optimasi Server',
                'speaker'      => 'Rian Firmansyah, S.Kom',
                'room'         => 'Lab Komputer 1 - Lt 2',
                'session_date' => '2026-09-20',
                'start_time'   => '10:00:00',
                'end_time'     => '12:00:00',
                'status'       => 'Berlangsung',
            ],
            [
                'session_code' => 'SES-03',
                'title'        => 'Sesi 3: Implementasi Scanner & QR Code Realtime',
                'speaker'      => 'Sarah Wijaya, M.T',
                'room'         => 'Lab Komputer 2 - Lt 2',
                'session_date' => '2026-09-21',
                'start_time'   => '13:30:00',
                'end_time'     => '15:30:00',
                'status'       => 'Mendatang',
            ],
            [
                'session_code' => 'SES-04',
                'title'        => 'Sesi 4: Deployment & Benchmarking Shared Hosting',
                'speaker'      => 'Dr. Irfan Subagyo',
                'room'         => 'Auditorium Utama',
                'session_date' => '2026-09-22',
                'start_time'   => '09:00:00',
                'end_time'     => '11:30:00',
                'status'       => 'Mendatang',
            ],
        ];

        $sessions = [];
        foreach ($sessionsData as $s) {
            $sessions[] = TrainingSession::firstOrCreate(
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
                    'scanned_by' => $panitia->id,
                    'scanned_at' => '2026-09-20 08:14:00',
                    'status'     => 'present',
                    'source'     => 'camera_scan',
                ]);

                Attendance::firstOrCreate([
                    'registration_id'     => $reg->id,
                    'training_session_id' => $sessions[1]->id,
                ], [
                    'scanned_by' => $panitia->id,
                    'scanned_at' => '2026-09-20 10:05:00',
                    'status'     => 'present',
                    'source'     => 'camera_scan',
                ]);
            }
        }
    }
}
