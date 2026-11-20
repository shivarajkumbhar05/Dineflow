const { Server } = require('socket.io');
const env = require('../config/env');
const { verify } = require('../utils/jwt');
const { Order } = require('../models');
const logger = require('../utils/logger');

let io = null;
const room = (restaurantId) => `restaurant:${restaurantId}`;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: env.corsOrigins, credentials: true },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Staff authenticate with their JWT. Customers connect anonymously and can only
  // subscribe to their own order via an unguessable trackingCode.
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next();
    try { socket.user = verify(token); next(); } catch { next(new Error('unauthorized')); }
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      socket.join(room(socket.user.rid));          // tenant-scoped room
      socket.join(`${room(socket.user.rid)}:${socket.user.role}`);
    }
    socket.on('track:order', async ({ trackingCode } = {}) => {
      if (typeof trackingCode !== 'string') return;
      const exists = await Order.exists({ trackingCode });
      if (exists) socket.join(`order:${trackingCode}`);
    });
  });
  logger.info('Socket.IO initialised');
  return io;
}

// Events: order:new, order:status, waiter:call, waiter:call:updated, table:updated, billing:updated, payment:confirmed
function emitToRestaurant(restaurantId, event, payload) {
  if (io) io.to(room(restaurantId)).emit(event, payload);
}
function emitToOrder(trackingCode, event, payload) {
  if (io) io.to(`order:${trackingCode}`).emit(event, payload);
}
const getIO = () => io;

module.exports = { initSocket, emitToRestaurant, emitToOrder, getIO };
