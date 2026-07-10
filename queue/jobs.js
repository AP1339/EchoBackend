class Job {

    constructor(url, quality) {

        this.id = null;

        this.url = url;

        this.quality = quality;

        this.status = "queued";

        this.stage = "Waiting";

        this.progress = 0;

        this.downloadUrl = null;

        this.error = null;

        this.createdAt = Date.now();

        this.completedAt = null;

        this.expiresAt = null;

    }

}

module.exports = Job;