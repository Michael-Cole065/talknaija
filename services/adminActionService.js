const database = require("./db/postgres");

async function recordAction(action) {
    if (!action || !action.type) {
        return null;
    }

    const record = {
        id: `ACT-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        type: action.type,
        userId: action.userId || null,
        reportId: action.reportId || null,
        reason: action.reason || null,
        details: action.details || null,
        createdAt: new Date().toISOString()
    };

    try {
        await database.query(
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
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [
                record.id,
                record.type,
                record.userId,
                record.reportId,
                record.reason,
                record.details,
                record.createdAt
            ]
        );

        return record;
    } catch (error) {
        console.error(
            "❌ Could not record admin action:",
            error
        );

        return null;
    }
}

async function getAllActions() {
    try {
        const result = await database.query(
            `
            SELECT
                id,
                type,
                user_uuid,
                report_id,
                reason,
                details,
                created_at
            FROM admin_actions
            ORDER BY created_at DESC
            `
        );

        return result.rows.map(row => ({
            id: row.id,
            type: row.type,
            userId: row.user_uuid,
            reportId: row.report_id,
            reason: row.reason,
            details: row.details,
            createdAt: new Date(row.created_at).toISOString()
        }));
    } catch (error) {
        console.error(
            "❌ Could not read admin actions:",
            error
        );

        return [];
    }
}

module.exports = {
    recordAction,
    getAllActions
};
