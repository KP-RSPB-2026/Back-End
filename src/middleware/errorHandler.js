const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Invalid resource id format
  if (err.name === 'CastError') {
    message = 'Resource tidak ditemukan';
    statusCode = 404;
  }

  // Duplicate key
  if (err.code === 'ER_DUP_ENTRY' || err.code === 11000) {
    message = 'Data duplikat ditemukan';
    statusCode = 400;
  }

  // Validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
