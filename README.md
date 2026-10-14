# Open PDF

Alat PDF lengkap untuk **Android & iOS**, terinspirasi dari [Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF).
Bedanya: tidak perlu server. Semua proses berjalan **di perangkat**, jadi file tidak pernah di-upload ke mana pun.

Dibangun dengan Expo (React Native + TypeScript), [`@cantoo/pdf-lib`](https://www.npmjs.com/package/@cantoo/pdf-lib)
untuk manipulasi PDF, dan PDFKit (iOS) / PdfRenderer (Android) untuk render halaman lewat
[`react-native-pdf-thumbnail`](https://www.npmjs.com/package/react-native-pdf-thumbnail).

## Fitur

| Kategori | Alat |
| --- | --- |
| **Atur** | Gabung PDF · Pisah PDF (tiap N halaman / rentang) · Atur halaman (urutkan, ambil, ganjil/genap, balik) · Putar halaman · Hapus halaman · Multi-halaman (2/4 per lembar) |
| **Konversi** | Gambar ke PDF (A4/Letter/sesuai gambar) · PDF ke gambar (JPEG/ZIP) · Kompres (lossless atau maksimal via rasterisasi) |
| **Edit** | Watermark teks (tengah/ulang, warna, transparansi, kemiringan) · Nomor halaman · Tanda tangan (gambar dengan jari, atau dari foto/PNG) · Info & metadata · Ratakan formulir |
| **Keamanan** | Tambah password (AES-256 + izin cetak/salin/ubah) · Hapus password |

Hasil disimpan di tab **File**, dan bisa dibagikan atau disimpan ke folder (Android: pemilih folder; iOS: "Simpan ke File").

Ketuk PDF di tab **File** untuk membukanya di **penampil**: halaman di-render tajam sesuai kebutuhan,
ada penghitung halaman dan strip thumbnail untuk lompat halaman, ketuk halaman untuk memperbesar
(cubit, geser, ketuk dua kali), dan bilah bawah untuk langsung membuka alat dengan dokumen itu.

Tombol **Anotasi** di penampil membuka mode coret: pena, stabilo, teks, penghapus, plus urungkan/ulangi,
palet warna, dan ketebalan. **Simpan** menempelkan anotasi secara permanen (vektor) ke file baru
`…-anotasi.pdf`; file aslinya tidak diubah. Stabilo adalah coretan bebas, bukan seleksi teks.

PDF dan gambar juga bisa dikirim dari aplikasi lain lewat menu **Bagikan**, atau dibuka dengan
**"Buka dengan Open PDF"** (Android) / **"Buka di"** (iOS); aplikasi lalu menawarkan alat yang cocok.

Bahasa mengikuti perangkat: Indonesia untuk perangkat berbahasa Indonesia, selain itu Inggris.
Teks UI ditulis dalam bahasa Indonesia dan diterjemahkan lewat `t()` di `src/lib/i18n.ts`;
terjemahan Inggris ada di `src/lib/i18n-en.ts` (tes memastikan tidak ada yang terlewat).

## Struktur

```
src/
  app/                 Rute Expo Router
    (tabs)/index.tsx   Beranda File: status privasi, alat cepat, penyimpanan, dokumen terbaru
    (tabs)/tools.tsx   Daftar semua alat per kategori
    (tabs)/settings.tsx Tema, bahasa, penyimpanan, tentang
    tool/[id].tsx      Membuka layar alat berdasarkan id
    viewer.tsx         Penampil PDF (halaman, navigasi, zoom, alat cepat)
    incoming.tsx       File yang dibagikan/dibuka dari aplikasi lain
    +native-intent.ts  Mengarahkan link dari OS ke incoming
  lib/
    pdf/ops.ts         Semua operasi PDF (murni: bytes masuk, bytes keluar; tanpa React Native)
    tools.ts           Daftar alat (judul, ikon, kategori)
    files.ts           Pilih file/gambar, simpan, bagikan, impor file dari aplikasi lain
    i18n.ts            Terjemahan (t()), kamus Inggris di i18n-en.ts
    render.ts          Render halaman via mesin PDF native
  tools/               Layar setiap alat (organize, convert, edit, security)
  components/          Komponen UI bersama
  hooks/use-tool.ts    State pilih PDF, jalankan alat, thumbnail
tests/                 Tes engine PDF dan kelengkapan terjemahan (jalan di Node)
```

Menambah alat baru: tulis fungsinya di `src/lib/pdf/ops.ts` (+ tes), daftarkan di `src/lib/tools.ts`,
buat layarnya di `src/tools/`, lalu petakan di `src/tools/index.ts`.

## Menjalankan

Aplikasi ini memakai modul native (render halaman), jadi butuh **development build**, bukan Expo Go.

```bash
npm install
npm test            # tes engine PDF
npm run typecheck
npx expo lint

npx expo run:android   # butuh Android Studio / emulator
npx expo run:ios       # butuh Xcode + iOS Simulator (macOS)
```

> **Android butuh JDK 17.** JDK 25 bawaan Android Studio terbaru membuat langkah CMake gagal
> ("A restricted method in java.lang.System has been called"). Arahkan `JAVA_HOME` ke JDK 17 sebelum build.

`patches/` berisi patch kecil untuk `react-native-pdf-thumbnail` (diterapkan otomatis saat `npm install`)
agar halaman bisa dirender di atas 72 dpi.

Build di cloud tanpa Android Studio/Xcode lokal:

```bash
npx eas-cli@latest build --profile development --platform all
```

## Batasan saat ini

- Watermark dan nomor halaman memakai font standar PDF, jadi hanya mendukung huruf Latin.
- Kompres "Maksimal" mengubah halaman menjadi gambar, sehingga teks tidak bisa dipilih lagi.
- Belum ada: OCR dan konversi Office ↔ PDF.
- Menerima file dari aplikasi lain sudah dites di Android; di iOS (share extension) belum dites.

## Lisensi

Copyright (C) 2026 Epafraditus Memoriano (RLYNO).

Open PDF adalah perangkat lunak bebas di bawah [GNU General Public License v3.0](LICENSE).
Kamu boleh memakai, mengubah, dan mendistribusikan ulang (termasuk menjualnya), asalkan versi yang
didistribusikan juga dirilis dengan GPL-3.0 beserta kode sumbernya, dan mencantumkan karya asli ini.

Setiap PDF yang dihasilkan aplikasi ini memuat penanda `Producer: Open PDF by RLYNO` pada metadata.
