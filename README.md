<div align="center">

<img src="public/ubg-logo.png" alt="UBG Logo" width="80" />

# UBG Schedule

**Pengatur jadwal kuliah tidak resmi untuk mahasiswa Universitas Bumigora**

Upload PDF jadwal teori → Upload Excel jadwal praktikum → Lihat & ekspor jadwal lengkap.

[![React](https://img.shields.io/badge/React_19-black?style=for-the-badge&logo=react&logoColor=61DAFB&labelColor=000)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-black?style=for-the-badge&logo=typescript&logoColor=3178C6&labelColor=000)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-black?style=for-the-badge&logo=vite&logoColor=646CFF&labelColor=000)](https://vite.dev)

<br/>

<img src="public/mainpage.png" alt="UBG Schedule App Screenshot" width="480" style="border: 2px solid black; border-radius: 4px;" />

</div>

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 📄 **Upload Jadwal Teori** | Parse otomatis PDF jadwal kuliah dari portal UBG |
| 📊 **Upload Jadwal Praktikum** | Baca file Excel/CSV jadwal lab dengan deteksi ruangan otomatis |
| 🔀 **Merge Cerdas** | Gabungkan jadwal teori + praktikum jadi satu tampilan bersih |
| ⚠️ **Deteksi Bentrok** | Otomatis tandai jadwal yang tabrakan di hari yang sama |
| ✏️ **Edit Manual** | Tambah, ubah, atau hapus baris jadwal langsung di tabel |
| 🖨️ **Export Lengkap** | Ekspor ke PNG resolusi tinggi, file `.ics` (Google/Apple Calendar), atau salin sebagai teks |
| 📱 **PWA** | Bisa diinstall di HP/laptop, bisa dipakai offline |

---

## 🚀 Cara Pakai

### Langkah 1 — Upload Jadwal Teori (PDF)

Ambil PDF jadwal perkuliahan dari portal UBG, lalu drop ke aplikasi. Parser akan otomatis membaca kode MK, nama mata kuliah, dosen, hari, jam, dan ruangan.

Pilih kelas yang ingin dimasukkan jadwalnya menggunakan checkbox.

### Langkah 2 — Upload Jadwal Praktikum (Excel)

Upload file `.xlsx` / `.xls` / `.csv` jadwal praktikum. Pilih prefix ruangan lab (misal `LAB`, `A`), lalu aplikasi scan dan tampilkan kandidat jadwal yang cocok.

### Langkah 3 — Lihat & Ekspor

Jadwal gabungan tampil dalam tabel yang bisa dicari dan diedit. Dari sini bisa:
- **Export PNG** — gambar jadwal resolusi tinggi siap share
- **Export .ics** — langsung masuk Google Calendar / Apple Calendar
- **Salin teks** — format plain text / markdown

---

## 🛠️ Tech Stack

```
Frontend   React 19 + TypeScript + Vite 8
Styling    Tailwind CSS v3 (Neubrutalism design system)
Animation  Framer Motion 13 + Lenis smooth scroll
State      Zustand 5 (persisted ke localStorage)
Parsing    pdfjs-dist (PDF) + xlsx (Excel) — keduanya di Web Worker
Icons      Phosphor Icons + Lucide React
UI         Radix UI primitives
Deploy     Vercel (PWA, auto-update service worker)
```

---

## ⚙️ Development

```bash
# Install dependencies
npm install

# Jalankan dev server
npm run dev

# Build production
npm run build

# Preview build
npm run preview

# Lint
npm run lint
```

> Tidak ada test suite. Verifikasi perubahan dengan `npm run build` (type-check + bundle) dan manual test di browser.

---

## 🏗️ Arsitektur

```
src/
├── components/
│   ├── TheoryStep.tsx        # Step 1: upload & pilih jadwal teori
│   ├── PraktikumStep.tsx     # Step 2: upload & merge jadwal praktikum
│   ├── ResultStep.tsx        # Step 3: tabel hasil + export
│   ├── ClassCard.tsx         # Card jadwal individual
│   ├── EditModal.tsx         # Modal tambah/edit baris jadwal
│   ├── HelpModal.tsx         # Modal panduan penggunaan
│   └── shared/               # Komponen reusable (BottomNav, FileDropZone, dll.)
├── store/
│   └── useJadwalStore.ts     # Zustand store (semua state wizard)
├── workers/
│   ├── theory.worker.ts      # Web Worker: parser PDF teori
│   └── praktikum.worker.ts   # Web Worker: parser Excel praktikum
└── features/
    ├── schedule/             # Halaman-halaman wizard
    └── exporter/             # ExportCanvas (PNG), ExportICS, ExportCopy
```

**Parsing berjalan di Web Worker** — UI tidak freeze saat memproses file besar. Worker stream log realtime ke halaman untuk progress bar.

---

## 📦 Format Data

Baris jadwal final menggunakan field berikut:

```ts
{
  KodeMK: string        // Kode mata kuliah, mis. "TI123456"
  MataKuliah: string    // Nama mata kuliah
  Kelas: string         // Kelas, mis. "TI-3A"
  SKS: number
  SMT: number           // Semester
  DosenPengampuh: string
  Hari: string          // "Senin" | "Selasa" | ... | "Minggu"
  Jam: string           // Format "HH.MM-HH.MM"
  Ruang: string
  Keterangan: string    // "Teori" | "Praktikum" | "Jadwal Bentrok"
}
```

---

## 🌐 Deploy

Aplikasi di-deploy ke **Vercel** dengan konfigurasi:
- Asset JS/CSS: `Cache-Control: immutable` (cache 1 tahun)
- Service Worker & manifest: `must-revalidate` (selalu cek update)
- PWA `autoUpdate` — update transparan di background

---

## 📄 Lisensi

Project ini tidak resmi dan tidak berafiliasi dengan Universitas Bumigora.  
Dibuat untuk memudahkan mahasiswa mengatur jadwal kuliah mereka.

---

<div align="center">

Dibuat dengan ☕ oleh mahasiswa, untuk mahasiswa UBG.

</div>
