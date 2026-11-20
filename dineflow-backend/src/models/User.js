const mongoose = require('mongoose');
const ROLES = ['owner', 'manager', 'waiter', 'kitchen', 'cashier'];
const userSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'waiter' },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
userSchema.statics.ROLES = ROLES;
module.exports = mongoose.model('User', userSchema);
