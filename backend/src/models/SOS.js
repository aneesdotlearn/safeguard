'use strict';

const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'resolved', 'false_alarm', 'escalated'],
      default: 'active',
      index: true,
    },
    triggerMethod: {
      type: String,
      enum: ['button', 'voice', 'shake', 'auto', 'admin'],
      required: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      accuracy: Number,
      address: String,
      landmark: String,
    },
    locationHistory: [
      {
        coordinates: [Number],
        accuracy: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    notifiedContacts: [
      {
        contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
        notifiedAt: Date,
        method: { type: String, enum: ['sms', 'email', 'push', 'call'] },
        status: { type: String, enum: ['sent', 'delivered', 'failed'] },
      },
    ],
    aiRiskScore:   { type: Number, min: 0, max: 100 },
    aiRiskFactors: [String],
    aiConfidence:  { type: Number, min: 0, max: 1 },
    aiLevel:       { type: String, enum: ["low","medium","high","critical"] },
    aiModel:       { type: String },
    audioRecording: { type: String, default: null },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: String,
    incidentCreated: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    deviceInfo: {
      platform: String,
      os: String,
      battery: Number,
      networkType: String,
    },
  },
  { timestamps: true }
);

sosSchema.index({ location: '2dsphere' });
sosSchema.index({ createdAt: -1 });
sosSchema.index({ user: 1, status: 1 });
sosSchema.index({ status: 1, createdAt: -1 });

const SOS = mongoose.model('SOS', sosSchema);
module.exports = SOS;