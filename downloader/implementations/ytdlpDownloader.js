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
                if (code !== 0) {
                    return reject(new Error("Metadata extraction failed"));
                }
                
                try {
                    const info = JSON.parse(json);
                    resolve({
                        title: info.title || "Unknown Title",
                        artist: info.uploader || "Unknown Artist",
                        album: "EchoPlayer Downloads"
                    });
                } catch (err) {
                    reject(new Error(`Failed to parse metadata: ${err.message}`));
                }
            });
        });
    }

    async download(job, onProgress) {
        try {
            const metadata = await this.getMetadata(job.url);
            
            return new Promise((resolve, reject) => {
                const tempFolder = path.join(__dirname, "../../temp");
                if (!fs.existsSync(tempFolder)) {
                    fs.mkdirSync(tempFolder, { recursive: true });
                }

                // Use .%(ext)s to keep original extension
                const outputTemplate = path.join(tempFolder, `${job.id}.%(ext)s`);
                
                const args = [
                    "--newline",
                    "--no-playlist",
                    "-f", "bestaudio",
                    "-o", outputTemplate,
                    job.url
                ];

                console.log(`🎵 Downloading: ${job.url}`);

                const process = spawn(config.YTDLP_PATH, args);

                let progress = 0;
                let errorOutput = "";

                process.stdout.on("data", data => {
                    const line = data.toString();
                    console.log(`📊 ${line.trim()}`);

                    // Parse progress
                    const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
                    if (match && onProgress) {
                        progress = Math.floor(Number(match[1]));
                        onProgress(Math.min(100, progress));
                    }
                });

                process.stderr.on("data", data => {
                    const text = data.toString();
                    console.log(`⚠️ ${text.trim()}`);
                    errorOutput += text;
                });

                process.on("error", reject);

                process.on("close", code => {
                    if (code !== 0) {
                        return reject(new Error(`Download failed with code ${code}: ${errorOutput}`));
                    }

                    // Find the downloaded file
                    const files = fs.readdirSync(tempFolder);
                    
                    // Try to find file matching job ID
                    let downloaded = files.find(file => 
                        file.startsWith(job.id) && 
                        !file.endsWith('.part') && 
                        !file.endsWith('.ytdl')
                    );

                    if (!downloaded) {
                        // If not found, try to find the most recent file
                        const sortedFiles = files
                            .filter(f => !f.endsWith('.part') && !f.endsWith('.ytdl'))
                            .map(f => ({
                                name: f,
                                time: fs.statSync(path.join(tempFolder, f)).mtimeMs
                            }))
                            .sort((a, b) => b.time - a.time);

                        if (sortedFiles.length > 0) {
                            downloaded = sortedFiles[0].name;
                            console.log(`📁 Found recent file: ${downloaded}`);
                        }
                    }

                    if (!downloaded) {
                        return reject(new Error("Downloaded file not found"));
                    }

                    const filePath = path.join(tempFolder, downloaded);
                    console.log(`✅ Downloaded: ${filePath}`);

                    resolve({
                        success: true,
                        file: filePath,
                        metadata
                    });
                });
            });
        } catch (err) {
            console.error("Download error:", err.message);
            throw err;
        }
    }
}

module.exports = YtDlpDownloader;