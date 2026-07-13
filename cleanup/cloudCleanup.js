const queue = require("../queue/queue");
const uploader = require("../storage/uploader");

async function cloudCleanup() {
    try {
        const jobs = queue.getAllJobs();
        const now = Date.now();
        let cleaned = 0;

        for (const job of jobs) {
            if (job.status === "completed" && 
                job.expiresAt && 
                job.expiresAt <= now && 
                job.storageKey) {
                
                try {
                    await uploader.delete(job.storageKey);
                    console.log(`🗑️ Deleted cloud file: ${job.storageKey}`);
                    
                    // Remove from queue
                    queue.deleteJob(job.id);
                    console.log(`🗑️ Removed job: ${job.id}`);
                    cleaned++;
                    
                } catch (err) {
                    console.error(`❌ Cloud cleanup failed for ${job.id}:`, err.message);
                    // Don't throw, continue with other jobs
                }
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cloud cleanup completed: ${cleaned} files deleted`);
        }

        return cleaned;

    } catch (err) {
        console.error("Cloud cleanup error:", err.message);
        return 0;
    }
}

module.exports = cloudCleanup;