require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./src/app');

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
