const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { Restaurant } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', asyncHandler(async (req, res) => res.json(await Restaurant.findById(req.tenantId))));
router.patch('/', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'address', 'currency', 'taxPercent', 'logo', 'banner'];
  const update = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  res.json(await Restaurant.findByIdAndUpdate(req.tenantId, update, { new: true, runValidators: true }));
}));
module.exports = router;
