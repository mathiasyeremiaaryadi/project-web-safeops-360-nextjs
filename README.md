# SafeOps 360 — Web

Frontend SafeOps 360: aplikasi web + PWA untuk operasional cleaning service dan safety di PLTU.
Fase ini berisi fondasi proyek, halaman **Login**, dan halaman **Ganti Password Wajib**.

## Arsitektur (BFF)

```
Browser (React) ──/api/*──▶ Next.js server (BFF) ──/api/v1/*──▶ Go (Gin) + PostgreSQL
                 cookie sesi HttpOnly              Bearer token Go
                 (terenkripsi)
```

- Browser hanya memanggil Next.js di origin yang sama. Next.js (Route Handlers) memanggil Go dari
  sisi server.
- Token Go (access + refresh) **tidak pernah sampai ke browser**. Token disimpan di cookie sesi
  `HttpOnly` yang dienkripsi AES-256-GCM. Refresh token juga dilakukan di server.
- Detail dan alasannya: `docs/DECISIONS.md` (D0, D8, D13). Kontrak dengan Go:
  `docs/ASSUMPTIONS.md`.

## Prasyarat

- Node.js ≥ 22
- pnpm 11 (`corepack enable`)

## Instalasi

```bash
pnpm install
cp .env.example .env.local
```

## Menjalankan

Di `.env.local`:

```
API_ORIGIN=http://103.150.226.7:8082
SESSION_SECRET=<hasil openssl rand -base64 48>
```

Lalu:

```bash
pnpm dev
```

Aplikasi selalu memakai backend Go sungguhan; tidak ada mode mock. Server menolak start jika
`API_ORIGIN` tidak ada. `SESSION_SECRET` opsional (tanpa itu, semua user keluar setiap restart).

Opsional: `FILES_ORIGIN` = origin signed URL file (MinIO), misalnya `http://103.150.226.7:9000`,
agar foto inventory lolos CSP. Default: host `API_ORIGIN` di port mana pun.

### Production

```bash
pnpm build
```

```bash
pnpm start
```

Set `API_ORIGIN` (alamat Go, boleh alamat internal) dan `SESSION_SECRET` di environment server.
Jika Next.js berjalan di beberapa instance,
lihat `docs/DECISIONS.md` D9.

## Skrip

| Perintah        | Kegunaan                                                          |
| --------------- | ----------------------------------------------------------------- |
| `pnpm dev`      | Dev server                                                        |
| `pnpm build`    | Build production                                                  |
| `pnpm start`    | Menjalankan hasil build (server menolak start tanpa `API_ORIGIN`) |
| `pnpm lint`     | ESLint, gagal jika ada warning                                    |
| `pnpm format`   | Prettier (dengan pengurutan class Tailwind)                       |
| `pnpm test`     | Unit test logika murni (Vitest), tanpa jaringan                   |
| `pnpm test:e2e` | E2E Playwright pada build production (API tiruan di browser)      |

Sebelum E2E pertama kali: `pnpm exec playwright install chromium`.

E2E menguji semua halaman dan alur utama Super Admin (beranda, user, vendor, review laporan,
laporan inventory, inventory, SOP, pipeline, audit log), responsif 360–1536px, dan aksesibilitas
(axe). Halaman setelah login memakai **API tiruan di browser** (`tests/e2e/support/mock-api.js`),
sehingga test tidak pernah membaca atau mengubah data di backend Go. Screenshot disimpan di
`tests/e2e/__screenshots__/`. Pengukuran performa: `docs/PERFORMANCE.md`.

Husky + lint-staged menjalankan ESLint dan Prettier pada file yang di-stage setiap commit.

## Struktur folder

```
src/
├─ app/                  Routing saja (page.jsx merangkai komponen fitur) + Route Handler BFF
├─ features/<fitur>/     api/ (keys, schemas, queries, mutations), components/, lib/, index.js
├─ components/ui/        Primitif shadcn
├─ components/shared/    Komponen lintas fitur (QueryList, FormDialog, LookupFilter, …)
├─ components/layout/    Shell: sidebar, rail, bottom nav, header
├─ hooks/                useListQuery/useSaveMutation, useListParams, useOptionLabels, …
├─ lib/                  Klien API, schema toleran, tanggal, pencarian, hak akses
├─ server/               BFF (server-only): sesi, klien Go, proxy, CSRF, batas body
├─ config/               env.js (server-only), client-env.js (publik)
└─ proxy.js              CSP per request + redirect awal jika belum login
tests/e2e/               Playwright (+ support/: API tiruan & data uji)
tests/perf/              Pengukuran performa
docs/                    ARCHITECTURE, ASSUMPTIONS, DECISIONS, SECURITY, PERFORMANCE
```

**Developer baru: mulai dari [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — alur data,
anatomi satu fitur, katalog komponen bersama, dan resep menambah halaman.

Aturan: satu feature tidak boleh mengimpor isi feature lain kecuali lewat `index.js`-nya
(dicek ESLint). File server memakai `import 'server-only'`.

## Keamanan (ringkas)

- Token Go hanya di server; browser memegang satu cookie sesi `HttpOnly` terenkripsi
  (`__Host-` + `Secure` di production, `SameSite=Lax`).
- Refresh di BFF: proaktif, single-flight, dengan masa tenggang, sehingga refresh token yang
  sudah dirotasi tidak pernah dipakai ulang (FR-10).
- CSRF: cek `Origin`, `Sec-Fetch-Site`, dan header `X-SafeOps-CSRF` untuk request yang mengubah
  data.
- Proxy `/api/v1/*` default deny (allowlist), tanpa meneruskan cookie browser maupun `Set-Cookie`
  dari Go.
- CSP ketat dengan nonce, `frame-ancestors 'none'`, HSTS di production.
- Parameter `?next=` divalidasi untuk mencegah open redirect.
- ESLint melarang `console.log`, `sessionStorage`, `dangerouslySetInnerHTML`, axios, moment,
  dan prop-types.
- Body request dibatasi (proxy 11 MiB, login 16 KiB) dan dibaca streaming; request tanpa sesi
  ditolak sebelum body dibaca.
- Hasil uji keamanan lengkap dan hal yang masih perlu dikerjakan di infrastruktur (**HTTPS**,
  reverse proxy): [`docs/SECURITY.md`](docs/SECURITY.md).

## PWA

- Manifest: `src/app/manifest.js`. Ikon di `public/icons/` adalah **placeholder** yang dibuat dari
  `public/icons/icon.svg` dengan `node scripts/generate-icons.mjs`. Ganti dengan aset resmi.
- Service worker hanya aktif di build production. Lihat `docs/DECISIONS.md` (D3).

## Status modul (Super Admin)

Selesai: login & ganti password, beranda (rekap harian), review laporan task, laporan inventory,
site & vendor & master task, pipeline & task, inventory, SOP, manajemen user, audit log, profil &
sesi. Catatan safety menunggu dukungan API (filter kategori temuan) — lihat
`docs/ASSUMPTIONS.md` (G1). Role Admin (Admin site) dan Admin vendor (Admin Worker) memakai
halaman yang sama dengan menu, hak akses, dan konteks site/vendor masing-masing. Halaman Worker
belum dibuat.
