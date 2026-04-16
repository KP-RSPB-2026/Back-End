const asyncHandler = require('express-async-handler');
const { pool, query } = require('../config/mysql');

const normalizeCodeForPharmacy = (code, fromPharmacy, toPharmacy) => {
  if (!code) return null;
  const fromSuffix = `-${fromPharmacy}`;
  const baseCode = code.endsWith(fromSuffix)
    ? code.slice(0, -fromSuffix.length)
    : code;
  return `${baseCode}-${toPharmacy}`;
};

const findMedicineForUpdate = async (conn, params, lock = false) => {
  const { id, pharmacyCode, code, name, genericName, dosage, unit } = params;
  const lockClause = lock ? ' FOR UPDATE' : '';

  if (id && pharmacyCode) {
    const [rows] = await conn.execute(
      `SELECT * FROM medicines WHERE id = ? AND pharmacy_code = ? LIMIT 1${lockClause}`,
      [id, pharmacyCode]
    );
    if (rows[0]) return rows[0];
  }

  if (code && pharmacyCode) {
    const [rows] = await conn.execute(
      `SELECT * FROM medicines WHERE code = ? AND pharmacy_code = ? LIMIT 1${lockClause}`,
      [code, pharmacyCode]
    );
    if (rows[0]) return rows[0];
  }

  if (name && pharmacyCode) {
    const [rows] = await conn.execute(
      `SELECT *
       FROM medicines
       WHERE pharmacy_code = ?
         AND name = ?
         AND COALESCE(generic_name, '') = COALESCE(?, '')
         AND COALESCE(dosage, '') = COALESCE(?, '')
         AND COALESCE(unit, '') = COALESCE(?, '')
       LIMIT 1${lockClause}`,
      [pharmacyCode, name, genericName || null, dosage || null, unit || null]
    );
    if (rows[0]) return rows[0];
  }

  return null;
};

const createDestinationMedicine = async (conn, sourceMedicine, toPharmacy) => {
  const baseCode = normalizeCodeForPharmacy(
    sourceMedicine.code,
    sourceMedicine.pharmacy_code,
    toPharmacy
  );

  let candidateCode = baseCode || `${sourceMedicine.code}-${toPharmacy}`;
  let suffix = 1;

  while (true) {
    const [existingCode] = await conn.execute(
      'SELECT id FROM medicines WHERE code = ? LIMIT 1',
      [candidateCode]
    );
    if (!existingCode[0]) break;
    candidateCode = `${baseCode || sourceMedicine.code}-${toPharmacy}-${suffix}`;
    suffix += 1;
  }

  const [insertResult] = await conn.execute(
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
        pharmacy_code,
        is_active,
        side_effects,
        contraindications
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      candidateCode,
      sourceMedicine.name,
      sourceMedicine.generic_name,
      sourceMedicine.category,
      sourceMedicine.manufacturer,
      sourceMedicine.description,
      sourceMedicine.dosage,
      sourceMedicine.unit,
      0,
      sourceMedicine.min_stock,
      sourceMedicine.price,
      sourceMedicine.expiry_date,
      sourceMedicine.batch_number,
      toPharmacy,
      sourceMedicine.is_active,
      sourceMedicine.side_effects,
      sourceMedicine.contraindications,
    ]
  );

  const [rows] = await conn.execute(
    'SELECT * FROM medicines WHERE id = ? LIMIT 1 FOR UPDATE',
    [insertResult.insertId]
  );

  return rows[0];
};

const resolveApprovedQuantity = (receivedQuantities, index, item) => {
  if (Array.isArray(receivedQuantities) && receivedQuantities[index] !== undefined) {
    return Number(receivedQuantities[index]);
  }

  if (
    receivedQuantities &&
    typeof receivedQuantities === 'object' &&
    receivedQuantities[item.id] !== undefined
  ) {
    return Number(receivedQuantities[item.id]);
  }

  return Number(item.quantity);
};

const getTransferItemsMap = async (transferIds) => {
  if (!transferIds.length) return {};

  const placeholders = transferIds.map(() => '?').join(',');
  const items = await query(
    `SELECT
      ti.transfer_id AS transferId,
      ti.medicine_id AS medicineId,
      ti.quantity,
      ti.received_quantity AS receivedQuantity,
      ti.notes,
      m.id AS medicine_id,
      m.name AS medicine_name,
      m.generic_name AS medicine_genericName,
      m.code AS medicine_code,
      m.unit AS medicine_unit,
      m.stock AS medicine_stock
    FROM medicine_transfer_items ti
    JOIN medicines m ON m.id = ti.medicine_id
    WHERE ti.transfer_id IN (${placeholders})
    ORDER BY ti.id ASC`,
    transferIds
  );

  return items.reduce((acc, item) => {
    if (!acc[item.transferId]) {
      acc[item.transferId] = [];
    }

    acc[item.transferId].push({
      medicine: {
        _id: item.medicine_id,
        name: item.medicine_name,
        genericName: item.medicine_genericName,
        code: item.medicine_code,
        unit: item.medicine_unit,
        stock: Number(item.medicine_stock),
      },
      quantity: Number(item.quantity),
      receivedQuantity: Number(item.receivedQuantity),
      notes: item.notes,
    });

    return acc;
  }, {});
};

