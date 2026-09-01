const crypto = require("crypto");
const database = require("./db/postgres");

/*
==================================================
IDENTITY SERVICE — POSTGRESQL
==================================================

PostgreSQL is now the persistent source of truth.

Legacy:
    data/userRegistry.json

is intentionally NOT deleted.

The existing JSON registry remains available as
a rollback/reference copy until the entire
persistence migration is verified.
==================================================
*/


/*
==================================================
HASH VALUE
==================================================
*/

function hashValue(value) {

    if (!value) {
        return null;
    }

    const secret =
        process.env.IDENTITY_HASH_SECRET ||
        "talknaija-identity";

    return crypto
        .createHmac(
            "sha256",
            secret
        )
        .update(String(value))
        .digest("hex");

}


/*
==================================================
CLIENT IP
==================================================
*/

function getClientIp(socket) {

    const forwarded =
        socket?.handshake?.headers?.["x-forwarded-for"];

    if (forwarded) {

        return String(forwarded)
            .split(",")[0]
            .trim();

    }

    return (
        socket?.handshake?.address ||
        null
    );

}


/*
==================================================
USER AGENT
==================================================
*/

function getUserAgent(socket) {

    return (
        socket?.handshake?.headers?.["user-agent"] ||
        null
    );

}


/*
==================================================
REGISTER USER
==================================================
*/

async function registerUser(
    userId,
    isPremium = false,
    socket = null
) {

    if (!userId) {
        return null;
    }

    const now =
        new Date();

    const premium =
        isPremium === true;

    /*
    --------------------------------------------------
    CREATE / UPDATE USER
    --------------------------------------------------
    */

    const result =
        await database.query(
            `
            INSERT INTO users (
                uuid,
                type,
                is_premium,
                first_seen,
                last_active,
                connection_count
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $4,
                1
            )
            ON CONFLICT (uuid)
            DO UPDATE SET

                last_active =
                    EXCLUDED.last_active,

                connection_count =
                    users.connection_count + 1,

                is_premium =
                    CASE
                        WHEN EXCLUDED.is_premium
                        THEN TRUE
                        ELSE users.is_premium
                    END,

                type =
                    CASE
                        WHEN EXCLUDED.is_premium
                        THEN 'premium'
                        ELSE users.type
                    END,

                updated_at =
                    NOW()

            RETURNING *
            `,
            [
                userId,
                premium
                    ? "premium"
                    : "guest",
                premium,
                now
            ]
        );

    const user =
        result.rows[0];

    /*
    --------------------------------------------------
    IP / USER AGENT HISTORY
    --------------------------------------------------
    */

    if (socket) {

        const ip =
            hashValue(
                getClientIp(socket)
            );

        const userAgent =
            hashValue(
                getUserAgent(socket)
            );

        if (ip) {

            await database.query(
                `
                INSERT INTO user_ip_history (
                    user_uuid,
                    ip_hash
                )
                VALUES ($1,$2)
                ON CONFLICT (
                    user_uuid,
                    ip_hash
                )
                DO NOTHING
                `,
                [
                    userId,
                    ip
                ]
            );

        }

        if (userAgent) {

            await database.query(
                `
                INSERT INTO user_agent_history (
                    user_uuid,
                    user_agent_hash
                )
                VALUES ($1,$2)
                ON CONFLICT (
                    user_uuid,
                    user_agent_hash
                )
                DO NOTHING
                `,
                [
                    userId,
                    userAgent
                ]
            );

        }

    }

    return formatUser(user);

}


/*
==================================================
RECORD VISIT
==================================================
*/

async function recordVisit(
    userId,
    isPremium = false,
    socket = null
) {

    if (!userId) {
        return null;
    }

    /*
    --------------------------------------------------
    ENSURE USER EXISTS
    --------------------------------------------------
    */

    let user =
        await getUser(userId);

    if (!user) {

        user =
            await registerUser(
                userId,
                isPremium,
                socket
            );

    }

    /*
    --------------------------------------------------
    UPDATE VISIT
    --------------------------------------------------
    */

    const result =
        await database.query(
            `
            UPDATE users

            SET
                visit_count =
                    visit_count + 1,

                last_active =
                    NOW(),

                is_premium =
                    CASE
                        WHEN $2 = TRUE
                        THEN TRUE
                        ELSE is_premium
                    END,

                type =
                    CASE
                        WHEN $2 = TRUE
                        THEN 'premium'
                        ELSE type
                    END,

                updated_at =
                    NOW()

            WHERE uuid = $1

            RETURNING *
            `,
            [
                userId,
                isPremium === true
            ]
        );

    user =
        result.rows[0] || null;

    /*
    --------------------------------------------------
    RECORD NEW IP / USER AGENT
    --------------------------------------------------
    */

    if (user && socket) {

        const ip =
            hashValue(
                getClientIp(socket)
            );

        const userAgent =
            hashValue(
                getUserAgent(socket)
            );

        if (ip) {

            await database.query(
                `
                INSERT INTO user_ip_history (
                    user_uuid,
                    ip_hash
                )
                VALUES ($1,$2)
                ON CONFLICT (
                    user_uuid,
                    ip_hash
                )
                DO NOTHING
                `,
                [
                    userId,
                    ip
                ]
            );

        }

        if (userAgent) {

            await database.query(
                `
                INSERT INTO user_agent_history (
                    user_uuid,
                    user_agent_hash
                )
                VALUES ($1,$2)
                ON CONFLICT (
                    user_uuid,
                    user_agent_hash
                )
                DO NOTHING
                `,
                [
                    userId,
                    userAgent
                ]
            );

        }

    }

    return formatUser(user);

}


