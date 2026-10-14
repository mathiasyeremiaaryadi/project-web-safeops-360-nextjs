# Asumsi Kontrak API — perlu dikonfirmasi ke tim backend Go

Arsitektur: **Browser → Next.js (BFF) → Go**. Yang memanggil Go adalah **server Next.js**, bukan
browser (lihat `docs/DECISIONS.md` D0). Semua asumsi di bawah ini tercermin di:

- `src/server/go/session-tokens.js`: respons token Go dan cookie refresh.
- `src/features/auth/api/schemas.js`: profil user dan body request.
- `src/mocks/go-backend.js`: mock Go yang dipakai dev, Vitest, dan E2E.

Jika ada yang berbeda, ubah file-file itu lalu jalankan ulang test.

Base path Go: `${API_ORIGIN}/api/v1`. Go cukup bisa dijangkau dari server Next.js (jaringan
internal); tidak perlu diekspos ke internet, dan tidak perlu CORS.

## A0. Hal baru karena BFF (penting untuk tim Go)

1. **Klien Go adalah server Next.js.** Semua request datang dari IP server Next.js. Untuk rate
   limit dan lockout per IP, serta daftar sesi/perangkat, BFF meneruskan `X-Forwarded-For`,
   `X-Real-IP`, dan `User-Agent` dari browser. Go harus **memercayai header ini hanya dari IP BFF**.
2. **Cookie refresh dibaca oleh BFF, bukan browser.** Go tetap boleh mengirim refresh token sebagai
   `Set-Cookie`. BFF mengambil nilainya dari header `Set-Cookie` (nama default `refresh_token`,
   bisa diatur lewat `GO_REFRESH_COOKIE_NAME`), lalu mengirimnya kembali sebagai header
   `Cookie: refresh_token=…` saat refresh/logout. Alternatif yang juga didukung: Go mengirim
   `refresh_token` di body JSON. **Perlu konfirmasi mana yang dipakai.**
3. Masa berlaku cookie sesi BFF mengikuti `Max-Age`/`Expires` dari cookie refresh Go (default
   7 hari jika tidak ada). **Mohon sertakan `Max-Age`.**
4. Atribut `Secure`, `SameSite`, dan `Path` pada cookie refresh Go tidak berpengaruh, karena
   cookie itu tidak pernah diteruskan ke browser.

## A1. `POST /auth/login`

- Request: `{ "username": string, "password": string }`. Username sudah di-`trim()` dan
  di-`toLowerCase()`.
- Response 200: `{ "access_token": string, "token_type": "Bearer", "expires_in": number }`
  (`expires_in` dalam **detik**, ±900) + refresh token (lihat A0.2).
- Error (diteruskan apa adanya oleh BFF ke browser):
  - 401 `AUTH_INVALID_CREDENTIALS` untuk username tidak ada **dan** password salah.
  - 423 `AUTH_ACCOUNT_LOCKED` setelah 5 kali gagal, berlaku 15 menit.
  - 429 `RATE_LIMITED`.
  - 403 `AUTH_ACCOUNT_INACTIVE` untuk user nonaktif. **Perlu konfirmasi status dan code.**
- Sisa percobaan tidak ditampilkan kecuali Go mengirimnya secara eksplisit. **Perlu konfirmasi.**
- Setelah login sukses, BFF langsung memanggil `GET /auth/me` dan mengembalikan profil ke
  browser.

## A2. `POST /auth/refresh`

- Tanpa body. Refresh token dikirim BFF lewat header `Cookie` (A0.2).
- Response 200: bentuk sama dengan login, dengan refresh token baru (rotasi).
- 401 jika token tidak ada, kedaluwarsa, dicabut, atau dipakai ulang.
- BFF menjamin single-flight dan tidak pernah memakai ulang token yang sudah dirotasi, **per
  proses**. Jika BFF berjalan di beberapa instance tanpa sticky session: **mohon masa tenggang
  singkat (mis. 10–30 detik)** di mana refresh token yang baru dirotasi mengembalikan hasil yang
  sama, alih-alih dianggap pencurian.

## A3. `POST /auth/logout`

- Header `Authorization: Bearer <access_token>` dan `Cookie: refresh_token=…`.
- Response 204. Go mencabut sesi ini.
- BFF tetap menghapus cookie sesinya walaupun Go gagal dihubungi.

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

- `roles` berupa **array**. Role di luar 4 nilai di atas membuat validasi di browser gagal.
  **Perlu konfirmasi.**
- `scopes` selalu ada (array kosong jika tidak ada).

## A5. `PUT /auth/password`

- Request: `{ "current_password": string, "new_password": string }`. Response **204**.
- Sukses mencabut **semua** refresh token user (FR-12). BFF lalu menghapus cookie sesi.
- Error:
  - 400 `AUTH_INVALID_CURRENT_PASSWORD` → "Password saat ini salah." di field pertama.
    **Perlu konfirmasi code ini.**
  - 400 code lain → `error.message` ditampilkan apa adanya di UI, jadi pesannya harus **ramah
    pengguna dan berbahasa Indonesia**. **Perlu konfirmasi.**

