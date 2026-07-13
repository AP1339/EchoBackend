// logger/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Create logs directory
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const formats = {
    console: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level}] ${message} ${metaStr}`.trim();
        })
    ),
    file: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    )
};

const logger = winston.createLogger({
    level: config.LOG_LEVEL || 'info',
    transports: [
        // Console
        new winston.transports.Console({
            format: formats.console
        }),
        // Error logs
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: formats.file,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Combined logs
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: formats.file,
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Request logger middleware
function logRequest(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        let level = 'info';
        if (status >= 500) level = 'error';
        else if (status >= 400) level = 'warn';
        
        logger[level](`${req.method} ${req.url} ${status} ${duration}ms`, {
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });
    next();
}

module.exports = {
    logger,
    logRequest
};