require("dotenv").config();

module.exports = {

    PORT: process.env.PORT || 3000,

    DEFAULT_QUALITY: process.env.DEFAULT_QUALITY || "320",

    JOB_EXPIRY: Number(process.env.JOB_EXPIRY) || 300000,

    WORKER_INTERVAL: Number(process.env.WORKER_INTERVAL) || 1000,

    WORKER_COUNT: Number(process.env.WORKER_COUNT) || 1,

    FFMPEG_PATH: process.env.FFMPEG_PATH || "ffmpeg",

    YTDLP_PATH: process.env.YTDLP_PATH || "yt-dlp"

};