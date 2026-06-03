'use strict';

const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../../../middleware/validate');
const { protect } = require('../../../middleware/auth');
const ctrl = require('./contacts.controller');

router.use(protect);

const contactValidators = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('phone').matches(/^\+[1-9]\d{6,14}$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('relationship').trim().isLength({ min: 1, max: 50 }),
  body('priority').optional().isInt({ min: 1, max: 5 }),
];

router.get('/', ctrl.getContacts);
router.post('/', validate(contactValidators), ctrl.addContact);
router.patch('/:id', validate([param('id').isMongoId(), ...contactValidators.map((v) => v.optional())]), ctrl.updateContact);
router.delete('/:id', validate([param('id').isMongoId()]), ctrl.deleteContact);

module.exports = router;
