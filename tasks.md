# Tasks — SIMPATIK MVP 0–2 Bulan

**Versi:** 1.1  

Dokumen ini menerjemahkan [prd.md](./prd.md) dan [architecture.md](./architecture.md) menjadi backlog implementasi delapan minggu.

**Stack tetap:**

- Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Express.js 5 + TypeScript
- Better Auth
- Prisma
- PostgreSQL

---

## 1. Aturan Backlog

### Prioritas

- **P0:** wajib untuk MVP.
- **P1:** dikerjakan hanya jika semua P0 stabil.
- **Deferred:** di luar periode 0–2 bulan.

### Area

- **FE:** frontend Next.js.
- **BE:** backend Express.js.
- **DB:** Prisma dan PostgreSQL.
- **QA:** pengujian.
- **OPS:** deployment dan operasional.
- **DOC:** dokumentasi dan pelatihan.

### Definition of Ready

Task siap dikerjakan jika:

- Tujuan dan hasilnya jelas.
- Desain atau kontrak API tersedia bila diperlukan.
- Dependency utama selesai.
- Kriteria penerimaan dapat diuji.
- Data contoh atau aturan bisnis tersedia.

### Definition of Done

Task selesai jika:

- Implementasi telah direviu.
- Lint dan type-check lulus.
- Test yang relevan lulus.
- Hak akses telah diperiksa.
- Error dan empty state ditangani.
- Dokumentasi terkait diperbarui.
- Tidak ada secret atau data sensitif masuk repository/log.

## 2. Milestone

| Milestone | Target | Exit criteria |
|---|---|---|
| M1 — Foundation | Akhir Minggu 1 | Repository, environment, kontrak, dan CI dasar siap |
| M2 — Auth & Master | Akhir Minggu 2 | Login, tujuh role, UPT, pengguna, dan periode berfungsi |
| M3 — Reporting | Akhir Minggu 4 | UPT dapat membuat, menyimpan, dan mengajukan laporan |
| M4 — Review | Akhir Minggu 5 | Kanwil dapat meminta revisi dan menyetujui |
| M5 — Monitoring | Akhir Minggu 6 | Dashboard dan rekap CSV sesuai data |
| M6 — Release | Akhir Minggu 8 | UAT lulus, pilot dilatih, dan rilis awal tersedia |

---

## 3. Minggu 1 — Discovery dan Foundation

### Produk dan desain

- [ ] **PROD-001 [P0]** Validasi tujuan MVP dan non-goal dengan Product Owner.
- [ ] **PROD-002 [P0]** Konfirmasi tujuh role: Pimpinan, Product Owner, Petugas Kanwil, Koordinator UPT, Petugas UPT, Admin SIMPATIK, dan System Administrator.
- [ ] **PROD-003 [P0]** Kumpulkan nama serta kode resmi 12 UPT.
- [ ] **PROD-004 [P0]** Tentukan tipe laporan yang masuk MVP.
- [ ] **PROD-005 [P0]** Tentukan indikator, field wajib, dokumen wajib, dan tenggat.
- [ ] **PROD-006 [P0]** Finalisasi status DRAFT, SUBMITTED, REVISION_REQUIRED, REVIEWED, dan APPROVED.
- [ ] **UX-001 [P0]** Buat sitemap dan navigasi per role.
- [ ] **UX-002 [P0]** Buat wireframe login, dashboard, daftar laporan, form laporan, validasi Koordinator UPT, reviu Kanwil, dan persetujuan Product Owner.
- [ ] **UX-003 [P0]** Validasi wireframe dengan minimal satu perwakilan UPT dan Kanwil.
- [ ] **UX-004 [P0]** Buat inventory komponen reusable dan petakan primitive shadcn/ui yang digunakan.

### Repository dan tooling

