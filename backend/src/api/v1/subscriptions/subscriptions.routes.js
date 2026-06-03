'use strict';

const router = require('express').Router();
const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../../middleware/validate');
const { protect } = require('../../../middleware/auth');
const { paymentRateLimiter } = require('../../../middleware/rateLimiter');
const ctrl = require('./subscriptions.controller');

const VALID_PLANS = ['basic', 'premium', 'enterprise'];

// Stripe webhook needs raw body
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), ctrl.stripeWebhook);
router.post('/razorpay/webhook', ctrl.razorpayWebhook);

router.use(protect);

router.get('/status', ctrl.getSubscriptionStatus);
router.get('/transactions', ctrl.getTransactionHistory);
router.get('/invoice/:txId', validate([param('txId').isMongoId()]), ctrl.generateInvoice);

router.post('/razorpay/order', paymentRateLimiter, validate([
  body('plan').isIn(VALID_PLANS).withMessage('Invalid subscription plan'),
]), ctrl.createRazorpayOrder);

router.post('/razorpay/verify', paymentRateLimiter, validate([
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty(),
  body('txId').isMongoId(),
  body('plan').isIn(VALID_PLANS),
]), ctrl.verifyRazorpayPayment);

router.post('/stripe/session', paymentRateLimiter, validate([
  body('plan').isIn(VALID_PLANS).withMessage('Invalid subscription plan'),
]), ctrl.createStripeSession);

module.exports = router;
