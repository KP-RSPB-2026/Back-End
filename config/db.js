const { pool } = require('./mysql');

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    console.log(
      `MySQL Connected: ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}`
    );
    connection.release();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
