const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/mysql');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (untuk demo, bisa dibuat private)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phoneNumber, specialization, licenseNumber } = req.body;

  // Check if user exists
  const userExists = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [
    email,
  ]);

  if (userExists.length > 0) {
    res.status(400);
    throw new Error('User dengan email tersebut sudah terdaftar');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users
      (name, email, password, role, phone_number, specialization, license_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      email,
      hashedPassword,
      role,
      phoneNumber || null,
      specialization || null,
      licenseNumber || null,
    ]
  );

  const users = await query(
    `SELECT id AS _id, name, email, role
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [result.insertId]
  );

  const user = users[0];

  if (!user) {
    res.status(400);
    throw new Error('Data user tidak valid');
  }

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    res.status(400);
    throw new Error('Email dan password harus diisi');
  }

  const users = await query(
    `SELECT
      id AS _id,
      name,
      email,
      role,
      pharmacy_code AS pharmacyCode,
      password,
      is_active AS isActive
    FROM users
    WHERE email = ?
    LIMIT 1`,
    [email]
  );

  const user = users[0];

  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('Email atau password salah');
  }

  // Check if password matches
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    res.status(401);
    throw new Error('Email atau password salah');
  }

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      pharmacyCode: user.pharmacyCode,
      token: generateToken(user._id),
    },
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const users = await query(
    `SELECT
      id AS _id,
      name,
      email,
      role,
      pharmacy_code AS pharmacyCode,
      phone_number AS phoneNumber,
      specialization,
      license_number AS licenseNumber,
      is_active AS isActive,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [req.user._id]
  );

  const user = users[0];

  res.json({
    success: true,
    data: {
      ...user,
      isActive: Boolean(user?.isActive),
    },
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  // Dalam implementasi JWT stateless, logout biasanya di-handle di client
  // dengan menghapus token dari storage
  res.json({
    success: true,
    message: 'Logout berhasil',
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const users = await query(
    `SELECT
      id,
      name,
      email,
      role,
      phone_number AS phoneNumber,
      specialization,
      license_number AS licenseNumber
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [req.user._id]
  );

  const user = users[0];

  if (!user) {
    res.status(404);
    throw new Error('User tidak ditemukan');
  }

  const nextName = req.body.name || user.name;
  const nextEmail = req.body.email || user.email;
  const nextPhoneNumber = req.body.phoneNumber || user.phoneNumber;
  const nextSpecialization =
    req.user.role === 'dokter'
      ? req.body.specialization || user.specialization
      : user.specialization;
  const nextLicenseNumber =
    req.user.role === 'dokter'
      ? req.body.licenseNumber || user.licenseNumber
      : user.licenseNumber;

  if (nextEmail !== user.email) {
    const duplicate = await query(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
      [nextEmail, req.user._id]
    );

    if (duplicate.length > 0) {
      res.status(400);
      throw new Error('User dengan email tersebut sudah terdaftar');
    }
  }

  let passwordClause = '';
  const params = [
    nextName,
    nextEmail,
    nextPhoneNumber || null,
    nextSpecialization || null,
    nextLicenseNumber || null,
  ];

  if (req.body.password) {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    passwordClause = ', password = ?';
    params.push(hashedPassword);
  }

  params.push(req.user._id);

  await query(
    `UPDATE users
     SET name = ?,
         email = ?,
         phone_number = ?,
         specialization = ?,
         license_number = ?
         ${passwordClause}
     WHERE id = ?`,
    params
  );

  const updatedUsers = await query(
    `SELECT id AS _id, name, email, role
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [req.user._id]
  );

  const updatedUser = updatedUsers[0];

  res.json({
    success: true,
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      token: generateToken(updatedUser._id),
    },
  });
});