const mapTransferRow = (row, itemsMap) => ({
  _id: row._id,
  transferNumber: row.transferNumber,
  fromPharmacy: row.fromPharmacy,
  toPharmacy: row.toPharmacy,
  type: row.type,
  medicines: itemsMap[row._id] || [],
  status: row.status,
  requestDate: row.requestDate,
  completedDate: row.completedDate,
  requestedBy: row.requestedById
    ? {
        _id: row.requestedById,
        name: row.requestedByName,
        email: row.requestedByEmail,
      }
    : null,
  processedBy: row.processedById
    ? {
        _id: row.processedById,
        name: row.processedByName,
        email: row.processedByEmail,
      }
    : null,
  notes: row.notes,
  urgency: row.urgency,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// @desc    List registered pharmacies (distinct pharmacy_code from users)
// @route   GET /api/transfers/pharmacies
// @access  Private (Admin Apotik)
exports.listPharmacies = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT DISTINCT pharmacy_code AS code
     FROM users
     WHERE pharmacy_code IS NOT NULL
     ORDER BY pharmacy_code ASC`
  );

  res.json({
    success: true,
    data: rows.filter((r) => r.code),
  });
});

const fetchTransfers = async ({ whereClause = '', params = [], page, limit, pharmacyCode }) => {
  const offset = (page - 1) * limit;

  const filters = [];
  const filterParams = [];

  if (pharmacyCode) {
    filters.push('(t.from_pharmacy = ? OR t.to_pharmacy = ?)');
    filterParams.push(pharmacyCode, pharmacyCode);
  }

  if (whereClause) {
    filters.push(whereClause.replace(/^WHERE\s+/i, ''));
  }

  const finalWhere = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const transfers = await query(
    `SELECT
      t.id AS _id,
      t.transfer_number AS transferNumber,
      t.from_pharmacy AS fromPharmacy,
      t.to_pharmacy AS toPharmacy,
      t.type,
      t.status,
      t.request_date AS requestDate,
      t.completed_date AS completedDate,
      t.requested_by AS requestedById,
      t.processed_by AS processedById,
      t.notes,
      t.urgency,
      t.created_at AS createdAt,
      t.updated_at AS updatedAt,
      rb.name AS requestedByName,
      rb.email AS requestedByEmail,
      pb.name AS processedByName,
      pb.email AS processedByEmail
    FROM medicine_transfers t
    LEFT JOIN users rb ON rb.id = t.requested_by
    LEFT JOIN users pb ON pb.id = t.processed_by
    ${finalWhere}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?`,
    [...filterParams, ...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM medicine_transfers t
     ${finalWhere}`,
    [...filterParams, ...params]
  );

  const itemsMap = await getTransferItemsMap(transfers.map((row) => row._id));

  return {
    transfers: transfers.map((row) => mapTransferRow(row, itemsMap)),
    count: countResult[0].total,
  };
};

const fetchTransferById = async (id, pharmacyCode) => {
  const rows = await query(
    `SELECT
      t.id AS _id,
      t.transfer_number AS transferNumber,
      t.from_pharmacy AS fromPharmacy,
      t.to_pharmacy AS toPharmacy,
      t.type,
      t.status,
      t.request_date AS requestDate,
      t.completed_date AS completedDate,
      t.requested_by AS requestedById,
      t.processed_by AS processedById,
      t.notes,
      t.urgency,
      t.created_at AS createdAt,
      t.updated_at AS updatedAt,
      rb.name AS requestedByName,
      rb.email AS requestedByEmail,
      pb.name AS processedByName,
      pb.email AS processedByEmail
    FROM medicine_transfers t
    LEFT JOIN users rb ON rb.id = t.requested_by
    LEFT JOIN users pb ON pb.id = t.processed_by
    WHERE t.id = ?
    LIMIT 1`,
    [id]
  );

  if (!rows[0]) {
    return null;
  }

  if (
    pharmacyCode &&
    rows[0].fromPharmacy !== pharmacyCode &&
    rows[0].toPharmacy !== pharmacyCode
  ) {
    return null;
  }

  const itemsMap = await getTransferItemsMap([rows[0]._id]);
  return mapTransferRow(rows[0], itemsMap);
};

