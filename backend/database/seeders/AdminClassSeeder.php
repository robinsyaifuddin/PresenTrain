<?php

namespace Database\Seeders;

use App\Models\ClassRoom;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminClassSeeder extends Seeder
{
    /**
     * Run the database seeds for MOT Utama and 24 Class Administrators (A-F).
     */
    public function run(): void
    {
        // 1. Bersihkan akun demo admin lama jika ada (tanpa menghapus akun utama lainnya)
        $oldDemoEmails = [
            'admin.robin@gmail.com',
            'admin.panitia@presentrain.com',
            'fajar.admin@presentrain.com',
            'asep.admin@presentrain.com',
            'doni.admin@presentrain.com',
            'ilham.admin@presentrain.com',
        ];
        
        $oldUsers = User::whereIn('email', $oldDemoEmails)->get();
        foreach ($oldUsers as $oldUser) {
            $oldUser->managedClasses()->detach();
            $oldUser->delete();
        }

        // 2. Buat / Perbarui Akun MOT Utama (Super Admin)
        User::updateOrCreate(
            ['email' => 'mot.utama@presentrain.web.id'],
            [
                'name'                  => 'MOT Utama',
                'password'              => Hash::make('mot123'),
                'role'                  => 'super_admin',
                'status'                => 'Aktif',
                'phone'                 => '081234567800',
                'instansi'              => 'Master of Training Utama',
                'can_manage_attendance' => true,
                'can_manage_assessment' => true,
                'can_manage_quiz'       => true,
                'user_qr_token'         => 'ABSEN-MOT-UTAMA-001',
            ]
        );

        // 3. Pastikan Master Kelas A - F sudah tersedia
        $classesConfig = [
            'A' => ['code' => 'KLS-LK1-A', 'name' => 'Kelas A - Hasan Al-Banna'],
            'B' => ['code' => 'KLS-LK1-B', 'name' => 'Kelas B - Nurcholish Madjid'],
            'C' => ['code' => 'KLS-LK1-C', 'name' => 'Kelas C - Lafran Pane'],
            'D' => ['code' => 'KLS-LK1-D', 'name' => 'Kelas D - Mohammad Hatta'],
            'E' => ['code' => 'KLS-LK1-E', 'name' => 'Kelas E - Agus Salim'],
            'F' => ['code' => 'KLS-LK1-F', 'name' => 'Kelas F - Buya Hamka'],
        ];

        $classModels = [];
        foreach ($classesConfig as $letter => $cfg) {
            $classModels[$letter] = ClassRoom::firstOrCreate(
                ['code' => $cfg['code']],
                [
                    'name'        => $cfg['name'],
                    'description' => "Kelas Training Resmi LK1 HMI ({$letter})",
                    'status'      => 'Aktif',
                ]
            );
        }

        // 4. Generate & Sinkronkan 4 Akun Administrator per Kelas (MOT & TM 1-3)
        foreach (['A', 'B', 'C', 'D', 'E', 'F'] as $letter) {
            $lower = strtolower($letter);
            $targetClass = $classModels[$letter];

            // Akun MOT Kelas
            $motUser = User::updateOrCreate(
                ['email' => "mot.{$lower}@presentrain.web.id"],
                [
                    'name'                  => "MOT {$letter}",
                    'password'              => Hash::make('btr123'),
                    'role'                  => 'admin',
                    'status'                => 'Aktif',
                    'phone'                 => '08' . rand(1111111111, 9999999999),
                    'instansi'              => "Master of Training {$letter}",
                    'class_id'              => $targetClass->id,
                    'can_manage_attendance' => true,
                    'can_manage_assessment' => true,
                    'can_manage_quiz'       => true,
                    'user_qr_token'         => "ABSEN-MOT-{$letter}-" . strtoupper(Str::random(6)),
                ]
            );

            $motUser->managedClasses()->sync([
                $targetClass->id => [
                    'can_manage_attendance' => true,
                    'can_manage_assessment' => true,
                    'can_manage_quiz'       => true,
                ]
            ]);

            // Akun TM 1, TM 2, TM 3 Kelas
            for ($tm = 1; $tm <= 3; $tm++) {
                $tmUser = User::updateOrCreate(
                    ['email' => "tm.{$lower}{$tm}@presentrain.web.id"],
                    [
                        'name'                  => "TM {$letter}{$tm}",
                        'password'              => Hash::make('btr123'),
                        'role'                  => 'admin',
                        'status'                => 'Aktif',
                        'phone'                 => '08' . rand(1111111111, 9999999999),
                        'instansi'              => "Team Master {$letter}{$tm}",
                        'class_id'              => $targetClass->id,
                        'can_manage_attendance' => true,
                        'can_manage_assessment' => true,
                        'can_manage_quiz'       => true,
                        'user_qr_token'         => "ABSEN-TM-{$letter}{$tm}-" . strtoupper(Str::random(6)),
                    ]
                );

                $tmUser->managedClasses()->sync([
                    $targetClass->id => [
                        'can_manage_attendance' => true,
                        'can_manage_assessment' => true,
                        'can_manage_quiz'       => true,
                    ]
                ]);
            }
        }
    }
}
