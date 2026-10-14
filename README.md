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

Aplikasi selalu memakai backend Go sungguhan; tidak ada mode mock. Dev server dan build menolak
start jika `API_ORIGIN` atau `SESSION_SECRET` tidak ada.

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

| Perintah        | Kegunaan                                            |
| --------------- | --------------------------------------------------- |
| `pnpm dev`      | Dev server                                          |
| `pnpm build`    | Build production (gagal jika env tidak valid)       |
| `pnpm start`    | Menjalankan hasil build                             |
| `pnpm lint`     | ESLint, gagal jika ada warning                      |
| `pnpm format`   | Prettier (dengan pengurutan class Tailwind)         |
| `pnpm test`     | Unit test logika murni (Vitest), tanpa jaringan     |
| `pnpm test:e2e` | E2E Playwright tanpa login (lihat catatan di bawah) |

Sebelum E2E pertama kali: `pnpm exec playwright install chromium`.
Tidak ada mock API. Unit test hanya menguji logika yang tidak butuh jaringan (validasi, permission,
navigasi, cookie sesi, parsing token), dan E2E hanya menguji perilaku tanpa login (halaman login,
redirect, CSRF, header keamanan), sehingga test tidak pernah membaca atau mengubah data di backend.
Screenshot responsif (360–1536px) disimpan di `tests/e2e/__screenshots__/`.

Husky + lint-staged menjalankan ESLint dan Prettier pada file yang di-stage setiap commit.

## Struktur folder

```
src/
├─ app/                     # Routing & komposisi saja (tanpa logika bisnis)
│  ├─ (auth)/login/         # /login
│  ├─ (protected)/          # Dijaga <AuthGate>: / (placeholder), /change-password
│  ├─ api/auth/*/route.js   # BFF: login, me, logout, password
│  ├─ api/v1/[...path]/     # BFF: proxy generik ke Go (allowlist)
│  ├─ offline/              # Fallback offline service worker
│  ├─ serwist/[path]/       # Build & serve service worker (/serwist/sw.js)
│  ├─ manifest.js, sw.js, layout.jsx, globals.css (design tokens), not-found.jsx
├─ features/auth/
│  ├─ api/                  # Schema Zod, fungsi pemanggil BFF, query keys
│  ├─ components/, hooks/   # UI & alur login / ganti password / AuthGate
│  ├─ stores/               # Zustand: profil user di memori (tanpa token)
│  ├─ lib/                  # Pesan error, validasi ?next=
│  └─ server/               # Implementasi Route Handler auth (server-only)
├─ server/                  # Kode server BFF (server-only)
│  ├─ session/              # Cookie sesi terenkripsi
│  ├─ go/                   # Klien Go, token & refresh single-flight
│  ├─ bff/                  # withSession, CSRF, proxy generik + allowlist, helper respons
│  └─ http/                 # Parser/serializer cookie
├─ components/ui/           # Primitif shadcn
├─ components/shared/       # AppLogo, AppTopBar, FormField, PwaInstallPrompt, …
├─ hooks/                   # Hook lintas fitur (use-pwa-install)
├─ lib/                     # api/client.js (ky → BFF), errors, query-client, constants
├─ config/env.js            # Validasi env dengan Zod
├─ providers/               # QueryClient, Toaster, Serwist
└─ proxy.js                 # CSP dengan nonce + redirect awal jika belum login
tests/unit/                 # Setup Vitest & util
tests/e2e/                  # Playwright (tanpa login)
scripts/                    # generate-icons.mjs
docs/                       # ASSUMPTIONS.md (kontrak Go), DECISIONS.md
```

Aturan: satu feature tidak boleh mengimpor feature lain (dicek ESLint). Kode bersama ditaruh di
`components/`, `lib/`, atau `server/`. File server memakai `import 'server-only'`.

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

## PWA

- Manifest: `src/app/manifest.js`. Ikon di `public/icons/` adalah **placeholder** yang dibuat dari
  `public/icons/icon.svg` dengan `node scripts/generate-icons.mjs`. Ganti dengan aset resmi.
- Service worker hanya aktif di build production. Lihat `docs/DECISIONS.md` (D3).

## Belum dikerjakan (fase berikutnya)

Dashboard, manajemen user, audit log, profil & sesi, modul cleaning/safety/scoring.