- [x] **ENG-001 [P0]** Buat monorepo dengan `frontend`, `backend`, dan `packages/contracts`.
- [x] **ENG-002 [P0]** Konfigurasi TypeScript strict pada frontend dan backend.
- [x] **ENG-003 [P0]** Konfigurasi formatter, lint, dan editor settings.
- [ ] **ENG-004 [P0]** Tetapkan convention branch, commit, pull request, dan review.
- [x] **ENG-005 [P0]** Buat template `.env.example` tanpa nilai rahasia.
- [ ] **ENG-006 [P0]** Konfigurasi CI untuk install, lint, type-check, dan test.

### Frontend foundation

- [x] **FE-001 [P0]** Inisialisasi Next.js App Router dengan TypeScript.
- [x] **FE-002 [P0]** Pasang Tailwind CSS dan inisialisasi shadcn/ui pada aplikasi Next.js.
- [x] **FE-003 [P0]** Buat design tokens: warna, typography, spacing, radius, dan status.
- [x] **FE-004 [P0]** Buat layout aplikasi, sidebar, header, breadcrumb, dan responsive shell.
- [x] **FE-005 [P0]** Tambahkan primitive shadcn/ui: button, input, select, textarea, table, badge, dialog, dropdown, sheet, skeleton, toast, dan field.
- [x] **FE-006 [P0]** Tetapkan struktur `components/ui`, `components/shared`, dan `features/*/components`.
- [x] **FE-007 [P0]** Buat reusable PageHeader, StatusBadge, ConfirmDialog, EmptyState, LoadingState, dan PermissionGate.
- [x] **FE-008 [P0]** Buat reusable DataTable, FilterBar, FormField, FileUpload, dan DashboardCard dengan props bertipe.
- [x] **FE-009 [P0]** Buat halaman katalog internal untuk memeriksa variasi dan state komponen.
- [x] **FE-010 [P0]** Verifikasi keyboard navigation, focus state, label, dan error state komponen dasar.

### Backend foundation

- [x] **BE-001 [P0]** Inisialisasi Express.js 5 dengan TypeScript dan ESM.
- [x] **BE-002 [P0]** Pisahkan `app.ts` dan `server.ts` untuk testability.
- [x] **BE-003 [P0]** Buat config loader dan validasi environment.
- [x] **BE-004 [P0]** Buat response envelope dan katalog error code.
- [x] **BE-005 [P0]** Buat global 404 dan error-handling middleware.
- [x] **BE-006 [P0]** Buat request ID dan structured logger.
- [x] **BE-007 [P0]** Tambahkan `/health/live` dan `/health/ready`.

### Database

- [ ] **DB-001 [P0]** Siapkan PostgreSQL development dan test.
- [x] **DB-002 [P0]** Inisialisasi Prisma schema dan Prisma Client.
- [x] **DB-003 [P0]** Buat migration baseline.
- [ ] **DB-004 [P0]** Buat seed awal untuk 12 UPT dan akun Admin SIMPATIK development.

### Exit Minggu 1

- [ ] Scope dan wireframe disetujui.
- [ ] Frontend serta backend dapat dijalankan lokal.
- [ ] CI dasar lulus.
- [ ] PostgreSQL dan migration baseline tersedia.

---

## 4. Minggu 2 — Authentication, Role, dan Master Data

### Better Auth

- [x] **AUTH-001 [P0]** Integrasikan Better Auth pada Express menggunakan Prisma adapter.
- [x] **AUTH-002 [P0]** Mount handler Better Auth sebelum `express.json()`.
- [x] **AUTH-003 [P0]** Aktifkan email/password login dan session database.
- [x] **AUTH-004 [P0]** Konfigurasi `BETTER_AUTH_SECRET`, base URL, cookie, dan trusted origins.
- [x] **AUTH-005 [P0]** Konfigurasi CORS allowlist dan credentials.
- [x] **AUTH-006 [P0]** Tambahkan tujuh nilai role, `uptId`, dan status aktif pada user.
- [x] **AUTH-007 [P0]** Buat middleware `requireSession`.
- [x] **AUTH-008 [P0]** Buat middleware `requireRole`.
- [x] **AUTH-009 [P0]** Buat middleware pembatasan UPT.
- [x] **AUTH-010 [P0]** Pastikan akun tidak aktif tidak dapat membuat session baru.
- [x] **AUTH-011 [P0]** Tambahkan rate limit pada endpoint autentikasi.
- [x] **AUTH-012 [P0]** Terapkan permission matrix tujuh role dan segregation of duties.
- [x] **AUTH-013 [P0]** Pastikan System Administrator tidak memiliki akses substansi laporan secara default.

