const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { Restaurant } = require('../models');

// Resolves the restaurant from the public QR link slug.
module.exports = asyncHandler(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ slug: req.params.slug, isActive: true });
  if (!restaurant) throw new ApiError(404, 'Restaurant not found');
  req.restaurant = restaurant;
  req.tenantId = restaurant._id;
  next();
});
