const os = require("os");
const si = require("systeminformation");
const { createClient } = require("@supabase/supabase-js");

const queue = require("../queue/queue");

const startTime = Date.now();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.getDashboard = async (req, res) => {

    try {

        const jobs = queue.getAllJobs();

        const completed = jobs.filter(j => j.status === "completed").length;
        const failed = jobs.filter(j => j.status === "failed").length;
        const processing = jobs.filter(j => j.status === "processing").length;
        const queued = jobs.filter(j => j.status === "queued").length;

        const activeJobs = jobs
            .filter(j => j.status !== "completed" && j.status !== "failed")
            .map(j => ({
                id: j.id,
                status: j.status,
                stage: j.stage,
                progress: j.progress,
                fileName: j.fileName || "-"
            }));

        let supabaseStatus = "Disconnected";

        try {

            const { error } = await supabase
                .storage
                .from(process.env.SUPABASE_BUCKET)
                .list("", { limit: 1 });

            if (!error)
                supabaseStatus = "Connected";

        } catch {

            supabaseStatus = "Disconnected";

        }

        const [

            cpu,

            mem,

            battery,

            disks,

            network,

            currentLoad

        ] = await Promise.all([

            si.cpu(),

            si.mem(),

            si.battery(),

            si.fsSize(),

            si.networkInterfaces(),

            si.currentLoad()

        ]);

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

                usage: currentLoad.currentLoad.toFixed(1),

                model: cpu.brand,

                manufacturer: cpu.manufacturer,

                cores: cpu.cores,

                physicalCores: cpu.physicalCores,

                speed: cpu.speed

            },

            ram: {

                total: (mem.total / 1024 / 1024 / 1024).toFixed(2),

                used: (mem.active / 1024 / 1024 / 1024).toFixed(2),

                free: (mem.available / 1024 / 1024 / 1024).toFixed(2),

                process: (processMem.rss / 1024 / 1024).toFixed(2),

                heapUsed: (processMem.heapUsed / 1024 / 1024).toFixed(2),

                heapTotal: (processMem.heapTotal / 1024 / 1024).toFixed(2)

            },

            disk: disks.length ? {

                total: (disks[0].size / 1024 / 1024 / 1024).toFixed(2),

                free: (disks[0].available / 1024 / 1024 / 1024).toFixed(2),

                used: disks[0].use.toFixed(1)

            } : null,

            battery: battery.hasBattery ? {

                percent: battery.percent,

                charging: battery.isCharging

            } : {

                percent: null,

                charging: false

            },

            network: {

                localIP:

                    network.find(

                        n => !n.internal && n.ip4

                    )?.ip4 || "Unknown"

            },

            workers: {

                total: Number(process.env.WORKER_COUNT || 1),

                active: processing,

                idle: Number(process.env.WORKER_COUNT || 1) - processing

            },

            jobs: {

                total: jobs.length,

                queued,

                processing,

                completed,

                failed

            },

            downloadsSinceStart: completed,

            supabase: supabaseStatus,

            activeJobs

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};