### Halaman auth

- [x] **FE-101 [P0]** Buat halaman login.
- [x] **FE-102 [P0]** Buat auth client dan session provider.
- [x] **FE-103 [P0]** Buat route guard/redirect untuk pengalaman pengguna.
- [x] **FE-104 [P0]** Buat halaman akses ditolak.
- [x] **FE-105 [P0]** Buat menu berdasarkan role.

### User dan UPT

- [x] **DB-101 [P0]** Finalisasi model User dan UPT.
- [x] **BE-101 [P0]** Buat API daftar, tambah, ubah, aktifkan, dan nonaktifkan pengguna.
- [x] **BE-102 [P0]** Buat API daftar dan ubah metadata UPT.
- [x] **FE-106 [P0]** Buat halaman manajemen pengguna.
- [x] **FE-107 [P0]** Buat halaman master UPT.
- [x] **QA-101 [P0]** Uji matriks role dan penolakan akses API langsung.

### Periode

- [x] **DB-102 [P0]** Buat model ReportingPeriod dan Indicator.
- [x] **BE-103 [P0]** Buat CRUD periode.
- [x] **BE-104 [P0]** Buat CRUD indikator dan dokumen wajib.
- [x] **FE-108 [P0]** Buat halaman daftar dan form periode.
- [x] **FE-109 [P0]** Buat halaman konfigurasi indikator.

### Exit Minggu 2

- [ ] Tujuh role dapat login dan memperoleh menu yang sesuai.
- [ ] Pembatasan UPT lulus test.
- [ ] Admin SIMPATIK dapat mengelola pengguna, UPT, dan periode; Product Owner dapat mengesahkan indikator.

---

## 5. Minggu 3 — Data Laporan dan Form Draf

### Database laporan

- [x] **DB-201 [P0]** Buat model Report, ReportItem, dan constraint laporan unik.
- [x] **DB-202 [P0]** Tambahkan indeks daftar laporan per periode, status, dan UPT.
- [ ] **DB-203 [P0]** Buat migration dan seed laporan development.

### API laporan

- [x] **BE-201 [P0]** Buat repository dan service laporan.
- [x] **BE-202 [P0]** Buat API daftar laporan dengan pagination dan filter.
- [x] **BE-203 [P0]** Buat API membuat laporan DRAFT.
- [x] **BE-204 [P0]** Buat API detail laporan.
- [x] **BE-205 [P0]** Buat API memperbarui draf dan item laporan.
- [x] **BE-206 [P0]** Terapkan unique constraint dan respons konflik.
- [x] **BE-207 [P0]** Terapkan pembatasan UPT pada seluruh query laporan.

### Frontend laporan

- [x] **FE-201 [P0]** Buat halaman daftar laporan UPT memakai reusable DataTable.
- [x] **FE-202 [P0]** Buat filter periode dan status memakai reusable FilterBar.
- [x] **FE-203 [P0]** Buat form laporan berbasis indikator memakai primitive shadcn/ui dan reusable FormField.
- [x] **FE-204 [P0]** Implementasikan simpan draf.
- [x] **FE-205 [P0]** Buat indikator status simpan, loading, error, dan retry.
- [x] **FE-206 [P0]** Buat halaman detail read-only sesuai status memakai PageHeader, StatusBadge, dan EmptyState.

### Testing

- [x] **QA-201 [P0]** Test pembuatan laporan dan duplikasi.
- [x] **QA-202 [P0]** Test UPT A tidak dapat membaca/mengubah laporan UPT B.
- [x] **QA-203 [P0]** Test pagination dan filter.

### Exit Minggu 3

- [ ] Petugas UPT dapat membuat dan menyimpan draf.
- [ ] Data draf aman dari akses lintas UPT.

