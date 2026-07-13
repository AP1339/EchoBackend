const jobs = new Map();
const waitingQueue = [];
const MAX_JOBS = 500; // Prevent memory issues

// ========================================
// 🛡️ QUEUE CRASH PROTECTION
// ========================================

function addJob(job) {
    try {
        // Prevent queue overflow
        if (jobs.size >= MAX_JOBS) {
            console.warn(`⚠️ Queue at capacity (${MAX_JOBS}), cleaning old jobs...`);
            
            // Remove oldest completed/failed jobs
            const entries = Array.from(jobs.entries());
            const completed = entries.filter(([_, j]) => 
                j.status === "completed" || j.status === "failed"
            );
            
            if (completed.length > 0) {
                const toRemove = Math.min(completed.length, Math.floor(MAX_JOBS * 0.2));
                for (let i = 0; i < toRemove; i++) {
                    const [id] = completed[i];
                    jobs.delete(id);
                }
                console.log(`🧹 Cleaned ${toRemove} old jobs`);
            } else {
                // All jobs are active, can't remove
                console.warn(`⚠️ Queue full with active jobs`);
                throw new Error("Queue is full. Please try again later.");
            }
        }

        jobs.set(job.id, job);
        waitingQueue.push(job.id);
        console.log(`📊 Queue size: ${jobs.size} (${waitingQueue.length} waiting)`);
        
        return true;
        
    } catch (err) {
        console.error('❌ Failed to add job:', err.message);
        throw err;
    }
}

function getNextJob() {
    try {
        if (waitingQueue.length === 0) return null;
        
        // Clean up any stale entries
        while (waitingQueue.length > 0) {
            const id = waitingQueue[0];
            if (jobs.has(id)) {
                break;
            }
            waitingQueue.shift(); // Remove stale ID
        }

        if (waitingQueue.length === 0) return null;
        
        const id = waitingQueue.shift();
        const job = jobs.get(id);
        
        // Verify job is valid
        if (!job || (job.status !== "queued" && job.status !== "failed")) {
            console.warn(`⚠️ Skipping invalid job: ${id}`);
            return getNextJob(); // Recursive cleanup
        }
        
        return job;
        
    } catch (err) {
        console.error('❌ Error getting next job:', err.message);
        return null;
    }
}

function deleteJob(id) {
    try {
        const result = jobs.delete(id);
        if (result) {
            console.log(`🗑️ Job deleted: ${id}`);
        }
        return result;
    } catch (err) {
        console.error(`❌ Error deleting job ${id}:`, err.message);
        return false;
    }
}

function getJob(id) {
    try {
        return jobs.get(id);
    } catch (err) {
        console.error(`❌ Error getting job ${id}:`, err.message);
        return null;
    }
}

function updateJob(id, updates) {
    try {
        const job = jobs.get(id);
        if (!job) {
            console.warn(`⚠️ Job not found for update: ${id}`);
            return false;
        }
        
        // Don't allow updates to completed/failed jobs
        if ((job.status === "completed" || job.status === "failed") && 
            updates.status && 
            updates.status !== "completed" && 
            updates.status !== "failed") {
            console.warn(`⚠️ Attempted to update completed/failed job: ${id}`);
            return false;
        }

        Object.assign(job, updates);
        return true;
        
    } catch (err) {
        console.error(`❌ Error updating job ${id}:`, err.message);
        return false;
    }
}

function getQueueLength() {
    try {
        return waitingQueue.length;
    } catch (err) {
        return 0;
    }
}

function getAllJobs() {
    try {
        return Array.from(jobs.values());
    } catch (err) {
        console.error('❌ Error getting all jobs:', err.message);
        return [];
    }
}

function getJobStats() {
    try {
        const stats = { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 };
        
        for (const job of jobs.values()) {
            stats.total++;
            if (job.status === "queued") stats.queued++;
            else if (job.status === "processing") stats.processing++;
            else if (job.status === "completed") stats.completed++;
            else if (job.status === "failed") stats.failed++;
        }
        
        return stats;
    } catch (err) {
        console.error('❌ Error getting job stats:', err.message);
        return { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 };
    }
}

// ========================================
// 🧹 AUTO CLEANUP WITH CRASH PROTECTION
// ========================================

setInterval(() => {
    try {
        const now = Date.now();
        let expired = 0;
        
        for (const [id, job] of jobs) {
            if (job.status === "completed" && job.expiresAt && job.expiresAt <= now) {
                jobs.delete(id);
                expired++;
            }
        }
        
        if (expired > 0) {
            console.log(`🧹 Auto-cleaned ${expired} expired jobs`);
        }
    } catch (err) {
        console.error('❌ Auto-cleanup error:', err.message);
        // Don't crash
    }
}, 300000); // 5 minutes

// ========================================
// 📊 RECOVERY: Fix stuck jobs on startup
// ========================================

setTimeout(() => {
    try {
        let stuck = 0;
        const now = Date.now();
        
        for (const [id, job] of jobs) {
            // Jobs stuck in processing for > 5 minutes
            if (job.status === "processing" && job.createdAt && 
                (now - job.createdAt) > 300000) {
                console.warn(`⚠️ Found stuck job: ${id}, resetting...`);
                job.status = "queued";
                job.stage = "Retry";
                job.progress = 0;
                waitingQueue.push(id);
                stuck++;
            }
        }
        
        if (stuck > 0) {
            console.log(`🔄 Reset ${stuck} stuck jobs`);
        }
    } catch (err) {
        console.error('❌ Recovery check error:', err.message);
    }
}, 5000); // After 5 seconds

module.exports = {
    addJob,
    getJob,
    getNextJob,
    updateJob,
    getQueueLength,
    getAllJobs,
    deleteJob,
    getJobStats,
    MAX_JOBS
};