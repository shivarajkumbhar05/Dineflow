const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { WaiterCall } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { emitToRestaurant } = require('../sockets');

router.use(authenticate);
router.get('/calls', asyncHandler(async (req, res) =>
  res.json(await WaiterCall.find({ restaurant: req.tenantId, status: { $ne: 'resolved' } }).sort('-createdAt'))));
router.patch('/calls/:id', authorize('owner', 'manager', 'waiter'), asyncHandler(async (req, res) => {
  if (!['acknowledged', 'resolved'].includes(req.body.status)) throw new ApiError(400, 'Invalid status');
  const call = await WaiterCall.findOneAndUpdate({ _id: req.params.id, restaurant: req.tenantId }, { status: req.body.status }, { new: true });
  if (!call) throw new ApiError(404, 'Call not found');
  emitToRestaurant(req.tenantId, 'waiter:call:updated', call);
  res.json(call);
}));
module.exports = router;
