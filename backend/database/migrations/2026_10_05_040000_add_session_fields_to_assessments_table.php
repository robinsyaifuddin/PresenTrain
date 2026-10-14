<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void {
        Schema::table('assessments', function (Blueprint $table) {
            if (!Schema::hasColumn('assessments', 'training_session_id')) {
                $table->foreignId('training_session_id')->nullable()->after('training_id')->constrained('training_sessions')->nullOnDelete();
            }
            if (!Schema::hasColumn('assessments', 'session_key')) {
                $table->string('session_key', 50)->nullable()->after('training_session_id')->index();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void {
        Schema::table('assessments', function (Blueprint $table) {
            if (Schema::hasColumn('assessments', 'training_session_id')) {
                $table->dropForeign(['training_session_id']);
                $table->dropColumn('training_session_id');
            }
            if (Schema::hasColumn('assessments', 'session_key')) {
                $table->dropColumn('session_key');
            }
        });
    }
};
