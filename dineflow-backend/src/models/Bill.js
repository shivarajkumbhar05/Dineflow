const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNumber: String,
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    items: [{ name: String, price: Number, qty: Number, _id: false }],
    subtotal: { type: Number, required: true },
    taxPercent: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    paymentMethod: { type: String, enum: ['razorpay', 'cash', 'card', 'upi', null], default: null },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String },
    paidAt: Date,
  },
  { timestamps: true }
);
schema.index({ restaurant: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('Bill', schema);
