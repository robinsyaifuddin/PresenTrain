<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'status')) {
                $table->enum('status', ['Aktif', 'Nonaktif'])->default('Aktif')->after('role');
            }
            if (!Schema::hasColumn('users', 'can_manage_attendance')) {
                $table->boolean('can_manage_attendance')->default(true)->after('role');
            }
            if (!Schema::hasColumn('users', 'can_manage_assessment')) {
                $table->boolean('can_manage_assessment')->default(true)->after('can_manage_attendance');
            }
            if (!Schema::hasColumn('users', 'can_manage_quiz')) {
                $table->boolean('can_manage_quiz')->default(true)->after('can_manage_assessment');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['status', 'can_manage_attendance', 'can_manage_assessment', 'can_manage_quiz']);
        });
    }
};
