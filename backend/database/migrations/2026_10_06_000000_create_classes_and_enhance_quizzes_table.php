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
        // 1. Table Classes
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->enum('status', ['Aktif', 'Nonaktif'])->default('Aktif')->index();
            $table->timestamps();
        });

        // 2. Add class_id to users
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'class_id')) {
                $table->foreignId('class_id')->nullable()->after('role')->constrained('classes')->nullOnDelete();
            }
        });

        // 3. Table Class Admins (Pivot Administrator <-> Classes with granular permissions)
        Schema::create('class_admins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('can_manage_attendance')->default(true);
            $table->boolean('can_manage_assessment')->default(true);
            $table->boolean('can_manage_quiz')->default(true);
            $table->timestamps();

            $table->unique(['class_id', 'user_id'], 'uniq_class_admin');
        });

        // 4. Table Class Quiz Access (Administrator/Super Admin toggle Buka/Tutup Quiz per Kelas)
        Schema::create('class_quiz_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->nullable()->constrained('classes')->cascadeOnDelete(); // null = Kelas Umum
            $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
            $table->enum('status', ['buka', 'tutup'])->default('tutup');
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->unique(['class_id', 'quiz_id'], 'uniq_class_quiz');
        });

        // 5. Enhance Quiz Submissions: original_score, duration timestamps, shuffle tracking
        Schema::table('quiz_submissions', function (Blueprint $table) {
            if (!Schema::hasColumn('quiz_submissions', 'original_score')) {
                $table->integer('original_score')->nullable()->after('score');
            }
            if (!Schema::hasColumn('quiz_submissions', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('submitted_at');
            }
            if (!Schema::hasColumn('quiz_submissions', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('started_at');
            }
            if (!Schema::hasColumn('quiz_submissions', 'question_order')) {
                $table->json('question_order')->nullable()->after('answers');
            }
            if (!Schema::hasColumn('quiz_submissions', 'option_orders')) {
                $table->json('option_orders')->nullable()->after('question_order');
            }
        });

        // 6. Table Quiz Submission Corrections (Audit trail for scores)
        Schema::create('quiz_submission_corrections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_submission_id')->constrained('quiz_submissions')->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('old_score')->nullable();
            $table->integer('new_score');
            $table->json('question_scores')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quiz_submission_corrections');
        
        Schema::table('quiz_submissions', function (Blueprint $table) {
            $table->dropColumn(['original_score', 'started_at', 'expires_at', 'question_order', 'option_orders']);
        });

        Schema::dropIfExists('class_quiz_access');
        Schema::dropIfExists('class_admins');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'class_id')) {
                $table->dropForeign(['class_id']);
                $table->dropColumn('class_id');
            }
        });

        Schema::dropIfExists('classes');
    }
};
