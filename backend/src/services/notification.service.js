'use strict';

const axios = require('axios');
const { Notification } = require('../models/index');
const User = require('../models/User');
const { emitToUser } = require('../config/socket');
const logger = require('../utils/logger');

async function createInAppNotification({ userId, title, body, type, data = {} }) {
  const notification = await Notification.create({ user: userId, title, body, type, data });
  emitToUser(userId.toString(), 'notification:new', { notification });
  return notification;
}

async function sendPushNotification({ userId, title, body, data = {} }) {
  const user = await User.findById(userId).select('fcmTokens notificationPreferences').lean();
  if (!user?.notificationPreferences?.push) return;
  if (!user.fcmTokens?.length) return;

  const fcmKey = process.env.FCM_SERVER_KEY;
  if (!fcmKey) {
    logger.warn('FCM_SERVER_KEY not set — skipping push notifications');
    return;
  }

  const tokens = user.fcmTokens.map((t) => t.token).slice(0, 5);
  try {
    await axios.post('https://fcm.googleapis.com/fcm/send', {
      registration_ids: tokens,
      notification: { title, body, sound: 'default', badge: '1' },
      data,
      priority: 'high',
    }, {
      headers: {
        Authorization: `key=${fcmKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    });
  } catch (err) {
    logger.error(`Push notification failed for user ${userId}:`, err.message);
  }
}

module.exports = { createInAppNotification, sendPushNotification };
