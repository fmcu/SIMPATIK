# ROLE.md — Fungsi dan Tanggung Jawab Setiap Role

> **Versi:** 1.0
> **Status:** Disahkan sesuai PRD MVP
> **Sumber utama:** [prd.md](./prd.md), [architecture.md](./architecture.md)
> **Kebijakan backend:** [permissions.ts](./backend/src/middleware/permissions.ts)

Dokumen ini menjelaskan **siapa mengerjakan apa** di SIMPATIK, dalam bahasa yang mudah dipahami. Dokumen ini menyandingkan **peran ideal dari PRD** dengan **kondisi aktual di kode**, sehingga bisa dipakai sebagai acuan kerja, panduan pengguna, dan pedoman pengembangan.

---

## 1. Ringkasan

SIMPATIK memakai **7 role** yang bekerja seperti satu alur pelaporan: UPT membuat laporan → Koordinator UPT mengirim → Petugas Kanwil memeriksa → Product Owner menyetujui. Pimpinan memantau, Admin SIMPATIK mengurus administrasi, dan System Administrator mengurus teknis.

```text
[Petugas UPT] --buat draf--> [Koordinator UPT] --validasi & kirim--> [Petugas Kanwil]
                                                                        |
                                                          --reviu/revisi--> kembali ke UPT
                                                                        |
                                                          [Product Owner] --persetujuan akhir--> RESMI
```

Setiap role punya **kewenangan berbeda** dan **cakupan data berbeda**. Tiga prinsip utama:

1. **Backend yang memutuskan** — tampilan menu di layar hanya bantu; pemeriksaan asli dilakukan di backend. Artinya, walau URL atau menu diotak-atik, akses tetap tertutup.
2. **Cakupan UPT** — pengguna UPT hanya boleh menyentuh data **UPT-nya sendiri**.
3. **Pemisahan kewenangan** — yang membuat laporan **tidak boleh** yang mengesahkan laporan.

---

## 2. Alur Pelaporan (jalur utama)

Alur inilah yang dipakai setiap periode pelaporan:

```text
DRAFT ──▶ SUBMITTED ──▶ REVIEWED ──▶ APPROVED
            │                │
            ▼                ▼
     (revisi dari Kanwil)  (persetujuan Product Owner)
            │
            ▼
     REVISION_REQUIRED ──▶ SUBMITTED (dikirim ulang)
```

| Status | Artinya | Siapa yang mengubah |
|---|---|---|
| `DRAFT` | Laporan sedang disusun, belum lengkap | Petugas UPT |
| `SUBMITTED` | Sudah divalidasi dan dikirim ke Kanwil | Koordinator UPT |
| `REVISION_REQUIRED` | Diminta diperbaiki (wajib ada catatan) | Petugas Kanwil |
| `REVIEWED` | Reviu Kanwil selesai, menunggu keputusan akhir | Petugas Kanwil |
| `APPROVED` | Disetujui, menjadi data resmi/rekap | Product Owner |

Setiap perubahan status otomatis tercatat di **histori status** dan **audit log**.

---

## 3. Daftar Role

| Role (kode) | Nama tampilan | Cakupan data | Fokus kerja |
|---|---|---|---|
| `PIMPINAN` | Pimpinan | Seluruh UPT, **baca saja** | Memantau kemajuan dan keterlambatan pelaporan |
| `PRODUCT_OWNER` | Product Owner | Seluruh UPT | Menetapkan aturan, mengesahkan indikator, persetujuan akhir |
| `PETUGAS_KANWIL` | Petugas Kanwil | Seluruh UPT | Memeriksa laporan dan meminta perbaikan |
| `KOORDINATOR_UPT` | Koordinator UPT | **UPT sendiri** | Memvalidasi dan mengirim laporan unit |
| `PETUGAS_UPT` | Petugas UPT | **UPT sendiri** | Membuat, mengisi, dan memperbaiki laporan |
| `ADMIN_SIMPATIK` | Admin SIMPATIK | Seluruh sistem (administrasi) | Mengelola akun, UPT, periode, konfigurasi |
| `SYSTEM_ADMIN` | System Administrator | Teknis, **tanpa hak substansi** | Menjaga server, backup, kesehatan sistem |

---

## 4. Fungsi dan Tanggung Jawab per Role

### 4.1 Petugas UPT (`PETUGAS_UPT`)

