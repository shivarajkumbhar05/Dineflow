const router = require('express').Router();
const { dbStatus } = require('../config/db');
router.get('/', (req, res) => {
  const db = dbStatus();
  res.status(db === 'connected' ? 200 : 503).json({ status: db === 'connected' ? 'ok' : 'degraded', db, uptime: process.uptime(), time: new Date().toISOString() });
});
module.exports = router;
