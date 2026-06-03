'use strict';

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  tls: {
    rejectUnauthorized: false,
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Verify Error:', error);
  } else {
    console.log('SMTP Server is ready');
  }
});

const templates = {
  'verify-email': (data) => ({
    subject: 'Verify your SafeGuard account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:8px">
        <div style="background:#e53e3e;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0">SafeGuard</h1>
        </div>
        <div style="padding:30px">
          <h2>Hello ${data.name},</h2>
          <p>Please verify your email to activate your SafeGuard account.</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${data.verifyURL}" style="background:#e53e3e;color:#fff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold">Verify Email</a>
          </div>
          <p>This link expires in 24 hours. If you did not register, ignore this email.</p>
        </div>
      </div>`,
  }),
  'reset-password': (data) => ({
    subject: 'SafeGuard Password Reset',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:8px">
        <div style="background:#e53e3e;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0">SafeGuard</h1>
        </div>
        <div style="padding:30px">
          <h2>Hello ${data.name},</h2>
          <p>You requested a password reset. Click below to set a new password.</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${data.resetURL}" style="background:#e53e3e;color:#fff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold">Reset Password</a>
          </div>
          <p>This link expires in 10 minutes. If you did not request this, ignore this email.</p>
        </div>
      </div>`,
  }),
  'sos-alert': (data) => ({
    subject: `🚨 SOS Alert from ${data.userName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:8px">
        <div style="background:#e53e3e;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0">🚨 EMERGENCY ALERT</h1>
        </div>
        <div style="padding:30px">
          <h2>Hello ${data.contactName},</h2>
          <p><strong>${data.userName}</strong> has triggered an emergency SOS alert.</p>
          <p><strong>Location:</strong> ${data.address || `${data.coordinates[1]}, ${data.coordinates[0]}`}</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${data.trackUrl}" style="background:#e53e3e;color:#fff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold">Track Live Location</a>
          </div>
          <p style="color:#666;font-size:12px">This alert was sent automatically by SafeGuard.</p>
        </div>
      </div>`,
  }),
};

async function sendEmail({ to, subject, template, data, html: rawHtml, text }) {
  try {
    const tpl = template ? templates[template]?.(data) : null;
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to,
      subject: tpl?.subject || subject,
      html: tpl?.html || rawHtml,
      text,
    };
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email send failed to ${to}:`, err);
    throw err;
  }
}

module.exports = { sendEmail };
