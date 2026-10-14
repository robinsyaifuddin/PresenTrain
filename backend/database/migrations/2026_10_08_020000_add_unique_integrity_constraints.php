<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PresenTrain Database-Level Integrity Constraints
 * =================================================
 * Ini adalah lapisan TERAKHIR dan TERKUAT perlindungan data.
 * Setelah migrasi ini, bahkan jika ada bug di kode PHP sekalipun,
 * database MENOLAK secara langsung duplikasi data yang mustahil terjadi.
 *
 * Safety net berlapis:
 * Layer 1: PHP Logic (transaction + lockForUpdate) → mencegah race condition
 * Layer 2: DB UNIQUE Constraint (migrasi ini) → mustahil tembus secara fisik
 */
return new class extends Migration
{
    public function up(): void
    {
        // =========================================================================
        // 1. ATTENDANCES: Satu peserta hanya boleh punya 1 record presensi per sesi
        //    Constraint: (registration_id, training_session_id) UNIQUE
        //
        //    PENTING: Bersihkan duplikasi yang sudah ada SEBELUM menambah constraint
        //    agar tidak gagal saat migrasi di server yang sudah punya data
        // =========================================================================
        Schema::table('attendances', function (Blueprint $table) {
            // Langkah 1: Hapus duplikasi yang mungkin ada (jaga data terlama/pertama)
            DB::statement("
                DELETE a1 FROM attendances a1
                INNER JOIN attendances a2
                WHERE a1.id > a2.id
                  AND a1.registration_id = a2.registration_id
                  AND a1.training_session_id = a2.training_session_id
            ");

            // Langkah 2: Tambahkan UNIQUE constraint
            $table->unique(
                ['registration_id', 'training_session_id'],
                'uq_attendances_reg_session'
            );
        });

        // =========================================================================
        // 2. QUIZ SUBMISSIONS: Satu user hanya boleh submit 1 kali per kuis
        //    Constraint: (quiz_id, user_id) UNIQUE (hanya untuk user_id yang tidak null)
        //
        //    Partial unique: MySQL tidak mendukung WHERE clause di UNIQUE,
        //    jadi kita buat regular unique index; submission tanpa user_id (guest)
        //    diperbolehkan duplikat karena dibedakan via submission_code
        // =========================================================================
        Schema::table('quiz_submissions', function (Blueprint $table) {
            // Bersihkan duplikasi per user_id + quiz_id
            DB::statement("
                DELETE qs1 FROM quiz_submissions qs1
                INNER JOIN quiz_submissions qs2
                WHERE qs1.id > qs2.id
                  AND qs1.quiz_id = qs2.quiz_id
                  AND qs1.user_id = qs2.user_id
                  AND qs1.user_id IS NOT NULL
            ");

            // Tambahkan partial unique via NULL-safe approach:
            // MySQL UNIQUE index mengabaikan NULL values sehingga guest submission (user_id=NULL) tetap bisa multiple
            $table->unique(
                ['quiz_id', 'user_id'],
                'uq_quiz_submissions_quiz_user'
            );
        });

        // =========================================================================
        // 3. REGISTRATIONS: Satu user hanya boleh registrasi 1 kali per training
        //    Constraint: (user_id, training_id) UNIQUE
        // =========================================================================
        Schema::table('registrations', function (Blueprint $table) {
            // Bersihkan duplikasi
            DB::statement("
                DELETE r1 FROM registrations r1
                INNER JOIN registrations r2
                WHERE r1.id > r2.id
                  AND r1.user_id = r2.user_id
                  AND r1.training_id = r2.training_id
            ");

            $table->unique(
                ['user_id', 'training_id'],
                'uq_registrations_user_training'
            );
        });

        // =========================================================================
        // 4. USERS: QR Token harus benar-benar unik di level database
        //    (mengambil alih dari PHP-level uniqueness check yang sudah kita perbaiki)
        // =========================================================================
        Schema::table('users', function (Blueprint $table) {
            // Hapus index lama jika ada (hindari error duplicate key name)
            try {
                $table->dropUnique(['user_qr_token']);
            } catch (\Throwable $e) {
                // Index belum ada, lanjutkan
            }

            $table->unique('user_qr_token', 'uq_users_qr_token');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique('uq_attendances_reg_session');
        });

        Schema::table('quiz_submissions', function (Blueprint $table) {
            $table->dropUnique('uq_quiz_submissions_quiz_user');
        });

        Schema::table('registrations', function (Blueprint $table) {
            $table->dropUnique('uq_registrations_user_training');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('uq_users_qr_token');
        });
    }
};
