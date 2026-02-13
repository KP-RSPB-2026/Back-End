const asyncHandler = require('express-async-handler');
const Medicine = require('../models/Medicine');

// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Private
exports.getMedicines = asyncHandler(async (req, res) => {
  const { search, category, lowStock, page = 1, limit = 10 } = req.query;

  let query = { isActive: true };

  // Search by name, generic name, or code
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter low stock items
  if (lowStock === 'true') {
    query.$expr = { $lte: ['$stock', '$minStock'] };
  }

  const medicines = await Medicine.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ name: 1 });

  const count = await Medicine.countDocuments(query);

  res.json({
    success: true,
    data: medicines,
    pagination: {
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit),
    },
  });
});

// @desc    Get single medicine
// @route   GET /api/medicines/:id
// @access  Private
exports.getMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    res.status(404);
    throw new Error('Obat tidak ditemukan');
  }

  res.json({
    success: true,
    data: medicine,
  });
});

// @desc    Create new medicine
// @route   POST /api/medicines
// @access  Private (Admin Apotik)
exports.createMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.create(req.body);

  res.status(201).json({
    success: true,
    data: medicine,
  });
});

// @desc    Update medicine
// @route   PUT /api/medicines/:id
// @access  Private (Admin Apotik)
exports.updateMedicine = asyncHandler(async (req, res) => {
  let medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    res.status(404);
    throw new Error('Obat tidak ditemukan');
  }

  medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: medicine,
  });
});

// @desc    Update medicine stock
// @route   PATCH /api/medicines/:id/stock
// @access  Private (Admin Apotik)
exports.updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation } = req.body; // operation: 'add' or 'subtract'

  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    res.status(404);
    throw new Error('Obat tidak ditemukan');
  }

  if (operation === 'add') {
    medicine.stock += quantity;
  } else if (operation === 'subtract') {
    if (medicine.stock < quantity) {
      res.status(400);
      throw new Error('Stok tidak mencukupi');
    }
    medicine.stock -= quantity;
  } else {
    res.status(400);
    throw new Error('Operasi tidak valid');
  }

  await medicine.save();

  res.json({
    success: true,
    data: medicine,
  });
});

// @desc    Delete medicine (soft delete)
// @route   DELETE /api/medicines/:id
// @access  Private (Admin Apotik)
exports.deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    res.status(404);
    throw new Error('Obat tidak ditemukan');
  }

  medicine.isActive = false;
  await medicine.save();

  res.json({
    success: true,
    message: 'Obat berhasil dihapus',
  });
});

// @desc    Get low stock medicines
// @route   GET /api/medicines/alerts/low-stock
// @access  Private (Admin Apotik)
exports.getLowStockMedicines = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({
    isActive: true,
    $expr: { $lte: ['$stock', '$minStock'] },
  }).sort({ stock: 1 });

  res.json({
    success: true,
    count: medicines.length,
    data: medicines,
  });
});

// @desc    Get expired or expiring soon medicines
// @route   GET /api/medicines/alerts/expiring
// @access  Private (Admin Apotik)
exports.getExpiringMedicines = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + Number(days));

  const medicines = await Medicine.find({
    isActive: true,
    expiryDate: { $lte: futureDate, $gte: new Date() },
  }).sort({ expiryDate: 1 });

  res.json({
    success: true,
    count: medicines.length,
    data: medicines,
  });
});
