# Laporan Uji Keamanan (Fase 8)

Tanggal: 14 Oktober 2026. Cakupan: frontend Next.js dan BFF (`src/proxy.js`, `src/server/**`,
`src/features/auth/server/**`, kode browser), konfigurasi deploy (`Dockerfile`,
`docker-compose.yml`, `Jenkinsfile`). Backend Go **tidak** diuji (di luar repo ini).

Metode:

- Review kode seluruh jalur data: browser → BFF → Go.
- Uji serangan nyata terhadap **build production lokal** (`next build`, server standalone) dengan
  backend Go tiruan yang mencatat apa yang diteruskan BFF. Skrip uji tidak disimpan di repo; hasil
  per cek ada di bawah.
- `pnpm audit`, pemindaian bundle browser (rahasia, source map), dan E2E Playwright.

## Ringkasan

| #   | Temuan                                                                                     | Tingkat    | Status                                             |
| --- | ------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------- |
| S1  | Deploy tanpa HTTPS: password dan cookie sesi lewat jaringan tanpa enkripsi                 | **Tinggi** | **Terbuka** — perlu TLS di infrastruktur           |
| S2  | IP klien bisa dipalsukan lewat `X-Forwarded-For` (rate limit & IP di audit log Go)         | Sedang     | Dikurangi di kode; tuntas setelah reverse proxy    |
| S3  | DoS memori tanpa login: proxy membaca seluruh body sebelum cek sesi, tanpa batas streaming | Sedang     | **Diperbaiki**                                     |
| S4  | Respons error HTML dari Go/gateway tampil di origin aplikasi                               | Rendah     | **Diperbaiki**                                     |
| S5  | Cookie `__Host-` palsu tidak dihapus saat diakses lewat HTTP                               | Rendah     | **Diperbaiki**                                     |
| S6  | `sw.js.map` (source map service worker) bisa diunduh publik                                | Rendah     | **Diperbaiki**                                     |
| S7  | Kode skema env server (nama variabel, bukan nilai) ikut ke bundle browser                  | Info       | **Diperbaiki**                                     |
| S8  | `pnpm audit`: `braces` (high) lewat CLI `shadcn`                                           | Rendah     | Terbuka — hanya dev, tidak ada di image production |
| S9  | Perlindungan brute force hanya di Go                                                       | Info       | Catatan untuk tim backend                          |

## Detail

### S1 — Deploy tanpa HTTPS (Tinggi, terbuka)

Aplikasi berjalan di `http://103.150.226.7:3001`. Siapa pun di jaringan yang sama (Wi-Fi kantor,
ISP) bisa membaca password saat login dan mencuri cookie sesi. Di HTTP, cookie tidak bisa diberi
`Secure` dan header HSTS diabaikan browser. **Kode sudah siap**: di belakang TLS (langsung atau
lewat proxy dengan `X-Forwarded-Proto: https`) cookie otomatis menjadi `__Host-safeops_session`

- `Secure` (cek A5 di bawah).

**Perbaikan:** pasang reverse proxy TLS (nginx/Caddy/Traefik) di depan container, arahkan domain,
dan tutup port 3001 dari luar. Contoh nginx:

```nginx
server {
  listen 443 ssl http2;
  server_name safeops.example.co.id;
  ssl_certificate     /etc/ssl/safeops/fullchain.pem;
  ssl_certificate_key /etc/ssl/safeops/privkey.pem;
  client_max_body_size 12m;            # SOP PDF 10 MiB + amplop multipart

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $remote_addr;   # TIMPA, jangan tambahkan (lihat S2)
    proxy_set_header X-Real-IP $remote_addr;
  }
}
server { listen 80; return 301 https://$host$request_uri; }
```

### S2 — Pemalsuan IP klien (Sedang)

BFF meneruskan `X-Forwarded-For` / `X-Real-IP` ke Go supaya rate limit dan audit log memakai IP
user. Tanpa reverse proxy, nilai itu dikirim langsung oleh klien sehingga bisa diisi bebas
(terbukti: Go menerima `6.6.6.6`). Dampak: rate limit per IP bisa dielakkan dan IP di audit log
tidak bisa dipercaya.

- **Di kode (diperbaiki):** hanya entri **paling kanan** `X-Forwarded-For` yang diteruskan
  (`getForwardedHeaders`, ada unit test). Di belakang proxy yang menambahkan IP, nilai palsu dari
  klien dibuang (terbukti: `6.6.6.6, 10.0.0.9` → Go menerima `10.0.0.9`).
- **Tuntas setelah:** reverse proxy S1 menimpa header tersebut, dan Go (Gin) hanya mempercayai
  header dari IP BFF (`router.SetTrustedProxies([...])`).

### S3 — DoS memori tanpa login (Sedang, diperbaiki)

Sebelumnya proxy `/api/v1/*` memanggil `request.arrayBuffer()` **sebelum** memeriksa sesi, dan
batas 11 MiB baru dicek setelah seluruh body terbaca. Untuk upload chunked (tanpa
`Content-Length`) tidak ada batas sama sekali, dan handler login memakai `request.json()` tanpa
batas. Klien anonim bisa mengirim body sangat besar berulang kali sampai memori server habis.

