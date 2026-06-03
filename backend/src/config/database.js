'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGODB_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  w: 'majority',
  readPreference: 'primaryPreferred',
};

async function connectDB() {
  const uri = process.env.NODE_ENV === 'test'
    ? process.env.MONGODB_TEST_URI
    : process.env.MONGODB_URI;

  if (!uri) throw new Error('MONGODB_URI is not defined');

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(uri, MONGODB_OPTIONS);
}

module.exports = { connectDB };
