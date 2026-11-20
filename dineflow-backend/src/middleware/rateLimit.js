const rateLimit = require('express-rate-limit');
const make = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } });
module.exports = {
  globalLimiter: make(15 * 60 * 1000, 600, 'Too many requests, please try again later'),
  authLimiter: make(15 * 60 * 1000, 20, 'Too many login attempts, please try again later'),
  publicOrderLimiter: make(60 * 1000, 20, 'Too many requests from this device'),
  uploadLimiter: make(60 * 1000, 20, 'Too many uploads, slow down'),
};
