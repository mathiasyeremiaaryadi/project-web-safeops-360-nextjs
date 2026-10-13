# SafeOps 360 — Web

Frontend SafeOps 360: aplikasi web + PWA untuk operasional cleaning service dan safety di PLTU.
Fase ini berisi fondasi proyek, halaman **Login**, dan halaman **Ganti Password Wajib**.

Backend: Go (Gin) + PostgreSQL, REST di `/api/v1`, diakses dari **origin yang sama**.

## Prasyarat

- Node.js ≥ 22
- pnpm 11 (`corepack enable`)

## Instalasi

```bash
pnpm install
cp .env.example .env.local
```

## Menjalankan

### Dengan mock API (tanpa backend)

Set `NEXT_PUBLIC_API_MOCKING=enabled` di `.env.local`, lalu:

```bash
pnpm dev
```

MSW berjalan di browser dengan akun berikut:

| Username        | Password     | Perilaku                     |
| --------------- | ------------ | ---------------------------- |
| `budi.santoso`  | `rahasia123` | Login normal                 |
| `agus.pratama`  | `Kp7mw2Rq`   | `must_change_password: true` |
| `dewi.lestari`  | apa saja     | Selalu 423 (akun terkunci)   |
| `rate.limited`  | apa saja     | Selalu 429                   |
| `user.nonaktif` | apa saja     | Selalu 403 (akun nonaktif)   |
| `network.error` | apa saja     | Gagal jaringan               |
| `server.error`  | apa saja     | 500                          |

Catatan: cookie HttpOnly tidak bisa ditiru dari JavaScript, jadi mock menyimpan sesi di memori.
**Reload halaman di mode mock mengakhiri sesi**, dan perubahan password kembali ke awal.

### Dengan backend Go

Set `NEXT_PUBLIC_API_MOCKING=disabled` dan `API_ORIGIN` (mis. `http://localhost:8080`) di
`.env.local`, lalu `pnpm dev`. Next.js meneruskan `/api/v1/*` ke `API_ORIGIN` lewat `rewrites`
(**hanya** di development). Di production, reverse proxy harus melayani `/api/v1` di origin yang
sama dengan frontend.

Dev server menolak start jika `API_ORIGIN` tidak ada saat mock nonaktif.

## Skrip

| Perintah        | Kegunaan                                                          |
| --------------- | ----------------------------------------------------------------- |
| `pnpm dev`      | Dev server                                                        |
| `pnpm build`    | Build production (gagal jika env tidak valid)                     |
| `pnpm start`    | Menjalankan hasil build                                           |
| `pnpm lint`     | ESLint, gagal jika ada warning                                    |
| `pnpm format`   | Prettier (dengan pengurutan class Tailwind)                       |
| `pnpm test`     | Unit & komponen (Vitest + Testing Library + MSW)                  |
| `pnpm test:e2e` | E2E Playwright (build + start otomatis, API di-mock `page.route`) |

Sebelum E2E pertama kali: `pnpm exec playwright install chromium`.
Screenshot responsif (360–1536px) disimpan di `tests/e2e/__screenshots__/`.

Husky + lint-staged menjalankan ESLint dan Prettier pada file yang di-stage setiap commit.

## Struktur folder

```
src/
├─ app/                     # Routing & komposisi saja (tanpa logika bisnis)
│  ├─ (auth)/login/         # /login
│  ├─ (protected)/          # Dijaga <AuthGate>: / (placeholder), /change-password
│  ├─ offline/              # Fallback offline service worker
│  ├─ serwist/[path]/       # Build & serve service worker (/serwist/sw.js)
│  ├─ manifest.js, sw.js, layout.jsx, globals.css (design tokens), not-found.jsx
├─ features/auth/           # api/ (schema Zod, fungsi API, query keys), components/, hooks/,
│                           # stores/ (Zustand, memori saja), lib/ (pesan error, validasi ?next=)
├─ components/ui/           # Primitif shadcn
├─ components/shared/       # AppLogo, AppTopBar, FormField, PwaInstallPrompt, …
├─ hooks/                   # Hook lintas fitur (use-pwa-install)
├─ lib/                     # api/client.js (ky + refresh single-flight), errors, query-client,
│                           # constants (ROLES, ROUTES, ERROR_CODES)
├─ config/env.js            # Validasi env dengan Zod
├─ providers/               # QueryClient, Toaster, Serwist, MSW (dev)
├─ mocks/                   # Handler MSW untuk dev & test
└─ proxy.js                 # CSP dengan nonce per request
tests/unit/                 # Setup Vitest & util
tests/e2e/                  # Playwright (+ support/mock-api.js)
docs/                       # ASSUMPTIONS.md (kontrak API), DECISIONS.md
```

Aturan: satu feature tidak boleh mengimpor feature lain (dicek ESLint). Kode bersama ditaruh di
`components/` atau `lib/`.

## Keamanan (ringkas)

- Access token hanya di memori (Zustand tanpa `persist`). Refresh token berupa cookie HttpOnly
  yang tidak pernah disentuh JavaScript.
- Refresh token **single-flight**: 401 paralel hanya memicu satu `POST /auth/refresh`.
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
