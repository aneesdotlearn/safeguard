'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

function initSocketIO(server) {
  io = new Server(server, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || '').split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    logger.info(`Socket connected: ${userId}`);

    socket.on('join:zone', (zoneId) => {
      socket.join(`zone:${zoneId}`);
    });

    socket.on('leave:zone', (zoneId) => {
      socket.leave(`zone:${zoneId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userId}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

function emitToZone(zoneId, event, data) {
  if (!io) return;
  io.to(`zone:${zoneId}`).emit(event, data);
}

function broadcastEvent(event, data) {
  if (!io) return;
  io.emit(event, data);
}

module.exports = { initSocketIO, getIO, emitToUser, emitToZone, broadcastEvent };
