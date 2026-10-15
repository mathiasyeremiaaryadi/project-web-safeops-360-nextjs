# Asumsi Kontrak API — perlu dikonfirmasi ke tim backend Go

Arsitektur: **Browser → Next.js (BFF) → Go**. Yang memanggil Go adalah **server Next.js**, bukan
browser (lihat `docs/DECISIONS.md` D0). Semua asumsi di bawah ini tercermin di:

- `src/server/go/session-tokens.js`: respons token Go dan cookie refresh.
- `src/features/auth/api/schemas.js`: profil user dan body request.

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
- Response 200: minimal `{ "access_token": string }`. Respons asli backend **tidak** memuat
  `token_type: "Bearer"`/`expires_in` seperti asumsi awal (terlihat di log BFF), jadi BFF kini
  menerima `token_type` apa pun dan menghitung masa berlaku access token dari `expires_in`, lalu
  `expires_at`, lalu klaim `exp` JWT, dan terakhir default 15 menit. **Perlu konfirmasi bentuk
  persisnya.** Sebelumnya tertulis:
  `{ "access_token": string, "token_type": "Bearer", "expires_in": number }`
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
- **L3.** Setiap request list dan dropdown selalu mengirim `page` (minimal `page=1`). Dropdown
  site tanpa `page` (`GET /sites?limit=20`) gagal dengan error server (5xx) di backend — dugaan:
  offset dihitung dari page 0 menjadi negatif. **Perlu perbaikan di Go:** default `page=1` bila
  tidak dikirim.
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

## Site, vendor, master task (`/sites`, `/vendors`, `/items`)

- **M1.** Baris site: `id, code, name, site_type?, status`. Vendor: `id, code, name, site_ids[],
status` (BRD: list menyertakan `site_ids`). Item: `id, name, description?, status`.
- **M2.** `POST`/`PATCH` mengembalikan objek yang disimpan. "Aktifkan" memakai
  `PATCH { status: "ACTIVE" }`, sedangkan "Nonaktifkan" memakai `DELETE` (soft deactivate).
- **M3.** Kode duplikat → **409**, ditampilkan "Kode sudah dipakai." di field Kode. **Perlu
  konfirmasi** apakah backend memakai 409 atau 400.
- **M4.** Mockup memuat jumlah inventory/SOP/pipeline/worker per vendor. Tidak dibuat karena belum
  ada endpoint yang mengembalikan angka tersebut.

## Pipeline (`/pipelines`, `/pipelines/{id}/items`, `/pipeline-items/{id}`)

- **P1.** Pipeline: `id, vendor_id, name, description?, status`, plus `item_count?` untuk kolom
  "Jumlah task" (tampil "—" jika tidak ada). Vendor hanya dipilih saat membuat pipeline.
- **P2.** Item pipeline: `id, item_id, sort_order, status`, plus nama task (`item_name` atau
  `item.name`). Jika tidak ada, nama diambil dari `GET /items`. List boleh berupa array atau
  `{ data }`.
- **P3.** Urutan ↑/↓ = menukar `sort_order` dua task (dua `PATCH /pipeline-items/{id}`). Tambah
  task = `sort_order` terbesar + 1. "Lepas dari pipeline" = `DELETE /pipeline-items/{id}`;
  "Aktifkan/Nonaktifkan" = `PATCH { status }`. **Perlu konfirmasi** apakah DELETE item pipeline
  menghapus atau hanya menonaktifkan.
- **P4.** "Atur penugasan" (worker per shift) di mockup tidak dibuat karena API penugasan belum ada.

## Inventory (`/inventories`)

- **INV1.** Nilai `status_condition`: `GOOD` Baik · `DAMAGED` Rusak · `MAINTENANCE` Perawatan ·
  `LOST` Hilang (BRD hanya menyebut "condition enum"). Nilai lain tetap ditampilkan apa adanya.
  **Perlu konfirmasi.**
- **INV2.** Field multipart foto bernama `image` (BRD tidak menyebut nama field). **Perlu
  konfirmasi.** Field lain: `vendor_id, item, jenis_item, qty, status_condition`.
- **INV3.** Respons: `id, vendor_id, item, jenis_item, qty, status_condition, status/is_active,
image_url?, updated_at?`. List boleh `{ inventories: [] }` atau envelope lain; detail boleh
  dibungkus `inventory`/`data`. Thumbnail di list hanya muncul jika list juga mengirim `image_url`.
- **INV4.** Aktifkan kembali = `PATCH` multipart `status=ACTIVE` (PATCH inventory dan SOP memakai
  multipart, bukan JSON).

## SOP (`/policies`)

