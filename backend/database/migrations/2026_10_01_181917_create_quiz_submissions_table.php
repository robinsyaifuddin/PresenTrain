<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('quiz_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('submission_code')->nullable();
            $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('participant_name')->nullable();
            $table->string('participant_email')->nullable();
            $table->integer('score')->nullable();
            $table->json('answers')->nullable();
            $table->boolean('is_locked')->default(true);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('quiz_grade_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_code')->nullable();
            $table->foreignId('submission_id')->nullable()->constrained('quiz_submissions')->cascadeOnDelete();
            $table->foreignId('quiz_id')->nullable()->constrained('quizzes')->cascadeOnDelete();
            $table->string('quiz_title')->nullable();
            $table->string('participant_id')->nullable();
            $table->string('participant_name')->nullable();
            $table->string('requested_by')->nullable();
            $table->string('request_type')->default('edit_score');
            $table->text('reason')->nullable();
            $table->integer('old_score')->nullable();
            $table->integer('new_score_requested')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('quiz_grade_requests');
        Schema::dropIfExists('quiz_submissions');
    }
};