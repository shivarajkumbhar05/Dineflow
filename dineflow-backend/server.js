const http = require('http');
const env = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');
const createApp = require('./src/app');
const { initSocket } = require('./src/sockets');
const logger = require('./src/utils/logger');

(async () => {
  await connectDB();
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(env.PORT, () => logger.info(`DineFlow API listening on port ${env.PORT} (${env.NODE_ENV})`));

  const shutdown = async (sig) => {
    logger.info(`${sig} received, shutting down`);
    server.close(async () => { await disconnectDB(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (e) => logger.error('Unhandled rejection', { message: e && e.message }));
  process.on('uncaughtException', (e) => { logger.error('Uncaught exception', { message: e.message }); process.exit(1); });
})();
