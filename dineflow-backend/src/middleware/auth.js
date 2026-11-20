const ApiError = require('../utils/ApiError');
const { verify } = require('../utils/jwt');
const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// Authenticates staff and pins every request to ONE restaurant (tenant).
// Controllers must always filter by req.tenantId - never by an id from the request body.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required');
  let payload;
  try { payload = verify(token); } catch { throw new ApiError(401, 'Invalid or expired token'); }
  const user = await User.findById(payload.sub).select('restaurant role isActive name email');
  if (!user || !user.isActive) throw new ApiError(401, 'Account disabled or not found');
  req.user = user;
  req.tenantId = user.restaurant;
  req.sessionId = payload.sid;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission for this action'));
  next();
};

module.exports = { authenticate, authorize };
