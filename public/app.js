async function loadDashboard() {

    try {

        const res = await fetch("/api/dashboard");

        const data = await res.json();

        // =========================
        // SERVER
        // =========================

        document.getElementById("version").textContent = data.version;

        document.getElementById("uptime").textContent = data.uptime;

        document.getElementById("platform").textContent = data.platform;

        document.getElementById("architecture").textContent = data.architecture;

        document.getElementById("hostname").textContent = data.hostname;

        document.getElementById("node").textContent = data.node;

        // =========================
        // CPU
        // =========================

        document.getElementById("cpuUsage").textContent =
            data.cpu.usage + " %";

        document.getElementById("cpuModel").textContent =
            data.cpu.model;

        document.getElementById("cpuCores").textContent =
            data.cpu.cores;

        document.getElementById("cpuPhysical").textContent =
            data.cpu.physicalCores;

        document.getElementById("cpuSpeed").textContent =
            data.cpu.speed + " GHz";

        // =========================
        // RAM
        // =========================

        document.getElementById("ramUsed").textContent =
            data.ram.used + " GB";

        document.getElementById("ramFree").textContent =
            data.ram.free + " GB";

        document.getElementById("ramTotal").textContent =
            data.ram.total + " GB";

        document.getElementById("processRam").textContent =
            data.ram.process + " MB";

        document.getElementById("heapUsed").textContent =
            data.ram.heapUsed + " MB";

        document.getElementById("heapTotal").textContent =
            data.ram.heapTotal + " MB";

        // =========================
        // DISK
        // =========================

        if (data.disk) {

            document.getElementById("diskUsed").textContent =
                data.disk.used + " %";

            document.getElementById("diskFree").textContent =
                data.disk.free + " GB";

            document.getElementById("diskTotal").textContent =
                data.disk.total + " GB";

        }

        // =========================
        // NETWORK
        // =========================

        document.getElementById("localIP").textContent =
            data.network.localIP;

        document.getElementById("supabase").textContent =
            data.supabase;

        // =========================
        // BATTERY
        // =========================

        if (data.battery.percent === null) {

            document.getElementById("battery").textContent =
                "No Battery";

        } else {

            document.getElementById("battery").textContent =
                data.battery.percent + " %";

        }

        document.getElementById("charging").textContent =
            data.battery.charging ? "Yes" : "No";

        // =========================
        // WORKERS
        // =========================

        document.getElementById("workersTotal").textContent =
            data.workers.total;

        document.getElementById("workersActive").textContent =
            data.workers.active;

        document.getElementById("workersIdle").textContent =
            data.workers.idle;

        // =========================
        // JOBS
        // =========================

        document.getElementById("jobsTotal").textContent =
            data.jobs.total;

        document.getElementById("jobsQueued").textContent =
            data.jobs.queued;

        document.getElementById("jobsProcessing").textContent =
            data.jobs.processing;

        document.getElementById("jobsCompleted").textContent =
            data.jobs.completed;

        document.getElementById("jobsFailed").textContent =
            data.jobs.failed;

        document.getElementById("downloads").textContent =
            data.downloadsSinceStart;

        // =========================
        // ACTIVE JOBS
        // =========================

        const tbody = document.getElementById("jobTable");

        tbody.innerHTML = "";

        if (data.activeJobs.length === 0) {

            tbody.innerHTML = `

                <tr>

                    <td colspan="5">

                        No Active Jobs

                    </td>

                </tr>

            `;

        } else {

            data.activeJobs.forEach(job => {

                const tr = document.createElement("tr");

                tr.innerHTML = `

                    <td>${job.id.substring(0,8)}</td>

                    <td>${job.fileName}</td>

                    <td class="${job.status}">

                        ${job.status}

                    </td>

                    <td>${job.stage}</td>

                    <td>

                        <div class="progress">

                            <div style="width:${job.progress}%"></div>

                        </div>

                        ${job.progress}%

                    </td>

                `;

                tbody.appendChild(tr);

            });

        }

    }

    catch (err) {

        console.error(err);

    }

}

loadDashboard();

setInterval(loadDashboard,1000);