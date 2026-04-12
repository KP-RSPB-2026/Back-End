const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const {
  getMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  updateStock,
  deleteMedicine,
  getLowStockMedicines,
  getExpiringMedicines,
  listPharmacies,
} = require('../controllers/medicineController');
const { protect, authorize } = require('../middleware/auth');

// Validation rules
const medicineValidation = [
  body('code').trim().notEmpty().withMessage('Kode obat harus diisi'),
  body('name').trim().notEmpty().withMessage('Nama obat harus diisi'),
  body('category').notEmpty().withMessage('Kategori harus diisi'),
  body('unit').notEmpty().withMessage('Satuan harus diisi'),
  body('stock').isNumeric().withMessage('Stok harus berupa angka'),
  body('price')
    .isNumeric()
    .withMessage('Harga harus berupa angka')
    .custom((value) => value >= 0)
    .withMessage('Harga tidak boleh negatif'),
];

const stockValidation = [
  body('quantity')
    .isNumeric()
    .withMessage('Jumlah harus berupa angka')
    .custom((value) => value > 0)
    .withMessage('Jumlah harus lebih dari 0'),
  body('operation')
    .isIn(['add', 'subtract'])
    .withMessage('Operasi harus add atau subtract'),
];

// All routes require authentication
router.use(protect);

// Alert routes
router.get('/pharmacies', listPharmacies);
router.get('/alerts/low-stock', authorize('admin_apotik'), getLowStockMedicines);
router.get('/alerts/expiring', authorize('admin_apotik'), getExpiringMedicines);

// Main routes
router
  .route('/')
  .get(getMedicines)
  .post(authorize('admin_apotik'), medicineValidation, validate, createMedicine);

router
  .route('/:id')
  .get(getMedicine)
  .put(authorize('admin_apotik'), updateMedicine)
  .delete(authorize('admin_apotik'), deleteMedicine);

router
  .route('/:id/stock')
  .patch(authorize('admin_apotik'), stockValidation, validate, updateStock);

module.exports = router;
