require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query } = require('./config/mysql');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const transferRoutes = require('./routes/transferRoutes');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin tidak diizinkan oleh CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({
    message: 'Selamat datang di API Sistem Manajemen Apotik',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      patients: '/api/patients',
      medicines: '/api/medicines',
      prescriptions: '/api/prescriptions',
      transfers: '/api/transfers',
      health: '/health',
    },
  });
});

app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');

    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      message: error.message,
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/transfers', transferRoutes);

app.use(errorHandler);

module.exports = app;