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
const logger = require('../utils/logger');

const KINDS = ['logo', 'food', 'banner', 'profile', 'promo'];
const BUCKET_NAME = 'uploads';

const cloudinaryErrorMessage = (error) => {
  let message = error && typeof error.message === 'string' ? error.message : 'Unknown Cloudinary error';
  [env.cloudinary.apiKey, env.cloudinary.apiSecret].filter(Boolean).forEach((credential) => {
    message = message.split(credential).join('[redacted]');
  });
  return message.replace(/cloudinary:\/\/[^@\s]+@/gi, 'cloudinary://[redacted]@').slice(0, 500);
};

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

const uploadToGridFS = (file, metadata) => new Promise((resolve, reject) => {
  const bucket = getBucket();
  const stream = bucket.openUploadStream(`dineflow-${crypto.randomUUID()}`, {
    metadata: { ...metadata, contentType: file.mimetype },
  });
  stream.on('error', reject);
  stream.on('finish', () => resolve(stream.id));
  stream.end(file.buffer);
});

// POST /api/uploads/:kind   (multipart field name: "file")
router.post('/:kind', authenticate, authorize('owner', 'manager'), uploadLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  if (!KINDS.includes(req.params.kind)) throw new ApiError(400, 'Invalid upload type');
  if (!req.file) throw new ApiError(400, 'File is required');

  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    const fileId = await uploadToGridFS(req.file, {
      restaurant: String(req.tenantId),
      kind: req.params.kind,
    });
    const url = `/api/uploads/${fileId}`;
    return res.status(201).json({ url, optimizedUrl: url, autoCropUrl: url, publicId: String(fileId) });
  }

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });

  let result;
  try {
    result = await uploadToCloudinary(req.file, {
      resource_type: 'image',
      folder: 'dineflow',
      public_id: `${req.params.kind}/${req.tenantId}/${crypto.randomUUID()}`,
    });
  } catch (error) {
    logger.error('Cloudinary image upload failed', {
      kind: req.params.kind,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      httpCode: Number.isInteger(error && error.http_code) ? error.http_code : undefined,
      name: typeof (error && error.name) === 'string' ? error.name : undefined,
      requestId: typeof (error && error.request_id) === 'string' ? error.request_id : undefined,
      message: cloudinaryErrorMessage(error),
    });
    throw new ApiError(502, 'Image upload failed. Check the image or Cloudinary configuration, then try again.');
  }
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
    'Content-Type': file.contentType || file.metadata?.contentType || 'application/octet-stream',
    'Content-Length': file.length,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });

  bucket.openDownloadStream(fileId).on('error', next).pipe(res);
}));

module.exports = router;
