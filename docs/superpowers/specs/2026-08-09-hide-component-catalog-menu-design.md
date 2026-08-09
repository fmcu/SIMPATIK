# Sembunyikan Menu Katalog Komponen

## Tujuan

Sembunyikan menu `Katalog komponen` dari navigasi desktop dan mobile untuk seluruh role.

## Desain

Hapus item `/components` dari `navigationItems` di `frontend/src/lib/role-navigation.ts`. Karena kedua navigasi memakai sumber data tersebut, perubahan berlaku bagi seluruh role tanpa filter tambahan.

Route `/components` dan halaman katalog tetap tersedia bagi pengguna terautentikasi yang membuka URL secara langsung. Tidak ada perubahan otorisasi atau redirect.

Perbarui matriks ekspektasi di `frontend/src/lib/role-navigation.e2e.test.ts` dengan menghapus `/components` dari seluruh role. Tambahkan pemeriksaan eksplisit bahwa item `/components` tidak ada agar tujuan perubahan terdokumentasi sebagai kontrak tes.

## Verifikasi

Jalankan tes frontend, lint, dan type-check.
