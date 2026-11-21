const crypto = require('crypto');
const Razorpay = require('razorpay');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { Restaurant } = require('../models');

let client = null;
function getClient() {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) throw new ApiError(503, 'Payments are not configured');
  if (!client) client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  return client;
}

async function createOrder(bill, restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId).select('currency');
  if (!restaurant) throw new ApiError(404, 'Restaurant not found');
  if ((bill.currency || restaurant.currency || 'INR').toUpperCase() !== 'INR') {
    throw new ApiError(400, 'Online payments are only available for INR bills. Please pay at the counter.');
  }
  try {
    return await getClient().orders.create({
      amount: Math.round((bill.total + (bill.tip || 0)) * 100),
      currency: 'INR',
      receipt: String(bill._id),
      notes: { billId: String(bill._id), restaurantId: String(restaurantId) },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Razorpay order creation failed', {
      billId: String(bill._id),
      restaurantId: String(restaurantId),
      error: error.message,
    });
    throw new ApiError(502, 'Online payment could not be started. Please try again or pay at the counter.');
  }
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a), 'utf8');
  const y = Buffer.from(String(b), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function verifyPaymentSignature(orderId, paymentId, signature) {
  const expected = crypto.createHmac('sha256', env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature || '');
}
function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret) return false;
  const expected = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(rawBody).digest('hex');
  return safeEqual(expected, signature || '');
}

module.exports = { getClient, createOrder, verifyPaymentSignature, verifyWebhookSignature };
