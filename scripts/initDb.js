require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

const databaseName = process.env.DB_NAME || 'apotik_db';

const run = async () => {
  const conn = await mysql.createConnection(dbConfig);

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${databaseName}\``);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(190) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('dokter', 'admin_apotik') NOT NULL,
        phone_number VARCHAR(30) DEFAULT NULL,
        specialization VARCHAR(150) DEFAULT NULL,
        license_number VARCHAR(100) DEFAULT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_users_email (email),
        KEY idx_users_role (role),
        KEY idx_users_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS document_sequences (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        sequence_key VARCHAR(100) NOT NULL,
        period CHAR(6) NOT NULL,
        current_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_document_sequence_key_period (sequence_key, period)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(150) NOT NULL,
        date_of_birth DATE NOT NULL,
        gender ENUM('Laki-laki', 'Perempuan') NOT NULL,
        address TEXT DEFAULT NULL,
        phone_number VARCHAR(30) DEFAULT NULL,
        email VARCHAR(190) DEFAULT NULL,
        id_number VARCHAR(100) DEFAULT NULL,
        allergies JSON DEFAULT NULL,
        medical_history TEXT DEFAULT NULL,
        blood_type VARCHAR(5) DEFAULT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by BIGINT UNSIGNED DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_patients_name (name),
        KEY idx_patients_phone (phone_number),
        KEY idx_patients_created_by (created_by),
        KEY idx_patients_is_active (is_active),
        CONSTRAINT fk_patients_created_by
          FOREIGN KEY (created_by) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(80) NOT NULL,
        name VARCHAR(180) NOT NULL,
        generic_name VARCHAR(180) DEFAULT NULL,
        category VARCHAR(100) NOT NULL,
        manufacturer VARCHAR(180) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        dosage VARCHAR(120) DEFAULT NULL,
        unit VARCHAR(50) NOT NULL,
        stock INT UNSIGNED NOT NULL DEFAULT 0,
        min_stock INT UNSIGNED NOT NULL DEFAULT 10,
        price DECIMAL(14,2) NOT NULL,
        expiry_date DATE DEFAULT NULL,
        batch_number VARCHAR(100) DEFAULT NULL,
        side_effects JSON DEFAULT NULL,
        contraindications JSON DEFAULT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_medicines_code (code),
        KEY idx_medicines_name (name),
        KEY idx_medicines_category (category),
        KEY idx_medicines_stock (stock),
        KEY idx_medicines_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        prescription_number VARCHAR(80) NOT NULL,
        patient_id BIGINT UNSIGNED NOT NULL,
        doctor_id BIGINT UNSIGNED NOT NULL,
        diagnosis TEXT DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        total_price DECIMAL(14,2) NOT NULL DEFAULT 0,
        status ENUM('pending', 'disiapkan', 'selesai', 'dibatalkan') NOT NULL DEFAULT 'pending',
        prescription_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_date DATETIME DEFAULT NULL,
        completed_by BIGINT UNSIGNED DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_prescription_number (prescription_number),
        KEY idx_prescriptions_patient (patient_id),
        KEY idx_prescriptions_doctor (doctor_id),
        KEY idx_prescriptions_status (status),
        KEY idx_prescriptions_completed_by (completed_by),
        CONSTRAINT fk_prescriptions_patient
          FOREIGN KEY (patient_id) REFERENCES patients (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_prescriptions_doctor
          FOREIGN KEY (doctor_id) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_prescriptions_completed_by
          FOREIGN KEY (completed_by) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS prescription_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        prescription_id BIGINT UNSIGNED NOT NULL,
        medicine_id BIGINT UNSIGNED NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        dosage_instructions VARCHAR(255) NOT NULL,
        duration VARCHAR(100) DEFAULT NULL,
        price DECIMAL(14,2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_prescription_items_prescription (prescription_id),
        KEY idx_prescription_items_medicine (medicine_id),
        CONSTRAINT fk_prescription_items_prescription
          FOREIGN KEY (prescription_id) REFERENCES prescriptions (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_prescription_items_medicine
          FOREIGN KEY (medicine_id) REFERENCES medicines (id)
          ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS prescription_dispenses (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        prescription_id BIGINT UNSIGNED NOT NULL,
        prescribed_patient_name VARCHAR(150) DEFAULT NULL,
        input_patient_name VARCHAR(150) DEFAULT NULL,
        dispensed_to ENUM('pasien', 'dokter') NOT NULL DEFAULT 'pasien',
        dispensed_by BIGINT UNSIGNED NOT NULL,
        dispensed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_prescription_dispenses_prescription (prescription_id),
        KEY idx_prescription_dispenses_dispensed_by (dispensed_by),
        KEY idx_prescription_dispenses_dispensed_at (dispensed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS medicine_transfers (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        transfer_number VARCHAR(80) NOT NULL,
        from_pharmacy VARCHAR(190) NOT NULL,
        to_pharmacy VARCHAR(190) NOT NULL,
        type ENUM('request', 'receive') NOT NULL,
        status ENUM('pending', 'diproses', 'dikirim', 'diterima', 'ditolak', 'dibatalkan') NOT NULL DEFAULT 'pending',
        request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_date DATETIME DEFAULT NULL,
        requested_by BIGINT UNSIGNED NOT NULL,
        processed_by BIGINT UNSIGNED DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        urgency ENUM('rendah', 'sedang', 'tinggi') NOT NULL DEFAULT 'sedang',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_transfer_number (transfer_number),
        KEY idx_transfers_type (type),
        KEY idx_transfers_status (status),
        KEY idx_transfers_requested_by (requested_by),
        KEY idx_transfers_processed_by (processed_by),
        CONSTRAINT fk_transfers_requested_by
          FOREIGN KEY (requested_by) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_transfers_processed_by
          FOREIGN KEY (processed_by) REFERENCES users (id)
          ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS medicine_transfer_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        transfer_id BIGINT UNSIGNED NOT NULL,
        medicine_id BIGINT UNSIGNED NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        received_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_transfer_items_transfer (transfer_id),
        KEY idx_transfer_items_medicine (medicine_id),
        CONSTRAINT fk_transfer_items_transfer
          FOREIGN KEY (transfer_id) REFERENCES medicine_transfers (id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_transfer_items_medicine
          FOREIGN KEY (medicine_id) REFERENCES medicines (id)
          ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log(`Database initialized successfully: ${databaseName}`);
  } finally {
    await conn.end();
  }
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  });
