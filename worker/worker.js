const queue = require("../queue/queue");
const config = require("../config/config");
const cleanup = require("../cleanup/cleanup");
const cloudCleanup = require("../cleanup/cloudCleanup");
const downloaderFactory = require("../downloader/downloaderFactory");
const converter = require("../converter/ffmpeg");
const uploader = require("../storage/uploader");
const retry = require("../utils/retry");

console.log("⚙️ Worker Manager Started...");

// ========================================
// 🛡️ WORKER CRASH PROTECTION
// ========================================

let activeWorkers = 0;
let workerErrors = new Map();

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// 🔄 PROCESS JOB WITH FULL ERROR HANDLING
// ========================================

async function processJob(job) {
    try {
        console.log(`🔨 Processing Job: ${job.id}`);

        // Reset job if it was in error state
        if (job.status === "failed") {
            queue.updateJob(job.id, {
                status: "processing",
                stage: "Retrying",
                progress: 0,
                error: null
            });
        }

        queue.updateJob(job.id, {
            status: "processing",
            stage: "Initializing",
            progress: 0
        });

        await sleep(500);

        // ========== DOWNLOAD ==========
        try {
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
                        progress: Math.min(60, 20 + (progress * 0.4))
                    });
                }
            );

            if (!result.success) {
                throw new Error("Download failed");
            }

            job._tempFile = result.file;

            queue.updateJob(job.id, {
                stage: "Download Complete",
                progress: 60
            });

            await sleep(500);

        } catch (err) {
            console.error(`❌ Download failed for ${job.id}:`, err.message);
            // Cleanup temp files
            if (job._tempFile) {
                await cleanup.deleteFile(job._tempFile);
            }
            throw new Error(`Download failed: ${err.message}`);
        }

        // ========== CONVERT ==========
        try {
            queue.updateJob(job.id, {
                stage: "Converting",
                progress: 70
            });

            const converted = await converter.convert(
                job._tempFile,
                { title: job.metadata?.title || "Audio", artist: job.metadata?.artist || "Unknown" },
                job.quality
            );

            if (!converted.success) {
                throw new Error("Conversion failed");
            }

            job._convertedFile = converted.output;

            queue.updateJob(job.id, {
                stage: "Conversion Complete",
                progress: 90
            });

            await sleep(500);

        } catch (err) {
            console.error(`❌ Conversion failed for ${job.id}:`, err.message);
            if (job._tempFile) {
                await cleanup.deleteFile(job._tempFile);
            }
            throw new Error(`Conversion failed: ${err.message}`);
        }

        // ========== UPLOAD ==========
        try {
            queue.updateJob(job.id, {
                stage: "Uploading",
                progress: 95
            });

            console.log(`📤 Uploading job: ${job.id}`);

            const uploaded = await retry(async () => {
                console.log(`📤 Upload attempt for: ${job.id}`);
                return await uploader.upload(job._convertedFile);
            }, 5, 3000);

            console.log(`✅ Upload completed: ${job.id}`);

            if (!uploaded.success) {
                throw new Error("Upload failed");
            }

            // Store upload info
            job.uploaded = uploaded;

        } catch (err) {
            console.error(`❌ Upload failed for ${job.id}:`, err.message);
            throw new Error(`Upload failed: ${err.message}`);
        }

        // ========== CLEANUP ==========
        try {
            if (job._tempFile) {
                await cleanup.deleteFile(job._tempFile);
            }
            if (job._convertedFile) {
                await cleanup.deleteFile(job._convertedFile);
            }
        } catch (err) {
            console.warn(`⚠️ Cleanup warning for ${job.id}:`, err.message);
            // Don't fail job because of cleanup
        }

        // ========== COMPLETE ==========
        queue.updateJob(job.id, {
            status: "completed",
            stage: "Completed",
            progress: 100,
            completedAt: Date.now(),
            expiresAt: Date.now() + config.JOB_EXPIRY,
            downloadUrl: job.uploaded.url,
            fileName: job.uploaded.originalName,
            storageKey: job.uploaded.storageFileName
        });

        console.log(`✅ Completed: ${job.id}`);

    } catch (err) {
        console.error(`❌ Job ${job.id} failed:`, err.message);
        
        // Cleanup on failure
        try {
            if (job._tempFile) {
                await cleanup.deleteFile(job._tempFile);
            }
            if (job._convertedFile) {
                await cleanup.deleteFile(job._convertedFile);
            }
        } catch (cleanupErr) {
            console.warn(`⚠️ Cleanup error for ${job.id}:`, cleanupErr.message);
        }

        queue.updateJob(job.id, {
            status: "failed",
            stage: "Failed",
            error: err.message,
            progress: 0
        });
        
        // Re-throw for worker loop to handle
        throw err;
    }
}

