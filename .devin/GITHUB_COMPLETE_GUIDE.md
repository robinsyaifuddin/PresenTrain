# Panduan Lengkap GitHub untuk Project PresenTrain

## Status Saat Ini
✅ Git terkonfigurasi dengan email: `official.rbnsyaf@gmail.com`
✅ GitHub token tersimpan di Windows Credential Manager
✅ Repository terhubung ke GitHub: `https://github.com/robinsyaifuddin/PresenTrain.git`
✅ GitHub Actions workflow sudah dibuat di `.github/workflows/deploy.yml`
⏳ GitHub Secrets belum di-setup (perlu dilakukan manual)

---

## BAGIAN 1: RULES & BEST PRACTICES (WAJIB DIBACA)

### Rules Wajib (Harus Selalu Ditaati)

**Rule 1: Selalu Test Lokal Sebelum Commit**
- Jalankan `npm run dev` untuk test perubahan
- Pastikan tidak ada error di console browser
- Jangan commit code yang belum di-test

**Rule 2: Commit Message Harus Jelas dan Spesifik**
- ✅ Benar: "Fix login button alignment"
- ✅ Benar: "Add responsive navbar for mobile"
- ❌ Salah: "update"
- ❌ Salah: "fix bug"
- ❌ Salah: "changes"

**Rule 3: Pull Sebelum Push**
- Selalu jalankan `git pull origin main` sebelum `git push origin main`
- Ini mencegah conflict dengan perubahan dari GitHub

**Rule 4: Jangan Commit File yang Tidak Perlu**
- Jangan commit `node_modules/` (sudah di `.gitignore`)
- Jangan commit file build lokal
- Jangan commit file config sensitif (API keys, passwords)

**Rule 5: Review Perubahan Sebelum Commit**
- Jalankan `git status` untuk lihat file yang berubah
- Jalankan `git diff` untuk lihat detail perubahan
- Pastikan hanya file yang diinginkan yang di-commit

### Best Practices (Rekomendasi Kuat)

**Practice 1: Commit Kecil dan Sering**
- Commit per fitur atau per bug fix
- Jangan commit terlalu banyak perubahan sekaligus
- Lebih mudah untuk debug jika ada masalah

**Practice 2: Gunakan Branch untuk Fitur Baru**
- Buat branch baru untuk setiap fitur: `git checkout -b feature/nama-fitur`
- Test di branch tersebut
- Merge ke main setelah selesai dan di-test

**Practice 3: Tambahkan .gitignore yang Baik**
- Pastikan file sensitif tidak ter-commit
- Pastikan file build tidak ter-commit
- Pastikan file IDE tidak ter-commit

**Practice 4: Backup Sebelum Operasi Berisiko**
- Backup project sebelum melakukan operasi Git yang kompleks
- Atau gunakan branch untuk eksperimen

---

## BAGIAN 2: STEP-BY-STEP WORKFLOW HARIAN

### Workflow Standar (Setiap Hari)

**Langkah 1: Mulai Hari Kerja**
```bash
# Buka terminal di folder project
cd c:\Users\j\Documents\Website\Presentrain

# Pull perubahan terbaru dari GitHub
git pull origin main
```

**Langkah 2: Lakukan Perubahan Code**
- Buka VS Code
- Lakukan perubahan pada code
- Test dengan `npm run dev`

**Langkah 3: Review Perubahan**
```bash
# Lihat file yang berubah
git status

# Lihat detail perubahan (opsional)
git diff
```

**Langkah 4: Commit Perubahan**
```bash
# Tambahkan semua file yang berubah
git add .

# Commit dengan pesan yang jelas
git commit -m "Deskripsi perubahan yang jelas dan spesifik"
```

**Langkah 5: Push ke GitHub**
```bash
# Push ke GitHub
git push origin main
```

