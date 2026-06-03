'use strict';

const crypto = require('crypto');
const User = require('../../../models/User');
const AppError = require('../../../utils/AppError');
const { generateTokenPair, verifyRefreshToken, setAuthCookies, clearAuthCookies, hashToken } = require('../../../utils/jwt');
const { cacheSet, cacheDel, cacheGet, cacheDelPattern } = require('../../../config/redis');
const { sendEmail } = require('../../../services/email.service');
const logger = require('../../../utils/logger');

const REFRESH_TTL = 7 * 24 * 60 * 60;

exports.register = async (req, res, next) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { phone }] }).lean();
  if (existing) {
    const field = existing.email === email ? 'email' : 'phone';
    return next(new AppError(`${field} already registered`, 409, 'DUPLICATE_FIELD'));
  }

  const user = await User.create({ name, email, phone, password });

  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const verifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify your SafeGuard account',
      template: 'verify-email',
      data: { name: user.name, verifyURL },
    });
  } catch (e) {
    logger.error('Verification email failed:', e.message);
  }

  const { accessToken, refreshToken } = generateTokenPair(user._id.toString(), user.role);
  await cacheSet(`refresh:${hashToken(refreshToken)}:${user._id}`, { userId: user._id }, REFRESH_TTL);

  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({
    status: 'success',
    message: 'Registration successful. Please verify your email.',
    data: { accessToken, user: sanitizeUser(user) },
  });
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));

  if (user.isLocked) {
    return next(new AppError('Account temporarily locked. Try again later.', 423, 'ACCOUNT_LOCKED'));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
  }

  if (!user.isActive) return next(new AppError('Account deactivated', 403, 'ACCOUNT_INACTIVE'));

  await User.updateOne(
    { _id: user._id },
    { $set: { loginAttempts: 0, lastLogin: new Date() }, $unset: { lockUntil: 1 } }
  );

  const { accessToken, refreshToken } = generateTokenPair(user._id.toString(), user.role);
  await cacheSet(`refresh:${hashToken(refreshToken)}:${user._id}`, { userId: user._id }, REFRESH_TTL);

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    status: 'success',
    data: { accessToken, user: sanitizeUser(user) },
  });
};

exports.refresh = async (req, res, next) => {
  const token = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!token) return next(new AppError('Refresh token required', 401, 'NO_TOKEN'));

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return next(new AppError('Invalid or expired refresh token', 401, 'INVALID_TOKEN'));
  }

  const tokenHash = hashToken(token);
  const cached = await cacheGet(`refresh:${tokenHash}:${decoded.id}`);
  if (!cached) return next(new AppError('Session expired. Please log in.', 401, 'SESSION_EXPIRED'));

  const user = await User.findById(decoded.id).lean();
  if (!user || !user.isActive) return next(new AppError('User not found or inactive', 401));

  await cacheDel(`refresh:${tokenHash}:${decoded.id}`);
  const { accessToken, refreshToken: newRefresh } = generateTokenPair(user._id.toString(), user.role);
  await cacheSet(`refresh:${hashToken(newRefresh)}:${user._id}`, { userId: user._id }, REFRESH_TTL);

  setAuthCookies(res, accessToken, newRefresh);

  res.status(200).json({ status: 'success', data: { accessToken } });
};

exports.logout = async (req, res, next) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
  if (token) {
    await cacheSet(`blacklist:${token}`, 1, 15 * 60);
  }
  clearAuthCookies(res);
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};

exports.verifyEmail = async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });
  if (!user) return next(new AppError('Invalid or expired token', 400, 'INVALID_TOKEN'));

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', message: 'Email verified successfully' });
};

exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(200).json({ status: 'success', message: 'If that email exists, a reset link has been sent.' });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'SafeGuard Password Reset',
      template: 'reset-password',
      data: { name: user.name, resetURL },
    });
  } catch (e) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Failed to send reset email. Try again later.', 500));
  }

  res.status(200).json({ status: 'success', message: 'If that email exists, a reset link has been sent.' });
};

exports.resetPassword = async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) return next(new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN'));

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await cacheDelPattern(`refresh:*:${user._id}`);

  res.status(200).json({ status: 'success', message: 'Password reset successful. Please log in.' });
};

exports.changePassword = async (req, res, next) => {
  const user = await User.findById(req.user._id || req.user.id).select('+password');
  const { currentPassword, newPassword } = req.body;

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS'));
  }

  user.password = newPassword;
  await user.save();
  await cacheDelPattern(`refresh:*:${user._id}`);

  clearAuthCookies(res);
  res.status(200).json({ status: 'success', message: 'Password changed. Please log in again.' });
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id || req.user.id)
    .populate('emergencyContacts')
    .populate('safeZones')
    .lean();
  res.status(200).json({ status: 'success', data: { user } });
};

exports.updateMe = async (req, res, next) => {
  const forbidden = ['password', 'role', 'subscription', 'wallet', 'isVerified', 'isActive'];
  forbidden.forEach((f) => delete req.body[f]);

  const user = await User.findByIdAndUpdate(
    req.user._id || req.user.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).lean();

  await cacheDel(`user:${user._id}`);
  res.status(200).json({ status: 'success', data: { user } });
};

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.__v;
  delete obj.refreshTokens;
  delete obj.twoFactorSecret;
  return obj;
}
