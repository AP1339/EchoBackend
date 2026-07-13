// auth/rateLimit.js
const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const { logger } = require('../logger/logger');

function getClientIP(req) {
    return req.ip || 
           req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress;
}

function getKey(req) {
    const userId = req.userId || 'anonymous';
    const ip = getClientIP(req);
    return `${userId}:${ip}`;
}

// Base limiter
const baseLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW || 900000,
    max: config.RATE_LIMIT_MAX || 100,
    keyGenerator: getKey,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: getClientIP(req) });
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later'
        });
    }
});

// Download limiter
const downloadLimiter = rateLimit({
    windowMs: 3600000, // 1 hour
    max: config.DOWNLOAD_LIMIT || 20,
    keyGenerator: getKey,
    handler: (req, res) => {
        logger.warn('Download limit exceeded', { ip: getClientIP(req) });
        res.status(429).json({
            success: false,
            message: `Download limit exceeded. Max ${config.DOWNLOAD_LIMIT || 20} per hour`
        });
    }
});

// Dashboard limiter
const dashboardLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 60,
    keyGenerator: getClientIP,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many dashboard requests'
        });
    }
});

module.exports = {
    baseLimiter,
    downloadLimiter,
    dashboardLimiter
};