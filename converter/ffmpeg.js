const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const config = require("../config/config");

class FFmpegConverter {
    async convert(inputFile, metadata, quality = "320") {
        return new Promise((resolve, reject) => {
            const outputFolder = path.join(__dirname, "../downloads");
            
            if (!fs.existsSync(outputFolder)) {
                fs.mkdirSync(outputFolder, { recursive: true });
            }

            // Sanitize filename
            let baseName = metadata.title
                .replace(/[<>:"/\\|?*]/g, "")
                .trim()
                .substring(0, 200); // Limit length

            // If empty, use timestamp
            if (!baseName) {
                baseName = `audio_${Date.now()}`;
            }

            // Add timestamp to prevent overwrites
            const timestamp = Date.now();
            const outputFile = path.join(
                outputFolder, 
                `${baseName}_${timestamp}.mp3`
            );

            // Check if file already exists (add number suffix)
            let finalOutput = outputFile;
            let counter = 1;
            while (fs.existsSync(finalOutput)) {
                const ext = path.extname(outputFile);
                const base = outputFile.replace(ext, '');
                finalOutput = `${base}_${counter}${ext}`;
                counter++;
            }

            console.log(`🎵 Converting: ${inputFile} -> ${finalOutput}`);

            const args = [
                "-y",
                "-i", inputFile,
                "-vn",
                "-codec:a", "libmp3lame",
                "-b:a", `${quality}k`,
                "-metadata", `title=${metadata.title}`,
                "-metadata", `artist=${metadata.artist}`,
                "-metadata", `album=${metadata.album}`,
                finalOutput
            ];

            const ffmpeg = spawn(config.FFMPEG_PATH, args);

            let stderr = "";

            ffmpeg.stderr.on("data", data => {
                const text = data.toString();
                stderr += text;
                console.log(`🔊 ${text.trim()}`);
            });

            ffmpeg.on("error", (err) => {
                reject(new Error(`FFmpeg error: ${err.message}`));
            });

            ffmpeg.on("close", code => {
                if (code !== 0) {
                    console.error("FFmpeg stderr:", stderr);
                    return reject(new Error(`FFmpeg failed with code ${code}`));
                }

                // Verify file exists
                if (!fs.existsSync(finalOutput)) {
                    return reject(new Error("Output file not created"));
                }

                console.log(`✅ Conversion complete: ${finalOutput}`);
                resolve({
                    success: true,
                    output: finalOutput
                });
            });
        });
    }
}

module.exports = new FFmpegConverter();