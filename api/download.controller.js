const { v4: uuid } = require("uuid");
const queue = require("../queue/queue");

exports.createDownload = (req, res, next) => {

    try {

        const { url, quality } = req.body;

        const job = {

            id: uuid(),

            url,

            quality: quality || "320",

            status: "queued",

            stage: "Waiting",

            progress: 0,

            createdAt: Date.now()

        };

        queue.addJob(job);

        console.log(`Job Created : ${job.id}`);

        res.status(201).json({

            success: true,

            jobId: job.id

        });

    }

    catch (err) {

        next(err);

    }

};

exports.getJob = (req, res, next) => {

    try {

        const job = queue.getJob(req.params.id);

        if (!job) {

            return res.status(404).json({

                success: false,

                message: "Job Not Found"

            });

        }

        res.json({

            success: true,

            jobId: job.id,

            status: job.status,

            stage: job.stage,

            progress: job.progress,

            fileName: job.fileName || null,

            downloadUrl: job.downloadUrl || null,

            error: job.error || null

        });

    }

    catch (err) {

        next(err);

    }

};