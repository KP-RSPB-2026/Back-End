const asyncHandler = require('express-async-handler');
const { query } = require('../config/mysql');

const mapPatient = (row) => ({
  _id: row._id,
  name: row.name,
  dateOfBirth: row.dateOfBirth,
  gender: row.gender,
  address: row.address,
  phoneNumber: row.phoneNumber,
  email: row.email,
  idNumber: row.idNumber,
  allergies: row.allergies ? JSON.parse(row.allergies) : [],
  medicalHistory: row.medicalHistory,
  bloodType: row.bloodType,
  isActive: Boolean(row.isActive),
  createdBy: row.createdById
    ? {
        _id: row.createdById,
        name: row.createdByName,
        email: row.createdByEmail,
      }
    : null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const currentPage = Number(page);
  const rowLimit = Number(limit);
  const offset = (currentPage - 1) * rowLimit;

  const params = [];
  let whereClause = 'WHERE p.is_active = 1';

  if (search) {
    whereClause +=
      ' AND (p.name LIKE ? OR p.phone_number LIKE ? OR p.email LIKE ? OR p.id_number LIKE ?)';
    const wildcard = `%${search}%`;
    params.push(wildcard, wildcard, wildcard, wildcard);
  }

  const patients = await query(
    `SELECT
      p.id AS _id,
      p.name,
      p.date_of_birth AS dateOfBirth,
      p.gender,
      p.address,
      p.phone_number AS phoneNumber,
      p.email,
      p.id_number AS idNumber,
      p.allergies,
      p.medical_history AS medicalHistory,
      p.blood_type AS bloodType,
      p.is_active AS isActive,
      p.created_by AS createdById,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      u.name AS createdByName,
      u.email AS createdByEmail
    FROM patients p
    LEFT JOIN users u ON u.id = p.created_by
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?`,
    [...params, rowLimit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM patients p
     ${whereClause}`,
    params
  );

  const count = countResult[0].total;

  res.json({
    success: true,
    data: patients.map(mapPatient),
    pagination: {
      total: count,
      page: currentPage,
      pages: Math.ceil(count / rowLimit),
    },
  });
});

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = asyncHandler(async (req, res) => {
  const patients = await query(
    `SELECT
      p.id AS _id,
      p.name,
      p.date_of_birth AS dateOfBirth,
      p.gender,
      p.address,
      p.phone_number AS phoneNumber,
      p.email,
      p.id_number AS idNumber,
      p.allergies,
      p.medical_history AS medicalHistory,
      p.blood_type AS bloodType,
      p.is_active AS isActive,
      p.created_by AS createdById,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      u.name AS createdByName,
      u.email AS createdByEmail
    FROM patients p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.id = ?
    LIMIT 1`,
    [req.params.id]
  );

  const patient = patients[0];

  if (!patient) {
    res.status(404);
    throw new Error('Pasien tidak ditemukan');
  }

  res.json({
    success: true,
    data: mapPatient(patient),
  });
});

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private (Dokter)
exports.createPatient = asyncHandler(async (req, res) => {
  const {
    name,
    dateOfBirth,
    gender,
    address,
    phoneNumber,
    email,
    idNumber,
    allergies,
    medicalHistory,
    bloodType,
  } = req.body;

  const result = await query(
    `INSERT INTO patients
      (
        name,
        date_of_birth,
        gender,
        address,
        phone_number,
        email,
        id_number,
        allergies,
        medical_history,
        blood_type,
        created_by
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      dateOfBirth,
      gender,
      address || null,
      phoneNumber || null,
      email || null,
      idNumber || null,
      JSON.stringify(allergies || []),
      medicalHistory || null,
      bloodType || null,
      req.user._id,
    ]
  );

  const patients = await query(
    `SELECT
      p.id AS _id,
      p.name,
      p.date_of_birth AS dateOfBirth,
      p.gender,
      p.address,
      p.phone_number AS phoneNumber,
      p.email,
      p.id_number AS idNumber,
      p.allergies,
      p.medical_history AS medicalHistory,
      p.blood_type AS bloodType,
      p.is_active AS isActive,
      p.created_by AS createdById,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      u.name AS createdByName,
      u.email AS createdByEmail
    FROM patients p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.id = ?
    LIMIT 1`,
    [result.insertId]
  );

  const patient = patients[0];

  res.status(201).json({
    success: true,
    data: mapPatient(patient),
  });
});

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private (Dokter)
exports.updatePatient = asyncHandler(async (req, res) => {
  const existing = await query('SELECT id FROM patients WHERE id = ? LIMIT 1', [
    req.params.id,
  ]);

  if (existing.length === 0) {
    res.status(404);
    throw new Error('Pasien tidak ditemukan');
  }

  const fieldMap = {
    name: 'name',
    dateOfBirth: 'date_of_birth',
    gender: 'gender',
    address: 'address',
    phoneNumber: 'phone_number',
    email: 'email',
    idNumber: 'id_number',
    allergies: 'allergies',
    medicalHistory: 'medical_history',
    bloodType: 'blood_type',
    isActive: 'is_active',
  };

  const updates = [];
  const params = [];

  Object.entries(fieldMap).forEach(([key, column]) => {
    if (req.body[key] !== undefined) {
      updates.push(`${column} = ?`);
      if (key === 'allergies') {
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
    await query(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const patients = await query(
    `SELECT
      p.id AS _id,
      p.name,
      p.date_of_birth AS dateOfBirth,
      p.gender,
      p.address,
      p.phone_number AS phoneNumber,
      p.email,
      p.id_number AS idNumber,
      p.allergies,
      p.medical_history AS medicalHistory,
      p.blood_type AS bloodType,
      p.is_active AS isActive,
      p.created_by AS createdById,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      u.name AS createdByName,
      u.email AS createdByEmail
    FROM patients p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.id = ?
    LIMIT 1`,
    [req.params.id]
  );

  const patient = patients[0];

  res.json({
    success: true,
    data: mapPatient(patient),
  });
});

// @desc    Delete patient (soft delete)
// @route   DELETE /api/patients/:id
// @access  Private (Dokter)
exports.deletePatient = asyncHandler(async (req, res) => {
  const patients = await query('SELECT id FROM patients WHERE id = ? LIMIT 1', [
    req.params.id,
  ]);

  if (patients.length === 0) {
    res.status(404);
    throw new Error('Pasien tidak ditemukan');
  }

  await query('UPDATE patients SET is_active = 0 WHERE id = ?', [req.params.id]);

  res.json({
    success: true,
    message: 'Pasien berhasil dihapus',
  });
});