---

## 6. Minggu 4 — Validasi, Upload, dan Pengajuan

### Validasi laporan

- [x] **BE-301 [P0]** Buat schema validasi payload laporan.
- [x] **BE-302 [P0]** Buat pemeriksaan kelengkapan sebelum submit.
- [x] **BE-303 [P0]** Kembalikan field error yang dapat dipetakan ke form.
- [x] **FE-301 [P0]** Tampilkan error per field dan ringkasan error.
- [x] **FE-302 [P0]** Buat halaman/step konfirmasi sebelum pengajuan.

### Dokumen

- [x] **OPS-201 [P0]** Tentukan driver dan lokasi private file storage.
- [x] **DB-301 [P0]** Buat model Attachment.
- [x] **BE-304 [P0]** Buat upload endpoint dengan batas ukuran dan allowlist tipe.
- [x] **BE-305 [P0]** Gunakan storage key acak dan simpan metadata file.
- [x] **BE-306 [P0]** Buat download endpoint dengan authorization.
- [x] **BE-307 [P0]** Buat delete endpoint hanya untuk laporan yang masih dapat diedit.
- [x] **FE-303 [P0]** Buat komponen upload, progress, error, daftar file, dan hapus.
- [x] **QA-301 [P0]** Test tipe/ukuran file tidak valid dan akses download lintas UPT.

### Pengajuan

- [x] **DB-302 [P0]** Buat model StatusHistory.
- [x] **BE-308 [P0]** Implementasikan transisi DRAFT/REVISION_REQUIRED ke SUBMITTED khusus Koordinator UPT.
- [x] **BE-309 [P0]** Jalankan perubahan status dan histori dalam transaksi Prisma.
- [x] **BE-310 [P0]** Kunci perubahan substansi saat status SUBMITTED.
- [x] **BE-311 [P0]** Verifikasi Koordinator UPT dan Petugas UPT berasal dari UPT yang sama.
- [x] **FE-304 [P0]** Buat antrean validasi dan aksi pengajuan khusus Koordinator UPT.
- [x] **FE-305 [P0]** Tampilkan timeline histori status.
- [x] **FE-306 [P0]** Buat ConfirmDialog reusable untuk pengajuan laporan.

### Exit Minggu 4

- [ ] Laporan lengkap dapat diajukan.
- [ ] Laporan tidak lengkap ditolak dengan alasan jelas.
- [ ] Dokumen privat hanya dapat diakses pengguna berwenang.

---

## 7. Minggu 5 — Reviu Kanwil dan Persetujuan Product Owner

### Antrean reviu

- [x] **BE-401 [P0]** Buat query antrean laporan SUBMITTED.
- [x] **FE-401 [P0]** Buat halaman antrean reviu Kanwil memakai reusable DataTable dan FilterBar.
- [x] **FE-402 [P0]** Buat detail laporan dengan indikator, dokumen, StatusBadge, dan timeline.

### Catatan dan revisi

- [x] **DB-401 [P0]** Buat model ReviewComment.
- [x] **BE-402 [P0]** Buat endpoint catatan reviu.
- [x] **BE-403 [P0]** Implementasikan transisi SUBMITTED ke REVISION_REQUIRED.
- [x] **BE-404 [P0]** Wajibkan catatan saat meminta revisi.
- [x] **FE-403 [P0]** Buat form catatan dan aksi minta revisi.
- [x] **FE-404 [P0]** Tampilkan catatan pada halaman Petugas UPT.

### Penyelesaian reviu dan persetujuan

