const router = require('express').Router();
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { Table, Restaurant } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { emitToRestaurant } = require('../sockets');

router.use(authenticate);
const qrLink = (slug, token) => `${env.FRONTEND_URL}/r/${slug}?t=${token}`;

router.get('/', asyncHandler(async (req, res) => {
  const [tables, restaurant] = await Promise.all([Table.find({ restaurant: req.tenantId }).sort('number'), Restaurant.findById(req.tenantId).select('slug')]);
  res.json(tables.map((t) => ({ ...t.toObject(), qrUrl: qrLink(restaurant.slug, t.qrToken) })));
}));

router.post('/', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const { number, seats } = req.body;
  if (!number) throw new ApiError(400, 'Table number required');
  const table = await Table.create({ restaurant: req.tenantId, number: String(number), seats, qrToken: crypto.randomBytes(12).toString('hex') });
  const restaurant = await Restaurant.findById(req.tenantId).select('slug');
  res.status(201).json({ ...table.toObject(), qrUrl: qrLink(restaurant.slug, table.qrToken) });
}));

router.patch('/:id/status', authorize('owner', 'manager', 'waiter', 'cashier'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['available', 'occupied', 'reserved', 'billing'].includes(status)) throw new ApiError(400, 'Invalid status');
  const table = await Table.findOneAndUpdate({ _id: req.params.id, restaurant: req.tenantId }, { status }, { new: true });
  if (!table) throw new ApiError(404, 'Table not found');
  emitToRestaurant(req.tenantId, 'table:updated', { tableId: table._id, status });
  res.json(table);
}));

router.delete('/:id', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  await Table.deleteOne({ _id: req.params.id, restaurant: req.tenantId });
  res.json({ ok: true });
}));
module.exports = router;
