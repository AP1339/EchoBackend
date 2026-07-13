const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

// Load environment variables
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// CLEAN METADATA FUNCTION (removes special chars)
// ============================================
function cleanMetadata(text) {
    if (!text) return '';
    
    // Remove special characters, keep only letters, numbers, spaces, and basic punctuation
    let cleaned = text.replace(/[^\w\s\-.,!?()'"]/g, ' ');
    
    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

// ============================================
// SANITIZE FOR SUPABASE (removes ALL special chars)
// ============================================
function sanitizeForSupabase(text) {
    if (!text) return '';
    
    // Remove everything except letters, numbers, and spaces
    let sanitized = text.replace(/[^a-zA-Z0-9\s]/g, ' ');
    
    // Remove extra spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Limit length
    sanitized = sanitized.substring(0, 100);
    
    return sanitized || 'Unknown';
}

// ============================================
// DOWNLOAD AUDIO FROM YOUTUBE
// ============================================
async function downloadAudio(url) {
    try {
        const outputPath = path.join(__dirname, '../temp', `${Date.now()}.mp3`);
        
        // Ensure temp directory exists
        if (!fs.existsSync(path.join(__dirname, '../temp'))) {
            fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
        }
        
        // Download audio
        await ytdlp(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            output: outputPath,
            noCheckCertificate: true,
        });
        
        // Read the file
        const audioBuffer = fs.readFileSync(outputPath);
        
        // Clean up temp file
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
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        console.log('Downloading from URL:', url);
        
        // Get video info first
        let videoInfo;
        try {
            videoInfo = await ytdlp(url, {
                dumpSingleJson: true,
                noCheckCertificate: true,
            });
        } catch (error) {
            console.error('Error getting video info:', error);
            return res.status(500).json({ error: 'Failed to get video information' });
        }
        
        // Extract metadata
        const title = videoInfo.title || videoInfo.videoDetails?.title || 'Unknown Song';
        const artist = videoInfo.artist || videoInfo.videoDetails?.author?.name || videoInfo.uploader || 'Unknown Artist';
        const duration = videoInfo.duration || videoInfo.videoDetails?.lengthSeconds || 0;
        const thumbnail = videoInfo.thumbnail || videoInfo.videoDetails?.thumbnails?.[0]?.url || '';
        
        console.log('Original Title:', title);
        console.log('Original Artist:', artist);
        
        // ============================================
        // CREATE CLEAN METADATA FOR RESPONSE
        // ============================================
        const cleanTitle = cleanMetadata(title);
        const cleanArtist = cleanMetadata(artist);
        
        // ============================================
        // CREATE SANITIZED METADATA FOR SUPABASE
        // (removes all special chars including Marathi)
        // ============================================
        const supabaseTitle = sanitizeForSupabase(title);
        const supabaseArtist = sanitizeForSupabase(artist);
        
        console.log('Clean Title (for response):', cleanTitle);
        console.log('Clean Artist (for response):', cleanArtist);
        console.log('Supabase Title (sanitized):', supabaseTitle);
        console.log('Supabase Artist (sanitized):', supabaseArtist);
        
        // ============================================
        // DOWNLOAD THE AUDIO
        // ============================================
        let audioBuffer;
        try {
            audioBuffer = await downloadAudio(url);
        } catch (error) {
            console.error('Error downloading audio:', error);
            return res.status(500).json({ error: 'Failed to download audio' });
        }
        
        // ============================================
        // UPLOAD TO SUPABASE
        // ============================================
        let supabaseResult;
        try {
            const fileName = `${Date.now()}_${supabaseTitle.substring(0, 30)}.mp3`;
            
            supabaseResult = await supabase.storage
                .from('audio') // Make sure this bucket exists
                .upload(`songs/${fileName}`, audioBuffer, {
                    contentType: 'audio/mpeg',
                    cacheControl: '3600',
                    upsert: false,
                    metadata: {
                        title: supabaseTitle,
                        artist: supabaseArtist,
                        duration: String(duration),
                        original_title: title,
                        original_artist: artist
                    }
                });
            
            if (supabaseResult.error) {
                console.error('Supabase upload error:', supabaseResult.error);
                // Continue anyway - we'll still send the audio back
            }
        } catch (error) {
            console.error('Supabase upload error:', error);
            // Don't fail the whole request if supabase fails
        }
        
        // ============================================
        // SEND RESPONSE TO APP
        // ============================================
        const responseData = {
            success: true,
            metadata: {
                title: cleanTitle || 'Unknown Song',
                artist: cleanArtist || 'Unknown Artist',
                duration: duration,
                thumbnail: thumbnail,
                // Send original too if app wants to display it
                originalTitle: title,
                originalArtist: artist
            },
            audioData: audioBuffer.toString('base64'), // Send as base64
            supabase: {
                uploaded: !supabaseResult?.error,
                fileId: supabaseResult?.data?.id || null,
                path: supabaseResult?.data?.path || null
            }
        };
        
        console.log('Sending response to app...');
        res.json(responseData);
        
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'EchoBackend is running on mobile!',
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
    console.log('✅ Ready to download YouTube audio!');
});

// Handle errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});