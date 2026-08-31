const crypto = require("crypto");
const db = require("./database");


/*
==================================================
IDENTITY SERVICE — POSTGRESQL
==================================================

PostgreSQL is now the active persistent store.

Legacy:
    data/userRegistry.json

is intentionally left untouched as a backup/reference.

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
        .createHmac("sha256", secret)
        .update(String(value))
        .digest("hex");

}


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

    /*
    ------------------------------------------------
    CREATE USER IF NEEDED
    ------------------------------------------------
    */

    await db.query(
        `
        INSERT INTO users (
            uuid,
            type,
            is_premium,
            first_seen,
            last_active,
            connection_count,
            visit_count,
            report_count,
            banned
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            1,
            0,
            0,
            FALSE
        )
        ON CONFLICT (uuid)
        DO UPDATE SET
            last_active = EXCLUDED.last_active,
            connection_count =
                users.connection_count + 1,
            is_premium =
                users.is_premium OR EXCLUDED.is_premium,
            type =
                CASE
                    WHEN users.is_premium
                         OR EXCLUDED.is_premium
                    THEN 'premium'
                    ELSE users.type
                END,
            updated_at = NOW()
        `,
        [
            userId,
            isPremium === true
                ? "premium"
                : "guest",
            isPremium === true,
            now,
            now
        ]
    );


    /*
    ------------------------------------------------
    IP / USER AGENT HISTORY
    ------------------------------------------------
    */

    if (socket) {

        const ip =
            getClientIp(socket);

        const userAgent =
            getUserAgent(socket);

        const hashedIp =
            hashValue(ip);

        const hashedUserAgent =
            hashValue(userAgent);


        if (hashedIp) {

            await db.query(
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
                    hashedIp
                ]
            );

        }


        if (hashedUserAgent) {

            await db.query(
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
                    hashedUserAgent
                ]
            );

        }

    }


    return getUser(userId);

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
    Ensure user exists.
    */

    const existing =
        await getUser(userId);

    if (!existing) {

        await registerUser(
            userId,
            isPremium,
            socket
        );

    }


    /*
    Update visit statistics.
    */

    await db.query(
        `
        UPDATE users
        SET
            last_active = NOW(),
            visit_count = visit_count + 1,
            is_premium =
                is_premium OR $2,
            type =
                CASE
                    WHEN is_premium OR $2
                    THEN 'premium'
                    ELSE type
                END,
            updated_at = NOW()
        WHERE uuid = $1
        `,
        [
            userId,
            isPremium === true
        ]
    );


    /*
    Record IP / UA if supplied.
    */

    if (socket) {

        const hashedIp =
            hashValue(
                getClientIp(socket)
            );

        const hashedUserAgent =
            hashValue(
                getUserAgent(socket)
            );


        if (hashedIp) {

            await db.query(
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
                    hashedIp
                ]
            );

        }


        if (hashedUserAgent) {

            await db.query(
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
                    hashedUserAgent
                ]
            );

        }

    }


    return getUser(userId);

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
        await db.query(
            `
            SELECT
                u.uuid,
                u.type,
                u.is_premium AS "isPremium",
                u.first_seen AS "firstSeen",
                u.last_active AS "lastActive",
                u.connection_count AS "connectionCount",
                u.visit_count AS "visitCount",
                u.report_count AS "reportCount",
                u.banned,
                u.report_cycle_started_at
                    AS "reportCycleStartedAt",

                COALESCE(
                    (
                        SELECT json_agg(x.ip_hash)
                        FROM user_ip_history x
                        WHERE x.user_uuid = u.uuid
                    ),
                    '[]'::json
                ) AS "ipHistory",

                COALESCE(
                    (
                        SELECT json_agg(x.user_agent_hash)
                        FROM user_agent_history x
                        WHERE x.user_uuid = u.uuid
                    ),
                    '[]'::json
                ) AS "userAgentHistory",

                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'reason', b.reason,
                                'timestamp',
                                b.created_at
                            )
                            ORDER BY b.created_at DESC
                        )
                        FROM ban_history b
                        WHERE b.user_uuid = u.uuid
                    ),
                    '[]'::json
                ) AS "banHistory"

            FROM users u
            WHERE u.uuid = $1
            `,
            [userId]
        );

    return result.rows[0] || null;

}


/*
==================================================
GET ALL USERS
==================================================
*/

async function getUsers() {

    const result =
        await db.query(
            `
            SELECT uuid
            FROM users
            ORDER BY created_at DESC
            `
        );

    const users = [];

    for (const row of result.rows) {

        const user =
            await getUser(row.uuid);

        if (user) {
            users.push(user);
        }

    }

    return users;

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
        await db.query(
            `
            UPDATE users
            SET
                report_count = $2,
                updated_at = NOW()
            WHERE uuid = $1
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

    const isBanned =
        banned === true;

    const result =
        await db.query(
            `
            UPDATE users
            SET
                banned = $2,
                updated_at = NOW()
            WHERE uuid = $1
            `,
            [
                userId,
                isBanned
            ]
        );

    if (
        result.rowCount === 0
    ) {
        return false;
    }


    if (isBanned) {

        await db.query(
            `
            INSERT INTO ban_history (
                user_uuid,
                reason,
                created_at
            )
            VALUES (
                $1,
                $2,
                NOW()
            )
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
        await db.query(
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
        await db.query(
            `
            UPDATE users
            SET
                report_count = 0,
                banned = FALSE,
                report_cycle_started_at = NOW(),
                updated_at = NOW()
            WHERE uuid = $1
            `,
            [userId]
        );

    return result.rowCount > 0;

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
