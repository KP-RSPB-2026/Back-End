require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const initSchema = async (conn) => {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('dokter', 'admin_apotik') NOT NULL,
      pharmacy_code VARCHAR(50),
      phone_number VARCHAR(30),
      specialization VARCHAR(120),
      license_number VARCHAR(120),
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS patients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      date_of_birth DATE NOT NULL,
      gender ENUM('Laki-laki', 'Perempuan') NOT NULL,
      address TEXT,
      phone_number VARCHAR(30),
      email VARCHAR(150),
      id_number VARCHAR(80) UNIQUE,
      allergies JSON,
      medical_history TEXT,
      blood_type VARCHAR(5),
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_patients_created_by FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      generic_name VARCHAR(150),
      category VARCHAR(50) NOT NULL,
      manufacturer VARCHAR(120),
      description TEXT,
      dosage VARCHAR(100),
      unit VARCHAR(40) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      min_stock INT NOT NULL DEFAULT 10,
      price DECIMAL(12,2) NOT NULL,
      expiry_date DATE,
      batch_number VARCHAR(80),
      pharmacy_code VARCHAR(50),
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      side_effects JSON,
      contraindications JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_medicines_pharmacy (pharmacy_code)
    ) ENGINE=InnoDB;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prescription_number VARCHAR(50) NOT NULL UNIQUE,
      patient_id INT NOT NULL,
      doctor_id INT NOT NULL,
      diagnosis TEXT,
      notes TEXT,
      total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      status ENUM('pending', 'disiapkan', 'selesai', 'dibatalkan') NOT NULL DEFAULT 'pending',
      prescription_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_date DATETIME,
      completed_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_prescriptions_doctor FOREIGN KEY (doctor_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_prescriptions_completed_by FOREIGN KEY (completed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS prescription_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prescription_id INT NOT NULL,
      medicine_id INT NOT NULL,
      quantity INT NOT NULL,
      dosage_instructions VARCHAR(255) NOT NULL,
      duration VARCHAR(120),
      price DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_prescription_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS medicine_transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transfer_number VARCHAR(50) NOT NULL UNIQUE,
      from_pharmacy VARCHAR(120) NOT NULL,
      to_pharmacy VARCHAR(120) NOT NULL,
      type ENUM('request', 'receive') NOT NULL,
      status ENUM('pending', 'diproses', 'dikirim', 'diterima', 'ditolak', 'dibatalkan') NOT NULL DEFAULT 'pending',
      request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_date DATETIME,
      requested_by INT NOT NULL,
      processed_by INT,
      notes TEXT,
      urgency ENUM('rendah', 'sedang', 'tinggi') NOT NULL DEFAULT 'sedang',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_transfers_requested_by FOREIGN KEY (requested_by) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_transfers_processed_by FOREIGN KEY (processed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS medicine_transfer_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transfer_id INT NOT NULL,
      medicine_id INT NOT NULL,
      quantity INT NOT NULL,
      received_quantity INT NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_transfer_items_transfer FOREIGN KEY (transfer_id) REFERENCES medicine_transfers(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_transfer_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB;
  `);
};

const seedData = async () => {
  const dbName = process.env.DB_NAME || 'apotik_db';
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  await rootConn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await rootConn.end();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  try {
    await conn.beginTransaction();
    await initSchema(conn);

    // Ensure new columns exist for upgraded databases
    await conn.execute(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS pharmacy_code VARCHAR(50) AFTER role'
    );
    await conn.execute(
      'ALTER TABLE medicines ADD COLUMN IF NOT EXISTS pharmacy_code VARCHAR(50) AFTER batch_number'
    );
    await conn.execute(
      'ALTER TABLE medicines ADD INDEX IF NOT EXISTS idx_medicines_pharmacy (pharmacy_code)'
    );

    await conn.execute('DELETE FROM medicine_transfer_items');
    await conn.execute('DELETE FROM medicine_transfers');
    await conn.execute('DELETE FROM prescription_items');
    await conn.execute('DELETE FROM prescriptions');
    await conn.execute('DELETE FROM medicines');
    await conn.execute('DELETE FROM patients');
    await conn.execute('DELETE FROM users');

    const adminPassword = await bcrypt.hash('admin123', 10);
    const dokterPassword = await bcrypt.hash('dokter123', 10);

    const pharmacies = [
      { code: 'APTA', name: 'Apotek A' },
      { code: 'APTB', name: 'Apotek B' },
      { code: 'APTC', name: 'Apotek C' },
    ];

    for (const [index, pharmacy] of pharmacies.entries()) {
      await conn.execute(
        `INSERT INTO users (name, email, password, role, pharmacy_code, phone_number)
         VALUES (?, ?, ?, ?, ?, ?)`
        ,
        [
          `Admin ${pharmacy.name}`,
          `admin${index + 1}@apotik.com`,
          adminPassword,
          'admin_apotik',
          pharmacy.code,
          `0812345678${90 + index}`,
        ]
      );
    }

    const [dokterResult] = await conn.execute(
      `INSERT INTO users
       (name, email, password, role, phone_number, specialization, license_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      ,
      [
        'Dr. Budi Santoso',
        'dokter@apotik.com',
        dokterPassword,
        'dokter',
        '081234567891',
        'Dokter Umum',
        'SIP-123456789',
      ]
    );

    const dokterId = dokterResult.insertId;

    const patients = [
      ['John Doe', '1985-05-15', 'Laki-laki', 'Jl. Merdeka No. 10, Jakarta', '081234567892', 'john@example.com', '3171234567890001', JSON.stringify(['Penisilin']), 'A+'],
      ['Jane Smith', '1990-08-20', 'Perempuan', 'Jl. Sudirman No. 25, Jakarta', '081234567893', 'jane@example.com', '3171234567890002', JSON.stringify([]), 'B+'],
      ['Ahmad Rahman', '1978-03-10', 'Laki-laki', 'Jl. Gatot Subroto No. 15, Jakarta', '081234567894', null, '3171234567890003', JSON.stringify(['Aspirin']), 'O+'],
    ];

    for (const patient of patients) {
      await conn.execute(
        `INSERT INTO patients
         (name, date_of_birth, gender, address, phone_number, email, id_number, allergies, blood_type, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ,
        [...patient, dokterId]
      );
    }

    const baseMedicines = [
      ['MED001', 'Paracetamol 500mg', 'Paracetamol', 'Tablet', 'Kimia Farma', 'Obat penurun panas dan pereda nyeri', '500mg', 'Tablet', 500, 100, 5000, '2025-12-31', 'BATCH-2024-001'],
      ['MED002', 'Amoxicillin 500mg', 'Amoxicillin', 'Kapsul', 'Indofarma', 'Antibiotik untuk infeksi bakteri', '500mg', 'Kapsul', 300, 50, 8000, '2025-10-31', 'BATCH-2024-002'],
      ['MED003', 'OBH Sirup', 'Diphenhydramine HCl', 'Sirup', 'Kalbe Farma', 'Obat batuk', '100ml', 'Botol', 150, 30, 15000, '2025-08-31', 'BATCH-2024-003'],
      ['MED004', 'Vitamin C 1000mg', 'Ascorbic Acid', 'Tablet', 'Kalbe Farma', 'Suplemen vitamin C', '1000mg', 'Tablet', 200, 50, 3000, '2026-12-31', 'BATCH-2024-004'],
      ['MED005', 'Salep 88', 'Miconazole', 'Salep', 'Konimex', 'Obat untuk penyakit kulit', '10g', 'Tube', 80, 20, 12000, '2025-06-30', 'BATCH-2024-005'],
    ];

    for (const pharmacy of pharmacies) {
      for (const medicine of baseMedicines) {
        const [baseCode, ...rest] = medicine;
        const codeWithPharmacy = `${baseCode}-${pharmacy.code}`;
        await conn.execute(
          `INSERT INTO medicines
           (
             code, name, generic_name, category, manufacturer, description, dosage,
             unit, stock, min_stock, price, expiry_date, batch_number, pharmacy_code, side_effects, contraindications
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ,
          [codeWithPharmacy, ...rest, pharmacy.code, JSON.stringify([]), JSON.stringify([])]
        );
      }
    }

    await conn.commit();
    console.log('Seeding MySQL berhasil.');
  } catch (error) {
    await conn.rollback();
    console.error('Error seeding data:', error.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
};

seedData();
