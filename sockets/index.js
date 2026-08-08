let online = 0;

const blockedPairs = new Set();
const reportService = require("../services/reportService");

function getPairKey(user1, user2) {
    return [user1, user2].sort().join(":");
}

function registerSocketHandlers(io, activePairs, queue) {

    io.on("connection", (socket) => {

        console.log("Connected:", socket.id);

        online++;

        io.emit("onlineUsers", online);

        socket.on("joinQueue", () => {

            if (activePairs.has(socket.id)) {
                return;
            }

            queue.removeUser(socket.id);
            queue.addUser(socket.id);

            io.emit("queueCount", queue.getWaitingCount());

            while (queue.hasTwoUsers()) {

                const pair = queue.getNextPair(blockedPairs);

                if (!pair) {
                    break;
                }

                activePairs.set(pair.user1, pair.user2);
                activePairs.set(pair.user2, pair.user1);

                io.to(pair.user1).emit("matched", {
                    initiator: true
                });

                io.to(pair.user2).emit("matched", {
                    initiator: false
                });
            }

            io.emit("queueCount", queue.getWaitingCount());

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

        socket.on("endCall", () => {

            const partner = activePairs.get(socket.id);

            queue.removeUser(socket.id);

            if (partner) {

                activePairs.delete(socket.id);
                activePairs.delete(partner);

                io.to(partner).emit("callEnded");

            }

            io.emit("queueCount", queue.getWaitingCount());

        });

        socket.on("reportUser", (reason) => {

            const partner = activePairs.get(socket.id);

            if (!partner) {
                return;
            }

            const pairKey = getPairKey(socket.id, partner);

            blockedPairs.add(pairKey);

            reportService.addReport({
                reporter: socket.id,
                reported: partner,
                reason: reason || "Unspecified"
            });

            console.log(
                "🚨 REPORT:",
                socket.id,
                "reported",
                partner,
                "Reason:",
                reason || "Unspecified"
            );

            activePairs.delete(socket.id);
            activePairs.delete(partner);

            queue.removeUser(socket.id);
            queue.removeUser(partner);

            io.to(partner).emit("callEnded");

            socket.emit("reportSubmitted");

            io.emit("queueCount", queue.getWaitingCount());

        });

        socket.on("disconnect", () => {

            online--;

            queue.removeUser(socket.id);

            const partner = activePairs.get(socket.id);

            if (partner) {

                activePairs.delete(socket.id);
                activePairs.delete(partner);

                io.to(partner).emit("callEnded");

            }

            io.emit("onlineUsers", online);
            io.emit("queueCount", queue.getWaitingCount());

        });

    });

}

module.exports = registerSocketHandlers;
