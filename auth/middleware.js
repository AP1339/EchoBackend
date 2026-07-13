// auth/middleware.js
const { AuthService, extractApiKey } = require('./auth');
const { logger } = require('../logger/logger');

const authService = new AuthService();

function authenticate(req, res, next) {
    // Skip auth for public endpoints
    const publicPaths = ['/health', '/', '/dashboard'];
    if (publicPaths.includes(req.path) || req.path === '/api/health') {
        return next();
    }

    try {
        const apiKey = extractApiKey(req);
        
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const user = authService.validateApiKey(apiKey);
        
        if (!user) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired credentials'
            });
        }

        req.user = user;
        req.userId = user.userId;
        next();
    } catch (err) {
        logger.error('Auth error:', err);
        return res.status(500).json({
            success: false,
            message: 'Authentication service error'
        });
    }
}

function optionalAuth(req, res, next) {
    try {
        const apiKey = extractApiKey(req);
        if (apiKey) {
            const user = authService.validateApiKey(apiKey);
            if (user) {
                req.user = user;
                req.userId = user.userId;
            }
        }
        next();
    } catch (err) {
        next();
    }
}

module.exports = {
    authenticate,
    optionalAuth,
    authService
};