// middleware/gracefulShutdown.js
const { logger } = require('../logger/logger');

let isShuttingDown = false;
let serverInstance = null;
const activeConnections = new Set();

function registerServer(server) {
    serverInstance = server;
    
    server.on('connection', (socket) => {
        activeConnections.add(socket);
        socket.on('close', () => activeConnections.delete(socket));
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGHUP', () => handleShutdown('SIGHUP'));
}

async function handleShutdown(signal) {
    if (isShuttingDown) {
        logger.warn('Shutdown already in progress');
        return;
    }
    
    isShuttingDown = true;
    logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);

    try {
        // 1. Stop accepting new connections
        if (serverInstance) {
            await new Promise((resolve) => {
                serverInstance.close(() => {
                    logger.info('✅ HTTP server closed');
                    resolve();
                });
            });
        }

        // 2. Wait for existing connections to finish
        const connectionCount = activeConnections.size;
        if (connectionCount > 0) {
            logger.info(`⏳ Waiting for ${connectionCount} active connections to finish...`);
            
            await new Promise((resolve) => {
                let timeout = setTimeout(() => {
                    logger.warn(`⚠️ Shutdown timeout, forcing ${activeConnections.size} connections to close`);
                    activeConnections.forEach(socket => socket.destroy());
                    resolve();
                }, 10000);

                const checkInterval = setInterval(() => {
                    if (activeConnections.size === 0) {
                        clearTimeout(timeout);
                        clearInterval(checkInterval);
                        logger.info('✅ All connections closed');
                        resolve();
                    }
                }, 500);
            });
        }

        // 3. Cleanup other resources if needed
        // (Add database cleanup, worker cleanup, etc.)

        logger.info('✅ Graceful shutdown complete');
        process.exit(0);

    } catch (err) {
        logger.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
}

function getShutdownStatus() {
    return isShuttingDown;
}

module.exports = {
    registerServer,
    gracefulShutdown: handleShutdown,
    isShuttingDown: getShutdownStatus
};