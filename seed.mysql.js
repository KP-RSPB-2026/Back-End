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

    // Incremental seed: keep existing data and only add missing rows.

    const adminPassword = await bcrypt.hash('admin123', 10);
    const dokterPassword = await bcrypt.hash('dokter123', 10);

    const pharmacies = [
      { code: 'APTA', name: 'Apotek A' },
      { code: 'APTB', name: 'Apotek B' },
      { code: 'APTC', name: 'Apotek C' },
    ];

    for (const [index, pharmacy] of pharmacies.entries()) {
      await conn.execute(
        `INSERT IGNORE INTO users (name, email, password, role, pharmacy_code, phone_number)
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

    for (const doctor of doctors) {
      await conn.execute(
        `INSERT IGNORE INTO users
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
    }

    const [doctorRows] = await conn.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [doctors[0].email]
    );
    const dokterId = doctorRows[0]?.id;

    if (!dokterId) {
      throw new Error('Gagal mengambil ID dokter untuk seed pasien');
    }

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

    const additionalPatients = [
      ['Ahmad Syafiq', '1984-02-11', 'Laki-laki', 'Jl. Mulawarman No. 31, Balikpapan', '081234567902', 'ahmad.syafiq@example.com', '3171234567890011', JSON.stringify([]), 'A+'],
      ['Nisa Rahmawati', '1993-05-09', 'Perempuan', 'Jl. MT Haryono No. 22, Balikpapan', '081234567903', 'nisa.rahmawati@example.com', '3171234567890012', JSON.stringify(['Debu']), 'B+'],
      ['Rizal Fadillah', '1987-10-17', 'Laki-laki', 'Jl. Letjen S. Parman No. 5, Balikpapan', '081234567904', null, '3171234567890013', JSON.stringify([]), 'O+'],
      ['Ayu Lestari', '1995-01-25', 'Perempuan', 'Jl. Soekarno Hatta KM 8 No. 14, Balikpapan', '081234567905', 'ayu.lestari@example.com', '3171234567890014', JSON.stringify(['Makanan laut']), 'AB+'],
      ['Dimas Pratama', '1979-08-30', 'Laki-laki', 'Jl. Jenderal Sudirman No. 61, Balikpapan', '081234567906', 'dimas.pratama@example.com', '3171234567890015', JSON.stringify(['Asam lambung']), 'A-'],
      ['Salsa Maharani', '2001-03-14', 'Perempuan', 'Jl. Pupuk Raya No. 8, Balikpapan', '081234567907', 'salsa.maharani@example.com', '3171234567890016', JSON.stringify([]), 'B-'],
      ['Hendra Wijaya', '1982-06-22', 'Laki-laki', 'Jl. Ahmad Yani No. 44, Balikpapan', '081234567908', 'hendra.wijaya@example.com', '3171234567890017', JSON.stringify(['Aspirin']), 'O-'],
      ['Maya Putri', '1990-09-12', 'Perempuan', 'Jl. Marsma R. Iswahyudi No. 18, Balikpapan', '081234567909', 'maya.putri@example.com', '3171234567890018', JSON.stringify([]), 'A+'],
      ['Fikri Ramadhan', '1986-12-07', 'Laki-laki', 'Jl. Ruhui Rahayu No. 27, Balikpapan', '081234567910', null, '3171234567890019', JSON.stringify(['Udang']), 'B+'],
      ['Citra Permata', '1997-04-03', 'Perempuan', 'Jl. Beller No. 33, Balikpapan', '081234567911', 'citra.permata@example.com', '3171234567890020', JSON.stringify([]), 'O+'],
      ['Bayu Saputra', '1988-07-28', 'Laki-laki', 'Jl. Mulawarman No. 19, Balikpapan', '081234567912', 'bayu.saputra@example.com', '3171234567890021', JSON.stringify(['Penisilin']), 'AB+'],
      ['Tasya Indah', '1994-11-16', 'Perempuan', 'Jl. Soekarno Hatta KM 3 No. 9, Balikpapan', '081234567913', 'tasya.indah@example.com', '3171234567890022', JSON.stringify([]), 'A-'],
      ['Rangga Kurnia', '1981-02-19', 'Laki-laki', 'Jl. Letjen Suprapto No. 20, Balikpapan', '081234567914', null, '3171234567890023', JSON.stringify(['Debu']), 'B-'],
      ['Nadia Safira', '1999-10-05', 'Perempuan', 'Jl. Jenderal Sudirman No. 72, Balikpapan', '081234567915', 'nadia.safira@example.com', '3171234567890024', JSON.stringify([]), 'O+'],
      ['Yoga Prakoso', '1976-03-24', 'Laki-laki', 'Jl. Pupuk Raya No. 25, Balikpapan', '081234567916', 'yoga.prakoso@example.com', '3171234567890025', JSON.stringify(['Asma']), 'A+'],
      ['Lina Kurniasih', '1991-12-21', 'Perempuan', 'Jl. MT Haryono No. 39, Balikpapan', '081234567917', 'lina.kurniasih@example.com', '3171234567890026', JSON.stringify([]), 'B+'],
      ['Reza Aditya', '1985-05-30', 'Laki-laki', 'Jl. Ahmad Yani No. 28, Balikpapan', '081234567918', 'reza.aditya@example.com', '3171234567890027', JSON.stringify(['Seafood']), 'O-'],
      ['Mutiara Sari', '2002-01-13', 'Perempuan', 'Jl. Marsma R. Iswahyudi No. 41, Balikpapan', '081234567919', null, '3171234567890028', JSON.stringify([]), 'AB+'],
      ['Arif Setiawan', '1983-09-29', 'Laki-laki', 'Jl. Beller No. 12, Balikpapan', '081234567920', 'arif.setiawan@example.com', '3171234567890029', JSON.stringify(['Aspirin']), 'A+'],
      ['Putri Amelia', '1996-08-08', 'Perempuan', 'Jl. Ruhui Rahayu No. 14, Balikpapan', '081234567921', 'putri.amelia@example.com', '3171234567890030', JSON.stringify([]), 'B-'],
    ];

    for (const patient of additionalPatients) {
      patients.push(patient);
    }

    for (const patient of patients) {
      await conn.execute(
        `INSERT IGNORE INTO patients
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

    const additionalMedicineTemplates = [
      ['MED013', 'Antasida Tablet', 'Antacid Complex', 'Tablet', 'Hexpharm', 'Obat untuk mengurangi asam lambung', '1 tablet', 'Tablet', 140, 30, 4500, '2026-04-30', 'BATCH-2024-013'],
      ['MED014', 'Ranitidine 150mg', 'Ranitidine', 'Tablet', 'Tempo Scan', 'Obat tukak lambung', '150mg', 'Tablet', 110, 20, 6200, '2026-05-31', 'BATCH-2024-014'],
      ['MED015', 'Ambroxol Sirup', 'Ambroxol HCl', 'Sirup', 'Sanbe Farma', 'Obat pengencer dahak', '60ml', 'Botol', 160, 35, 9800, '2026-06-30', 'BATCH-2024-015'],
      ['MED016', 'Diazepam 2mg', 'Diazepam', 'Tablet', 'Kimia Farma', 'Obat penenang', '2mg', 'Tablet', 90, 15, 7200, '2026-07-31', 'BATCH-2024-016'],
      ['MED017', 'Cetirizine Sirup', 'Cetirizine', 'Sirup', 'Kalbe Farma', 'Obat alergi untuk anak', '60ml', 'Botol', 150, 30, 10500, '2026-08-31', 'BATCH-2024-017'],
      ['MED018', 'Mefenamic Acid 500mg', 'Mefenamic Acid', 'Tablet', 'Dexa Medica', 'Pereda nyeri haid dan nyeri ringan', '500mg', 'Tablet', 175, 40, 6700, '2026-09-30', 'BATCH-2024-018'],
      ['MED019', 'Vitamin B Complex', 'Vitamin B Complex', 'Tablet', 'Bernofarm', 'Suplemen vitamin B', '1 tablet', 'Tablet', 210, 50, 5200, '2026-10-31', 'BATCH-2024-019'],
      ['MED020', 'Cefixime 100mg', 'Cefixime', 'Kapsul', 'Indofarma', 'Antibiotik spektrum luas', '100mg', 'Kapsul', 95, 20, 12800, '2026-11-30', 'BATCH-2024-020'],
      ['MED021', 'Dexamethasone 0.5mg', 'Dexamethasone', 'Tablet', 'Tempo Scan', 'Obat antiinflamasi', '0.5mg', 'Tablet', 125, 25, 4800, '2026-12-31', 'BATCH-2024-021'],
      ['MED022', 'Guaifenesin Sirup', 'Guaifenesin', 'Sirup', 'Konimex', 'Obat batuk berdahak', '100ml', 'Botol', 135, 25, 8900, '2026-03-31', 'BATCH-2024-022'],
      ['MED023', 'Loperamide 2mg', 'Loperamide', 'Tablet', 'Kimia Farma', 'Obat diare', '2mg', 'Tablet', 180, 40, 3600, '2026-04-30', 'BATCH-2024-023'],
      ['MED024', 'Asam Mefenamat 500mg', 'Mefenamic Acid', 'Tablet', 'Dexa Medica', 'Pereda nyeri', '500mg', 'Tablet', 155, 30, 6900, '2026-05-31', 'BATCH-2024-024'],
      ['MED025', 'Salbutamol 2mg', 'Salbutamol', 'Tablet', 'Kalbe Farma', 'Obat asma', '2mg', 'Tablet', 100, 20, 7600, '2026-06-30', 'BATCH-2024-025'],
      ['MED026', 'Omeprazole 10mg', 'Omeprazole', 'Kapsul', 'Sanbe Farma', 'Obat asam lambung', '10mg', 'Kapsul', 145, 30, 8400, '2026-07-31', 'BATCH-2024-026'],
      ['MED027', 'Multivitamin Anak', 'Multivitamin', 'Sirup', 'Bernofarm', 'Suplemen untuk anak', '60ml', 'Botol', 170, 35, 11200, '2026-08-31', 'BATCH-2024-027'],
      ['MED028', 'Amlodipine 10mg', 'Amlodipine', 'Tablet', 'Indofarma', 'Obat hipertensi', '10mg', 'Tablet', 115, 25, 6100, '2026-09-30', 'BATCH-2024-028'],
      ['MED029', 'Metformin XR 500mg', 'Metformin', 'Tablet', 'Kimia Farma', 'Obat diabetes', '500mg', 'Tablet', 130, 30, 7300, '2026-10-31', 'BATCH-2024-029'],
      ['MED030', 'Clindamycin 300mg', 'Clindamycin', 'Kapsul', 'Dexa Medica', 'Antibiotik untuk infeksi kulit', '300mg', 'Kapsul', 85, 15, 14900, '2026-11-30', 'BATCH-2024-030'],
      ['MED031', 'Povidone Iodine', 'Povidone Iodine', 'Cair', 'Konimex', 'Antiseptik luka', '100ml', 'Botol', 190, 40, 9200, '2026-12-31', 'BATCH-2024-031'],
      ['MED032', 'Albendazole 400mg', 'Albendazole', 'Tablet', 'Tempo Scan', 'Obat cacing', '400mg', 'Tablet', 105, 20, 6800, '2026-03-31', 'BATCH-2024-032'],
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

      const medicinesForPharmacy = [
        ...baseMedicines.slice(0, plan.count),
        ...additionalMedicineTemplates,
      ];

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
          `INSERT IGNORE INTO medicines
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
