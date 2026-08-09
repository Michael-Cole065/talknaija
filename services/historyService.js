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
)
 {

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

function addCall(userId, partnerId, isPremium = false) {

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
            new Date().toISOString()

    });

    const limit =
        isPremium ? 15 : 5;

    history[userId] =
        history[userId].slice(
            0,
            limit
        );

    saveHistory(history);

}

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
        isPremium ? 15 : 5;

    return (
        history[userId] || []
    ).slice(
        0,
        limit
    );

}

module.exports = {
    addCall,
    getUserHistory
};
