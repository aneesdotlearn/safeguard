'use strict';

const { Queue, Worker, QueueEvents } = require('bullmq');
const { sendSMS } = require('../services/sms.service');
const { sendEmail } = require('../services/email.service');
const { createInAppNotification, sendPushNotification } = require('../services/notification.service');
const logger = require('../utils/logger');

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const queues = {};
const workers = [];

function createQueue(name) {
  const q = new Queue(name, {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
  queues[name] = q;
  return q;
}

function initQueues() {
  const notificationQueue = createQueue('notifications');
  const smsQueue = createQueue('sms');
  const emailQueue = createQueue('emails');

  // Notification worker
  const notificationWorker = new Worker('notifications', async (job) => {
    const { userId, title, body, type, data } = job.data;
    await createInAppNotification({ userId, title, body, type, data });
    await sendPushNotification({ userId, title, body, data });
  }, { connection: REDIS_CONNECTION, concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) || 5 });

  // SMS worker
  const smsWorker = new Worker('sms', async (job) => {
    await sendSMS(job.data);
  }, { connection: REDIS_CONNECTION, concurrency: 3 });

  // Email worker
  const emailWorker = new Worker('emails', async (job) => {
    await sendEmail(job.data);
  }, { connection: REDIS_CONNECTION, concurrency: 3 });

  [notificationWorker, smsWorker, emailWorker].forEach((w) => {
    workers.push(w);
    w.on('failed', (job, err) => logger.error(`Job ${job?.id} in queue ${w.name} failed:`, err));
    w.on('completed', (job) => logger.debug(`Job ${job.id} in queue ${w.name} completed`));
  });

  logger.info('BullMQ queues and workers initialized');
}

function addNotificationJob(data) {
  return queues['notifications']?.add('send', data);
}

function addSMSJob(data) {
  return queues['sms']?.add('send', data);
}

function addEmailJob(data) {
  return queues['emails']?.add('send', data);
}

async function closeQueues() {
  await Promise.all([
    ...Object.values(queues).map((q) => q.close()),
    ...workers.map((w) => w.close()),
  ]);
}

module.exports = { initQueues, addNotificationJob, addSMSJob, addEmailJob, closeQueues };
