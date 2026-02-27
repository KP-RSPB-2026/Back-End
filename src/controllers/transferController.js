const asyncHandler = require('express-async-handler');
const { pool, query } = require('../config/mysql');
const { TRANSFER_STATUS, TRANSFER_TYPES } = require('../config/constants');
const { generateDocumentNumber } = require('../utils/documentNumber');
const { parsePagination } = require('../utils/pagination');

const REQUEST_TRANSFER_TRANSITIONS = {
  [TRANSFER_STATUS.PENDING]: [
    TRANSFER_STATUS.DIPROSES,
    TRANSFER_STATUS.DITOLAK,
    TRANSFER_STATUS.DIBATALKAN,
  ],
  [TRANSFER_STATUS.DIPROSES]: [
    TRANSFER_STATUS.DIKIRIM,
    TRANSFER_STATUS.DITOLAK,
    TRANSFER_STATUS.DIBATALKAN,
  ],
  [TRANSFER_STATUS.DIKIRIM]: [TRANSFER_STATUS.DITERIMA, TRANSFER_STATUS.DITOLAK],
  [TRANSFER_STATUS.DITERIMA]: [],
  [TRANSFER_STATUS.DITOLAK]: [],
  [TRANSFER_STATUS.DIBATALKAN]: [],
};

const RECEIVE_TRANSFER_TRANSITIONS = {
  [TRANSFER_STATUS.PENDING]: [
    TRANSFER_STATUS.DIPROSES,
    TRANSFER_STATUS.DITERIMA,
    TRANSFER_STATUS.DITOLAK,
    TRANSFER_STATUS.DIBATALKAN,
  ],
  [TRANSFER_STATUS.DIPROSES]: [
    TRANSFER_STATUS.DITERIMA,
    TRANSFER_STATUS.DITOLAK,
    TRANSFER_STATUS.DIBATALKAN,
  ],
  [TRANSFER_STATUS.DITERIMA]: [],
  [TRANSFER_STATUS.DITOLAK]: [],
  [TRANSFER_STATUS.DIBATALKAN]: [],
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

const fetchTransfers = async ({ whereClause = '', params = [], page, limit }) => {
  const offset = (page - 1) * limit;

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
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM medicine_transfers t
     ${whereClause}`,
    params
  );

  const itemsMap = await getTransferItemsMap(transfers.map((row) => row._id));

  return {
    transfers: transfers.map((row) => mapTransferRow(row, itemsMap)),
    count: countResult[0].total,
  };
};

const fetchTransferById = async (id) => {
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

  const itemsMap = await getTransferItemsMap([rows[0]._id]);
  return mapTransferRow(rows[0], itemsMap);
};

const generateTransferNumber = async (conn, type) => {
  return generateDocumentNumber(conn, {
    sequenceKey: type === TRANSFER_TYPES.REQUEST ? 'transfer_request' : 'transfer_receive',
    prefix: type === TRANSFER_TYPES.REQUEST ? 'REQ' : 'RCV',
  });
};

// @desc    Get all medicine transfers
// @route   GET /api/transfers
// @access  Private (Admin Apotik)
exports.getTransfers = asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const { page: currentPage, limit: rowLimit } = parsePagination(req.query);

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

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { transfers, count } = await fetchTransfers({
    whereClause,
    params,
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
  const transfer = await fetchTransferById(req.params.id);

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
        'Apotik Pusat',
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

  const populatedTransfer = await fetchTransferById(transferId);

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
        'Apotik Pusat',
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

  const populatedTransfer = await fetchTransferById(transferId);

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

  try {
    await conn.beginTransaction();

    const [transferRows] = await conn.execute(
      `SELECT id, type, status
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

    if (status !== transfer.status) {
      const transitionMap =
        transfer.type === TRANSFER_TYPES.RECEIVE
          ? RECEIVE_TRANSFER_TRANSITIONS
          : REQUEST_TRANSFER_TRANSITIONS;
      const allowedNextStatuses = transitionMap[transfer.status] || [];

      if (!allowedNextStatuses.includes(status)) {
        res.status(400);
        throw new Error(
          `Transisi status transfer tidak valid: ${transfer.status} -> ${status}`
        );
      }
    }

    // If status is 'diterima' and type is 'receive', add to stock
    if (
      status === TRANSFER_STATUS.DITERIMA &&
      transfer.type === TRANSFER_TYPES.RECEIVE &&
      transfer.status !== TRANSFER_STATUS.DITERIMA
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

        // Use received quantity if provided, otherwise use requested quantity
        const quantityToAdd =
          receivedQuantities && receivedQuantities[i] !== undefined
            ? Number(receivedQuantities[i])
            : Number(item.quantity);

        if (Number.isNaN(quantityToAdd) || quantityToAdd < 0) {
          res.status(400);
          throw new Error('Nilai receivedQuantities harus angka >= 0');
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

  const updatedTransfer = await fetchTransferById(req.params.id);

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
    `SELECT id, status
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
