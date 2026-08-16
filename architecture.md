# Architecture — SIMPATIK MVP

**Versi:** 1.1  
**Horizon:** 0–2 bulan  
**Gaya arsitektur:** Monorepo dengan frontend Next.js dan backend Express.js modular monolith

---

## 1. Keputusan Utama

SIMPATIK MVP menggunakan dua aplikasi dalam satu repository:

- **Frontend:** Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui.
- **Backend:** Express.js 5 + TypeScript.
- **Autentikasi:** Better Auth yang dijalankan pada backend Express.
- **ORM:** Prisma.
- **Database:** PostgreSQL.
- **File:** private object storage atau storage privat yang ditentukan saat deployment.

Express.js menangani HTTP API. Prisma dipakai di dalam backend Express untuk membaca dan mengubah PostgreSQL. Better Auth juga berjalan di Express dan menggunakan Prisma adapter.

```text
Browser
  ↓
Next.js frontend
  ↓ HTTPS / JSON / multipart
Express.js API
  ├── Better Auth
  ├── Business modules
  ├── Prisma
  └── File storage adapter
        ↓
PostgreSQL + Private File Storage
```

## 2. Alasan Pemilihan

- Memisahkan tanggung jawab UI dan API secara jelas.
- Tetap menggunakan TypeScript pada frontend dan backend.
- Express cukup ringan untuk target MVP 0–2 bulan.
- Prisma menyediakan akses database bertipe dan migrasi yang dapat ditinjau.
- PostgreSQL cocok untuk data relasional dan workflow.
- Better Auth mendukung Express, Prisma, session, dan akses berbasis role.
- shadcn/ui mempercepat pembuatan primitive UI yang konsisten dan tetap dimiliki sebagai source code aplikasi.
- Backend tetap satu aplikasi sehingga tidak membawa kompleksitas microservices.

## 3. Batas Arsitektur

### Termasuk

- Satu aplikasi Next.js.
- Satu aplikasi Express.js.
- Satu database PostgreSQL.
- Satu penyimpanan file privat.
- Satu pipeline deployment untuk setiap aplikasi.
- Modul backend dipisahkan berdasarkan domain, tetapi berjalan dalam satu proses.

### Tidak termasuk

- Microservices.
- Message broker.
- Event streaming.
- Kubernetes.
- Multi-region deployment.
- Database per module.
- Backend for Frontend tambahan di Next.js.

Next.js tidak menyimpan logika bisnis atau mengakses PostgreSQL secara langsung. Semua operasi bisnis melewati Express API.

## 4. Struktur Repository

```text
simpatik/
├── frontend/                      # Next.js
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── ui/               # primitive shadcn/ui
│   │   │   └── shared/           # reusable lintas fitur
│   │   ├── features/
│   │   ├── lib/
│   │   └── styles/
│   └── public/
├── backend/                       # Express.js
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── upt/
│   │   │   ├── periods/
│   │   │   ├── reports/
│   │   │   ├── reviews/
│   │   │   ├── dashboard/
│   │   │   ├── attachments/
│   │   │   └── audit/
│   │   ├── services/
│   │   ├── app.ts
│   │   └── server.ts
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
├── packages/
│   └── contracts/                 # DTO, enum, dan schema bersama
├── prd.md
├── architecture.md
├── tasks.md
├── agents.md
└── package.json
```

Penggunaan workspace package manager diperbolehkan, tetapi tool monorepo tambahan tidak wajib untuk MVP.

## 5. Prinsip Modular Backend

Setiap module Express memiliki batas tanggung jawab yang jelas:

```text
modules/reports/
├── report.routes.ts
├── report.controller.ts
├── report.service.ts
├── report.repository.ts
├── report.schema.ts
└── report.types.ts
```

- **Routes:** mendefinisikan method, path, dan middleware.
- **Controller:** menerjemahkan HTTP request/response.
- **Service:** menjalankan aturan bisnis dan transaksi.
- **Repository:** membungkus query Prisma.
- **Schema:** memvalidasi body, params, dan query.
- **Types:** tipe internal module.

Controller tidak boleh berisi query Prisma langsung. Repository tidak boleh menentukan keputusan role atau workflow.

## 6. Komponen Sistem

### 6.1 Frontend Next.js

Tanggung jawab:

