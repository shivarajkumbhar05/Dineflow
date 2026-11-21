const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Table, Bill } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { createTableBill, markBillPaid } = require('../services/billing');

router.use(authenticate);

router.get('/', authorize('owner', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  const filter = { restaurant: req.tenantId };
  if (req.query.status) filter.status = req.query.status;
  res.json(await Bill.find(filter).sort('-createdAt').limit(200));
}));

router.get('/summary', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const { period, from: fromValue, to: toValue, timeZone } = req.query;
  if (!['day', 'week', 'year'].includes(period) || typeof fromValue !== 'string' || typeof toValue !== 'string' || typeof timeZone !== 'string') {
    throw new ApiError(400, 'A valid reporting period, date range and time zone are required');
  }
  const from = new Date(fromValue);
  const to = new Date(toValue);
  const maxRange = period === 'day' ? 25 * 60 * 60 * 1000 : period === 'week' ? 8 * 24 * 60 * 60 * 1000 : 367 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to || to - from > maxRange) {
    throw new ApiError(400, 'The reporting date range is invalid');
  }
  try { new Intl.DateTimeFormat('en', { timeZone }); }
  catch { throw new ApiError(400, 'The reporting time zone is invalid'); }

  const format = period === 'day' ? '%Y-%m-%d-%H' : period === 'week' ? '%Y-%m-%d' : '%Y-%m';
  const buckets = await Bill.aggregate([
    { $match: { restaurant: req.tenantId, status: 'paid', paidAt: { $gte: from, $lt: to } } },
    { $group: {
      _id: { $dateToString: { format, date: '$paidAt', timezone: timeZone } },
      total: { $sum: '$total' },
      count: { $sum: 1 },
    } },
    { $sort: { _id: 1 } },
  ]);
  res.json({
    period,
    total: buckets.reduce((sum, bucket) => sum + bucket.total, 0),
    count: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
    buckets: buckets.map(({ _id, total, count }) => ({ key: _id, total, count })),
  });
}));

// Generate a bill from all un-billed, non-cancelled orders of a table
router.post('/table/:tableId', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const table = await Table.findOne({ _id: req.params.tableId, restaurant: req.tenantId });
  if (!table) throw new ApiError(404, 'Table not found');
  const bill = await createTableBill({ restaurantId: req.tenantId, table, discount: req.body.discount });
  res.json(bill);
}));

// Counter payment (cash / card / upi)
router.post('/:id/pay-offline', authorize('owner', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  if (!['cash', 'card', 'upi'].includes(req.body.method)) throw new ApiError(400, 'Invalid payment method');
  if (req.user.role === 'cashier' && req.body.method !== 'cash') throw new ApiError(403, 'Cashiers can only confirm cash payments');
  const bill = await Bill.findOne({ _id: req.params.id, restaurant: req.tenantId });
  if (!bill) throw new ApiError(404, 'Bill not found');
  const result = await markBillPaid(bill, { method: req.body.method });
  res.json({ ...result.bill.toObject(), tableStatus: result.tableStatus });
}));
module.exports = router;
