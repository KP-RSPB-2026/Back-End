# Integrasi Database Legacy ke Sistem Use Case Apotik

Dokumen ini memastikan integrasi data legacy tetap selaras dengan use case backend saat ini.

## Prinsip Integrasi

1. Tabel domain baru (`users`, `patients`, `medicines`, `prescriptions`, `medicine_transfers`) tetap menjadi sumber kebenaran API.
2. Data legacy hanya dimigrasikan pada kolom yang relevan ke use case.
3. Kolom legacy yang tidak dipakai tetap diabaikan (tidak dipaksa masuk ke schema baru).
4. Migrasi dilakukan bertahap per domain, dimulai dari master obat.

## Pilot Tahap 1: Master Obat

Script: `scripts/migrateLegacyMedicines.js`

### Environment Variable Wajib

- `LEGACY_DB_NAME`: nama database legacy
- `LEGACY_MEDICINES_TABLE`: nama tabel legacy untuk master obat

### Environment Variable Opsional (default bisa diubah)

- `LEGACY_DB_HOST`, `LEGACY_DB_PORT`, `LEGACY_DB_USER`, `LEGACY_DB_PASSWORD`
- `LEGACY_MED_COL_ID` (default: `id`)
- `LEGACY_MED_COL_CODE` (default: `kode_obat`)
- `LEGACY_MED_COL_NAME` (default: `nama_obat`)
- `LEGACY_MED_COL_GENERIC_NAME` (default: `nama_generik`)
- `LEGACY_MED_COL_CATEGORY` (default: `kategori`)
- `LEGACY_MED_COL_UNIT` (default: `satuan`)
- `LEGACY_MED_COL_STOCK` (default: `jumlah_aktual`)
- `LEGACY_MED_COL_MIN_STOCK` (default: `stok_minimum`)
- `LEGACY_MED_COL_PRICE` (default: `harga_jual`)
- `LEGACY_MED_COL_EXPIRY_DATE` (default: `exp_date`)
- `LEGACY_MED_COL_BATCH_NUMBER` (default: `batch_number`)
- `LEGACY_MED_COL_MANUFACTURER` (default: `pabrik`)
- `LEGACY_MED_COL_DESCRIPTION` (default: `keterangan`)
- `LEGACY_MED_COL_IS_ACTIVE` (default: `aktif`)

## Cara Menjalankan

1. Pastikan schema sistem baru sudah ada:

```bash
npm run db:init
```

2. Isi konfigurasi legacy di `.env`.

3. Jalankan migrasi master obat:

```bash
npm run migrate:legacy:medicines
```

## Catatan

- Script menggunakan upsert berdasarkan `code` (unik di tabel `medicines`).
- Jika kode tidak ada di legacy, script membuat kode fallback `LEGACY-XXXXXX`.
- Ini adalah tahap awal integrasi; domain lain (pasien/resep/transfer) sebaiknya dilakukan setelah verifikasi data obat berhasil.