- [x] **BE-405 [P0]** Implementasikan transisi SUBMITTED ke REVIEWED khusus Petugas Kanwil.
- [x] **BE-406 [P0]** Simpan reviewer dan waktu penyelesaian reviu.
- [x] **BE-407 [P0]** Cegah perubahan laporan APPROVED.
- [x] **BE-408 [P0]** Implementasikan transisi REVIEWED ke APPROVED khusus Product Owner.
- [x] **BE-409 [P0]** Simpan approver dan waktu persetujuan akhir.
- [x] **FE-405 [P0]** Buat aksi tandai selesai direviu untuk Petugas Kanwil.
- [x] **FE-406 [P0]** Buat antrean persetujuan dan ConfirmDialog untuk Product Owner.
- [x] **QA-401 [P0]** Test seluruh transisi valid dan tidak valid.
- [x] **QA-402 [P0]** Test hanya Petugas Kanwil yang dapat meminta revisi/menandai REVIEWED.
- [x] **QA-403 [P0]** Test hanya Product Owner yang dapat menyetujui laporan REVIEWED.

### Exit Minggu 5

- [ ] Satu siklus DRAFT → SUBMITTED → REVISION_REQUIRED → SUBMITTED → REVIEWED → APPROVED berhasil.
- [ ] Histori pelaku, waktu, dan catatan lengkap.

---

## 8. Minggu 6 — Dashboard, Rekap, dan Audit

### Dashboard

- [x] **BE-501 [P0]** Buat query ringkasan per status.
- [x] **BE-502 [P0]** Buat query status per UPT.
- [x] **BE-503 [P0]** Buat query UPT belum mengirim dan terlambat.
- [x] **BE-504 [P0]** Tambahkan indeks berdasarkan hasil query plan.
- [x] **FE-501 [P0]** Buat kartu ringkasan status memakai reusable DashboardCard.
- [x] **FE-502 [P0]** Buat tabel status 12 UPT memakai reusable DataTable.
- [x] **FE-503 [P0]** Buat filter periode, UPT, dan status memakai reusable FilterBar.
- [x] **FE-504 [P0]** Buat drill-down dari dashboard ke daftar laporan.
- [x] **FE-505 [P0]** Buat tampilan read-only Pimpinan.

### Rekap

- [ ] **PROD-501 [P0]** Konfirmasi kolom rekap CSV.
- [x] **BE-505 [P0]** Buat endpoint ekspor CSV.
- [x] **BE-506 [P0]** Cantumkan periode, filter, waktu, dan pembuat ekspor.
- [x] **FE-506 [P0]** Buat aksi unduh rekap.

### Audit

- [x] **DB-501 [P0]** Buat model AuditLog dan indeks.
- [x] **BE-507 [P0]** Buat audit service.
- [x] **BE-508 [P0]** Catat perubahan akun, konfigurasi, laporan, status, dan dokumen.
- [x] **BE-509 [P0]** Pastikan log tidak menyimpan password, cookie, token, atau isi file.
- [ ] **FE-507 [P1]** Buat halaman audit sederhana untuk Admin SIMPATIK dan akses teknis terbatas System Administrator bila waktu tersedia.

### Exit Minggu 6

- [ ] Dashboard sesuai data laporan sumber.
- [ ] Rekap CSV dapat dibuat tanpa perhitungan manual.
- [ ] Aktivitas utama masuk audit log.

---

## 9. Minggu 7 — Hardening, QA, dan UAT

### Security

- [ ] **SEC-001 [P0]** Audit seluruh endpoint terhadap autentikasi, role, dan UPT.
- [ ] **SEC-002 [P0]** Aktifkan HTTPS pada staging.
- [ ] **SEC-003 [P0]** Verifikasi cookie, trusted origins, CORS, dan credentials.
- [ ] **SEC-004 [P0]** Tambahkan security headers dan rate limit.
- [ ] **SEC-005 [P0]** Uji upload berbahaya, MIME palsu, file terlalu besar, dan path traversal.
- [x] **SEC-006 [P0]** Verifikasi error produksi tidak memuat stack trace atau detail database.
- [ ] **SEC-007 [P0]** Jalankan dependency audit dan tangani temuan kritis.

### Testing

