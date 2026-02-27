const getCurrentPeriod = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
};

const generateDocumentNumber = async (conn, { sequenceKey, prefix, pad = 5 }) => {
  const period = getCurrentPeriod();

  await conn.execute(
    `INSERT INTO document_sequences (sequence_key, period, current_value)
     VALUES (?, ?, LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE current_value = LAST_INSERT_ID(current_value + 1)`,
    [sequenceKey, period]
  );

  const [rows] = await conn.execute('SELECT LAST_INSERT_ID() AS currentValue');
  const currentValue = Number(rows[0]?.currentValue || 1);

  return `${prefix}${period}${String(currentValue).padStart(pad, '0')}`;
};

module.exports = {
  generateDocumentNumber,
};