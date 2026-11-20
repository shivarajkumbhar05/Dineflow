const logger = require('../utils/logger');
const env = require('../config/env');

const notFound = (req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  if (err.name === 'CastError') { status = 400; message = 'Invalid id format'; }
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join(', '); }
  if (err.code === 11000) { status = 409; message = 'Duplicate value: ' + Object.keys(err.keyPattern || {}).join(', '); }
  if (err.name === 'MulterError') { status = 400; }
  if (status >= 500) {
    logger.error(err.message, { path: req.originalUrl, stack: env.isProd ? undefined : err.stack });
    if (env.isProd) message = 'Internal server error';
  }
  res.status(status).json({ error: message });
};
module.exports = { notFound, errorHandler };
