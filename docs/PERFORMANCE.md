# Penilaian Performa (Fase 8)

Diukur pada 14 Oktober 2026, build production (`next build`, server standalone), API ditiru di
browser (sama dengan E2E) sehingga angka hanya mencerminkan frontend + BFF. Ulangi dengan:

```bash
pnpm build && pnpm start --port 3100
```

```bash
node tests/perf/measure.mjs http://localhost:3100
```

## Hasil — emulasi HP kelas menengah (CPU 4× lebih lambat, jaringan 4G), cache kosong

| Halaman          | TTFB  | FCP    | LCP    | TBT    | CLS   | JS (transfer) |
| ---------------- | ----- | ------ | ------ | ------ | ----- | ------------- |
| `/login`         | 78 ms | 0,46 s | 0,46 s | 158 ms | 0,000 | 247 KB        |
| `/dashboard`     | 12 ms | 1,37 s | 1,47 s | 433 ms | 0,002 | 340 KB        |
| `/reports/tasks` | 9 ms  | 1,11 s | 1,11 s | 299 ms | 0,000 | 331 KB        |
| `/users`         | 15 ms | 1,09 s | 1,09 s | 275 ms | 0,000 | 332 KB        |
| `/inventories`   | 10 ms | 1,16 s | 1,16 s | 351 ms | 0,000 | 332 KB        |

Ambang Google "baik": LCP < 2,5 s, CLS < 0,1. Semua halaman masuk kategori baik. TBT 275–433 ms
pada CPU yang diperlambat 4× tergolong sedang (di laptop biasa jauh lebih kecil).

Server (satu instance, render HTML per request karena nonce CSP): `/login` ±180 req/s
(p95 71 ms), `/dashboard` ±240 req/s (p95 49 ms). Request pertama ke tiap route setelah start
lebih lambat (±1 s) karena modul dimuat pertama kali.

## Komposisi JavaScript (gzip)

| Bagian                       | Ukuran  | Catatan                                       |
| ---------------------------- | ------- | --------------------------------------------- |
| React + Next.js (framework)  | ±110 KB | Wajib                                         |
| Zod 4                        | ±41 KB  | Validasi respons API dan form                 |
| Radix UI + cmdk              | ±24 KB  | Dialog, combobox, dropdown                    |
| Kode aplikasi + library lain | sisanya | TanStack Query/Table, RHF, ky, nuqs, date-fns |

## Yang sudah baik

- Data diambil di browser lewat TanStack Query dengan cache dan `keepPreviousData`: berpindah
  halaman/filter tidak menampilkan skeleton ulang.
- Tidak ada layout shift (CLS ≈ 0): skeleton berukuran sama dengan isi.
- Foto dari signed URL memakai `loading="lazy"`.
- Respons API `no-store` (data sensitif), aset statis di-cache browser dan service worker.

## Rekomendasi (belum diterapkan — dipilih agar tidak ada risiko regresi)

1. **Lazy-load dialog form** (`next/dynamic`) untuk dialog yang baru dibutuhkan saat tombol
   diklik (form inventory, SOP, vendor). Perkiraan hemat 10–20 KB per halaman.
2. **`zod/mini`** untuk schema yang dipakai di browser: bisa menghemat ±25 KB, tetapi perlu
   menulis ulang semua schema — sebaiknya bersamaan dengan pekerjaan besar lain.
3. Jika jumlah user bertambah: jalankan ≥2 instance (wajib set `SESSION_SECRET` yang sama) di
   belakang reverse proxy, dan aktifkan kompresi Brotli di proxy.
