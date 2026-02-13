const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNumber: {
      type: String,
      required: true,
      unique: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Pasien harus dipilih'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Dokter harus dipilih'],
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
        dosageInstructions: {
          type: String,
          required: true,
          // Misalnya: "3x sehari 1 tablet sesudah makan"
        },
        duration: {
          type: String,
          // Misalnya: "7 hari", "2 minggu"
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    diagnosis: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'disiapkan', 'selesai', 'dibatalkan'],
      default: 'pending',
    },
    prescriptionDate: {
      type: Date,
      default: Date.now,
    },
    completedDate: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Admin apotik yang menyelesaikan resep
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate prescription number
prescriptionSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Prescription').countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.prescriptionNumber = `RX${year}${month}${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
