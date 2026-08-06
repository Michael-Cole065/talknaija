const waitingQueue = [];

function addUser(socketId) {
    if (!waitingQueue.includes(socketId)) {
        waitingQueue.push(socketId);
    }
}

function removeUser(socketId) {
    const index = waitingQueue.indexOf(socketId);

    if (index !== -1) {
        waitingQueue.splice(index, 1);
    }
}

function hasTwoUsers() {
    return waitingQueue.length >= 2;
}

function getNextPair() {
    if (!hasTwoUsers()) return null;

    return {
        user1: waitingQueue.shift(),
        user2: waitingQueue.shift()
    };
}

module.exports = {
    addUser,
    removeUser,
    hasTwoUsers,
    getNextPair
};
