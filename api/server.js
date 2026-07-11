const express = require("express");
const cors = require("cors");
const path = require("path");
const { exec } = require("child_process");

require("dotenv").config();

const config = require("../config/config");
const routes = require("./routes");
const errorHandler = require("../middleware/errorHandler");

// Start Worker
require("../worker/worker");

const app = express();

app.use(cors());

app.use(express.json());

app.use(

    express.static(

        path.join(__dirname, "..", "public")

    )

);

app.use("/", routes);

// ALWAYS KEEP THIS LAST
app.use(errorHandler);

app.listen(config.PORT, "0.0.0.0", () => {

    console.log("====================================");
    console.log(" EchoBackend Started");
    console.log("====================================");
    console.log(`Server    : http://localhost:${config.PORT}`);
    console.log(`Dashboard : http://localhost:${config.PORT}/dashboard`);
    console.log("Worker    : Running");
    console.log("====================================");

    // Auto open dashboard (Windows only)

    if (process.platform === "win32") {

        exec(

            `start http://localhost:${config.PORT}/dashboard`

        );

    }

});