const generateTransferNumber = async (conn, type) => {
  const [countRows] = await conn.execute(
    'SELECT COUNT(*) AS total FROM medicine_transfers WHERE type = ?',
    [type]
  );
  const count = Number(countRows[0].total) + 1;
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = type === 'request' ? 'REQ' : 'RCV';
  return `${prefix}${year}${month}${String(count).padStart(5, '0')}`;
};

// @desc    Get all medicine transfers
// @route   GET /api/transfers
// @access  Private (Admin Apotik)
exports.getTransfers = asyncHandler(async (req, res) => {
  const { type, status, page = 1, limit = 10 } = req.query;
  const currentPage = Number(page);
  const rowLimit = Number(limit);

  if (!req.user?.pharmacyCode) {
    res.status(400);
    throw new Error('Akun admin belum memiliki pharmacy_code');
  }

  const filters = [];
  const params = [];

  if (type) {
    filters.push('t.type = ?');
    params.push(type);
  }

  if (status) {
    filters.push('t.status = ?');
    params.push(status);
  }

  const { transfers, count } = await fetchTransfers({
    whereClause: filters.join(' AND '),
    params,
    pharmacyCode: req.user.pharmacyCode,
    page: currentPage,
    limit: rowLimit,
  });

  res.json({
    success: true,
    data: transfers,
    pagination: {
      total: count,
      page: currentPage,
      pages: Math.ceil(count / rowLimit),
    },
  });
});

