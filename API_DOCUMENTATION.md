# API Documentation - Sistem Manajemen Apotik

## Base URL
```
http://localhost:5000/api
```

## Authentication

Semua endpoint (kecuali register dan login) memerlukan JWT token di header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1. Authentication API

### 1.1 Register User

Membuat user baru (dokter atau admin apotik).

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 characters)",
  "role": "string (required, 'dokter' or 'admin_apotik')",
  "phoneNumber": "string (optional)",
  "specialization": "string (optional, untuk dokter)",
  "licenseNumber": "string (optional, untuk dokter)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "Dr. John Doe",
    "email": "dokter@example.com",
    "role": "dokter",
    "token": "jwt_token_here"
  }
}
```

---

### 1.2 Login

Login dan mendapatkan JWT token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "Dr. John Doe",
    "email": "dokter@example.com",
    "role": "dokter",
    "token": "jwt_token_here"
  }
}
```

---

### 1.3 Get Current User

Mendapatkan data user yang sedang login.

**Endpoint:** `GET /auth/me`

**Headers:** `Authorization: Bearer TOKEN`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "Dr. John Doe",
    "email": "dokter@example.com",
    "role": "dokter",
    "phoneNumber": "081234567890",
    "specialization": "Dokter Umum",
    "licenseNumber": "SIP123456",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 2. Patients API

### 2.1 Get All Patients

Mendapatkan daftar semua pasien.

**Endpoint:** `GET /patients`

**Headers:** `Authorization: Bearer TOKEN`

**Query Parameters:**
- `search` (optional) - Cari berdasarkan nama, nomor telepon, email, atau ID number
- `page` (optional, default: 1) - Halaman
- `limit` (optional, default: 10) - Jumlah data per halaman

