# Keputusan Teknis

Versi yang terpasang saat proyek dibuat: Next.js 16.4.0 (Turbopack), React 19.3, Tailwind CSS
4.3, shadcn 4.21 (style `radix-nova`), Zod 4.6, ky 2.2, TanStack Query 5, Zustand 5,
Serwist 9.5, Vitest 5, Playwright 1.64.

## D0. Arsitektur BFF (Backend-for-Frontend) — permintaan klien

```
Browser (React) ──/api/*──▶ Next.js server (BFF) ──/api/v1/*──▶ Go (Gin) ──▶ PostgreSQL
                 cookie sesi                       Bearer token Go
```

- Browser **hanya** memanggil Next.js (`/api/...`, origin sama) dan tidak pernah berbicara
  langsung dengan Go. Go cukup bisa dijangkau dari jaringan internal oleh server Next.js.
- Access token dan refresh token Go **tidak pernah sampai ke browser**. Keduanya disimpan di
  **cookie sesi terenkripsi** (AES-256-GCM, kunci dari `SESSION_SECRET`) dengan atribut
  `HttpOnly; SameSite=Lax; Path=/`, ditambah `Secure` dan prefix `__Host-` di production.
  JavaScript di browser tidak bisa membaca maupun mendekripsinya.
- Pilihan **stateless** (cookie terenkripsi, bukan Redis): tidak ada infrastruktur tambahan, dan
  setiap instance Next.js bisa membaca sesi. Konsekuensinya, sesi tidak bisa dicabut dari sisi
  Next.js saja; pencabutan dilakukan di Go (refresh token dicabut → sesi berakhir saat refresh
  berikutnya, paling lama ±15 menit). Jika suatu saat perlu "logout semua perangkat seketika" atau
  sesi yang terlihat di server, ganti ke session store (Redis) tanpa mengubah kode klien.
