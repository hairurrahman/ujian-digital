# 🏫 Aplikasi Web Asesmen — Portal Ujian Digital

> **Karya:** Hairur Rahman | **Link:** [hairurrahman.github.io](https://hairurrahman.github.io)

---

## 📁 Struktur Folder Project

```
aplikasi-asesmen/          ← Folder utama (nama bebas)
├── src/
│   ├── App.jsx            ← Komponen React utama (SEMUA kode ada di sini)
│   ├── main.jsx           ← Entry point React
│   └── index.css          ← Tailwind CSS directives
├── index.html             ← HTML template
├── package.json           ← Konfigurasi npm & scripts
├── vite.config.js         ← Konfigurasi Vite
├── tailwind.config.js     ← Konfigurasi Tailwind
├── postcss.config.js      ← Konfigurasi PostCSS
├── .gitignore             ← File yang diabaikan Git
└── Code.gs                ← Google Apps Script (upload terpisah)
```

---

## 🚀 PANDUAN DEPLOY KE `hairurrahman.github.io`

### LANGKAH 1 — Install Node.js

Download dan install **Node.js** dari: https://nodejs.org (pilih versi LTS)

Cek instalasi berhasil:
```bash
node --version   # harusnya v18 ke atas
npm --version    # harusnya v9 ke atas
```

---

### LANGKAH 2 — Buat Repo GitHub

1. Buka https://github.com → Login sebagai **hairurrahman**
2. Klik tombol **"New"** (buat repo baru)
3. Nama repo: **`hairurrahman.github.io`** ← PERSIS seperti ini
4. Centang **"Public"**
5. **JANGAN** centang "Add README"
6. Klik **"Create repository"**

> ⚠️ Nama repo harus **username.github.io** agar bisa diakses di `hairurrahman.github.io`

---

### LANGKAH 3 — Setup Project di Komputer

Buka Terminal (Windows: gunakan **Git Bash** atau **Command Prompt**):

```bash
# 1. Buat folder project
mkdir aplikasi-asesmen
cd aplikasi-asesmen

# 2. Copy semua file dari hasil download ke folder ini
#    (App.jsx, main.jsx, index.css, index.html, package.json, dll)

# 3. Install semua dependencies
npm install
```

> Proses install memerlukan koneksi internet, tunggu sampai selesai (~1-2 menit)

---

### LANGKAH 4 — Test di Lokal (opsional tapi disarankan)

```bash
npm run dev
```

Buka browser: **http://localhost:5173**

Pastikan aplikasi tampil dengan benar. Tekan `Ctrl+C` untuk stop.

---

### LANGKAH 5 — Build Project

```bash
npm run build
```

Ini akan membuat folder **`dist/`** berisi file siap deploy.

---

### LANGKAH 6 — Upload ke GitHub

```bash
# 1. Inisialisasi Git
git init

# 2. Tambahkan semua file
git add .

# 3. Commit pertama
git commit -m "Initial commit: Aplikasi Web Asesmen"

# 4. Ganti branch ke main
git branch -M main

# 5. Hubungkan ke repo GitHub (GANTI dengan URL repo kamu)
git remote add origin https://github.com/hairurrahman/hairurrahman.github.io.git

# 6. Push ke GitHub
git push -u origin main
```

---

### LANGKAH 7 — Deploy ke GitHub Pages

```bash
npm run deploy
```

Perintah ini otomatis:
1. Build ulang project
2. Push folder `dist/` ke branch `gh-pages`

---

### LANGKAH 8 — Aktifkan GitHub Pages

1. Buka repo di GitHub: `github.com/hairurrahman/hairurrahman.github.io`
2. Klik **Settings** (tab paling kanan)
3. Di sidebar kiri, klik **Pages**
4. Di bagian **Source**, pilih:
   - Branch: **`gh-pages`**
   - Folder: **`/ (root)`**
5. Klik **Save**
6. Tunggu 2-5 menit

Aplikasi akan live di: **https://hairurrahman.github.io** 🎉

---

## 🔄 Update Aplikasi (setelah perubahan kode)

```bash
# Edit src/App.jsx sesuai kebutuhan, lalu:
git add .
git commit -m "Update: deskripsi perubahan"
git push
npm run deploy
```

---

## ⚙️ Setup Google Apps Script

### A. Buat Spreadsheet

1. Buka https://sheets.google.com
2. Buat spreadsheet baru
3. Salin ID dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SALIN_ID_INI]/edit
   ```

### B. Deploy Apps Script

1. Buka https://script.google.com
2. Klik **New project**
3. Hapus kode default, paste isi file **`Code.gs`**
4. Ganti baris ini:
   ```javascript
   const SPREADSHEET_ID = "PASTE_ID_SPREADSHEET_KAMU";
   ```
5. Klik **Deploy → New deployment**
6. Type: **Web App**
7. Execute as: **Me**
8. Who has access: **Anyone**
9. Klik **Deploy** → Authorize → **Salin URL**

### C. Hubungkan ke Aplikasi

1. Buka **https://hairurrahman.github.io**
2. Masuk **Mode Guru** (password: `guru123`)
3. Buka tab **Pengaturan**
4. Paste URL Apps Script di field "URL Google Apps Script"
5. Paste URL Spreadsheet di field "Link Google Spreadsheet"
6. Klik **Simpan Pengaturan**

---

## 📊 Struktur Spreadsheet (dibuat otomatis)

| Sheet | Isi |
|-------|-----|
| `MTK_Sumatif1` | Soal Matematika Sumatif 1 |
| `BINDO_Sumatif1` | Soal Bahasa Indonesia Sumatif 1 |
| `IPAS_Sumatif1` | Soal IPAS Sumatif 1 |
| `HASIL` | Semua hasil ujian |
| `HASIL_MTK` | Hasil per mapel |
| `TOKEN` | Daftar token ujian |

---

## 🎮 Akun Demo (tanpa backend)

| | |
|--|--|
| Token ujian | `UJIAN2024` |
| Password guru | `guru123` |
| Soal demo | Matematika / Sumatif 1 |
| Soal demo | IPAS / Sumatif 1 |

---

## ❓ Troubleshooting

**Aplikasi tidak muncul setelah deploy:**
- Tunggu 5-10 menit, GitHub Pages butuh waktu
- Pastikan branch `gh-pages` sudah ada di repo

**Error saat `npm install`:**
- Pastikan Node.js sudah terinstall
- Coba: `npm install --legacy-peer-deps`

**Error saat `npm run deploy`:**
- Pastikan sudah login Git: `git config --global user.email "email@kamu.com"`
- Coba jalankan manual: `npm run build` lalu push folder `dist`

**Formula matematika tidak muncul:**
- Pastikan koneksi internet aktif (KaTeX dimuat dari CDN)
- Coba refresh halaman

---

*Aplikasi Web Asesmen — Copyright © 2026 Hairur Rahman*
