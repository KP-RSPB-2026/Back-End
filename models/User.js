const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nama harus diisi'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email harus diisi'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password harus diisi'],
      minlength: [6, 'Password minimal 6 karakter'],
      select: false,
    },
    role: {
      type: String,
      enum: ['dokter', 'admin_apotik'],
      required: [true, 'Role harus diisi'],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String,
      trim: true,
      // Hanya untuk dokter
    },
    licenseNumber: {
      type: String,
      trim: true,
      // Nomor SIP untuk dokter
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password sebelum disimpan
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method untuk membandingkan password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