- Halaman login.
- Navigasi sesuai role.
- Form periode, indikator, laporan, dan unggahan.
- Antrean reviu Kanwil.
- Dashboard dan tabel rekap.
- Validasi pengalaman pengguna.
- Pemanggilan Express API.

Frontend tidak dianggap sebagai batas keamanan. Semua pemeriksaan akses diulangi di backend.

#### Component architecture

Komponen frontend dibagi menjadi tiga lapisan:

1. **UI primitives** — source shadcn/ui pada `components/ui`, seperti Button, Input, Dialog, Table, Badge, Select, Sheet, Skeleton, dan Toast.
2. **Shared components** — komponen reusable lintas fitur pada `components/shared`, seperti PageHeader, DataTable, FilterBar, FormField, StatusBadge, ConfirmDialog, FileUpload, EmptyState, LoadingState, PermissionGate, dan DashboardCard.
3. **Feature components** — komponen yang mengandung konteks domain dan hanya dipakai fitur tertentu, seperti ReportForm, ReviewPanel, dan PeriodIndicatorEditor.

Aturan komponen:

- UI primitive dan shared component tidak melakukan query API bisnis secara langsung.
- Shared component menerima data, callback, state, dan permission melalui props.
- Komponen baru diekstrak menjadi shared component setelah digunakan ulang atau memiliki pola UI stabil.
- Hindari satu komponen DataTable raksasa; ekstrak perilaku yang benar-benar berulang dan biarkan konfigurasi kolom tetap milik fitur.
- Form memakai primitive shadcn/ui dengan schema validation yang sama secara konsep dengan kontrak backend.
- Setiap reusable component menangani state loading, empty, error, disabled, dan akses bila relevan.
- Accessibility, keyboard navigation, label, focus state, dan error message menjadi bagian kriteria penerimaan komponen.

### 6.2 Backend Express.js

Tanggung jawab:

- Better Auth handler.
- Session dan identitas pengguna.
- Role dan pembatasan UPT.
- Validasi request.
- Workflow laporan.
- Query dan transaksi Prisma.
- Upload/download dokumen.
- Dashboard aggregation.
- Audit log.
- Error handling dan observability.

### 6.3 Prisma

Prisma berada di backend dan digunakan untuk:

- Model data relasional.
- Query bertipe.
- Constraint dan indeks.
- Transaksi perubahan status.
- Migrasi database.
- Seed data UPT dan akun awal.

Prisma bukan database dan bukan pengganti Express. Alurnya:

```text
Express service → Prisma Client → PostgreSQL
```

### 6.4 PostgreSQL

PostgreSQL menjadi sumber data resmi untuk:

- Pengguna dan session.
- UPT.
- Periode dan indikator.
- Laporan serta item laporan.
- Metadata dokumen.
- Antrean durable `StorageDeletionTask` untuk penghapusan object storage.
- Catatan reviu.
- Histori status.
- Audit log.

### 6.5 File storage

File tidak disimpan sebagai byte besar di PostgreSQL. Database hanya menyimpan metadata dan `Attachment.storageKey` sebagai **logical key** relatif yang dibuat acak; nama asli hanya menjadi metadata. Logical key tidak memuat absolute path, bucket, endpoint, atau URL. Driver memetakannya ke `${STORAGE_BUCKET}/${storageKey}` pada `local`, atau ke object key `${S3_KEY_PREFIX}/${storageKey}` pada `s3` dengan separator yang dinormalisasi.

Driver dipilih saat deployment:

- `STORAGE_DRIVER=local` menyimpan file pada direktori persisten yang ditunjuk `STORAGE_BUCKET`. Mode ini mendukung satu instance Express. Beberapa instance hanya aman bila semuanya memakai mount durable shared RWX yang sama dan memiliki semantik filesystem konsisten; filesystem container lokal/ephemeral tidak boleh dipakai.
- `STORAGE_DRIVER=s3` memakai AWS S3 saat `S3_ENDPOINT` kosong, atau endpoint S3-compatible yang dikonfigurasi saat `S3_ENDPOINT` diisi. Semua instance Express dapat memakai bucket dan prefix yang sama sehingga mode ini mendukung deployment multi-instance.

Endpoint yang dapat dikonfigurasi mencakup MinIO, Cloudflare R2, dan Wasabi. Penyebutan tersebut adalah contoh konfigurasi protokol S3-compatible, bukan sertifikasi provider; kompatibilitas API, region, path style, TLS, versioning, dan lifecycle harus diverifikasi terhadap provider dan versi yang dipakai.

