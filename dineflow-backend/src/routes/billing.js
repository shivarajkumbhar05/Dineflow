const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Order, Table, Bill, Restaurant } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { emitToRestaurant } = require('../sockets');
const { markBillPaid } = require('../services/billing');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const filter = { restaurant: req.tenantId };
  if (req.query.status) filter.status = req.query.status;
  res.json(await Bill.find(filter).sort('-createdAt').limit(200));
}));

// Generate a bill from all un-billed, non-cancelled orders of a table
router.post('/table/:tableId', authorize('owner', 'manager', 'waiter', 'cashier'), asyncHandler(async (req, res) => {
  const table = await Table.findOne({ _id: req.params.tableId, restaurant: req.tenantId });
  if (!table) throw new ApiError(404, 'Table not found');
  const existing = await Bill.findOne({ restaurant: req.tenantId, table: table._id, status: 'unpaid' });
  if (existing) return res.json(existing);

  const orders = await Order.find({ restaurant: req.tenantId, table: table._id, billed: false, status: { $ne: 'cancelled' } });
  if (!orders.length) throw new ApiError(400, 'No orders to bill for this table');

  const restaurant = await Restaurant.findById(req.tenantId);
  const merged = new Map();
  orders.forEach((o) => o.items.forEach((i) => {
    const k = `${i.name}|${i.price}`;
    merged.set(k, { name: i.name, price: i.price, qty: (merged.get(k)?.qty || 0) + i.qty });
  }));
  const subtotal = orders.reduce((s, o) => s + o.subtotal, 0);
  const discount = Math.min(Math.max(Number(req.body.discount) || 0, 0), subtotal);
  const tax = Math.round(((subtotal - discount) * restaurant.taxPercent) / 100 * 100) / 100;
  const total = Math.round((subtotal - discount + tax) * 100) / 100;

  const bill = await Bill.create({
    restaurant: req.tenantId, table: table._id, tableNumber: table.number, orders: orders.map((o) => o._id),
    items: [...merged.values()], subtotal, taxPercent: restaurant.taxPercent, tax, discount, total,
  });
  await Order.updateMany({ _id: { $in: bill.orders }, restaurant: req.tenantId }, { billed: true, bill: bill._id });
  table.status = 'billing';
  await table.save();
  emitToRestaurant(req.tenantId, 'billing:updated', bill);
  emitToRestaurant(req.tenantId, 'table:updated', { tableId: table._id, status: 'billing' });
  res.status(201).json(bill);
}));

// Counter payment (cash / card / upi)
router.post('/:id/pay-offline', authorize('owner', 'manager', 'cashier', 'waiter'), asyncHandler(async (req, res) => {
  if (!['cash', 'card', 'upi'].includes(req.body.method)) throw new ApiError(400, 'Invalid payment method');
  const bill = await Bill.findOne({ _id: req.params.id, restaurant: req.tenantId });
  if (!bill) throw new ApiError(404, 'Bill not found');
  res.json(await markBillPaid(bill, { method: req.body.method }));
}));
module.exports = router;
