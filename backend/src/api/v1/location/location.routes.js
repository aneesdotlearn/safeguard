'use strict';

// location.routes.js
const locationRouter = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../../../middleware/validate');
const { protect } = require('../../../middleware/auth');
const locationCtrl = require('./location.controller');

locationRouter.use(protect);
locationRouter.post('/update', validate([
  body('coordinates').isArray({ min: 2, max: 2 }),
  body('coordinates.*').isFloat({ min: -180, max: 180 }),
  body('accuracy').optional().isFloat({ min: 0 }),
]), locationCtrl.updateLocation);
locationRouter.get('/live', locationCtrl.getLiveLocation);
locationRouter.get('/history', locationCtrl.getLocationHistory);

module.exports = locationRouter;
