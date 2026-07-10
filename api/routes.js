const express = require("express");

const router = express.Router();

const downloadController = require("./download.controller");
const statusController = require("./status.controller");
const healthController = require("./health.controller");

const validateDownload = require("../middleware/validateDownload");

router.get("/", (req, res) => {

    res.json({

        success: true,

        name: "EchoBackend",

        version: "1.1"

    });

});

router.get("/health", healthController.health);

router.post(

    "/download",

    validateDownload,

    downloadController.createDownload

);

router.get("/job/:id", statusController.getJobStatus);

module.exports = router;