const database =
    require("./db/postgres");


function formatCall(row) {
    return {
        partnerId: row.partner_uuid,
        timestamp: new Date(row.timestamp).toISOString(),
        callbackStatus: row.callback_status,
        declineCount: row.decline_count
    };
}


/* ADD CALL */
async function addCall(
    userId,
    partnerId,
    isPremium = false
) {
    if (!userId || !partnerId) return;

    try {
        await database.query(
            `
            INSERT INTO call_history (
                user_uuid,
                partner_uuid,
                timestamp,
                callback_status,
                decline_count
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                userId,
                partnerId,
                new Date().toISOString(),
                "available",
                0
            ]
        );
    } catch (error) {
        console.error(
            "❌ Could not record call history:",
            error
        );
    }
}


/* GET USER HISTORY */
async function getUserHistory(
    userId,
    isPremium = false
) {
    if (!userId) return [];

    try {
        const limit =
            isPremium ? 15 : 5;

        const result =
            await database.query(
                `
                SELECT
                    partner_uuid,
                    timestamp,
                    callback_status,
                    decline_count
                FROM call_history
                WHERE user_uuid = $1
                ORDER BY timestamp DESC
                LIMIT $2
                `,
                [
                    userId,
                    limit
                ]
            );

        return result.rows.map(
            formatCall
        );

    } catch (error) {
        console.error(
            "❌ Could not read call history:",
            error
        );

        return [];
    }
}


/* GET ALL HISTORY */
async function getAllHistory() {
    try {
        const result =
            await database.query(
                `
                SELECT
                    user_uuid,
                    partner_uuid,
                    timestamp,
                    callback_status,
                    decline_count
                FROM call_history
                ORDER BY timestamp DESC
                `
            );

        const history = {};

        for (const row of result.rows) {

            if (!history[row.user_uuid]) {
                history[row.user_uuid] = [];
            }

            history[row.user_uuid].push(
                formatCall(row)
            );
        }

        return history;

    } catch (error) {
        console.error(
            "❌ Could not read all call history:",
            error
        );

        return {};
    }
}


/* FIND SPECIFIC CALL */
async function findCall(
    userId,
    partnerId
) {
    if (!userId || !partnerId) {
        return null;
    }

    try {
        const result =
            await database.query(
                `
                SELECT
                    partner_uuid,
                    timestamp,
                    callback_status,
                    decline_count
                FROM call_history
                WHERE user_uuid = $1
                  AND partner_uuid = $2
                ORDER BY timestamp DESC
                LIMIT 1
                `,
                [
                    userId,
                    partnerId
                ]
            );

        if (result.rows.length === 0) {
            return null;
        }

        return formatCall(
            result.rows[0]
        );

    } catch (error) {
        console.error(
            "❌ Could not find call history:",
            error
        );

        return null;
    }
}


/* UPDATE CALLBACK STATUS */
async function updateCallbackStatus(
    userId,
    partnerId,
    status
) {
    if (!userId || !partnerId) {
        return false;
    }

    try {
        const result =
            await database.query(
                `
                UPDATE call_history
                SET callback_status = $3
                WHERE id = (
                    SELECT id
                    FROM call_history
                    WHERE user_uuid = $1
                      AND partner_uuid = $2
                    ORDER BY timestamp DESC, id DESC
                    LIMIT 1
                )
                `,
                [
                    userId,
                    partnerId,
                    status
                ]
            );

        return result.rowCount > 0;

    } catch (error) {
        console.error(
            "❌ Could not update callback status:",
            error
        );

        return false;
    }
}


/* RESET CALLBACK RELATIONSHIP */
async function resetCallbackRelationship(
    userId,
    partnerId
) {
    if (!userId || !partnerId) {
        return false;
    }

    try {
        return await database.transaction(
            async (client) => {

                const first =
                    await client.query(
                        `
                        UPDATE call_history
                        SET
                            callback_status = 'available',
                            decline_count = 0
                        WHERE id = (
                            SELECT id
                            FROM call_history
                            WHERE user_uuid = $1
                              AND partner_uuid = $2
                            ORDER BY timestamp DESC, id DESC
                            LIMIT 1
                        )
                        `,
                        [
                            userId,
                            partnerId
                        ]
                    );

                const second =
                    await client.query(
                        `
                        UPDATE call_history
                        SET
                            callback_status = 'available',
                            decline_count = 0
                        WHERE id = (
                            SELECT id
                            FROM call_history
                            WHERE user_uuid = $1
                              AND partner_uuid = $2
                            ORDER BY timestamp DESC, id DESC
                            LIMIT 1
                        )
                        `,
                        [
                            partnerId,
                            userId
                        ]
                    );

                return (
                    first.rowCount > 0 ||
                    second.rowCount > 0
                );
            }
        );

    } catch (error) {
        console.error(
            "❌ Could not reset callback relationship:",
            error
        );

        return false;
    }
}


/* RECORD CALLBACK DECLINE */
async function recordCallbackDecline(
    userId,
    partnerId
) {
    if (!userId || !partnerId) {
        return null;
    }

    try {
        const result =
            await database.query(
                `
                UPDATE call_history
                SET
                    decline_count =
                        decline_count + 1,
                    callback_status =
                        'declined'
                WHERE id = (
                    SELECT id
                    FROM call_history
                    WHERE user_uuid = $1
                      AND partner_uuid = $2
                    ORDER BY timestamp DESC, id DESC
                    LIMIT 1
                )
                RETURNING decline_count
                `,
                [
                    userId,
                    partnerId
                ]
            );

        if (result.rows.length === 0) {
            return null;
        }

        return {
            declineCount:
                result.rows[0].decline_count,

            maxDeclines: 3
        };

    } catch (error) {
        console.error(
            "❌ Could not record callback decline:",
            error
        );

        return null;
    }
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
