require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'apotik_db',
};

const run = async () => {
  const conn = await mysql.createConnection(dbConfig);

  try {
    const adminPassword = await bcrypt.hash('admin12345', 10);
    const doctorPassword = await bcrypt.hash('dokter12345', 10);

    await conn.execute(
      `INSERT INTO users (name, email, password, role, phone_number)
       VALUES (?, ?, ?, 'admin_apotik', ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password = VALUES(password),
         role = VALUES(role),
         phone_number = VALUES(phone_number),
         is_active = 1`,
      ['Admin Apotik', 'admin@apotik.local', adminPassword, '081111111111']
    );

    await conn.execute(
      `INSERT INTO users (name, email, password, role, phone_number, specialization, license_number)
       VALUES (?, ?, ?, 'dokter', ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password = VALUES(password),
         role = VALUES(role),
         phone_number = VALUES(phone_number),
         specialization = VALUES(specialization),
         license_number = VALUES(license_number),
         is_active = 1`,
      [
        'Dr. Demo',
        'dokter@apotik.local',
        doctorPassword,
        '082222222222',
        'Umum',
        'SIP-DEMO-001',
      ]
    );

    await conn.execute(
      `INSERT INTO medicines (code, name, generic_name, category, unit, stock, min_stock, price, manufacturer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         generic_name = VALUES(generic_name),
         category = VALUES(category),
         unit = VALUES(unit),
         stock = VALUES(stock),
         min_stock = VALUES(min_stock),
         price = VALUES(price),
         manufacturer = VALUES(manufacturer),
         is_active = 1`,
      ['MED001', 'Paracetamol 500mg', 'Paracetamol', 'Tablet', 'Tablet', 100, 20, 3500, 'Kimia Farma']
    );

    await conn.execute(
      `INSERT INTO medicines (code, name, generic_name, category, unit, stock, min_stock, price, manufacturer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         generic_name = VALUES(generic_name),
         category = VALUES(category),
         unit = VALUES(unit),
         stock = VALUES(stock),
         min_stock = VALUES(min_stock),
         price = VALUES(price),
         manufacturer = VALUES(manufacturer),
         is_active = 1`,
      ['MED002', 'Amoxicillin 500mg', 'Amoxicillin', 'Kapsul', 'Kapsul', 80, 15, 5000, 'Kalbe']
    );

    console.log('Seed completed successfully');
    console.log('Admin login: admin@apotik.local / admin12345');
    console.log('Dokter login: dokter@apotik.local / dokter12345');
  } finally {
    await conn.end();
  }
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed database:', error.message);
    process.exit(1);
  });