Aturan minimum:

- Bucket/direktori bersifat privat. Untuk S3, blokir public access, jangan memakai object ACL, dan jangan memberi izin `s3:PutObjectAcl`.
- Browser tidak mengakses storage langsung; upload dan download melewati backend setelah authorization. Karena itu bucket tidak memerlukan browser CORS.
- Ukuran dan tipe file dibatasi. File yang sudah menjadi bukti laporan resmi tidak dapat dihapus melalui alur biasa.
- Koneksi ke object storage produksi wajib memakai TLS dengan sertifikat tervalidasi; jangan menonaktifkan verifikasi TLS pada custom endpoint.
- S3 memakai AWS SDK default credential provider chain. Di AWS, utamakan IAM role/workload identity. Jika static credential diperlukan untuk endpoint compatible, simpan di secret manager dan inject melalui variable standar AWS; jangan menaruh secret di repository atau image.
- IAM hanya memerlukan `s3:GetObject`, `s3:PutObject`, dan `s3:DeleteObject` pada dua namespace object di bawah `S3_KEY_PREFIX`: `attachments/*` untuk lampiran dan `.simpatik-storage-check/*` untuk probe readiness. `s3:HeadBucket`, `s3:ListBucket`, izin ACL, dan izin administrasi bucket tidak diperlukan.
- Readiness `s3` menjalankan probe privat `PutObject`/`GetObject`/`DeleteObject` berukuran kecil dan berbatas waktu pada key acak di `${S3_KEY_PREFIX}/.simpatik-storage-check/`; prefix kosong diperlakukan tanpa leading slash. Probe menghapus object dalam blok cleanup, tidak melakukan listing, dan kegagalan cleanup membuat storage dinyatakan tidak siap.
- Readiness `local` membuat file probe privat dengan nama acak pada direktori `STORAGE_BUCKET`, lalu menghapusnya; kegagalan create atau delete membuat storage dinyatakan tidak siap.
- Setelah upload pertama, perlakukan `STORAGE_DRIVER`, `STORAGE_BUCKET`, dan `S3_KEY_PREFIX` sebagai immutable untuk environment tersebut. Perubahan memerlukan cutover terencana.

## 7. Autentikasi dan Otorisasi

### 7.1 Better Auth

Better Auth dijalankan pada Express API.

```text
POST /api/auth/sign-in/email
GET  /api/auth/get-session
POST /api/auth/sign-out
```

Konfigurasi penting:

- Gunakan ESM pada backend Express.
- Mount handler Better Auth sebelum `express.json()`.
- Untuk Express 5, gunakan catch-all route yang sesuai dokumentasi Better Auth.
- Session menggunakan secure cookie.
- Origin Next.js dimasukkan ke `trustedOrigins`.
- Frontend mengirim request dengan credentials.
- Produksi menggunakan HTTPS.

### 7.2 Role

```ts
type Role =
  | "PIMPINAN"
  | "PRODUCT_OWNER"
  | "PETUGAS_KANWIL"
  | "KOORDINATOR_UPT"
  | "PETUGAS_UPT"
  | "ADMIN_SIMPATIK"
  | "SYSTEM_ADMIN";
```

Role dapat disimpan sebagai field tambahan pada user. `uptId` wajib tersedia untuk Koordinator UPT dan Petugas UPT.

### 7.3 Authorization middleware

Urutan middleware bisnis:

```text
request
  → requireSession
  → requireRole(...)
  → enforceUptScope
  → validateRequest
  → controller
```

Aturan penting:

- ID UPT dari client tidak pernah dipercaya tanpa dibandingkan dengan session.
- Admin SIMPATIK mengakses administrasi akun, UPT, dan periode tanpa otomatis menjadi approver bisnis.
- Petugas Kanwil mengakses seluruh UPT untuk reviu; Product Owner memberikan persetujuan akhir.
- Koordinator UPT dan Petugas UPT dibatasi ke UPT sendiri.
- Pimpinan hanya menggunakan endpoint baca.
- System Administrator mengakses fungsi teknis tanpa hak substansi laporan secara default.
- Pemeriksaan akses dilakukan kembali ketika mengunduh file.

## 8. Model Data Konseptual

### 8.1 Entitas

