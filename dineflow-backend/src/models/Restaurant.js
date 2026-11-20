const mongoose = require('mongoose');
const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: ['restaurant', 'hotel', 'cafe'], default: 'restaurant' },
    logo: { type: String, default: '' },
    banner: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    taxPercent: { type: Number, default: 5, min: 0, max: 100 },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
module.exports = mongoose.model('Restaurant', restaurantSchema);
