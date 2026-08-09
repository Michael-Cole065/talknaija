let online = 0;

const blockedPairs = new Set();

const reportService =
    require("../services/reportService");

const historyService =
    require("../services/historyService");


function getPairKey(user1, user2) {

    return [user1, user2]
        .sort()
        .join(":");

}


function loadBlockedPairs() {

    const pairs =
        reportService.getBlockedPairs();

    pairs.forEach((pair) => {

        blockedPairs.add(
            getPairKey(
                pair.user1,
                pair.user2
            )
        );

    });

    console.log(
        `🛡️ Loaded ${blockedPairs.size} blocked pair(s)`
    );

}


function blockPair(user1, user2) {

    if (!user1 || !user2) {
        return false;
    }

    blockedPairs.add(
        getPairKey(
            user1,
            user2
        )
    );

    return true;

}


function unblockPair(user1, user2) {

    if (!user1 || !user2) {
        return false;
    }

    return blockedPairs.delete(
        getPairKey(
            user1,
            user2
        )
    );

}


function registerSocketHandlers(
    io,
    activePairs,
    queue
) {

    loadBlockedPairs();

    io.on("connection", (socket) => {

        console.log(
            "Connected:",
            socket.id
        );

        online++;

        io.emit(
            "onlineUsers",
            online
        );


        /*
        ================================================
        ANONYMOUS USER IDENTITY
        ================================================
        */

        socket.userId = null;

        socket.isPremium = false;


        socket.on(
            "registerUser",
            (data) => {

                if (!data) {
                    return;
                }

                if (
                    typeof data.userId ===
                    "string" &&
                    data.userId.length > 0
                ) {

                    socket.userId =
                        data.userId;

                }

                socket.isPremium =
                    data.isPremium === true;

            }
        );


        /*
        ================================================
        JOIN QUEUE
        ================================================
        */

        socket.on(
            "joinQueue",
            () => {

                if (
                    activePairs.has(
                        socket.id
                    )
                ) {

                    return;

                }

                queue.removeUser(
                    socket.id
                );

                queue.addUser(
                    socket.id
                );

                io.emit(
                    "queueCount",
                    queue.getWaitingCount()
                );


                while (
                    queue.hasTwoUsers()
                ) {

                    const pair =
                        queue.getNextPair(
                            blockedPairs
                        );

                    if (!pair) {
                        break;
                    }


                    activePairs.set(
                        pair.user1,
                        pair.user2
                    );

                    activePairs.set(
                        pair.user2,
                        pair.user1
                    );


                    /*
                    ========================================
                    RECORD CALL HISTORY
                    ========================================
                    */

                    const user1Socket =
                        io.sockets.sockets.get(
                            pair.user1
                        );

                    const user2Socket =
                        io.sockets.sockets.get(
                            pair.user2
                        );


                    if (
                        user1Socket &&
                        user2Socket
                    ) {

                        if (
                            user1Socket.userId &&
                            user2Socket.userId
                        ) {

                            historyService.addCall(
                                user1Socket.userId,
                                user2Socket.userId,
                                user1Socket.isPremium
                            );

                            historyService.addCall(
                                user2Socket.userId,
                                user1Socket.userId,
                                user2Socket.isPremium
                            );

                        }

                    }


                    io.to(
                        pair.user1
                    ).emit(
                        "matched",
                        {
                            initiator: true
                        }
                    );


                    io.to(
                        pair.user2
                    ).emit(
                        "matched",
                        {
                            initiator: false
                        }
                    );

                }


                io.emit(
                    "queueCount",
                    queue.getWaitingCount()
                );

            }
        );


        /*
        ================================================
        CALL HISTORY
        ================================================
        */

        socket.on(
            "getCallHistory",
            () => {

                if (!socket.userId) {

                    socket.emit(
                        "callHistory",
                        []
                    );

                    return;

                }

                const history =
                    historyService.getUserHistory(
                        socket.userId,
                        socket.isPremium
                    );

                socket.emit(
                    "callHistory",
                    history
                );

            }
        );


        /*
        ================================================
        WEBRTC OFFER
        ================================================
        */

        socket.on(
            "offer",
            (offer) => {

                const partner =
                    activePairs.get(
                        socket.id
                    );

                if (partner) {

                    io.to(
                        partner
                    ).emit(
                        "offer",
                        offer
                    );

                }

            }
        );


        /*
        ================================================
        WEBRTC ANSWER
        ================================================
        */

        socket.on(
            "answer",
            (answer) => {

                const partner =
                    activePairs.get(
                        socket.id
                    );

                if (partner) {

                    io.to(
                        partner
                    ).emit(
                        "answer",
                        answer
                    );

                }

            }
        );


        /*
        ================================================
        WEBRTC ICE
        ================================================
        */

        socket.on(
            "iceCandidate",
            (candidate) => {

                const partner =
                    activePairs.get(
                        socket.id
                    );

                if (partner) {

                    io.to(
                        partner
                    ).emit(
                        "iceCandidate",
                        candidate
                    );

                }

            }
        );


        /*
        ================================================
        PRIVATE CHAT
        ================================================
        */

        socket.on(
            "chatMessage",
            (message) => {

                const partner =
                    activePairs.get(
                        socket.id
                    );

                if (!partner) {

                    return;

                }


                if (
                    typeof message !==
                    "string"
                ) {

                    return;

                }


                const cleanMessage =
                    message.trim();


                if (!cleanMessage) {

                    return;

                }


                const limitedMessage =
                    cleanMessage.substring(
                        0,
                        500
                    );


                io.to(
                    partner
                ).emit(
                    "chatMessage",
                    {
                        message:
                            limitedMessage
                    }
                );

            }
        );


/*
================================================
END CALL
================================================
*/

socket.on(
    "endCall",
    () => {

        const partner =
            activePairs.get(
                socket.id
            );


        if (partner) {

            io.to(
                partner
            ).emit(
                "callEnded"
            );


            socket.emit(
                "callEnded"
            );


            activePairs.delete(
                socket.id
            );

            activePairs.delete(
                partner
            );

        } else {

            socket.emit(
                "callEnded"
            );

        }

    }
);

        /*
        ================================================
        REPORT USER
        ================================================
        */

        socket.on(
            "reportUser",
            (reason) => {

                const partner =
                    activePairs.get(
                        socket.id
                    );


                if (!partner) {

                    return;

                }


                blockPair(
                    socket.id,
                    partner
                );


                const partnerSocket =
                    io.sockets.sockets.get(
                        partner
                    );


                reportService.addReport({

                    reporter:
                        socket.userId ||
                        socket.id,

                    reported:
                        partnerSocket?.userId ||
                        partner,

                    reason:
                        reason ||
                        "Unspecified"

                });


                console.log(
                    "🚨 REPORT:",
                    socket.id,
                    "reported",
                    partner,
                    "Reason:",
                    reason ||
                    "Unspecified"
                );


                activePairs.delete(
                    socket.id
                );

                activePairs.delete(
                    partner
                );


                queue.removeUser(
                    socket.id
                );

                queue.removeUser(
                    partner
                );


                io.to(
                    partner
                ).emit(
                    "callEnded"
                );


                socket.emit(
                    "reportSubmitted"
                );


                io.emit(
                    "queueCount",
                    queue.getWaitingCount()
                );

            }
        );


        /*
        ================================================
        DISCONNECT
        ================================================
        */

        socket.on(
            "disconnect",
            () => {

                online--;

                io.emit(
                    "onlineUsers",
                    online
                );


                queue.removeUser(
                    socket.id
                );


                io.emit(
                    "queueCount",
                    queue.getWaitingCount()
                );


                const partner =
                    activePairs.get(
                        socket.id
                    );


                if (partner) {

                    io.to(
                        partner
                    ).emit(
                        "callEnded"
                    );


                    activePairs.delete(
                        socket.id
                    );

                    activePairs.delete(
                        partner
                    );

                }

            }
        );

    });

}


registerSocketHandlers.blockPair =
    blockPair;

registerSocketHandlers.unblockPair =
    unblockPair;


module.exports =
    registerSocketHandlers;

