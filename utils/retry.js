async function retry(fn, retries = 5, delay = 2000) {

    let lastError;

    for (let i = 1; i <= retries; i++) {

        try {

            console.log(`Upload Attempt ${i}/${retries}`);

            return await fn();

        }

        catch (err) {

            lastError = err;

            console.log(`Attempt ${i} Failed`);

            console.log(err.message);

            if (i < retries) {

                console.log(`Retrying in ${delay} ms...\n`);

                await new Promise(resolve => setTimeout(resolve, delay));

            }

        }

    }

    throw lastError;

}

module.exports = retry;