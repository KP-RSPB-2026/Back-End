const mongoose = require('mongoose');

const medicineTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: true,
      unique: true,
    },
    fromPharmacy: {
      type: String,
      required: [true, 'Apotik pengirim harus diisi'],
      trim: true,
    },
    toPharmacy: {
      type: String,
      required: [true, 'Apotik penerima harus diisi'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['request', 'receive'],
      required: true,
      // request: permintaan obat ke apotik lain
      // receive: penerimaan obat dari apotik lain
    },
    medicines: [
      {
        medicine: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Medicine',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Jumlah minimal 1'],
        },
        receivedQuantity: {
          type: Number,
          default: 0,
          // Jumlah yang diterima (bisa berbeda dari yang diminta)
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'diproses', 'dikirim', 'diterima', 'ditolak', 'dibatalkan'],
      default: 'pending',
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    completedDate: {
      type: Date,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
    },
    urgency: {
      type: String,
      enum: ['rendah', 'sedang', 'tinggi'],
      default: 'sedang',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate transfer number
medicineTransferSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('MedicineTransfer').countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = this.type === 'request' ? 'REQ' : 'RCV';
    this.transferNumber = `${prefix}${year}${month}${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('MedicineTransfer', medicineTransferSchema);
