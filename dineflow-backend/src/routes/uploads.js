const router = require('express').Router();
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');

const KINDS = ['logo', 'food', 'banner', 'profile', 'promo'];
const BUCKET_NAME = 'uploads';

const getBucket = () => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new ApiError(503, 'File storage is unavailable');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
};

// POST /api/uploads/:kind   (multipart field name: "file")
router.post('/:kind', authenticate, authorize('owner', 'manager'), uploadLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  if (!KINDS.includes(req.params.kind)) throw new ApiError(400, 'Invalid upload type');
  if (!req.file) throw new ApiError(400, 'File is required');

  const fileId = new mongoose.Types.ObjectId();
  const bucket = getBucket();
  const stream = bucket.openUploadStream(`${req.params.kind}-${fileId}`, {
    id: fileId,
    contentType: req.file.mimetype,
    metadata: { restaurantId: String(req.tenantId), kind: req.params.kind },
  });

  await new Promise((resolve, reject) => {
    stream.once('error', reject);
    stream.once('finish', resolve);
    stream.end(req.file.buffer);
  });

  res.status(201).json({
    url: `${req.protocol}://${req.get('host')}/api/uploads/${fileId}`,
    publicId: String(fileId),
  });
}));

router.get('/:fileId', asyncHandler(async (req, res, next) => {
  if (!/^[\da-f]{24}$/i.test(req.params.fileId)) throw new ApiError(404, 'Image not found');

  const bucket = getBucket();
  const fileId = new mongoose.Types.ObjectId(req.params.fileId);
  const file = await bucket.find({ _id: fileId }).next();
  if (!file) throw new ApiError(404, 'Image not found');

  res.set({
    'Content-Type': file.contentType || 'application/octet-stream',
    'Content-Length': file.length,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });

  bucket.openDownloadStream(fileId).on('error', next).pipe(res);
}));

module.exports = router;
