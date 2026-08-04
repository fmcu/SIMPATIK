# Product Requirements Document — SIMPATIK MVP

**Produk:** Sistem Monitoring dan Pelaporan Kepatuhan Internal Keimigrasian  
**Versi:** 1.1  
**Status:** Draft untuk validasi  
**Horizon:** 0–2 bulan  
**Cakupan organisasi:** Kanwil Direktorat Jenderal Imigrasi Jawa Timur dan 12 UPT  
**Arsitektur:** Next.js frontend + Express.js backend + Prisma + PostgreSQL  
**UI:** Tailwind CSS + shadcn/ui + reusable components

---

## 1. Ringkasan

SIMPATIK MVP adalah website internal untuk mengumpulkan laporan kepatuhan dari 12 UPT, memeriksa kelengkapan laporan di tingkat Kanwil, meminta revisi, memberikan persetujuan, dan menampilkan status pelaporan pada dashboard dasar.

MVP menggantikan pelaporan yang tersebar melalui WhatsApp, email, Srikandi, dan dokumen manual dengan satu alur kerja serta basis data terpusat.

## 2. Masalah yang Diselesaikan

- Laporan dan dokumen tersebar pada beberapa media.
- Format dan kelengkapan laporan antar-UPT tidak konsisten.
- Status laporan sulit dipantau secara langsung.
- Catatan revisi dan histori persetujuan tidak tertelusur dengan baik.
- Rekap pelaporan membutuhkan pekerjaan manual.
- Pimpinan belum memiliki dashboard ringkas untuk seluruh UPT.

## 3. Tujuan MVP

1. Menyediakan satu tempat resmi untuk pengiriman laporan UPT.
2. Menstandarkan periode, format, indikator, dan dokumen wajib.
3. Menyediakan alur draf, pengajuan, revisi, dan persetujuan.
4. Menampilkan status pelaporan seluruh UPT pada dashboard dasar.
5. Menghasilkan rekap periode tanpa penghitungan manual.
6. Menyimpan histori perubahan dan aktivitas penting.
7. Menyediakan manual penggunaan, pelatihan, pilot, dan implementasi awal.

## 4. Non-Goal

Fitur berikut tidak termasuk MVP 0–2 bulan:

- Kanal pengaduan publik.
- Modul gratifikasi dan hukuman disiplin lengkap.
- Penilaian risiko otomatis.
- Notifikasi email, WhatsApp, atau push notification.
- Integrasi WBS, kepegawaian, Srikandi, atau sistem eksternal lain.
- Aplikasi mobile Android/iOS.
- Migrasi seluruh arsip historis.
- Analitik lanjutan dan microservices.

## 5. Pengguna dan Role

MVP menggunakan tujuh role dengan pemisahan kewenangan bisnis, unit, dan operasional teknis.

| Role | Cakupan | Kewenangan |
|---|---|---|
| Pimpinan | Seluruh UPT, baca saja | Melihat dashboard, detail laporan sesuai izin, dan mengunduh rekap |
| Product Owner | Seluruh UPT | Menetapkan aturan bisnis, mengesahkan indikator, dan memberikan persetujuan akhir laporan |
| Petugas Kanwil | Seluruh UPT | Memeriksa laporan, memberi catatan, meminta revisi, dan menandai laporan selesai direviu |
| Koordinator UPT | UPT sendiri | Memvalidasi kelengkapan dan mengajukan laporan unit ke Kanwil |
| Petugas UPT | UPT sendiri | Membuat draf, mengubah isi, mengunggah bukti, dan memperbaiki laporan |
| Admin SIMPATIK | Seluruh sistem administratif | Mengelola akun, role, UPT, periode, dan konfigurasi operasional |
| System Administrator | Teknis, tanpa akses substansi default | Menjaga deployment, konfigurasi teknis, backup, health check, dan log teknis |

### Aturan akses

