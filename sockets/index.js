let online = 0;

function registerSocketHandlers(io, activePairs, queue) {

    io.on("connection", (socket) => {

        console.log("Connected:", socket.id);

        online++;

        io.emit("onlineUsers", online);

        socket.on("joinQueue", () => {

            // Don't allow someone already in a call to enter the queue.
            if (activePairs.has(socket.id)) {
                return;
            }

            // Don't add the same user to the queue multiple times.
            queue.removeUser(socket.id);
            queue.addUser(socket.id);

            io.emit("queueCount", queue.getWaitingCount());

            if (queue.hasTwoUsers()) {

                const pair = queue.getNextPair();

                io.emit("queueCount", queue.getWaitingCount());

                activePairs.set(pair.user1, pair.user2);
                activePairs.set(pair.user2, pair.user1);

                io.to(pair.user1).emit("matched", {
                    initiator: true
                });

                io.to(pair.user2).emit("matched", {
                    initiator: false
                });

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

        socket.on("endCall", () => {

            const partner = activePairs.get(socket.id);

            // Remove this user from the waiting queue too.
            queue.removeUser(socket.id);

            if (partner) {

                activePairs.delete(socket.id);
                activePairs.delete(partner);

                io.to(partner).emit("callEnded");

            }

            io.emit("queueCount", queue.getWaitingCount());

        });

        socket.on("disconnect", () => {

            online--;

            io.emit("onlineUsers", online);

            queue.removeUser(socket.id);

            const partner = activePairs.get(socket.id);

            if (partner) {

                io.to(partner).emit("callEnded");

                activePairs.delete(socket.id);
                activePairs.delete(partner);

            }

            io.emit("queueCount", queue.getWaitingCount());

        });

    });

}

module.exports = registerSocketHandlers;
