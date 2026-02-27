const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { query } = require('../config/mysql');

// Protect routes - memerlukan authentication
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Ambil token dari header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Ambil user dari token
      const users = await query(
        `SELECT
          id AS _id,
          name,
          email,
          role,
          phone_number AS phoneNumber,
          specialization,
          license_number AS licenseNumber,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE id = ?
        LIMIT 1`,
        [decoded.id]
      );

      req.user = users[0]
        ? {
            ...users[0],
            isActive: Boolean(users[0].isActive),
          }
        : null;

      if (!req.user) {
        res.status(401);
        throw new Error('User tidak ditemukan');
      }

      if (!req.user.isActive) {
        res.status(401);
        throw new Error('User tidak aktif');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Tidak memiliki authorization, token gagal');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Tidak memiliki authorization, tidak ada token');
  }
});

// Authorize berdasarkan role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role ${req.user.role} tidak memiliki akses ke resource ini`
      );
    }
    next();
  };
};
