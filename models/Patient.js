const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nama pasien harus diisi'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Tanggal lahir harus diisi'],
    },
    gender: {
      type: String,
      enum: ['Laki-laki', 'Perempuan'],
      required: [true, 'Jenis kelamin harus diisi'],
    },
    address: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    idNumber: {
      type: String,
      unique: true,
      sparse: true,
      // NIK atau nomor identitas lainnya
    },
    allergies: [
      {
        type: String,
        trim: true,
      },
    ],
    medicalHistory: {
      type: String,
      trim: true,
    },
    bloodType: {
      type: String,
      enum: ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Patient', patientSchema);
