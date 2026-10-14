<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for high-concurrency indexing on Hostinger Shared Hosting.
     */
    public function up(): void
    {
        // 1. Index users table for faster class filtering and participant listings
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'class_id')) {
                $table->index(['class_id', 'role'], 'idx_users_class_role');
            }
            if (Schema::hasColumn('users', 'instansi')) {
                $table->index('instansi', 'idx_users_instansi');
            }
        });

        // 2. Index attendances table for faster session lookups
        Schema::table('attendances', function (Blueprint $table) {
            if (Schema::hasColumn('attendances', 'training_session_id') && Schema::hasColumn('attendances', 'status')) {
                // Ensure composite index exists for ultra-fast session attendance aggregation
                $table->index(['training_session_id', 'status', 'scanned_at'], 'idx_attendances_perf_stats');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_class_role');
            $table->dropIndex('idx_users_instansi');
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex('idx_attendances_perf_stats');
        });
    }
};
