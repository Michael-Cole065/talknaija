module.exports = function(io, activePairs) {

    io.on("connection", (socket) => {

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

    });

};
