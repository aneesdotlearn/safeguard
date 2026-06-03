'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    avatar: { type: String, default: null },
    subscription: {
      plan: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: 'free' },
      status: { type: String, enum: ['active', 'inactive', 'cancelled', 'past_due'], default: 'inactive' },
      startDate: Date,
      endDate: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      razorpayCustomerId: String,
      razorpaySubscriptionId: String,
    },
    wallet: {
      balance: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'INR' },
    },
    lastLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      accuracy: Number,
      updatedAt: Date,
    },
    emergencyContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    safeZones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SafeZone' }],
    sosSettings: {
      activationMethod: {
        type: [String],
        enum: ['button', 'voice', 'shake'],
        default: ['button'],
      },
      countdownSeconds: { type: Number, default: 5, min: 0, max: 30 },
      voiceTriggerPhrase: { type: String, default: 'help me' },
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sosAlerts: { type: Boolean, default: true },
      zoneAlerts: { type: Boolean, default: true },
      incidentAlerts: { type: Boolean, default: true },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    refreshTokens: [{ token: String, createdAt: Date, expiresAt: Date }],
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    fcmTokens: [{ token: String, platform: String, createdAt: { type: Date, default: Date.now } }],
    lastLogin: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_, ret) => { delete ret.password; delete ret.__v; return ret; } },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ lastLocation: '2dsphere' });
userSchema.index({ 'subscription.status': 1, 'subscription.endDate': 1 });
userSchema.index({ createdAt: -1 });

// Virtual
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save hook: hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: password changed after JWT iat
userSchema.methods.passwordChangedAfter = function (jwtIat) {
  if (this.passwordChangedAt) {
    return parseInt(this.passwordChangedAt.getTime() / 1000, 10) > jwtIat;
  }
  return false;
};

// Instance method: create password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Instance method: increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  return this.updateOne(updates);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
