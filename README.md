<div align="center">

<img src="public/ubg-logo.png" alt="Logo Universitas Bumigora" width="80" />

# UBG Schedule

**Pembuat gambar jadwal kuliah untuk mahasiswa Universitas Bumigora**

Aplikasi ini membaca berkas jadwal dari portal Labkom UBG, menyaring jadwal sesuai
daftar kode mata kuliah yang Anda tempel, menandai jadwal bentrok, lalu mengunduh
hasilnya sebagai gambar.

[![React](https://img.shields.io/badge/React_19-black?style=for-the-badge&logo=react&logoColor=61DAFB&labelColor=000)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-black?style=for-the-badge&logo=typescript&logoColor=3178C6&labelColor=000)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-black?style=for-the-badge&logo=vite&logoColor=646CFF&labelColor=000)](https://vite.dev)

<br/>

<img src="public/mainpage.png" alt="Tangkapan layar UBG Schedule" width="480" />

</div>

---

## Daftar Isi

- [Ringkasan](#ringkasan)
- [Dua Mode Wizard](#dua-mode-wizard)
- [Langkah 3: Jadwal Akhir](#langkah-3-jadwal-akhir)
- [Alat Pendukung](#alat-pendukung)
- [Tech Stack](#tech-stack)
- [Menjalankan Proyek](#menjalankan-proyek)
- [Struktur Proyek](#struktur-proyek)
- [Format Data](#format-data)
- [PWA dan Deploy](#pwa-dan-deploy)
- [Catatan dan Lisensi](#catatan-dan-lisensi)

---

## Ringkasan

UBG Schedule adalah PWA untuk mahasiswa Universitas Bumigora. Masalah yang
diselesaikan sederhana: jadwal kuliah hanya bisa dilihat lewat portal Labkom, sehingga
mahasiswa harus bolak-balik membuka dan memeriksa halaman portal setiap kali ingin tahu
jadwalnya. Aplikasi ini mengubah berkas jadwal Labkom menjadi satu gambar jadwal yang
rapi dan bisa dibuka kapan saja.

Inti alurnya menyaring dan mengurutkan. Anda menempelkan daftar kode mata kuliah yang
Anda ambil, mengunggah berkas ekspor jadwal dari portal Labkom, dan sistem mencocokkan
kode tersebut dengan baris jadwal yang relevan. Hasilnya dikelompokkan per hari,
diurutkan berdasarkan jam mulai, dan ditandai kalau ada jam yang bertabrakan.

Semua proses berkas berjalan di Web Worker, jadi antarmuka tetap responsif saat
memproses berkas besar.

Tampilan memakai sistem visual Neubrutalism: tipografi Space Grotesk, border hitam tebal,
sudut tajam tanpa radius, dan drop shadow solid tanpa blur.

---

## Dua Mode Wizard

Mode dipilih lewat komponen `ModeSwitcher` di header. Pilihan mode tersimpan di store,
dan tampilan indikator langkah ikut berubah mengikuti mode yang aktif.

### Mode 1: Auto by Course Codes (mode default)

Cocok kalau Anda sudah punya daftar kode mata kuliah dan ingin aplikasi memilihkan
kelasnya.

**Langkah 1: Kode MK**

- Kolom teks di `AutoCourseCodeInput` untuk menempelkan daftar kode mata kuliah, satu
  kode per baris atau dipisah koma/titik koma.
- Tombol Parse Kode memproses daftar dan menampilkan penghitung pencocokan langsung
  (jumlah kode cocok dibanding kode yang tidak ketemu).
- Dropzone untuk berkas ekspor jadwal dari portal Labkom.
- Dropzone sekunder opsional, dipakai kalau jadwal praktikum berada di berkas terpisah.
- Tombol Panduan membuka `InstructionAccordion`, panduan langkah demi langkah untuk
  mengunggah berkas jadwal dari portal Labkom dan memasukkan daftar kode mata kuliah.

**Langkah 2: Pilih Kelas**

- `AutoClassPicker` menampilkan setiap Kode MK yang cocok beserta kartunya
  (`AutoClassCard`).
- Panel ringkasan menampilkan Total Kode, jumlah cocok, jumlah tidak cocok, jumlah jadwal
  teori terpilih, dan jumlah jadwal praktikum terpilih.
- Pemilih "Pilih Kelas Cepat untuk Semua" (`globalClassSelection`) memilih huruf kelas
  yang dipilih pada semua mata kuliah yang memilikinya sekaligus, termasuk sub-kelompok
  praktikumnya. Memilih kelas A otomatis mencakup A1, A2, dan seterusnya.
- Tombol "Pilih Semua Jadwal" dan "Kosongkan Semua" untuk aksi massal. Setiap kartu juga
  punya tombol Pilih Semua dan Batal untuk mata kuliah itu sendiri.
- Mata kuliah yang hanya punya satu kelas sudah terpilih otomatis saat kode diparsing,
  jadi tidak perlu diklik satu per satu.

### Mode 2: Manual Selection

Cocok kalau Anda ingin memilih baris jadwal sendiri dari tabel.

**Langkah 1: Teori**

- Unggah berkas jadwal teori dari portal Labkom.
- Tabel jadwal bisa difilter dengan pencarian nama mata kuliah, filter semester (SMT),
  filter kelas, filter hari, dan pengurutan hari naik atau turun.
- Pemilihan multi baris lewat checkbox.

**Langkah 2: Praktikum**

- Unggah berkas jadwal praktikum dari portal Labkom.
- Aplikasi memindai dan menampilkan daftar prefix ruangan yang ditemukan, lalu memilih
  prefix pertama secara otomatis. Prefix bisa diganti dan berkas akan diparsing ulang.
- Kandidat jadwal bisa difilter berdasarkan pencarian nama, semester, dan kelas.
- Tombol "Lewati Praktikum" untuk langsung ke langkah hasil tanpa memilih praktikum.

---

## Langkah 3: Jadwal Akhir

Layar hasil (`ResultStep`) menampilkan jadwal gabungan teori dan praktikum.

- Kartu dikelompokkan per hari, urut Senin sampai Minggu, dan diurutkan berdasarkan jam
  mulai tiap hari.
- Deteksi bentrok otomatis lewat perbandingan rentang waktu jam kuliah pada hari yang
  sama. Kelas yang bertabrakan mendapat lencana "Bentrok!" beranimasi, warna kartu
  berbeda, dan gaya peringatan berbeda.
- Penggabungan sesi praktikum berurutan otomatis: sesi dengan mata kuliah, ruang, dan
  dosen yang sama serta jam bersambung digabung jadi satu blok waktu.
- Setiap kartu bisa diedit lewat `EditModal` (nama mata kuliah, kelas, SKS, dosen
  pengampuh, hari, ruang, keterangan) atau dihapus.
- Sidebar ringkasan menampilkan Total SKS, Total Kelas, dan banner peringatan berisi
  jumlah kelas yang jadwalnya bertabrakan.

Opsi ekspor yang tersedia:

| Aksi | Keterangan |
|---|---|
| Salin Teks | Menyalin jadwal terformat ke clipboard sebagai teks biasa, dikelompokkan per hari |
| Unduh Gambar | Menggambar ulang jadwal ke canvas HTML5 dengan gaya Neubrutalism, lebar 1200 piksel dan skala 2x, grid kartu dua kolom, lencana, serta footer kredit, lalu mengunduh PNG |
| Reset Semua | Menghapus seluruh state dan kembali ke langkah awal |

---

## Alat Pendukung

### Userscript

`ubg-labkom-helper.user.js` di root repo adalah userscript Tampermonkey untuk
`labkom.ubg.ac.id`. Userscript ini menambahkan panel filter mengambang yang bisa
dilipat, mendukung penyaringan banyak mata kuliah dan banyak kelas sekaligus, lengkap
dengan tombol tampilkan semua dan pencocokan kelas terhadap daftar mata kuliah yang
disimpan. Fungsinya memudahkan saat mengunduh berkas jadwal dari portal. Userscript ini
berdiri sendiri, tidak ikut dibundel oleh Vite. Salinannya juga disajikan di
`public/userscripts/ubg-labkom-helper.user.js` supaya bisa ditautkan dari aplikasi.

Penyaringan bersifat fail-closed: kartu hanya ditampilkan kalau berhasil di-parse
(punya judul dan rentang jam) dan cocok dengan daftar MK yang disimpan. Kode MK
dicocokkan sebagai token utuh, bukan substring, dan kelas dicocokkan per token
sehingga kode ruang seperti `LAB A1` tidak dianggap sebagai kelas A.

#### Jalur 2: Buka di UBG Schedule

Di bawah penghitung sesi ada tombol **Buka di UBG Schedule**. Tombol itu mengambil
kartu yang sedang tampil, memisahkannya menjadi teori dan praktikum, lalu membukanya di
aplikasi ini lewat `https://ubgschedule.vercel.app/#bridge=<payload>`.

- Teori masuk ke `theory` sebagai `DataTeoriMentah` dengan id `bridge-theory-<n>`.
- Praktikum (ruangan atau keterangan mengandung Lab/Praktikum) masuk ke `praktikum`
  sebagai `PraktikumCandidate` dengan id `bridge-lab-<n>`.
- Payload adalah JSON lalu base64 URL-safe, dibaca oleh `src/utils/bridge.ts` saat
  aplikasi dimuat, ditulis ke store, dan hash-nya langsung dibersihkan dengan
  `history.replaceState` supaya reload service worker tidak mengimpor ulang.

### PWA

Aplikasi bisa dipasang di ponsel maupun desktop. Caching offline ditangani Workbox lewat
plugin `vite-plugin-pwa` dengan mode update otomatis.

### Web Worker

Dua worker terpisah menangani parsing berkas:

- `src/workers/theory.worker.ts` untuk berkas jadwal teori, memakai parser teks dan
  parser matriks di `src/utils/theorySheet.ts`.
- `src/workers/praktikum.worker.ts` untuk berkas jadwal praktikum.

Keduanya mengirim pesan berformat `{ type, step, data }` dan melakukan streaming log,
peringatan, dan error secara real-time sehingga halaman bisa menampilkan progres tanpa
memblokir antarmuka.

---

## Tech Stack

```
Frontend    React 19.2 + TypeScript 6 + Vite 8
Styling     Tailwind CSS v3 (sistem desain Neubrutalism, font Space Grotesk)
Animasi     Framer Motion 13
State       Zustand 5 dengan middleware persist (localStorage key ubg-schedule-storage, versi skema 5)
Parsing     Berkas jadwal diproses di dalam Web Worker (parser teks dan parser matriks)
Ikon        Phosphor Icons
Deploy      Vercel (PWA dengan service worker auto-update)
```

Store menyertakan fungsi migrasi untuk data tersimpan dari versi skema sebelumnya, jadi
state lama tetap bisa dibuka setelah pembaruan.

---

## Menjalankan Proyek

```bash
# Pasang dependensi
npm install

# Jalankan dev server
npm run dev

# Build produksi (type-check lalu bundle)
npm run build

# Preview hasil build
npm run preview

# Lint
npm run lint

# Uji unit dan integrasi berbasis Node
npm test
```

### Status Pengujian

`npm test` menjalankan `node --test` atas seluruh berkas di `test/*.test.mjs`. Seluruh
suite lulus, 39 dari 39 pengujian:

| Suite | Cakupan | Hasil |
|---|---|---|
| `courseCode.test.mjs` | Normalisasi kode, pencocokan baris, parsing label kelas, klasifikasi teori/praktikum | 13 lulus |
| `resultClassification.test.mjs` | Klasifikasi dan penggabungan kelas pada layar hasil | 14 lulus |
| `multiSelect.test.mjs` | Pemilihan multi baris pada jadwal teori dan praktikum | 6 lulus |
| `migration.test.mjs` | Migrasi state tersimpan antar versi skema | 4 lulus |
| `store.test.mjs` | Perilaku dasar store Zustand | 2 lulus |

Ada juga pemeriksaan komponen berbasis esbuild (`npm run test:component` dan
`npm run test:kelas`) untuk memverifikasi render komponen tanpa browser.

Perubahan pada parser sebaiknya diverifikasi dengan `npm run build` dan pengujian manual
di browser memakai berkas jadwal asli dari portal Labkom.

---

## Struktur Proyek

```
src/
  components/
    TheoryStep.tsx           # Langkah 1 mode manual, upload dan filter jadwal teori
    PraktikumStep.tsx        # Langkah 2 mode manual, upload dan filter jadwal praktikum
    ResultStep.tsx           # Langkah 3, jadwal akhir, deteksi bentrok, ekspor gambar
    AutoCourseCodeInput.tsx  # Input daftar Kode MK dan penghitung pencocokan
    AutoClassPicker.tsx      # Pemilihan kelas otomatis per Kode MK
    AutoClassCard.tsx        # Kartu mata kuliah pada mode otomatis
    ClassCard.tsx            # Kartu jadwal individual
    EditModal.tsx            # Modal edit data kelas
    WizardHeader.tsx         # Header, logo, dan indikator langkah
    ModeSwitcher.tsx         # Pengalih mode Manual dan Auto by Course Codes
    InstructionAccordion.tsx # Panduan 10 langkah
    shared/                  # Komponen bersama: BottomNav, FileDropZone, LoadingState, FileSummaryCard
  store/
    useJadwalStore.ts        # Store Zustand tunggal untuk seluruh state wizard
  utils/
    courseCode.ts            # Normalisasi kode, pencocokan, klasifikasi kelas, pengurutan
    theorySheet.ts           # Parser matriks jadwal teori, dipakai worker dan pengujian
  workers/
    theory.worker.ts         # Worker parser jadwal teori
    praktikum.worker.ts      # Worker parser jadwal praktikum
  lib/
    utils.ts                 # Helper penggabungan kelas Tailwind
  main.tsx                   # Titik masuk aplikasi dan alur wizard
  index.css                  # Tailwind dan gaya global
test/                        # Pengujian Node dan pemeriksaan komponen
public/                      # Ikon, manifest, gambar, dan userscript
```

---

## Format Data

Baris jadwal teori disimpan dalam bentuk berikut:

```ts
{
  id: string               // ID unik baris
  KodeMK: string           // Kode mata kuliah, mis. "TI123456"
  MataKuliah: string       // Nama mata kuliah
  Kelas: string            // Kelas, mis. "TI-3A"
  SKS: string
  SMT: string              // Semester
  DosenPengampuh: string
  Hari: string             // "Senin" | "Selasa" | ... | "Minggu"
  Jam: string              // Format "HH.MM-HH.MM"
  Ruang: string
  Keterangan: string       // Label kelompok teori atau praktikum
}
```

Kandidat jadwal praktikum disimpan dengan bentuk terpisah (`courseName`, `kelas`,
`keterangan`, `dosen`, `semester`, `hari`, `jam`, `ruang`, `kodeMk`). Pada layar hasil,
keduanya dipetakan ke satu tipe tampilan yang seragam (`UnifiedClass`) sebelum
dikelompokkan dan diekspor.

---

## PWA dan Deploy

Aplikasi di-deploy ke Vercel. Konfigurasi caching di `vercel.json`:

- Aset ber-hash di `/assets/`: `Cache-Control: public, max-age=31536000, immutable`
- `/sw.js` dan `/manifest.json`: `public, max-age=0, must-revalidate`
- Rute lain: `public, max-age=0, must-revalidate`

Service worker memakai strategi NetworkFirst untuk navigasi, dengan batas waktu jaringan
tiga detik dan fallback ke HTML yang terakhir di-cache saat offline. Halaman tidak
di-precache supaya setiap kunjungan mengambil versi terbaru dari jaringan. `skipWaiting`
dan `clientsClaim` diaktifkan bersama `registerSW({ immediate: true })` sehingga service
worker baru langsung mengambil alih tanpa perlu refresh manual.

---

## Catatan dan Lisensi

Proyek ini tidak resmi dan tidak berafiliasi dengan Universitas Bumigora. Satu-satunya
sumber data jadwal adalah portal Labkom UBG, dan perubahan di sisi portal bisa
memengaruhi hasil parsing.

Dibuat oleh mahasiswa untuk memudahkan mahasiswa UBG mengatur jadwal kuliah.
