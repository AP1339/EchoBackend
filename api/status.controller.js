const queue = require("../queue/queue");

function getJobStatus(req, res) {

    const id = req.params.id;

    const job = queue.getJob(id);

    if (!job) {

        return res.status(404).json({

            success: false,

            message: "Job not found"

        });

    }

    return res.json({

        success: true,

        jobId: job.id,

        status: job.status,

        stage: job.stage,

        progress: job.progress,

        downloadUrl: job.downloadUrl,

        error: job.error

    });

}

module.exports = {

    getJobStatus

};