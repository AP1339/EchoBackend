// api/health.controller.js
const os = require('os');
const { logger } = require('../logger/logger');

exports.health = (req, res) => {
    const health = {
        success: true,
        service: "EchoBackend",
        version: "1.2",
        status: "online",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        system: {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: {
                total: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                free: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB'
            }
        },
        process: {
            pid: process.pid,
            memory: {
                rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
                heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
                heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB'
            }
        }
    };
    
    res.json(health);
};