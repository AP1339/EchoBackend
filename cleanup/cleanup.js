const fs = require("fs");

async function deleteFile(file) {

    try {

        if (!file)
            return;

        if (!fs.existsSync(file))
            return;

        fs.unlinkSync(file);

        console.log(`Deleted : ${file}`);

    } catch (err) {

        console.log("Cleanup Error :", err.message);

    }

}

module.exports = {

    deleteFile

};