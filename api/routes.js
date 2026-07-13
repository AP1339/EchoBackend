// api/routes.js
const express = require("express");
const path = require("path");
const router = express.Router();

// Controllers
const downloadController = require("./download.controller");
const statusController = require("./status.controller");
const healthController = require("./health.controller");
const dashboardController = require("./dashboard.controller");

// Middleware
const validateDownload = require("../middleware/validateDownload");

// ============================================
// 📌 PUBLIC ROUTES - NO AUTH NEEDED
// ============================================

// Root
router.get("/", (req, res) => {
    res.json({
        success: true,
        name: "EchoBackend",
        version: "1.2",
        endpoints: {
            health: "/health",
            download: "/api/download",
            job: "/api/job/:id",
            dashboard: "/api/dashboard",
            web: "/dashboard"
        }
    });
});

// Health check
router.get("/health", healthController.health);

// ============================================
// 📌 API ROUTES - NO AUTH NEEDED
// ============================================

// Create download
router.post("/api/download", validateDownload, downloadController.createDownload);

// Get job status
router.get("/api/job/:id", statusController.getJobStatus);

// Dashboard data
router.get("/api/dashboard", dashboardController.getDashboard);

// ============================================
// 📌 WEB DASHBOARD
// ============================================

router.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

module.exports = router;