
let online = 0;

function getOnlineCount() {
    return online;
}

const blockedPairs = new Set();

const reportService =
    require("../services/reportService");

const historyService =
    require("../services/historyService");

const locationService =
    require("../services/locationService");

const identityService =
    require("../services/identityService");

const trafficService =
    require("../services/trafficService");

function getPairKey(user1, user2) {

    return [user1, user2]
        .sort()
        .join(":");

}


async function loadBlockedPairs() {

    const pairs =
        await reportService.getBlockedPairs();

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


async function registerSocketHandlers(
    io,
    activePairs,
    queue
) {

    await loadBlockedPairs();

    io.on("connection", (socket) => {

        console.log(
            "Connected:",
            socket.id
        );

	online++;

	console.log(
	    "🟢 ACTIVE USERS:",
	    online,
	    "| Connected socket:",
	    socket.id
	);

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

   async (data) => {

        if (!data) {
            return;
        }

        if (
            typeof data.userId === "string" &&
            data.userId.length > 0
        ) {
            socket.userId =
                data.userId;
        }

        socket.isPremium =
            data.isPremium === true;

        /*
        ==================================================
        CHECK BANNED ACCOUNT
        ==================================================
        */

        const currentUser =
            socket.userId
                ? await identityService.getUser(
                    socket.userId
                )
                : null;

        if (
            currentUser &&
            currentUser.banned === true
        ) {

            console.log(
                "🚫 BANNED USER CONNECTED:",
                socket.userId
            );

            socket.emit(
                "userBanned",
                {
                    message:
                        "Your account has been temporarily restricted due to multiple reports."
                }
            );

            return;
        }

        /*
        ==================================================
        RECORD VISIT
        ==================================================
        */

        if (
            socket.userId &&
            data.isNewVisit === true
        ) {

            const visitedUser =
                await identityService.recordVisit(
                    socket.userId,
                    socket.isPremium,
                    socket
                );

            await trafficService.recordVisit(
                socket.userId,
                visitedUser
                    ? visitedUser.type
                    : (socket.isPremium
                        ? "premium"
                        : "guest"),
                socket.isPremium
            );

        }

    }
);


        /*
        ================================================
        JOIN QUEUE
        ================================================
        */

		socket.on(
		    "joinQueue",
		    async () => {

		const currentUser =
    socket.userId
        ? await identityService.getUser(
            socket.userId
        )
        : null;

if (
    currentUser &&
    currentUser.banned === true
) {

    console.log(
        "🚫 BANNED USER BLOCKED:",
        socket.userId
    );

    socket.emit(
        "userBanned",
        {
            message:
                "Your account has been temporarily restricted due to multiple reports."
        }
    );

    return;
}

		const location =
		    await locationService.checkNigeria(socket);

		if (!location.allowed) {

		    console.log(
		        `🚫 Non-Nigerian connection blocked: ${location.countryCode || "UNKNOWN"}`
		    );

		    socket.emit(
		        "locationBlocked",
		        {
		            message:
		                "TalkNaija is currently available only in Nigeria."
		        }
		    );

		    return;

		}

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
		        blockedPairs,
		        (socketId) => {

	            const client =
	                io.sockets.sockets.get(
	                    socketId
	                );

	            return client?.userId ||
	                null;

		        }
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

// Reset callback relationship for a fresh random match
const matchedUser1 =
    io.sockets.sockets.get(
        pair.user1
    );

const matchedUser2 =
    io.sockets.sockets.get(
        pair.user2
    );

if (
    matchedUser1 &&
    matchedUser2 &&
    matchedUser1.userId &&
    matchedUser2.userId
) {

    await historyService.resetCallbackRelationship(
        matchedUser1.userId,
        matchedUser2.userId
    );

}

// Reset call recording state for the new call
const user1Socket =
    io.sockets.sockets.get(
        pair.user1
    );

const user2Socket =
    io.sockets.sockets.get(
        pair.user2
    );

if (user1Socket) {
    user1Socket.callConnectionRecorded = false;
}

if (user2Socket) {
    user2Socket.callConnectionRecorded = false;
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
SUCCESSFUL CALL CONNECTION
================================================
*/

	socket.on(
    "callConnected",
    async () => {

        console.log(
            "📞 CALL CONNECTED EVENT:",
            socket.id,
            "user:",
            socket.userId
        );

        const partner =
            activePairs.get(
                socket.id
            );

        console.log(
            "📞 PARTNER SOCKET:",
            partner
        );

        if (!partner) {
            console.log(
                "❌ CALL HISTORY: No active partner"
            );
            return;
        }

        const partnerSocket =
            io.sockets.sockets.get(
                partner
            );

        if (!partnerSocket) {
            return;
        }

        if (
            partnerSocket.callConnectionRecorded === true
        ) {
            socket.callConnectionRecorded = true;
            return;
        }

	if (
	    !socket.id ||
	    !socket.userId ||
	    !partnerSocket.userId
	) {
	    console.log(
	        "❌ CALL HISTORY: Missing user ID",
	        {
	            socketId: socket.id,
	            socketUserId: socket.userId,
	            partnerUserId: partnerSocket.userId
	        }
	    );

	    return;
	}

        socket.callConnectionRecorded =
            true;

        partnerSocket.callConnectionRecorded =
            true;

        await historyService.addCall(
            socket.userId,
            partnerSocket.userId,
            socket.isPremium
        );

        await historyService.addCall(
            partnerSocket.userId,
            socket.userId,
            partnerSocket.isPremium
        );

        console.log(
            "✅ SUCCESSFUL CALL RECORDED:",
            socket.userId,
            "<->",
            partnerSocket.userId
        );

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
		            limitedMessage,

		        senderId:
		            socket.userId
		                ? socket.userId.slice(0, 4)
		                : "Guest"
		    }
		);

            }
        );


/*
================================================
END CALL / NEXT PERSON
================================================
*/

socket.on(
    "endCall",
    (action) => {

        const partner =
            activePairs.get(
                socket.id
            );

        if (!partner) {
            return;
        }


        /*
        ================================================
        END CALL / NEXT PERSON
        ================================================
        */

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
);

/*
==================================================
CALL HISTORY
==================================================
*/

socket.on(
    "getCallHistory",
    async () => {

        if (!socket.userId) {

            socket.emit(
                "callHistory",
                []
            );

            return;

        }

        const history =
            await historyService.getUserHistory(
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
CALL BACK
================================================
*/

socket.on(
    "callbackRequest",
    async (partnerId) => {

        if (!socket.userId || !partnerId) {
            return;
        }

        /*
        ================================================
        BLOCKED / REPORTED USER CHECK
        ================================================
        */

        if (
            blockedPairs.has(
                getPairKey(
                    socket.userId,
                    partnerId
                )
            )
        ) {

            socket.emit(
                "callbackUnavailable"
            );

            return;

        }

        const targetSocket =
            [...io.sockets.sockets.values()]
                .find(
                    (client) =>
                        client.userId === partnerId
                );

        if (!targetSocket) {

            socket.emit(
                "callbackUnavailable"
            );

            return;
        }

        const previousCall =
            await historyService.findCall(
                socket.userId,
                partnerId
            );

        if (!previousCall) {

            socket.emit(
                "callbackUnavailable"
            );

            return;
        }

        const declineCount =
            previousCall.declineCount || 0;

        if (declineCount >= 3) {

            socket.emit(
                "callbackLimitReached"
            );

            return;
        }

        /*
        ================================================
        PREVENT DUPLICATE CALLBACKS
        ================================================
        */

        if (
            targetSocket.callbackIncoming ||
            socket.callbackOutgoing
        ) {

            return;
        }

        const callerId =
            socket.userId;

        const targetId =
            targetSocket.userId;

        await historyService.updateCallbackStatus(
            callerId,
            targetId,
            "calling"
        );

        /*
        ================================================
        30 SECOND CALLBACK TIMER
        ================================================
        */

        const callbackTimer =
            setTimeout(
                () => {

                    historyService.updateCallbackStatus(
                        callerId,
                        targetId,
                        "ignored"
                    );

                    socket.callbackOutgoing =
                        null;

                    targetSocket.callbackIncoming =
                        null;

                    socket.emit(
                        "callbackIgnored"
                    );

                    targetSocket.emit(
                        "callbackExpired"
                    );

                },
                30000
            );

        /*
        ================================================
        STORE CALLBACK STATE
        ================================================
        */

        targetSocket.callbackIncoming = {

            callerId,

            callerSocketId:
                socket.id,

            timer:
                callbackTimer

        };

        socket.callbackOutgoing = {

            targetId,

            targetSocketId:
                targetSocket.id,

            timer:
                callbackTimer

        };

        /*
        ================================================
        NOTIFY RECEIVER
        ================================================
        */

        targetSocket.emit(
            "callbackIncoming",
            {
                message:
                    "Anonymous Nigerian is calling you back..."
            }
        );

        /*
        ================================================
        NOTIFY CALLER
        ================================================
        */

        socket.emit(
            "callbackCalling",
            {
                partnerId
            }
        );

    }
);


/*
================================================
CALL BACK RESPONSE
================================================
*/

socket.on(
    "callbackResponse",
    async (response) => {

        const incoming =
            socket.callbackIncoming;

        if (!incoming) {
            return;
        }

        const caller =
            io.sockets.sockets.get(
                incoming.callerSocketId
            );

        clearTimeout(
            incoming.timer
        );

        socket.callbackIncoming =
            null;

        if (!caller) {
            return;
        }

        /*
        ================================================
        DECLINED
        ================================================
        */

        if (response === "decline") {

            const result =
                await historyService.recordCallbackDecline(
                    incoming.callerId,
                    socket.userId
                );

            caller.callbackOutgoing =
                null;

            const declineCount =
                result
                    ? result.declineCount
                    : 1;

            caller.emit(
                "callbackDeclined",
                {
                    declineCount:
                        declineCount,

                    maxDeclines:
                        3
                }
            );

            return;
        }

        /*
        ================================================
        ACCEPTED
        ================================================
        */

        if (response !== "accept") {
            return;
        }

        await historyService.updateCallbackStatus(
            incoming.callerId,
            socket.userId,
            "accepted"
        );

        // Successful callback acceptance resets
        // the decline count for both users.
        await historyService.resetCallbackRelationship(
            incoming.callerId,
            socket.userId
        );

        caller.callbackOutgoing =
            null;

        /*
        ================================================
        RECONNECT THE TWO USERS
        ================================================
        */

        activePairs.set(
            caller.id,
            socket.id
        );

        activePairs.set(
            socket.id,
            caller.id
        );

        /*
        ================================================
        EXISTING WEBRTC MATCH FLOW
        ================================================
        */

        caller.emit(
            "matched",
            {
                initiator: true
            }
        );

        socket.emit(
            "matched",
            {
                initiator: false
            }
        );

    }
);


/*
================================================
CALL BACK DISCONNECT CLEANUP
================================================
*/

socket.on(
    "disconnect",
    () => {

        if (
            socket.callbackIncoming &&
            socket.callbackIncoming.timer
        ) {

            clearTimeout(
                socket.callbackIncoming.timer
            );

            const caller =
                io.sockets.sockets.get(
                    socket.callbackIncoming.callerSocketId
                );

            if (caller) {

                caller.callbackOutgoing =
                    null;

                historyService.updateCallbackStatus(
                    socket.callbackIncoming.callerId,
                    socket.userId,
                    "unavailable"
                );

                caller.emit(
                    "callbackUnavailable"
                );

            }

            socket.callbackIncoming =
                null;

        }

        if (
            socket.callbackOutgoing &&
            socket.callbackOutgoing.timer
        ) {

            clearTimeout(
                socket.callbackOutgoing.timer
            );

            socket.callbackOutgoing =
                null;

        }

    }
);


/*
================================================
CALL BACK RESPONSE
================================================
*/

/*
================================================
CALL BACK DISCONNECT CLEANUP
================================================
*/

socket.on(
    "disconnect",
    () => {

        if (
            socket.callbackIncoming &&
            socket.callbackIncoming.timer
        ) {

            clearTimeout(
                socket.callbackIncoming.timer
            );

        }

        if (
            socket.callbackOutgoing &&
            socket.callbackOutgoing.timer
        ) {

            clearTimeout(
                socket.callbackOutgoing.timer
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
           async (reason) => {

                const partner =
                    activePairs.get(
                        socket.id
                    );


                if (!partner) {

                    return;

                }

		const partnerSocket =
		    io.sockets.sockets.get(
		        partner
		    );

		                if (
                    !socket.userId ||
                    !partnerSocket ||
                    !partnerSocket.userId
                ) {

                    console.log(
                        "⚠️ REPORT BLOCKED: Missing permanent user UUID"
                    );

                    return;

                }


                blockPair(
                    socket.userId,
                    partnerSocket.userId
                );


		const reporterId =
    socket.userId ||
    socket.id;

const reportedId =
    partnerSocket?.userId ||
    partner;

await reportService.addReport({

        reporter:
            reporterId,

        reported:
            reportedId,

        reason:
            reason ||
            "Unspecified"

    });


/*
================================================
HANDLE AUTOMATICALLY BANNED USER
================================================
*/

const reportedUser =
   await identityService.getUser(
        reportedId
    );

if (
    reportedUser &&
    reportedUser.banned === true &&
    Number(
        reportedUser.reportCount
    ) >= 5
) {

    console.log(
        "🔴 USER BANNED:",
        reportedId,
        "Reports:",
        reportedUser.reportCount
    );

    /*
    ================================================
    IMMEDIATELY REMOVE BANNED USER
    ================================================
    */

    const bannedSocket =
        [...io.sockets.sockets.values()]
            .find(
                (client) =>
                    client.userId ===
                    reportedId
            );

    if (bannedSocket) {

        const bannedPartner =
            activePairs.get(
                bannedSocket.id
            );

        /*
        Remove banned user from queue
        */

        queue.removeUser(
            bannedSocket.id
        );

        /*
        End the banned user's active call
        */

	        if (bannedPartner) {

            /*
            ================================================
            THE REPORTER MUST NOT RECEIVE "callEnded"
            WHEN THEIR REPORT CAUSES THE 5TH REPORT BAN.
            THEIR CLIENT WILL RECEIVE reportSubmitted BELOW
            AND SHOW ONLY THE THANK-YOU DIALOG.
            ================================================
            */

            activePairs.delete(
                bannedPartner
            );
            queue.removeUser(
                bannedPartner
            );

        }

        activePairs.delete(
            bannedSocket.id
        );

        /*
        Tell browser it is banned
        */

        bannedSocket.emit(
            "userBanned",
            {
                message:
                    "Your account has been temporarily restricted due to multiple reports."
            }
        );

        /*
        Disconnect the banned account
        */

        setTimeout(
            () => {

                if (
                    bannedSocket.connected
                ) {

                    bannedSocket.disconnect(
                        true
                    );

                }

            },
            100
        );

    }

}

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


		                /*
                ================================================
                END REPORTER'S CALL WITHOUT TRIGGERING
                CALL ENDED DIALOG ON REPORTER
                ================================================
                */

                if (
                    !(
                        reportedUser &&
                        reportedUser.banned === true &&
                        Number(
                            reportedUser.reportCount
                        ) >= 5
                    )
                ) {

                    io.to(
                        partner
                    ).emit(
                        "callEnded"
                    );

                }


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

		console.log(
		    "🔴 ACTIVE USERS:",
		    online,
		    "| Disconnected socket:",
		    socket.id
		);

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

registerSocketHandlers.getOnlineCount =
    getOnlineCount;

module.exports =
    registerSocketHandlers;

