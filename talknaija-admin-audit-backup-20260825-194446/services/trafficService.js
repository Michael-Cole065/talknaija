const fs = require("fs");
const path = require("path");

const trafficFile =
    path.join(__dirname, "../data/traffic.json");

function ensureFile() {
    const directory = path.dirname(trafficFile);

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }

    if (
        !fs.existsSync(trafficFile) ||
        fs.statSync(trafficFile).size === 0
    ) {
        fs.writeFileSync(trafficFile, "[]");
    }
}

function getTraffic() {
    ensureFile();

    try {
        const data = fs.readFileSync(
            trafficFile,
            "utf8"
        ).trim();

        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error(
            "❌ Could not read traffic:",
            error
        );

        return [];
    }
}

function saveTraffic(traffic) {
    ensureFile();

    fs.writeFileSync(
        trafficFile,
        JSON.stringify(
            traffic,
            null,
            2
        )
    );
}

function getRecentVisits(limit = 100) {
    return getTraffic()
        .slice(0, limit);
}

function recordVisit(
    userId,
    type = "guest",
    isPremium = false
) {
    if (!userId) {
        return false;
    }

    const traffic = getTraffic();

    traffic.unshift({
        id:
            `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 10)}`,

        uuid: userId,

        type:
            isPremium === true
                ? "premium"
                : type,

        isPremium:
            isPremium === true,

        timestamp:
            new Date().toISOString()
    });

    saveTraffic(traffic);

    return true;
}

function getUserVisits(userId) {
    if (!userId) {
        return [];
    }

    return getTraffic().filter(
        (visit) =>
            visit.uuid === userId
    );
}

function getVisitCount() {
    return getTraffic().length;
}

module.exports = {
    recordVisit,
    getRecentVisits,
    getUserVisits,
    getVisitCount
};
