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

    const stream = fs.createReadStream(filePath);

    const stats = fs.statSync(filePath);

    const { error } = await supabase.storage

        .from(process.env.SUPABASE_BUCKET)

        .upload(storageFileName, stream, {

            contentType: "audio/mpeg",

            cacheControl: "3600",

            upsert: true,

            duplex: "half",

            contentLength: stats.size

        });

    if (error)
        throw error;

    const { data, error: signedError } = await supabase.storage

        .from(process.env.SUPABASE_BUCKET)

        .createSignedUrl(

            storageFileName,

            600

        );

    if (signedError)
        throw signedError;

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