**Example:** `GET /patients?search=john&page=1&limit=10`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "patient_id",
      "name": "John Doe",
      "dateOfBirth": "1985-05-15T00:00:00.000Z",
      "gender": "Laki-laki",
      "address": "Jl. Merdeka No. 10",
      "phoneNumber": "081234567890",
      "email": "john@example.com",
      "idNumber": "3171234567890001",
      "allergies": ["Penisilin"],
      "bloodType": "A+",
      "isActive": true,
      "createdBy": {
        "_id": "user_id",
        "name": "Dr. John Doe",
        "email": "dokter@example.com"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

---

### 2.2 Get Single Patient

Mendapatkan detail satu pasien.

**Endpoint:** `GET /patients/:id`

**Headers:** `Authorization: Bearer TOKEN`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "patient_id",
    "name": "John Doe",
    "dateOfBirth": "1985-05-15T00:00:00.000Z",
    "gender": "Laki-laki",
    "address": "Jl. Merdeka No. 10",
    "phoneNumber": "081234567890",
    "email": "john@example.com",
    "idNumber": "3171234567890001",
    "allergies": ["Penisilin"],
    "medicalHistory": "Diabetes",
    "bloodType": "A+",
    "isActive": true,
    "createdBy": {
      "_id": "user_id",
      "name": "Dr. John Doe",
      "email": "dokter@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2.3 Create Patient

Membuat pasien baru (hanya dokter).

**Endpoint:** `POST /patients`

**Headers:** `Authorization: Bearer DOKTER_TOKEN`

**Request Body:**
```json
{
  "name": "string (required)",
  "dateOfBirth": "ISO 8601 date (required)",
  "gender": "string (required, 'Laki-laki' or 'Perempuan')",
  "address": "string (optional)",
  "phoneNumber": "string (optional)",
  "email": "string (optional)",
  "idNumber": "string (optional, unique)",
  "allergies": ["string"] (optional),
  "medicalHistory": "string (optional)",
  "bloodType": "string (optional)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": { /* patient object */ }
}
```

---

## 3. Medicines API

### 3.1 Get All Medicines

Mendapatkan daftar semua obat.

**Endpoint:** `GET /medicines`

**Headers:** `Authorization: Bearer TOKEN`

**Query Parameters:**
- `search` (optional) - Cari berdasarkan nama, nama generik, atau kode
- `category` (optional) - Filter berdasarkan kategori
- `lowStock` (optional, true/false) - Filter obat dengan stok rendah
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

**Example:** `GET /medicines?search=para&category=Tablet&page=1`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "medicine_id",
      "code": "MED001",
      "name": "Paracetamol 500mg",
      "genericName": "Paracetamol",
      "category": "Tablet",
      "manufacturer": "Kimia Farma",
      "description": "Obat penurun panas",
      "dosage": "500mg",
      "unit": "Tablet",
      "stock": 100,
      "minStock": 20,
      "price": 5000,
      "expiryDate": "2025-12-31T00:00:00.000Z",
      "batchNumber": "BATCH001",
      "isActive": true,
      "sideEffects": ["Mual"],
      "contraindications": ["Gangguan hati"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

---

### 3.2 Create Medicine

Membuat obat baru (hanya admin apotik).

**Endpoint:** `POST /medicines`

**Headers:** `Authorization: Bearer ADMIN_TOKEN`

**Request Body:**
```json
{
  "code": "string (required, unique)",
  "name": "string (required)",
  "genericName": "string (optional)",
  "category": "string (required, enum)",
  "manufacturer": "string (optional)",
  "description": "string (optional)",
  "dosage": "string (optional)",
  "unit": "string (required, enum)",
  "stock": "number (required, >= 0)",
  "minStock": "number (optional, default: 10)",
  "price": "number (required, >= 0)",
  "expiryDate": "ISO 8601 date (optional)",
  "batchNumber": "string (optional)",
  "sideEffects": ["string"] (optional),
  "contraindications": ["string"] (optional)
}
```

**Categories:** Tablet, Kapsul, Sirup, Salep, Injeksi, Tetes, Supositoria, Inhaler, Lainnya

**Units:** Tablet, Kapsul, Botol, Box, Strip, Tube, Vial, Ampul, Sachet

**Success Response (201):**
```json
{
  "success": true,
  "data": { /* medicine object */ }
}
```

---

### 3.3 Update Medicine Stock

Menambah atau mengurangi stok obat.

**Endpoint:** `PATCH /medicines/:id/stock`

**Headers:** `Authorization: Bearer ADMIN_TOKEN`

**Request Body:**
```json
{
  "quantity": "number (required, > 0)",
  "operation": "string (required, 'add' or 'subtract')"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { /* updated medicine object */ }
}
```

---

### 3.4 Get Low Stock Medicines

Mendapatkan daftar obat dengan stok rendah.

**Endpoint:** `GET /medicines/alerts/low-stock`

**Headers:** `Authorization: Bearer ADMIN_TOKEN`

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [ /* array of medicines */ ]
}
```

---

### 3.5 Get Expiring Medicines

Mendapatkan daftar obat yang akan kadaluarsa.

**Endpoint:** `GET /medicines/alerts/expiring?days=30`

**Headers:** `Authorization: Bearer ADMIN_TOKEN`

**Query Parameters:**
- `days` (optional, default: 30) - Jumlah hari ke depan

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [ /* array of medicines */ ]
}
```

---

## 4. Prescriptions API

### 4.1 Get All Prescriptions

Mendapatkan daftar semua resep.

**Endpoint:** `GET /prescriptions`

**Headers:** `Authorization: Bearer TOKEN`

**Query Parameters:**
- `status` (optional) - Filter berdasarkan status
- `doctorId` (optional) - Filter berdasarkan dokter
- `patientId` (optional) - Filter berdasarkan pasien
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

**Note:** Dokter hanya bisa melihat resep yang mereka buat.

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "prescription_id",
      "prescriptionNumber": "RX202401000001",
      "patient": {
        "_id": "patient_id",
        "name": "John Doe",
        "dateOfBirth": "1985-05-15T00:00:00.000Z",
        "phoneNumber": "081234567890"
      },
      "doctor": {
        "_id": "doctor_id",
        "name": "Dr. Jane Smith",
        "email": "doctor@example.com",
        "specialization": "Dokter Umum"
      },
      "medicines": [
        {
          "medicine": {
            "_id": "medicine_id",
            "name": "Paracetamol 500mg",
            "code": "MED001",
            "unit": "Tablet",
            "price": 5000
          },
          "quantity": 10,
          "dosageInstructions": "3x sehari 1 tablet sesudah makan",
          "duration": "3 hari",
          "price": 50000
        }
      ],
      "diagnosis": "Demam",
      "notes": "Istirahat yang cukup",
      "totalPrice": 50000,
      "status": "pending",
      "prescriptionDate": "2024-01-01T00:00:00.000Z",
      "completedDate": null,
      "completedBy": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

---

### 4.2 Create Prescription

Membuat resep baru (hanya dokter).

**Endpoint:** `POST /prescriptions`

**Headers:** `Authorization: Bearer DOKTER_TOKEN`

**Request Body:**
```json
{
  "patient": "patient_id (required)",
  "medicines": [
    {
      "medicine": "medicine_id (required)",
      "quantity": "number (required, > 0)",
      "dosageInstructions": "string (required)",
      "duration": "string (optional)"
    }
  ],
  "diagnosis": "string (optional)",
  "notes": "string (optional)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": { /* prescription object */ }
}
```

**Note:** 
- Total price akan dihitung otomatis
- Prescription number akan di-generate otomatis

---

### 4.3 Update Prescription Status

Mengupdate status resep (hanya admin apotik).

**Endpoint:** `PATCH /prescriptions/:id/status`

**Headers:** `Authorization: Bearer ADMIN_TOKEN`

**Request Body:**
```json
{
  "status": "string (required, 'pending'|'disiapkan'|'selesai'|'dibatalkan')"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { /* updated prescription object */ }
}
```

**Note:** Saat status diubah ke "selesai", stok obat akan berkurang otomatis.

---

## 5. Transfers API

### 5.1 Get All Transfers

Mendapatkan daftar semua transfer obat.

**Endpoint:** `GET /transfers`

**Headers:** `Authorization: Bearer ADMIN_TOKEN`

**Query Parameters:**
- `type` (optional) - Filter berdasarkan tipe ('request' or 'receive')
- `status` (optional) - Filter berdasarkan status
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "transfer_id",
      "transferNumber": "REQ202401000001",
      "fromPharmacy": "Apotik Pusat",
      "toPharmacy": "Apotik Sehat",
      "type": "request",
      "medicines": [
        {
          "medicine": {
            "_id": "medicine_id",
            "name": "Paracetamol 500mg",
            "code": "MED001",
            "unit": "Tablet"
          },
          "quantity": 50,
          "receivedQuantity": 0,
          "notes": "Stok menipis"
        }
      ],
      "status": "pending",
      "requestDate": "2024-01-01T00:00:00.000Z",
      "completedDate": null,
      "requestedBy": {
        "_id": "user_id",
        "name": "Admin Apotik",
        "email": "admin@apotik.com"
      },
      "processedBy": null,
      "notes": "Mohon segera diproses",
      "urgency": "tinggi",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

---

### 5.2 Create Request to Another Pharmacy

Membuat permintaan obat ke apotik lain.

**Endpoint:** `POST /transfers/request`

**Headers:** `Authorization: Bearer ADMIN_TOKEN`

**Request Body:**
```json
{
  "toPharmacy": "string (required)",
  "medicines": [
    {
      "medicine": "medicine_id (required)",
      "quantity": "number (required, > 0)",
      "notes": "string (optional)"
    }
  ],
  "urgency": "string (optional, 'rendah'|'sedang'|'tinggi')",
  "notes": "string (optional)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": { /* transfer object */ }
}
```

---

### 5.3 Create Receive from Another Pharmacy

Mencatat penerimaan obat dari apotik lain.

**Endpoint:** `POST /transfers/receive`

**Headers:** `Authorization: Bearer ADMIN_TOKEN`

**Request Body:**
```json
{
  "fromPharmacy": "string (required)",
  "medicines": [
    {
      "medicine": "medicine_id (required)",
      "quantity": "number (required, > 0)",
      "notes": "string (optional)"
    }
  ],
  "notes": "string (optional)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": { /* transfer object */ }
}
```

---

### 5.4 Update Transfer Status

Mengupdate status transfer.

**Endpoint:** `PATCH /transfers/:id/status`

**Headers:** `Authorization: Bearer ADMIN_TOKEN`

**Request Body:**
```json
{
  "status": "string (required, 'pending'|'diproses'|'dikirim'|'diterima'|'ditolak'|'dibatalkan')",
  "receivedQuantities": [number] (optional)
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { /* updated transfer object */ }
}
```

**Note:** Saat status diubah ke "diterima" untuk type "receive", stok obat akan bertambah otomatis.

---

## Error Responses

Semua error menggunakan format yang sama:

```json
{
  "success": false,
  "message": "Error message here",
  "stack": "Stack trace (only in development)"
}
```

### Common Error Status Codes:

- **400 Bad Request** - Validasi gagal atau data tidak valid
- **401 Unauthorized** - Token tidak valid atau tidak ada
- **403 Forbidden** - User tidak memiliki akses
- **404 Not Found** - Resource tidak ditemukan
- **500 Internal Server Error** - Server error

### Example Error Response:

```json
{
  "success": false,
  "message": "Email atau password salah"
}
```

### Validation Error Response:

```json
{
  "success": false,
  "errors": [
    {
      "field": "email",
      "message": "Email tidak valid"
    },
    {
      "field": "password",
      "message": "Password minimal 6 karakter"
    }
  ]
}
```

---

## Status Values

### Prescription Status:
- `pending` - Menunggu diproses
- `disiapkan` - Sedang disiapkan
- `selesai` - Selesai (stok berkurang)
- `dibatalkan` - Dibatalkan

### Transfer Status:
- `pending` - Menunggu
- `diproses` - Sedang diproses
- `dikirim` - Sudah dikirim
- `diterima` - Sudah diterima (stok bertambah untuk type receive)
- `ditolak` - Ditolak
- `dibatalkan` - Dibatalkan

---

## Notes

1. **Timestamps**: Semua model memiliki `createdAt` dan `updatedAt` yang otomatis.
2. **Pagination**: Default limit adalah 10, bisa disesuaikan dengan query parameter.
3. **Search**: Case-insensitive partial matching.
4. **Auto-generated Numbers**: Prescription dan Transfer memiliki nomor yang auto-generated.
5. **Soft Delete**: Delete operations melakukan soft delete (set `isActive` = false).
