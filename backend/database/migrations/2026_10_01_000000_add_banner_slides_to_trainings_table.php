<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('trainings') && !Schema::hasColumn('trainings', 'banner_slides')) {
            Schema::table('trainings', function (Blueprint $table) {
                $table->json('banner_slides')->nullable()->after('status');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('trainings') && Schema::hasColumn('trainings', 'banner_slides')) {
            Schema::table('trainings', function (Blueprint $table) {
                $table->dropColumn('banner_slides');
            });
        }
    }
};
