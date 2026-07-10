const queue = require("../queue/queue");
const config = require("../config/config");
const cleanup = require("../cleanup/cleanup");
const cloudCleanup = require("../cleanup/cloudCleanup");
const downloaderFactory = require("../downloader/downloaderFactory");
const converter = require("../converter/ffmpeg");
const uploader = require("../storage/uploader");
const retry = require("../utils/retry");

console.log("Worker Manager Started...");

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processJob(job) {

    console.log(`Processing Job : ${job.id}`);

    queue.updateJob(job.id, {
        status: "processing",
        stage: "Initializing",
        progress: 0
    });

    await sleep(500);

    // --------------------------------
    // DOWNLOAD
    // --------------------------------

    const downloader = downloaderFactory.createDownloader();

    queue.updateJob(job.id, {
        stage: "Downloading",
        progress: 20
    });

    const result = await downloader.download(
        job,
        (progress) => {

            queue.updateJob(job.id, {
                stage: "Downloading",
                progress
            });

        }
    );

    if (!result.success)
        throw new Error("Download Failed");

    queue.updateJob(job.id, {
        stage: "Download Complete",
        progress: 60
    });

    await sleep(500);

    // --------------------------------
    // CONVERT
    // --------------------------------

    queue.updateJob(job.id, {
        stage: "Converting",
        progress: 70
    });

    const converted = await converter.convert(
        result.file,
        result.metadata,
        job.quality
    );

    if (!converted.success)
        throw new Error("Conversion Failed");

    queue.updateJob(job.id, {
        stage: "Conversion Complete",
        progress: 90
    });

    await sleep(500);

    // --------------------------------
    // UPLOAD
    // --------------------------------

    queue.updateJob(job.id, {
        stage: "Uploading",
        progress: 95
    });

    const uploaded = await retry(
        () => uploader.upload(converted.output),
        5,
        3000
    );

    if (!uploaded.success)
        throw new Error("Upload Failed");

    // --------------------------------
    // CLEANUP
    // --------------------------------

    await cleanup.deleteFile(result.file);

    await cleanup.deleteFile(converted.output);

    // --------------------------------
    // COMPLETE
    // --------------------------------

    queue.updateJob(job.id, {
        status: "completed",
        stage: "Completed",
        progress: 100,
        completedAt: Date.now(),
        expiresAt: Date.now() + config.JOB_EXPIRY,
        downloadUrl: uploaded.url,
        fileName: uploaded.originalName,
        storageKey: uploaded.storageFileName
    });

    console.log(`Completed : ${job.id}`);

}

async function workerLoop(workerId) {

    while (true) {

        const job = queue.getNextJob();

        if (job) {

            console.log(`Worker ${workerId} picked job ${job.id}`);

            try {

                await processJob(job);

            }

            catch (err) {

                console.error(err);

                queue.updateJob(job.id, {
                    status: "failed",
                    stage: "Failed",
                    error: err.message
                });

            }

        }

        await cloudCleanup();

        await sleep(config.WORKER_INTERVAL);

    }

}

// --------------------------------
// START WORKERS
// --------------------------------

for (let i = 1; i <= config.WORKER_COUNT; i++) {

    console.log(`Worker ${i} Started`);

    workerLoop(i);

}