const database =
    require("./db/postgres");

const identityService =
    require("./identityService");


/*
==================================================
FORMAT REPORT
==================================================
*/

function formatReport(row) {

    if (!row) {
        return null;
    }

    return {

        id:
            row.id,

        reporter:
            row.reporter_uuid ||
            row.reporter_legacy_id ||
            null,

        reported:
            row.reported_uuid,

        reason:
            row.reason ||
            "Unspecified",

        status:
            row.status ||
            "pending",

        blocked:
            row.blocked === true,

        createdAt:
            row.created_at
                ? new Date(
                    row.created_at
                ).toISOString()
                : null,

        updatedAt:
            row.updated_at
                ? new Date(
                    row.updated_at
                ).toISOString()
                : null

    };

}


/*
==================================================
GET REPORTS
==================================================
*/

async function getReports() {

    const result =
        await database.query(
            `
            SELECT
                id,
                reporter_uuid,
                reported_uuid,
                reporter_legacy_id,
                reason,
                status,
                blocked,
                created_at,
                updated_at

            FROM reports

            ORDER BY created_at ASC
            `
        );

    return result.rows.map(
        formatReport
    );

}


/*
==================================================
ADD REPORT
==================================================
*/

async function addReport(report) {

    if (!report || !report.reported) {
        return null;
    }

    const reporter =
        report.reporter || null;

    const reported =
        report.reported;

    /*
    --------------------------------------------------
    DETERMINE WHETHER REPORTER IS A UUID
    --------------------------------------------------
    */

    let reporterUuid = null;
    let reporterLegacyId = null;

    if (reporter) {

        const reporterUser =
            await identityService.getUser(
                reporter
            );

        if (reporterUser) {

            reporterUuid =
                reporter;

        } else {

            reporterLegacyId =
                reporter;

        }

    }

    const result =
        await database.query(
            `
            INSERT INTO reports (
                id,
                reporter_uuid,
                reported_uuid,
                reporter_legacy_id,
                reason,
                status,
                blocked,
                created_at,
                updated_at
            )

            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                'pending',
                TRUE,
                NOW(),
                NULL
            )

            RETURNING
                id,
                reporter_uuid,
                reported_uuid,
                reporter_legacy_id,
                reason,
                status,
                blocked,
                created_at,
                updated_at
            `,
            [
                Date.now().toString(),
                reporterUuid,
                reported,
                reporterLegacyId,
                report.reason ||
                "Unspecified"
            ]
        );

    const newReport =
        formatReport(
            result.rows[0]
        );

    /*
    --------------------------------------------------
    UPDATE REPORT COUNT
    --------------------------------------------------
    */

    const counts =
        await getReportCountsByUser();

    const currentCount =
        counts[reported] || 0;

    await identityService.updateReportCount(
        reported,
        currentCount
    );

    /*
    --------------------------------------------------
    AUTOMATIC 5-REPORT BAN
    --------------------------------------------------
    */

    const user =
        await identityService.getUser(
            reported
        );

    if (
        user &&
        currentCount >= 5 &&
        user.banned !== true
    ) {

        await identityService.setBanned(
            reported,
            true,
            "Automatic ban after reaching 5 reports"
        );

        console.log(
            "🔴 AUTOMATIC USER BAN:",
            reported,
            "Reports:",
            currentCount
        );

    }

    return newReport;

}


/*
==================================================
UPDATE REPORT STATUS
==================================================
*/

async function updateReportsStatusByUUID(
    reportedUuid,
    status
) {

    if (!reportedUuid) {
        return [];
    }

    const result =
        await database.query(
            `
            UPDATE reports

            SET
                status = $2,
                updated_at = NOW()

            WHERE reported_uuid = $1

            RETURNING
                id,
                reporter_uuid,
                reported_uuid,
                reporter_legacy_id,
                reason,
                status,
                blocked,
                created_at,
                updated_at
            `,
            [
                reportedUuid,
                status
            ]
        );

    return result.rows.map(
        formatReport
    );

}


async function updateReportStatus(
    id,
    status
) {

    const result =
        await database.query(
            `
            UPDATE reports

            SET
                status = $2,
                updated_at = NOW()

            WHERE id = $1

            RETURNING
                id,
                reporter_uuid,
                reported_uuid,
                reporter_legacy_id,
                reason,
                status,
                blocked,
                created_at,
                updated_at
            `,
            [
                id,
                status
            ]
        );

    if (!result.rowCount) {
        return null;
    }

    return formatReport(
        result.rows[0]
    );

}


/*
==================================================
SET REPORT BLOCKED
==================================================
*/

