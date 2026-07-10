const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const config = require("../config/config");

class FFmpegConverter {

    async convert(inputFile, metadata, quality = "320") {

        return new Promise((resolve, reject) => {

            const outputFolder = path.join(__dirname, "../downloads");

            if (!fs.existsSync(outputFolder))
                fs.mkdirSync(outputFolder);

            const safeName = metadata.title
                .replace(/[<>:"/\\|?*]/g, "")
                .trim();

            const outputFile = path.join(

                outputFolder,

                `${safeName}.mp3`

            );

            const args = [

                "-y",

                "-i",
                inputFile,

                "-vn",

                "-codec:a",
                "libmp3lame",

                "-b:a",
                `${quality}k`,

                "-metadata",
                `title=${metadata.title}`,

                "-metadata",
                `artist=${metadata.artist}`,

                "-metadata",
                `album=${metadata.album}`,

                outputFile

            ];

            const ffmpeg = spawn(

                config.FFMPEG_PATH,

                args

            );

            ffmpeg.on("error", reject);

            ffmpeg.stderr.on("data", data => {

                console.log(data.toString());

            });

            ffmpeg.on("close", code => {

                if (code !== 0)
                    return reject(
                        new Error("FFmpeg failed")
                    );

                resolve({

                    success: true,

                    output: outputFile

                });

            });

        });

    }

}

module.exports = new FFmpegConverter();