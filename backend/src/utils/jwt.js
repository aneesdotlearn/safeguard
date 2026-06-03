'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    algorithm: 'HS256',
    issuer: 'safeguard',
    audience: 'safeguard-client',
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'HS256',
    issuer: 'safeguard',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'safeguard',
    audience: 'safeguard-client',
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: 'safeguard',
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateTokenPair(userId, role) {
  const payload = { id: userId, role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const secure = process.env.NODE_ENV === 'production';
  const cookieExpiry = parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7;

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: cookieExpiry * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth/refresh',
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateTokenPair,
  setAuthCookies,
  clearAuthCookies,
};
