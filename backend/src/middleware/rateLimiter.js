'use strict';

const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');

const createLimiter = (options) =>
  rateLimit({
    windowMs: options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessful || false,
    keyGenerator: (req) => req.user?.id || req.ip,
    handler: (req, res) => {
      res.status(429).json({
        status: 'fail',
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });

const rateLimiter = createLimiter({
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  message: 'Too many requests from this IP.',
});

const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
  skipSuccessful: true,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

const sosRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'SOS rate limit reached.',
});

const paymentRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many payment requests.',
});

module.exports = { rateLimiter, authRateLimiter, sosRateLimiter, paymentRateLimiter };
