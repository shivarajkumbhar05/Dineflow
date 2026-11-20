const env = require('../config/env');
const log = (level, msg, meta) => {
  const line = { time: new Date().toISOString(), level, msg, ...(meta ? { meta } : {}) };
  const out = env.isProd ? JSON.stringify(line) : `[${line.level}] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;
  (level === 'error' ? console.error : console.log)(out);
};
module.exports = {
  info: (m, x) => log('info', m, x),
  warn: (m, x) => log('warn', m, x),
  error: (m, x) => log('error', m, x),
};