/*
==================================================
GET USER
==================================================
*/

async function getUser(userId) {

    if (!userId) {
        return null;
    }

    const result =
        await database.query(
            `
            SELECT *
            FROM users
            WHERE uuid = $1
            LIMIT 1
            `,
            [
                userId
            ]
        );

    if (!result.rows.length) {
        return null;
    }

    return formatUser(
        result.rows[0]
    );

}


/*
==================================================
GET USERS
==================================================
*/

async function getUsers() {

    const result =
        await database.query(
            `
            SELECT *
            FROM users
            ORDER BY created_at ASC
            `
        );

    return Promise.all(
        result.rows.map(
            row =>
                formatUserWithHistory(
                    row
                )
        )
    );

}


/*
==================================================
UPDATE REPORT COUNT
==================================================
*/

async function updateReportCount(
    userId,
    count
) {

    if (!userId) {
        return false;
    }

    const result =
        await database.query(
            `
            UPDATE users

            SET
                report_count = $2,
                updated_at = NOW()

            WHERE uuid = $1

            RETURNING uuid
            `,
            [
                userId,
                Number(count) || 0
            ]
        );

    return result.rowCount > 0;

}


/*
==================================================
SET BANNED
==================================================
*/

async function setBanned(
    userId,
    banned,
    reason = "system"
) {

    if (!userId) {
        return false;
    }

    const result =
        await database.query(
            `
            UPDATE users

            SET
                banned = $2,
                updated_at = NOW()

            WHERE uuid = $1

            RETURNING uuid
            `,
            [
                userId,
                banned === true
            ]
        );

    if (!result.rowCount) {
        return false;
    }

    /*
    --------------------------------------------------
    BAN HISTORY
    --------------------------------------------------
    */

    if (banned === true) {

        await database.query(
            `
            INSERT INTO ban_history (
                user_uuid,
                reason
            )
            VALUES ($1,$2)
            `,
            [
                userId,
                reason
            ]
        );

    }

    return true;

}


/*
==================================================
GET BAN EVENT COUNT
==================================================
*/

async function getBanEventCount() {

    const result =
        await database.query(
            `
            SELECT COUNT(*)::int AS count
            FROM ban_history
            `
        );

    return result.rows[0].count;

}


/*
==================================================
RESET REPORT COUNT
==================================================
*/

async function resetReportCount(
    userId
) {

    if (!userId) {
        return false;
    }

    const result =
        await database.query(
            `
            UPDATE users

            SET
                report_count = 0,
                banned = FALSE,
                report_cycle_started_at = NOW(),
                updated_at = NOW()

            WHERE uuid = $1

            RETURNING uuid
            `,
            [
                userId
            ]
        );

    return result.rowCount > 0;

}


/*
==================================================
FORMAT USER
==================================================
*/

function formatUser(row) {

    if (!row) {
        return null;
    }

    return {

        uuid:
            row.uuid,

        type:
            row.type,

        isPremium:
            row.is_premium === true,

        firstSeen:
            row.first_seen
                ? new Date(row.first_seen)
                    .toISOString()
                : null,

        lastActive:
            row.last_active
                ? new Date(row.last_active)
                    .toISOString()
                : null,

        connectionCount:
            Number(
                row.connection_count || 0
            ),

        visitCount:
            Number(
                row.visit_count || 0
            ),

        reportCount:
            Number(
                row.report_count || 0
            ),

        banned:
            row.banned === true,

        reportCycleStartedAt:
            row.report_cycle_started_at
                ? new Date(
                    row.report_cycle_started_at
                ).toISOString()
                : null,

        banHistory: [],

        ipHistory: [],

        userAgentHistory: []

    };

}


/*
==================================================
FORMAT USER + HISTORY
==================================================
*/

async function formatUserWithHistory(row) {

    const user =
        formatUser(row);

    const [
        bans,
        ips,
        agents
    ] =
        await Promise.all([

            database.query(
                `
                SELECT
                    reason,
                    created_at
                FROM ban_history
                WHERE user_uuid = $1
                ORDER BY created_at DESC
                `,
                [row.uuid]
            ),

            database.query(
                `
                SELECT
                    ip_hash
                FROM user_ip_history
                WHERE user_uuid = $1
                ORDER BY created_at ASC
                `,
                [row.uuid]
            ),

            database.query(
                `
                SELECT
                    user_agent_hash
                FROM user_agent_history
                WHERE user_uuid = $1
                ORDER BY created_at ASC
                `,
                [row.uuid]
            )

        ]);

    user.banHistory =
        bans.rows.map(
            item => ({
                reason:
                    item.reason,

                timestamp:
                    item.created_at
                        ? new Date(
                            item.created_at
                        ).toISOString()
                        : null
            })
        );

    user.ipHistory =
        ips.rows.map(
            item =>
                item.ip_hash
        );

    user.userAgentHistory =
        agents.rows.map(
            item =>
                item.user_agent_hash
        );

    return user;

}


/*
==================================================
EXPORTS
==================================================
*/

module.exports = {

    registerUser,

    recordVisit,

    getUser,

    getUsers,

    updateReportCount,

    setBanned,

    getBanEventCount,

    resetReportCount

};
