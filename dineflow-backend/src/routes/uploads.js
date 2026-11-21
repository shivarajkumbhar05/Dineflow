const router = require('express').Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { v2: cloudinary } = require('cloudinary');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');

const KINDS = ['logo', 'food', 'banner', 'profile', 'promo'];
const BUCKET_NAME = 'uploads';

const uploadToCloudinary = (file, options) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) reject(error);
    else resolve(result);
  });
  stream.end(file.buffer);
});

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

  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new ApiError(503, 'Image storage is not configured');
  }

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });

  const result = await uploadToCloudinary(req.file, {
    resource_type: 'image',
    folder: 'dineflow',
    public_id: `${req.params.kind}/${req.tenantId}/${crypto.randomUUID()}`,
  });
  const optimizedUrl = cloudinary.url(result.public_id, {
    secure: true,
    version: result.version,
    fetch_format: 'auto',
    quality: 'auto',
  });
  const autoCropUrl = cloudinary.url(result.public_id, {
    secure: true,
    version: result.version,
    crop: 'auto',
    gravity: 'auto',
    width: 500,
    height: 500,
  });

  res.status(201).json({
    url: optimizedUrl,
    optimizedUrl,
    autoCropUrl,
    publicId: result.public_id,
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
