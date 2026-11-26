const { Bill, Order, Restaurant, Table } = require('../models');
const ApiError = require('../utils/ApiError');
const { emitToRestaurant } = require('../sockets');

async function createTableBill({ restaurantId, table, discount }) {
  const [unbilledOrders, unpaidBills] = await Promise.all([
    Order.find({ restaurant: restaurantId, table: table._id, billed: false, status: { $ne: 'cancelled' } }).sort('createdAt'),
    Bill.find({ restaurant: restaurantId, table: table._id, status: 'unpaid' }).sort('createdAt'),
  ]);
  const existing = unpaidBills.find((bill) => !bill.razorpayOrderId);
  if (!unbilledOrders.length && !existing) {
    if (unpaidBills.length) return unpaidBills[0];
    throw new ApiError(400, 'No orders to bill for this table');
  }

  const existingOrders = existing
    ? await Order.find({ _id: { $in: existing.orders }, restaurant: restaurantId, status: { $ne: 'cancelled' } })
    : [];
  const orders = [...existingOrders, ...unbilledOrders];
  if (!orders.length) throw new ApiError(400, 'No orders to bill for this table');

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new ApiError(404, 'Restaurant not found');
  const merged = new Map();
  orders.forEach((o) => o.items.forEach((i) => {
    const k = `${i.name}|${i.price}`;
    merged.set(k, { name: i.name, price: i.price, qty: (merged.get(k)?.qty || 0) + i.qty });
  }));
  const subtotal = orders.reduce((s, o) => s + o.subtotal, 0);
  const requestedDiscount = discount === undefined && existing ? existing.discount : discount;
  const appliedDiscount = Math.min(Math.max(Number(requestedDiscount) || 0, 0), subtotal);
  const tax = Math.round(((subtotal - appliedDiscount) * restaurant.taxPercent) / 100 * 100) / 100;
  const total = Math.round((subtotal - appliedDiscount + tax) * 100) / 100;

  let bill = existing;
  if (bill) {
    bill.orders = orders.map((o) => o._id);
    bill.items = [...merged.values()];
    bill.subtotal = subtotal;
    bill.taxPercent = restaurant.taxPercent;
    bill.tax = tax;
    bill.discount = appliedDiscount;
    bill.total = total;
    if (!bill.currency) bill.currency = restaurant.currency;
    await bill.save();
  } else {
    bill = await Bill.create({
      restaurant: restaurantId, table: table._id, tableNumber: table.number, orders: orders.map((o) => o._id),
      items: [...merged.values()], subtotal, taxPercent: restaurant.taxPercent, tax, discount: appliedDiscount, total,
      currency: restaurant.currency,
    });
  }
  if (unbilledOrders.length) {
    await Order.updateMany(
      { _id: { $in: unbilledOrders.map((o) => o._id) }, restaurant: restaurantId },
      { billed: true, bill: bill._id }
    );
  }
  table.status = 'billing';
  await table.save();
  emitToRestaurant(restaurantId, 'billing:updated', bill);
  emitToRestaurant(restaurantId, 'table:updated', { tableId: table._id, status: 'billing' });
  return bill;
}

