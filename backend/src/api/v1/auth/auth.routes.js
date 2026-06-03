'use strict';

const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../../../middleware/validate');
const { protect } = require('../../../middleware/auth');
const ctrl = require('./auth.controller');

const passwordRules = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  .withMessage('Password must contain uppercase, lowercase, number, and special character');

router.post('/register', validate([
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^\+[1-9]\d{6,14}$/).withMessage('Phone must be in E.164 format (e.g. +911234567890)'),
  passwordRules,
]), ctrl.register);

router.post('/login', validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
]), ctrl.login);

router.post('/refresh', ctrl.refresh);
router.post('/logout', protect, ctrl.logout);

router.get('/verify-email/:token', validate([
  param('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('Invalid token'),
]), ctrl.verifyEmail);

router.post('/forgot-password', validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
]), ctrl.forgotPassword);

router.patch('/reset-password/:token', validate([
  param('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('Invalid token'),
  passwordRules,
]), ctrl.resetPassword);

router.patch('/change-password', protect, validate([
  body('currentPassword').notEmpty().withMessage('Current password required'),
  passwordRules.withMessage('New password must meet complexity requirements'),
]), ctrl.changePassword);

router.get('/me', protect, ctrl.getMe);
router.patch('/me', protect, validate([
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().matches(/^\+[1-9]\d{6,14}$/),
]), ctrl.updateMe);

module.exports = router;
