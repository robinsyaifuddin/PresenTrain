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
        Schema::create('async_job_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('action_type', 60)->index(); // attendance, quiz_submit, bulk_register, etc.
            $table->string('status', 30)->default('pending')->index(); // pending, processing, completed, failed
            $table->integer('progress_percent')->default(0);
            $table->string('message')->nullable();
            $table->json('payload')->nullable(); // Request input
            $table->json('result')->nullable(); // Output result or error details
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('async_job_tickets');
    }
};
