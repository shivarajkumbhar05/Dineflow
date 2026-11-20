// Verifies Atlas connectivity WITHOUT printing credentials:  npm run db:ping
const mongoose = require('mongoose');
const env = require('../src/config/env');
(async () => {
  try {
    await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB_NAME, serverSelectionTimeoutMS: 10000 });
    await mongoose.connection.db.admin().ping();
    console.log(`MongoDB Atlas connection OK  (database: ${env.MONGODB_DB_NAME}, host: ${mongoose.connection.host})`);
    process.exit(0);
  } catch (e) {
    console.error('MongoDB connection FAILED:', e.message);
    console.error('Check: user/password, Network Access (IP allow-list) in Atlas, and MONGODB_URI format.');
    process.exit(1);
  }
})();
