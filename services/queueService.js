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

    getNextPair(blockedPairs) {

        for (let i = 0; i < waitingQueue.length; i++) {

            for (let j = i + 1; j < waitingQueue.length; j++) {

                const user1 = waitingQueue[i];
                const user2 = waitingQueue[j];

                const pairKey = [user1, user2].sort().join(":");

                if (blockedPairs.has(pairKey)) {
                    continue;
                }

                waitingQueue.splice(j, 1);
                waitingQueue.splice(i, 1);

                return {
                    user1,
                    user2
                };

            }

        }

        return null;

    },

    getWaitingCount() {

        return waitingQueue.length;

    }

};
