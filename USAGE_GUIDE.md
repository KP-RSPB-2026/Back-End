# Panduan Penggunaan API

## Setup Awal

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup MySQL / MariaDB (XAMPP)**
  - Pastikan MySQL di XAMPP berjalan
  - Sesuaikan kredensial di `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)

3. **Inisialisasi Schema Database**
  ```bash
  npm run db:init
  ```

4. **Konfigurasi Environment**
   - Copy `.env.example` ke `.env`
   - Sesuaikan nilai di `.env`

5. **(Opsional) Seed Data Demo**
  ```bash
  npm run seed
  ```

6. **Jalankan Server**
   ```bash
   npm run dev
   ```

## Flow Penggunaan

### A. Setup Data Awal

#### 1. Register Users

**Register Admin Apotik:**
```http
POST /api/auth/register
{
  "name": "Admin Apotik",
  "email": "admin@apotik.com",
  "password": "admin123",
  "role": "admin_apotik",
  "phoneNumber": "081234567890"
}
```

**Register Dokter:**
```http
POST /api/auth/register
{
  "name": "Dr. Budi",
  "email": "dokter@apotik.com",
  "password": "dokter123",
  "role": "dokter",
  "phoneNumber": "081234567891",
  "specialization": "Dokter Umum",
  "licenseNumber": "SIP123456"
}
```

#### 2. Login dan Simpan Token

```http
POST /api/auth/login
{
  "email": "admin@apotik.com",
  "password": "admin123"
}
```

**Response akan berisi token:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Simpan token ini dan gunakan di header setiap request:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### B. Admin Apotik - Mengelola Obat

#### 1. Tambah Obat Baru

```http
POST /api/medicines
Authorization: Bearer ADMIN_TOKEN
{
  "code": "MED001",
  "name": "Paracetamol 500mg",
  "genericName": "Paracetamol",
  "category": "Tablet",
  "manufacturer": "Kimia Farma",
  "dosage": "500mg",
  "unit": "Tablet",
  "stock": 100,
  "minStock": 20,
  "price": 5000,
  "expiryDate": "2025-12-31"
}
```

#### 2. Lihat Semua Obat

```http
GET /api/medicines
Authorization: Bearer ADMIN_TOKEN
```

#### 3. Update Stok (Tambah)

```http
PATCH /api/medicines/MEDICINE_ID/stock
Authorization: Bearer ADMIN_TOKEN
{
  "quantity": 50,
  "operation": "add"
}
```

#### 4. Cek Obat Stok Rendah

```http
GET /api/medicines/alerts/low-stock
Authorization: Bearer ADMIN_TOKEN
```

#### 5. Cek Obat Akan Kadaluarsa

```http
GET /api/medicines/alerts/expiring?days=30
Authorization: Bearer ADMIN_TOKEN
```

### C. Dokter - Membuat Resep

#### 1. Tambah Pasien

```http
POST /api/patients
Authorization: Bearer DOKTER_TOKEN
{
  "name": "John Doe",
  "dateOfBirth": "1985-03-20",
  "gender": "Laki-laki",
  "address": "Jl. Merdeka No. 10",
  "phoneNumber": "081234567892",
  "allergies": ["Penisilin"],
  "bloodType": "A+"
}
```

**Simpan PATIENT_ID dari response**

#### 2. Lihat Daftar Pasien

```http
GET /api/patients
Authorization: Bearer DOKTER_TOKEN
```

#### 3. Lihat Obat yang Tersedia

```http
GET /api/medicines?search=para
Authorization: Bearer DOKTER_TOKEN
```

#### 4. Buat Resep

```http
POST /api/prescriptions
Authorization: Bearer DOKTER_TOKEN
{
  "patient": "PATIENT_ID_DARI_STEP_1",
  "medicines": [
    {
      "medicine": "MEDICINE_ID_PARACETAMOL",
      "quantity": 10,
      "dosageInstructions": "3x sehari 1 tablet sesudah makan",
      "duration": "3 hari"
    }
  ],
  "diagnosis": "Demam",
  "notes": "Istirahat yang cukup"
}
```

#### 5. Lihat Resep yang Dibuat

```http
GET /api/prescriptions
Authorization: Bearer DOKTER_TOKEN
```

### D. Admin Apotik - Memproses Resep

#### 1. Lihat Resep Pending

```http
GET /api/prescriptions?status=pending
Authorization: Bearer ADMIN_TOKEN
```

#### 2. Ubah Status ke "Disiapkan"

```http
PATCH /api/prescriptions/PRESCRIPTION_ID/status
Authorization: Bearer ADMIN_TOKEN
{
  "status": "disiapkan"
}
```

#### 3. Ubah Status ke "Selesai" (Stok akan berkurang otomatis)

```http
PATCH /api/prescriptions/PRESCRIPTION_ID/status
Authorization: Bearer ADMIN_TOKEN
{
  "status": "selesai"
}
```

### E. Admin Apotik - Transfer Obat

#### 1. Request Obat ke Apotik Lain

```http
POST /api/transfers/request
Authorization: Bearer ADMIN_TOKEN
{
  "toPharmacy": "Apotik Sehat",
  "medicines": [
    {
      "medicine": "MEDICINE_ID",
      "quantity": 50,
      "notes": "Stok menipis"
    }
  ],
  "urgency": "tinggi",
  "notes": "Mohon segera"
}
```

#### 2. Terima Obat dari Apotik Lain

```http
POST /api/transfers/receive
Authorization: Bearer ADMIN_TOKEN
{
  "fromPharmacy": "Apotik Sentosa",
  "medicines": [
    {
      "medicine": "MEDICINE_ID",
      "quantity": 100
    }
  ],
  "notes": "Pengiriman rutin"
}
```

#### 3. Proses Penerimaan (Stok akan bertambah otomatis)

```http
PATCH /api/transfers/TRANSFER_ID/status
Authorization: Bearer ADMIN_TOKEN
{
  "status": "diterima"
}
```

## Query Parameters

### Pagination
```
?page=1&limit=10
```

### Search
```
?search=paracetamol
```

### Filter
```
?status=pending
?category=Tablet
?lowStock=true
```

### Kombinasi
```
?search=para&category=Tablet&page=1&limit=10
```

## Tips Testing

### Menggunakan VS Code REST Client

1. Install extension "REST Client"
2. Buka file `api-test.http`
3. Click "Send Request" di atas setiap endpoint
4. Update `@token` variable setelah login

### Menggunakan Postman

1. Import collection dari dokumentasi
2. Setup environment variable untuk token
3. Test setiap endpoint secara berurutan

## Error Handling

### Common Errors

**401 Unauthorized:**
- Token tidak valid atau expired
- Solusi: Login ulang dan gunakan token baru

**403 Forbidden:**
- Role tidak memiliki akses
- Solusi: Gunakan user dengan role yang sesuai

**404 Not Found:**
- Resource tidak ditemukan
- Solusi: Pastikan ID yang digunakan benar

**400 Bad Request:**
- Validasi gagal
- Solusi: Periksa format data yang dikirim

## Monitoring

### Cek Kesehatan Sistem

```http
GET /
```

Response akan menunjukkan semua endpoint yang tersedia.

## Best Practices

1. **Selalu logout setelah selesai**
2. **Simpan token dengan aman**
3. **Gunakan HTTPS di production**
4. **Backup database secara berkala**
5. **Monitor log untuk error**

## Workflow Lengkap

```
1. Admin Register & Login
2. Admin Tambah Obat
3. Dokter Register & Login
4. Dokter Tambah Pasien
5. Dokter Lihat Obat
6. Dokter Buat Resep
7. Admin Lihat Resep Pending
8. Admin Proses Resep
9. Admin Cek Stok
10. Admin Request/Receive Transfer jika perlu
```
