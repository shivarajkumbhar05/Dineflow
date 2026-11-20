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

// Generate a bill from all un-billed, non-cancelled orders of a table
router.post('/table/:tableId', authorize('owner', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  const table = await Table.findOne({ _id: req.params.tableId, restaurant: req.tenantId });
  if (!table) throw new ApiError(404, 'Table not found');
  const existing = await Bill.findOne({ restaurant: req.tenantId, table: table._id, status: 'unpaid' });
  if (existing) return res.json(existing);
  const bill = await createTableBill({ restaurantId: req.tenantId, table, discount: req.body.discount });
  res.status(201).json(bill);
}));

// Counter payment (cash / card / upi)
router.post('/:id/pay-offline', authorize('owner', 'manager', 'cashier'), asyncHandler(async (req, res) => {
  if (!['cash', 'card', 'upi'].includes(req.body.method)) throw new ApiError(400, 'Invalid payment method');
  const bill = await Bill.findOne({ _id: req.params.id, restaurant: req.tenantId });
  if (!bill) throw new ApiError(404, 'Bill not found');
  res.json(await markBillPaid(bill, { method: req.body.method }));
}));
module.exports = router;
