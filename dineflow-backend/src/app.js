const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const env = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');
const payments = require('./routes/payments');

module.exports = function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Render/Railway/Vercel proxy (correct client IP for rate limiting)
  app.use(helmet());
  app.use(compression());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use(cors({
    origin: (origin, cb) => (!origin || env.corsOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
    credentials: true,
  }));

  // Webhook needs the RAW body for signature verification - must be before express.json()
  app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }), payments.webhookHandler);

  app.use(express.json({ limit: '100kb' }));
  app.use(mongoSanitize());
  app.use('/api', globalLimiter);

  app.use('/health', require('./routes/health'));
  app.use('/api/health', require('./routes/health'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/restaurant', require('./routes/restaurant'));
  app.use('/api/menu', require('./routes/menu'));
  app.use('/api/tables', require('./routes/tables'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/waiter', require('./routes/waiter'));
  app.use('/api/billing', require('./routes/billing'));
  app.use('/api/payments', payments);
  app.use('/api/uploads', require('./routes/uploads'));
  app.use('/api/public', require('./routes/public'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
