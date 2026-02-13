const asyncHandler = require('express-async-handler');
const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const Patient = require('../models/Patient');

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private
exports.getPrescriptions = asyncHandler(async (req, res) => {
  const { status, doctorId, patientId, page = 1, limit = 10 } = req.query;

  let query = {};

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by doctor
  if (doctorId) {
    query.doctor = doctorId;
  }

  // Filter by patient
  if (patientId) {
    query.patient = patientId;
  }

  // If user is dokter, only show their prescriptions
  if (req.user.role === 'dokter') {
    query.doctor = req.user._id;
  }

  const prescriptions = await Prescription.find(query)
    .populate('patient', 'name dateOfBirth phoneNumber')
    .populate('doctor', 'name email specialization')
    .populate('medicines.medicine', 'name code unit price')
    .populate('completedBy', 'name email')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Prescription.countDocuments(query);

  res.json({
    success: true,
    data: prescriptions,
    pagination: {
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit),
    },
  });
});

// @desc    Get single prescription
// @route   GET /api/prescriptions/:id
// @access  Private
exports.getPrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patient', 'name dateOfBirth phoneNumber address allergies')
    .populate('doctor', 'name email specialization licenseNumber')
    .populate('medicines.medicine', 'name genericName code unit')
    .populate('completedBy', 'name email');

  if (!prescription) {
    res.status(404);
    throw new Error('Resep tidak ditemukan');
  }

  // Check authorization
  if (
    req.user.role === 'dokter' &&
    prescription.doctor._id.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Tidak memiliki akses ke resep ini');
  }

  res.json({
    success: true,
    data: prescription,
  });
});

// @desc    Create new prescription
// @route   POST /api/prescriptions
// @access  Private (Dokter)
exports.createPrescription = asyncHandler(async (req, res) => {
  const { patient, medicines, diagnosis, notes } = req.body;

  // Verify patient exists
  const patientExists = await Patient.findById(patient);
  if (!patientExists) {
    res.status(404);
    throw new Error('Pasien tidak ditemukan');
  }

  // Verify medicines exist and calculate total price
  let totalPrice = 0;
  const medicineDetails = [];

  for (let item of medicines) {
    const medicine = await Medicine.findById(item.medicine);
    if (!medicine) {
      res.status(404);
      throw new Error(`Obat dengan ID ${item.medicine} tidak ditemukan`);
    }

    const itemPrice = medicine.price * item.quantity;
    totalPrice += itemPrice;

    medicineDetails.push({
      medicine: item.medicine,
      quantity: item.quantity,
      dosageInstructions: item.dosageInstructions,
      duration: item.duration,
      price: itemPrice,
    });
  }

  const prescription = await Prescription.create({
    patient,
    doctor: req.user._id,
    medicines: medicineDetails,
    diagnosis,
    notes,
    totalPrice,
  });

  const populatedPrescription = await Prescription.findById(prescription._id)
    .populate('patient', 'name dateOfBirth phoneNumber')
    .populate('doctor', 'name email specialization')
    .populate('medicines.medicine', 'name code unit');

  res.status(201).json({
    success: true,
    data: populatedPrescription,
  });
});

// @desc    Update prescription status
// @route   PATCH /api/prescriptions/:id/status
// @access  Private (Admin Apotik)
exports.updatePrescriptionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    res.status(404);
    throw new Error('Resep tidak ditemukan');
  }

  // If status is 'selesai', reduce medicine stock
  if (status === 'selesai' && prescription.status !== 'selesai') {
    for (let item of prescription.medicines) {
      const medicine = await Medicine.findById(item.medicine);
      
      if (!medicine) {
        res.status(404);
        throw new Error(`Obat tidak ditemukan`);
      }

      if (medicine.stock < item.quantity) {
        res.status(400);
        throw new Error(`Stok ${medicine.name} tidak mencukupi`);
      }

      medicine.stock -= item.quantity;
      await medicine.save();
    }

    prescription.completedDate = Date.now();
    prescription.completedBy = req.user._id;
  }

  prescription.status = status;
  await prescription.save();

  const updatedPrescription = await Prescription.findById(prescription._id)
    .populate('patient', 'name dateOfBirth phoneNumber')
    .populate('doctor', 'name email specialization')
    .populate('medicines.medicine', 'name code unit')
    .populate('completedBy', 'name email');

  res.json({
    success: true,
    data: updatedPrescription,
  });
});

// @desc    Cancel prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private (Dokter - own prescriptions only)
exports.cancelPrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    res.status(404);
    throw new Error('Resep tidak ditemukan');
  }

  // Only the doctor who created can cancel
  if (
    req.user.role === 'dokter' &&
    prescription.doctor.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Tidak memiliki akses untuk membatalkan resep ini');
  }

  // Can only cancel if not yet completed
  if (prescription.status === 'selesai') {
    res.status(400);
    throw new Error('Resep yang sudah selesai tidak dapat dibatalkan');
  }

  prescription.status = 'dibatalkan';
  await prescription.save();

  res.json({
    success: true,
    message: 'Resep berhasil dibatalkan',
  });
});
