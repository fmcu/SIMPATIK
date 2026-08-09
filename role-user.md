# Panduan Role — SIMPATIK

> Panduan sederhana untuk pengguna aplikasi SIMPATIK.
> Dokumen lengkap (teknis): [ROLE.md](./ROLE.md)

---

## 1. Apa itu SIMPATIK?

SIMPATIK adalah aplikasi untuk **mengirim laporan** dari UPT ke Kanwil, lalu disetujui secara resmi.

Alurnya seperti surat di kantor:

```text
Buat laporan → Cek & kirim → Periksa di Kanwil → Setujui → Selesai
(Petugas UPT) (Koordinator) (Petugas Kanwil) (Product Owner)
```

---

## 2. Ringkasan 7 Role

| Role | Tugas inti | Cakupan |
|---|---|---|
| **Petugas UPT** | Membuat dan mengisi laporan | UPT sendiri |
| **Koordinator UPT** | Mengecek dan mengirim laporan | UPT sendiri |
| **Petugas Kanwil** | Memeriksa laporan semua UPT | Semua UPT |
| **Product Owner** | Menyetujui laporan | Semua UPT |
| **Pimpinan** | Melihat laporan & rekap | Semua UPT (baca saja) |
| **Admin SIMPATIK** | Mengatur akun, UPT, periode | Administrasi |
| **System Administrator** | Menjaga sistem tetap jalan | Teknis |

---

## 3. Tugas per Role

### Petugas UPT

Mengerjakan laporan unitnya:

- Membuat laporan baru
- Mengisi isi laporan dan melampirkan bukti
- Menyimpan dulu (bisa lanjut lagi nanti)
- Memperbaiki bila diminta revisi

> Tidak bisa: membuka laporan UPT lain, atau mengirim laporan (itu tugas Koordinator).

---

### Koordinator UPT

Penjaga mutu unit:

- Mengecek laporan sudah lengkap atau belum
- Mengirim laporan ke Kanwil
- Mengirim ulang laporan yang sudah diperbaiki

> Tidak bisa: membuat laporan (itu tugas Petugas UPT).

---

### Petugas Kanwil

Pemeriksa dari kantor Kanwil:

- Melihat laporan yang masuk dari semua UPT
- Memberi catatan
- Meminta revisi bila perlu
- Menandai laporan "selesai diperiksa"

> Tidak bisa: menyetujui laporan (itu tugas Product Owner).

---

### Product Owner

Pengambil keputusan akhir:

- Menyetujui laporan yang sudah diperiksa
- Menetapkan aturan dan indikator laporan

> Laporan resmi hanya setelah disetujui oleh role ini.

---

### Pimpinan

Melihat gambaran besar:

- Melihat status laporan semua UPT
- Melihat UPT yang belum/telat mengirim
- Mengunduh rekap (CSV)

> Baca saja — tidak bisa mengubah laporan.

---

### Admin SIMPATIK

Mengurus administrasi:

- Membuat/mengubah akun pengguna
- Mengatur UPT dan periode pelaporan
- Mengatur konfigurasi sistem

> Tidak bisa: menyetujui atau mengisi laporan.

---

### System Administrator

Menjaga server:

- Memastikan aplikasi sehat
- Backup data
- Menangani log dan teknis

> Tidak bisa: melihat isi laporan (tanpa izin khusus).

---

## 4. Status Laporan

| Status | Artinya | Siapa yang menangani |
|---|---|---|
| **Draft** | Masih disusun | Petugas UPT |
| **Terkirim** | Sudah masuk ke Kanwil | Koordinator UPT |
| **Perlu Revisi** | Diminta perbaikan | Petugas Kanwil |
| **Tereviu** | Pemeriksaan selesai | Petugas Kanwil |
| **Disetujui** | Resmi / final | Product Owner |

---

## 5. Panduan Singkat per Role

**Saya Petugas UPT:**
1. Buka menu **Laporan** → buat laporan baru
2. Isi data + lampirkan bukti
3. Simpan sebagai draft
4. Tunggu Koordinator mengirim — bila diminta revisi, perbaiki dan simpan lagi

**Saya Koordinator UPT:**
1. Buka menu **Validasi Laporan**
2. Pastikan laporan unit lengkap
3. Klik kirim ke Kanwil
4. Bila ada revisi, kirim ulang setelah diperbaiki

**Saya Petugas Kanwil:**
1. Buka menu **Reviu Kanwil**
2. Periksa laporan yang masuk
3. Beri catatan / minta revisi / tandai selesai

**Saya Product Owner:**
1. Buka menu **Persetujuan Laporan**
2. Setujui atau tolak laporan yang sudah direviu

**Saya Pimpinan:**
1. Buka **Dasbor** untuk melihat status semua UPT
2. Unduh **rekap CSV** untuk evaluasi

---

## 6. Yang Harus Diingat

1. Data UPT lain **tidak bisa dibuka** — bukan hanya di menu, tapi juga diblokir sistem.
2. Yang mengisi laporan **bukan** yang menyetujui laporan.
3. Minta revisi **wajib** ada alasannya.
4. Setiap perubahan tercatat otomatis (ada riwayat/audit).
5. Bila bingung, lihat panduan per role di atas atau tanyakan Admin SIMPATIK.
