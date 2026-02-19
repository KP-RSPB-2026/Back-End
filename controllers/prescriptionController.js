const asyncHandler = require('express-async-handler');
const { pool, query } = require('../config/mysql');

const getPrescriptionItemsMap = async (prescriptionIds) => {
  if (!prescriptionIds.length) return {};

  const placeholders = prescriptionIds.map(() => '?').join(',');
  const items = await query(
    `SELECT
      pi.prescription_id AS prescriptionId,
      pi.medicine_id AS medicineId,
      pi.quantity,
      pi.dosage_instructions AS dosageInstructions,
      pi.duration,
      pi.price,
      m.id AS medicine_id,
      m.name AS medicine_name,
      m.generic_name AS medicine_genericName,
      m.code AS medicine_code,
      m.unit AS medicine_unit,
      m.price AS medicine_price
    FROM prescription_items pi
    JOIN medicines m ON m.id = pi.medicine_id
    WHERE pi.prescription_id IN (${placeholders})
    ORDER BY pi.id ASC`,
    prescriptionIds
  );

  return items.reduce((acc, item) => {
    if (!acc[item.prescriptionId]) {
      acc[item.prescriptionId] = [];
    }

    acc[item.prescriptionId].push({
      medicine: {
        _id: item.medicine_id,
        name: item.medicine_name,
        genericName: item.medicine_genericName,
        code: item.medicine_code,
        unit: item.medicine_unit,
        price: Number(item.medicine_price),
      },
      quantity: Number(item.quantity),
      dosageInstructions: item.dosageInstructions,
      duration: item.duration,
      price: Number(item.price),
    });

    return acc;
  }, {});
};

