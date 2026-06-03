'use strict';

const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

async function connectRedis() {
  const tls = process.env.REDIS_TLS === 'true';
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      tls,
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('Redis max retries exceeded');
        return Math.min(retries * 100, 3000);
      },
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: 0,
  });

  redisClient.on('error', (err) => logger.error('Redis error:', err));
  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting'));

  await redisClient.connect();
  return redisClient;
}

function getRedisClient() {
  return redisClient;
}

async function cacheGet(key) {
  if (!redisClient) return null;
  const val = await redisClient.get(key);
  return val ? JSON.parse(val) : null;
}

async function cacheSet(key, value, ttlSeconds = 300) {
  if (!redisClient) return;
  await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
}

async function cacheDel(key) {
  if (!redisClient) return;
  await redisClient.del(key);
}

async function cacheDelPattern(pattern) {
  if (!redisClient) return;
  let cursor = 0;
  do {
    const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = result.cursor;
    if (result.keys.length > 0) {
      await redisClient.del(result.keys);
    }
  } while (cursor !== 0);
}

module.exports = { connectRedis, getRedisClient, cacheGet, cacheSet, cacheDel, cacheDelPattern };
