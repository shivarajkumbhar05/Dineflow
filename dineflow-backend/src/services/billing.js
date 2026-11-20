const { Bill, Order, Table } = require('../models');
const { emitToRestaurant } = require('../sockets');

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

module.exports = { markBillPaid };
