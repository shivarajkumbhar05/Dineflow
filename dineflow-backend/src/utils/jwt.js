const jwt = require('jsonwebtoken');
const env = require('../config/env');
const sign = (user, sessionId) =>
  jwt.sign({
    sub: String(user._id),
    rid: String(user.restaurant),
    role: user.role,
    ...(sessionId ? { sid: sessionId } : {}),
  }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
const verify = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
module.exports = { sign, verify };
