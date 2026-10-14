<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->string('question_code')->nullable();
            $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
            $table->string('type')->default('multiple_choice');
            $table->text('text');
            $table->json('options')->nullable();
            $table->text('correct_answer')->nullable();
            $table->integer('score_weight')->default(25);
            $table->boolean('required')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('questions');
    }
};