- Pendaftaran publik tidak tersedia.
- Akun dibuat atau diaktifkan oleh Admin SIMPATIK.
- Pengguna UPT hanya dapat mengakses data UPT sendiri.
- Hak akses diperiksa di backend, bukan hanya disembunyikan di frontend.
- Pimpinan tidak dapat mengubah substansi laporan.
- System Administrator tidak memperoleh akses substansi laporan secara otomatis.
- Petugas Kanwil menyelesaikan reviu; persetujuan akhir dilakukan Product Owner.

## 6. Ruang Lingkup MVP

### 6.1 Autentikasi

- Login menggunakan email/username dan password.
- Logout dan manajemen session.
- Perubahan atau reset password oleh mekanisme yang disetujui.
- Penonaktifan akun.
- Pembatasan akses berdasarkan role dan UPT.

### 6.2 Design system dan reusable component

- Tailwind CSS menjadi dasar styling dan design token.
- shadcn/ui digunakan sebagai primitive component yang dapat dimodifikasi di source code aplikasi.
- Komponen berulang diekstrak menjadi reusable component dengan API props yang konsisten.
- Komponen minimum: PageHeader, DataTable, FilterBar, FormField, StatusBadge, ConfirmDialog, FileUpload, EmptyState, LoadingState, dan DashboardCard.
- Komponen wajib menangani loading, empty, error, disabled, dan permission state yang relevan.
- Feature component tetap berada pada module fitur bila belum digunakan lintas fitur.

### 6.3 Master data

- Data Kanwil dan 12 UPT.
- Data pengguna dan penempatan UPT.
- Periode pelaporan.
- Tenggat pelaporan.
- Indikator atau item laporan.
- Daftar dokumen wajib.

### 6.4 Pelaporan UPT

- Petugas UPT membuat dan menyimpan draf.
- Petugas UPT mengisi nilai/capaian, narasi, dan dokumen pendukung.
- Sistem memvalidasi field dan dokumen wajib.
- Koordinator UPT memvalidasi dan mengajukan laporan ke Kanwil.
- Petugas UPT melihat catatan revisi dan memperbaiki laporan.
- Koordinator UPT mengajukan ulang laporan yang telah diperbaiki.

### 6.5 Reviu Kanwil dan persetujuan Product Owner

- Petugas Kanwil melihat antrean laporan masuk.
- Petugas Kanwil membuka detail, dokumen, dan histori.
- Petugas Kanwil memberi catatan atau mengembalikan laporan untuk diperbaiki.
- Petugas Kanwil menandai laporan selesai direviu.
- Product Owner memberikan persetujuan akhir.

### 6.6 Dashboard dan rekap

- Ringkasan jumlah laporan per status.
- Status setiap UPT pada periode terpilih.
- Daftar UPT yang belum mengirim atau terlambat.
- Filter berdasarkan periode, UPT, dan status.
- Drill-down dari angka dashboard ke daftar laporan.
- Ekspor rekap minimum ke CSV.

### 6.7 Audit minimum

- Login berhasil/gagal yang relevan.
- Pembuatan dan perubahan laporan.
- Validasi unit, pengajuan, reviu, revisi, dan persetujuan.
- Perubahan akun, role, periode, dan indikator.
- Pengunggahan serta penghapusan dokumen sebelum laporan diajukan.
- Aksi teknis istimewa System Administrator.

## 7. Status Laporan

| Status | Makna | Role yang dapat melakukan transisi |
|---|---|---|
| DRAFT | Laporan sedang disusun | Petugas UPT |
| SUBMITTED | Laporan sudah divalidasi dan diajukan ke Kanwil | Koordinator UPT |
| REVISION_REQUIRED | Kanwil meminta perbaikan | Petugas Kanwil |
| REVIEWED | Pemeriksaan Kanwil selesai dan menunggu keputusan akhir | Petugas Kanwil |
| APPROVED | Laporan disetujui dan menjadi data resmi | Product Owner |

Alur utama:

```text
DRAFT → SUBMITTED → REVIEWED → APPROVED
             ↓
      REVISION_REQUIRED → SUBMITTED
```

## 8. User Stories

### Admin SIMPATIK

- Sebagai Admin SIMPATIK, saya ingin membuat akun dan menetapkan role agar pengguna memperoleh akses yang benar.
- Sebagai Admin SIMPATIK, saya ingin membuka periode dan menentukan tenggat agar UPT mengetahui laporan yang harus dikirim.

