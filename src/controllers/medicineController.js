const asyncHandler = require('express-async-handler');
const { query } = require('../config/mysql');
const { parsePagination } = require('../utils/pagination');

const mapMedicine = (row) => ({
  _id: row._id,
  code: row.code,
  name: row.name,
  genericName: row.genericName,
  category: row.category,
  manufacturer: row.manufacturer,
  description: row.description,
  dosage: row.dosage,
  unit: row.unit,
  stock: Number(row.stock),
  minStock: Number(row.minStock),
  price: Number(row.price),
  expiryDate: row.expiryDate,
  batchNumber: row.batchNumber,
  isActive: Boolean(row.isActive),
  sideEffects: row.sideEffects ? JSON.parse(row.sideEffects) : [],
  contraindications: row.contraindications
    ? JSON.parse(row.contraindications)
    : [],
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Private
exports.getMedicines = asyncHandler(async (req, res) => {
  const { search, category, lowStock } = req.query;
  const { page: currentPage, limit: rowLimit, offset } = parsePagination(req.query);

  const params = [];
  let whereClause = 'WHERE is_active = 1';

  if (search) {
    whereClause += ' AND (name LIKE ? OR generic_name LIKE ? OR code LIKE ?)';
    const wildcard = `%${search}%`;
    params.push(wildcard, wildcard, wildcard);
  }

  if (category) {
    whereClause += ' AND category = ?';
    params.push(category);
  }

  if (lowStock === 'true') {
    whereClause += ' AND stock <= min_stock';
  }

  const medicines = await query(
    `SELECT
      id AS _id,
      code,
      name,
      generic_name AS genericName,
      category,
      manufacturer,
      description,
      dosage,
      unit,
      stock,
      min_stock AS minStock,
      price,
      expiry_date AS expiryDate,
      batch_number AS batchNumber,
      is_active AS isActive,
      side_effects AS sideEffects,
      contraindications,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM medicines
    ${whereClause}
    ORDER BY name ASC
    LIMIT ? OFFSET ?`,
    [...params, rowLimit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM medicines
     ${whereClause}`,
    params
  );

  const count = countResult[0].total;

  res.json({
    success: true,
    data: medicines.map(mapMedicine),
    pagination: {
      total: count,
      page: currentPage,
      pages: Math.ceil(count / rowLimit),
    },
  });
});

// @desc    Get single medicine
// @route   GET /api/medicines/:id
// @access  Private
exports.getMedicine = asyncHandler(async (req, res) => {
  const medicines = await query(
    `SELECT
      id AS _id,
      code,
      name,
      generic_name AS genericName,
      category,
      manufacturer,
      description,
      dosage,
      unit,
      stock,
      min_stock AS minStock,
      price,
      expiry_date AS expiryDate,
      batch_number AS batchNumber,
      is_active AS isActive,
      side_effects AS sideEffects,
      contraindications,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM medicines
    WHERE id = ?
    LIMIT 1`,
    [req.params.id]
  );

  const medicine = medicines[0];

  if (!medicine) {
    res.status(404);
    throw new Error('Obat tidak ditemukan');
  }

  res.json({
    success: true,
    data: mapMedicine(medicine),
  });
});

// @desc    Create new medicine
// @route   POST /api/medicines
// @access  Private (Admin Apotik)
exports.createMedicine = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    genericName,
    category,
    manufacturer,
    description,
    dosage,
    unit,
    stock,
    minStock,
    price,
    expiryDate,
    batchNumber,
    sideEffects,
    contraindications,
  } = req.body;

  const result = await query(
    `INSERT INTO medicines
      (
        code,
        name,
        generic_name,
        category,
        manufacturer,
        description,
        dosage,
        unit,
        stock,
        min_stock,
        price,
        expiry_date,
        batch_number,
        side_effects,
        contraindications
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      name,
      genericName || null,
      category,
      manufacturer || null,
      description || null,
      dosage || null,
      unit,
      stock ?? 0,
      minStock ?? 10,
      price,
      expiryDate || null,
      batchNumber || null,
      JSON.stringify(sideEffects || []),
      JSON.stringify(contraindications || []),
    ]
  );

  const medicines = await query(
    `SELECT
      id AS _id,
      code,
      name,
      generic_name AS genericName,
      category,
      manufacturer,
      description,
      dosage,
      unit,
      stock,
      min_stock AS minStock,
      price,
      expiry_date AS expiryDate,
      batch_number AS batchNumber,
      is_active AS isActive,
      side_effects AS sideEffects,
      contraindications,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM medicines
    WHERE id = ?
    LIMIT 1`,
    [result.insertId]
  );

  const medicine = medicines[0];

  res.status(201).json({
    success: true,
    data: mapMedicine(medicine),
  });
});

// @desc    Update medicine
// @route   PUT /api/medicines/:id
// @access  Private (Admin Apotik)
exports.updateMedicine = asyncHandler(async (req, res) => {
  const existing = await query('SELECT id FROM medicines WHERE id = ? LIMIT 1', [
    req.params.id,
  ]);

  if (existing.length === 0) {
    res.status(404);
    throw new Error('Obat tidak ditemukan');
  }

  const fieldMap = {
    code: 'code',
    name: 'name',
    genericName: 'generic_name',
    category: 'category',
    manufacturer: 'manufacturer',
    description: 'description',
    dosage: 'dosage',
    unit: 'unit',
    stock: 'stock',
    minStock: 'min_stock',
    price: 'price',
    expiryDate: 'expiry_date',
    batchNumber: 'batch_number',
    isActive: 'is_active',
    sideEffects: 'side_effects',
    contraindications: 'contraindications',
  };

  const updates = [];
  const params = [];

  Object.entries(fieldMap).forEach(([key, column]) => {
    if (req.body[key] !== undefined) {
      updates.push(`${column} = ?`);
      if (key === 'sideEffects' || key === 'contraindications') {
        params.push(JSON.stringify(req.body[key] || []));
      } else if (key === 'isActive') {
        params.push(req.body[key] ? 1 : 0);
      } else {
        params.push(req.body[key]);
      }
    }
  });

  if (updates.length > 0) {
    params.push(req.params.id);
    await query(`UPDATE medicines SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const medicines = await query(
    `SELECT
      id AS _id,
      code,
      name,
      generic_name AS genericName,
      category,
      manufacturer,
      description,
      dosage,
      unit,
      stock,
      min_stock AS minStock,
      price,
      expiry_date AS expiryDate,
      batch_number AS batchNumber,
      is_active AS isActive,
      side_effects AS sideEffects,
      contraindications,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM medicines
    WHERE id = ?
    LIMIT 1`,
    [req.params.id]
  );

  const medicine = medicines[0];

  res.json({
    success: true,
    data: mapMedicine(medicine),
  });
});

// @desc    Update medicine stock
// @route   PATCH /api/medicines/:id/stock
// @access  Private (Admin Apotik)
exports.updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation } = req.body; // operation: 'add' | 'subtract' | 'set'

  const medicines = await query(
    `SELECT
      id AS _id,
      code,
      name,
      generic_name AS genericName,
      category,
      manufacturer,
      description,
      dosage,
      unit,
      stock,
      min_stock AS minStock,
      price,
      expiry_date AS expiryDate,
      batch_number AS batchNumber,
      is_active AS isActive,
      side_effects AS sideEffects,
      contraindications,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM medicines
    WHERE id = ?
    LIMIT 1`,
    [req.params.id]
  );

  const medicine = medicines[0];

  if (!medicine) {
    res.status(404);
    throw new Error('Obat tidak ditemukan');
  }

  let updatedStock = Number(medicine.stock);

  if (operation === 'add') {
    updatedStock += Number(quantity);
  } else if (operation === 'subtract') {
    if (updatedStock < Number(quantity)) {
      res.status(400);
      throw new Error('Stok tidak mencukupi');
    }
    updatedStock -= Number(quantity);
  } else if (operation === 'set') {
    updatedStock = Number(quantity);
  } else {
    res.status(400);
    throw new Error('Operasi tidak valid');
  }

  await query('UPDATE medicines SET stock = ? WHERE id = ?', [
    updatedStock,
    req.params.id,
  ]);

  const updatedRows = await query(
    `SELECT
      id AS _id,
      code,
      name,
      generic_name AS genericName,
      category,
      manufacturer,
      description,
      dosage,
      unit,
      stock,
      min_stock AS minStock,
      price,
      expiry_date AS expiryDate,
      batch_number AS batchNumber,
      is_active AS isActive,
      side_effects AS sideEffects,
      contraindications,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM medicines
    WHERE id = ?
    LIMIT 1`,
    [req.params.id]
  );

  const updatedMedicine = updatedRows[0];

  res.json({
    success: true,
    data: mapMedicine(updatedMedicine),
  });
});

// @desc    Clear medicine stock to zero
// @route   DELETE /api/medicines/:id/stock
// @access  Private (Admin Apotik)
exports.clearStock = asyncHandler(async (req, res) => {
  const medicines = await query('SELECT id FROM medicines WHERE id = ? LIMIT 1', [
    req.params.id,
  ]);

  if (medicines.length === 0) {
    res.status(404);
    throw new Error('Obat tidak ditemukan');
  }

  await query('UPDATE medicines SET stock = 0 WHERE id = ?', [req.params.id]);

  const updatedRows = await query(
    `SELECT
      id AS _id,
      code,
      name,
      generic_name AS genericName,
      category,
      manufacturer,
      description,
      dosage,
      unit,
      stock,
      min_stock AS minStock,
      price,
      expiry_date AS expiryDate,
      batch_number AS batchNumber,
      is_active AS isActive,
      side_effects AS sideEffects,
      contraindications,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM medicines
    WHERE id = ?
    LIMIT 1`,
    [req.params.id]
  );

  res.json({
    success: true,
    message: 'Stok obat berhasil dihapus (diset ke 0)',
    data: mapMedicine(updatedRows[0]),
  });
});

// @desc    Delete medicine (soft delete)
// @route   DELETE /api/medicines/:id
// @access  Private (Admin Apotik)
exports.deleteMedicine = asyncHandler(async (req, res) => {
  const medicines = await query('SELECT id FROM medicines WHERE id = ? LIMIT 1', [
    req.params.id,
  ]);

  if (medicines.length === 0) {
    res.status(404);
    throw new Error('Obat tidak ditemukan');
  }

  await query('UPDATE medicines SET is_active = 0 WHERE id = ?', [req.params.id]);

  res.json({
    success: true,
    message: 'Obat berhasil dihapus',
  });
});

// @desc    Get low stock medicines
// @route   GET /api/medicines/alerts/low-stock
// @access  Private (Admin Apotik)
exports.getLowStockMedicines = asyncHandler(async (req, res) => {
  const medicines = await query(
    `SELECT
      id AS _id,
      code,
      name,
      generic_name AS genericName,
      category,
      manufacturer,
      description,
      dosage,
      unit,
      stock,
      min_stock AS minStock,
      price,
      expiry_date AS expiryDate,
      batch_number AS batchNumber,
      is_active AS isActive,
      side_effects AS sideEffects,
      contraindications,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM medicines
    WHERE is_active = 1 AND stock <= min_stock
    ORDER BY stock ASC`
  );

  res.json({
    success: true,
    count: medicines.length,
    data: medicines.map(mapMedicine),
  });
});

// @desc    Get expired or expiring soon medicines
// @route   GET /api/medicines/alerts/expiring
// @access  Private (Admin Apotik)
exports.getExpiringMedicines = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + Number(days));

  const medicines = await query(
    `SELECT
      id AS _id,
      code,
      name,
      generic_name AS genericName,
      category,
      manufacturer,
      description,
      dosage,
      unit,
      stock,
      min_stock AS minStock,
      price,
      expiry_date AS expiryDate,
      batch_number AS batchNumber,
      is_active AS isActive,
      side_effects AS sideEffects,
      contraindications,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM medicines
    WHERE is_active = 1
      AND expiry_date IS NOT NULL
      AND expiry_date BETWEEN CURDATE() AND ?
    ORDER BY expiry_date ASC`,
    [futureDate.toISOString().slice(0, 10)]
  );

  res.json({
    success: true,
    count: medicines.length,
    data: medicines.map(mapMedicine),
  });
});
