const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNumber: String,
    reason: { type: String, enum: ['assistance', 'water', 'bill', 'other'], default: 'assistance' },
    status: { type: String, enum: ['pending', 'acknowledged', 'resolved'], default: 'pending' },
  },
  { timestamps: true }
);
schema.index({ restaurant: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('WaiterCall', schema);
