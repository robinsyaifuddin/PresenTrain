<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('quiz_submissions', function (Blueprint $table) {
            $table->boolean('is_corrected')->default(false)->after('is_locked');
            $table->text('admin_notes')->nullable()->after('is_corrected');
            $table->string('submit_reason')->default('normal')->nullable()->after('admin_notes');
            $table->integer('tab_violations')->default(0)->after('submit_reason');
        });
    }

    public function down(): void {
        Schema::table('quiz_submissions', function (Blueprint $table) {
            $table->dropColumn(['is_corrected', 'admin_notes', 'submit_reason', 'tab_violations']);
        });
    }
};
