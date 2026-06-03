'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, stack }) =>
  `${ts} [${level}]: ${stack || message}`
);

const prodTransports = [
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '30d',
    zippedArchive: true,
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    zippedArchive: true,
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), json()),
  defaultMeta: { service: 'safeguard-api' },
  transports: process.env.NODE_ENV === 'production'
    ? [...prodTransports, new winston.transports.Console({ format: combine(colorize(), devFormat) })]
    : [new winston.transports.Console({ format: combine(colorize(), devFormat) })],
  exitOnError: false,
});

module.exports = logger;
