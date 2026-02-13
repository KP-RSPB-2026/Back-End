const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

// Validation rules
const patientValidation = [
  body('name').trim().notEmpty().withMessage('Nama pasien harus diisi'),
  body('dateOfBirth').isISO8601().withMessage('Tanggal lahir tidak valid'),
  body('gender')
    .isIn(['Laki-laki', 'Perempuan'])
    .withMessage('Jenis kelamin harus Laki-laki atau Perempuan'),
];

// All routes require authentication
router.use(protect);

// Routes
router
  .route('/')
  .get(getPatients)
  .post(authorize('dokter'), patientValidation, validate, createPatient);

router
  .route('/:id')
  .get(getPatient)
  .put(authorize('dokter'), updatePatient)
  .delete(authorize('dokter'), deletePatient);

module.exports = router;
