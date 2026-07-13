async function retry(fn, retries = 5, delay = 2000) {
    let lastError;
    
    for (let i = 1; i <= retries; i++) {
        try {
            console.log(`🔄 Retry attempt ${i}/${retries}`);
            const result = await fn();
            if (i > 1) {
                console.log(`✅ Succeeded after ${i} attempts`);
            }
            return result;
        } catch (err) {
            lastError = err;
            console.log(`❌ Attempt ${i} failed: ${err.message}`);
            
            if (i < retries) {
                const waitTime = delay * i; // Progressive delay
                console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    console.error(`❌ All ${retries} attempts failed`);
    throw lastError;
}

module.exports = retry;