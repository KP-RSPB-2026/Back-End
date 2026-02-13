# Quick Start Guide - Backend API Sistem Apotik

## 📋 Prerequisites

Pastikan sudah terinstall:
- Node.js (v14 atau lebih baru)
- MongoDB (local atau MongoDB Atlas)
- npm atau yarn

## 🚀 Instalasi Cepat

### 1. Install Dependencies

```bash
cd Back-End
npm install
```

### 2. Setup Environment

Buat file `.env` dari template:

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit file `.env` sesuai kebutuhan:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/apotik_db
JWT_SECRET=your_secret_key_here_change_this
JWT_EXPIRE=7d
ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Jalankan MongoDB

**Jika menggunakan MongoDB lokal:**
```bash
# Windows (buka command prompt baru)
mongod

# Linux/Mac
sudo systemctl start mongodb
```

**Jika menggunakan MongoDB Atlas:**
- Ganti `MONGODB_URI` di `.env` dengan connection string dari Atlas

### 4. Seed Database dengan Data Sample

```bash
npm run seed
```

Ini akan membuat:
- 1 Admin Apotik (admin@apotik.com / admin123)
- 1 Dokter (dokter@apotik.com / dokter123)
- 3 Pasien sample
- 8 Obat sample

### 5. Jalankan Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

Server akan berjalan di: `http://localhost:5000`

## ✅ Verifikasi Instalasi

### Test 1: Cek Health Check

Buka browser atau Postman dan akses:
```
GET http://localhost:5000
```

Jika berhasil, akan muncul response JSON dengan daftar endpoints.

### Test 2: Login

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@apotik.com",
  "password": "admin123"
}
```

Jika berhasil, Anda akan mendapat token JWT.

## 📝 Testing API

### Menggunakan VS Code REST Client

1. Install extension "REST Client" di VS Code
2. Buka file `api-test.http`
3. Update variable `@token` dengan token dari login
4. Click "Send Request" untuk test endpoint

### Menggunakan Postman

1. Import collection
2. Setup environment variable untuk token
3. Test endpoints satu per satu

## 🔑 Login Credentials

Setelah running seed:

**Admin Apotik:**
- Email: `admin@apotik.com`
- Password: `admin123`

**Dokter:**
- Email: `dokter@apotik.com`
- Password: `dokter123`

## 📚 Dokumentasi Lengkap

- **API Documentation**: Lihat file `API_DOCUMENTATION.md`
- **Usage Guide**: Lihat file `USAGE_GUIDE.md`
- **README**: Lihat file `README.md`

## 🛠️ Troubleshooting

### Error: MongoDB connection failed

**Solusi:**
1. Pastikan MongoDB running
2. Check connection string di `.env`
3. Test koneksi dengan MongoDB Compass

### Error: Port already in use

**Solusi:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Atau ganti port di .env
PORT=3000
```

### Error: Cannot find module

**Solusi:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📁 Struktur Project

```
Back-End/
├── config/           # Konfigurasi database
├── controllers/      # Business logic
├── middleware/       # Authentication, validation, error handling
├── models/           # Database schemas
├── routes/           # API routes
├── .env             # Environment variables (create this)
├── .env.example     # Template environment
├── server.js        # Entry point
├── seed.js          # Database seeder
└── package.json     # Dependencies
```

## 🎯 Next Steps

1. ✅ Setup dan jalankan server
2. ✅ Test login dan dapatkan token
3. ✅ Test beberapa endpoints dengan Postman/REST Client
4. 📖 Baca `USAGE_GUIDE.md` untuk workflow lengkap
5. 📖 Baca `API_DOCUMENTATION.md` untuk detail API

## 💡 Tips

- Gunakan `npm run dev` untuk development (auto-reload)
- Gunakan `npm run seed` untuk reset database dengan data sample
- Simpan token JWT dengan aman
- Check console untuk log error

## 📞 Support

Jika ada masalah, check:
1. Console log server untuk error details
2. MongoDB connection status
3. Environment variables di `.env`

---

**Selamat mencoba! 🎉**
