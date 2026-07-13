// auth/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');
const { logger } = require('../logger/logger');

class AuthService {
    constructor() {
        this.secret = config.JWT_SECRET;
    }

    generateToken(userId, role = 'user') {
        return jwt.sign(
            { userId, role },
            this.secret,
            { expiresIn: '7d' }
        );
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.secret);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            }
            throw new Error('Invalid token');
        }
    }

    validateApiKey(apiKey) {
        if (!apiKey) return null;
        
        // Check if it's a JWT
        try {
            const decoded = this.verifyToken(apiKey);
            return decoded;
        } catch (err) {
            return null;
        }
    }

    generateApiKey() {
        return crypto.randomBytes(32).toString('hex');
    }
}

function extractApiKey(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return req.query.apiKey || null;
}

module.exports = {
    AuthService,
    extractApiKey
};