const asyncHandler = require('express-async-handler');
const MedicineTransfer = require('../models/MedicineTransfer');
const Medicine = require('../models/Medicine');

// @desc    Get all medicine transfers
// @route   GET /api/transfers
// @access  Private (Admin Apotik)
exports.getTransfers = asyncHandler(async (req, res) => {
  const { type, status, page = 1, limit = 10 } = req.query;

  let query = {};

  // Filter by type
  if (type) {
    query.type = type;
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  const transfers = await MedicineTransfer.find(query)
    .populate('medicines.medicine', 'name code unit')
    .populate('requestedBy', 'name email')
    .populate('processedBy', 'name email')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await MedicineTransfer.countDocuments(query);

  res.json({
    success: true,
    data: transfers,
    pagination: {
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit),
    },
  });
});

// @desc    Get single medicine transfer
// @route   GET /api/transfers/:id
// @access  Private (Admin Apotik)
exports.getTransfer = asyncHandler(async (req, res) => {
  const transfer = await MedicineTransfer.findById(req.params.id)
    .populate('medicines.medicine', 'name genericName code unit stock')
    .populate('requestedBy', 'name email')
    .populate('processedBy', 'name email');

  if (!transfer) {
    res.status(404);
    throw new Error('Transfer tidak ditemukan');
  }

  res.json({
    success: true,
    data: transfer,
  });
});

// @desc    Create medicine request to another pharmacy
// @route   POST /api/transfers/request
// @access  Private (Admin Apotik)
exports.createRequest = asyncHandler(async (req, res) => {
  const { toPharmacy, medicines, notes, urgency } = req.body;

  // Verify medicines exist
  for (let item of medicines) {
    const medicine = await Medicine.findById(item.medicine);
    if (!medicine) {
      res.status(404);
      throw new Error(`Obat dengan ID ${item.medicine} tidak ditemukan`);
    }
  }

  const transfer = await MedicineTransfer.create({
    fromPharmacy: 'Apotik Pusat', // Bisa disesuaikan dengan setting
    toPharmacy,
    type: 'request',
    medicines,
    notes,
    urgency,
    requestedBy: req.user._id,
  });

  const populatedTransfer = await MedicineTransfer.findById(transfer._id)
    .populate('medicines.medicine', 'name code unit')
    .populate('requestedBy', 'name email');

  res.status(201).json({
    success: true,
    data: populatedTransfer,
  });
});

// @desc    Create medicine receive from another pharmacy
// @route   POST /api/transfers/receive
// @access  Private (Admin Apotik)
exports.createReceive = asyncHandler(async (req, res) => {
  const { fromPharmacy, medicines, notes } = req.body;

  // Verify medicines exist
  for (let item of medicines) {
    const medicine = await Medicine.findById(item.medicine);
    if (!medicine) {
      res.status(404);
      throw new Error(`Obat dengan ID ${item.medicine} tidak ditemukan`);
    }
  }

  const transfer = await MedicineTransfer.create({
    fromPharmacy,
    toPharmacy: 'Apotik Pusat', // Bisa disesuaikan dengan setting
    type: 'receive',
    medicines: medicines.map((item) => ({
      ...item,
      receivedQuantity: item.quantity,
    })),
    notes,
    status: 'pending',
    requestedBy: req.user._id,
  });

  const populatedTransfer = await MedicineTransfer.findById(transfer._id)
    .populate('medicines.medicine', 'name code unit')
    .populate('requestedBy', 'name email');

  res.status(201).json({
    success: true,
    data: populatedTransfer,
  });
});

// @desc    Update transfer status
// @route   PATCH /api/transfers/:id/status
// @access  Private (Admin Apotik)
exports.updateTransferStatus = asyncHandler(async (req, res) => {
  const { status, receivedQuantities } = req.body;

  const transfer = await MedicineTransfer.findById(req.params.id);

  if (!transfer) {
    res.status(404);
    throw new Error('Transfer tidak ditemukan');
  }

  // If status is 'diterima' and type is 'receive', add to stock
  if (
    status === 'diterima' &&
    transfer.type === 'receive' &&
    transfer.status !== 'diterima'
  ) {
    for (let i = 0; i < transfer.medicines.length; i++) {
      const item = transfer.medicines[i];
      const medicine = await Medicine.findById(item.medicine);

      if (!medicine) {
        res.status(404);
        throw new Error(`Obat tidak ditemukan`);
      }

      // Use received quantity if provided, otherwise use requested quantity
      const quantityToAdd =
        receivedQuantities && receivedQuantities[i]
          ? receivedQuantities[i]
          : item.quantity;

      medicine.stock += quantityToAdd;
      await medicine.save();

      // Update received quantity in transfer
      transfer.medicines[i].receivedQuantity = quantityToAdd;
    }

    transfer.completedDate = Date.now();
    transfer.processedBy = req.user._id;
  }

  transfer.status = status;
  transfer.processedBy = req.user._id;
  await transfer.save();

  const updatedTransfer = await MedicineTransfer.findById(transfer._id)
    .populate('medicines.medicine', 'name code unit')
    .populate('requestedBy', 'name email')
    .populate('processedBy', 'name email');

  res.json({
    success: true,
    data: updatedTransfer,
  });
});

// @desc    Cancel transfer
// @route   DELETE /api/transfers/:id
// @access  Private (Admin Apotik)
exports.cancelTransfer = asyncHandler(async (req, res) => {
  const transfer = await MedicineTransfer.findById(req.params.id);

  if (!transfer) {
    res.status(404);
    throw new Error('Transfer tidak ditemukan');
  }

  // Can only cancel if not yet completed
  if (transfer.status === 'diterima' || transfer.status === 'selesai') {
    res.status(400);
    throw new Error('Transfer yang sudah selesai tidak dapat dibatalkan');
  }

  transfer.status = 'dibatalkan';
  await transfer.save();

  res.json({
    success: true,
    message: 'Transfer berhasil dibatalkan',
  });
});