**Langkah 6: Monitor Deployment**
- Buka https://github.com/robinsyaifuddin/PresenTrain
- Klik tab **Actions**
- Lihat workflow yang sedang berjalan
- Tunggu sampai deployment selesai (hijau = sukses)

---

## BAGIAN 3: SETUP AWAL (ONE-TIME ONLY)

### Step 1: Setup GitHub Secrets (WAJIB)

**Lokasi:**
1. Buka https://github.com/robinsyaifuddin/PresenTrain
2. Klik tab **Settings** (di atas halaman repository)
3. Di sidebar kiri, scroll ke **Security**
4. Klik **Secrets and variables**
5. Klik **Actions**
6. Klik **New repository secret**

**Tambahkan 4 Secrets:**

| Secret Name | Value | Keterangan |
|-------------|-------|------------|
| `HOSTINGER_HOST` | `145.79.14.213` | IP address Hostinger |
| `HOSTINGER_USER` | `u503475479` | SSH username Hostinger |
| `HOSTINGER_PATH` | `public_html` | Path folder di Hostinger |
| `HOSTINGER_SSH_KEY` | Private SSH key | Dari Hostinger hPanel |

**Cara Mendapatkan HOSTINGER_SSH_KEY:**
1. Login ke Hostinger hPanel
2. Buka **Advanced** → **SSH Access**
3. Klik **Generate new SSH key**
4. Copy **Private Key** yang muncul
5. Paste sebagai value untuk secret `HOSTINGER_SSH_KEY`

### Step 2: Commit dan Push Workflow Pertama

```bash
# Tambahkan file baru ke Git
git add .

# Commit workflow
git commit -m "Add GitHub Actions workflow for deployment"

# Push ke GitHub
git push origin main
```

### Step 3: Test Deployment Pertama

1. Buka https://github.com/robinsyaifuddin/PresenTrain
2. Klik tab **Actions**
3. Lihat workflow "Deploy to Hostinger" yang sedang berjalan
4. Tunggu sampai selesai (hijau = sukses, merah = gagal)
5. Jika gagal, klik workflow untuk lihat error log

---

## BAGIAN 4: COMMANDS CHEAT SHEET

### Git Commands Dasar

```bash
# Cek status file
git status

# Tambahkan semua file yang berubah
git add .

# Tambahkan file spesifik
git add nama-file.js

# Commit dengan pesan
git commit -m "Pesan commit yang jelas"

# Push ke GitHub
git push origin main

# Pull dari GitHub
git pull origin main

# Lihat commit history
git log --oneline -10

# Lihat detail perubahan
git diff
```

### Git Commands Lanjutan

```bash
# Buat branch baru
git checkout -b nama-branch

# Pindah ke branch lain
git checkout nama-branch

# Lihat semua branch
git branch

# Merge branch ke main
git checkout main
git merge nama-branch

# Hapus branch
git branch -d nama-branch

# Undo commit terakhir (jaga perubahan)
git reset --soft HEAD~1

# Undo commit terakhir (hapus perubahan)
git reset --hard HEAD~1
```

### Development Commands

```bash
# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Preview build production
npm run preview

# Install dependencies
npm install

# Install package baru
npm install nama-package

# Install package untuk development
npm install -D nama-package
```

---

## BAGIAN 5: TROUBLESHOOTING

### Masalah 1: Git Push Gagal

**Error: Authentication failed**
- Pastikan GitHub token sudah tersimpan (sudah kita setup)
- Coba lagi: `git push origin main`

**Error: Remote repository not found**
- Cek remote URL: `git remote -v`
- Jika salah, update: `git remote set-url origin https://github.com/robinsyaifuddin/PresenTrain.git`

**Error: Pull failed (conflict)**
- Pull dulu: `git pull origin main`
- Resolve conflict secara manual
- Commit dan push lagi

### Masalah 2: GitHub Actions Gagal

**Error: SSH connection failed**
- Pastikan semua GitHub Secrets terisi dengan benar
- Cek value `HOSTINGER_SSH_KEY` (harus private key lengkap)
- Pastikan SSH key valid dari Hostinger