// ========================================
// 👷 WORKER LOOP WITH CRASH PROTECTION
// ========================================

async function workerLoop(workerId) {
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;
    let isWorkerActive = true;

    console.log(`👷 Worker ${workerId} started`);

    while (isWorkerActive) {
        try {
            // Get next job
            const job = queue.getNextJob();

            if (job) {
                console.log(`👷 Worker ${workerId} picked job ${job.id}`);
                
                try {
                    await processJob(job);
                    consecutiveErrors = 0; // Reset on success
                } catch (err) {
                    // Job failed but worker continues
                    consecutiveErrors++;
                    console.error(`⚠️ Worker ${workerId} job error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err.message);
                    
                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        console.error(`❌ Worker ${workerId} has too many consecutive errors. Restarting worker...`);
                        // Reset and wait
                        consecutiveErrors = 0;
                        await sleep(5000);
                    }
                }
            }

            // Run cloud cleanup periodically (every 10 jobs)
            if (Math.random() < 0.1) {
                try {
                    await cloudCleanup();
                } catch (cleanupErr) {
                    console.error(`🧹 Cloud cleanup error (Worker ${workerId}):`, cleanupErr.message);
                    // Don't crash, continue
                }
            }

            // Wait before next iteration
            await sleep(config.WORKER_INTERVAL || 1000);

        } catch (err) {
            console.error(`💥 Worker ${workerId} loop error:`, err.message);
            consecutiveErrors++;
            
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS * 2) {
                console.error(`❌ Worker ${workerId} has critical errors. Restarting after delay...`);
                consecutiveErrors = 0;
                await sleep(10000);
            }
        }
    }
}

// ========================================
// 🚀 START WORKERS WITH MONITORING
// ========================================

const workerCount = Math.max(1, Math.min(config.WORKER_COUNT || 1, 3)); // Max 3 workers
console.log(`🚀 Starting ${workerCount} worker(s)...`);

// Start workers with delay between them
for (let i = 1; i <= workerCount; i++) {
    setTimeout(() => {
        // Start worker in a separate promise to catch errors
        workerLoop(i).catch(err => {
            console.error(`💀 Worker ${i} died:`, err.message);
            // Restart worker after delay
            setTimeout(() => {
                console.log(`🔄 Restarting Worker ${i}...`);
                workerLoop(i).catch(e => {
                    console.error(`💀 Worker ${i} restart failed:`, e.message);
                });
            }, 5000);
        });
    }, i * 200);
}

console.log(`✅ ${workerCount} worker(s) started successfully`);

// ========================================
// 📊 WORKER HEALTH CHECK
// ========================================

setInterval(() => {
    const jobStats = queue.getJobStats ? queue.getJobStats() : { total: 0 };
    console.log(`💚 Workers: ${workerCount} active | Jobs: ${jobStats.total} total`);
}, 60000); // Every minute

// ========================================
// 🛡️ PROCESS CRASH PROTECTION
// ========================================

// Handle uncaught errors in worker
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Worker Unhandled Rejection:', reason);
    // Don't crash, log and continue
});

process.on('uncaughtException', (error) => {
    console.error('❌ Worker Uncaught Exception:', error);
    // Don't crash, log and continue
});

console.log('✅ Worker manager ready!');