// @desc    Get single medicine transfer
// @route   GET /api/transfers/:id
// @access  Private (Admin Apotik)
exports.getTransfer = asyncHandler(async (req, res) => {
  if (!req.user?.pharmacyCode) {
    res.status(400);
    throw new Error('Akun admin belum memiliki pharmacy_code');
  }

  const transfer = await fetchTransferById(req.params.id, req.user.pharmacyCode);

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

  if (!req.user?.pharmacyCode) {
    res.status(400);
    throw new Error('Akun admin belum memiliki pharmacy_code');
  }

  // Verify medicines exist
  const medicineIds = medicines.map((item) => item.medicine);
  const placeholders = medicineIds.map(() => '?').join(',');
  const existingMedicines = await query(
    `SELECT id FROM medicines WHERE id IN (${placeholders}) AND is_active = 1`,
    medicineIds
  );

  const existingSet = new Set(existingMedicines.map((m) => Number(m.id)));

  for (const item of medicines) {
    if (!existingSet.has(Number(item.medicine))) {
      res.status(404);
      throw new Error(`Obat dengan ID ${item.medicine} tidak ditemukan`);
    }
  }

  const conn = await pool.getConnection();
  let transferId;

  try {
    await conn.beginTransaction();

    const transferNumber = await generateTransferNumber(conn, 'request');

    const [insertResult] = await conn.execute(
      `INSERT INTO medicine_transfers
        (
          transfer_number,
          from_pharmacy,
          to_pharmacy,
          type,
          notes,
          urgency,
          requested_by
        )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        transferNumber,
        req.user.pharmacyCode,
        toPharmacy,
        'request',
        notes || null,
        urgency || 'sedang',
        req.user._id,
      ]
    );

    transferId = insertResult.insertId;

    for (const item of medicines) {
      await conn.execute(
        `INSERT INTO medicine_transfer_items
          (transfer_id, medicine_id, quantity, received_quantity, notes)
        VALUES (?, ?, ?, ?, ?)`,
        [
          transferId,
          item.medicine,
          Number(item.quantity),
          Number(item.receivedQuantity || 0),
          item.notes || null,
        ]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const populatedTransfer = await fetchTransferById(transferId, req.user.pharmacyCode);

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

  if (!req.user?.pharmacyCode) {
    res.status(400);
    throw new Error('Akun admin belum memiliki pharmacy_code');
  }

  // Verify medicines exist
  const medicineIds = medicines.map((item) => item.medicine);
  const placeholders = medicineIds.map(() => '?').join(',');
  const existingMedicines = await query(
    `SELECT id FROM medicines WHERE id IN (${placeholders}) AND is_active = 1`,
    medicineIds
  );

  const existingSet = new Set(existingMedicines.map((m) => Number(m.id)));

  for (const item of medicines) {
    if (!existingSet.has(Number(item.medicine))) {
      res.status(404);
      throw new Error(`Obat dengan ID ${item.medicine} tidak ditemukan`);
    }
  }

  const conn = await pool.getConnection();
  let transferId;

  try {
    await conn.beginTransaction();

    const transferNumber = await generateTransferNumber(conn, 'receive');

    const [insertResult] = await conn.execute(
      `INSERT INTO medicine_transfers
        (
          transfer_number,
          from_pharmacy,
          to_pharmacy,
          type,
          notes,
          status,
          urgency,
          requested_by
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transferNumber,
        fromPharmacy,
        req.user.pharmacyCode,
        'receive',
        notes || null,
        'pending',
        'sedang',
        req.user._id,
      ]
    );

    transferId = insertResult.insertId;

    for (const item of medicines) {
      await conn.execute(
        `INSERT INTO medicine_transfer_items
          (transfer_id, medicine_id, quantity, received_quantity, notes)
        VALUES (?, ?, ?, ?, ?)`,
        [
          transferId,
          item.medicine,
          Number(item.quantity),
          Number(item.quantity),
          item.notes || null,
        ]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const populatedTransfer = await fetchTransferById(transferId, req.user.pharmacyCode);

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
  const conn = await pool.getConnection();

   if (!req.user?.pharmacyCode) {
     res.status(400);
     throw new Error('Akun admin belum memiliki pharmacy_code');
   }

  try {
    await conn.beginTransaction();

    const [transferRows] = await conn.execute(
      `SELECT id, type, status, from_pharmacy, to_pharmacy
       FROM medicine_transfers
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [req.params.id]
    );

    const transfer = transferRows[0];

    if (!transfer) {
      res.status(404);
      throw new Error('Transfer tidak ditemukan');
    }

    if (
      req.user?.pharmacyCode &&
      transfer.from_pharmacy !== req.user.pharmacyCode &&
      transfer.to_pharmacy !== req.user.pharmacyCode
    ) {
      res.status(403);
      throw new Error('Tidak berhak mengubah transfer dari apotek lain');
    }

    if (transfer.status === 'diterima' && status !== 'diterima') {
      res.status(400);
      throw new Error('Transfer yang sudah diterima tidak dapat diubah statusnya');
    }

    const [movementRows] = await conn.execute(
      `SELECT COALESCE(SUM(received_quantity), 0) AS movedQty
       FROM medicine_transfer_items
       WHERE transfer_id = ?`,
      [req.params.id]
    );

    const alreadyMoved = Number(movementRows[0]?.movedQty || 0) > 0;
    const isApprovalStatus = status === 'diproses' || status === 'diterima';

    if (transfer.type === 'request' && isApprovalStatus && transfer.status !== 'diterima' && !alreadyMoved) {
      if (transfer.to_pharmacy !== req.user.pharmacyCode) {
        res.status(403);
        throw new Error('Hanya apotek tujuan request yang dapat menyetujui transfer');
      }

      const sourcePharmacy = transfer.to_pharmacy;
      const destinationPharmacy = transfer.from_pharmacy;

      const [items] = await conn.execute(
        `SELECT
           ti.id,
           ti.medicine_id AS medicineId,
           ti.quantity,
           m.code AS medicineCode,
           m.name AS medicineName,
           m.generic_name AS medicineGenericName,
           m.dosage AS medicineDosage,
           m.unit AS medicineUnit
         FROM medicine_transfer_items ti
         LEFT JOIN medicines m ON m.id = ti.medicine_id
         WHERE ti.transfer_id = ?
         ORDER BY ti.id ASC
         FOR UPDATE`,
        [req.params.id]
      );

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const quantityToMove = resolveApprovedQuantity(receivedQuantities, i, item);

        if (!Number.isFinite(quantityToMove) || quantityToMove <= 0) {
          res.status(400);
          throw new Error('Jumlah obat yang disetujui harus lebih dari 0');
        }

        if (quantityToMove > Number(item.quantity)) {
          res.status(400);
          throw new Error('Jumlah obat yang disetujui tidak boleh melebihi jumlah request');
        }

        const sourceMedicine = await findMedicineForUpdate(
          conn,
          {
            id: item.medicineId,
            pharmacyCode: sourcePharmacy,
            code: normalizeCodeForPharmacy(
              item.medicineCode,
              destinationPharmacy,
              sourcePharmacy
            ),
            name: item.medicineName,
            genericName: item.medicineGenericName,
            dosage: item.medicineDosage,
            unit: item.medicineUnit,
          },
          true
        );

        if (!sourceMedicine) {
          res.status(404);
          throw new Error(
            `Obat sumber untuk transfer item ${item.id} tidak ditemukan di apotek supplier`
          );
        }

        if (Number(sourceMedicine.stock) < quantityToMove) {
          res.status(400);
          throw new Error(`Stok obat ${sourceMedicine.name} di apotek supplier tidak mencukupi`);
        }

        let destinationMedicine = await findMedicineForUpdate(
          conn,
          {
            id: item.medicineId,
            code: normalizeCodeForPharmacy(
              sourceMedicine.code,
              sourcePharmacy,
              destinationPharmacy
            ),
            pharmacyCode: destinationPharmacy,
            name: sourceMedicine.name,
            genericName: sourceMedicine.generic_name,
            dosage: sourceMedicine.dosage,
            unit: sourceMedicine.unit,
          },
          true
        );

        if (!destinationMedicine) {
          destinationMedicine = await createDestinationMedicine(
            conn,
            sourceMedicine,
            destinationPharmacy
          );
        }

        await conn.execute('UPDATE medicines SET stock = stock - ? WHERE id = ?', [
          quantityToMove,
          sourceMedicine.id,
        ]);

        await conn.execute('UPDATE medicines SET stock = stock + ? WHERE id = ?', [
          quantityToMove,
          destinationMedicine.id,
        ]);

        await conn.execute(
          'UPDATE medicine_transfer_items SET received_quantity = ? WHERE id = ?',
          [quantityToMove, item.id]
        );
      }

      await conn.execute(
        `UPDATE medicine_transfers
         SET status = ?, processed_by = ?, completed_date = CASE WHEN ? = 'diterima' THEN NOW() ELSE NULL END
         WHERE id = ?`,
        [status, req.user._id, status, req.params.id]
      );
    } else if (
      status === 'diterima' &&
      transfer.type === 'receive' &&
      transfer.status !== 'diterima'
    ) {
      const [items] = await conn.execute(
        `SELECT id, medicine_id AS medicineId, quantity
         FROM medicine_transfer_items
         WHERE transfer_id = ?
         ORDER BY id ASC
         FOR UPDATE`,
        [req.params.id]
      );

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const [medicineRows] = await conn.execute(
          'SELECT id FROM medicines WHERE id = ? LIMIT 1 FOR UPDATE',
          [item.medicineId]
        );

        if (!medicineRows[0]) {
          res.status(404);
          throw new Error('Obat tidak ditemukan');
        }

        const quantityToAdd = resolveApprovedQuantity(receivedQuantities, i, item);

        if (!Number.isFinite(quantityToAdd) || quantityToAdd <= 0) {
          res.status(400);
          throw new Error('Jumlah obat yang diterima harus lebih dari 0');
        }

        await conn.execute('UPDATE medicines SET stock = stock + ? WHERE id = ?', [
          quantityToAdd,
          item.medicineId,
        ]);

        await conn.execute(
          'UPDATE medicine_transfer_items SET received_quantity = ? WHERE id = ?',
          [quantityToAdd, item.id]
        );
      }

      await conn.execute(
        `UPDATE medicine_transfers
         SET status = ?, processed_by = ?, completed_date = NOW()
         WHERE id = ?`,
        [status, req.user._id, req.params.id]
      );
    } else {
      await conn.execute(
        `UPDATE medicine_transfers
         SET status = ?, processed_by = ?
         WHERE id = ?`,
        [status, req.user._id, req.params.id]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const updatedTransfer = await fetchTransferById(req.params.id, req.user.pharmacyCode);

  res.json({
    success: true,
    data: updatedTransfer,
  });
});

// @desc    Cancel transfer
// @route   DELETE /api/transfers/:id
// @access  Private (Admin Apotik)
exports.cancelTransfer = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, status, from_pharmacy, to_pharmacy
     FROM medicine_transfers
     WHERE id = ?
     LIMIT 1`,
    [req.params.id]
  );

  const transfer = rows[0];

  if (!transfer) {
    res.status(404);
    throw new Error('Transfer tidak ditemukan');
  }

  if (
    req.user?.pharmacyCode &&
    transfer.from_pharmacy !== req.user.pharmacyCode &&
    transfer.to_pharmacy !== req.user.pharmacyCode
  ) {
    res.status(403);
    throw new Error('Tidak berhak membatalkan transfer dari apotek lain');
  }

  // Can only cancel if not yet completed
  if (transfer.status === 'diterima' || transfer.status === 'selesai') {
    res.status(400);
    throw new Error('Transfer yang sudah selesai tidak dapat dibatalkan');
  }

  await query('UPDATE medicine_transfers SET status = ? WHERE id = ?', [
    'dibatalkan',
    req.params.id,
  ]);

  res.json({
    success: true,
    message: 'Transfer berhasil dibatalkan',
  });
});
