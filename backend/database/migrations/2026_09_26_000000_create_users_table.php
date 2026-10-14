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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('google_id')->nullable()->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('role', ['super_admin', 'admin', 'participant'])->default('participant')->index();
            $table->string('phone', 50)->nullable();
            $table->string('instansi')->nullable();
            $table->text('avatar')->nullable();
            $table->string('user_qr_token', 100)->unique();
            $table->rememberToken();
            $table->timestamps();

            $table->index('user_qr_token');
            $table->index(['role', 'email']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
