const jobs = new Map();

const waitingQueue = [];

function addJob(job) {

    jobs.set(job.id, job);

    waitingQueue.push(job.id);

}

function getNextJob() {

    if (waitingQueue.length === 0)
        return null;

    const id = waitingQueue.shift();

    return jobs.get(id);

}

function deleteJob(id) {

    jobs.delete(id);

}

function getJob(id) {

    return jobs.get(id);

}

function updateJob(id, updates) {

    const job = jobs.get(id);

    if (!job)
        return;

    Object.assign(job, updates);

}

function getQueueLength() {

    return waitingQueue.length;

}

function getAllJobs() {

    return Array.from(jobs.values());

}


module.exports = {

    addJob,

    getJob,

    getNextJob,

    updateJob,

    getQueueLength,

    getAllJobs,

    deleteJob

};