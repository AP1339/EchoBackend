// public/app.js - NO AUTH VERSION
const API_BASE = '/api';

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Update status
        document.getElementById("status").textContent = "● RUNNING";
        document.getElementById("status").style.color = "#4ade80";

        // SERVER
        document.getElementById("version").textContent = data.version || "-";
        document.getElementById("uptime").textContent = data.uptime || "-";
        document.getElementById("platform").textContent = data.platform || "-";
        document.getElementById("architecture").textContent = data.architecture || "-";
        document.getElementById("hostname").textContent = data.hostname || "-";
        document.getElementById("node").textContent = data.node || "-";

        // CPU
        document.getElementById("cpuUsage").textContent = data.cpu?.usage || "0.0 %";
        document.getElementById("cpuModel").textContent = data.cpu?.model || "-";
        document.getElementById("cpuCores").textContent = data.cpu?.cores || "-";
        document.getElementById("cpuPhysical").textContent = data.cpu?.physicalCores || "-";
        document.getElementById("cpuSpeed").textContent = data.cpu?.speed ? `${data.cpu.speed} GHz` : "-";

        // RAM
        document.getElementById("ramUsed").textContent = data.ram?.used ? `${data.ram.used} GB` : "-";
        document.getElementById("ramFree").textContent = data.ram?.free ? `${data.ram.free} GB` : "-";
        document.getElementById("ramTotal").textContent = data.ram?.total ? `${data.ram.total} GB` : "-";
        document.getElementById("processRam").textContent = data.ram?.process ? `${data.ram.process} MB` : "-";
        document.getElementById("heapUsed").textContent = data.ram?.heapUsed ? `${data.ram.heapUsed} MB` : "-";
        document.getElementById("heapTotal").textContent = data.ram?.heapTotal ? `${data.ram.heapTotal} MB` : "-";

        // DISK
        if (data.disk) {
            document.getElementById("diskUsed").textContent = `${data.disk.used} %`;
            document.getElementById("diskFree").textContent = `${data.disk.free} GB`;
            document.getElementById("diskTotal").textContent = `${data.disk.total} GB`;
        } else {
            document.getElementById("diskUsed").textContent = "N/A";
            document.getElementById("diskFree").textContent = "N/A";
            document.getElementById("diskTotal").textContent = "N/A";
        }

        // NETWORK
        document.getElementById("localIP").textContent = data.network?.localIP || "Unknown";
        document.getElementById("supabase").textContent = data.supabase || "Disconnected";

        // BATTERY
        if (data.battery?.percent === null) {
            document.getElementById("battery").textContent = "No Battery";
        } else {
            document.getElementById("battery").textContent = data.battery?.percent ? `${data.battery.percent} %` : "N/A";
        }
        document.getElementById("charging").textContent = data.battery?.charging ? "Yes" : "No";

        // WORKERS
        document.getElementById("workersTotal").textContent = data.workers?.total || 0;
        document.getElementById("workersActive").textContent = data.workers?.active || 0;
        document.getElementById("workersIdle").textContent = data.workers?.idle || 0;

        // JOBS
        document.getElementById("jobsTotal").textContent = data.jobs?.total || 0;
        document.getElementById("jobsQueued").textContent = data.jobs?.queued || 0;
        document.getElementById("jobsProcessing").textContent = data.jobs?.processing || 0;
        document.getElementById("jobsCompleted").textContent = data.jobs?.completed || 0;
        document.getElementById("jobsFailed").textContent = data.jobs?.failed || 0;
        document.getElementById("downloads").textContent = data.downloadsSinceStart || 0;

        // ACTIVE JOBS
        const tbody = document.getElementById("jobTable");
        tbody.innerHTML = "";

        if (!data.activeJobs || data.activeJobs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#7a888e;">No Active Jobs</td></tr>`;
        } else {
            data.activeJobs.slice(0, 50).forEach(job => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${job.id?.substring(0,8) || "N/A"}</td>
                    <td>${job.fileName || "-"}</td>
                    <td class="${job.status || "queued"}">${job.status || "unknown"}</td>
                    <td>${job.stage || "Unknown"}</td>
                    <td>
                        <div class="progress">
                            <div style="width:${Math.min(100, job.progress || 0)}%"></div>
                        </div>
                        ${Math.min(100, job.progress || 0)}%
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById("status").textContent = `● ${new Date().toLocaleTimeString()}`;

    } catch (err) {
        console.error("Dashboard error:", err);
        document.getElementById("status").textContent = "● ERROR";
        document.getElementById("status").style.color = "#ef4444";
        
        const tbody = document.getElementById("jobTable");
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;">Error: ${err.message}</td></tr>`;
    }
}

// Initial load
loadDashboard();

// Auto-refresh every 5 seconds
setInterval(loadDashboard, 5000);