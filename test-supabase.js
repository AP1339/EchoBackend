require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const fs = require("fs");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function test() {

    console.log("URL:", process.env.SUPABASE_URL);
    console.log("Bucket:", process.env.SUPABASE_BUCKET);

    const file = Buffer.from("Hello EchoBackend");

    const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload("test.txt", file, {
            upsert: true,
            contentType: "text/plain"
        });

    console.log("DATA:", data);
    console.log("ERROR:", error);

}

test().catch(console.error);