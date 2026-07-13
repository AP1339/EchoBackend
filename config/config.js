// config/config.js
require("dotenv").config();

module.exports = {
    // Server
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Default Settings
    DEFAULT_QUALITY: process.env.DEFAULT_QUALITY || "320",
    JOB_EXPIRY: Number(process.env.JOB_EXPIRY) || 600000,
    
    // Worker
    WORKER_COUNT: Math.max(1, Number(process.env.WORKER_COUNT) || 1),
    WORKER_INTERVAL: Number(process.env.WORKER_INTERVAL) || 1000,
    
    // Paths
    FFMPEG_PATH: process.env.FFMPEG_PATH || "ffmpeg",
    YTDLP_PATH: process.env.YTDLP_PATH || "yt-dlp",
    
    // Security
    JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-min-32-chars",
    SESSION_SECRET: process.env.SESSION_SECRET || "session-secret-key",
    
    // Supabase
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
    
    // Rate Limiting
    RATE_LIMIT_WINDOW: Number(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 min
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,
    DOWNLOAD_LIMIT: Number(process.env.DOWNLOAD_LIMIT) || 20,
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};