const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    prepTimeMins: { type: Number, default: 15 },
  },
  { timestamps: true }
);
schema.index({ restaurant: 1, category: 1, isAvailable: 1 });
module.exports = mongoose.model('MenuItem', schema);
