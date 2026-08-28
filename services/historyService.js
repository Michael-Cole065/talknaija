const fs = require("fs");
const path = require("path");

const historyFile =
    path.join(__dirname, "../data/callHistory.json");


function ensureFile() {

    const directory =
        path.dirname(historyFile);

    if (!fs.existsSync(directory)) {

        fs.mkdirSync(
            directory,
            { recursive: true }
        );

    }

    if (
        !fs.existsSync(historyFile) ||
        fs.statSync(historyFile).size === 0
    ) {

        fs.writeFileSync(
            historyFile,
            "{}"
        );

    }

}


function getHistory() {

    ensureFile();

    try {

        const data =
            fs.readFileSync(
                historyFile,
                "utf8"
            ).trim();

        if (!data) {
            return {};
        }

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "❌ Could not read call history:",
            error
        );

        return {};

    }

}


function saveHistory(history) {

    ensureFile();

    fs.writeFileSync(
        historyFile,
        JSON.stringify(
            history,
            null,
            2
        )
    );

}


/*
==================================================
ADD CALL
==================================================
*/

function addCall(
    userId,
    partnerId,
    isPremium = false
) {

    if (!userId || !partnerId) {
        return;
    }

    const history =
        getHistory();

    if (!history[userId]) {

        history[userId] = [];

    }

    history[userId].unshift({

        partnerId,

        timestamp:
            new Date().toISOString(),

        callbackStatus:
            "available",

        declineCount:
            0

    });

    // Store the complete call history.
    // The 5/15 viewing limit is applied
    // inside getUserHistory(), not here.
    saveHistory(history);

}


/*
==================================================
GET USER HISTORY
==================================================
*/

function getUserHistory(
    userId,
    isPremium = false
) {

    if (!userId) {
        return [];
    }

    const history =
        getHistory();

    const limit =
        isPremium
            ? 15
            : 5;

    return (
        history[userId] || []
    ).slice(
        0,
        limit
    );

}


/*
==================================================
GET ALL HISTORY
==================================================
*/

function getAllHistory() {

    return getHistory();

}

/*
==================================================
FIND SPECIFIC CALL
==================================================
*/

function findCall(
    userId,
    partnerId
) {

    if (!userId || !partnerId) {
        return null;
    }

    const history =
        getHistory();

    const calls =
        history[userId] || [];

    return (
        calls.find(
            (call) =>
                call.partnerId === partnerId
        ) || null
    );

}


/*
==================================================
UPDATE CALLBACK STATUS
==================================================
*/

function resetCallbackRelationship(
    userId,
    partnerId
) {

    if (!userId || !partnerId) {
        return false;
    }

    const history =
        getHistory();

    let changed = false;

    const reset = (
        ownerId,
        targetId
    ) => {

        const calls =
            history[ownerId] || [];

        const call =
            calls.find(
                (item) =>
                    item.partnerId === targetId
            );

        if (!call) {
            return;
        }

        call.callbackStatus =
            "available";

        call.declineCount =
            0;

        changed = true;

    };

    reset(
        userId,
        partnerId
    );

    reset(
        partnerId,
        userId
    );

    if (changed) {
        saveHistory(history);
    }

    return changed;

}

function updateCallbackStatus(
    userId,
    partnerId,
    status
) {

    const history =
        getHistory();

    const calls =
        history[userId] || [];

    const call =
        calls.find(
            (item) =>
                item.partnerId === partnerId
        );

    if (!call) {
        return false;
    }

    call.callbackStatus =
        status;

    saveHistory(history);

    return true;

}


/*
==================================================
RECORD CALLBACK DECLINE
==================================================
*/

function recordCallbackDecline(
    userId,
    partnerId
) {

    const history =
        getHistory();

    const calls =
        history[userId] || [];

    const call =
        calls.find(
            (item) =>
                item.partnerId === partnerId
        );

    if (!call) {
        return null;
    }

    call.declineCount =
        (call.declineCount || 0) + 1;

    call.callbackStatus =
        "declined";

    saveHistory(history);

    return {

        declineCount:
            call.declineCount,

        maxDeclines:
            3

    };

}


module.exports = {

    addCall,

    getUserHistory,

    getAllHistory,

    findCall,

    updateCallbackStatus,

    resetCallbackRelationship,

    recordCallbackDecline

};
