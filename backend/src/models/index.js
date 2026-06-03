'use strict';

const mongoose = require('mongoose');

// ─── Emergency Contact ─────────────────────────────────────────────────────────
const contactSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, match: /^\+[1-9]\d{6,14}$/ },
    email: { type: String, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    relationship: { type: String, required: true, maxlength: 50 },
    priority: { type: Number, default: 1, min: 1, max: 5 },
    notifyOn: {
      sos: { type: Boolean, default: true },
      zoneExit: { type: Boolean, default: false },
      incident: { type: Boolean, default: true },
    },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
  },
  { timestamps: true }
);
contactSchema.index({ user: 1, phone: 1 }, { unique: true });

// ─── Safe Zone ─────────────────────────────────────────────────────────────────
const safeZoneSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    radius: { type: Number, required: true, min: 50, max: 50000, default: 200 },
    address: { type: String, maxlength: 300 },
    isActive: { type: Boolean, default: true },
    schedules: [
      {
        days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
        startTime: String,
        endTime: String,
      },
    ],
    alertOnExit: { type: Boolean, default: true },
    alertOnEntry: { type: Boolean, default: false },
  },
  { timestamps: true }
);
safeZoneSchema.index({ location: '2dsphere' });
safeZoneSchema.index({ user: 1, isActive: 1 });

// ─── Incident ──────────────────────────────────────────────────────────────────
const incidentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    type: {
      type: String,
      enum: ['harassment', 'stalking', 'assault', 'theft', 'threat', 'suspicious_activity', 'other'],
      required: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'under_review', 'resolved', 'closed'], default: 'open', index: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: String,
    },
    attachments: [{ type: String }],
    linkedSOS: { type: mongoose.Schema.Types.ObjectId, ref: 'SOS' },
    isAnonymous: { type: Boolean, default: false },
    adminNotes: { type: String, maxlength: 1000 },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ user: 1, status: 1 });
incidentSchema.index({ createdAt: -1 });

// ─── Notification ──────────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ['sos', 'zone_alert', 'incident', 'subscription', 'system', 'payment'],
      required: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
    channel: { type: String, enum: ['push', 'email', 'sms', 'in_app'], default: 'in_app' },
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// ─── Transaction ──────────────────────────────────────────────────────────────
const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['subscription', 'wallet_topup', 'refund'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    gateway: { type: String, enum: ['razorpay', 'stripe'], required: true },
    gatewayOrderId: String,
    gatewayPaymentId: String,
    gatewaySignature: String,
    description: { type: String, maxlength: 500 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    invoiceUrl: String,
    refundId: String,
    refundAmount: Number,
  },
  { timestamps: true }
);
transactionSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = {
  Contact: mongoose.model('Contact', contactSchema),
  SafeZone: mongoose.model('SafeZone', safeZoneSchema),
  Incident: mongoose.model('Incident', incidentSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Transaction: mongoose.model('Transaction', transactionSchema),
};
