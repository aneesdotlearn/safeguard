'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

function handleCastError(err) {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
}

function handleDuplicateKey(err) {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists`, 409, 'DUPLICATE_FIELD');
}

function handleValidationError(err) {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(messages.join('. '), 400, 'VALIDATION_ERROR');
}

function handleJWTError() {
  return new AppError('Invalid token', 401, 'INVALID_TOKEN');
}

function handleJWTExpiredError() {
  return new AppError('Token expired', 401, 'TOKEN_EXPIRED');
}

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err instanceof mongoose.Error.CastError) error = handleCastError(err);
  else if (err.code === 11000) error = handleDuplicateKey(err);
  else if (err instanceof mongoose.Error.ValidationError) error = handleValidationError(err);
  else if (err.name === 'JsonWebTokenError') error = handleJWTError();
  else if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'production') {
    logger.error({
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });
  }

  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      code: error.code || null,
      message: error.message,
    });
  }

  // Non-operational (programming) errors — don't leak details
  logger.error('UNEXPECTED ERROR:', error);
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred',
  });
};

module.exports = { errorHandler };
