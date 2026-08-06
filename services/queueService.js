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

    getNextPair() {
        return {
            user1: waitingQueue.shift(),
            user2: waitingQueue.shift()
        };
    },

    getWaitingCount() {
        return waitingQueue.length;
    }

};
