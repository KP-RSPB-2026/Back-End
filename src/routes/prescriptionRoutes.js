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
const { PRESCRIPTION_STATUS } = require('../config/constants');

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
    .isIn(Object.values(PRESCRIPTION_STATUS))
    .withMessage('Status tidak valid'),
  body('dispensedTo')
    .optional()
    .isIn(['pasien', 'dokter'])
    .withMessage('dispensedTo harus pasien atau dokter'),
  body('dispenseInputPatientName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('dispenseInputPatientName harus 1-150 karakter'),
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
