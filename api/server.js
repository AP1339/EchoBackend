// api/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const { exec } = require("child_process");
require("dotenv").config();

const config = require("../config/config");
const { validateEnv } = require("../config/validateEnv");
const { logger, logRequest } = require("../logger/logger");
const { authenticate } = require("../auth/middleware");
const { baseLimiter, downloadLimiter, dashboardLimiter } = require("../auth/rateLimit");
const { registerServer } = require("../middleware/gracefulShutdown");
const errorHandler = require("../middleware/errorHandler");
const routes = require("./routes");

// Validate environment
validateEnv();

// Start Worker
try {
    require("../worker/worker");
    logger.info('✅ Worker started successfully');
} catch (err) {
    logger.error('❌ Worker failed to start:', err.message);
}

const app = express();

// Security
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());

// Logging
app.use(logRequest);

// Body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Rate limiting
app.use('/api/', baseLimiter);
app.use('/api/download', downloadLimiter);
app.use('/api/dashboard', dashboardLimiter);

// Static files (public)
app.use(express.static(path.join(__dirname, "..", "public")));

// Routes
app.use("/", routes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT || 3000;
const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 EchoBackend started on port ${PORT}`);
    logger.info(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    logger.info(`👷 Workers: ${config.WORKER_COUNT}`);
    logger.info(`🌍 Environment: ${config.NODE_ENV}`);
    
    if (process.platform === "win32") {
        try {
            exec(`start http://localhost:${PORT}/dashboard`);
        } catch (err) {
            logger.warn('Could not auto-open dashboard:', err.message);
        }
    }
});

// Register for graceful shutdown
registerServer(server);

// Unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Don't exit, let graceful shutdown handle it
});