**Peran:** Pemain utama di unit kerja — dialah yang menyusun laporan.

| Bisa dilakukan | Detail |
|---|---|
| Membuat laporan | Membuat satu laporan per kombinasi **UPT + periode + tipe laporan** (duplikat ditolak sistem) |
| Menyimpan draf | Mengisi laporan bertahap; draf belum wajib lengkap |
| Mengisi isi laporan | Nilai/capaian per indikator, narasi, dan keterangan |
| Mengunggah dokumen | Menempel bukti pendukung ke laporan |
| Memperbaiki laporan | Mengedit draf (`DRAFT`) atau laporan yang diminta revisi (`REVISION_REQUIRED`) |
| Menghapus dokumen | Hanya selama laporan belum dikirim (sebelum `SUBMITTED`) |
| Memeriksa kelengkapan | Melihat hasil validasi sistem sebelum laporan dikirim |

| Tidak boleh |
|---|
| Membaca atau mengubah laporan UPT lain |
| Mengirim laporan ke Kanwil (itu tugas Koordinator UPT) |
| Mengubah laporan yang sudah dikirim (`SUBMITTED`, `REVIEWED`, `APPROVED`) |

**Cakupan data:** hanya laporan UPT sendiri.

---

### 4.2 Koordinator UPT (`KOORDINATOR_UPT`)

**Peran:** Penjaga mutu unit. Laporan baru bisa naik ke Kanwil setelah melewati tangan Koordinator.

| Bisa dilakukan | Detail |
|---|---|
| Memvalidasi kelengkapan | Memeriksa isi, narasi, dan dokumen wajib sudah lengkap |
| Mengirim laporan | Menaikkan status `DRAFT`/`REVISION_REQUIRED` → `SUBMITTED` |
| Mengirim ulang | Mengirimkan lagi laporan yang sudah diperbaiki setelah revisi |
| Melihat laporan unit | Seluruh laporan UPT sendiri (baca) |

| Tidak boleh |
|---|
| Membuat atau mengisi isi laporan (itu tugas Petugas UPT) |
| Mengirim laporan UPT lain |
| Memutuskan persetujuan akhir |

**Cakupan data:** hanya UPT sendiri.

---

### 4.3 Petugas Kanwil (`PETUGAS_KANWIL`)

**Peran:** Pemeriksa tingkat Kanwil. Mengontrol kualitas laporan dari **seluruh UPT**.

| Bisa dilakukan | Detail |
|---|---|
| Melihat antrean laporan | Daftar laporan `SUBMITTED` yang masuk dari semua UPT |
| Membuka detail laporan | Isi, dokumen, dan histori laporan |
| Memberi catatan | Komentar untuk perbaikan (terdokumentasi) |
| Meminta revisi | Mengembalikan laporan → `REVISION_REQUIRED` (wajib ada alasan/catatan) |
| Menandai selesai direviu | Menyetujui hasil pemeriksaan → `REVIEWED` |

| Tidak boleh |
|---|
| Memberikan persetujuan akhir (itu wewenang Product Owner) |
| Mengubah isi laporan UPT |

**Cakupan data:** seluruh UPT, tetapi **hanya untuk reviu** — tidak untuk mengubah substansi.

---

### 4.4 Product Owner (`PRODUCT_OWNER`)

**Peran:** Penentu kebijakan bisnis dan pengesah akhir. Laporan menjadi **resmi** hanya setelah disetujui Product Owner.

| Bisa dilakukan | Detail |
|---|---|
| Menetapkan aturan bisnis | Menentukan format dan aturan pelaporan yang dipakai sistem |
| Mengesahkan indikator | Menyetujui daftar indikator laporan (item yang wajib diisi) |
| Mengesahkan dokumen wajib | Menyetujui daftar bukti yang harus dilampirkan |
| Persetujuan akhir laporan | Menyetujui laporan `REVIEWED` → `APPROVED` |
| Melihat laporan | Seluruh laporan, termasuk dasbor dan rekap |
| Menolak dengan alasan | Menolak persetujuan; alasan wajib diisi |

| Tidak boleh |
|---|
| Membuat atau mengisi laporan (pemisahan kewenangan) |
| Melakukan administrasi akun (itu tugas Admin SIMPATIK) |

**Cakupan data:** seluruh UPT, tanpa dibatasi unit.

---

### 4.5 Pimpinan (`PIMPINAN`)

