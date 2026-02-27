const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const elapsed = Date.now() - startTime;
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} - ${elapsed}ms`
    );
  });

  next();
};

module.exports = requestLogger;