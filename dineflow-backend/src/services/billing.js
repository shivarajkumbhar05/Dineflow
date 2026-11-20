const { Bill, Order, Restaurant, Table } = require('../models');
const ApiError = require('../utils/ApiError');
const { emitToRestaurant } = require('../sockets');

async function createTableBill({ restaurantId, table, discount = 0 }) {
  const existing = await Bill.findOne({ restaurant: restaurantId, table: table._id, status: 'unpaid' });
  if (existing) return existing;

  const orders = await Order.find({ restaurant: restaurantId, table: table._id, billed: false, status: { $ne: 'cancelled' } });
  if (!orders.length) throw new ApiError(400, 'No orders to bill for this table');

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new ApiError(404, 'Restaurant not found');
  const merged = new Map();
  orders.forEach((o) => o.items.forEach((i) => {
    const k = `${i.name}|${i.price}`;
    merged.set(k, { name: i.name, price: i.price, qty: (merged.get(k)?.qty || 0) + i.qty });
  }));
  const subtotal = orders.reduce((s, o) => s + o.subtotal, 0);
  const appliedDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const tax = Math.round(((subtotal - appliedDiscount) * restaurant.taxPercent) / 100 * 100) / 100;
  const total = Math.round((subtotal - appliedDiscount + tax) * 100) / 100;

  const bill = await Bill.create({
    restaurant: restaurantId, table: table._id, tableNumber: table.number, orders: orders.map((o) => o._id),
    items: [...merged.values()], subtotal, taxPercent: restaurant.taxPercent, tax, discount: appliedDiscount, total,
  });
  await Order.updateMany({ _id: { $in: bill.orders }, restaurant: restaurantId }, { billed: true, bill: bill._id });
  table.status = 'billing';
  await table.save();
  emitToRestaurant(restaurantId, 'billing:updated', bill);
  emitToRestaurant(restaurantId, 'table:updated', { tableId: table._id, status: 'billing' });
  return bill;
}

async function markBillPaid(bill, { method, paymentId }) {
  if (bill.status === 'paid') return bill; // idempotent (webhook + verify can both arrive)
  bill.status = 'paid';
  bill.paymentMethod = method;
  if (paymentId) bill.razorpayPaymentId = paymentId;
  bill.paidAt = new Date();
  await bill.save();
  await Table.updateOne({ _id: bill.table, restaurant: bill.restaurant }, { status: 'available' });
  emitToRestaurant(bill.restaurant, 'payment:confirmed', { billId: bill._id, tableId: bill.table, total: bill.total, method });
  emitToRestaurant(bill.restaurant, 'table:updated', { tableId: bill.table, status: 'available' });
  emitToRestaurant(bill.restaurant, 'billing:updated', bill);
  return bill;
}

module.exports = { createTableBill, markBillPaid };
