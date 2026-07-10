const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function upload(filePath) {

    const originalName = path.basename(filePath);

    const extension = path.extname(filePath);

    const storageFileName = crypto.randomUUID() + extension;

    const stream = fs.createReadStream(filePath);

    const stats = fs.statSync(filePath);

    const { error } = await supabase.storage

        .from(process.env.SUPABASE_BUCKET)

        .upload(storageFileName, stream, {

            contentType: "audio/mpeg",

            upsert: true,

            duplex: "half",

            cacheControl: "3600",

            contentLength: stats.size

        });

    if (error)
        throw error;

    const { data } = supabase.storage

        .from(process.env.SUPABASE_BUCKET)

        .getPublicUrl(storageFileName);

    return {

        success: true,

        storageFileName,

        originalName,

        url: data.publicUrl

    };

}

module.exports = {

    upload

};