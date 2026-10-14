import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const prodEnvPath = path.join(rootDir, '.env.production');
const targetEnvPath = path.join(rootDir, '.env');

if (fs.existsSync(prodEnvPath)) {
  fs.copyFileSync(prodEnvPath, targetEnvPath);
  console.log('✅ [Build Pre-hook] Berhasil menyalin .env.production ke .env');
} else {
  console.warn('⚠️ [Build Pre-hook] Peringatan: File .env.production tidak ditemukan!');
}
