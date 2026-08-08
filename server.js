const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const queue = require("./services/queueService");
const registerSocketHandlers = require("./sockets");

const app = express();

let server;

if (process.env.NODE_ENV === "production") {

    server = http.createServer(app);

} else {

    const httpsOptions = {
        key: fs.readFileSync("./cert/server.key"),
        cert: fs.readFileSync("./cert/server.crt")
    };

    server = https.createServer(httpsOptions, app);
}

const io = new Server(server);

const activePairs = new Map();

app.use(express.static(path.join(__dirname, "public")));

registerSocketHandlers(io, activePairs, queue);

const PORT = process.env.PORT || 4000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `🚀 TalkNaija running on port ${PORT}`
    );

});
