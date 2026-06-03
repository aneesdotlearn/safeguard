'use strict';

const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../../../middleware/validate');
const { protect } = require('../../../middleware/auth');
const { sosRateLimiter } = require('../../../middleware/rateLimiter');
const ctrl = require('./sos.controller');

const coordsValidator = [
  body('coordinates').isArray({ min: 2, max: 2 }).withMessage('coordinates must be [lng, lat]'),
  body('coordinates.*').isFloat({ min: -180, max: 180 }).withMessage('Invalid coordinate value'),
];

// ✅ Public route — no auth required so emergency contacts can view tracking page
router.get('/track/:sosId', validate([param('sosId').isMongoId()]), ctrl.getActiveSOSForContact);

// All routes below require authentication
router.use(protect);

router.post('/trigger', sosRateLimiter, validate([
  ...coordsValidator,
  body('triggerMethod').optional().isIn(['button', 'voice', 'shake', 'auto']),
  body('accuracy').optional().isFloat({ min: 0 }),
]), ctrl.triggerSOS);

router.patch('/:sosId/location', validate([
  param('sosId').isMongoId(),
  ...coordsValidator,
]), ctrl.updateLocation);

router.patch('/:sosId/resolve', validate([
  param('sosId').isMongoId(),
  body('resolutionNote').optional().trim().isLength({ max: 500 }),
  body('isFalseAlarm').optional().isBoolean(),
]), ctrl.resolveSOS);

router.get('/active', ctrl.getActiveSOS);
router.get('/history', ctrl.getSOSHistory);

module.exports = router;