Perbaikan: `src/server/http/body.js` membaca body secara streaming dan berhenti begitu melewati
batas (11 MiB untuk proxy, 16 KiB untuk login/ganti password); proxy menjawab 401 **sebelum**
membaca body jika tidak ada cookie sesi. Terbukti: upload anonim 50 MB ditolak setelah ±0,4 MB
dalam 13 ms; upload 30 MB dengan sesi dihentikan di batas 11 MiB (413).

### S4 — Error HTML dari upstream (Rendah, diperbaiki)

Proxy meneruskan `Content-Type` dari Go. Bila Go/gateway mengembalikan halaman HTML (mis. error
dengan input yang dipantulkan) dan URL API itu dibuka langsung, HTML tersebut tampil di origin
aplikasi. Sekarang semua respons BFF membawa
`Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; sandbox` — script tidak
bisa berjalan. `fetch()` dari aplikasi tidak terpengaruh.

### S5 — Cookie `__Host-` tidak terhapus lewat HTTP (Rendah, diperbaiki)

Sejak nama cookie dipilih per protokol (agar login via HTTP berfungsi), request HTTP hanya
menghapus cookie `safeops_session`. Sekarang `buildClearedSessionCookies` menghapus setiap cookie
sesi yang terkirim, termasuk `__Host-` (dengan `Secure`, sesuai aturan browser). Ada unit test
dan E2E (`a forged session cookie is rejected and removed`).

### S6 — Source map service worker publik (Rendah, diperbaiki)

`/serwist/sw.js.map` dihasilkan secara default. Isinya hanya kode service worker (tanpa rahasia),
tetapi tidak perlu publik. Dimatikan lewat `esbuildOptions: { sourcemap: false }`; sekarang 404.

### S7 — Skema env server di bundle browser (Info, diperbaiki)

`config/env.js` diimpor `lib/date.js` (untuk zona waktu), sehingga kode validasi env server ikut
ke browser — hanya nama variabel dan pesan error, **bukan nilainya**. Env publik dipindah ke
`config/client-env.js`, dan `config/env.js` sekarang `import 'server-only'` (build gagal bila
kode browser mengimpornya).

### S8 — Dependency (Rendah, terbuka)

`pnpm audit` menemukan `braces <= 3.0.3` (GHSA-vfj7-8cjw-p6xm, DoS lewat pola glob) di jalur
`shadcn → fast-glob → micromatch → braces`. `shadcn` hanya CLI + file CSS saat build; image
production (`.next/standalone`) hanya berisi `next`, `react`, `react-dom`. Saran: pindahkan
`shadcn` ke `devDependencies` dan perbarui saat versi patch tersedia.

### S9 — Brute force (Info)

BFF tidak membatasi percobaan login; perlindungan ada di Go (kunci akun setelah 5 kali gagal,
15 menit, dan rate limit). Pastikan rate limit Go aktif dan memakai IP yang benar (S2).

## Hasil uji yang lolos

| Cek                                                                                                                                                           | Hasil       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Token Go (access/refresh) tidak pernah sampai ke browser (body & cookie)                                                                                      | Lolos       |
| Cookie sesi terenkripsi AES-256-GCM, `HttpOnly`, `SameSite=Lax`; `__Host-` + `Secure` di HTTPS                                                                | Lolos       |
| CSRF: tanpa `Origin`, origin lain, tanpa header `X-SafeOps-CSRF`, `Sec-Fetch-Site: cross-site` → 403                                                          | Lolos (4/4) |
| Proxy: `auth/*`, segmen di luar allowlist, `..%2f`, `%2F` → 404; cookie & `Authorization` browser tidak diteruskan                                            | Lolos       |
| Header Go internal tidak diteruskan; pesan error 5xx generik (detail server tidak ditampilkan)                                                                | Lolos       |
| CSP dengan nonce + `strict-dynamic`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, HSTS (production), tanpa `X-Powered-By` | Lolos       |
| Halaman terlindungi tanpa sesi → redirect `/login?next=…`; `next` disanitasi (anti open redirect, ada unit test)                                              | Lolos       |
| Tidak ada `dangerouslySetInnerHTML`, `eval`, token di `localStorage`/`sessionStorage` (dicegah ESLint)                                                        | Lolos       |
| Signed URL (foto, PDF) hanya `http(s)`, dibuka di tab baru tanpa `opener`                                                                                     | Lolos       |
| Bundle browser tanpa nilai rahasia/alamat backend, tanpa source map aplikasi                                                                                  | Lolos       |
| Server menolak start tanpa `API_ORIGIN`                                                                                                                       | Lolos       |

Catatan: `/api/v1/%2e%2e/auth/me` dinormalkan Next.js menjadi `/api/auth/me` (endpoint BFF yang
memang publik untuk user login), bukan jalan pintas ke Go.
