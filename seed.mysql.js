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

    const doctors = [
      {
        name: 'Dr. Sulaiman Bintoro',
        email: 'dokter.apta@apotik.com',
        phone: '081234567891',
        specialization: 'Dokter Umum',
        license: 'SIP-123456789',
        pharmacyCode: 'APTA',
      },
      {
        name: 'Dr. Maya Lestari',
        email: 'dokter.aptb@apotik.com',
        phone: '081234567902',
        specialization: 'Dokter Umum',
        license: 'SIP-123456790',
        pharmacyCode: 'APTB',
      },
      {
        name: 'Dr. Rudi Hartono',
        email: 'dokter.aptc@apotik.com',
        phone: '081234567903',
        specialization: 'Dokter Umum',
        license: 'SIP-123456791',
        pharmacyCode: 'APTC',
      },
    ];

    const doctorIds = [];
    for (const doctor of doctors) {
      const [doctorResult] = await conn.execute(
        `INSERT INTO users
         (name, email, password, role, pharmacy_code, phone_number, specialization, license_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ,
        [
          doctor.name,
          doctor.email,
          dokterPassword,
          'dokter',
          doctor.pharmacyCode,
          doctor.phone,
          doctor.specialization,
          doctor.license,
        ]
      );
      doctorIds.push(doctorResult.insertId);
    }

    const dokterId = doctorIds[0];

    const patients = [
      ['Rizky Pratama', '1985-05-15', 'Laki-laki', 'Jl. Jenderal Sudirman No. 45, Balikpapan', '081234567892', 'rizky.pratama@example.com', '3171234567890001', JSON.stringify(['Penisilin']), 'A+'],
      ['Siti Nur Aisyah', '1990-08-20', 'Perempuan', 'Jl. MT Haryono No. 18, Balikpapan', '081234567893', 'siti.aisyah@example.com', '3171234567890002', JSON.stringify([]), 'B+'],
      ['Budi Santoso', '1978-03-10', 'Laki-laki', 'Jl. Ruhui Rahayu No. 22, Balikpapan', '081234567894', null, '3171234567890003', JSON.stringify(['Aspirin']), 'O+'],
      ['Dewi Lestari', '1992-11-02', 'Perempuan', 'Jl. Ahmad Yani No. 12, Balikpapan', '081234567895', 'dewi.lestari@example.com', '3171234567890004', JSON.stringify(['Debu']), 'AB+'],
      ['Fajar Nugroho', '1989-01-27', 'Laki-laki', 'Jl. Soekarno Hatta KM 5 No. 7, Balikpapan', '081234567896', 'fajar.nugroho@example.com', '3171234567890005', JSON.stringify([]), 'A-'],
      ['Nabila Putri Maharani', '1996-06-14', 'Perempuan', 'Jl. Marsma R. Iswahyudi No. 30, Balikpapan', '081234567897', 'nabila.maharani@example.com', '3171234567890006', JSON.stringify(['Seafood']), 'B-'],
      ['Andi Saputra', '1983-09-08', 'Laki-laki', 'Jl. Letjen Suprapto No. 9, Balikpapan', '081234567898', 'andi.saputra@example.com', '3171234567890007', JSON.stringify([]), 'O-'],
      ['Rina Oktaviani', '1998-04-21', 'Perempuan', 'Jl. Pupuk Raya No. 16, Balikpapan', '081234567899', 'rina.oktaviani@example.com', '3171234567890008', JSON.stringify(['Udang']), 'A+'],
      ['Yusuf Maulana', '1975-12-03', 'Laki-laki', 'Jl. Mulawarman No. 11, Balikpapan', '081234567900', null, '3171234567890009', JSON.stringify(['Asma']), 'B+'],
      ['Intan Permatasari', '2000-07-19', 'Perempuan', 'Jl. Beller No. 24, Balikpapan', '081234567901', 'intan.permatasari@example.com', '3171234567890010', JSON.stringify([]), 'O+'],
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
      ['MED005', 'Salep Antijamur', 'Miconazole', 'Salep', 'Konimex', 'Obat untuk penyakit kulit', '10g', 'Tube', 80, 20, 12000, '2025-06-30', 'BATCH-2024-005'],
      ['MED006', 'Ibuprofen 400mg', 'Ibuprofen', 'Tablet', 'Dexa Medica', 'Pereda nyeri dan antiinflamasi', '400mg', 'Tablet', 220, 50, 6500, '2026-01-31', 'BATCH-2024-006'],
      ['MED007', 'Cetirizine 10mg', 'Cetirizine', 'Tablet', 'Sanbe Farma', 'Obat alergi', '10mg', 'Tablet', 190, 40, 4500, '2026-03-31', 'BATCH-2024-007'],
      ['MED008', 'Omeprazole 20mg', 'Omeprazole', 'Kapsul', 'Kalbe Farma', 'Obat asam lambung', '20mg', 'Kapsul', 170, 35, 7000, '2026-05-31', 'BATCH-2024-008'],
      ['MED009', 'Amlodipine 5mg', 'Amlodipine', 'Tablet', 'Kimia Farma', 'Obat hipertensi', '5mg', 'Tablet', 140, 30, 5500, '2026-07-31', 'BATCH-2024-009'],
      ['MED010', 'Metformin 500mg', 'Metformin', 'Tablet', 'Indofarma', 'Obat diabetes', '500mg', 'Tablet', 160, 35, 6000, '2026-08-31', 'BATCH-2024-010'],
      ['MED011', 'Antasida DOEN', 'Hydrotalcite + Mg(OH)2', 'Tablet', 'Tempo Scan', 'Obat maag', '1 tablet', 'Tablet', 130, 25, 4000, '2025-11-30', 'BATCH-2024-011'],
      ['MED012', 'Loratadine 10mg', 'Loratadine', 'Tablet', 'Bernofarm', 'Obat alergi', '10mg', 'Tablet', 120, 25, 5000, '2026-09-30', 'BATCH-2024-012'],
    ];

    const pharmacyMedicinePlan = {
      APTA: { count: 10, stockMultiplier: 1.0 },
      APTB: { count: 11, stockMultiplier: 0.8 },
      APTC: { count: 12, stockMultiplier: 1.25 },
    };

    for (const pharmacy of pharmacies) {
      const plan = pharmacyMedicinePlan[pharmacy.code] || {
        count: 10,
        stockMultiplier: 1,
      };

      const medicinesForPharmacy = baseMedicines.slice(0, plan.count);

      for (const [index, medicine] of medicinesForPharmacy.entries()) {
        const [
          baseCode,
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
        ] = medicine;

        const codeWithPharmacy = `${baseCode}-${pharmacy.code}`;
        const adjustedStock = Math.max(20, Math.round(stock * plan.stockMultiplier) + index * 2);
        const adjustedMinStock = Math.max(10, Math.round(minStock * plan.stockMultiplier));

        await conn.execute(
          `INSERT INTO medicines
           (
             code, name, generic_name, category, manufacturer, description, dosage,
             unit, stock, min_stock, price, expiry_date, batch_number, pharmacy_code, side_effects, contraindications
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ,
          [
            codeWithPharmacy,
            name,
            genericName,
            category,
            manufacturer,
            description,
            dosage,
            unit,
            adjustedStock,
            adjustedMinStock,
            price,
            expiryDate,
            batchNumber,
            pharmacy.code,
            JSON.stringify([]),
            JSON.stringify([]),
          ]
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
