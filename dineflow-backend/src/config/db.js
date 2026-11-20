const dns = require('dns');
dns.setServers(["1.1.1.1", "8.8.8.8"]);


const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

let retryTimer = null;
let shuttingDown = false;

const options = {
  dbName: env.MONGODB_DB_NAME,            // production database: "dineflow"
  maxPoolSize: env.MONGO_MAX_POOL_SIZE,   // connection pooling
  minPoolSize: env.MONGO_MIN_POOL_SIZE,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  autoIndex: !env.isProd,                 // build indexes with `npm run db:indexes` in production
};

async function connectDB(attempt = 1) {
  try {
    await mongoose.connect(env.MONGODB_URI, options);
    logger.info('MongoDB connected', { db: env.MONGODB_DB_NAME });
  } catch (err) {
    const delay = Math.min(30000, 2000 * attempt);
    logger.error(`MongoDB connection failed (attempt ${attempt}): ${err.message}. Retrying in ${delay / 1000}s`);
    if (attempt >= 8 && !env.isProd) throw err;
    await new Promise((r) => { retryTimer = setTimeout(r, delay); });
    return connectDB(attempt + 1);
  }
}

mongoose.connection.on('disconnected', () => {
  if (shuttingDown) return;
  logger.warn('MongoDB disconnected - driver will try to reconnect automatically');
});
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
mongoose.connection.on('error', (err) => logger.error('MongoDB error', { message: err.message }));

async function disconnectDB() {
  shuttingDown = true;
  clearTimeout(retryTimer);
  await mongoose.connection.close();
}

const dbStatus = () =>
  ({ 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[mongoose.connection.readyState]);

module.exports = { connectDB, disconnectDB, dbStatus };
