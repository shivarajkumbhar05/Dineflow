const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true }
);

schema.index({ restaurant: 1, startsAt: 1 });
schema.index({ restaurant: 1, staff: 1, startsAt: 1 });
module.exports = mongoose.model('StaffSchedule', schema);
