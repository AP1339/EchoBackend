const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Use service role key for admin operations
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function upload(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const originalName = path.basename(filePath);
    const extension = path.extname(filePath);
    const storageFileName = `${crypto.randomUUID()}${extension}`;

    console.log(`📤 Uploading: ${originalName} -> ${storageFileName}`);

    // Read file as buffer
    const buffer = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    console.time("SUPABASE_UPLOAD");

    try {
        const { error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .upload(storageFileName, buffer, {
                contentType: "audio/mpeg",
                cacheControl: "3600",
                upsert: true,
                contentLength: stats.size
            });

        console.timeEnd("SUPABASE_UPLOAD");

        if (error) {
            console.error("Upload Error:", error);
            throw new Error(`Upload failed: ${error.message}`);
        }

        console.log(`✅ Uploaded: ${storageFileName}`);

        // Create signed URL (expires in 1 hour)
        console.log("🔗 Creating signed URL...");
        
        const { data, error: signedError } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .createSignedUrl(storageFileName, 3600); // 1 hour expiry

        if (signedError) {
            console.error("Signed URL Error:", signedError);
            throw new Error(`Signed URL failed: ${signedError.message}`);
        }

        console.log("✅ Signed URL created");

        return {
            success: true,
            originalName,
            storageFileName,
            url: data.signedUrl
        };

    } catch (err) {
        console.error("Upload error:", err.message);
        throw err;
    }
}

async function deleteFile(storageKey) {
    if (!storageKey) {
        console.warn("No storage key provided for deletion");
        return false;
    }

    try {
        const { error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .remove([storageKey]);

        if (error) {
            console.error(`Delete error for ${storageKey}:`, error);
            throw error;
        }

        console.log(`🗑️ Deleted from cloud: ${storageKey}`);
        return true;

    } catch (err) {
        console.error(`Failed to delete ${storageKey}:`, err.message);
        throw err;
    }
}

module.exports = {
    upload,
    delete: deleteFile
};