- Endpoint BFF:
  - `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `PUT /api/auth/password`
    → `src/features/auth/server/handlers.js`.
  - `/api/v1/<path>` → proxy generik ke Go `/api/v1/<path>` (`src/server/bff/proxy-handler.js`).
    Prinsipnya **default deny**: hanya segmen pertama yang terdaftar di
    `src/server/bff/proxy-allowlist.js` yang diteruskan. Saat ini daftarnya kosong; tambahkan
    segmen (mis. `sites`) ketika modul baru dibuat. `auth` tidak pernah diproksikan.
- Kode server berada di `src/server/` (generik) dan `src/features/auth/server/` (khusus auth).
  Semua file server diberi `import 'server-only'`, jadi build gagal jika file itu terimpor ke
  komponen klien.

## D1. CSP dengan nonce di `src/proxy.js`, semua halaman dirender dinamis

Next.js menyisipkan script inline (payload RSC). Tanpa `'unsafe-inline'`, satu-satunya cara yang
didukung adalah nonce per request. Next 16 memakai `proxy.js` (pengganti `middleware.js`).

- `proxy.js` membuat nonce dan memasang `Content-Security-Policy`. Header statis lain
  (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, HSTS di
  production) dipasang lewat `headers()` di `next.config.mjs`.
- `proxy.js` juga melakukan **cek optimistis**: halaman terlindungi yang diminta tanpa cookie sesi
  langsung di-redirect ke `/login?next=…` sebelum HTML dikirim. Cek yang sesungguhnya (dekripsi +
  Go) tetap terjadi di BFF lewat `<AuthGate>`.
- Nonce butuh render dinamis, jadi root layout memanggil `await connection()`. Akibatnya
  `cacheComponents` dan `partialPrefetching` (default dari `create-next-app`) **dimatikan**.
  Keduanya juga tidak cocok dengan route handler Serwist (lihat D3).
- `style-src` memakai `'unsafe-inline'` karena Radix memakai atribut `style` dan sonner
  menyisipkan `<style>` saat runtime. Risiko injeksi CSS jauh lebih kecil daripada injeksi script.
- `upgrade-insecure-requests` tidak dipakai; HSTS sudah menangani HTTPS di production.

## D2. Klien browser (ky 2)

- ky 2 mengganti `prefixUrl` menjadi `prefix`. Klien memakai `prefix: '/api'` dan
  `credentials: 'same-origin'`.
- Tidak ada header `Authorization` dan tidak ada logika refresh di browser. Respons 401 dari BFF
  berarti sesi sudah habis: state lokal dibersihkan lalu user diarahkan ke `/login`.
- Setiap request yang mengubah data (POST/PUT/PATCH/DELETE) membawa header `X-SafeOps-CSRF: 1`.
- Retry otomatis hanya untuk GET (sekali).

## D3. Serwist: `@serwist/turbopack`, bukan `@serwist/next`

`@serwist/next` adalah plugin webpack, sedangkan Next 16 membangun dengan Turbopack secara
default. `@serwist/turbopack` (dari tim yang sama) membangun service worker lewat route handler
`app/serwist/[path]/route.js` dan esbuild. Dependensi tambahan: `serwist` dan `esbuild`.

- SW dilayani di `/serwist/sw.js` dengan `Service-Worker-Allowed: /` (scope `/`).
- Precache hanya aset statis (`.next/static/**`: JS, CSS, font, gambar), ikon, dan halaman
  `/offline`. `/api/` selalu `NetworkOnly`. Halaman HTML tidak di-cache karena berisi nonce CSP.
- SW **dimatikan di development**.
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

| Variabel                 | Kapan wajib | Catatan                                    |
| ------------------------ | ----------- | ------------------------------------------ |
| `API_ORIGIN`             | Selalu      | Alamat Go untuk BFF, bisa alamat internal. |
| `SESSION_SECRET`         | Selalu      | Minimal 32 karakter acak. Rahasia.         |
| `GO_REFRESH_COOKIE_NAME` | Opsional    | Default `refresh_token`.                   |

Tidak ada variabel rahasia yang memakai prefix `NEXT_PUBLIC_`. Mengganti `SESSION_SECRET` membuat
semua user ter-logout (cookie lama tidak bisa didekripsi). Rotasi kunci tanpa logout massal bisa
ditambahkan nanti (mendukung dua kunci sekaligus).

## D8. Refresh token di BFF: single-flight + masa tenggang

Go merotasi refresh token di setiap refresh dan menganggap pemakaian ulang token lama sebagai
pencurian (FR-10 → semua sesi dicabut). Di BFF (`src/server/go/session-tokens.js`):

1. **Refresh proaktif**: jika access token akan habis dalam < 30 detik, BFF me-refresh lebih dulu.
   Jika Go tetap menjawab 401, BFF me-refresh sekali lalu mengulang request (body di-buffer).
2. **Single-flight**: request paralel dengan refresh token yang sama berbagi satu panggilan
   `POST /auth/refresh`.
3. **Masa tenggang 30 detik**: hasil refresh diingat. Request yang datang belakangan dengan cookie
   lama (dikirim browser sebelum menerima cookie baru) memakai sesi baru, **tanpa** menyerahkan
   refresh token lama ke Go.

Ketiganya diuji (unit dan E2E), termasuk uji mutasi: menonaktifkan masa tenggang membuat test gagal.

## D9. BFF lebih dari satu instance

Single-flight dan masa tenggang berlaku **per proses Node.js**. Jika Next.js dijalankan di
beberapa instance, gunakan sticky session di load balancer, atau minta tim Go menyediakan masa
tenggang singkat untuk refresh token yang baru dirotasi (lihat ASSUMPTIONS A2). Dengan BFF,
koordinasi antar-tab browser tidak lagi diperlukan karena refresh tidak terjadi di browser.

## D10. Tanpa mock API (keputusan user)

Backend Go sudah tersedia di `http://103.150.226.7:8082`, jadi semua mock (mode dev, mock Go,
MSW) **dihapus**, termasuk dari test. Konsekuensinya:

- Unit test hanya menguji logika murni: validasi form, permission, navigasi, tanggal, FileField,
  enkripsi cookie sesi, dan parsing respons token Go.
- E2E hanya menguji perilaku tanpa login: layout dan aksesibilitas halaman login, redirect tanpa
  sesi, cookie palsu, CSRF, dan header keamanan. Permintaan ini dijawab oleh BFF sendiri dan
  tidak pernah mengubah data di Go.
- Yang **tidak lagi teruji otomatis**: alur login → ganti password, refresh token single-flight
  dan masa tenggang (FR-10), proxy BFF, serta form user/vendor end-to-end. Semua itu perlu dicek
  manual ke backend, atau diuji lagi dengan akun test khusus di environment staging bila nanti
  tersedia.

## D11. Halaman login memeriksa sesi tanpa menghalangi form

`/login` memanggil `GET /api/auth/me` (mode probe). Jika sesi valid, user diarahkan ke `/`. Form
tetap bisa dipakai selama proses ini, supaya tidak ada layar kosong di sinyal lemah.

## D12. Pesan error login: `Alert` di atas tombol

Mockup XS menampilkan error sebagai teks merah di bawah field password, dengan sisa percobaan.
Spesifikasi meminta `Alert` dengan `role="alert"` di atas tombol dan tanpa sisa percobaan. Yang
diikuti adalah spesifikasi; posisinya tetap tepat di bawah field password.

## D13. Lapisan keamanan BFF

| Ancaman                    | Penanganan                                                                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pencurian token lewat XSS  | Token Go tidak pernah di browser; cookie `HttpOnly`; CSP ketat dengan nonce.                                                                                                                   |
| CSRF                       | Cookie `SameSite=Lax`; cek `Origin` = host; tolak `Sec-Fetch-Site: cross-site`; header `X-SafeOps-CSRF` wajib.                                                                                 |
| Cookie dipalsukan/diubah   | AES-256-GCM (terautentikasi): cookie yang diubah ditolak lalu dihapus.                                                                                                                         |
| Proxy disalahgunakan       | Allowlist (default deny), validasi segmen path (tanpa `..`), `auth/*` diblokir, cookie/Authorization dari browser tidak diteruskan, `Set-Cookie` dan header Go lain dibuang, batas body 11 MB. |
| Bocornya detail error      | Error tak terduga dipetakan ke pesan generik; log tidak memuat body/token.                                                                                                                     |
| Rate limit Go per IP rusak | `X-Forwarded-For`, `X-Real-IP` dan `User-Agent` diteruskan ke Go.                                                                                                                              |
| Cache data sensitif        | Semua respons BFF `Cache-Control: no-store`; SW tidak meng-cache `/api/`.                                                                                                                      |
| Otorisasi                  | Tetap di Go untuk setiap request (role, scope site/vendor).                                                                                                                                    |

## D14. Upload dan file dari object storage

- Upload (inventory, SOP) lewat proxy BFF yang sama, sebagai multipart. Batas body proxy 11 MiB
  (PDF 10 MiB + amplop multipart); batas per file divalidasi di browser (`FileField`) dan di Go.
  Timeout upload 60 detik (browser → BFF dan BFF → Go); request lain tetap 15 detik.
- Foto inventory adalah signed URL dari MinIO (origin lain). CSP `img-src` mengizinkan
  `FILES_ORIGIN` jika di-set, atau host `API_ORIGIN` di port mana pun (`http://host:*`) sebagai
  default. Foto memakai `<img>` biasa (bukan `next/image`) karena URL bertanda tangan berubah
  setiap request.
- SOP: tombol **"Buka"** saja, tanpa pratinjau `<iframe>`. Pratinjau perlu `frame-src` ke origin
  MinIO dan header MinIO yang mengizinkan framing; belum bisa dipastikan, jadi tidak dibuat.
  Tab baru dibuka saat klik (agar tidak diblokir popup blocker), `opener` diputus, lalu diarahkan
  ke signed URL.

## D15. Panel detail 2XL (Review laporan, Laporan inventory)

- Layout list + panel murni CSS (`ListWithPanel`, grid dari `2xl`). Di bawah 1536px panel tidak
  dirender terlihat dan baris membuka halaman detail.
- Lebar layar dibaca saat klik (`matchMedia` di `useDetailPanel`), bukan saat render, sehingga
  tidak ada hydration mismatch dan aturan "tanpa `useMediaQuery` untuk layout" tetap dipenuhi.
- Laporan yang dipilih disimpan di URL (`?selected=<id>`). Setelah review laporan task di panel,
  laporan berikutnya otomatis dipilih; di halaman detail (mobile), user kembali ke list. Laporan
  inventory tetap di detail karena alurnya bertahap (Baru → Diperiksa → Disetujui → Selesai).