### Product Owner

- Sebagai Product Owner, saya ingin mengesahkan indikator dan aturan bisnis agar format pelaporan sesuai kebutuhan organisasi.
- Sebagai Product Owner, saya ingin menyetujui laporan yang telah direviu Kanwil agar data menjadi rekap resmi.

### Petugas UPT

- Sebagai Petugas UPT, saya ingin menyimpan laporan sebagai draf agar dapat mengisinya bertahap.
- Sebagai Petugas UPT, saya ingin mengetahui data yang belum lengkap sebelum validasi unit.
- Sebagai Petugas UPT, saya ingin melihat catatan revisi agar dapat memperbaiki laporan.

### Koordinator UPT

- Sebagai Koordinator UPT, saya ingin memvalidasi kelengkapan laporan agar hanya laporan layak yang diajukan ke Kanwil.

### Petugas Kanwil

- Sebagai Petugas Kanwil, saya ingin melihat antrean laporan agar mengetahui laporan yang perlu diperiksa.
- Sebagai Petugas Kanwil, saya ingin meminta revisi dengan alasan agar perbaikan terdokumentasi.
- Sebagai Petugas Kanwil, saya ingin menandai laporan selesai direviu agar Product Owner dapat memberikan keputusan akhir.

### Pimpinan

- Sebagai Pimpinan, saya ingin melihat status 12 UPT agar dapat mengetahui keterlambatan dan kemajuan pelaporan.
- Sebagai Pimpinan, saya ingin mengunduh rekap agar dapat digunakan untuk evaluasi.

### System Administrator

- Sebagai System Administrator, saya ingin memantau health check, log teknis, backup, dan deployment tanpa otomatis membaca substansi laporan.

## 9. Kebutuhan Fungsional

| ID | Prioritas | Kebutuhan | Kriteria penerimaan |
|---|---|---|---|
| AUTH-01 | P0 | Pengguna dapat login menggunakan akun aktif. | Kredensial valid membuat session; akun tidak aktif ditolak tanpa membocorkan informasi sensitif. |
| AUTH-02 | P0 | Backend menerapkan role dan cakupan UPT. | Petugas UPT tidak dapat membaca atau mengubah data UPT lain, termasuk melalui URL/API langsung. |
| AUTH-03 | P0 | Admin SIMPATIK dapat membuat, mengubah, dan menonaktifkan akun. | Semua perubahan akun tercatat dan histori transaksi pengguna tetap tersedia. |
| MST-01 | P0 | Admin SIMPATIK mengelola 12 UPT. | UPT dapat diaktifkan/dinonaktifkan tanpa menghapus histori laporan. |
| MST-02 | P0 | Admin SIMPATIK mengelola periode, tenggat, dan status periode. | Hanya periode aktif yang dapat menerima laporan baru. |
| MST-03 | P0 | Product Owner mengesahkan indikator dan dokumen wajib yang dikonfigurasi pada sistem. | Perubahan konfigurasi tidak mengubah laporan periode yang telah berjalan tanpa versi. |
| RPT-01 | P0 | Petugas UPT membuat satu laporan per UPT, periode, dan tipe. | Duplikasi laporan aktif ditolak oleh validasi dan constraint database. |
| RPT-02 | P0 | Laporan dapat disimpan sebagai draf. | Data tersimpan tanpa harus lengkap dan hanya dapat diubah role berwenang. |
| RPT-03 | P0 | Sistem memvalidasi laporan sebelum pengajuan. | Pengajuan gagal dengan daftar kesalahan spesifik jika field atau dokumen wajib belum lengkap. |
| RPT-04 | P0 | Petugas UPT mengunggah dokumen pendukung. | File memiliki metadata, batas ukuran/tipe, nama aman, dan hanya dapat diakses pengguna berwenang. |
| RPT-05 | P0 | Koordinator UPT mengajukan dan mengajukan ulang laporan yang telah divalidasi. | Status dan waktu pengajuan tercatat; laporan terkunci selama reviu. |
| REV-01 | P0 | Petugas Kanwil meminta revisi dengan catatan. | Status berubah ke REVISION_REQUIRED dan catatan dapat dilihat UPT terkait. |
| REV-02 | P0 | Petugas Kanwil menandai laporan selesai direviu. | Status berubah ke REVIEWED dan reviewer serta waktu tersimpan. |
| REV-03 | P0 | Product Owner memberikan persetujuan akhir. | Status berubah ke APPROVED, approver/waktu tercatat, dan data masuk ke rekap resmi. |
| REV-04 | P0 | Sistem menyimpan histori status. | Pelaku, status asal, status tujuan, waktu, dan catatan dapat ditelusuri. |
| DSH-01 | P0 | Dashboard menampilkan jumlah laporan per status. | Angka sesuai data sumber pada periode dan filter yang dipilih. |
| DSH-02 | P0 | Dashboard menampilkan status per UPT. | Pengguna dapat membuka daftar laporan yang mendasari ringkasan. |
| REP-01 | P0 | Pengguna berwenang mengekspor rekap CSV. | File memuat periode, filter, waktu ekspor, UPT, status, dan data ringkas. |
| AUD-01 | P0 | Sistem mencatat aktivitas penting. | Audit log menyimpan pelaku, aksi, objek, waktu, dan metadata minimum. |