| Entitas             | Field utama                                                                            |
| ------------------- | -------------------------------------------------------------------------------------- |
| User                | id, name, email, role, uptId, active                                                   |
| Session             | field session Better Auth                                                              |
| UPT                 | id, code, name, active                                                                 |
| ReportingPeriod     | id, name, startDate, dueDate, status                                                   |
| Indicator           | id, periodId, code, name, required, order                                              |
| Report              | id, uptId, periodId, status, version, createdById, submittedAt, reviewedAt, approvedAt |
| ReportItem          | id, reportId, indicatorId, value, narrative                                            |
| Attachment          | id, reportId, reportItemId, storageKey, originalName, mimeType, size, uploadedById     |
| StorageDeletionTask | id, storageKey, attempts, nextAttemptAt, repeatUntilCancelled, createdAt, updatedAt    |
| ReviewComment       | id, reportId, message, createdById, createdAt                                          |
| StatusHistory       | id, reportId, fromStatus, toStatus, actorId, note, createdAt                           |
| AuditLog            | id, actorId, action, entityType, entityId, metadata, createdAt                         |

### 8.2 Relasi utama

```mermaid
erDiagram
    UPT ||--o{ USER : memiliki
    UPT ||--o{ REPORT : mengirim
    REPORTING_PERIOD ||--o{ REPORT : mencakup
    REPORT ||--o{ REPORT_ITEM : berisi
    REPORT ||--o{ ATTACHMENT : memiliki
    REPORT ||--o{ REVIEW_COMMENT : direviu
    REPORT ||--o{ STATUS_HISTORY : dilacak
```

### 8.3 Constraint minimum

- Unique `Report(uptId, periodId, reportType)`.
- Index `Report(periodId, status)`.
- Index `Report(uptId, periodId)`.
- Index `StatusHistory(reportId, createdAt)`.
- Index `AuditLog(actorId, createdAt)`.
- Foreign key memakai kebijakan delete yang mencegah hilangnya histori resmi.

## 9. Workflow dan Transaksi

Status:

```text
DRAFT → SUBMITTED → REVIEWED → APPROVED
             ↓
      REVISION_REQUIRED → SUBMITTED
```

Setiap transisi:

1. Memeriksa session, role, dan UPT.
2. Memeriksa status asal.
3. Memvalidasi kelengkapan.
4. Mengubah status Report.
5. Menulis StatusHistory.
6. Menulis AuditLog.
7. Menjalankan seluruh perubahan dalam satu transaksi Prisma.

Penghapusan lampiran memakai transactional outbox `StorageDeletionTask` karena transaksi database tidak dapat digabung secara atomik dengan object storage:

1. Dalam satu transaksi Prisma, backend memeriksa status laporan, menghapus metadata `Attachment`, membuat `StorageDeletionTask` unik berdasarkan `storageKey`, lalu menulis `AuditLog`.
2. Commit transaksi menjadi batas keberhasilan request. Request tidak menghapus object secara langsung; worker menjadi satu-satunya pemilik cleanup setelah penghapusan metadata.
3. Worker mengambil task melalui claim dan lease atomik sebelum menghapus object. Fence pada `attempts` dan waktu lease mencegah dua instance memproses atau menyelesaikan claim yang sama.
4. Delete bersifat idempotent: object yang sudah tidak ada dianggap berhasil. Kegagalan dijadwalkan ulang melalui `attempts` dan `nextAttemptAt` dengan exponential backoff berbatas maksimum; task penghapusan biasa baru dihapus setelah delete object berhasil.

Upload memakai tombstone durable sebelum object ditulis. Tombstone bertanda `repeatUntilCancelled` hanya dapat dikonsumsi oleh transaksi yang sekaligus membuat metadata `Attachment` dan `AuditLog` selama tombstone belum diklaim. Jika write atau transaksi metadata gagal, cleanup terlebih dahulu mengklaim tombstone secara atomik; worker terus menghapus object dan menjadwalkan tombstone berulang sampai service membatalkannya setelah write telah selesai dan delete terverifikasi. Karena worker tidak menyelesaikan sendiri tombstone berulang, crash proses atau object yang muncul terlambat setelah respons provider ambigu tetap dapat direkonsiliasi. Jika hasil commit metadata ambigu, kegagalan claim diikuti pemeriksaan `Attachment.storageKey`; object tidak dihapus ketika metadata telah commit atau hasilnya belum dapat dipastikan.

