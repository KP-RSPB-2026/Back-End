# Arsitektur Sistem Backend

## 1. Arsitektur Keseluruhan

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  (Mobile App / Web App / API Testing Tools)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express Server (server.js)                          │  │
│  │  - CORS Middleware                                   │  │
│  │  - Body Parser                                       │  │
│  │  - Route Handler                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE LAYER                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Auth         │  │ Validator    │  │ Error Handler   │  │
│  │ Middleware   │  │ Middleware   │  │                 │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     ROUTES LAYER                             │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Auth     │ │ Patient  │ │ Medicine │ │ Prescription │  │
│  │ Routes   │ │ Routes   │ │ Routes   │ │ Routes       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│                           ┌──────────┐                      │
│                           │ Transfer │                      │
│                           │ Routes   │                      │
│                           └──────────┘                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  CONTROLLERS LAYER                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ Auth         │  │ Patient      │  │ Medicine       │   │
│  │ Controller   │  │ Controller   │  │ Controller     │   │
│  └──────────────┘  └──────────────┘  └────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Prescription │  │ Transfer     │                       │
│  │ Controller   │  │ Controller   │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     MODELS LAYER                             │
│                   (Mongoose Schemas)                         │
│                                                              │
│  ┌──────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐       │
│  │ User │ │ Patient │ │ Medicine │ │ Prescription │       │
│  └──────┘ └─────────┘ └──────────┘ └──────────────┘       │
│                    ┌──────────────────┐                     │
│                    │ MedicineTransfer │                     │
│                    └──────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                            │
│                                                              │
│                    ┌─────────────┐                          │
│                    │   MongoDB   │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## 2. Request Flow

### Contoh: Dokter Membuat Resep

```
1. Client Request
   POST /api/prescriptions
   Headers: { Authorization: Bearer TOKEN }
   Body: { patient, medicines, diagnosis }
          ↓
2. Express Server
   - Parse request body
   - Apply CORS
          ↓
3. Auth Middleware
   - Verify JWT token
   - Extract user from token
   - Check if user is active
          ↓
4. Authorize Middleware
   - Check if role = 'dokter'
          ↓
5. Validation Middleware
   - Validate request body
   - Check required fields
          ↓
6. Prescription Routes
   - Route to createPrescription
          ↓
7. Prescription Controller
   - Verify patient exists
   - Verify medicines exist
   - Calculate total price
   - Create prescription
   - Auto-generate prescription number
          ↓
8. Mongoose Model
   - Save to MongoDB
   - Run pre-save hooks
          ↓
9. MongoDB
   - Store document
   - Return saved document
          ↓
10. Response
   - Populate related data
   - Send JSON response to client
```

## 3. Database Schema Relationships

```
┌─────────────┐
│    User     │
│  (Dokter/   │
│   Admin)    │
└─────────────┘
      │
      │ createdBy
      ▼
┌─────────────┐         ┌─────────────────┐
│   Patient   │────────▶│  Prescription   │
└─────────────┘ patient └─────────────────┘
                              │
                              │ doctor
                              ▼
                        ┌─────────────┐
                        │    User     │
                        │  (Dokter)   │
                        └─────────────┘
                              │
                              │ completedBy
                              ▼
                        ┌─────────────┐
                        │    User     │
                        │   (Admin)   │
                        └─────────────┘

┌──────────────┐       ┌─────────────────┐
│   Medicine   │◀──────│  Prescription   │
└──────────────┘       │    .medicines   │
                       └─────────────────┘

┌──────────────┐       ┌──────────────────┐
│   Medicine   │◀──────│ MedicineTransfer │
└──────────────┘       │    .medicines    │
                       └──────────────────┘
                              │
                              │ requestedBy
                              ▼
                        ┌─────────────┐
                        │    User     │
                        │   (Admin)   │
                        └─────────────┘
```

## 4. Authentication Flow

```
┌────────────┐
│   Client   │
└────────────┘
      │
      │ POST /api/auth/login
      │ { email, password }
      ▼
┌─────────────────┐
│ Auth Controller │
└─────────────────┘
      │
      │ 1. Find user by email
      ▼
┌─────────────┐
│  Database   │
└─────────────┘
      │
      │ 2. User found?
      ▼
┌─────────────────┐
│   User Model    │
│ .matchPassword()│
└─────────────────┘
      │
      │ 3. Compare hashed password
      ▼
┌─────────────────┐
│   bcryptjs      │
└─────────────────┘
      │
      │ 4. Password valid?
      ▼
┌─────────────────┐
│  Generate JWT   │
│  (jsonwebtoken) │
└─────────────────┘
      │
      │ 5. Return token
      ▼
┌────────────┐
│   Client   │
│ Save token │
└────────────┘
      │
      │ Subsequent requests
      │ Header: Authorization: Bearer TOKEN
      ▼
┌─────────────────┐
│ Auth Middleware │
└─────────────────┘
      │
      │ 1. Extract token
      │ 2. Verify token
      │ 3. Decode user ID
      │ 4. Load user
      │ 5. Attach to req.user
      ▼
┌─────────────────┐
│   Controller    │
│ Access req.user │
└─────────────────┘
```

## 5. Medicine Stock Management Flow

