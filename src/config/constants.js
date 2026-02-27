// Constants untuk aplikasi

// Medicine Categories
exports.MEDICINE_CATEGORIES = [
  'Tablet',
  'Kapsul',
  'Sirup',
  'Salep',
  'Injeksi',
  'Tetes',
  'Supositoria',
  'Inhaler',
  'Lainnya',
];

// Medicine Units
exports.MEDICINE_UNITS = [
  'Tablet',
  'Kapsul',
  'Botol',
  'Box',
  'Strip',
  'Tube',
  'Vial',
  'Ampul',
  'Sachet',
];

// User Roles
exports.USER_ROLES = {
  DOKTER: 'dokter',
  ADMIN_APOTIK: 'admin_apotik',
};

// Prescription Status
exports.PRESCRIPTION_STATUS = {
  PENDING: 'pending',
  DISIAPKAN: 'disiapkan',
  SELESAI: 'selesai',
  DIBATALKAN: 'dibatalkan',
};

// Transfer Status
exports.TRANSFER_STATUS = {
  PENDING: 'pending',
  DIPROSES: 'diproses',
  DIKIRIM: 'dikirim',
  DITERIMA: 'diterima',
  DITOLAK: 'ditolak',
  DIBATALKAN: 'dibatalkan',
};

// Transfer Types
exports.TRANSFER_TYPES = {
  REQUEST: 'request',
  RECEIVE: 'receive',
};

// Urgency Levels
exports.URGENCY_LEVELS = {
  RENDAH: 'rendah',
  SEDANG: 'sedang',
  TINGGI: 'tinggi',
};

// Gender
exports.GENDER = {
  LAKI_LAKI: 'Laki-laki',
  PEREMPUAN: 'Perempuan',
};

// Blood Types
exports.BLOOD_TYPES = [
  'A',
  'B',
  'AB',
  'O',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

// Pagination defaults
exports.PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// JWT
exports.JWT = {
  DEFAULT_EXPIRE: '7d',
};

// Error Messages
exports.ERROR_MESSAGES = {
  UNAUTHORIZED: 'Tidak memiliki authorization',
  INVALID_TOKEN: 'Token tidak valid',
  INVALID_CREDENTIALS: 'Email atau password salah',
  USER_NOT_FOUND: 'User tidak ditemukan',
  PATIENT_NOT_FOUND: 'Pasien tidak ditemukan',
  MEDICINE_NOT_FOUND: 'Obat tidak ditemukan',
  PRESCRIPTION_NOT_FOUND: 'Resep tidak ditemukan',
  TRANSFER_NOT_FOUND: 'Transfer tidak ditemukan',
  INSUFFICIENT_STOCK: 'Stok tidak mencukupi',
  ACCESS_DENIED: 'Tidak memiliki akses',
};

// Success Messages
exports.SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login berhasil',
  LOGOUT_SUCCESS: 'Logout berhasil',
  REGISTER_SUCCESS: 'Registrasi berhasil',
  UPDATE_SUCCESS: 'Update berhasil',
  DELETE_SUCCESS: 'Hapus berhasil',
  CREATE_SUCCESS: 'Berhasil dibuat',
};
