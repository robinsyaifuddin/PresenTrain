<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->nullable()->constrained('trainings')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('participant_id')->nullable()->index();
            $table->integer('kognitif')->default(75);
            $table->integer('afektif')->default(100);
            $table->integer('psikomotorik')->default(50);
            $table->decimal('nilai_akhir', 5, 1)->nullable();
            $table->string('status')->nullable();
            $table->json('violations')->nullable();
            $table->json('contributions')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('assessment_kognitifs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->nullable()->constrained('trainings')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->decimal('score', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('assessment_kognitifs');
        Schema::dropIfExists('assessments');
    }
};