const mapPrescriptionRow = (row, itemsMap) => ({
  _id: row._id,
  prescriptionNumber: row.prescriptionNumber,
  patient: row.patientId
    ? {
        _id: row.patientId,
        name: row.patientName,
        dateOfBirth: row.patientDateOfBirth,
        phoneNumber: row.patientPhoneNumber,
        address: row.patientAddress,
        allergies: row.patientAllergies ? JSON.parse(row.patientAllergies) : [],
      }
    : null,
  doctor: row.doctorId
    ? {
        _id: row.doctorId,
        name: row.doctorName,
        email: row.doctorEmail,
        specialization: row.doctorSpecialization,
        licenseNumber: row.doctorLicenseNumber,
      }
    : null,
  medicines: itemsMap[row._id] || [],
  diagnosis: row.diagnosis,
  notes: row.notes,
  totalPrice: Number(row.totalPrice),
  status: row.status,
  prescriptionDate: row.prescriptionDate,
  completedDate: row.completedDate,
  completedBy: row.completedById
    ? {
        _id: row.completedById,
        name: row.completedByName,
        email: row.completedByEmail,
      }
    : null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const fetchPrescriptions = async ({ whereClause = '', params = [], pagination }) => {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const prescriptions = await query(
    `SELECT
      p.id AS _id,
      p.prescription_number AS prescriptionNumber,
      p.patient_id AS patientId,
      p.doctor_id AS doctorId,
      p.diagnosis,
      p.notes,
      p.total_price AS totalPrice,
      p.status,
      p.prescription_date AS prescriptionDate,
      p.completed_date AS completedDate,
      p.completed_by AS completedById,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      pt.name AS patientName,
      pt.date_of_birth AS patientDateOfBirth,
      pt.phone_number AS patientPhoneNumber,
      pt.address AS patientAddress,
      pt.allergies AS patientAllergies,
      d.name AS doctorName,
      d.email AS doctorEmail,
      d.specialization AS doctorSpecialization,
      d.license_number AS doctorLicenseNumber,
      cb.name AS completedByName,
      cb.email AS completedByEmail
    FROM prescriptions p
    LEFT JOIN patients pt ON pt.id = p.patient_id
    LEFT JOIN users d ON d.id = p.doctor_id
    LEFT JOIN users cb ON cb.id = p.completed_by
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM prescriptions p
     ${whereClause}`,
    params
  );

  const itemsMap = await getPrescriptionItemsMap(prescriptions.map((row) => row._id));

  return {
    prescriptions: prescriptions.map((row) => mapPrescriptionRow(row, itemsMap)),
    count: countResult[0].total,
  };
};

const fetchPrescriptionById = async (id) => {
  const rows = await query(
    `SELECT
      p.id AS _id,
      p.prescription_number AS prescriptionNumber,
      p.patient_id AS patientId,
      p.doctor_id AS doctorId,
      p.diagnosis,
      p.notes,
      p.total_price AS totalPrice,
      p.status,
      p.prescription_date AS prescriptionDate,
      p.completed_date AS completedDate,
      p.completed_by AS completedById,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      pt.name AS patientName,
      pt.date_of_birth AS patientDateOfBirth,
      pt.phone_number AS patientPhoneNumber,
      pt.address AS patientAddress,
      pt.allergies AS patientAllergies,
      d.name AS doctorName,
      d.email AS doctorEmail,
      d.specialization AS doctorSpecialization,
      d.license_number AS doctorLicenseNumber,
      cb.name AS completedByName,
      cb.email AS completedByEmail
    FROM prescriptions p
    LEFT JOIN patients pt ON pt.id = p.patient_id
    LEFT JOIN users d ON d.id = p.doctor_id
    LEFT JOIN users cb ON cb.id = p.completed_by
    WHERE p.id = ?
    LIMIT 1`,
    [id]
  );

  if (!rows[0]) {
    return null;
  }

  const itemsMap = await getPrescriptionItemsMap([rows[0]._id]);
  return mapPrescriptionRow(rows[0], itemsMap);
};

const generatePrescriptionNumber = async (conn) => {
  const [countRows] = await conn.execute('SELECT COUNT(*) AS total FROM prescriptions');
  const count = Number(countRows[0].total) + 1;
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `RX${year}${month}${String(count).padStart(5, '0')}`;
};

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private
exports.getPrescriptions = asyncHandler(async (req, res) => {
  const { status, doctorId, patientId, page = 1, limit = 10 } = req.query;
  const currentPage = Number(page);
  const rowLimit = Number(limit);

  const filters = [];
  const params = [];

  if (status) {
    filters.push('p.status = ?');
    params.push(status);
  }

  if (doctorId) {
    filters.push('p.doctor_id = ?');
    params.push(doctorId);
  }

  if (patientId) {
    filters.push('p.patient_id = ?');
    params.push(patientId);
  }

  if (req.user.role === 'dokter') {
    filters.push('p.doctor_id = ?');
    params.push(req.user._id);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { prescriptions, count } = await fetchPrescriptions({
    whereClause,
    params,
    pagination: { page: currentPage, limit: rowLimit },
  });

  res.json({
    success: true,
    data: prescriptions,
    pagination: {
      total: count,
      page: currentPage,
      pages: Math.ceil(count / rowLimit),
    },
  });
});

// @desc    Get single prescription
// @route   GET /api/prescriptions/:id
// @access  Private
exports.getPrescription = asyncHandler(async (req, res) => {
  const prescription = await fetchPrescriptionById(req.params.id);

  if (!prescription) {
    res.status(404);
    throw new Error('Resep tidak ditemukan');
  }

  // Check authorization
  if (
    req.user.role === 'dokter' &&
    Number(prescription.doctor?._id) !== Number(req.user._id)
  ) {
    res.status(403);
    throw new Error('Tidak memiliki akses ke resep ini');
  }

  res.json({
    success: true,
    data: prescription,
  });
});

// @desc    Create new prescription
// @route   POST /api/prescriptions
// @access  Private (Dokter)
exports.createPrescription = asyncHandler(async (req, res) => {
  const { patient, medicines, diagnosis, notes } = req.body;

  // Verify patient exists
  const patientRows = await query(
    'SELECT id FROM patients WHERE id = ? AND is_active = 1 LIMIT 1',
    [patient]
  );
  if (patientRows.length === 0) {
    res.status(404);
    throw new Error('Pasien tidak ditemukan');
  }

  const medicineIds = medicines.map((item) => item.medicine);
  const placeholders = medicineIds.map(() => '?').join(',');
  const medicineRows = await query(
    `SELECT id, name, price
     FROM medicines
     WHERE id IN (${placeholders}) AND is_active = 1`,
    medicineIds
  );

  const medicineById = new Map(medicineRows.map((row) => [String(row.id), row]));

  let totalPrice = 0;
  const prescriptionItems = [];

  for (const item of medicines) {
    const medicineRow = medicineById.get(String(item.medicine));

    if (!medicineRow) {
      res.status(404);
      throw new Error(`Obat dengan ID ${item.medicine} tidak ditemukan`);
    }

    const itemPrice = Number(medicineRow.price) * Number(item.quantity);
    totalPrice += itemPrice;

    prescriptionItems.push({
      medicine: Number(item.medicine),
      quantity: Number(item.quantity),
      dosageInstructions: item.dosageInstructions,
      duration: item.duration || null,
      price: itemPrice,
    });
  }

  const conn = await pool.getConnection();

  let prescriptionId;

  try {
    await conn.beginTransaction();

    const prescriptionNumber = await generatePrescriptionNumber(conn);

    const [insertResult] = await conn.execute(
      `INSERT INTO prescriptions
        (prescription_number, patient_id, doctor_id, diagnosis, notes, total_price)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        prescriptionNumber,
        patient,
        req.user._id,
        diagnosis || null,
        notes || null,
        totalPrice,
      ]
    );

    prescriptionId = insertResult.insertId;

    for (const item of prescriptionItems) {
      await conn.execute(
        `INSERT INTO prescription_items
          (prescription_id, medicine_id, quantity, dosage_instructions, duration, price)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          prescriptionId,
          item.medicine,
          item.quantity,
          item.dosageInstructions,
          item.duration,
          item.price,
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

  const populatedPrescription = await fetchPrescriptionById(prescriptionId);

  res.status(201).json({
    success: true,
    data: populatedPrescription,
  });
});

// @desc    Update prescription status
// @route   PATCH /api/prescriptions/:id/status
// @access  Private (Admin Apotik)
exports.updatePrescriptionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const conn = await pool.getConnection();

  let prescription;

  try {
    await conn.beginTransaction();

    const [prescriptionRows] = await conn.execute(
      `SELECT id, status
       FROM prescriptions
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [req.params.id]
    );

    prescription = prescriptionRows[0];

    if (!prescription) {
      res.status(404);
      throw new Error('Resep tidak ditemukan');
    }

    // If status is 'selesai', reduce medicine stock
    if (status === 'selesai' && prescription.status !== 'selesai') {
      const [items] = await conn.execute(
        `SELECT
          pi.medicine_id AS medicineId,
          pi.quantity,
          m.name,
          m.stock
        FROM prescription_items pi
        JOIN medicines m ON m.id = pi.medicine_id
        WHERE pi.prescription_id = ?
        FOR UPDATE`,
        [req.params.id]
      );

      for (const item of items) {
        if (Number(item.stock) < Number(item.quantity)) {
          res.status(400);
          throw new Error(`Stok ${item.name} tidak mencukupi`);
        }

        await conn.execute('UPDATE medicines SET stock = stock - ? WHERE id = ?', [
          item.quantity,
          item.medicineId,
        ]);
      }

      await conn.execute(
        `UPDATE prescriptions
         SET status = ?, completed_date = NOW(), completed_by = ?
         WHERE id = ?`,
        [status, req.user._id, req.params.id]
      );
    } else {
      await conn.execute('UPDATE prescriptions SET status = ? WHERE id = ?', [
        status,
        req.params.id,
      ]);
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const updatedPrescription = await fetchPrescriptionById(req.params.id);

  res.json({
    success: true,
    data: updatedPrescription,
  });
});

// @desc    Cancel prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private (Dokter - own prescriptions only)
exports.cancelPrescription = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, doctor_id AS doctorId, status
     FROM prescriptions
     WHERE id = ?
     LIMIT 1`,
    [req.params.id]
  );

  const prescription = rows[0];

  if (!prescription) {
    res.status(404);
    throw new Error('Resep tidak ditemukan');
  }

  // Only the doctor who created can cancel
  if (
    req.user.role === 'dokter' &&
    Number(prescription.doctorId) !== Number(req.user._id)
  ) {
    res.status(403);
    throw new Error('Tidak memiliki akses untuk membatalkan resep ini');
  }

  // Can only cancel if not yet completed
  if (prescription.status === 'selesai') {
    res.status(400);
    throw new Error('Resep yang sudah selesai tidak dapat dibatalkan');
  }

  await query('UPDATE prescriptions SET status = ? WHERE id = ?', [
    'dibatalkan',
    req.params.id,
  ]);

  res.json({
    success: true,
    message: 'Resep berhasil dibatalkan',
  });
});
