const database =
    require("./db/postgres");


function formatDonation(
    row
) {

    return {

        id:
            row.id,

        reference:
            row.reference,

        email:
            row.email,

        amount:
            Number(row.amount || 0),

        currency:
            row.currency,

        status:
            row.status,

        paidAt:
            row.paid_at
                ? new Date(
                    row.paid_at
                ).toISOString()
                : null,

        channel:
            row.channel,

        createdAt:
            new Date(
                row.created_at
            ).toISOString()

    };

}


async function recordDonation(
    payment
) {

    if (
        !payment ||
        !payment.reference
    ) {
        return null;
    }


    const existing =
        await database.query(
            `
            SELECT
                id,
                reference,
                email,
                amount,
                currency,
                status,
                paid_at,
                channel,
                created_at
            FROM donations
            WHERE reference = $1
            LIMIT 1
            `,
            [
                payment.reference
            ]
        );


    if (
        existing.rows.length > 0
    ) {

        return formatDonation(
            existing.rows[0]
        );

    }


    const donation = {

        id:
            `DON-${Date.now()}`,

        reference:
            payment.reference,

        email:
            payment.customer?.email ||
            null,

        amount:
            payment.currency === "NGN"
                ? (Number(payment.amount) || 0) / 100
                : Number(payment.amount) || 0,

        currency:
            payment.currency ||
            "NGN",

        status:
            payment.status ||
            "unknown",

        paidAt:
            payment.paid_at ||
            null,

        channel:
            payment.channel ||
            null,

        createdAt:
            new Date().toISOString()

    };


    await database.query(
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
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
        )
        `,
        [
            donation.id,
            donation.reference,
            donation.email,
            donation.amount,
            donation.currency,
            donation.status,
            donation.paidAt,
            donation.channel,
            donation.createdAt
        ]
    );


    return donation;

}


async function getAllDonations() {

    const result =
        await database.query(
            `
            SELECT
                id,
                reference,
                email,
                amount,
                currency,
                status,
                paid_at,
                channel,
                created_at
            FROM donations
            ORDER BY created_at DESC
            `
        );


    return result.rows.map(
        formatDonation
    );

}


async function getDonationStats() {

    const result =
        await database.query(
            `
            SELECT
                COUNT(*)::int AS total_donations,
                COALESCE(
                    SUM(amount),
                    0
                ) AS total_amount
            FROM donations
            WHERE status = 'success'
            `
        );


    const successful =
        await database.query(
            `
            SELECT
                id,
                reference,
                email,
                amount,
                currency,
                status,
                paid_at,
                channel,
                created_at
            FROM donations
            WHERE status = 'success'
            ORDER BY created_at DESC
            `
        );


    return {

        totalDonations:
            result.rows[0].total_donations,

        totalAmount:
            Number(
                result.rows[0].total_amount || 0
            ),

        currency:
            "NGN",

        donations:
            successful.rows.map(
                formatDonation
            )

    };

}


module.exports = {

    recordDonation,

    getAllDonations,

    getDonationStats

};
