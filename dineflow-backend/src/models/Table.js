const mongoose = require('mongoose');
const tableSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    number: { type: String, required: true, trim: true },
    seats: { type: Number, default: 4, min: 1 },
    status: { type: String, enum: ['available', 'occupied', 'reserved', 'billing'], default: 'available' },
    qrToken: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);
tableSchema.index({ restaurant: 1, number: 1 }, { unique: true });
module.exports = mongoose.model('Table', tableSchema);
