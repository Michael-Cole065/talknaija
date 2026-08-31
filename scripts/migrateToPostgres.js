require("dotenv").config({ path: ".env" });

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const DATA_DIR = path.join(__dirname, "../data");

function readJson(file) {
    return JSON.parse(
        fs.readFileSync(
            path.join(DATA_DIR, file),
            "utf8"
        )
    );
}

const users = readJson("userRegistry.json");
const reports = readJson("reports.json");
const callHistory = readJson("callHistory.json");
const adminActions = readJson("adminActions.json");
const supportTickets = readJson("supportTickets.json");
const donations = readJson("donations.json");
const traffic = readJson("traffic.json");

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

function iso(value) {
    return value ? new Date(value) : null;
}

async function main() {

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not set.");
    }

    console.log("===== TALKNAIJA JSON → POSTGRES MIGRATION =====");
    console.log("");

    console.log("Source records:");
    console.log("  Users:", Object.keys(users).length);
    console.log("  Reports:", reports.length);
    console.log(
        "  Call records:",
        Object.values(callHistory)
            .reduce((n, bucket) => n + bucket.length, 0)
    );
    console.log("  Admin actions:", adminActions.length);
    console.log("  Support tickets:", supportTickets.length);
    console.log("  Donations:", donations.length);
    console.log("  Traffic:", traffic.length);
    console.log("");

    await client.connect();

    try {

        await client.query("BEGIN");

        /*
         * ------------------------------------------------------
         * USERS
         * ------------------------------------------------------
         */

        for (const [uuid, user] of Object.entries(users)) {

            await client.query(
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
                    banned,
                    report_cycle_started_at
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
                )
                ON CONFLICT (uuid) DO NOTHING
                `,
                [
                    uuid,
                    user.type || "guest",
                    user.isPremium === true,
                    iso(user.firstSeen),
                    iso(user.lastActive),
                    Number(user.connectionCount || 0),
                    Number(user.visitCount || 0),
                    Number(user.reportCount || 0),
                    user.banned === true,
                    iso(user.reportCycleStartedAt)
                ]
            );

            /*
             * IP HISTORY
             */

            for (const ipHash of user.ipHistory || []) {

                await client.query(
                    `
                    INSERT INTO user_ip_history (
                        user_uuid,
                        ip_hash
                    )
                    VALUES ($1,$2)
                    ON CONFLICT (user_uuid, ip_hash)
                    DO NOTHING
                    `,
                    [
                        uuid,
                        ipHash
                    ]
                );
            }

            /*
             * USER AGENT HISTORY
             */

            for (
                const userAgentHash
                of user.userAgentHistory || []
            ) {

                await client.query(
                    `
                    INSERT INTO user_agent_history (
                        user_uuid,
                        user_agent_hash
                    )
                    VALUES ($1,$2)
                    ON CONFLICT (user_uuid, user_agent_hash)
                    DO NOTHING
                    `,
                    [
                        uuid,
                        userAgentHash
                    ]
                );
            }

            /*
             * BAN HISTORY
             */

            for (const ban of user.banHistory || []) {

                await client.query(
                    `
                    INSERT INTO ban_history (
                        user_uuid,
                        reason,
                        created_at
                    )
                    VALUES ($1,$2,$3)
                    `,
                    [
                        uuid,
                        typeof ban === "string"
                            ? ban
                            : ban.reason || null,
                        typeof ban === "string"
                            ? new Date().toISOString()
                            : iso(
                                ban.createdAt ||
                                ban.timestamp
                            ) || new Date()
                    ]
                );
            }
        }

        /*
         * ------------------------------------------------------
         * REPORTS
         * ------------------------------------------------------
         *
         * Historical Socket.IO reporter IDs may no longer exist.
         * Preserve those IDs in reporter_legacy_id.
         */

        const userIds =
            new Set(Object.keys(users));

        for (const report of reports) {

            const reporterExists =
                userIds.has(report.reporter);

            await client.query(
                `
                INSERT INTO reports (
                    id,
                    reporter_uuid,
                    reporter_legacy_id,
                    reported_uuid,
                    status,
                    blocked,
                    created_at,
                    updated_at
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8
                )
                ON CONFLICT (id) DO NOTHING
                `,
                [
                    String(report.id),
                    reporterExists
                        ? report.reporter
                        : null,
                    reporterExists
                        ? null
                        : report.reporter,
                    report.reported,
                    report.status || "pending",
                    report.blocked !== false,
                    iso(report.createdAt),
                    iso(report.updatedAt)
                ]
            );
        }

        /*
         * ------------------------------------------------------
         * CALL HISTORY
         * ------------------------------------------------------
         */

        for (
            const [userUuid, calls]
            of Object.entries(callHistory)
        ) {

            /*
             * Only persistent users may be referenced because
             * call_history.user_uuid has a foreign key.
             */

            if (!userIds.has(userUuid)) {
                console.log(
                    `⚠️ Skipping call-history bucket with unknown user: ${userUuid}`
                );
                continue;
            }

            for (const call of calls || []) {

                /*
                 * A partner may be a legacy/temporary identifier.
                 * Preserve only valid persistent user references.
                 */

                if (!userIds.has(call.partnerId)) {
                    console.log(
                        `⚠️ Skipping call with unknown partner: ${call.partnerId}`
                    );
                    continue;
                }

                await client.query(
                    `
                    INSERT INTO call_history (
                        user_uuid,
                        partner_uuid,
                        timestamp,
                        callback_status,
                        decline_count
                    )
                    VALUES ($1,$2,$3,$4,$5)
                    `,
                    [
                        userUuid,
                        call.partnerId,
                        iso(call.timestamp),
                        call.callbackStatus || "available",
                        Number(call.declineCount || 0)
                    ]
                );
            }
        }

        /*
         * ------------------------------------------------------
         * ADMIN ACTIONS
         * ------------------------------------------------------
         */

        for (const action of adminActions) {

            await client.query(
                `
                INSERT INTO admin_actions (
                    id,
                    type,
                    user_uuid,
                    report_id,
                    reason,
                    details,
                    created_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                ON CONFLICT (id) DO NOTHING
                `,
                [
                    String(action.id),
                    action.type,
                    userIds.has(action.userId)
                        ? action.userId
                        : null,
                    action.reportId
                        ? String(action.reportId)
                        : null,
                    action.reason || null,
                    action.details || null,
                    iso(action.createdAt)
                ]
            );
        }

        /*
         * ------------------------------------------------------
         * SUPPORT TICKETS + REPLIES
         * ------------------------------------------------------
         */

        for (const ticket of supportTickets) {

            await client.query(
                `
                INSERT INTO support_tickets (
                    id,
                    email,
                    subject,
                    message,
                    status,
                    created_at,
                    last_replied_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                ON CONFLICT (id) DO NOTHING
                `,
                [
                    String(ticket.id),
                    ticket.email,
                    ticket.subject,
                    ticket.message,
                    ticket.status || "open",
                    iso(ticket.createdAt),
                    iso(ticket.lastRepliedAt)
                ]
            );

            for (const reply of ticket.replies || []) {

                await client.query(
                    `
                    INSERT INTO support_replies (
                        id,
                        ticket_id,
                        message,
                        sender,
                        created_at
                    )
                    VALUES ($1,$2,$3,$4,$5)
                    ON CONFLICT (id) DO NOTHING
                    `,
                    [
                        String(reply.id),
                        String(ticket.id),
                        reply.message,
                        reply.sender || "admin",
                        iso(reply.createdAt)
                    ]
                );
            }
        }

        /*
         * ------------------------------------------------------
         * DONATIONS
         * ------------------------------------------------------
         */

        for (const donation of donations) {

            await client.query(
                `
                INSERT INTO donations (
                    id,
                    reference,
                    email,
                    amount,
                    currency,
                    status,
                    paid_at,
                    channel,
                    created_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                ON CONFLICT (id) DO NOTHING
                `,
                [
                    String(donation.id),
                    donation.reference,
                    donation.email || null,
                    Number(donation.amount || 0),
                    donation.currency || "NGN",
                    donation.status || "unknown",
                    iso(donation.paidAt),
                    donation.channel || null,
                    iso(donation.createdAt)
                ]
            );
        }

        /*
         * ------------------------------------------------------
         * TRAFFIC
         * ------------------------------------------------------
         */

        for (const visit of traffic) {

            await client.query(
                `
                INSERT INTO traffic (
                    id,
                    uuid,
                    type,
                    is_premium,
                    timestamp
                )
                VALUES ($1,$2,$3,$4,$5)
                ON CONFLICT (id) DO NOTHING
                `,
                [
                    String(visit.id),
                    userIds.has(visit.uuid)
                        ? visit.uuid
                        : null,
                    visit.type || "guest",
                    visit.isPremium === true,
                    iso(visit.timestamp)
                ]
            );
        }

        await client.query("COMMIT");

        console.log("");
        console.log("==============================================");
        console.log("✅ MIGRATION COMPLETED");
        console.log("==============================================");

    } catch (error) {

        await client.query("ROLLBACK");

        console.error("");
        console.error("❌ MIGRATION FAILED");
        console.error(error);
        console.error("");
        console.error("↩️ PostgreSQL transaction rolled back.");
        console.error("No partial migration was committed.");

        process.exitCode = 1;

    } finally {

        await client.end();

    }
}

main();
