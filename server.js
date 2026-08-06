const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const queue = require("./services/queueService");
const registerSocketHandlers = require("./sockets");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const activePairs = new Map();

app.use(express.static(path.join(__dirname, "public")));

registerSocketHandlers(io, activePairs, queue);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`🚀 TalkNaija running on http://localhost:${PORT}`);
});
