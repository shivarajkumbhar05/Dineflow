const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Order, Table } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { emitToRestaurant, emitToOrder } = require('../sockets');
const { removeCancelledOrderFromBill } = require('../services/billing');

router.use(authenticate);

router.get('/', authorize('owner', 'manager', 'kitchen'), asyncHandler(async (req, res) => {
  const filter = { restaurant: req.tenantId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.table) filter.table = req.query.table;
  res.json(await Order.find(filter).sort('-createdAt').limit(200));
}));

// New orders go straight from the queue to preparation; accepted remains for existing orders.
const FLOW = { placed: ['preparing', 'cancelled'], accepted: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['served'], served: [], cancelled: [] };
router.patch('/:id/status', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findOne({ _id: req.params.id, restaurant: req.tenantId });
  if (!order) throw new ApiError(404, 'Order not found');
  if (!FLOW[order.status].includes(status)) throw new ApiError(400, `Cannot change status from ${order.status} to ${status}`);
  if (status === 'cancelled') await removeCancelledOrderFromBill(order);
  order.status = status;
  await order.save();
  const payload = { orderId: order._id, tableId: order.table, tableNumber: order.tableNumber, status };
  emitToRestaurant(req.tenantId, 'order:status', payload);
  emitToOrder(order.trackingCode, 'order:status', payload);
  if (status === 'ready') emitToRestaurant(req.tenantId, 'kitchen:ready', payload); // waiter pick-up alert
  res.json(order);
}));
module.exports = router;
