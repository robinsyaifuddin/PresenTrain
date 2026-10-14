---
name: vibecoding-deploy-summary
description: >-
  Provides a structured summary of recent code changes and pinpoints exactly which files or folders
  need to be re-uploaded to Hostinger hosting (Frontend dist.zip, Backend PHP files, or Database Migrations).
  Use this skill whenever the user finishes a vibecoding session, asks for a changelog, asks what needs to be re-uploaded,
  or asks about deploying recent updates.
---

# Vibecoding Deployment & Re-upload Summary Guide

Gunakan panduan ini untuk mendeteksi perubahan proyek PresenTrain dan menyusun rekomendasi re-upload ke server Hostinger dengan tepat sasaran tanpa harus mengupload seluruh proyek berulang-ulang.

## 1. Langkah Deteksi Perubahan (Inspection)

Jalankan perintah berikut untuk memeriksa status perubahan file:
```bash
git status --short
git diff --stat HEAD
```

Kategorikan file yang terdeteksi ke dalam salah satu dari 4 zona berikut:

| Zona | Pola File / Direktori | Tindakan Re-upload yang Diperlukan |
| :--- | :--- | :--- |
| **Zona A: Frontend Saja** | `src/**`, `public/**`, `index.html`, `vite.config.js` | 1. Jalankan `npm run build`<br>2. Upload hanya `dist.zip` ke `public_html/`<br>3. Extract di Hostinger File Manager |
| **Zona B: Backend Logika** | `backend/app/**`, `backend/routes/**`, `backend/config/**` | 1. Upload hanya file/folder PHP yang berubah ke `~/backend/`<br>2. Jalankan SSH: `php artisan optimize` |
| **Zona C: Database Migration** | `backend/database/migrations/**` | 1. Jalankan migrasi ke remote DB (`php artisan migrate`) dari lokal ATAU jalankan di terminal SSH Hostinger |
| **Zona D: Dependency / Config** | `package.json`, `composer.json`, `.env.production` | - Jika `package.json`: build ulang frontend (`npm run build`)<br>- Jika `composer.json`: jalankan `composer install` via SSH<br>- Jika `.env.production`: update file `.env` di hosting |

---

## 2. Format Output Ringkasan untuk Pengguna

Selalu sajikan ringkasan dalam format terstruktur dan ramah pengembang seperti contoh di bawah ini:

```markdown
### 📋 Ringkasan Perubahan Sesi Vibecoding

#### 1. Yang Baru Diubah:
- **Frontend**: [Sebutkan fitur/komponen yang diubah, misal: Pembaruan tampilan dashboard peserta]
- **Backend**: [Sebutkan controller/route yang diubah, misal: Penambahan endpoint export nilai]
- **Database**: [Ada migrasi baru / Tidak ada migrasi]

#### 2. Target File/Folder yang Perlu Di-Upload Ulang:
- [ ] **Frontend**: Jalankan `npm run build` $\rightarrow$ upload **`dist.zip`** ke `public_html/` lalu Extract.
- [ ] **Backend**: Upload file `backend/app/...` ke folder `~/backend/...` di server.

#### 3. Perintah Cepat Server (SSH) jika diperlukan:
```bash
cd ~/backend
php artisan optimize
```
```

---

## 3. Aturan Efisiensi

1. **Hindari upload ulang seluruh vendor**: Jangan pernah meminta pengguna mengupload ulang folder `node_modules/` atau `vendor/` kecuali ada perubahan paket baru.
2. **Prioritaskan `dist.zip`**: Untuk frontend, ingatkan pengguna bahwa `npm run build` sudah otomatis mengemas `dist.zip` (1 klik extract di File Manager).
3. **Database Remote Terhubung**: Karena database remote Hostinger (`srv1983.hstgr.io`) sudah terhubung langsung dari lokal, migrasi bisa dijalankan langsung dari terminal lokal jika diinginkan:
   ```bash
   cd backend && php artisan migrate
   ```