## A6. Format error umum

```json
{ "error": { "code": "STRING_CODE", "message": "..." } }
```

- Status yang dipakai: 400, 401, 403, 404, 423, 429, 5xx.
- Endpoint terproteksi mengembalikan **401** (bukan 403) jika access token kedaluwarsa. BFF
  memakai 401 sebagai tanda untuk me-refresh.
- Error dari BFF sendiri memakai format yang sama: `CSRF_REJECTED` (403),
  `UPSTREAM_UNAVAILABLE` (502), `UPSTREAM_INVALID_RESPONSE` (502), `AUTH_UNAUTHORIZED` (401, sesi
  BFF habis).

## A7. Endpoint modul lain (fase berikutnya)

Akan diakses lewat proxy BFF `/api/v1/<segmen>/...`. Segmen pertama harus didaftarkan di
`src/server/bff/proxy-allowlist.js`. Proxy meneruskan method, query, body, `Content-Type`, dan
`Accept`, menambahkan `Authorization: Bearer`, lalu mengembalikan status, body, dan header aman
(`Content-Type`, `Content-Disposition`, `Retry-After`, `ETag`, `Last-Modified`).

---

# Area Super Admin

Sumber: BRD backend (diturunkan dari implementasi, menjadi acuan utama), PRD "Flow Per Akun"
(pelengkap), dan Postman `peelen-ms-be` (hanya Auth, Users, Admin, tanpa contoh response).
Bentuk **response** di bawah ini adalah asumsi, dipusatkan di `features/<fitur>/api/schemas.js`.
Schema hanya memuat field yang dipakai UI.

## Konvensi umum

- **L1.** List: `{ data: [], page, limit, total }` (BRD 8.5). Jika `page`/`limit`/`total` tidak ada,
  UI tetap berjalan (`total` opsional → navigasi halaman berdasarkan halaman penuh).
- **L2.** Filter dikirim sebagai query string, dan nilai kosong tidak dikirim.
- **P1.** User dengan `must_change_password` yang memanggil endpoint lain mendapat **403
  `PASSWORD_CHANGE_REQUIRED`**. Frontend lalu mengarahkan ke `/change-password`. **Perlu
  konfirmasi code-nya.**

## Users (`/users`, Postman "Users")

- **U1.** Objek user: `id, username, full_name, email, phone, roles[], is_active, locked_until,
must_change_password, last_login_at, scopes { site_ids[], vendor_ids[] }`. Status "Terkunci"
  dihitung dari `locked_until > sekarang`. **Perlu konfirmasi nama field `is_active`,
  `locked_until`, `last_login_at`, dan `scopes`.**
- **U2.** Filter list: `?q=&role=&status=ACTIVE|INACTIVE&page=&limit=`. **Perlu konfirmasi
  `role` dan `status`.**
- **U3.** `POST /users` → 201 `{ user, temporary_password? }` (dari Postman test script).
  `POST /users/{id}/reset-password` dengan body `{}` → `{ temporary_password }` (asumsi).
- **U4.** Ubah role dan scope sekaligus memakai satu panggilan `PUT /users/{id}/roles` dengan
  `{ roles, site_ids, vendor_ids }` (BRD: "optional scopes"). Aturan FR-18 juga divalidasi di
  frontend.
- **U5.** Nama site/vendor pada kolom Scope diambil dari `GET /sites` dan `GET /vendors`
  (`limit=100`). Jika data lebih dari 100, sebagian nama tampil "—". **Saran ke backend:** sertakan
  `sites[]`/`vendors[]` (id + nama) pada objek user.

## Audit log (`/audit-logs`)

- **AL1.** Baris: `id, action, entity, entity_id, actor_id?, actor_username, ip, summary?, before,
after, created_at` (BRD 9.2). Jika `summary` tidak ada, UI menampilkan "{action} {entity}".
- **AL2.** Filter `user` = **id user**; `from`/`to` = RFC3339 (Postman), dihitung dari tanggal di
  `APP_TIMEZONE`.

## Gap backend (fitur tidak dibuat/dipalsukan)

- **G1. Catatan safety:** `GET /pipeline-reports` belum punya filter kategori temuan
  (`note_category`). Menu ditampilkan nonaktif dengan tooltip "Menunggu dukungan API".
- **G2.** Tidak ada endpoint daftar sesi aktif. Halaman profil hanya menyediakan "Keluar" dan
  "Keluar dari semua perangkat".
- **G3.** Riwayat status laporan task belum bisa dibaca (BRD 3.2), dan evidence foto hanya berupa
  object key tanpa endpoint signed URL.
- **G4.** Notifikasi dan pencarian global (⌘K) di mockup tidak dibuat karena belum ada API.
- **TZ.** Site belum punya field zona waktu. Semua tanggal memakai `NEXT_PUBLIC_APP_TIMEZONE`
  (default `Asia/Jakarta`), dan `date` selalu dikirim eksplisit.
