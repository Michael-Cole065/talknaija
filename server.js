const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const queue = require("./services/queueService");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const activePairs = new Map();
let online = 0;

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {

    online++;
    io.emit("onlineUsers", online);

    console.log("Connected:", socket.id);

    socket.on("joinQueue", () => {

        queue.addUser(socket.id);

        if (queue.hasTwoUsers()) {

            const pair = queue.getNextPair();

            activePairs.set(pair.user1, pair.user2);
            activePairs.set(pair.user2, pair.user1);

            io.to(pair.user1).emit("matched");
            io.to(pair.user2).emit("matched");

            console.log("Matched:", pair.user1, pair.user2);
        }

    });

    socket.on("endCall", () => {

        const partner = activePairs.get(socket.id);

        if (partner) {

            io.to(partner).emit("callEnded");

            activePairs.delete(socket.id);
            activePairs.delete(partner);
        }

    });

socket.on("offer", (offer) => {

    const partner = activePairs.get(socket.id);

    if (partner) {

        io.to(partner).emit("offer", offer);

    }

});

socket.on("answer", (answer) => {

    const partner = activePairs.get(socket.id);

    if (partner) {

        io.to(partner).emit("answer", answer);

    }

});

socket.on("iceCandidate", (candidate) => {

    const partner = activePairs.get(socket.id);

    if (partner) {

        io.to(partner).emit("iceCandidate", candidate);

    }

});

    socket.on("disconnect", () => {

        online--;

        io.emit("onlineUsers", online);

        queue.removeUser(socket.id);

        const partner = activePairs.get(socket.id);

        if (partner) {

            io.to(partner).emit("callEnded");

            activePairs.delete(partner);
            activePairs.delete(socket.id);

        }

        console.log("Disconnected:", socket.id);

    });

});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {

    console.log(`🚀 TalkNaija running on http://localhost:${PORT}`);

});
