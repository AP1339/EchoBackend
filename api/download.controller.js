const { v4: uuid } = require("uuid");
const queue = require("../queue/queue");
const config = require("../config/config");

exports.createDownload = (req, res, next) => {
    try {
        const { url, quality } = req.body;

        // Validate URL format
        if (!url) {
            return res.status(400).json({
                success: false,
                message: "URL is required"
            });
        }

        // Check if URL is valid YouTube
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
        if (!youtubeRegex.test(url)) {
            return res.status(400).json({
                success: false,
                message: "Invalid YouTube URL"
            });
        }

        // Validate quality
        const allowedQualities = ["128", "192", "256", "320"];
        const finalQuality = quality && allowedQualities.includes(String(quality)) 
            ? quality 
            : config.DEFAULT_QUALITY;

        // Check for duplicate active jobs (optional - prevent duplicates)
        const existingJobs = queue.getAllJobs();
        const duplicate = existingJobs.find(j => 
            j.url === url && 
            (j.status === "queued" || j.status === "processing")
        );

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "This URL is already being processed",
                jobId: duplicate.id
            });
        }

        const job = {
            id: uuid(),
            url,
            quality: finalQuality,
            status: "queued",
            stage: "Waiting",
            progress: 0,
            createdAt: Date.now(),
            completedAt: null,
            expiresAt: null,
            fileName: null,
            downloadUrl: null,
            storageKey: null,
            error: null,
            retryCount: 0
        };

        queue.addJob(job);

        console.log(`📥 Job Created: ${job.id} - ${url.substring(0, 50)}...`);

        res.status(201).json({
            success: true,
            jobId: job.id,
            message: "Job created successfully"
        });

    } catch (err) {
        console.error("Download creation error:", err);
        next(err);
    }
};