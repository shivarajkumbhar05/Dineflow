const router = require('express').Router();
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Restaurant, User } = require('../models');
const { sign } = require('../utils/jwt');
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const mongoose = require('mongoose');

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const emailOk = (e) => typeof e === 'string' && /^\S+@\S+\.\S+$/.test(e);
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, restaurant: u.restaurant });
const staffRoles = ['manager', 'waiter', 'kitchen', 'cashier'];

async function findManagedStaff(req, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(404, 'Staff member not found');
  const staff = await User.findOne({ _id: id, restaurant: req.tenantId });
  if (!staff || staff.role === 'owner') throw new ApiError(404, 'Staff member not found');
  if (req.user.role === 'manager' && staff.role === 'manager') throw new ApiError(403, 'Only the owner can manage managers');
  return staff;
}

// Register a new restaurant + its owner account
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const { restaurantName, name, email, password } = req.body;
  if (!restaurantName || !name || !emailOk(email) || typeof password !== 'string' || password.length < 8)
    throw new ApiError(400, 'restaurantName, name, valid email and password (min 8 chars) are required');
  if (await User.exists({ email: email.toLowerCase() })) throw new ApiError(409, 'Email already registered');

  let slug = slugify(restaurantName) || 'restaurant';
  if (await Restaurant.exists({ slug })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const restaurant = await Restaurant.create({ name: restaurantName, slug });
  const user = await User.create({
    restaurant: restaurant._id, name, email, role: 'owner', passwordHash: await bcrypt.hash(password, 12),
  });
  res.status(201).json({ token: sign(user), user: publicUser(user), restaurant: { id: restaurant._id, name: restaurant.name, slug } });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!emailOk(email) || typeof password !== 'string') throw new ApiError(400, 'Email and password required');
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new ApiError(401, 'Invalid email or password');
  res.json({ token: sign(user), user: publicUser(user) });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.tenantId);
  res.json({ user: publicUser(req.user), restaurant });
}));

// Owner/manager creates staff accounts in their own restaurant
router.post('/staff', authenticate, authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!staffRoles.includes(role)) throw new ApiError(400, 'Invalid role');
  if (role === 'manager' && req.user.role !== 'owner') throw new ApiError(403, 'Only the owner can create managers');
  if (!name || !emailOk(email) || typeof password !== 'string' || password.length < 8) throw new ApiError(400, 'Invalid staff details');
  const user = await User.create({ restaurant: req.tenantId, name, email, role, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json(publicUser(user));
}));

router.get('/staff', authenticate, authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  res.json(await User.find({ restaurant: req.tenantId }).select('name email role isActive'));
}));

router.patch('/staff/:id', authenticate, authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const staff = await findManagedStaff(req, req.params.id);
  const { name, email, password, role, isActive } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) throw new ApiError(400, 'Name must be 1-80 characters');
    staff.name = name.trim();
  }
  if (email !== undefined) {
    if (!emailOk(email)) throw new ApiError(400, 'Invalid email');
    const normalizedEmail = email.toLowerCase();
    if (await User.exists({ email: normalizedEmail, _id: { $ne: staff._id } })) throw new ApiError(409, 'Email already registered');
    staff.email = normalizedEmail;
  }
  if (role !== undefined) {
    if (!staffRoles.includes(role)) throw new ApiError(400, 'Invalid role');
    if (role === 'manager' && req.user.role !== 'owner') throw new ApiError(403, 'Only the owner can assign managers');
    staff.role = role;
  }
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
    staff.passwordHash = await bcrypt.hash(password, 12);
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') throw new ApiError(400, 'isActive must be a boolean');
    if (!isActive && String(staff._id) === String(req.user._id)) throw new ApiError(400, 'You cannot deactivate your own account');
    staff.isActive = isActive;
  }
  await staff.save();
  res.json({ ...publicUser(staff), isActive: staff.isActive });
}));

router.delete('/staff/:id', authenticate, authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const staff = await findManagedStaff(req, req.params.id);
  if (String(staff._id) === String(req.user._id)) throw new ApiError(400, 'You cannot deactivate your own account');
  staff.isActive = false;
  await staff.save();
  res.json({ ok: true });
}));

module.exports = router;
