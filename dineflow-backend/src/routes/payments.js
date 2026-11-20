const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../utils/logger');
const { Bill } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { createOrder, verifyPaymentSignature, verifyWebhookSignature } = require('../services/razorpay');
const { markBillPaid } = require('../services/billing');

// Staff creates a Razorpay order for a bill
router.post('/razorpay/order', authenticate, authorize('owner', 'manager', 'cashier', 'waiter'), asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({ _id: req.body.billId, restaurant: req.tenantId });
  if (!bill) throw new ApiError(404, 'Bill not found');
  if (bill.status === 'paid') throw new ApiError(400, 'Bill already paid');
  if (!bill.razorpayOrderId) {
    const rzp = await createOrder(bill, req.tenantId);
    bill.razorpayOrderId = rzp.id;
    await bill.save();
  }
  res.json({ keyId: env.razorpay.keyId, razorpayOrderId: bill.razorpayOrderId, amount: Math.round(bill.total * 100), currency: 'INR', billId: bill._id });
}));

// Called by the checkout page after payment. Signature is verified server-side - never trust the client.
router.post('/razorpay/verify', asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) throw new ApiError(400, 'Missing payment fields');
  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) throw new ApiError(400, 'Invalid payment signature');
  const bill = await Bill.findOne({ razorpayOrderId: razorpay_order_id });
  if (!bill) throw new ApiError(404, 'Bill not found');
  await markBillPaid(bill, { method: 'razorpay', paymentId: razorpay_payment_id });
  res.json({ ok: true, status: 'paid' });
}));

// Razorpay webhook. Mounted in app.js with express.raw() so the signature is checked on the raw body.
router.webhookHandler = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) return res.status(400).json({ error: 'Invalid signature' });
  const event = JSON.parse(req.body.toString('utf8'));
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload.payment && event.payload.payment.entity;
    const orderId = payment ? payment.order_id : event.payload.order.entity.id;
    const bill = await Bill.findOne({ razorpayOrderId: orderId });
    if (bill) await markBillPaid(bill, { method: 'razorpay', paymentId: payment && payment.id });
    else logger.warn('Webhook for unknown bill', { orderId });
  }
  res.json({ received: true });
});

module.exports = router;