- **SOP1.** Field multipart PDF bernama `file`. **Perlu konfirmasi.** Vendor hanya dikirim saat
  upload; edit hanya mengirim `name` dan file (jika diganti).
- **SOP2.** Respons: `id, vendor_id, name, status, file_size|size?, updated_at|created_at?`.
  Kolom "File" menampilkan ukuran/tanggal jika tersedia.
- **SOP3.** `GET /policies/{id}/file` mengembalikan URL di `url`, `signed_url`, `file_url` atau
  `download_url` (boleh di dalam `data`), atau string. URL tidak disimpan: setiap klik "Buka"
  meminta URL baru.

## Review laporan (`/pipeline-reports`)

- **R1.** Postman tidak memuat endpoint laporan dan BRD tidak menyebut nama field alasan/revisi.
  Pemetaan dipusatkan di `toReviewPayload` (`features/pipeline-reports/lib/review.js`):
  Setujui = `{ status: "COMPLETED" }`, Minta revisi = `{ revision_status: "REQUESTED", reason }`,
  Tolak = `{ status: "REJECTED", reason }`. **Perlu konfirmasi.**
- **R2.** Nama field respons tidak tercantum di BRD. Setiap field dibaca dari beberapa nama yang
  mungkin (mis. nama task dari `item_name` / `task_name` / `pipeline_item.item.name`; detail boleh
  di `detail` / `details` / `report_detail` atau di level atas). Daftarnya ada di
  `features/pipeline-reports/api/schemas.js`.
- **R3.** Tab "Revisi diminta" mengirim `?revision_status=REQUESTED` (dan memfilter ulang di klien
  jika backend mengabaikannya). Laporan bisa direview jika `status = SUBMITTED` dan revisi bukan
  `REQUESTED` (menunggu worker mengirim ulang).
- **R4.** Filter tanggal `from`/`to` dikirim sebagai `YYYY-MM-DD` (tanggal laporan). **Perlu
  konfirmasi** apakah backend mengharapkan timestamp.
- **R5.** Riwayat status hanya tampil jika detail mengembalikan `history` / `status_history`
  (BRD: belum ada endpoint baca riwayat). Jika tidak ada, bagian ini disembunyikan.

## Laporan inventory (`/inventory-reports`)

- **IR1.** Field respons dibaca dari beberapa nama (`report_type`/`type`, pelapor dari
  `user_full_name`/`user.full_name`, inventory dari `inventory_item`/`inventory.item`, waktu dari
  `created_at`). Inventory terkait beserta kondisinya diambil dari `GET /inventories/{id}`.
- **IR2.** Transisi review disimpan di `NEXT_ACTIONS` (`features/inventory-reports/lib/constants.js`):
  Baru → Tandai sedang diperiksa / Setujui / Tolak; Diperiksa → Setujui / Tolak; Disetujui →
  Tandai selesai. Ditolak dan Selesai tidak punya aksi. Tolak wajib `review_reason`.
- **IR3.** Filter jenis dikirim sebagai `report_type`. **Perlu konfirmasi.**

## Beranda (`/dashboard/report`, `/reports/daily`)

- **DB1.** Bentuk respons tidak tercantum di BRD; dipetakan oleh fungsi murni di
  `features/dashboard/lib/summary.js`. Jumlah per status boleh berupa map (`{ SUBMITTED: 3 }`)
  atau list (`[{ status, count }]`), di bawah `pipeline_reports` (revisi di `pipeline_revisions`).
- **DB2.** Panel angka (permintaan user, 14 Okt 2026): **Total task** = `TOTAL`/`total` jika
  ada, jika tidak jumlah semua status laporan task; **Dikerjakan** = `IN_PROGRESS`; **Pending** = `PENDING` (belum dikerjakan);
  **Selesai** = `COMPLETED`.
- **DB3.** `/reports/daily` berupa baris per vendor atau per vendor + pipeline (boleh bersarang di
  `pipelines`), dijumlahkan per vendor oleh `toVendorProgress`. Persentase = selesai ÷ task.
  "Belum dikerjakan" diambil dari field-nya, atau task − selesai − menunggu review − revisi.
- **DB4.** "Laporan inventory terbaru" = 5 terbaru dari status Baru dan Diperiksa (dua request,
  karena filter `status` hanya satu nilai). Bagian "Catatan safety hari ini" di mockup tidak dibuat
  (G1). Filter vendor dikosongkan saat site diganti.

## Role Admin (Admin Site)

