require('dotenv').config();
const mysql = require('mysql2/promise');

const sanitizeIdentifier = (value, label) => {
  if (!value) {
    return null;
  }

  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`${label} tidak valid: ${value}`);
  }

  return value;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const legacyConfig = {
  host: process.env.LEGACY_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.LEGACY_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.LEGACY_DB_USER || process.env.DB_USER || 'root',
  password: process.env.LEGACY_DB_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.LEGACY_DB_NAME,
  dateStrings: true,
};

const targetConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'apotik_db',
  dateStrings: true,
};

const tableName = sanitizeIdentifier(process.env.LEGACY_MEDICINES_TABLE, 'LEGACY_MEDICINES_TABLE');

const columns = {
  id: sanitizeIdentifier(process.env.LEGACY_MED_COL_ID || 'id', 'LEGACY_MED_COL_ID'),
  code: sanitizeIdentifier(process.env.LEGACY_MED_COL_CODE || 'kode_obat', 'LEGACY_MED_COL_CODE'),
  name: sanitizeIdentifier(process.env.LEGACY_MED_COL_NAME || 'nama_obat', 'LEGACY_MED_COL_NAME'),
  genericName: sanitizeIdentifier(
    process.env.LEGACY_MED_COL_GENERIC_NAME || 'nama_generik',
    'LEGACY_MED_COL_GENERIC_NAME'
  ),
  category: sanitizeIdentifier(process.env.LEGACY_MED_COL_CATEGORY || 'kategori', 'LEGACY_MED_COL_CATEGORY'),
  unit: sanitizeIdentifier(process.env.LEGACY_MED_COL_UNIT || 'satuan', 'LEGACY_MED_COL_UNIT'),
  stock: sanitizeIdentifier(process.env.LEGACY_MED_COL_STOCK || 'jumlah_aktual', 'LEGACY_MED_COL_STOCK'),
  minStock: sanitizeIdentifier(
    process.env.LEGACY_MED_COL_MIN_STOCK || 'stok_minimum',
    'LEGACY_MED_COL_MIN_STOCK'
  ),
  price: sanitizeIdentifier(process.env.LEGACY_MED_COL_PRICE || 'harga_jual', 'LEGACY_MED_COL_PRICE'),
  expiryDate: sanitizeIdentifier(
    process.env.LEGACY_MED_COL_EXPIRY_DATE || 'exp_date',
    'LEGACY_MED_COL_EXPIRY_DATE'
  ),
  batchNumber: sanitizeIdentifier(
    process.env.LEGACY_MED_COL_BATCH_NUMBER || 'batch_number',
    'LEGACY_MED_COL_BATCH_NUMBER'
  ),
  manufacturer: sanitizeIdentifier(
    process.env.LEGACY_MED_COL_MANUFACTURER || 'pabrik',
    'LEGACY_MED_COL_MANUFACTURER'
  ),
  description: sanitizeIdentifier(
    process.env.LEGACY_MED_COL_DESCRIPTION || 'keterangan',
    'LEGACY_MED_COL_DESCRIPTION'
  ),
  isActive: sanitizeIdentifier(
    process.env.LEGACY_MED_COL_IS_ACTIVE || 'aktif',
    'LEGACY_MED_COL_IS_ACTIVE'
  ),
};

const buildSelectQuery = () => {
  if (!tableName) {
    throw new Error('LEGACY_MEDICINES_TABLE wajib diisi di .env');
  }

  return `
    SELECT
      ${columns.id} AS legacyId,
      ${columns.code} AS legacyCode,
      ${columns.name} AS legacyName,
      ${columns.genericName} AS legacyGenericName,
      ${columns.category} AS legacyCategory,
      ${columns.unit} AS legacyUnit,
      ${columns.stock} AS legacyStock,
      ${columns.minStock} AS legacyMinStock,
      ${columns.price} AS legacyPrice,
      ${columns.expiryDate} AS legacyExpiryDate,
      ${columns.batchNumber} AS legacyBatchNumber,
      ${columns.manufacturer} AS legacyManufacturer,
      ${columns.description} AS legacyDescription,
      ${columns.isActive} AS legacyIsActive
    FROM ${tableName}
  `;
};

const run = async () => {
  if (!legacyConfig.database) {
    throw new Error('LEGACY_DB_NAME wajib diisi di .env');
  }

  const legacyConn = await mysql.createConnection(legacyConfig);
  const targetConn = await mysql.createConnection(targetConfig);

  try {
    const selectQuery = buildSelectQuery();
    const [rows] = await legacyConn.execute(selectQuery);

    if (!rows.length) {
      console.log('Tidak ada data legacy untuk dimigrasikan.');
      return;
    }

    await targetConn.beginTransaction();

    let migratedCount = 0;

    for (const row of rows) {
      const code = row.legacyCode
        ? String(row.legacyCode).trim()
        : `LEGACY-${String(row.legacyId || migratedCount + 1).padStart(6, '0')}`;
      const name = row.legacyName ? String(row.legacyName).trim() : null;

      if (!name) {
        continue;
      }

      const category = row.legacyCategory ? String(row.legacyCategory).trim() : 'Lainnya';
      const unit = row.legacyUnit ? String(row.legacyUnit).trim() : 'Unit';
      const stock = Math.max(0, toNumber(row.legacyStock, 0));
      const minStock = Math.max(0, toNumber(row.legacyMinStock, 10));
      const price = Math.max(0, toNumber(row.legacyPrice, 0));
      const isActive =
        row.legacyIsActive === undefined || row.legacyIsActive === null
          ? 1
          : toNumber(row.legacyIsActive, 1) ? 1 : 0;

      const expiryDate = row.legacyExpiryDate || null;

      await targetConn.execute(
        `INSERT INTO medicines
          (code, name, generic_name, category, manufacturer, description, unit, stock, min_stock, price, expiry_date, batch_number, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           generic_name = VALUES(generic_name),
           category = VALUES(category),
           manufacturer = VALUES(manufacturer),
           description = VALUES(description),
           unit = VALUES(unit),
           stock = VALUES(stock),
           min_stock = VALUES(min_stock),
           price = VALUES(price),
           expiry_date = VALUES(expiry_date),
           batch_number = VALUES(batch_number),
           is_active = VALUES(is_active)`,
        [
          code,
          name,
          row.legacyGenericName || null,
          category,
          row.legacyManufacturer || null,
          row.legacyDescription || null,
          unit,
          stock,
          minStock,
          price,
          expiryDate,
          row.legacyBatchNumber || null,
          isActive,
        ]
      );

      migratedCount += 1;
    }

    await targetConn.commit();
    console.log(`Migrasi master obat selesai. Total upsert: ${migratedCount}`);
  } catch (error) {
    await targetConn.rollback();
    throw error;
  } finally {
    await legacyConn.end();
    await targetConn.end();
  }
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Gagal migrasi data legacy obat:', error.message);
    process.exit(1);
  });
