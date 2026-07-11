const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function upload(filePath) {

    const originalName = path.basename(filePath);

    const extension = path.extname(filePath);

    const storageFileName = `${crypto.randomUUID()}${extension}`;

    const buffer = fs.readFileSync(filePath);

    console.log("Uploading to Supabase...");
    console.time("SUPABASE_UPLOAD");

    const { error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(storageFileName, buffer, {
            contentType: "audio/mpeg",
            cacheControl: "3600",
            upsert: true
        });

    console.timeEnd("SUPABASE_UPLOAD");

    if (error) {
        console.error("Upload Error:", error);
        throw error;
    }

    console.log("Upload finished. Creating signed URL...");

    const { data, error: signedError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .createSignedUrl(storageFileName, 600);

    if (signedError) {
        console.error("Signed URL Error:", signedError);
        throw signedError;
    }

    console.log("Signed URL created.");

    return {
        success: true,
        originalName,
        storageFileName,
        url: data.signedUrl
    };
}

async function deleteFile(storageKey) {

    const { error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .remove([storageKey]);

    if (error)
        throw error;

    return true;
}

module.exports = {
    upload,
    delete: deleteFile
};