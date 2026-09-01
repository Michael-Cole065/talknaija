const database = require("./db/postgres");

async function recordVisit(
    userId,
    type = "guest",
    isPremium = false
) {
    if (!userId) {
        return false;
    }

    try {
        await database.query(
            `
            INSERT INTO traffic (
                id,
                uuid,
                type,
                is_premium,
                timestamp
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 10)}`,
                userId,
                isPremium === true ? "premium" : type,
                isPremium === true,
                new Date().toISOString()
            ]
        );

        return true;
    } catch (error) {
        console.error(
            "❌ Could not record traffic:",
            error
        );

        return false;
    }
}

async function getRecentVisits(limit = 100) {
    try {
        const safeLimit = Math.max(
            1,
            Math.min(Number(limit) || 100, 1000)
        );

        const result = await database.query(
            `
            SELECT
                id,
                uuid,
                type,
                is_premium,
                timestamp
            FROM traffic
            ORDER BY timestamp DESC
            LIMIT $1
            `,
            [safeLimit]
        );

        return result.rows.map(row => ({
            id: row.id,
            uuid: row.uuid,
            type: row.type,
            isPremium: row.is_premium,
            timestamp: new Date(row.timestamp).toISOString()
        }));
    } catch (error) {
        console.error(
            "❌ Could not read traffic:",
            error
        );

        return [];
    }
}

async function getUserVisits(userId) {
    if (!userId) {
        return [];
    }

    try {
        const result = await database.query(
            `
            SELECT
                id,
                uuid,
                type,
                is_premium,
                timestamp
            FROM traffic
            WHERE uuid = $1
            ORDER BY timestamp DESC
            `,
            [userId]
        );

        return result.rows.map(row => ({
            id: row.id,
            uuid: row.uuid,
            type: row.type,
            isPremium: row.is_premium,
            timestamp: new Date(row.timestamp).toISOString()
        }));
    } catch (error) {
        console.error(
            "❌ Could not read user traffic:",
            error
        );

        return [];
    }
}

async function getVisitCount() {
    try {
        const result = await database.query(
            `
            SELECT COUNT(*)::int AS total
            FROM traffic
            `
        );

        return result.rows[0].total;
    } catch (error) {
        console.error(
            "❌ Could not count traffic:",
            error
        );

        return 0;
    }
}

module.exports = {
    recordVisit,
    getRecentVisits,
    getUserVisits,
    getVisitCount
};
