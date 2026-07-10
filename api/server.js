const express = require("express");
const cors = require("cors");
require("dotenv").config();

const config = require("../config/config");
const routes = require("./routes");
const errorHandler = require("../middleware/errorHandler");

// Start Worker
require("../worker/worker");

const app = express();

app.use(cors());

app.use(express.json());

app.use("/", routes);

// ALWAYS KEEP THIS LAST
app.use(errorHandler);

app.listen(config.PORT, () => {

    console.log("====================================");
    console.log(" EchoBackend Started");
    console.log("====================================");
    console.log(`Server : http://localhost:${config.PORT}`);
    console.log("Worker : Running");
    console.log("====================================");

});