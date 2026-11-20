const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new ApiError(400, 'Only JPG, PNG or WEBP images are allowed')),
});
