const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// CLEAN URL FUNCTION
// ============================================
function cleanYouTubeUrl(url) {
    if (!url) return '';
    
    // Remove backslashes
    let cleanUrl = url.replace(/\\/g, '');
    cleanUrl = cleanUrl.trim();
    
    try {
        // Handle youtu.be URLs
        if (cleanUrl.includes('youtu.be/')) {
            const match = cleanUrl.match(/youtu\.be\/([^?&]+)/);
            if (match) {
                const videoId = match[1];
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }
        
        // Handle youtube.com URLs
        if (cleanUrl.includes('youtube.com/watch')) {
            const urlObj = new URL(cleanUrl);
            const videoId = urlObj.searchParams.get('v');
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }
    } catch (error) {
        console.error('Error parsing URL:', error);
    }
    
    return cleanUrl;
}

// ============================================
// CLEAN METADATA FUNCTION
// ============================================
function cleanMetadata(text) {
    if (!text) return '';
    let cleaned = text.replace(/[^\w\s\-.,!?()'"]/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

// ============================================
// SANITIZE FOR SUPABASE
// ============================================
function sanitizeForSupabase(text) {
    if (!text) return '';
    let sanitized = text.replace(/[^a-zA-Z0-9\s]/g, ' ');
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    sanitized = sanitized.substring(0, 100);
    return sanitized || 'Unknown';
}

// ============================================
// DOWNLOAD AUDIO
// ============================================
async function downloadAudio(url) {
    try {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const outputPath = path.join(tempDir, `${Date.now()}.mp3`);
        
        await ytdlp(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            output: outputPath,
            noCheckCertificate: true,
        });
        
        const audioBuffer = fs.readFileSync(outputPath);
        fs.unlinkSync(outputPath);
        
        return audioBuffer;
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
}

// ============================================
// MAIN DOWNLOAD ENDPOINT
// ============================================
app.post('/api/download', async (req, res) => {
    try {
        let { url, quality } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                message: 'URL is required' 
            });
        }
        
        // Clean the URL
        const cleanUrl = cleanYouTubeUrl(url);
        console.log('📥 Original URL:', url);
        console.log('📥 Cleaned URL:', cleanUrl);
        
        // Validate YouTube URL
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        if (!youtubeRegex.test(cleanUrl)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid YouTube URL. Please provide a valid YouTube video URL.'
            });
        }
        
        console.log('🎵 Downloading from:', cleanUrl);
        
        // Get video info
        let videoInfo;
        try {
            videoInfo = await ytdlp(cleanUrl, {
                dumpSingleJson: true,
                noCheckCertificate: true,
            });
        } catch (error) {
            console.error('Error getting video info:', error);
            return res.status(500).json({ 
                success: false,
                message: 'Failed to get video information' 
            });
        }
        
        // Extract metadata
        const title = videoInfo.title || videoInfo.videoDetails?.title || 'Unknown Song';
        const artist = videoInfo.artist || videoInfo.videoDetails?.author?.name || videoInfo.uploader || 'Unknown Artist';
        const duration = videoInfo.duration || videoInfo.videoDetails?.lengthSeconds || 0;
        const thumbnail = videoInfo.thumbnail || videoInfo.videoDetails?.thumbnails?.[0]?.url || '';
        
        console.log('📝 Title:', title);
        console.log('👤 Artist:', artist);
        
        // Clean metadata
        const cleanTitle = cleanMetadata(title);
        const cleanArtist = cleanMetadata(artist);
        
        // Sanitize for Supabase
        const supabaseTitle = sanitizeForSupabase(title);
        const supabaseArtist = sanitizeForSupabase(artist);
        
        // Download audio
        let audioBuffer;
        try {
            audioBuffer = await downloadAudio(cleanUrl);
        } catch (error) {
            console.error('Error downloading audio:', error);
            return res.status(500).json({ 
                success: false,
                message: 'Failed to download audio' 
            });
        }
        
        // Upload to Supabase
        let supabaseResult = { uploaded: false };
        try {
            const fileName = `${Date.now()}_${supabaseTitle.substring(0, 30)}.mp3`;
            
            supabaseResult = await supabase.storage
                .from('audio')
                .upload(`songs/${fileName}`, audioBuffer, {
                    contentType: 'audio/mpeg',
                    cacheControl: '3600',
                    upsert: false,
                    metadata: {
                        title: supabaseTitle,
                        artist: supabaseArtist,
                        duration: String(duration),
                        quality: quality || '320'
                    }
                });
            
            console.log('☁️ Supabase upload:', supabaseResult.error ? 'failed' : 'success');
        } catch (error) {
            console.error('Supabase upload error:', error);
        }
        
        // Send response
        const responseData = {
            success: true,
            metadata: {
                title: cleanTitle || 'Unknown Song',
                artist: cleanArtist || 'Unknown Artist',
                duration: duration,
                thumbnail: thumbnail,
                originalTitle: title,
                originalArtist: artist
            },
            audioData: audioBuffer.toString('base64'),
            supabase: {
                uploaded: !supabaseResult.error,
                fileId: supabaseResult.data?.id || null,
                path: supabaseResult.data?.path || null
            }
        };
        
        console.log('✅ Sending response to app');
        res.json(responseData);
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            details: error.message 
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'EchoBackend is running!',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EchoBackend running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📱 Mobile: http://127.0.0.1:${PORT}`);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('💥 Unhandled Rejection:', error);
});