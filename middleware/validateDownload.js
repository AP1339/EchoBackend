module.exports = (req, res, next) => {

    const { url, quality } = req.body;

    if (!url) {

        return res.status(400).json({

            success: false,

            message: "URL is required"

        });

    }

    const youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;

    if (!youtubeRegex.test(url)) {

        return res.status(400).json({

            success: false,

            message: "Invalid YouTube URL"

        });

    }

    const allowedQualities = ["128", "192", "256", "320"];

    if (quality && !allowedQualities.includes(String(quality))) {

        return res.status(400).json({

            success: false,

            message: "Invalid quality"

        });

    }

    next();

};