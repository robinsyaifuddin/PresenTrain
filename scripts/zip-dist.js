import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const distPath = path.resolve(process.cwd(), 'dist');

if (!fs.existsSync(distPath)) {
  console.error('❌ Folder dist tidak ditemukan. Jalankan vite build terlebih dahulu.');
  process.exit(1);
}

// Pastikan .htaccess terbaru tersalin ke dalam dist
const publicHtaccess = path.resolve(process.cwd(), 'public', '.htaccess');
const distHtaccess = path.resolve(distPath, '.htaccess');
if (fs.existsSync(publicHtaccess)) {
  fs.copyFileSync(publicHtaccess, distHtaccess);
}

console.log('📦 Memproses pembuatan file zip untuk dist...');

let targetZipName = 'dist.zip';
let zipPath = path.resolve(process.cwd(), targetZipName);

try {
  if (fs.existsSync(zipPath)) {
    try {
      fs.unlinkSync(zipPath);
    } catch (e) {
      // Jika dist.zip sedang dibuka di File Explorer / Archive tool, gunakan nama alternatif
      targetZipName = 'dist_upload.zip';
      zipPath = path.resolve(process.cwd(), targetZipName);
      if (fs.existsSync(zipPath)) {
        try { fs.unlinkSync(zipPath); } catch {}
      }
    }
  }

  const isWin = process.platform === 'win32';
  if (isWin) {
    try {
      execSync(`tar.exe -a -cf ${targetZipName} -C dist *`, {
        stdio: 'inherit'
      });
    } catch (e) {
      execSync(`powershell -NoProfile -Command "Compress-Archive -Path dist\\* -DestinationPath ${targetZipName} -Force"`, {
        stdio: 'inherit'
      });
    }
  } else {
    execSync(`cd dist && zip -rq ../${targetZipName} .`, {
      stdio: 'inherit'
    });
  }

  if (fs.existsSync(zipPath)) {
    const stats = fs.statSync(zipPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ [Build Post-hook] Berhasil membuat ${targetZipName} (${sizeMB} MB) siap upload ke Hostinger!`);
  }

  // Restore .env untuk lingkungan development lokal (Hybrid workflow)
  const devEnvPath = path.resolve(process.cwd(), '.env.development');
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(devEnvPath)) {
    fs.copyFileSync(devEnvPath, envPath);
    console.log('🔄 [Hybrid Dev] File .env otomatis dikembalikan ke konfigurasi lokal (http://localhost:8000).');
  }
} catch (error) {
  console.error('⚠️ Gagal membuat file zip:', error.message);
}
