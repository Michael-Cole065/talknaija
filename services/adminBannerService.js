const database = require("./db/postgres");

/*
==================================================
ADMIN BANNER STATE
Persistent acknowledgement timestamps for the
TalkNaija admin dashboard.

A banner shows events that happened AFTER its
last acknowledged timestamp.

Opening a banner acknowledges everything that
exists at that moment.
==================================================
*/

async function initializeAdminBannerState() {

    await database.query(`
        CREATE TABLE IF NOT EXISTS admin_banner_state (
            key TEXT PRIMARY KEY,
            acknowledged_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await database.query(`
        ALTER TABLE admin_banner_state
        ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ
    `);

    const keys = [
        "reports",
        "mail",
        "actionTaken",
        "red",
        "traffic",
        "guests",
        "members",
        "premium"
    ];

    for (const key of keys) {

        await database.query(
            `
            INSERT INTO admin_banner_state (
                key,
                acknowledged_at,
                updated_at
            )
            VALUES ($1, NOW(), NOW())
            ON CONFLICT (key)
            DO NOTHING
            `,
            [key]
        );

    }

}


async function getAcknowledgedAt(key) {

    if (!key) {
        return null;
    }

    const result =
        await database.query(
            `
            SELECT acknowledged_at
            FROM admin_banner_state
            WHERE key = $1
            `,
            [key]
        );

    if (!result.rowCount) {
        return null;
    }

    return result.rows[0].acknowledged_at
        ? new Date(
            result.rows[0].acknowledged_at
        ).toISOString()
        : null;

}


async function acknowledgeBanner(
    key,
    acknowledgedAt = new Date()
) {

    if (!key) {
        return false;
    }

    const date =
        new Date(acknowledgedAt);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    await database.query(
        `
        INSERT INTO admin_banner_state (
            key,
            acknowledged_at,
            updated_at
        )
        VALUES ($1, $2, NOW())

        ON CONFLICT (key)
        DO UPDATE SET
            acknowledged_at = EXCLUDED.acknowledged_at,
            updated_at = NOW()
        `,
        [
            key,
            date.toISOString()
        ]
    );

    return true;

}


module.exports = {
    initializeAdminBannerState,
    getAcknowledgedAt,
    acknowledgeBanner
};
