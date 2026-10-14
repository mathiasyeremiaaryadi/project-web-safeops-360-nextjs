# Panduan Kode untuk Developer

Dokumen ini untuk developer yang baru bergabung atau melakukan maintenance. Baca berurutan:
gambaran besar → anatomi satu fitur → komponen bersama → resep menambah halaman.

## 1. Gambaran besar

```
Browser (React, client components)
   │  fetch /api/...  (cookie sesi HttpOnly, tanpa token)
   ▼
Next.js server = BFF (src/app/api, src/server)
   │  /api/v1/...  + Authorization: Bearer <token Go>
   ▼
Backend Go
```

- **Semua data diambil di browser** dengan TanStack Query, lewat `apiRequest()` ke BFF
  (`src/lib/api/client.js`). Halaman (`src/app/**/page.jsx`) hanya merangkai komponen fitur.
- **BFF** menyimpan token Go di cookie terenkripsi, me-refresh token, mengecek CSRF, dan
  meneruskan `/api/v1/*` ke Go (hanya path di `proxy-allowlist.js`). Detail: `docs/DECISIONS.md`
  (D0, D13) dan `docs/SECURITY.md`.
- **Bentuk respons Go belum terdokumentasi lengkap**, jadi setiap respons divalidasi dengan Zod
  yang toleran (`src/lib/api/lists.js`). Asumsi tercatat di `docs/ASSUMPTIONS.md`.

## 2. Struktur folder

```
src/
├─ app/                  Routing saja: page.jsx memanggil komponen dari features/*
│  ├─ (auth)/login       Halaman login
│  ├─ (protected)/(app)  Halaman setelah login (dijaga AuthGate + menu)
│  └─ api/               Route Handler BFF (auth/*, v1/[...path])
├─ features/<fitur>/     Satu folder per modul (sites, vendors, users, inventories, …)
├─ components/ui/        Primitif shadcn (button, dialog, input, …) — jangan diubah sembarangan
├─ components/shared/    Komponen yang dipakai banyak fitur (lihat bagian 4)
├─ components/layout/    Shell aplikasi: sidebar, rail, bottom nav, header, PageHeader
├─ hooks/                Hook lintas fitur (useListQuery, useListParams, useOptionLabels, …)
├─ lib/                  Fungsi murni & klien API (tanpa React kecuali notify.js)
├─ server/               Kode khusus server (BFF), selalu `import 'server-only'`
├─ config/               env.js (server-only) dan client-env.js (publik)
└─ proxy.js              CSP per request + redirect ke /login bila belum ada cookie sesi
```

**Aturan impor (dicek ESLint):** sebuah fitur tidak boleh mengimpor isi fitur lain kecuali
lewat `index.js`-nya, misalnya `import { useInventory } from '@/features/inventories'`.

## 3. Anatomi satu fitur

Contoh `src/features/sites/`:

```
api/
  keys.js        export const siteKeys = createQueryKeys('sites');
  schemas.js     Zod: bentuk data dari Go + schema form + fungsi toSitePayload()
  queries.js     export const useSites = (params) => useListQuery({ keys, path, params, schema })
  mutations.js   useSaveSite (POST/PATCH), useChangeSiteStatus (nonaktif/aktif)
components/
  sites-list.jsx         daftar + filter + aksi
  site-form-dialog.jsx   form tambah/edit (satu komponen untuk keduanya)
index.js         apa saja yang boleh dipakai dari luar fitur
```

Alur saat user menyimpan form:

1. Form (React Hook Form + `zodResolver(siteFormSchema)`) memvalidasi input.
2. `toSitePayload(values)` mengubah nilai form menjadi body API.
3. `useSaveSite().mutate({ id?, body })` → `POST /sites` atau `PATCH /sites/{id}`.
4. Setelah sukses, list di-refresh otomatis (respons simpan tidak dibaca, jadi tidak bergantung
   pada bentuk respons Go).

## 4. Komponen & helper bersama

