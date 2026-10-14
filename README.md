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

### Dengan mock Go (tanpa backend)

Di `.env.local`:

```
NEXT_PUBLIC_API_MOCKING=enabled
```

Lalu:

```bash
pnpm dev
```

`pnpm dev` otomatis menjalankan **mock Go** di `http://127.0.0.1:4010`, dan BFF memanggilnya
persis seperti memanggil Go sungguhan. `API_ORIGIN` diabaikan dan `SESSION_SECRET` boleh kosong
di mode ini. Akun mock:

| Username         | Password     | Perilaku                     |
| ---------------- | ------------ | ---------------------------- |
| `budi.santoso`   | `rahasia123` | Login normal                 |
| `agus.pratama`   | `Kp7mw2Rq`   | `must_change_password: true` |
| `sari.wulandari` | `Sementara1` | `must_change_password: true` |
| `dewi.lestari`   | apa saja     | Selalu 423 (akun terkunci)   |
| `rate.limited`   | apa saja     | Selalu 429                   |
| `user.nonaktif`  | apa saja     | Selalu 403 (akun nonaktif)   |
| `network.error`  | apa saja     | Go tidak bisa dihubungi      |
| `server.error`   | apa saja     | 500                          |

Sesi bertahan saat reload. Data mock (mis. password yang diganti) kembali ke awal saat
`pnpm dev` di-restart.

### Dengan backend Go

Di `.env.local`:

```
NEXT_PUBLIC_API_MOCKING=disabled
API_ORIGIN=http://localhost:8080
SESSION_SECRET=<hasil openssl rand -base64 48>
```

Lalu `pnpm dev`. Dev server dan build menolak start jika `API_ORIGIN` atau `SESSION_SECRET`
tidak ada.

### Production

```bash
pnpm build
```

```bash
pnpm start
```

Set `API_ORIGIN` (alamat Go, boleh alamat internal) dan `SESSION_SECRET` di environment server.
`NEXT_PUBLIC_API_MOCKING=enabled` membuat build gagal. Jika Next.js berjalan di beberapa instance,
lihat `docs/DECISIONS.md` D9.

## Skrip

| Perintah        | Kegunaan                                               |
| --------------- | ------------------------------------------------------ |
| `pnpm dev`      | Dev server (+ mock Go jika mocking aktif)              |
| `pnpm build`    | Build production (gagal jika env tidak valid)          |
| `pnpm start`    | Menjalankan hasil build                                |
| `pnpm lint`     | ESLint, gagal jika ada warning                         |
| `pnpm format`   | Prettier (dengan pengurutan class Tailwind)            |
| `pnpm test`     | Unit, komponen & BFF (Vitest + Testing Library + MSW)  |
| `pnpm test:e2e` | E2E Playwright: browser → `next start` (BFF) → mock Go |
| `pnpm mock:go`  | Menjalankan mock Go sendiri (port 4010)                |

Sebelum E2E pertama kali: `pnpm exec playwright install chromium`.
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
├─ mocks/                   # Mock Go (go-backend.js) + server HTTP + handler MSW
├─ instrumentation.js       # Menjalankan mock Go saat `pnpm dev` dengan mocking aktif
└─ proxy.js                 # CSP dengan nonce + redirect awal jika belum login
tests/unit/                 # Setup Vitest, jembatan BFF (msw.js), util
tests/e2e/                  # Playwright (+ support/mock-go.js)
scripts/                    # mock-go-server.mjs, generate-icons.mjs
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