async function removeCancelledOrderFromBill(order) {
  if (!order.billed || !order.bill) return;
  const bill = await Bill.findOne({ _id: order.bill, restaurant: order.restaurant });
  if (!bill) throw new ApiError(409, 'The order bill could not be found');
  if (bill.status === 'paid') throw new ApiError(400, 'An order on a paid bill cannot be cancelled');
  if (bill.razorpayOrderId) throw new ApiError(409, 'Online payment has already started for this bill');

  const remainingOrders = await Order.find({
    _id: { $in: bill.orders, $ne: order._id },
    restaurant: order.restaurant,
    status: { $ne: 'cancelled' },
  });
  if (remainingOrders.length) {
    const restaurant = await Restaurant.findById(order.restaurant);
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    const merged = new Map();
    remainingOrders.forEach((o) => o.items.forEach((i) => {
      const key = `${i.name}|${i.price}`;
      merged.set(key, { name: i.name, price: i.price, qty: (merged.get(key)?.qty || 0) + i.qty });
    }));
    const subtotal = remainingOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const discount = Math.min(bill.discount, subtotal);
    const tax = Math.round(((subtotal - discount) * restaurant.taxPercent) / 100 * 100) / 100;
    bill.orders = remainingOrders.map((o) => o._id);
    bill.items = [...merged.values()];
    bill.subtotal = subtotal;
    bill.taxPercent = restaurant.taxPercent;
    bill.discount = discount;
    bill.tax = tax;
    bill.total = Math.round((subtotal - discount + tax) * 100) / 100;
    await bill.save();
  } else {
    await Bill.deleteOne({ _id: bill._id, restaurant: order.restaurant });
  }

  const [otherUnpaidBill, otherActiveOrder] = await Promise.all([
    Bill.exists({ _id: { $ne: bill._id }, restaurant: order.restaurant, table: order.table, status: 'unpaid' }),
    Order.exists({ _id: { $ne: order._id }, restaurant: order.restaurant, table: order.table, status: { $nin: ['cancelled', 'served'] } }),
  ]);
  const tableStatus = otherUnpaidBill || otherActiveOrder ? 'billing' : 'occupied';
  await Table.updateOne({ _id: order.table, restaurant: order.restaurant }, { status: tableStatus });
  order.billed = false;
  order.bill = undefined;
  emitToRestaurant(order.restaurant, 'billing:updated', bill);
  emitToRestaurant(order.restaurant, 'table:updated', { tableId: order.table, status: tableStatus });
}

async function markBillPaid(bill, { method, paymentId }) {
  if (bill.status === 'paid') {
    const table = await Table.findOne({ _id: bill.table, restaurant: bill.restaurant }).select('status');
    return { bill, tableStatus: table?.status || 'available' };
  }
  const payment = { status: 'paid', paymentMethod: method, paidAt: new Date() };
  if (paymentId) payment.razorpayPaymentId = paymentId;
  const paidBill = await Bill.findOneAndUpdate(
    { _id: bill._id, restaurant: bill.restaurant, status: 'unpaid' },
    { $set: payment },
    { new: true, runValidators: true }
  );
  if (!paidBill) {
    const currentBill = await Bill.findOne({ _id: bill._id, restaurant: bill.restaurant });
    if (!currentBill) throw new ApiError(404, 'Bill not found');
    if (currentBill.status !== 'paid') throw new ApiError(409, 'Bill payment could not be confirmed');
    const table = await Table.findOne({ _id: currentBill.table, restaurant: currentBill.restaurant }).select('status');
    return { bill: currentBill, tableStatus: table?.status || 'available' };
  }
  bill = paidBill;
  const [otherUnpaidBill, unbilledOrder] = await Promise.all([
    Bill.exists({ _id: { $ne: bill._id }, restaurant: bill.restaurant, table: bill.table, status: 'unpaid' }),
    Order.exists({ restaurant: bill.restaurant, table: bill.table, billed: false, status: { $ne: 'cancelled' } }),
  ]);
  const tableStatus = otherUnpaidBill || unbilledOrder ? 'billing' : 'available';
  const table = await Table.findOneAndUpdate(
    { _id: bill.table, restaurant: bill.restaurant },
    { status: tableStatus },
    { new: true }
  ).select('number');
  const tableNumber = bill.tableNumber || table?.number;
  emitToRestaurant(bill.restaurant, 'payment:confirmed', {
    billId: bill._id,
    tableId: bill.table,
    tableNumber,
    tableStatus,
    total: bill.total + (bill.tip || 0),
    tip: bill.tip || 0,
    orderIds: bill.orders.map(String),
    method,
  });
  emitToRestaurant(bill.restaurant, 'table:updated', { tableId: bill.table, status: tableStatus });
  emitToRestaurant(bill.restaurant, 'billing:updated', bill);
  return { bill, tableStatus };
}

module.exports = { createTableBill, removeCancelledOrderFromBill, markBillPaid };
