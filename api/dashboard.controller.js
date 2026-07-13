const os = require("os");
const si = require("systeminformation");
const { createClient } = require("@supabase/supabase-js");
const queue = require("../queue/queue");

const startTime = Date.now();

// Use service role key for consistency
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.getDashboard = async (req, res) => {
    try {
        const jobs = queue.getAllJobs();

        // Job stats with safe defaults
        const stats = {
            completed: 0,
            failed: 0,
            processing: 0,
            queued: 0
        };

        jobs.forEach(job => {
            if (job.status === "completed") stats.completed++;
            else if (job.status === "failed") stats.failed++;
            else if (job.status === "processing") stats.processing++;
            else if (job.status === "queued") stats.queued++;
        });

        // Active jobs (exclude completed/failed)
        const activeJobs = jobs
            .filter(j => j.status !== "completed" && j.status !== "failed")
            .map(j => ({
                id: j.id || "unknown",
                status: j.status || "unknown",
                stage: j.stage || "Unknown",
                progress: typeof j.progress === "number" ? j.progress : 0,
                fileName: j.fileName || "-"
            }))
            .slice(0, 50); // Limit to prevent huge payloads

        // Supabase connectivity check
        let supabaseStatus = "Disconnected";
        try {
            const { error } = await supabase
                .storage
                .from(process.env.SUPABASE_BUCKET)
                .list("", { limit: 1, offset: 0 });
            
            if (!error) supabaseStatus = "Connected";
        } catch (err) {
            console.error("Supabase check failed:", err.message);
            supabaseStatus = "Error";
        }

        // Collect system info with timeout
        const timeout = (promise, ms = 5000) => {
            return Promise.race([
                promise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Timeout")), ms)
                )
            ]);
        };

        let cpu, mem, battery, disks, network, currentLoad;
        
        try {
            [cpu, mem, battery, disks, network, currentLoad] = await Promise.all([
                timeout(si.cpu()),
                timeout(si.mem()),
                timeout(si.battery().catch(() => ({ hasBattery: false }))),
                timeout(si.fsSize()),
                timeout(si.networkInterfaces()),
                timeout(si.currentLoad())
            ]);
        } catch (err) {
            console.error("System info collection error:", err.message);
            // Provide fallback data
            cpu = { brand: "Unknown", cores: 0, physicalCores: 0, speed: 0 };
            mem = { total: 0, active: 0, available: 0 };
            battery = { hasBattery: false, percent: null, isCharging: false };
            disks = [];
            network = [];
            currentLoad = { currentLoad: 0 };
        }

        const processMem = process.memoryUsage();
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = uptime % 60;

        res.json({
            server: "Running",
            version: "1.2",
            uptime: `${h}h ${m}m ${s}s`,
            platform: os.platform(),
            hostname: os.hostname(),
            node: process.version,
            architecture: os.arch(),
            cpu: {
                usage: currentLoad.currentLoad ? currentLoad.currentLoad.toFixed(1) : "0.0",
                model: cpu.brand || "Unknown",
                manufacturer: cpu.manufacturer || "Unknown",
                cores: cpu.cores || 0,
                physicalCores: cpu.physicalCores || 0,
                speed: cpu.speed || 0
            },
            ram: {
                total: mem.total ? (mem.total / 1024 / 1024 / 1024).toFixed(2) : "0.00",
                used: mem.active ? (mem.active / 1024 / 1024 / 1024).toFixed(2) : "0.00",
                free: mem.available ? (mem.available / 1024 / 1024 / 1024).toFixed(2) : "0.00",
                process: (processMem.rss / 1024 / 1024).toFixed(2),
                heapUsed: (processMem.heapUsed / 1024 / 1024).toFixed(2),
                heapTotal: (processMem.heapTotal / 1024 / 1024).toFixed(2)
            },
            disk: disks && disks.length ? {
                total: (disks[0].size / 1024 / 1024 / 1024).toFixed(2),
                free: (disks[0].available / 1024 / 1024 / 1024).toFixed(2),
                used: disks[0].use ? disks[0].use.toFixed(1) : "0.0"
            } : null,
            battery: {
                percent: battery.hasBattery ? battery.percent : null,
                charging: battery.hasBattery ? battery.isCharging : false
            },
            network: {
                localIP: network.find(n => !n.internal && n.ip4)?.ip4 || "Unknown"
            },
            workers: {
                total: Number(process.env.WORKER_COUNT || 1),
                active: stats.processing,
                idle: Math.max(0, Number(process.env.WORKER_COUNT || 1) - stats.processing)
            },
            jobs: {
                total: jobs.length || 0,
                queued: stats.queued || 0,
                processing: stats.processing || 0,
                completed: stats.completed || 0,
                failed: stats.failed || 0
            },
            downloadsSinceStart: stats.completed || 0,
            supabase: supabaseStatus,
            activeJobs
        });

    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).json({
            success: false,
            message: err.message || "Failed to load dashboard"
        });
    }
};