const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const {
  getTransfers,
  getTransfer,
  createRequest,
  createReceive,
  updateTransferStatus,
  cancelTransfer,
} = require('../controllers/transferController');
const { protect, authorize } = require('../middleware/auth');
const { TRANSFER_STATUS } = require('../config/constants');

// Validation rules
const transferValidation = [
  body('medicines').isArray({ min: 1 }).withMessage('Minimal 1 obat harus dipilih'),
  body('medicines.*.medicine').notEmpty().withMessage('Obat harus dipilih'),
  body('medicines.*.quantity')
    .isNumeric()
    .withMessage('Jumlah harus berupa angka')
    .custom((value) => value > 0)
    .withMessage('Jumlah harus lebih dari 0'),
];

const requestValidation = [
  ...transferValidation,
  body('toPharmacy').trim().notEmpty().withMessage('Apotik tujuan harus diisi'),
];

const receiveValidation = [
  ...transferValidation,
  body('fromPharmacy').trim().notEmpty().withMessage('Apotik pengirim harus diisi'),
];

const statusValidation = [
  body('status')
    .isIn(Object.values(TRANSFER_STATUS))
    .withMessage('Status tidak valid'),
];

// All routes require authentication and admin_apotik role
router.use(protect, authorize('admin_apotik'));

// Routes
router.route('/').get(getTransfers);

router.post('/request', requestValidation, validate, createRequest);
router.post('/receive', receiveValidation, validate, createReceive);

router.route('/:id').get(getTransfer);

router
  .route('/:id/status')
  .patch(statusValidation, validate, updateTransferStatus);

router.route('/:id').delete(cancelTransfer);

module.exports = router;
