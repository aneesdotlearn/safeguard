'use strict';

const twilio = require('twilio');
const logger = require('../utils/logger');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSMS({ to, message }) {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    logger.info(`SMS sent to ${to}: ${result.sid}`);
    return result;
  } catch (err) {
    logger.error(`SMS send failed to ${to}:`, err);
    throw err;
  }
}

module.exports = { sendSMS };
