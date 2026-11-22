require('dotenv').config();

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

const cloudinaryUrl = process.env.CLOUDINARY_URL;
let cloudinaryCredentials = {};
if (cloudinaryUrl) {
  let parsed;
  try {
    parsed = new URL(cloudinaryUrl);
  } catch {
    throw new Error('CLOUDINARY_URL must be a valid Cloudinary URL');
  }
  if (parsed.protocol !== 'cloudinary:' || !parsed.hostname || !parsed.username || !parsed.password) {
    throw new Error('CLOUDINARY_URL must include a cloud name, API key, and API secret');
  }
  cloudinaryCredentials = {
    cloudName: parsed.hostname,
    apiKey: decodeURIComponent(parsed.username),
    apiSecret: decodeURIComponent(parsed.password),
  };
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  corsOrigins: list(process.env.CORS_ORIGINS),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'dineflow',
  MONGO_MAX_POOL_SIZE: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 20,
  MONGO_MIN_POOL_SIZE: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 2,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  cloudinary: {
    cloudName: cloudinaryCredentials.cloudName || process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: cloudinaryCredentials.apiKey || process.env.CLOUDINARY_API_KEY,
    apiSecret: cloudinaryCredentials.apiSecret || process.env.CLOUDINARY_API_SECRET,
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
};
