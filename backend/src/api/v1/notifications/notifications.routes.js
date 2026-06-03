'use strict';

const { Notification } = require('../../../models/index');
const User = require('../../../models/User');
const AppError = require('../../../utils/AppError');
const { cacheDel } = require('../../../config/redis');

exports.getNotifications = async (req, res) => {
  const userId = req.user._id || req.user.id;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;
  const filter = { user: userId };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.unread === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  res.status(200).json({ status: 'success', data: { notifications, total, unreadCount, page, pages: Math.ceil(total / limit) } });
};

exports.markRead = async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id || req.user.id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
  if (!notification) return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
  res.status(200).json({ status: 'success', data: { notification } });
};

exports.markAllRead = async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id || req.user.id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
};

exports.deleteNotification = async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id || req.user.id });
  if (!notification) return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
  res.status(204).json({ status: 'success', data: null });
};

exports.registerFCMToken = async (req, res, next) => {
  const { token, platform } = req.body;
  const userId = req.user._id || req.user.id;
  // Remove old entry for same token, add new
  await User.findByIdAndUpdate(userId, {
    $pull: { fcmTokens: { token } },
  });
  await User.findByIdAndUpdate(userId, {
    $push: { fcmTokens: { token, platform, createdAt: new Date() } },
  });
  res.status(200).json({ status: 'success', message: 'FCM token registered' });
};

exports.updatePreferences = async (req, res) => {
  const allowed = ['email', 'sms', 'push', 'sosAlerts', 'zoneAlerts', 'incidentAlerts'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[`notificationPreferences.${k}`] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user._id || req.user.id, { $set: updates }, { new: true }).select('notificationPreferences').lean();
  await cacheDel(`user:${user._id}`);
  res.status(200).json({ status: 'success', data: { preferences: user.notificationPreferences } });
};

// Routes
const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../../../middleware/validate');
const { protect } = require('../../../middleware/auth');

router.use(protect);
router.get('/', exports.getNotifications);
router.patch('/read-all', exports.markAllRead);
router.patch('/:id/read', validate([param('id').isMongoId()]), exports.markRead);
router.delete('/:id', validate([param('id').isMongoId()]), exports.deleteNotification);
router.post('/fcm-token', validate([
  body('token').notEmpty().withMessage('FCM token required'),
  body('platform').isIn(['ios', 'android', 'web']).withMessage('Invalid platform'),
]), exports.registerFCMToken);
router.patch('/preferences', exports.updatePreferences);

module.exports = router;
