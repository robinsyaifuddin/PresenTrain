<?php

namespace Database\Seeders;

use App\Models\ClassRoom;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ClassAndAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Buat 6 Kelas Training
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
            $classes[] = ClassRoom::updateOrCreate(
                ['code' => $def['code']],
                $def
            );
        }

        // 2. Buat / Pastikan ada Administrator untuk masing-masing kelas (1 Administrator = 1 Kelas)
        $adminAccounts = [
            [
                'name' => 'Robin Administrator',
                'email' => 'admin.robin@gmail.com',
                'password' => 'AdminRobin123!',
                'phone' => '081234567891',
                'instansi' => 'BPL HMI Cabang Bandar Lampung',
                'assigned_class_index' => 0, // Kelas A
            ],
            [
                'name' => 'Rian Firmansyah (Panitia)',
                'email' => 'admin.panitia@presentrain.com',
                'password' => 'AdminPanitia123!',
                'phone' => '085678901234',
                'instansi' => 'Panitia Pengelola Kelas',
                'assigned_class_index' => 1, // Kelas B
            ],
            [
                'name' => 'Kanda Fajar Hidayat',
                'email' => 'fajar.admin@presentrain.com',
                'password' => 'AdminFajar123!',
                'phone' => '081298765431',
                'instansi' => 'Instruktur Kelas C',
                'assigned_class_index' => 2, // Kelas C
            ],
            [
                'name' => 'Yanda Asep Sunandar',
                'email' => 'asep.admin@presentrain.com',
                'password' => 'AdminAsep123!',
                'phone' => '081298765432',
                'instansi' => 'Instruktur Kelas D',
                'assigned_class_index' => 3, // Kelas D
            ],
            [
                'name' => 'Kanda Doni Pratama',
                'email' => 'doni.admin@presentrain.com',
                'password' => 'AdminDoni123!',
                'phone' => '081298765433',
                'instansi' => 'Instruktur Kelas E',
                'assigned_class_index' => 4, // Kelas E
            ],
            [
                'name' => 'Yanda Ilham Ramadhan',
                'email' => 'ilham.admin@presentrain.com',
                'password' => 'AdminIlham123!',
                'phone' => '081298765434',
                'instansi' => 'Instruktur Kelas F',
                'assigned_class_index' => 5, // Kelas F
            ],
        ];

        foreach ($adminAccounts as $adm) {
            $user = User::where('email', $adm['email'])->first();
            if (!$user) {
                $user = User::create([
                    'name' => $adm['name'],
                    'email' => $adm['email'],
                    'password' => Hash::make($adm['password']),
                    'role' => 'admin',
                    'status' => 'Aktif',
                    'phone' => $adm['phone'],
                    'instansi' => $adm['instansi'],
                    'can_manage_attendance' => true,
                    'can_manage_assessment' => true,
                    'can_manage_quiz' => true,
                    'user_qr_token' => 'ABSEN-ADMIN-' . strtoupper(Str::random(6)),
                ]);
            } else {
                $user->update([
                    'role' => 'admin',
                    'status' => 'Aktif',
                    'can_manage_attendance' => true,
                    'can_manage_assessment' => true,
                    'can_manage_quiz' => true,
                ]);
            }

            // Hubungkan Administrator ke Kelas masing-masing (1 Admin 1 Kelas)
            $classToAssign = $classes[$adm['assigned_class_index']];
            $user->managedClasses()->sync([
                $classToAssign->id => [
                    'can_manage_attendance' => true,
                    'can_manage_assessment' => true,
                    'can_manage_quiz' => true,
                ]
            ]);
        }

        // 3. Distribusikan Peserta yang ada ke dalam 6 Kelas tersebut
        $participants = User::where('role', 'participant')->orderBy('id', 'asc')->get();

        foreach ($participants as $idx => $participant) {
            $assignedClass = $classes[$idx % count($classes)];
            $participant->update([
                'class_id' => $assignedClass->id,
            ]);
        }

        // Jalankan sinkronisasi lengkap peserta, presensi, penilaian, kuis, dan admin
        $this->call(ClassDataSynchronizationSeeder::class);
    }
}
