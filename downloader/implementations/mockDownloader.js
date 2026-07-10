const fs = require("fs");
const path = require("path");

const Downloader = require("../downloader");

class MockDownloader extends Downloader {

    async download(job) {

        const folder = path.join(__dirname, "../../temp");

        if (!fs.existsSync(folder))
            fs.mkdirSync(folder);

        const file = path.join(folder, `${job.id}.webm`);

        fs.writeFileSync(file, "Mock Audio File");

        return {

            success: true,

            file

        };

    }

}

module.exports = MockDownloader;