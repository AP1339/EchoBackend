exports.health = (req, res) => {

    res.json({

        success: true,

        service: "EchoBackend",

        version: "1.1",

        status: "online",

        uptime: process.uptime(),

        timestamp: new Date().toISOString()

    });

};