**Peran:** Pengawas eksekutif. Melihat gambaran besar pelaporan tanpa ikut campur operasional.

| Bisa dilakukan | Detail |
|---|---|
| Melihat dasbor | Ringkasan jumlah laporan per status |
| Melihat status UPT | Status pelaporan tiap UPT pada periode terpilih |
| Melihat keterlambatan | UPT yang belum mengirim atau terlambat |
| Mengunduh rekap | Ekspor rekap pelaporan ke CSV |
| Membaca detail laporan | Detail laporan sesuai izin (keputusan akhir masih terbuka di PRD) |

| Tidak boleh |
|---|
| Mengubah isi laporan (baca saja) |
| Memberikan persetujuan atau mengubah status |

**Cakupan data:** seluruh UPT, **hanya baca**.

---

### 4.6 Admin SIMPATIK (`ADMIN_SIMPATIK`)

**Peran:** Pengurus administrasi sistem. Mengatur siapa yang bisa login dan apa saja konfigurasi pelaporan.

| Bisa dilakukan | Detail |
|---|---|
| Mengelola akun | Membuat, mengubah, menonaktifkan akun pengguna |
| Menetapkan role & UPT | Menentukan role dan penempatan UPT pengguna |
| Mengelola UPT | Menambah/mengubah 12 UPT, aktif/nonaktif (tanpa menghapus histori) |
| Mengelola periode | Membuat periode, tenggat, status periode (draft/aktif/tutup) |
| Mengelola konfigurasi | Pengaturan operasional sistem |
| Melihat dasbor | Memantau aktivitas sistem |

| Tidak boleh |
|---|
| Menyetujui atau mereviu laporan (bukan approver bisnis) |
| Mengisi isi laporan |

**Cakupan data:** seluruh sistem **administratif**; tanpa otomatis menjadi approver bisnis.

---

### 4.7 System Administrator (`SYSTEM_ADMIN`)

**Peran:** Teknisi sistem. Menjaga aplikasi tetap hidup, aman, dan ter-backup.

| Bisa dilakukan | Detail |
|---|---|
| Memantau kesehatan sistem | Health check (live/ready) |
| Menjaga deployment | Pemasangan dan pembaruan aplikasi di server |
| Backup & pemulihan | Cadangan data terjadwal dan prosedur pemulihan |
| Memantau log teknis | Log error dan log teknis operasional |
| Aksi teknis istimewa | Tindakan khusus pemeliharaan (tercatat di audit) |

| Tidak boleh |
|---|
| Membaca substansi laporan secara default (izin teknis khusus dibutuhkan) |
| Mengubah isi laporan atau memberikan persetujuan |

**Cakupan data:** teknis, **tanpa hak substansi secara otomatis**.

---

## 5. Matriks Akses per Modul

| Aksi | Pimpinan | Product Owner | Petugas Kanwil | Koordinator UPT | Petugas UPT | Admin SIMPATIK | System Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Membuat laporan | — | — | — | — | ✅ | — | — |
| Mengubah/isi laporan | — | — | — | — | ✅* | — | — |
| Unggah/hapus dokumen | — | — | — | — | ✅* | — | — |
| Membaca laporan | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Melihat histori laporan | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Validasi kelengkapan | — | — | — | ✅ | ✅ | — | — |
| Mengirim laporan ke Kanwil | — | — | — | ✅ | — | — | — |
| Reviu / minta revisi | — | — | ✅ | — | — | — | — |
| Tandai selesai reviu | — | — | ✅ | — | — | — | — |
| Persetujuan akhir | — | ✅ | — | — | — | — | — |
| Dasbor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Ekspor rekap CSV | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| Baca master data (UPT/periode) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Kelola akun & role | — | — | — | — | — | ✅ | — |
| Kelola UPT & periode | — | — | — | — | — | ✅ | — |
| Mengesahkan indikator | — | ✅ | — | — | — | — | — |
| Kesehatan sistem & log teknis | — | — | — | — | — | — | ✅ |

\* Hanya untuk laporan **UPT sendiri** dan dalam status **boleh diubah** (`DRAFT` atau `REVISION_REQUIRED`).

> Catatan: kolom **Ekspor rekap** — di PRD ekspor bisa untuk koordinator/admin, di kode saat ini mengizinkan Pimpinan, Product Owner, Petugas Kanwil, dan Koordinator UPT. Perbedaan ini adalah **keputusan sementara**, bukan hak final.

