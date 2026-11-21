// Customer-facing QR endpoints (no login). Every request is scoped to the restaurant slug,
// and the table must be proven with its secret qrToken.
const router = require('express').Router({ mergeParams: true });
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const publicTenant = require('../middleware/publicTenant');
const { publicOrderLimiter } = require('../middleware/rateLimit');
const { MenuCategory, MenuItem, Table, Order, WaiterCall, Bill } = require('../models');
const { emitToRestaurant } = require('../sockets');
const { createOrder } = require('../services/razorpay');
const { createTableBill } = require('../services/billing');
const env = require('../config/env');
const mongoose = require('mongoose');

router.use('/:slug', publicTenant);

const findTable = async (req, token) => {
  const table = typeof token === 'string' && (await Table.findOne({ restaurant: req.tenantId, qrToken: token }));
  if (!table) throw new ApiError(400, 'Invalid table QR code');
  return table;
};

router.get('/:slug/menu', asyncHandler(async (req, res) => {
  const [categories, items] = await Promise.all([
    MenuCategory.find({ restaurant: req.tenantId }).sort('sortOrder name'),
    MenuItem.find({ restaurant: req.tenantId, isAvailable: true }).sort('name'),
  ]);
  const r = req.restaurant;
  res.json({ restaurant: { name: r.name, slug: r.slug, logo: r.logo, banner: r.banner, currency: r.currency, taxPercent: r.taxPercent }, categories, items });
}));

router.post('/:slug/orders', publicOrderLimiter, asyncHandler(async (req, res) => {
  const { tableToken, items, customerName, customerPhone } = req.body;
  const table = await findTable(req, tableToken);
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw new ApiError(400, 'Order must contain 1-50 items');

  const ids = items.map((i) => i.menuItem);
  const menu = await MenuItem.find({ _id: { $in: ids }, restaurant: req.tenantId, isAvailable: true });
  const byId = new Map(menu.map((m) => [String(m._id), m]));

  // Prices ALWAYS come from the database, never from the client.
  const lines = items.map((i) => {
    const m = byId.get(String(i.menuItem));
    const qty = Number(i.qty);
    if (!m) throw new ApiError(400, 'An item is unavailable');
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new ApiError(400, 'Invalid quantity');
    return { menuItem: m._id, name: m.name, price: m.price, qty, notes: String(i.notes || '').slice(0, 200) };
  });
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const order = await Order.create({
    restaurant: req.tenantId, table: table._id, tableNumber: table.number, items: lines, subtotal,
    customerName: String(customerName || '').slice(0, 80), customerPhone: String(customerPhone || '').slice(0, 20),
    trackingCode: crypto.randomBytes(10).toString('hex'),
  });
  if (table.status === 'available') {
    table.status = 'occupied';
    await table.save();
    emitToRestaurant(req.tenantId, 'table:updated', { tableId: table._id, status: 'occupied' });
  }
  await createTableBill({ restaurantId: req.tenantId, table });
  emitToRestaurant(req.tenantId, 'order:new', order); // kitchen + waiter dashboards
  res.status(201).json({ orderId: order._id, trackingCode: order.trackingCode, status: order.status, subtotal });
}));

router.get('/:slug/orders/:trackingCode', asyncHandler(async (req, res) => {
  const order = await Order.findOne({ restaurant: req.tenantId, trackingCode: req.params.trackingCode }).select('status items subtotal tableNumber createdAt');
  if (!order) throw new ApiError(404, 'Order not found');
  res.json({ ...order.toObject(), currency: req.restaurant.currency, restaurantName: req.restaurant.name });
}));

router.post('/:slug/waiter-call', publicOrderLimiter, asyncHandler(async (req, res) => {
  const table = await findTable(req, req.body.tableToken);
  const reason = ['assistance', 'water', 'bill', 'other'].includes(req.body.reason) ? req.body.reason : 'assistance';
  if (reason === 'bill') await createTableBill({ restaurantId: req.tenantId, table });
  const call = await WaiterCall.create({ restaurant: req.tenantId, table: table._id, tableNumber: table.number, reason });
  emitToRestaurant(req.tenantId, 'waiter:call', call);
  res.status(201).json({ ok: true, callId: call._id });
}));

router.post('/:slug/bill/view', publicOrderLimiter, asyncHandler(async (req, res) => {
  const table = await findTable(req, req.body.tableToken);
  const [unpaidBill, unbilledOrder] = await Promise.all([
    Bill.findOne({ restaurant: req.tenantId, table: table._id, status: 'unpaid' }).sort('createdAt'),
    Order.exists({ restaurant: req.tenantId, table: table._id, billed: false, status: { $ne: 'cancelled' } }),
  ]);
  const bill = unpaidBill || unbilledOrder
    ? await createTableBill({ restaurantId: req.tenantId, table })
    : await Bill.findOne({ restaurant: req.tenantId, table: table._id, status: 'paid' }).sort('-paidAt');
  if (!bill) throw new ApiError(404, 'No bill is available for this table');
  res.json({
    _id: String(bill._id),
    tableNumber: bill.tableNumber,
    items: bill.items,
    subtotal: bill.subtotal,
    discount: bill.discount,
    taxPercent: bill.taxPercent,
    tax: bill.tax,
    tip: bill.tip || 0,
    paymentStarted: Boolean(bill.razorpayOrderId),
    total: bill.total,
    status: bill.status,
    createdAt: bill.createdAt,
    currency: bill.currency || req.restaurant.currency,
  });
}));

// Customer pays their table's open bill with Razorpay
router.post('/:slug/bill/pay', publicOrderLimiter, asyncHandler(async (req, res) => {
  const table = await findTable(req, req.body.tableToken);
  let bill;
  if (req.body.billId) {
    if (!mongoose.isValidObjectId(req.body.billId)) throw new ApiError(400, 'Invalid bill');
    bill = await Bill.findOne({
      _id: req.body.billId, restaurant: req.tenantId, table: table._id, status: 'unpaid',
    });
    if (!bill) throw new ApiError(404, 'Open bill not found for this table');
  } else {
    bill = await createTableBill({ restaurantId: req.tenantId, table });
  }
  const tip = Math.round(Number(req.body.tip || 0) * 100) / 100;
  if (!Number.isFinite(tip) || tip < 0 || tip > bill.total) {
    throw new ApiError(400, 'Tip must be between 0 and the bill total');
  }
  if (bill.razorpayOrderId && Number(bill.tip || 0) !== tip) {
    throw new ApiError(409, 'Payment has already started with a different tip');
  }
  if (!bill.razorpayOrderId) {
    bill.tip = tip;
    const rzp = await createOrder(bill, req.tenantId);
    bill.razorpayOrderId = rzp.id;
    await bill.save();
  }
  res.json({
    keyId: env.razorpay.keyId,
    razorpayOrderId: bill.razorpayOrderId,
    amount: Math.round((bill.total + (bill.tip || 0)) * 100),
    currency: 'INR',
    billId: bill._id,
    tip: bill.tip || 0,
  });
}));

module.exports = router;
