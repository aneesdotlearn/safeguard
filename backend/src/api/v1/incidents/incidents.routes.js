'use strict';

const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../../../middleware/validate');
const { protect, restrictTo } = require('../../../middleware/auth');
const ctrl = require('./incidents.controller');

router.use(protect);

const INCIDENT_TYPES = ['harassment', 'stalking', 'assault', 'theft', 'threat', 'suspicious_activity', 'other'];

router.get('/', validate([
  query('status').optional().isIn(['open', 'under_review', 'resolved', 'closed']),
  query('type').optional().isIn(INCIDENT_TYPES),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
]), ctrl.getIncidents);

router.post('/', validate([
  body('title').trim().isLength({ min: 5, max: 200 }),
  body('description').trim().isLength({ min: 10, max: 2000 }),
  body('type').isIn(INCIDENT_TYPES),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('coordinates').isArray({ min: 2, max: 2 }),
  body('coordinates.*').isFloat({ min: -180, max: 180 }),
  body('isAnonymous').optional().isBoolean(),
]), ctrl.createIncident);

router.get('/:id', validate([param('id').isMongoId()]), ctrl.getIncident);
router.patch('/:id', validate([param('id').isMongoId()]), ctrl.updateIncident);

// Admin routes
router.get('/admin/all', restrictTo('admin', 'moderator'), ctrl.adminGetIncidents);
router.patch('/admin/:id', restrictTo('admin', 'moderator'), validate([param('id').isMongoId()]), ctrl.adminUpdateIncident);

module.exports = router;
