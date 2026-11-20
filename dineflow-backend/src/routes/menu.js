const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { MenuCategory, MenuItem } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
const pick = (obj, keys) => keys.reduce((o, k) => (obj[k] !== undefined ? { ...o, [k]: obj[k] } : o), {});
const ITEM_FIELDS = ['category', 'name', 'description', 'price', 'image', 'isVeg', 'isAvailable', 'prepTimeMins'];

router.get('/categories', asyncHandler(async (req, res) =>
  res.json(await MenuCategory.find({ restaurant: req.tenantId }).sort('sortOrder name'))));
router.post('/categories', authorize('owner', 'manager'), asyncHandler(async (req, res) =>
  res.status(201).json(await MenuCategory.create({ restaurant: req.tenantId, ...pick(req.body, ['name', 'sortOrder']) }))));
router.delete('/categories/:id', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  if (await MenuItem.exists({ restaurant: req.tenantId, category: req.params.id })) throw new ApiError(409, 'Category still has items');
  await MenuCategory.deleteOne({ _id: req.params.id, restaurant: req.tenantId });
  res.json({ ok: true });
}));

router.get('/items', asyncHandler(async (req, res) =>
  res.json(await MenuItem.find({ restaurant: req.tenantId }).sort('name'))));
router.post('/items', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const data = pick(req.body, ITEM_FIELDS);
  if (!(await MenuCategory.exists({ _id: data.category, restaurant: req.tenantId }))) throw new ApiError(400, 'Invalid category');
  res.status(201).json(await MenuItem.create({ restaurant: req.tenantId, ...data }));
}));
router.patch('/items/:id', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  const data = pick(req.body, ITEM_FIELDS);
  if (data.category && !(await MenuCategory.exists({ _id: data.category, restaurant: req.tenantId }))) throw new ApiError(400, 'Invalid category');
  const item = await MenuItem.findOneAndUpdate({ _id: req.params.id, restaurant: req.tenantId }, data, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'Item not found');
  res.json(item);
}));
router.delete('/items/:id', authorize('owner', 'manager'), asyncHandler(async (req, res) => {
  await MenuItem.deleteOne({ _id: req.params.id, restaurant: req.tenantId });
  res.json({ ok: true });
}));
module.exports = router;
