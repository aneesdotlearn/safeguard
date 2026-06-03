'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { cacheGet, cacheSet } = require('../config/redis');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) return next(new AppError('Authentication required', 401, 'NO_TOKEN'));

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return next(new AppError(msg, 401, 'INVALID_TOKEN'));
  }

  // Check blacklist
  const isBlacklisted = await cacheGet(`blacklist:${token}`);
  if (isBlacklisted) return next(new AppError('Token revoked', 401, 'TOKEN_REVOKED'));

  // Get user (with short cache)
  const cacheKey = `user:${decoded.id}`;
  let user = await cacheGet(cacheKey);
  if (!user) {
    user = await User.findById(decoded.id).select('+passwordChangedAt').lean();
    if (user) await cacheSet(cacheKey, user, 60);
  }

  if (!user) return next(new AppError('User not found', 401, 'USER_NOT_FOUND'));
  if (!user.isActive) return next(new AppError('Account deactivated', 403, 'ACCOUNT_INACTIVE'));

  if (user.passwordChangedAt) {
    const changedAt = parseInt(new Date(user.passwordChangedAt).getTime() / 1000, 10);
    if (decoded.iat < changedAt) return next(new AppError('Password changed. Please log in again.', 401, 'PASSWORD_CHANGED'));
  }

  req.user = user;
  next();
};

const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission', 403, 'FORBIDDEN'));
  }
  next();
};

const requireSubscription = (...plans) => (req, res, next) => {
  const sub = req.user.subscription;
  if (!sub || !plans.includes(sub.plan) || sub.status !== 'active') {
    return next(new AppError('Subscription required for this feature', 403, 'SUBSCRIPTION_REQUIRED'));
  }
  next();
};

module.exports = { protect, restrictTo, requireSubscription };