## 10. API MVP

### Auth

- `ALL /api/auth/*splat` — handler Better Auth pada Express 5.

### Users dan UPT

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `GET /api/upts`
- `POST /api/upts`
- `PATCH /api/upts/:id`

### Periode dan indikator

- `GET /api/periods`
- `POST /api/periods`
- `GET /api/periods/:id`
- `PATCH /api/periods/:id`
- `POST /api/periods/:id/indicators`
- `PATCH /api/indicators/:id`

### Laporan

- `GET /api/reports`
- `POST /api/reports`
- `GET /api/reports/:id`
- `PATCH /api/reports/:id`
- `POST /api/reports/:id/submit`
- `POST /api/reports/:id/request-revision`
- `POST /api/reports/:id/mark-reviewed`
- `POST /api/reports/:id/approve`
- `GET /api/reports/:id/history`

### Dokumen

- `POST /api/reports/:id/attachments`
- `GET /api/attachments/:id/download`
- `DELETE /api/attachments/:id` — hanya sebelum laporan diajukan.

### Dashboard dan rekap

- `GET /api/dashboard/summary`
- `GET /api/dashboard/by-upt`
- `GET /api/exports/reports.csv`

### Sistem

- `GET /health/live` — liveness proses; dilindungi session (System Administrator), rate-limit per menit.
- `GET /health/ready` — readiness database dan private file storage; dilindungi session, rate-limit per menit, deadline 8 detik per dependensi. Respons 503 `DEPENDENCY_TIMEOUT` bila pemeriksaan melebihi batas; `DATABASE_UNAVAILABLE` / `STORAGE_UNAVAILABLE` bila dependensi gagal. 503 yang diharapkan dicatat sebagai log `warn` `expected_service_unavailable`, bukan `error` `unhandled_error`.

## 11. Format API

Respons sukses:

```json
{
  "data": {},
  "meta": {}
}
```

Respons gagal:

```json
{
  "error": {
    "code": "REPORT_INVALID_STATUS",
    "message": "Laporan tidak dapat diajukan dari status saat ini.",
    "fields": []
  }
}
```

API menggunakan:

- JSON untuk data biasa.
- Multipart hanya untuk unggahan.
- Pagination untuk daftar.
- ISO 8601 untuk pertukaran waktu.
- Zona Asia/Jakarta untuk tampilan pengguna.

## 12. Keamanan

- HTTPS wajib pada produksi.
- CORS allowlist, bukan wildcard.
- Better Auth `trustedOrigins` dikonfigurasi eksplisit.
- Cookie `HttpOnly`, `Secure`, dan kebijakan `SameSite` yang sesuai topologi domain.
- Rate limit pada login, reset password, upload, dan ekspor.
- Security headers pada Next.js dan Express.
- Validasi seluruh body, params, query, dan file.
- ORM tidak menggantikan authorization; setiap query tetap dibatasi role/UPT.
- Secret disimpan sebagai environment variable.
- Log tidak memuat password, cookie, token, atau isi dokumen.
- Error handler produksi menghapus stack trace dari respons.

Untuk mengurangi masalah cookie dan CORS, deployment produksi disarankan memakai satu origin:

```text
https://simpatik.example.go.id       → Next.js
https://simpatik.example.go.id/api   → reverse proxy ke Express
```

## 13. Observability dan Operasional

- Structured application log.
- Request/correlation ID.
- Health check liveness untuk proses aplikasi serta readiness untuk database dan private file storage. Endpoint health hanya dapat diakses System Administrator dan dibatasi rate-limit; readiness memakai deadline per dependensi agar pemeriksaan tidak menggantung.
- Pencatatan error tanpa data sensitif.
- Monitoring waktu respons dan error rate.
- Backup PostgreSQL terjadwal.
- Backup atau versioning file storage.
- Prosedur restore diuji sebelum pilot.

## 14. Testing

### Frontend

- Unit test untuk helper, primitive yang dikustomisasi, dan reusable component kritis.
- Integration test untuk form, DataTable, filter, permission state, dan upload.
- Visual QA untuk loading, empty, error, disabled, responsive, dan focus state.
- E2E untuk alur tujuh role.

### Backend

- Unit test service dan aturan transisi.
- Integration test API dengan database test.
- Authorization test lintas role dan UPT.
- Upload validation test.
- Contract test respons API.