- [x] **QA-501 [P0]** Unit test aturan bisnis dan service.
- [ ] **QA-502 [P0]** Integration test API utama.
- [ ] **QA-503 [P0]** E2E login dan alur Petugas UPT.
- [ ] **QA-504 [P0]** E2E validasi dan pengajuan Koordinator UPT.
- [ ] **QA-505 [P0]** E2E reviu Petugas Kanwil dan persetujuan Product Owner.
- [ ] **QA-506 [P0]** Uji browser target dan responsive layout.
- [x] **QA-507 [P0]** Rekonsiliasi dashboard/CSV dengan query sumber.
- [ ] **QA-508 [P0]** Lakukan performance smoke test.
- [ ] **QA-509 [P0]** E2E dashboard Pimpinan dan pembatasan System Administrator.
- [ ] **QA-510 [P0]** Uji reusable component pada loading, empty, error, disabled, dan permission state.

### Operasional

- [ ] **OPS-301 [P0]** Buat staging environment.
- [ ] **OPS-302 [P0]** Buat pipeline build dan deployment.
- [ ] **OPS-303 [P0]** Buat prosedur Prisma migration.
- [ ] **OPS-304 [P0]** Konfigurasi backup PostgreSQL.
- [ ] **OPS-305 [P0]** Konfigurasi backup/versioning file.
- [ ] **OPS-306 [P0]** Uji restore database dan satu dokumen.
- [ ] **OPS-307 [P0]** Buat monitoring health check dan error log.

### UAT

- [ ] **UAT-001 [P0]** Siapkan akun dan data UAT.
- [ ] **UAT-002 [P0]** Jalankan skenario UAT pada seluruh role.
- [ ] **UAT-003 [P0]** Klasifikasikan defect menjadi critical, major, minor.
- [ ] **UAT-004 [P0]** Perbaiki seluruh defect critical dan major yang disepakati.
- [ ] **UAT-005 [P0]** Dapatkan persetujuan hasil UAT.

### Exit Minggu 7

- [ ] Tidak ada defect kritis terbuka.
- [ ] Pembatasan lintas UPT lulus.
- [ ] Backup dan restore berhasil diuji.
- [ ] Product Owner menyetujui hasil UAT atau daftar pengecualian.

---

## 10. Minggu 8 — Pilot, Pelatihan, dan Rilis

### Dokumentasi

- [ ] **DOC-001 [P0]** Buat manual Admin SIMPATIK.
- [ ] **DOC-002 [P0]** Buat manual Petugas UPT.
- [ ] **DOC-003 [P0]** Buat manual Koordinator UPT.
- [ ] **DOC-004 [P0]** Buat manual Petugas Kanwil.
- [ ] **DOC-005 [P0]** Buat manual Product Owner dan panduan dashboard Pimpinan.
- [ ] **DOC-006 [P0]** Buat runbook System Administrator untuk deployment, backup, restore, dan incident.
- [ ] **DOC-007 [P0]** Buat FAQ dan jalur dukungan.

### Pilot

- [ ] **PILOT-001 [P0]** Tentukan UPT pilot dan peserta.
- [ ] **PILOT-002 [P0]** Buat akun serta periode pilot.
- [ ] **PILOT-003 [P0]** Lakukan pelatihan sesuai tujuh role.
- [ ] **PILOT-004 [P0]** Jalankan satu siklus laporan pilot.
- [ ] **PILOT-005 [P0]** Catat masalah dan umpan balik.
- [ ] **PILOT-006 [P0]** Perbaiki blocker implementasi.

### Rilis

- [ ] **REL-001 [P0]** Bekukan scope release.
- [ ] **REL-002 [P0]** Verifikasi migration dan seed produksi.
- [ ] **REL-003 [P0]** Verifikasi domain, HTTPS, cookie, CORS, dan trusted origins.
- [ ] **REL-004 [P0]** Verifikasi akun Admin SIMPATIK, Product Owner, dan System Administrator awal.
- [ ] **REL-005 [P0]** Jalankan backup pra-rilis.
- [ ] **REL-006 [P0]** Deploy frontend dan backend.
- [ ] **REL-007 [P0]** Jalankan smoke test produksi.
- [ ] **REL-008 [P0]** Aktifkan monitoring dan jalur dukungan.
- [ ] **REL-009 [P0]** Dapatkan persetujuan implementasi awal.

