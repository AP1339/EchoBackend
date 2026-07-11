const express = require("express");
const path = require("path");

const router = express.Router();

const downloadController = require("./download.controller");
const statusController = require("./status.controller");
const healthController = require("./health.controller");
const dashboardController = require("./dashboard.controller");

const validateDownload = require("../middleware/validateDownload");

router.get("/", (req, res) => {

    res.json({

        success: true,

        name: "EchoBackend",

        version: "1.2"

    });

});

router.get("/health", healthController.health);

router.post(

    "/download",

    validateDownload,

    downloadController.createDownload

);

router.get("/job/:id", statusController.getJobStatus);

router.get("/api/dashboard", dashboardController.getDashboard);

router.get("/dashboard", (req, res) => {

    res.sendFile(

        path.join(__dirname, "..", "public", "index.html")

    );

});

module.exports = router;