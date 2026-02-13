const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const {
  getPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescriptionStatus,
  cancelPrescription,
} = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middleware/auth');

// Validation rules
const prescriptionValidation = [
  body('patient').notEmpty().withMessage('Pasien harus dipilih'),
  body('medicines').isArray({ min: 1 }).withMessage('Minimal 1 obat harus dipilih'),
  body('medicines.*.medicine').notEmpty().withMessage('Obat harus dipilih'),
  body('medicines.*.quantity')
    .isNumeric()
    .withMessage('Jumlah harus berupa angka')
    .custom((value) => value > 0)
    .withMessage('Jumlah harus lebih dari 0'),
  body('medicines.*.dosageInstructions')
    .notEmpty()
    .withMessage('Instruksi dosis harus diisi'),
];

const statusValidation = [
  body('status')
    .isIn(['pending', 'disiapkan', 'selesai', 'dibatalkan'])
    .withMessage('Status tidak valid'),
];

// All routes require authentication
router.use(protect);

// Routes
router
  .route('/')
  .get(getPrescriptions)
  .post(authorize('dokter'), prescriptionValidation, validate, createPrescription);

router.route('/:id').get(getPrescription);

router
  .route('/:id/status')
  .patch(authorize('admin_apotik'), statusValidation, validate, updatePrescriptionStatus);

router.route('/:id').delete(authorize('dokter'), cancelPrescription);

module.exports = router;