### Skenario kritis

- UPT A tidak dapat mengakses laporan UPT B.
- Laporan tidak lengkap tidak dapat diajukan.
- Petugas UPT tidak dapat mengajukan tanpa Koordinator UPT.
- SUBMITTED tidak dapat diedit.
- Permintaan revisi memerlukan catatan.
- Petugas Kanwil tidak dapat memberikan persetujuan akhir.
- Product Owner hanya dapat menyetujui laporan REVIEWED.
- APPROVED tidak dapat diubah.
- Dashboard sesuai laporan sumber.

## 15. Deployment

Komponen:

```text
Reverse proxy
├── Next.js process/container
└── Express.js process/container
      ├── PostgreSQL
      └── local persistent storage atau private S3/S3-compatible storage
```

Pipeline minimum:

1. Install dependency dengan lockfile.
2. Lint dan type-check.
3. Jalankan unit/integration test, termasuk contract test kedua storage driver.
4. Build frontend dan backend.
5. Jalankan Prisma migration terkontrol. Migration yang membuat tabel `StorageDeletionTask` dan migration berikutnya yang menambahkan `repeatUntilCancelled` wajib selesai sebelum backend baru dijalankan agar upload, request delete, dan worker tidak mengakses schema lama.
6. Deploy backend baru; worker penghapusan berjalan di lifecycle proses backend yang sama. Jangan ubah driver, bucket, atau prefix environment yang sudah berisi upload.
7. Jalankan readiness dan smoke test upload/download/delete sesuai aturan workflow.

`/health/ready` gagal bila database atau storage tidak siap dan hanya dapat diakses System Administrator (session) dengan rate-limit. Driver `local` membuat lalu menghapus file probe privat pada direktori yang dikonfigurasi. Driver `s3` menjalankan probe privat `PutObject`/`GetObject`/`DeleteObject` berbatas waktu pada key acak di namespace `.simpatik-storage-check/` di bawah `S3_KEY_PREFIX`; probe tidak memakai `HeadBucket` atau `ListBucket`. Liveness tidak bergantung pada storage. Pemeriksaan readiness dibatasi deadline per dependensi (8 detik); kegagalan deadline dikembalikan sebagai `503 DEPENDENCY_TIMEOUT`.

Environment S3 hanya dibaca dan divalidasi ketika `STORAGE_DRIVER=s3`. Deployment dengan driver `local` boleh menyisakan nilai `S3_*` yang tidak aktif tanpa memengaruhi startup.

Tidak ada migrasi otomatis atau dual-write antar-driver, bucket, maupun prefix. Cutover file yang sudah ada dilakukan sebagai operasi terencana:

1. Hentikan upload/delete atau aktifkan maintenance mode.
2. Salin seluruh object ke target dengan mempertahankan setiap logical `storageKey`; tambahkan `S3_KEY_PREFIX` hanya sebagai namespace target. Tidak perlu mengubah `Attachment.storageKey`.
3. Verifikasi jumlah, ukuran/checksum bila tersedia, metadata penting, serta sampel download melalui backend.
4. Ganti konfigurasi secara atomik, jalankan readiness dan smoke test, lalu buka kembali write traffic.
5. Pertahankan sumber untuk rollback sampai verifikasi dan masa retensi cutover selesai; hapus hanya melalui prosedur yang disetujui.

Backup disesuaikan dengan driver dan metadata PostgreSQL. `local` memerlukan backup terjadwal atas volume bersama; S3 sebaiknya mengaktifkan versioning dan, bila kebutuhan pemulihan menuntut, backup/replication terpisah. Lifecycle boleh membersihkan incomplete multipart upload dan versi lama hanya setelah retensinya selaras dengan kebijakan bukti, audit, backup, serta pemulihan. Uji restore file bersama restore metadata database; versioning dan lifecycle bukan pengganti pengujian restore.

## 16. Environment

Konfigurasi umum:

```text
NODE_ENV
WEB_URL
API_URL
DATABASE_URL
BETTER_AUTH_URL
BETTER_AUTH_SECRET
TRUSTED_ORIGINS
STORAGE_DRIVER=local|s3
STORAGE_BUCKET
MAX_UPLOAD_SIZE
```

Konfigurasi driver `s3`:

```text
S3_REGION
S3_ENDPOINT
S3_FORCE_PATH_STYLE
S3_KEY_PREFIX
```

