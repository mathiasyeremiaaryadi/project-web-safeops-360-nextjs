# Asumsi Kontrak API — perlu dikonfirmasi ke tim backend Go

Semua bentuk request/response di bawah ini **diasumsikan** oleh frontend. Sumber kebenaran di kode
ada di [`src/features/auth/api/schemas.js`](../src/features/auth/api/schemas.js). Mock MSW
(`src/mocks/handlers/auth.js`) dan mock Playwright (`tests/e2e/support/mock-api.js`) mengikuti
asumsi yang sama. Jika ada yang berbeda, cukup ubah schema dan mock, lalu jalankan ulang test.

Base path: `/api/v1`, origin sama dengan frontend (reverse proxy di production, rewrite Next.js di
development). Semua request memakai `credentials: 'include'`.

## A1. `POST /auth/login`

- Request: `{ "username": string, "password": string }`. Username sudah di-`trim()` dan
  di-`toLowerCase()` oleh frontend.
- Response 200: `{ "access_token": string, "token_type": "Bearer", "expires_in": number }`.
  `expires_in` dalam **detik** (±900).
- Refresh token dikirim sebagai cookie `HttpOnly; Secure; SameSite=Strict`. Frontend tidak pernah
  membaca atau menyimpannya.
  - **Perlu konfirmasi:** nama cookie dan `Path`-nya. Saran: `Path=/api/v1/auth` supaya cookie
    hanya ikut ke endpoint auth.
- Error:
  - 401 `AUTH_INVALID_CREDENTIALS` untuk username tidak ada **dan** password salah (pesan generik).
  - 423 `AUTH_ACCOUNT_LOCKED` setelah 5 kali gagal, berlaku 15 menit.
  - 429 `RATE_LIMITED`.
  - 403 `AUTH_ACCOUNT_INACTIVE` untuk user nonaktif. **Perlu konfirmasi:** status dan code ini.
- **Perlu konfirmasi:** apakah response gagal memuat sisa percobaan (mis. `remaining_attempts`).
  Mockup menampilkan "Sisa 3 percobaan…", tetapi sesuai PRD frontend **tidak** menampilkannya
  kecuali API mengirimnya secara eksplisit. Saat ini tidak ditampilkan.

## A2. `POST /auth/refresh`

- Tanpa body dan tanpa header `Authorization`. Refresh token dibaca dari cookie.
- Response 200: bentuk sama dengan login. Cookie refresh dirotasi (`Set-Cookie` baru).
- 401 jika cookie tidak ada, kedaluwarsa, atau dicabut.
- Pemakaian ulang refresh token lama dianggap pencurian (FR-10) dan mencabut semua sesi. Frontend
  menjamin **single-flight** (hanya satu refresh yang berjalan pada satu waktu per tab).
  - **Perlu konfirmasi:** apakah backend memberi grace period singkat untuk refresh paralel dari
    **beberapa tab**. Frontend belum mengoordinasikan refresh antar-tab (lihat DECISIONS D9).

## A3. `POST /auth/logout`

- Header `Authorization: Bearer <access_token>`, tanpa body.
- Response 204. Backend mencabut sesi saat ini dan menghapus cookie refresh (`Max-Age=0`).
- Frontend tetap membersihkan sesi lokal walaupun request gagal.

## A4. `GET /auth/me`

```json
{
  "id": "uuid",
  "username": "string",
  "full_name": "string | null",
  "roles": ["SUPER_ADMIN" | "ADMIN" | "ADMIN_WORKER" | "WORKER"],
  "must_change_password": true,
  "scopes": { "site_ids": ["uuid"], "vendor_ids": ["uuid"] }
}
```

- `roles` berupa **array**, walaupun user umumnya punya satu role. Role di luar 4 nilai di atas
  membuat validasi gagal (`INVALID_RESPONSE`). **Perlu konfirmasi.**
- `scopes` selalu ada (array kosong jika tidak ada).

## A5. `PUT /auth/password`

- Request: `{ "current_password": string, "new_password": string }`.
- Response **204** tanpa body.
- Sesuai FR-12, sukses mencabut **semua** refresh token user, termasuk sesi saat ini. Frontend
  langsung membersihkan sesi dan mengarahkan ke `/login`.
- Error:
  - 400 `AUTH_INVALID_CURRENT_PASSWORD` jika password saat ini salah → ditampilkan di field
    pertama sebagai "Password saat ini salah." **Perlu konfirmasi code ini.**
  - 400 dengan code lain (mis. `VALIDATION_ERROR`) → `error.message` dari server ditampilkan di
    bawah form. Artinya `message` harus **ramah pengguna dan berbahasa Indonesia**. **Perlu
    konfirmasi.**
  - 401 → frontend mencoba refresh sekali lalu mengulang request; jika tetap 401, user diarahkan
    ke login.
- Aturan password baru (min 8, huruf + angka, beda dari password lama) juga divalidasi di backend.

## A6. Format error umum

```json
{ "error": { "code": "STRING_CODE", "message": "..." } }
```

- Status yang dipakai: 400, 401, 403, 404, 423, 429, 5xx.
- Jika body tidak sesuai format, frontend memakai code cadangan dari status HTTP.
- **Perlu konfirmasi:** apakah 429 menyertakan header `Retry-After`. Frontend saat ini tidak
  memakainya untuk POST (tidak ada retry otomatis untuk POST/PUT).

## A7. Lain-lain

- Akses token berlaku ±15 menit, refresh token ±7 hari. Frontend tidak menjadwalkan refresh
  proaktif; refresh terjadi saat ada 401 atau saat halaman dimuat ulang.
- Endpoint selain login/refresh mengembalikan 401 (bukan 403) jika access token kedaluwarsa.
