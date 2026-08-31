const waitingQueue = [];

module.exports = {

    addUser(id) {

        if (!waitingQueue.includes(id)) {
            waitingQueue.push(id);
        }

    },

    removeUser(id) {

        const index = waitingQueue.indexOf(id);

        if (index !== -1) {
            waitingQueue.splice(index, 1);
        }

    },

    hasTwoUsers() {

        return waitingQueue.length >= 2;

    },

getNextPair(
    blockedPairs,
    getUserId
) {

    for (
        let i = 0;
        i < waitingQueue.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < waitingQueue.length;
            j++
        ) {

            const socketId1 =
                waitingQueue[i];

            const socketId2 =
                waitingQueue[j];

            const userId1 =
                getUserId(socketId1) ||
                socketId1;

            const userId2 =
                getUserId(socketId2) ||
                socketId2;

            const pairKey =
                [userId1, userId2]
                    .sort()
                    .join(":");

            if (
                blockedPairs.has(
                    pairKey
                )
            ) {

                continue;

            }

            waitingQueue.splice(
                j,
                1
            );

            waitingQueue.splice(
                i,
                1
            );

            return {

                user1:
                    socketId1,

                user2:
                    socketId2

            };

        }

    }

    return null;

},

    getWaitingCount() {

        return waitingQueue.length;

    }

};
