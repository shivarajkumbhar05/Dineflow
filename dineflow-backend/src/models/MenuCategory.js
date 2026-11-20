const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
schema.index({ restaurant: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('MenuCategory', schema);