## 10. Aturan Bisnis

1. Satu laporan aktif hanya boleh ada untuk satu kombinasi UPT, periode, dan tipe laporan.
2. Petugas UPT hanya dapat membuat dan membaca laporan unitnya.
3. Laporan DRAFT atau REVISION_REQUIRED dapat diedit oleh Petugas UPT.
4. Hanya Koordinator UPT yang dapat mengajukan laporan unit.
5. Laporan SUBMITTED atau REVIEWED tidak dapat diedit sampai dikembalikan untuk revisi.
6. Laporan APPROVED tidak dapat diubah melalui alur biasa.
7. Permintaan revisi wajib memiliki catatan.
8. Petugas Kanwil menyelesaikan reviu; Product Owner memberikan persetujuan akhir.
9. Dashboard resmi menghitung laporan APPROVED; status lain ditampilkan sebagai informasi operasional.
10. Dokumen mengikuti hak akses laporan induknya.
11. Waktu transaksi disimpan konsisten dan ditampilkan dalam zona Asia/Jakarta.
12. Penghapusan permanen laporan yang pernah diajukan tidak tersedia pada MVP.

## 11. Kebutuhan Nonfungsional

### Keamanan

- Seluruh trafik produksi menggunakan HTTPS.
- Session disimpan menggunakan cookie aman yang dikelola Better Auth.
- Origin frontend yang dipercaya dikonfigurasi eksplisit.
- CORS hanya mengizinkan origin frontend resmi.
- Semua query bisnis menerapkan pemeriksaan role dan UPT.
- Password, secret, dan connection string tidak disimpan dalam repository.
- Upload memakai allowlist tipe, batas ukuran, nama acak, dan penyimpanan privat.
- Error produksi tidak mengirim stack trace atau detail internal.

### Kinerja

- Halaman umum ditargetkan tampil dalam maksimal 3 detik pada kondisi normal.
- Filter dashboard ditargetkan merespons dalam maksimal 5 detik.
- Daftar menggunakan pagination.
- Query dashboard memiliki indeks yang sesuai.

### Keandalan

- Database dan dokumen dicadangkan terjadwal.
- Migrasi Prisma disimpan dalam version control dan diuji sebelum produksi.
- Operasi perubahan status menggunakan transaksi database.
- Aplikasi memiliki health check dan log error.

### Kemudahan penggunaan

- Antarmuka menggunakan Bahasa Indonesia.
- Form dapat disimpan bertahap.
- Pesan validasi menjelaskan data yang perlu diperbaiki.
- Tampilan responsif untuk desktop dan tablet.
- Elemen form utama dapat digunakan dengan keyboard.

## 12. Model Data Minimum

