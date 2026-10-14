<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name', 150)->nullable();
            $table->string('user_role', 50)->nullable();
            $table->string('action', 50); // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, SCAN, EXPORT, dll
            $table->string('module', 50); // Autentikasi, Pelatihan, Sesi, Peserta, Administrator, Penilaian, Rekap
            $table->text('description');
            $table->enum('status', ['SUCCESS', 'FAILED'])->default('SUCCESS');
            $table->string('failure_reason', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->json('properties')->nullable();
            $table->timestamps();

            // Index performa tinggi untuk filter dashboard
            $table->index('user_id');
            $table->index('user_role');
            $table->index('action');
            $table->index('module');
            $table->index('status');
            $table->index('created_at');
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void {
        Schema::dropIfExists('activity_logs');
    }
};