**Error: Build failed**
- Cek apakah `package.json` lengkap
- Pastikan Node.js version compatible (kita pakai 18)
- Lihat log error di GitHub Actions (klik workflow yang gagal)

**Error: Deploy failed**
- Pastikan `HOSTINGER_PATH` benar (`public_html`)
- Pastikan permission folder di Hostinger benar
- Cek apakah folder `dist/` ter-generate dengan benar

### Masalah 3: Website Tidak Update

1. Cek GitHub Actions status (harus hijau/sukses)
2. Clear cache browser (Ctrl + F5)
3. Cek deployment path di Hostinger
4. Pastikan file `dist/` ter-generate dengan benar
5. Cek apakah ada error di console browser

---

## BAGIAN 6: WORKFLOW ADVANCED (OPTIONAL)

### Menggunakan Branch untuk Fitur Baru

**Scenario: Anda ingin menambahkan fitur baru tanpa mengganggu main**

```bash
# 1. Buat branch baru untuk fitur
git checkout -b feature/tambah-fitur-baru

# 2. Lakukan perubahan code
# ... edit code ...

# 3. Test lokal
npm run dev

# 4. Commit perubahan di branch
git add .
git commit -m "Add new feature"

# 5. Push branch ke GitHub
git push origin feature/tambah-fitur-baru

# 6. Jika sudah selesai dan di-test, merge ke main
git checkout main
git pull origin main
git merge feature/tambah-fitur-baru
git push origin main

# 7. Hapus branch
git branch -d feature/tambah-fitur-baru
```

### Undo Perubahan

**Undo perubahan yang belum di-commit:**
```bash
# Undo semua perubahan
git checkout .

# Undo file spesifik
git checkout nama-file.js
```

**Undo commit terakhir:**
```bash
# Undo tapi jaga perubahan (bisa edit lagi)
git reset --soft HEAD~1

# Undo dan hapus perubahan (berbahaya!)
git reset --hard HEAD~1
```

---

## BAGIAN 7: CHECKLIST SEBELUM DEPLOYMENT

Sebelum push ke GitHub (dan trigger deployment), pastikan:

- [ ] Code sudah di-test lokal dengan `npm run dev`
- [ ] Tidak ada error di console browser
- [ ] Commit message jelas dan spesifik
- [ ] Hanya file yang diinginkan yang di-commit (`git status`)
- [ ] Sudah pull perubahan terbaru (`git pull origin main`)
- [ ] GitHub Secrets sudah di-setup (hanya perlu sekali)
- [ ] Tidak ada file sensitif yang ter-commit

---

## BAGIAN 8: SUMMARY

### Setup Awal (One-Time)
1. ✅ Git sudah terkonfigurasi
2. ✅ GitHub token sudah tersimpan
3. ✅ Repository sudah terhubung
4. ✅ GitHub Actions workflow sudah dibuat
5. ⏳ **Setup GitHub Secrets** (Anda perlu lakukan ini)
6. ⏳ **Commit dan push workflow pertama** (Anda perlu lakukan ini)

### Workflow Harian
1. `git pull origin main`
2. Edit code dan test dengan `npm run dev`
3. `git add .`
4. `git commit -m "pesan yang jelas"`
5. `git push origin main`
6. Monitor GitHub Actions

### Commands Paling Penting
```bash
git pull origin main    # Pull terbaru
git add .               # Tambah file
git commit -m "pesan"   # Commit
git push origin main    # Push
npm run dev             # Test lokal
```

---

## BANTUAN TAMBAHAN

Jika mengalami masalah:
- Cek GitHub Actions logs untuk detail error
- Pastikan semua GitHub Secrets terisi dengan benar
- Test SSH connection manual ke Hostinger
- Minta bantuan Devin dengan command: "Debug deployment error"
- Baca panduan ini lagi dari awal
