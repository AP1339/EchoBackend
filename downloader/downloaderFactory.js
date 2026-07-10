const YtDlpDownloader = require("./implementations/ytdlpDownloader");

function createDownloader() {

    return new YtDlpDownloader();

}

module.exports = {

    createDownloader

};