module.exports = (req, res, next) => {
    const { url, quality } = req.body;

    // Check URL
    if (!url) {
        return res.status(400).json({
            success: false,
            message: "URL is required"
        });
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})(&.*)?$/;
    
    if (!youtubeRegex.test(url)) {
        return res.status(400).json({
            success: false,
            message: "Invalid YouTube URL. Please provide a valid YouTube video URL."
        });
    }

    // Validate quality
    if (quality) {
        const allowedQualities = ["128", "192", "256", "320"];
        if (!allowedQualities.includes(String(quality))) {
            return res.status(400).json({
                success: false,
                message: "Invalid quality. Allowed: 128, 192, 256, 320"
            });
        }
    }

    next();
};