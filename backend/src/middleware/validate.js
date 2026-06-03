'use strict';

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const messages = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
  return next(new AppError(messages, 400, 'VALIDATION_ERROR'));
};

module.exports = { validate };
