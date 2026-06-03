'use strict';

const { AuthenticationError, ForbiddenError } = require('apollo-server-express');
const { verifyAccessToken } = require('../../utils/jwt');
const User = require('../../models/User');
const SOS = require('../../models/SOS');
const { Incident, Contact, SafeZone, Notification } = require('../../models/index');

function getUser(ctx) {
  const token = ctx.req.headers.authorization?.split(' ')[1] || ctx.req.cookies?.access_token;
  if (!token) throw new AuthenticationError('Authentication required');
  try {
    return verifyAccessToken(token);
  } catch {
    throw new AuthenticationError('Invalid token');
  }
}

const resolvers = {
  Query: {
    me: async (_, __, ctx) => {
      const decoded = getUser(ctx);
      return User.findById(decoded.id).lean();
    },
    mySOSHistory: async (_, { page = 1, limit = 20 }, ctx) => {
      const decoded = getUser(ctx);
      return SOS.find({ user: decoded.id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    },
    myIncidents: async (_, { status }, ctx) => {
      const decoded = getUser(ctx);
      const filter = { user: decoded.id };
      if (status) filter.status = status;
      return Incident.find(filter).sort({ createdAt: -1 }).lean();
    },
    myContacts: async (_, __, ctx) => {
      const decoded = getUser(ctx);
      return Contact.find({ user: decoded.id }).sort({ priority: 1 }).lean();
    },
    mySafeZones: async (_, __, ctx) => {
      const decoded = getUser(ctx);
      return SafeZone.find({ user: decoded.id }).lean();
    },
    myNotifications: async (_, { unread }, ctx) => {
      const decoded = getUser(ctx);
      const filter = { user: decoded.id };
      if (unread) filter.isRead = false;
      return Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    },
    myAnalytics: async (_, __, ctx) => {
      const decoded = getUser(ctx);
      const [sosData, incidents] = await Promise.all([
        SOS.aggregate([
          { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(decoded.id) } },
          { $group: { _id: null, total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }, avgRisk: { $avg: '$aiRiskScore' } } },
        ]),
        Incident.countDocuments({ user: decoded.id }),
      ]);
      const s = sosData[0] || { total: 0, resolved: 0, avgRisk: null };
      return { totalSOS: s.total, resolvedSOS: s.resolved, totalIncidents: incidents, avgRiskScore: s.avgRisk };
    },
  },
  Mutation: {
    markNotificationRead: async (_, { id }, ctx) => {
      const decoded = getUser(ctx);
      return Notification.findOneAndUpdate(
        { _id: id, user: decoded.id },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true }
      ).lean();
    },
    markAllNotificationsRead: async (_, __, ctx) => {
      const decoded = getUser(ctx);
      await Notification.updateMany({ user: decoded.id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
      return true;
    },
  },
};

module.exports = resolvers;
