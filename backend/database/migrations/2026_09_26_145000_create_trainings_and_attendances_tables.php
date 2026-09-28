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
        // 1. Trainings Table
        Schema::create('trainings', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique()->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['Draft', 'Aktif', 'Selesai'])->default('Aktif')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Training Sessions Table
        Schema::create('training_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->constrained('trainings')->cascadeOnDelete();
            $table->string('session_code', 50)->nullable()->index();
            $table->string('title');
            $table->string('speaker')->nullable();
            $table->string('room')->nullable();
            $table->date('session_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('status', ['Mendatang', 'Berlangsung', 'Selesai'])->default('Mendatang')->index();
            $table->timestamps();

            $table->index(['training_id', 'status']);
        });

        // 3. Registrations Table
        Schema::create('registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('training_id')->constrained('trainings')->cascadeOnDelete();
            $table->enum('status', ['active', 'cancelled'])->default('active')->index();
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamps();

            $table->unique(['user_id', 'training_id']);
        });

        // 4. Attendances Table (Ultra High Performance Indexing & Zero Duplicate Risk)
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registration_id')->constrained('registrations')->cascadeOnDelete();
            $table->foreignId('training_session_id')->constrained('training_sessions')->cascadeOnDelete();
            $table->foreignId('scanned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('scanned_at')->useCurrent();
            $table->enum('status', ['present', 'absent', 'permission'])->default('present');
            $table->string('source', 50)->default('camera_scan'); // camera_scan, manual, batch_sync
            $table->timestamps();

            // Strict composite unique constraint prevents race conditions
            $table->unique(['registration_id', 'training_session_id'], 'uniq_reg_session_attendance');
            $table->index(['training_session_id', 'status'], 'idx_session_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('registrations');
        Schema::dropIfExists('training_sessions');
        Schema::dropIfExists('trainings');
    }
};
