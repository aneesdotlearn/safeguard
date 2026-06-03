'use strict';

const SOS = require('../../../models/SOS');
const { Incident, Transaction } = require('../../../models/index');
const User = require('../../../models/User');
const { cacheGet, cacheSet } = require('../../../config/redis');
const logger = require('../../../utils/logger');

exports.getUserAnalytics = async (req, res) => {
  const userId = req.user._id || req.user.id;
  const cacheKey = `analytics:user:${userId}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ status: 'success', data: cached, source: 'cache' });
    }
  } catch (e) {
    // Redis failure — continue to DB query, don't crash
    logger.warn('Redis cache read failed in analytics:', e.message);
  }

  const mongoose = require('mongoose');
  const userObjId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId.toString())
    : null;

  if (!userObjId) {
    return res.status(400).json({ status: 'fail', message: 'Invalid user ID' });
  }

  const [sosSummary, incidentSummary, sosMonthly, riskStats] = await Promise.all([
    // SOS grouped by status with count
    SOS.aggregate([
      { $match: { user: userObjId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),

    // Incidents grouped by type
    Incident.aggregate([
      { $match: { user: userObjId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),

    // SOS per month last 12 months
    SOS.aggregate([
      {
        $match: {
          user: userObjId,
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    // Overall risk stats (separate query for reliability)
    SOS.aggregate([
      { $match: { user: userObjId, aiRiskScore: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          avgRiskScore: { $avg: '$aiRiskScore' },
          maxRiskScore: { $max: '$aiRiskScore' },
          minRiskScore: { $min: '$aiRiskScore' },
          totalWithRisk: { $sum: 1 },
        },
      },
    ]),
  ]);

  const data = {
    sosSummary,
    incidentSummary,
    sosMonthly,
    riskStats: riskStats[0] || {
      avgRiskScore: 0,
      maxRiskScore: 0,
      minRiskScore: 0,
      totalWithRisk: 0,
    },
  };

  try {
    await cacheSet(cacheKey, data, 300);
  } catch (e) {
    logger.warn('Redis cache write failed in analytics:', e.message);
  }

  res.status(200).json({ status: 'success', data });
};

exports.getAdminAnalytics = async (req, res) => {
  const cacheKey = 'analytics:admin:dashboard';

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ status: 'success', data: cached, source: 'cache' });
    }
  } catch (e) {
    logger.warn('Redis cache read failed in admin analytics:', e.message);
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, newUsers, totalSOS, activeSOS,
    incidentsByType, revenueTotal, sosHeatmap,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    SOS.countDocuments(),
    SOS.countDocuments({ status: 'active' }),
    Incident.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$currency', total: { $sum: '$amount' } } },
    ]),
    SOS.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          avgRisk: { $avg: '$aiRiskScore' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const data = { totalUsers, newUsers, totalSOS, activeSOS, incidentsByType, revenueTotal, sosHeatmap };

  try {
    await cacheSet(cacheKey, data, 120);
  } catch (e) {
    logger.warn('Redis cache write failed in admin analytics:', e.message);
  }

  res.status(200).json({ status: 'success', data });
};

// ─── Routes ──────────────────────────────────────────────────────────────────
const router = require('express').Router();
const { protect, restrictTo } = require('../../../middleware/auth');

router.use(protect);
router.get('/me', exports.getUserAnalytics);
router.get('/admin', restrictTo('admin'), exports.getAdminAnalytics);

module.exports = router;
