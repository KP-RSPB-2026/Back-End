const asyncHandler = require('express-async-handler');
const Patient = require('../models/Patient');

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;

  let query = { isActive: true };

  // Search by name, phone, or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { idNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const patients = await Patient.find(query)
    .populate('createdBy', 'name email')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Patient.countDocuments(query);

  res.json({
    success: true,
    data: patients,
    pagination: {
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit),
    },
  });
});

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id).populate(
    'createdBy',
    'name email'
  );

  if (!patient) {
    res.status(404);
    throw new Error('Pasien tidak ditemukan');
  }

  res.json({
    success: true,
    data: patient,
  });
});

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private (Dokter)
exports.createPatient = asyncHandler(async (req, res) => {
  const patientData = {
    ...req.body,
    createdBy: req.user._id,
  };

  const patient = await Patient.create(patientData);

  res.status(201).json({
    success: true,
    data: patient,
  });
});

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private (Dokter)
exports.updatePatient = asyncHandler(async (req, res) => {
  let patient = await Patient.findById(req.params.id);

  if (!patient) {
    res.status(404);
    throw new Error('Pasien tidak ditemukan');
  }

  patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: patient,
  });
});

// @desc    Delete patient (soft delete)
// @route   DELETE /api/patients/:id
// @access  Private (Dokter)
exports.deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    res.status(404);
    throw new Error('Pasien tidak ditemukan');
  }

  patient.isActive = false;
  await patient.save();

  res.json({
    success: true,
    message: 'Pasien berhasil dihapus',
  });
});
