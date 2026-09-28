# Panduan Manual GitHub & Hostinger

## Status Saat Ini
✅ Git sudah terkonfigurasi dengan email: `official.rbnsyaf@gmail.com`
✅ GitHub token sudah tersimpan di Windows Credential Manager
✅ Repository sudah terhubung ke GitHub: `https://github.com/robinsyaifuddin/PresenTrain.git`

---

## Bagian 1: Menggunakan GitHub

### 1.1 Push Perubahan ke GitHub

Setiap kali Anda membuat perubahan pada code:

```bash
# 1. Cek status file yang berubah
git status

# 2. Tambahkan semua file yang berubah
git add .

# 3. Commit dengan pesan yang jelas
git commit -m "Deskripsi perubahan Anda"

# 4. Push ke GitHub
git push origin main
```

**Contoh praktis:**
```bash
git add .
git commit -m "Update homepage design"
git push origin main
```

### 1.2 Pull Perubahan dari GitHub

Jika Anda bekerja di komputer lain atau ada perubahan dari GitHub:

```bash
git pull origin main
```

### 1.3 Cek Branch dan Status

```bash
# Lihat branch aktif
git branch

# Lihat commit history
git log --oneline -10
```

### 1.4 Workflow Sehari-hari

1. Buka project di VS Code
2. Lakukan perubahan code
3. Test lokal dengan `npm run dev`
4. Commit dan push:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

---

## Bagian 2: Pilih Metode Deployment

### 2.1 Perbandingan Metode Deployment

**Hostinger Git Integration (Tidak Disarankan untuk React)**
- ✅ Setup lebih sederhana (tidak perlu GitHub Actions/secrets)
- ❌ **Masalah kritis**: `.gitignore` mengabaikan folder `dist`, jadi Hostinger akan menarik source code, bukan file built
- ❌ Hostinger tidak otomatis build React apps
- ❌ Perlu commit file built ke GitHub (tidak disarankan)

**GitHub Actions (Disarankan - Sudah Dibuat)**
- ✅ Build otomatis dengan `npm run build`
- ✅ Deploy folder `dist` yang production-ready
- ✅ Lebih fleksibel dan powerful
- ✅ Bisa tambahkan testing sebelum deploy
- ✅ Standar industri untuk modern frontend deployment
- ✅ Workflow sudah dibuat di `.github/workflows/deploy.yml`

**Rekomendasi**: Gunakan GitHub Actions karena project ini adalah React + Vite yang butuh build process.

### 2.2 Setup GitHub Secrets

1. Buka repository GitHub Anda: https://github.com/robinsyaifuddin/PresenTrain
2. Klik tab **Settings**
3. Klik **Secrets and variables** → **Actions**
4. Klik **New repository secret**
5. Tambahkan 4 secrets berikut:

| Secret Name | Value | Cara Mendapatkan |
|-------------|-------|-----------------|
| `HOSTINGER_HOST` | `145.79.14.213` | Dari Hostinger hPanel |
| `HOSTINGER_USER` | `u503475479` | Dari Hostinger hPanel |
| `HOSTINGER_SSH_KEY` | Private SSH key | Hostinger hPanel → Advanced → SSH Access → Generate SSH Key → Copy Private Key |
| `HOSTINGER_PATH` | `public_html` | Path folder di Hostinger |

**Cara mendapatkan SSH Key dari Hostinger:**

1. Login ke Hostinger hPanel
2. Buka **Advanced** → **SSH Access**
3. Klik **Generate new SSH key**
4. Copy **Public Key** dan tambahkan ke GitHub (Settings → SSH and GPG keys → New SSH key)
5. Copy **Private Key** untuk dijadikan GitHub Secret `HOSTINGER_SSH_KEY`

### 2.3 Test Deployment

1. Commit dan push perubahan:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```

2. Buka GitHub repository → tab **Actions**
3. Lihat workflow yang sedang berjalan
4. Jika sukses, website Anda akan otomatis ter-deploy ke Hostinger

---

## Bagian 3: Troubleshooting

### 3.1 Git Push Gagal

**Error: Authentication failed**
- Pastikan token GitHub sudah tersimpan (sudah kita setup sebelumnya)
- Coba lagi: `git push origin main`

**Error: Remote repository not found**
- Cek remote URL: `git remote -v`
- Jika salah, update: `git remote set-url origin https://github.com/robinsyaifuddin/PresenTrain.git`

### 3.2 GitHub Actions Gagal

**Error: SSH connection failed**
- Pastikan GitHub Secrets sudah diisi dengan benar
- Test SSH connection manual dari komputer Anda ke Hostinger
- Pastikan SSH key valid

**Error: Build failed**
- Cek apakah `package.json` lengkap
- Pastikan Node.js version compatible (kita pakai 18)
- Lihat log error di GitHub Actions

### 3.3 Website Tidak Update

1. Cek GitHub Actions status (harus hijau/sukses)
2. Clear cache browser (Ctrl + F5)
3. Cek deployment path di Hostinger
4. Pastikan file `dist/` ter-generate dengan benar

---

## Bagian 4: Workflow Lengkap

### Development Workflow

```
1. Local Development
   ↓
   npm run dev (test lokal)
   ↓
2. Commit Changes
   ↓
   git add .
   git commit -m "message"
   ↓
3. Push to GitHub
   ↓
   git push origin main
   ↓
4. Auto-Deploy (GitHub Actions)
   ↓
   Build project (npm run build)
   ↓
   Upload ke Hostinger via SSH
   ↓
5. Website Live
```

### Commands Cheat Sheet

```bash
# Git commands
git status                    # Cek status file
git add .                     # Tambah semua file
git commit -m "message"       # Commit perubahan
git push origin main          # Push ke GitHub
git pull origin main          # Pull dari GitHub
git log --oneline -10         # Lihat 10 commit terakhir

# Development commands
npm run dev                   # Jalankan development server
npm run build                 # Build untuk production
npm run preview               # Preview build production
```

---

## Bagian 5: Next Steps

1. **Buat GitHub Actions workflow** (file `.github/workflows/deploy.yml`)
2. **Setup GitHub Secrets** di repository GitHub
3. **Test deployment** dengan push perubahan ke GitHub
4. **Monitor** GitHub Actions untuk memastikan deployment sukses

---

## Bantuan Tambahan

Jika mengalami masalah:
- Cek GitHub Actions logs untuk detail error
- Pastikan semua GitHub Secrets terisi dengan benar
- Test SSH connection manual ke Hostinger
- Minta bantuan Devin dengan command: "Debug deployment error"