---

## 6. Matriks Status (siapa boleh melakukan transisi)

| Dari | Ke | Role yang dibolehkan | Syarat |
|---|---|---|---|
| `DRAFT` | `SUBMITTED` | Koordinator UPT | Laporan sudah valid/kelengkapan terpenuhi |
| `REVISION_REQUIRED` | `SUBMITTED` | Koordinator UPT | Perbaikan selesai, dikirim ulang |
| `SUBMITTED` | `REVISION_REQUIRED` | Petugas Kanwil | Wajib ada catatan/alasan revisi |
| `SUBMITTED` | `REVIEWED` | Petugas Kanwil | Reviu selesai |
| `REVIEWED` | `APPROVED` | Product Owner | Keputusan akhir |
| `REVIEWED` | (ditolak) | Product Owner | Alasan penolakan wajib diisi |

---

## 7. Akun Seed (untuk pengembangan)

Semua akun di bawah password-nya **`12345678`** (dari `SEED_PASSWORD` di `backend/.env`), aktif, dan email sudah terverifikasi.

| Role | Email login |
|---|---|
| Pimpinan | `pimpinan@simpatik.local` |
| Product Owner | `product.owner@simpatik.local` |
| Petugas Kanwil | `petugas.kanwil@simpatik.local` |
| Koordinator UPT (UPT-01) | `koordinator.upt@simpatik.local` |
| Petugas UPT (UPT-01) | `petugas.upt@simpatik.local` |
| Admin SIMPATIK | `admin@simpatik.local` |
| System Administrator | `system.admin@simpatik.local` |

Sumber: `backend/prisma/seed.ts`.

---

## 8. Navigasi Menu per Role (frontend)

| Menu | Pimpinan | Product Owner | Petugas Kanwil | Koordinator UPT | Petugas UPT | Admin SIMPATIK | System Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dasbor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Laporan | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Validasi laporan | — | — | — | ✅ | — | — | — |
| Reviu Kanwil | — | — | ✅ | — | — | — | — |
| Persetujuan laporan | — | ✅ | — | — | — | — | — |
| Pengguna | — | — | — | — | — | ✅ | — |
| UPT | — | — | — | — | — | ✅ | — |
| Periode | — | ✅ | — | — | — | ✅ | — |
| Pengaturan | — | — | — | — | — | ✅ | ✅ |

Sumber: `frontend/src/lib/role-navigation.ts`.

---

## 9. Catatan dan Perbedaan (PRD vs Implementasi)

Supaya tidak terjadi salah paham, berikut titik yang **belum sepenuhnya final** atau berbeda antara dokumen dan kode:

1. **Akses detail laporan untuk Pimpinan** — PRD menulis "sesuai izin", keputusan akhir masih terbuka. Kode saat ini mengizinkan Pimpinan membaca laporan.
2. **Hak rekap CSV** — kode saat ini mengizinkan Admin SIMPATIK ikut ekspor (`permissions.ts:30-36`), selain Pimpinan, Product Owner, Petugas Kanwil, dan Koordinator UPT. Di PRD hak ini "opsional" untuk koordinator/admin; belum final.
3. **Validasi kelengkapan** — Petugas UPT dapat melihat hasil validasi sistem (kelengkapan teknis); hanya Koordinator UPT yang mengajukan laporan secara resmi.
4. **Katalog komponen** (`/components`) — menu pengembangan yang saat ini muncul untuk semua role; bukan bagian modul bisnis PRD. Sebaiknya hanya untuk development.
5. **System Administrator** — tidak memperoleh menu dasbor/laporan; hanya pengaturan dan fungsi teknis.

---

## 10. Prinsip yang Tidak Boleh Dilanggar

1. Pengguna UPT tidak boleh mengakses data UPT lain — termasuk lewat URL/API langsung.
2. Pemeriksaan akses dilakukan **di backend**, tidak cukup hanya menyembunyikan menu.
3. Pimpinan tidak mengubah substansi laporan.
4. System Administrator tidak membaca substansi laporan tanpa izin teknis khusus.
5. Petugas Kanwil menyelesaikan reviu; **persetujuan akhir hanya oleh Product Owner**.
6. Permintaan revisi wajib memiliki catatan.
7. Semua perubahan status tercatat di histori status dan audit log.