### Exit Minggu 8

- [ ] Siklus pilot berhasil.
- [ ] Manual dan pelatihan selesai.
- [ ] Aplikasi tersedia pada lingkungan produksi/pilot.
- [ ] Pemilik produk menerima MVP.

---

## 11. Test Matrix Role

| Aksi | Pimpinan | Product Owner | Petugas Kanwil | Koordinator UPT | Petugas UPT | Admin SIMPATIK | System Administrator |
|---|---:|---:|---:|---:|---:|---:|---:|
| Kelola pengguna/UPT | Tidak | Tidak | Tidak | Tidak | Tidak | Ya | Tidak |
| Kelola periode | Tidak | Tidak | Tidak | Tidak | Tidak | Ya | Tidak |
| Sahkan indikator | Tidak | Ya | Tidak | Tidak | Tidak | Konfigurasi | Tidak |
| Buat/ubah draf UPT | Tidak | Tidak | Tidak | Baca/validasi | Ya, UPT sendiri | Tidak | Tidak |
| Ajukan laporan | Tidak | Tidak | Tidak | Ya, UPT sendiri | Tidak | Tidak | Tidak |
| Minta revisi | Tidak | Tidak | Ya | Tidak | Tidak | Tidak | Tidak |
| Tandai REVIEWED | Tidak | Tidak | Ya | Tidak | Tidak | Tidak | Tidak |
| Setujui laporan | Tidak | Ya, jika REVIEWED | Tidak | Tidak | Tidak | Tidak | Tidak |
| Lihat dashboard | Ya | Ya | Ya | Terbatas UPT | Terbatas UPT | Operasional | Tidak |
| Unduh rekap | Ya | Ya | Ya | Opsional, UPT sendiri | Tidak | Opsional | Tidak |
| Lihat audit bisnis | Tidak | Opsional | Tidak | Tidak | Tidak | Ya | Tidak |
| Health check/log teknis/backup | Tidak | Tidak | Tidak | Tidak | Tidak | Tidak | Ya |

Setiap sel “Tidak” wajib memiliki negative API test, bukan hanya pemeriksaan tampilan.

## 12. Release Checklist

### Product

- [ ] Scope P0 terkunci.
- [ ] Data 12 UPT tervalidasi.
- [ ] Indikator dan dokumen wajib disahkan.
- [ ] Format rekap disahkan.

### Engineering

- [ ] Lint, type-check, unit test, integration test, dan E2E lulus.
- [ ] Primitive shadcn/ui dan reusable component utama lulus visual serta accessibility QA.
- [ ] Migration produksi direviu.
- [ ] Seed tidak mengandung password default yang lemah.
- [ ] Environment variable produksi lengkap.
- [ ] Source map dan error detail tidak terekspos ke pengguna.

### Security

- [ ] HTTPS aktif.
- [ ] Cookie aman.
- [ ] CORS dan trusted origins tepat.
- [ ] Rate limit aktif.
- [ ] Authorization lintas UPT lulus.
- [ ] Upload validation lulus.
- [ ] Secret tidak ada dalam repository.

### Operations

- [ ] Backup database berhasil.
- [ ] Restore diuji.
- [ ] File storage privat.
- [ ] Health check dan log aktif.
- [ ] Runbook dan kontak dukungan tersedia.

### User readiness

- [ ] Manual tersedia.
- [ ] Pelatihan selesai.
- [ ] Akun pilot aktif.
- [ ] UAT ditandatangani.

## 13. Deferred Backlog

Item berikut tidak boleh mengganggu penyelesaian P0:

- [ ] Modul pengaduan lengkap.
- [ ] Modul gratifikasi.
- [ ] Modul hukuman disiplin lengkap.
- [ ] Risk scoring otomatis.
- [ ] Notifikasi email/WhatsApp.
- [ ] Integrasi WBS, kepegawaian, atau Srikandi.
- [ ] Aplikasi mobile.
- [ ] Microservices.
- [ ] Analitik lanjutan.
- [ ] Migrasi arsip historis skala besar.
