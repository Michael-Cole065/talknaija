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

// HTTPS certificate
const httpsOptions = {
    key: fs.readFileSync("./cert/server.key"),
    cert: fs.readFileSync("./cert/server.crt")
};

// HTTPS server
const server = https.createServer(httpsOptions, app);

const io = new Server(server);

const activePairs = new Map();

app.use(express.static(path.join(__dirname, "public")));

registerSocketHandlers(io, activePairs, queue);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`🚀 TalkNaija running on https://localhost:${PORT}`);
});