```
SCENARIO 1: Admin Menambah Stok Manual
┌──────────┐
│  Admin   │
└──────────┘
     │ PATCH /medicines/:id/stock
     │ { quantity: 50, operation: 'add' }
     ▼
┌──────────────────┐
│ Medicine         │
│ Controller       │
│ .updateStock()   │
└──────────────────┘
     │ medicine.stock += 50
     │ medicine.save()
     ▼
┌──────────────────┐
│    Database      │
│  stock updated   │
└──────────────────┘

SCENARIO 2: Resep Selesai - Stok Berkurang Otomatis
┌──────────┐
│  Admin   │
└──────────┘
     │ PATCH /prescriptions/:id/status
     │ { status: 'selesai' }
     ▼
┌──────────────────────┐
│ Prescription         │
│ Controller           │
│ .updateStatus()      │
└──────────────────────┘
     │ Loop each medicine
     │ in prescription
     ▼
┌──────────────────┐
│ Medicine Model   │
│ stock -= qty     │
│ save()           │
└──────────────────┘
     │ Check if stock enough
     │ Reduce stock
     ▼
┌──────────────────┐
│    Database      │
│  stock updated   │
└──────────────────┘

SCENARIO 3: Terima Transfer - Stok Bertambah Otomatis
┌──────────┐
│  Admin   │
└──────────┘
     │ PATCH /transfers/:id/status
     │ { status: 'diterima' }
     ▼
┌──────────────────────┐
│ Transfer             │
│ Controller           │
│ .updateStatus()      │
└──────────────────────┘
     │ If type = 'receive'
     │ Loop each medicine
     ▼
┌──────────────────┐
│ Medicine Model   │
│ stock += qty     │
│ save()           │
└──────────────────┘
     │ Add to stock
     ▼
┌──────────────────┐
│    Database      │
│  stock updated   │
└──────────────────┘
```

## 6. Role-Based Access Control

```
┌──────────────────────────────────────────────────┐
│                  DOKTER ROLE                      │
├──────────────────────────────────────────────────┤
│ ✓ Login & Logout                                 │
│ ✓ Manage own profile                             │
│ ✓ View all patients                              │
│ ✓ Create patient                                 │
│ ✓ Update patient                                 │
│ ✓ Delete patient (soft delete)                   │
│ ✓ View medicines (read-only)                     │
│ ✓ View own prescriptions                         │
│ ✓ Create prescription                            │
│ ✓ Cancel own prescription (if not completed)     │
│ ✗ Manage medicine stock                          │
│ ✗ Process prescriptions                          │
│ ✗ Manage transfers                               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│              ADMIN APOTIK ROLE                    │
├──────────────────────────────────────────────────┤
│ ✓ Login & Logout                                 │
│ ✓ Manage own profile                             │
│ ✓ View all patients (read-only)                  │
│ ✓ View all medicines                             │
│ ✓ Create medicine                                │
│ ✓ Update medicine                                │
│ ✓ Delete medicine (soft delete)                  │
│ ✓ Update medicine stock                          │
│ ✓ View low stock alerts                          │
│ ✓ View expiring medicines                        │
│ ✓ View all prescriptions                         │
│ ✓ Update prescription status                     │
│ ✓ View all transfers                             │
│ ✓ Create transfer request                        │
│ ✓ Create transfer receive                        │
│ ✓ Update transfer status                         │
│ ✓ Cancel transfer                                │
│ ✗ Create patient                                 │
│ ✗ Create prescription                            │
└──────────────────────────────────────────────────┘
```

## 7. Technology Stack

```
┌─────────────────────────────────────────┐
│         RUNTIME ENVIRONMENT              │
│            Node.js v14+                  │
└─────────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼────────┐          ┌───────▼──────┐
│  Backend   │          │   Database   │
│  Express   │◀────────▶│   MongoDB    │
│   v4.18    │          │              │
└────────────┘          └──────────────┘
    │
    ├── Mongoose ODM v8.0
    ├── bcryptjs (password hashing)
    ├── jsonwebtoken (JWT auth)
    ├── express-validator (validation)
    ├── express-async-handler (async error handling)
    ├── cors (cross-origin)
    └── dotenv (environment config)
```

## 8. Security Measures

```
1. Password Security
   ├── Hashing dengan bcryptjs
   ├── Salt rounds: 10
   └── Password tidak pernah di-return dalam response

2. Authentication
   ├── JWT token-based
   ├── Token expiry: 7 days (configurable)
   └── Token verification di setiap protected route

3. Authorization
   ├── Role-based access control
   ├── Route-level authorization
   └── Resource-level authorization (dokter hanya bisa akses resep sendiri)

4. Validation
   ├── Input validation dengan express-validator
   ├── Mongoose schema validation
   └── Custom business logic validation

5. Error Handling
   ├── Centralized error handler
   ├── Tidak expose stack trace di production
   └── Consistent error response format

6. CORS
   ├── Configurable allowed origins
   └── Credentials support
```

## 9. Data Flow Examples

### Example 1: Low Stock Alert
```
Scheduler/Cron Job (optional)
        ↓
GET /medicines/alerts/low-stock
        ↓
Medicine.find({ $expr: { $lte: ['$stock', '$minStock'] } })
        ↓
Return medicines with stock <= minStock
```

### Example 2: Auto-generate Numbers
```
Create Prescription
        ↓
pre-save hook triggered
        ↓
Count existing prescriptions
        ↓
Generate: RX + YYYYMM + 00001
        ↓
RX202401000001
```

---

**Diagram ini menjelaskan arsitektur lengkap dari sistem backend yang telah dibuat.**