- `STORAGE_BUCKET`: path direktori untuk `local`; nama bucket, tanpa URL atau prefix, untuk `s3`.
- `S3_REGION`: region signing/API yang diwajibkan provider.
- `S3_ENDPOINT`: kosong untuk AWS S3; URL HTTPS penuh untuk endpoint S3-compatible.
- `S3_FORCE_PATH_STYLE`: boolean eksplisit; `true` hanya bila endpoint memerlukan path-style addressing.
- `S3_KEY_PREFIX`: namespace object tanpa leading slash; boleh kosong, tetapi tidak boleh berubah setelah upload tanpa prosedur cutover.

Contoh deployment, bukan nilai default atau sertifikasi provider:

| Provider      | `S3_ENDPOINT`                                                       | `S3_REGION`                                      | `S3_FORCE_PATH_STYLE`            |
| ------------- | ------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------- |
| AWS S3        | kosong                                                              | region bucket, misalnya `ap-southeast-1`         | `false`                          |
| MinIO         | URL HTTPS deployment, misalnya `https://minio.example.go.id`        | region yang dikonfigurasi pada MinIO             | umumnya `true`; ikuti deployment |
| Cloudflare R2 | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`                     | nilai signing yang ditentukan R2, umumnya `auto` | ikuti dokumentasi endpoint       |
| Wasabi        | endpoint region, misalnya `https://s3.ap-southeast-1.wasabisys.com` | region bucket                                    | ikuti dokumentasi endpoint       |

SDK memakai AWS default credential provider chain, bukan nama credential khusus aplikasi. Variable standar yang relevan mencakup `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, dan opsional `AWS_SESSION_TOKEN`; profile lokal dapat memakai `AWS_PROFILE`, `AWS_SHARED_CREDENTIALS_FILE`, dan `AWS_CONFIG_FILE`; workload identity dapat memakai `AWS_ROLE_ARN` dan `AWS_WEB_IDENTITY_TOKEN_FILE`. Credential container/instance role ditemukan otomatis oleh provider chain. Produksi mengutamakan IAM role/workload identity; bila static secret tak terhindarkan, inject dari secret manager dan rotasi berkala.

Nilai rahasia tidak boleh menggunakan contoh default pada produksi. `S3_ENDPOINT`, `S3_REGION`, dan perilaku path-style untuk MinIO, R2, Wasabi, atau provider lain wajib diuji pada environment target karena dukungan ini configurable S3-compatible, bukan provider-certified.

## 17. Architecture Decision Records

### ADR-001 — Frontend dan backend dipisahkan

**Keputusan:** Next.js hanya menangani frontend; seluruh logika bisnis berada di Express API.  
**Konsekuensi:** Kontrak API, cookie, CORS, dan deployment dua aplikasi harus dikelola.

### ADR-002 — Express modular monolith

**Keputusan:** Satu aplikasi Express dengan module domain.  
**Konsekuensi:** Lebih mudah dioperasikan daripada microservices, tetapi batas antar-module harus dijaga melalui struktur kode.

### ADR-003 — Prisma dan PostgreSQL

**Keputusan:** Prisma Client dan Prisma Migrate digunakan untuk PostgreSQL.  
**Konsekuensi:** Migrasi menjadi bagian dari release dan query khusus tetap dapat menggunakan SQL terkontrol bila diperlukan.

### ADR-004 — Better Auth pada Express

**Keputusan:** Better Auth menjadi pemilik autentikasi dan session; authorization bisnis tetap dibuat di middleware/service SIMPATIK.  
**Konsekuensi:** Handler Better Auth harus dipasang dengan urutan middleware yang benar dan origin harus dikonfigurasi eksplisit.

## 18. Referensi Teknis

- [Express integration — Better Auth](https://better-auth.com/docs/integrations/express)
- [Security — Better Auth](https://www.better-auth.com/docs/reference/security)
- [Express.js 5 routing](https://expressjs.com/en/5x/guide/routing/)
- [Next.js data security](https://nextjs.org/docs/app/guides/data-security)
- [Prisma PostgreSQL connector](https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql)
- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate)
- [shadcn/ui untuk Next.js](https://ui.shadcn.com/docs/installation/next)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/base/data-table)
- [shadcn/ui forms](https://ui.shadcn.com/docs/forms)
