# Back-End API Sistem Manajemen Apotik

Backend REST API untuk sistem manajemen apotik yang mendukung manajemen pasien, resep, obat, dan transfer antar apotik.

## Fitur Utama

### Untuk Dokter:
- ✅ Login & Logout
- ✅ Memilih Pasien
- ✅ Membuat Resep
- ✅ Menambahkan Obat ke Resep
- ✅ Melihat Stok Obat

### Untuk Admin Apotik:
- ✅ Login & Logout
- ✅ Mengelola Stok Obat (CRUD)
- ✅ Mengubah Stok Obat
- ✅ Menambah Stok Obat
- ✅ Menghapus Stok Obat
- ✅ Melihat Stok Obat
- ✅ Memperbarui Stok Obat
- ✅ Menerima Obat dari Apotik Lain
- ✅ Request Obat ke Apotik Lain

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL / MariaDB (XAMPP)
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcryptjs
- **Validation:** express-validator

## Struktur Project

```
Back-End/
├── config/
│   └── db.js                 # Konfigurasi database
├── controllers/
│   ├── authController.js     # Login, Register, Profile
│   ├── patientController.js  # Manajemen Pasien
│   ├── medicineController.js # Manajemen Obat
│   ├── prescriptionController.js # Manajemen Resep
│   └── transferController.js # Transfer Obat Antar Apotik
├── middleware/
│   ├── auth.js              # Autentikasi & Autorisasi
│   ├── errorHandler.js      # Error Handling
│   └── validator.js         # Validasi Input
├── scripts/
│   └── initDb.js            # Inisialisasi schema MySQL
├── routes/
│   ├── authRoutes.js
│   ├── patientRoutes.js
│   ├── medicineRoutes.js
│   ├── prescriptionRoutes.js
│   └── transferRoutes.js
├── seed.mysql.js
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Instalasi & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Salin file `.env.example` menjadi `.env` dan sesuaikan konfigurasi:

```bash
cp .env.example .env
```

Edit file `.env`:

```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=apotik_db
DB_CONNECTION_LIMIT=10

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### 3. Setup MySQL / MariaDB (XAMPP)

Pastikan MySQL/MariaDB di XAMPP sudah berjalan.

### 4. Inisialisasi Schema Database

```bash
npm run db:init
```

### 5. Seed Data Demo (Opsional)

```bash
npm run seed
```

### 6. Jalankan Server

