const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const cloudinary = require('../config/cloudinary');
const env = require('../config/env');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');

const KINDS = ['logo', 'food', 'banner', 'profile', 'promo'];

// POST /api/uploads/:kind   (multipart field name: "file")
router.post('/:kind', authenticate, authorize('owner', 'manager'), uploadLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  if (!env.cloudinary.cloud_name) throw new ApiError(503, 'File storage is not configured');
  if (!KINDS.includes(req.params.kind)) throw new ApiError(400, 'Invalid upload type');
  if (!req.file) throw new ApiError(400, 'File is required');

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: `dineflow/${req.tenantId}/${req.params.kind}`, resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], transformation: [{ width: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] },
      (err, r) => (err ? reject(err) : resolve(r))
    ).end(req.file.buffer);
  });
  res.status(201).json({ url: result.secure_url, publicId: result.public_id });
}));
module.exports = router;
