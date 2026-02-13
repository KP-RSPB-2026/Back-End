const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Kode obat harus diisi'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Nama obat harus diisi'],
      trim: true,
    },
    genericName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Kategori obat harus diisi'],
      enum: [
        'Tablet',
        'Kapsul',
        'Sirup',
        'Salep',
        'Injeksi',
        'Tetes',
        'Supositoria',
        'Inhaler',
        'Lainnya',
      ],
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dosage: {
      type: String,
      trim: true,
      // Misalnya: "500mg", "10ml"
    },
    unit: {
      type: String,
      required: [true, 'Satuan harus diisi'],
      enum: ['Tablet', 'Kapsul', 'Botol', 'Box', 'Strip', 'Tube', 'Vial', 'Ampul', 'Sachet'],
    },
    stock: {
      type: Number,
      required: [true, 'Stok harus diisi'],
      default: 0,
      min: [0, 'Stok tidak boleh kurang dari 0'],
    },
    minStock: {
      type: Number,
      default: 10,
      // Batas minimum stok untuk alert
    },
    price: {
      type: Number,
      required: [true, 'Harga harus diisi'],
      min: [0, 'Harga tidak boleh kurang dari 0'],
    },
    expiryDate: {
      type: Date,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sideEffects: [
      {
        type: String,
        trim: true,
      },
    ],
    contraindications: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index untuk pencarian
medicineSchema.index({ name: 'text', genericName: 'text', code: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