**Development Mode (dengan auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Server akan berjalan di `http://localhost:5000`

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| POST | `/api/auth/register` | Public | Register user baru |
| POST | `/api/auth/login` | Public | Login user |
| GET | `/api/auth/me` | Private | Get user profile |
| POST | `/api/auth/logout` | Private | Logout user |
| PUT | `/api/auth/profile` | Private | Update profile |

### Patients (`/api/patients`)

| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| GET | `/api/patients` | Private | Get semua pasien |
| GET | `/api/patients/:id` | Private | Get detail pasien |
| POST | `/api/patients` | Dokter | Tambah pasien baru |
| PUT | `/api/patients/:id` | Dokter | Update pasien |
| DELETE | `/api/patients/:id` | Dokter | Hapus pasien |

### Medicines (`/api/medicines`)

| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| GET | `/api/medicines` | Private | Get semua obat |
| GET | `/api/medicines/:id` | Private | Get detail obat |
| POST | `/api/medicines` | Admin Apotik | Tambah obat baru |
| PUT | `/api/medicines/:id` | Admin Apotik | Update obat |
| PATCH | `/api/medicines/:id/stock` | Admin Apotik | Update stok obat |
| DELETE | `/api/medicines/:id` | Admin Apotik | Hapus obat |
| GET | `/api/medicines/alerts/low-stock` | Admin Apotik | Obat stok rendah |
| GET | `/api/medicines/alerts/expiring` | Admin Apotik | Obat kadaluarsa |

### Prescriptions (`/api/prescriptions`)

| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| GET | `/api/prescriptions` | Private | Get semua resep |
| GET | `/api/prescriptions/:id` | Private | Get detail resep |
| POST | `/api/prescriptions` | Dokter | Buat resep baru |
| PATCH | `/api/prescriptions/:id/status` | Admin Apotik | Update status resep + simpan data dispensing |
| DELETE | `/api/prescriptions/:id` | Dokter | Batalkan resep |

### Transfers (`/api/transfers`)

| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| GET | `/api/transfers` | Admin Apotik | Get semua transfer |
| GET | `/api/transfers/:id` | Admin Apotik | Get detail transfer |
| POST | `/api/transfers/request` | Admin Apotik | Request obat ke apotik lain |
| POST | `/api/transfers/receive` | Admin Apotik | Terima obat dari apotik lain |
| PATCH | `/api/transfers/:id/status` | Admin Apotik | Update status transfer |
| DELETE | `/api/transfers/:id` | Admin Apotik | Batalkan transfer |

## Contoh Request

### 1. Register User (Admin Apotik)

```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "Admin Apotik 1",
  "email": "admin@apotik.com",
  "password": "password123",
  "role": "admin_apotik",
  "phoneNumber": "081234567890"
}
```

### 2. Register User (Dokter)

```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "Dr. John Doe",
  "email": "dokter@example.com",
  "password": "password123",
  "role": "dokter",
  "phoneNumber": "081234567890",
  "specialization": "Umum",
  "licenseNumber": "SIP123456"
}
```

### 3. Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "dokter@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Dr. John Doe",
    "email": "dokter@example.com",
    "role": "dokter",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 4. Tambah Obat (dengan Authorization)

```bash
POST /api/medicines
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "code": "MED001",
  "name": "Paracetamol",
  "genericName": "Paracetamol",
  "category": "Tablet",
  "manufacturer": "Kimia Farma",
  "dosage": "500mg",
  "unit": "Tablet",
  "stock": 100,
  "minStock": 20,
  "price": 5000
}
```

### 5. Buat Resep

```bash
POST /api/prescriptions
Authorization: Bearer DOKTER_JWT_TOKEN
Content-Type: application/json

{
  "patient": "PATIENT_ID",
  "medicines": [
    {
      "medicine": "MEDICINE_ID",
      "quantity": 10,
      "dosageInstructions": "3x sehari 1 tablet sesudah makan",
      "duration": "3 hari"
    }
  ],
  "diagnosis": "Demam",
  "notes": "Banyak istirahat dan minum air putih"
}
```

### 6. Update Stok Obat

```bash
PATCH /api/medicines/:id/stock
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "quantity": 50,
  "operation": "add"
}
```

### 6a. Update Status Resep (dengan data dispensing)

```bash
PATCH /api/prescriptions/:id/status
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "status": "selesai",
  "dispensedTo": "pasien",
  "dispenseInputPatientName": "Budi Santoso"
}
```

Catatan:
- `dispenseInputPatientName` bersifat opsional, jika kosong akan otomatis memakai nama pasien dari data resep.
- Response detail resep akan berisi `dispenseInfo` (nama pasien dari resep + nama pasien input saat dispensing).

### 7. Request Obat ke Apotik Lain

```bash
POST /api/transfers/request
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "toPharmacy": "Apotik Sehat",
  "medicines": [
    {
      "medicine": "MEDICINE_ID",
      "quantity": 20,
      "notes": "Urgent"
    }
  ],
  "urgency": "tinggi",
  "notes": "Stok menipis"
}
```

## Authentication

API menggunakan JWT (JSON Web Token) untuk autentikasi. 

**Cara penggunaan:**
1. Login melalui `/api/auth/login` untuk mendapatkan token
2. Sertakan token di header setiap request:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

## Error Handling

API menggunakan format error response yang konsisten:

```json
{
  "success": false,
  "message": "Pesan error",
  "stack": "Stack trace (hanya di development mode)"
}
```

**HTTP Status Codes:**
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Database Models

### User
- Dokter dan Admin Apotik
- Role-based access control

### Patient
- Data pasien lengkap
- Riwayat medis dan alergi

### Medicine
- Informasi obat lengkap
- Tracking stok dan expired date
- Alert untuk stok rendah

### Prescription
- Resep dari dokter
- Multiple medicines per prescription
- Auto-generated prescription number

### MedicineTransfer
- Request dan receive obat
- Tracking status transfer
- Auto-generated transfer number

## Development

### Tambah Fitur Baru

1. Tambahkan/ubah schema di `scripts/initDb.js` (jika perlu tabel/kolom baru)
2. Buat/ubah controller di folder `controllers/`
3. Buat/ubah routes di folder `routes/`
4. Register routes di `server.js`

### Testing

Gunakan tools seperti:
- **Postman** - untuk testing manual
- **Thunder Client** (VS Code Extension)
- **Insomnia**

## Production Deployment

### 1. Set Environment ke Production

```env
NODE_ENV=production
```

### 2. Gunakan Process Manager (PM2)

```bash
npm install -g pm2
pm2 start server.js --name apotik-api
pm2 save
pm2 startup
```

### 3. Setup Reverse Proxy (Nginx)

```nginx
location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Troubleshooting

### MySQL Connection Error

- Pastikan service MySQL/MariaDB di XAMPP sudah running
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` di `.env`
- Pastikan user DB punya akses ke database `apotik_db`

### Port Already in Use

```bash
# Windows - kill process di port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Atau gunakan port lain di .env
PORT=3000
```

## Lisensi

ISC

## Kontak & Support

Untuk pertanyaan dan support, silakan buat issue di repository ini.

---

**Dibuat dengan ❤️ untuk Sistem Manajemen Apotik**
