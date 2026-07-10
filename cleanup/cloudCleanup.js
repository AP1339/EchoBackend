const queue = require("../queue/queue");
const uploader = require("../storage/uploader");

async function cloudCleanup() {

    const jobs = queue.getAllJobs();

    const now = Date.now();

    for (const job of jobs) {

        if (

            job.status === "completed" &&

            job.expiresAt &&

            job.expiresAt <= now &&

            job.storageKey

        ) {

            try {

                await uploader.delete(job.storageKey);

                console.log(`Deleted Cloud File : ${job.storageKey}`);

                queue.deleteJob(job.id);

                console.log(`Deleted Job : ${job.id}`);

            }

            catch (err) {

                console.error(`Cloud Cleanup Failed : ${job.id}`);

                console.error(err.message);

            }

        }

    }

}

module.exports = cloudCleanup;