async function setReportBlocked(
    id,
    blocked
) {

    const result =
        await database.query(
            `
            UPDATE reports

            SET
                blocked = $2,
                updated_at = NOW()

            WHERE id = $1

            RETURNING
                id,
                reporter_uuid,
                reported_uuid,
                reporter_legacy_id,
                reason,
                status,
                blocked,
                created_at,
                updated_at
            `,
            [
                id,
                blocked === true
            ]
        );

    if (!result.rowCount) {
        return null;
    }

    return formatReport(
        result.rows[0]
    );

}

/*
==================================================
SET PAIR BLOCKED
==================================================
*/

async function setPairBlocked(
    user1,
    user2,
    blocked
) {

    if (!user1 || !user2) {
        return false;
    }

    const result =
        await database.query(
            `
            UPDATE reports

            SET
                blocked = $3,
                updated_at = NOW()

            WHERE
                (
                    reporter_uuid = $1
                    AND
                    reported_uuid = $2
                )
                OR
                (
                    reporter_uuid = $2
                    AND
                    reported_uuid = $1
                )
            `,
            [
                user1,
                user2,
                blocked === true
            ]
        );

    return result.rowCount > 0;

}

/*
==================================================
GET BLOCKED PAIRS
==================================================
*/

async function getBlockedPairs() {

    const result =
        await database.query(
            `
            SELECT
                reporter_uuid,
                reporter_legacy_id,
                reported_uuid

            FROM reports

            WHERE blocked = TRUE
              AND reported_uuid IS NOT NULL
            `
        );

    return result.rows
        .map((row) => ({

            user1:
                row.reporter_uuid ||
                row.reporter_legacy_id ||
                null,

            user2:
                row.reported_uuid

        }))
        .filter(
            (pair) =>
                pair.user1 &&
                pair.user2
        );

}


/*
==================================================
GET REPORT COUNTS BY USER
==================================================
*/

async function getReportCountsByUser() {

    const result =
        await database.query(
            `
            SELECT
                r.reported_uuid,
                COUNT(*)::int AS count,
                u.report_cycle_started_at

            FROM reports r

            LEFT JOIN users u
                ON u.uuid = r.reported_uuid

            GROUP BY
                r.reported_uuid,
                u.report_cycle_started_at
            `
        );

    const counts = {};

    result.rows.forEach(
        (row) => {

            counts[row.reported_uuid] =
                Number(row.count) || 0;

        }
    );

    /*
    --------------------------------------------------
    EXCLUDE REPORTS FROM PREVIOUS REPORT CYCLE
    --------------------------------------------------
    */

    const reports =
        await database.query(
            `
            SELECT
                id,
                reported_uuid,
                created_at

            FROM reports

            ORDER BY created_at ASC
            `
        );

    const recalculated = {};

    reports.rows.forEach(
        (report) => {

            if (!report.reported_uuid) {
                return;
            }

            const userResult =
                result.rows.find(
                    (row) =>
                        row.reported_uuid ===
                        report.reported_uuid
                );

            const cycleStart =
                userResult
                    ?.report_cycle_started_at;

            if (
                cycleStart &&
                report.created_at &&
                new Date(
                    report.created_at
                ) <
                new Date(
                    cycleStart
                )
            ) {
                return;
            }

            recalculated[
                report.reported_uuid
            ] =
                (
                    recalculated[
                        report.reported_uuid
                    ] || 0
                ) + 1;

        }
    );

    return recalculated;

}


/*
==================================================
GET RED ACCOUNTS
==================================================
*/

async function getRedAccounts() {

    const counts =
        await getReportCountsByUser();

    const users =
        await identityService.getUsers();

    return users
        .filter(
            (user) => {

                if (
                    !user ||
                    !user.uuid
                ) {
                    return false;
                }

                const reportCount =
                    Math.max(
                        counts[user.uuid] || 0,
                        Number(
                            user.reportCount
                        ) || 0
                    );

                return (
                    user.banned === true ||
                    reportCount >= 5
                );

            }
        )
        .map(
            (user) => {

                const reportCount =
                    Math.max(
                        counts[user.uuid] || 0,
                        Number(
                            user.reportCount
                        ) || 0
                    );

                return {

                    userId:
                        user.uuid,

                    reports:
                        reportCount,

                    banned:
                        user.banned === true

                };

            }
        );

}


/*
==================================================
EXPORTS
==================================================
*/

module.exports = {

    getReports,

    addReport,

    updateReportStatus,

    updateReportsStatusByUUID,

    setReportBlocked,

    setPairBlocked,

    getBlockedPairs,

    getReportCountsByUser,

    getRedAccounts

};
