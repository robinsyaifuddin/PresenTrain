<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use App\Models\AsyncJobTicket;

class ProcessQueueDaemon extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'presentrain:work-queue {--seconds=50}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Worker teratur ramah Shared Hosting: proses queue hingga 50 detik lalu keluar bersih.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $maxSeconds = (int) $this->option('seconds');
        $this->info("Memulai antrean PresenTrain (maks {$maxSeconds} detik)...");

        // Panggil queue:work dengan batasan waktu yang aman agar tidak terjadi zombie process di Hostinger
        Artisan::call('queue:work', [
            '--stop-when-empty' => true,
            '--max-time' => $maxSeconds,
            '--memory' => 128,
            '--tries' => 3,
        ]);

        // Opsional: Bersihkan tiket yang sudah lebih dari 48 jam agar tabel tetap ramping
        try {
            AsyncJobTicket::where('created_at', '<', now()->subDays(2))->delete();
        } catch (\Throwable $e) {
            // Silently ignore
        }

        $this->info("Antrean selesai diproses.");
        return 0;
    }
}