- **AD1.** Daftar site Admin diambil dari `GET /sites` (sudah difilter backend sesuai scope).
  Admin dengan >1 site memilih site aktif (sidebar ≥1024, header 768–1023, top bar <768); daftar
  dashboard, laporan task, laporan inventory, inventory, pipeline, SOP, vendor, dan master task
  lalu mengirim
  `site_id`. "Semua site saya" = tanpa `site_id`. Filter site di halaman disembunyikan untuk
  Admin. **Perlu konfirmasi** bahwa `GET /pipelines` dan `GET /vendors` menerima `site_id`.
- **AD4.** Nama site Admin diambil berurutan dari: `GET /sites` → site di `/auth/me` (bentuk
  `scopes.site_ids`, `sites: [{ id, name }]`, atau `scopes: [{ site_id, site_name }]`) →
  `GET /sites/{id}` per site yang belum punya nama (`hooks/use-my-sites.js`). Lookup menerima
  `name`/`code` bernilai `null` agar satu baris tanpa nama tidak menggagalkan seluruh daftar.
- **AD3.** Pilihan vendor di form pipeline, inventory, dan SOP memakai `GET /vendors?status=ACTIVE&site_id=…`
  (site aktif). Jika simpan ditolak 403/404, Admin melihat "Vendor ini tidak termasuk site Anda.".
- **AD2.** Hak Admin: baca + review laporan task; laporan inventory **baca saja** (keputusan
  produk); vendor dan master task **baca saja** di halaman "Vendor" (menu `/master` tanpa tab
  Site; master task mengirim `site_id` site aktif — **perlu konfirmasi** `GET /items` mendukungnya); CRUD pipeline, task pipeline, inventory, SOP;
  tanpa manajemen user dan audit log (halaman 403).

## Role Admin vendor (ADMIN_WORKER)

- **AV1.** Vendor Admin vendor = `scopes.vendor_ids[0]` dari `/auth/me` (FR-18: tepat satu
  vendor), dibaca lewat `useCurrentVendorId()`. Nama vendor dari `/auth/me` bila dikirim, jika
  tidak dari `GET /vendors` (sudah difilter backend).
- **AV2.** Site yang dilayani vendor diambil dari `GET /sites` (difilter backend). Filter site
  di halaman hanya tampil jika vendor melayani lebih dari satu site; tidak ada pemilih site global.
- **AV3.** Form inventory, SOP, dan akun worker tidak menampilkan field vendor; `vendor_id` /
  `vendor_ids` diisi `withOwnVendor` saat submit.
- **AV4.** "Progres per pipeline" memakai `/reports/daily` yang dikelompokkan per pipeline
  (`pipeline_id`/`pipeline_name`, atau `pipelines` bersarang). **Perlu konfirmasi** field-nya.
- **AV5.** "Laporan terkait" di detail inventory **tidak dibuat**: belum ada bukti bahwa
  `GET /inventory-reports` menerima filter `inventory_id`. **Perlu konfirmasi.**
- **AV6.** Admin vendor membuat akun Worker dengan `POST /users` `{ roles: ["WORKER"],
site_ids: [], vendor_ids: [<vendor sendiri>] }`. Ubah role/scope (`PUT /users/{id}/roles`) dan
  "Cabut semua sesi" disembunyikan (BRD: hanya Super Admin).

## Gap backend (fitur tidak dibuat/dipalsukan)

- **G1. Catatan safety:** `GET /pipeline-reports` belum punya filter kategori temuan
  (`note_category`). Menu ditampilkan nonaktif dengan tooltip "Menunggu dukungan API".
- **G2.** Tidak ada endpoint daftar sesi aktif. Halaman profil hanya menyediakan "Keluar" dan
  "Keluar dari semua perangkat".
- **G3.** Riwayat status laporan task belum bisa dibaca (BRD 3.2), dan evidence foto hanya berupa
  object key tanpa endpoint signed URL. Foto evidence hanya ditampilkan jika nilainya URL
  http(s); object key ditampilkan sebagai "Foto belum tersedia".
- **G4.** Notifikasi dan pencarian global (⌘K) di mockup tidak dibuat karena belum ada API.
- **TZ.** Site belum punya field zona waktu. Semua tanggal memakai `NEXT_PUBLIC_APP_TIMEZONE`
  (default `Asia/Jakarta`), dan `date` selalu dikirim eksplisit.
- **G5. Admin mengelola vendor:** PRD mengizinkan, tetapi BRD hanya memberi Super Admin hak
  membuat/mengubah vendor. UI tidak dibuat.
- **G6. Akun Admin Worker oleh Admin:** BRD membatasi `/users` untuk Super Admin dan Admin
  Worker, dan Postman tidak menunjukkan Admin bisa memanggilnya. Menu "Akun admin worker" tidak
  ditampilkan untuk Admin.
