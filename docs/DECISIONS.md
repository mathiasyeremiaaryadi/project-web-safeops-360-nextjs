# Keputusan Teknis

Versi yang terpasang saat proyek dibuat: Next.js 16.4.0 (Turbopack), React 19.3, Tailwind CSS
4.3, shadcn 4.21 (style `radix-nova`), Zod 4.6, ky 2.2, TanStack Query 5, Zustand 5,
Serwist 9.5, MSW 3, Vitest 5, Playwright 1.64.

## D1. CSP dengan nonce di `src/proxy.js`, semua halaman dirender dinamis

Next.js menyisipkan script inline (payload RSC). Tanpa `'unsafe-inline'`, satu-satunya cara yang
didukung adalah nonce per request. Next 16 memakai `proxy.js` (pengganti `middleware.js`).

- `proxy.js` membuat nonce dan memasang `Content-Security-Policy`. Header statis lain
  (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, HSTS di
  production) dipasang lewat `headers()` di `next.config.mjs`.
- Nonce butuh render dinamis, jadi root layout memanggil `await connection()`. Akibatnya
  `cacheComponents` dan `partialPrefetching` (default dari `create-next-app`) **dimatikan**.
  Keduanya juga tidak cocok dengan route handler Serwist (lihat D3).
- `style-src` memakai `'unsafe-inline'` karena Radix memakai atribut `style` dan sonner
  menyisipkan `<style>` saat runtime. Risiko injeksi CSS jauh lebih kecil daripada injeksi script.
- `upgrade-insecure-requests` tidak dipakai; HSTS sudah menangani HTTPS di production.

## D2. ky 2: `prefix` menggantikan `prefixUrl`

ky 2 mengganti nama opsi `prefixUrl` menjadi `prefix`. Klien memakai `prefix: '/api/v1'`.
Retry setelah refresh memakai `ky.retry({ request })`. Ini _forced retry_, jadi berlaku juga untuk
POST/PUT dan hanya sekali. Retry otomatis biasa tetap hanya untuk GET.

## D3. Serwist: `@serwist/turbopack`, bukan `@serwist/next`

`@serwist/next` adalah plugin webpack, sedangkan Next 16 membangun dengan Turbopack secara
default. `@serwist/turbopack` (dari tim yang sama) membangun service worker lewat route handler
`app/serwist/[path]/route.js` dan esbuild. Dependensi tambahan: `serwist` dan `esbuild`.

- SW dilayani di `/serwist/sw.js` dengan `Service-Worker-Allowed: /` (scope `/`).
- Precache hanya aset statis (`.next/static/**`: JS, CSS, font, gambar), ikon, dan halaman
  `/offline`. `/api/` selalu `NetworkOnly`. Halaman HTML tidak di-cache karena berisi nonce CSP.
- SW **dimatikan di development** dan saat mocking aktif. MSW juga memakai service worker dengan
  scope `/`, jadi keduanya tidak boleh jalan bersamaan.
- `cacheOnNavigation` dan `reloadOnOnline` dari `SerwistProvider` dimatikan: yang pertama akan
  meng-cache HTML, yang kedua bisa menghapus isian form saat koneksi kembali.

## D4. Komponen shadcn `form` tidak ada lagi di registry

`shadcn add form` tidak menghasilkan file karena registry saat ini menggantinya dengan `field`.
Form memakai React Hook Form langsung, ditambah komponen kecil `components/shared/form-field.jsx`
(label, `aria-invalid`, `aria-describedby`, pesan error beranimasi).

## D5. Perubahan pada primitif shadcn

- `input.jsx`: tinggi 44px (`h-11`), font 16px di semua ukuran (default shadcn turun ke 14px di
  `md`), latar `bg-card`, dan focus ring sesuai token.
- `sonner.jsx`: `next-themes` dihapus karena aplikasi hanya punya satu tema.
- `lib/utils.js` meneruskan `cn()` dari paket `cn` (milik shadcn, pengganti `clsx` dan
  `tailwind-merge` yang dipasang otomatis oleh `shadcn init`).

## D6. `"type": "module"` di `package.json`

Supaya `next.config.mjs` bisa mengimpor `src/config/env.js` (ESM) dan memvalidasi env saat dev/build.

## D7. Validasi env

- Development tanpa mock: `API_ORIGIN` wajib, `next dev` gagal jika tidak ada.
- Production: `NEXT_PUBLIC_API_MOCKING=enabled` membuat build gagal.
- `API_ORIGIN` bukan `NEXT_PUBLIC_`, jadi tidak pernah masuk ke bundle browser.

## D8. Penanganan 401 yang tahan balapan

Selain single-flight, hook `afterResponse` mengecek token yang dipakai request. Jika token di memori
sudah berbeda (refresh lain sudah selesai), request diulang dengan token baru **tanpa** refresh
lagi. Jika sesi sudah dibersihkan, request tidak memicu refresh baru. Hasilnya: tidak ada rotasi
berlebih dan tidak ada refresh berantai saat refresh gagal.

## D9. Belum ada koordinasi refresh antar-tab

Single-flight berlaku per tab. Dua tab yang reload bersamaan bisa memanggil refresh secara
paralel dengan cookie yang sama. Opsi: `BroadcastChannel` atau Web Locks API
(`navigator.locks.request('auth-refresh', …)`), atau grace period di backend. Lihat ASSUMPTIONS A2.

## D10. Mock API untuk E2E: `page.route`, bukan MSW

E2E berjalan pada production build (`next build && next start`), dan mocking MSW ditolak di build
production (D7). Playwright memakai `serviceWorkers: 'block'` karena request dari service worker
tidak tertangkap oleh `page.route`.

## D11. Halaman login tetap dirender walau user mungkin sudah login

`/login` mencoba memulihkan sesi diam-diam (single-flight refresh). Jika berhasil, user diarahkan
ke `/`. Form tetap bisa dipakai selama proses ini, supaya tidak ada layar kosong di sinyal lemah.

## D12. Pesan error login: `Alert` di atas tombol

Mockup XS menampilkan error sebagai teks merah di bawah field password, dengan sisa percobaan.
Spesifikasi meminta `Alert` dengan `role="alert"` di atas tombol dan tanpa sisa percobaan. Yang
diikuti adalah spesifikasi; posisinya tetap tepat di bawah field password.
