const router = require('express').Router();
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { Table, Restaurant } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { emitToRestaurant } = require('../sockets');

router.use(authenticate);
const qrLink = (slug, token) => `${env.FRONTEND_URL.replace(/\/+$/, '')}/r/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;

router.get('/', authorize('owner', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  const [tables, restaurant] = await Promise.all([Table.find({ restaurant: req.tenantId }).sort('number'), Restaurant.findById(req.tenantId).select('slug')]);
  res.json(tables.map((t) => ({ ...t.toObject(), qrUrl: qrLink(restaurant.slug, t.qrToken) })));
}));

router.post('/', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const { number, seats } = req.body;
  const tableNumber = String(number || '').trim();
  const capacity = Number(seats);
  if (!tableNumber) throw new ApiError(400, 'Table number required');
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new ApiError(400, 'Seats must be a positive whole number');
  const table = await Table.create({ restaurant: req.tenantId, number: tableNumber, seats: capacity, qrToken: crypto.randomBytes(12).toString('hex') });
  const restaurant = await Restaurant.findById(req.tenantId).select('slug');
  res.status(201).json({ ...table.toObject(), qrUrl: qrLink(restaurant.slug, table.qrToken) });
}));

router.patch('/:id', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const number = String(req.body.number || '').trim();
  const seats = Number(req.body.seats);
  if (!number) throw new ApiError(400, 'Table number required');
  if (!Number.isSafeInteger(seats) || seats < 1) throw new ApiError(400, 'Seats must be a positive whole number');
  const table = await Table.findOneAndUpdate(
    { _id: req.params.id, restaurant: req.tenantId },
    { number, seats },
    { new: true, runValidators: true }
  );
  if (!table) throw new ApiError(404, 'Table not found');
  emitToRestaurant(req.tenantId, 'table:updated', { tableId: table._id, status: table.status, number: table.number, seats: table.seats });
  res.json(table);
}));

router.patch('/:id/status', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
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
