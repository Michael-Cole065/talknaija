const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const identityFile =
    path.join(__dirname, "../data/userRegistry.json");

function ensureFile() {
    const directory = path.dirname(identityFile);

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }

    if (
        !fs.existsSync(identityFile) ||
        fs.statSync(identityFile).size === 0
    ) {
        fs.writeFileSync(identityFile, "{}");
    }
}

function getRegistry() {
    ensureFile();

    try {
        const data = fs.readFileSync(
            identityFile,
            "utf8"
        ).trim();

        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error(
            "❌ Could not read user registry:",
            error
        );

        return {};
    }
}

function saveRegistry(registry) {
    ensureFile();

    fs.writeFileSync(
        identityFile,
        JSON.stringify(registry, null, 2)
    );
}

function hashValue(value) {
    if (!value) {
        return null;
    }

    const secret =
        process.env.IDENTITY_HASH_SECRET ||
        "talknaija-identity";

    return crypto
        .createHmac("sha256", secret)
        .update(String(value))
        .digest("hex");
}

function getClientIp(socket) {
    const forwarded =
        socket.handshake?.headers?.["x-forwarded-for"];

    if (forwarded) {
        return String(forwarded)
            .split(",")[0]
            .trim();
    }

    return (
        socket.handshake?.address ||
        null
    );
}

function getUserAgent(socket) {
    return (
        socket.handshake?.headers?.["user-agent"] ||
        null
    );
}

function registerUser(
    userId,
    isPremium = false,
    socket = null
) {
    if (!userId) {
        return null;
    }

    const registry = getRegistry();
    const now = new Date().toISOString();

    let user = registry[userId];

    if (!user) {
        user = {
            uuid: userId,
            type: isPremium
                ? "premium"
                : "guest",
            isPremium: isPremium === true,
            firstSeen: now,
            lastActive: now,
            connectionCount: 0,
            visitCount: 0,
            reportCount: 0,
            banned: false,
            banHistory: [],
            ipHistory: [],
            userAgentHistory: []
        };
    }

    user.lastActive = now;

    user.connectionCount =
        (user.connectionCount || 0) + 1;

    if (isPremium === true) {
        user.isPremium = true;
        user.type = "premium";
    }

    if (socket) {
        const ip = getClientIp(socket);
        const userAgent = getUserAgent(socket);

        const hashedIp = hashValue(ip);
        const hashedUserAgent =
            hashValue(userAgent);

        if (
            hashedIp &&
            !user.ipHistory.includes(hashedIp)
        ) {
            user.ipHistory.push(hashedIp);
        }

        if (
            hashedUserAgent &&
            !user.userAgentHistory.includes(
                hashedUserAgent
            )
        ) {
            user.userAgentHistory.push(
                hashedUserAgent
            );
        }
    }

    registry[userId] = user;

    saveRegistry(registry);

    return user;
}

function recordVisit(
    userId,
    isPremium = false,
    socket = null
) {
    if (!userId) {
        return null;
    }

    const registry = getRegistry();

    if (!registry[userId]) {
        registerUser(
            userId,
            isPremium,
            socket
        );
    }

    const user = registry[userId];

    user.lastActive =
        new Date().toISOString();

    user.visitCount =
        (user.visitCount || 0) + 1;

    if (isPremium === true) {
        user.isPremium = true;
        user.type = "premium";
    }

    saveRegistry(registry);

    return user;
}

function getUser(userId) {
    if (!userId) {
        return null;
    }

    const registry = getRegistry();

    return registry[userId] || null;
}

function getUsers() {
    return Object.values(
        getRegistry()
    );
}

function updateReportCount(
    userId,
    count
) {
    if (!userId) {
        return false;
    }

    const registry = getRegistry();

    if (!registry[userId]) {
        return false;
    }

    registry[userId].reportCount =
        Number(count) || 0;

    saveRegistry(registry);

    return true;
}

function setBanned(
    userId,
    banned,
    reason = "system"
) {
    if (!userId) {
        return false;
    }

    const registry = getRegistry();

    if (!registry[userId]) {
        return false;
    }

    const user = registry[userId];

    user.banned = banned === true;

    if (banned === true) {
        user.banHistory =
            user.banHistory || [];

        user.banHistory.unshift({
            reason,
            timestamp:
                new Date().toISOString()
        });
    }

    saveRegistry(registry);

    return true;
}

module.exports = {
    registerUser,
    recordVisit,
    getUser,
    getUsers,
    updateReportCount,
    setBanned
};
