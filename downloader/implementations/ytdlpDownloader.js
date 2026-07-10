const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const Downloader = require("../downloader");
const config = require("../../config/config");

class YtDlpDownloader extends Downloader {

    async getMetadata(url) {

        return new Promise((resolve, reject) => {

            let json = "";

            const process = spawn(config.YTDLP_PATH, [
                "-j",
                "--no-playlist",
                url
            ]);

            process.stdout.on("data", data => {
                json += data.toString();
            });

            process.stderr.on("data", data => {
                console.log(data.toString());
            });

            process.on("error", reject);

            process.on("close", code => {

                if (code !== 0)
                    return reject(new Error("Metadata extraction failed"));

                try {

                    const info = JSON.parse(json);

                    resolve({

                        title: info.title || "Unknown Title",

                        artist: info.uploader || "Unknown Artist",

                        album: "EchoPlayer Downloads"

                    });

                } catch (err) {

                    reject(err);

                }

            });

        });

    }

    async download(job, onProgress) {

        const metadata = await this.getMetadata(job.url);

        return new Promise((resolve, reject) => {

            const tempFolder = path.join(__dirname, "../../temp");

            if (!fs.existsSync(tempFolder))
                fs.mkdirSync(tempFolder);

            const output = path.join(
                tempFolder,
                `${job.id}.%(ext)s`
            );

            const args = [

                "--newline",

                "--no-playlist",

                "-f",
                "bestaudio",

                "-o",
                output,

                job.url

            ];

            const process = spawn(config.YTDLP_PATH, args);

            process.stdout.on("data", data => {

                const line = data.toString();

                console.log(line);

                const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);

                if (match && onProgress) {

                    onProgress(
                        Math.floor(Number(match[1]))
                    );

                }

            });

            process.stderr.on("data", data => {

                console.log(data.toString());

            });

            process.on("error", reject);

            process.on("close", code => {

                if (code !== 0)
                    return reject(new Error("Download failed"));

                const files = fs.readdirSync(tempFolder);

                const downloaded = files.find(file =>
                    file.startsWith(job.id)
                );

                if (!downloaded)
                    return reject(new Error("Downloaded file not found"));

                resolve({

                    success: true,

                    file: path.join(tempFolder, downloaded),

                    metadata

                });

            });

        });

    }

}

module.exports = YtDlpDownloader;