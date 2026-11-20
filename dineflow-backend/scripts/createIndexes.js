// Creates the dineflow database collections and all indexes:  npm run db:indexes
const mongoose = require('mongoose');
const env = require('../src/config/env');
const models = require('../src/models');
(async () => {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB_NAME, serverSelectionTimeoutMS: 10000 });
  for (const [name, model] of Object.entries(models)) {
    await model.createCollection().catch(() => {});
    await model.syncIndexes();
    console.log(`✔ ${name}: collection + indexes ready`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
