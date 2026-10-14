<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('quizzes', function (Blueprint $table) {
            $table->id();
            $table->string('quiz_code')->nullable()->unique();
            $table->foreignId('training_id')->nullable()->constrained('trainings')->cascadeOnDelete();
            $table->string('title');
            $table->string('type')->default('pretest');
            $table->integer('duration_minutes')->default(15);
            $table->integer('passing_grade')->default(70);
            $table->string('link_code')->nullable()->unique();
            $table->text('instructions')->nullable();
            $table->text('description')->nullable();
            $table->string('status')->default('Aktif');
            $table->string('created_by')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('quizzes');
    }
};