- User dan Session — dikelola melalui Better Auth dan diperluas dengan role serta UPT.
- UPT
- ReportingPeriod
- Report
- ReportItem
- Attachment
- ReviewComment
- StatusHistory
- AuditLog

Rancangan relasi rinci dijelaskan dalam [architecture.md](./architecture.md).

## 13. Indikator Keberhasilan

- Seluruh UPT pilot dapat membuat dan mengajukan laporan.
- Tidak ada pengguna UPT yang dapat mengakses data UPT lain pada pengujian otorisasi.
- Petugas Kanwil dan Product Owner dapat menyelesaikan satu siklus reviu sampai persetujuan akhir.
- Dashboard dan CSV sesuai dengan data laporan sumber.
- Rekap periode dapat dibuat tanpa penghitungan manual.
- Minimal 80% skenario UAT selesai tanpa bantuan pengembang.
- Tidak ada defect kritis terbuka saat implementasi awal.

## 14. UAT Minimum

1. Login dan logout untuk seluruh role.
2. Penolakan akun nonaktif.
3. Pembatasan akses lintas UPT.
4. Admin SIMPATIK membuat periode dan Product Owner mengesahkan indikator.
5. Petugas UPT menyimpan draf.
6. Validasi pengajuan laporan tidak lengkap.
7. Unggah dan akses dokumen sesuai kewenangan.
8. Validasi dan pengajuan oleh Koordinator UPT.
9. Permintaan revisi, perbaikan, pengajuan ulang, serta penandaan REVIEWED oleh Petugas Kanwil.
10. Persetujuan akhir oleh Product Owner.
11. Kesesuaian dashboard dan rekap CSV.
12. Histori status dan audit log.
13. Akses teknis System Administrator tanpa hak substansi default.
14. Backup serta pemulihan minimum.

## 15. Tahapan 0–2 Bulan

| Minggu | Fokus | Hasil |
|---|---|---|
| 1 | Validasi proses dan setup | Scope disepakati, repository dan lingkungan siap |
| 2 | Auth dan master data | Login, role, UPT, pengguna, dan periode |
| 3–4 | Pelaporan UPT | Form, draf, indikator, validasi, dan upload |
| 5 | Reviu dan persetujuan | Antrean Kanwil, revisi, REVIEWED, dan persetujuan Product Owner |
| 6 | Dashboard dan rekap | Dashboard dasar, filter, drill-down, dan CSV |
| 7 | Hardening dan UAT | Pengujian akses, keamanan, backup, dan perbaikan |
| 8 | Pilot dan implementasi | Pelatihan, manual, pilot, evaluasi, dan rilis awal |

Daftar pekerjaan rinci tersedia dalam [tasks.md](./tasks.md).

## 16. Keputusan yang Harus Divalidasi

- Nama, kode, dan status resmi 12 UPT.
- Tipe laporan yang masuk MVP.
- Daftar indikator dan dokumen wajib.
- Tenggat dan aturan keterlambatan.
- Format rekap CSV.
- Batas ukuran dan tipe file.
- Metode reset password.
- UPT pilot dan peserta UAT.
- Hosting, domain, object storage, backup, serta retensi dokumen.
- Apakah Pimpinan boleh membuka detail laporan atau hanya ringkasan.

## 17. Definition of Done MVP

MVP dinyatakan selesai apabila:

- Seluruh kebutuhan P0 yang disepakati lulus UAT.
- Tujuh role, segregation of duties, dan pembatasan UPT telah diuji.
- Satu siklus laporan berjalan end-to-end.
- Dashboard dan rekap sesuai data sumber.
- Audit log, backup, dan prosedur pemulihan tersedia.
- Manual pengguna dan materi pelatihan selesai.
- Tidak ada defect kritis terbuka.
- Product Owner memberikan persetujuan implementasi awal.

## 18. Sumber

PRD ini diturunkan dari Rancangan Proyek Perubahan SIMPATIK dan dibatasi pada tujuan jangka pendek 0–2 bulan. Detail yang tidak dinyatakan secara eksplisit pada dokumen sumber merupakan baseline usulan dan perlu disahkan melalui validasi proses bisnis serta UAT.
