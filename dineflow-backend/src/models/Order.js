const mongoose = require('mongoose');
const STATUSES = ['placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];
const itemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: String,
    price: Number,
    qty: { type: Number, min: 1, max: 20, required: true },
    notes: { type: String, default: '', maxlength: 200 },
  },
  { _id: false }
);
const schema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNumber: String,
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    status: { type: String, enum: STATUSES, default: 'placed' },
    subtotal: { type: Number, required: true },
    customerName: { type: String, default: '', maxlength: 80 },
    customerPhone: { type: String, default: '', maxlength: 20 },
    trackingCode: { type: String, required: true, unique: true },
    billed: { type: Boolean, default: false },
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
  },
  { timestamps: true }
);
schema.index({ restaurant: 1, status: 1, createdAt: -1 });
schema.index({ restaurant: 1, table: 1, billed: 1 });
schema.statics.STATUSES = STATUSES;
module.exports = mongoose.model('Order', schema);
