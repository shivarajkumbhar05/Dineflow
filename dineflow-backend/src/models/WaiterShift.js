const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    waiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true, unique: true },
    checkedInAt: { type: Date, default: Date.now, required: true },
    checkedOutAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schema.index({ restaurant: 1, waiter: 1, checkedInAt: -1 });
module.exports = mongoose.model('WaiterShift', schema);