| Kebutuhan                                   | Pakai                                                | File                                      |
| ------------------------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| Query keys standar                          | `createQueryKeys('sites')`                           | `lib/api/query-keys.js`                   |
| Ambil list / detail                         | `useListQuery`, `useDetailQuery`                     | `hooks/use-resource.js`                   |
| Simpan (JSON atau upload)                   | `useSaveMutation({ path, keys, multipart? })`        | `hooks/use-resource.js`                   |
| Nonaktifkan / aktifkan                      | `useMasterStatusChange` + `<StatusChangeDialog>`     | `hooks/`, `components/shared/`            |
| Paging, cari, filter di URL                 | `useListParams(FILTERS)`                             | `hooks/use-list-params.js`                |
| Loading / error / kosong / data + paginasi  | `<QueryList>`                                        | `components/shared/query-list.jsx`        |
| Tabel (≥768px) + kartu (<768px), sort kolom | `columns[].meta.sortValue` di `<QueryList>`          | `data-table.jsx`                          |
| Kotak cari (debounce 300 ms)                | `<FilterBar>`                                        | `filter-bar.jsx`                          |
| Chip status                                 | `<StatusTabs>`                                       | `status-tabs.jsx`                         |
| Filter site/vendor/user                     | `<LookupFilter>`, `<ReportFilters>`                  | `lookup-filter.jsx`, `report-filters.jsx` |
| Pilih site/vendor di form                   | `<ComboboxField>`                                    | `combobox-field.jsx`                      |
| Nama dari id (vendor_id → nama)             | `useOptionLabels('vendors').labelOf(id)`             | `hooks/use-option-labels.js`              |
| Form dalam dialog / bottom sheet            | `<FormDialog>`, `<FormField>`                        | `form-dialog.jsx`, `form-field.jsx`       |
| Konfirmasi (opsional dengan alasan)         | `<ConfirmDialog>`                                    | `confirm-dialog.jsx`                      |
| Data tidak ditemukan (404)                  | `<NotFoundState>` + `isNotFound(error)`              | `not-found-state.jsx`                     |
| Toast error dari API                        | `onError: toastApiError`                             | `lib/notify.js`                           |
| Foto dari signed URL                        | `<SignedImage>`                                      | `signed-image.jsx`                        |
| Upload file + validasi                      | `<FileField rule={FILE_RULES.PDF}>`                  | `file-field.jsx`                          |
| Cari di baris yang sudah dimuat             | `searchRows(rows, q, fields)`                        | `lib/search.js`                           |
| Hak akses                                   | `can(user, 'INVENTORY_POLICY_WRITE')`                | `lib/auth/permissions.js`                 |
| Tanggal (zona Asia/Jakarta)                 | `formatDate`, `formatDateTime`, `todayInAppTimezone` | `lib/date.js`                             |

## 5. Resep: menambah halaman list baru

Misalnya modul "Peralatan" (`/equipment`, endpoint Go `GET/POST/PATCH/DELETE /equipment`).

1. **Izinkan path di BFF** — tambahkan `'equipment'` ke `src/server/bff/proxy-allowlist.js`.
2. **Schema** — `features/equipment/api/schemas.js`:

   ```js
   export const equipmentSchema = z.preprocess(
     withMasterStatus,
     z.object({ id: z.coerce.string(), name: z.string(), status: masterStatusSchema }),
   );
   export const equipmentListSchema = listResponseSchema(equipmentSchema);
   ```

3. **Keys, query, mutation**:

   ```js
   // api/keys.js
   export const equipmentKeys = createQueryKeys('equipment');
   // api/queries.js
   export const useEquipment = (params) =>
     useListQuery({
       keys: equipmentKeys,
       path: 'v1/equipment',
       params,
       schema: equipmentListSchema,
     });
   // api/mutations.js
   export const useSaveEquipment = () =>
     useSaveMutation({ path: 'v1/equipment', keys: equipmentKeys });
   ```

4. **Komponen list** — salin pola `features/sites/components/sites-list.jsx`: `useListParams`,
   query, `searchRows`, `columns` (beri `meta.sortValue` agar bisa di-sort), lalu `<QueryList>`.
5. **Halaman** — `src/app/(protected)/(app)/equipment/page.jsx` cukup merender komponen list.
6. **Menu & hak akses** — tambahkan item di `src/config/navigation.js` (sumber tunggal untuk
   menu dan penjaga route).
7. **Test** — unit test untuk schema/logika murni (`*.test.js` di sebelah file), dan bila perlu
   data di `tests/e2e/support/fixtures.js` + test di `tests/e2e/app-flows.spec.js`.

## 6. Konvensi

- Komponen ±150 baris; pecah bila lebih. Satu level ternary saja di JSX.
- Tidak ada `useEffect` untuk mengambil data — pakai TanStack Query.
- Setiap list menangani 4 kondisi: loading, error (dengan "Coba lagi"), kosong, data —
  `<QueryList>` sudah melakukannya.
- Teks UI Bahasa Indonesia; kode, nama variabel, dan komentar Bahasa Inggris.
- Warna hanya dari token di `app/globals.css` (tanpa hex di JSX).
- Jangan menyimpan token/password di browser (`localStorage`/`sessionStorage` dilarang ESLint).

## 7. Testing

| Perintah                            | Isi                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                         | Unit test (Vitest) logika murni: schema, permission, cookie sesi, body limit, dll.                                                                            |
| `pnpm test:e2e`                     | Playwright pada build production. Halaman setelah login memakai **API tiruan di browser** (`tests/e2e/support/mock-api.js`), jadi tidak menyentuh backend Go. |
| `node tests/perf/measure.mjs <url>` | Pengukuran performa (lihat `docs/PERFORMANCE.md`).                                                                                                            |

Setelah refactor apa pun: jalankan `pnpm lint`, `pnpm test`, dan `pnpm test:e2e` — ketiganya
harus hijau.
