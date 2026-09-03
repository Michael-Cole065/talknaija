const crypto = require("crypto");

const database =
    require("./db/postgres");


function formatReply(row) {

    return {

        id:
            row.id,

        message:
            row.message,

        sender:
            row.sender,

        createdAt:
            new Date(
                row.created_at
            ).toISOString()

    };

}


function formatTicket(
    row,
    replies = []
) {

    return {

        id:
            row.id,

        email:
            row.email,

        subject:
            row.subject,

        message:
            row.message,

        status:
            row.status,

        createdAt:
            new Date(
                row.created_at
            ).toISOString(),

        ...(row.last_replied_at
            ? {
                lastRepliedAt:
                    new Date(
                        row.last_replied_at
                    ).toISOString()
            }
            : {}),

        replies

    };

}


async function createSupportTicket(
    email,
    subject,
    message
) {

    const ticket = {

        id:
            "TN-" +
            crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase(),

        email:
            email.trim(),

        subject:
            subject.trim(),

        message:
            message.trim(),

        status:
            "open",

        createdAt:
            new Date().toISOString()

    };


    await database.query(
        `
        INSERT INTO support_tickets (
            id,
            email,
            subject,
            message,
            status,
            created_at
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
        )
        `,
        [
            ticket.id,
            ticket.email,
            ticket.subject,
            ticket.message,
            ticket.status,
            ticket.createdAt
        ]
    );


    return {

        ...ticket,

        replies: []

    };

}


async function getAllSupportTickets() {

    const result =
        await database.query(
            `
            SELECT
                id,
                email,
                subject,
                message,
                status,
                created_at,
                last_replied_at
            FROM support_tickets
            ORDER BY created_at DESC
            `
        );


    const tickets = [];

    for (
        const row of result.rows
    ) {

        const replies =
            await database.query(
                `
                SELECT
                    id,
                    ticket_id,
                    message,
                    sender,
                    created_at
                FROM support_replies
                WHERE ticket_id = $1
                ORDER BY created_at ASC
                `,
                [
                    row.id
                ]
            );


        tickets.push(
            formatTicket(
                row,
                replies.rows.map(
                    formatReply
                )
            )
        );

    }


    return tickets;

}


async function getSupportTicket(
    ticketId
) {

    if (!ticketId) {
        return null;
    }


    const result =
        await database.query(
            `
            SELECT
                id,
                email,
                subject,
                message,
                status,
                created_at,
                last_replied_at
            FROM support_tickets
            WHERE id = $1
            LIMIT 1
            `,
            [
                ticketId
            ]
        );


    if (
        result.rows.length === 0
    ) {
        return null;
    }


    const row =
        result.rows[0];


    const replies =
        await database.query(
            `
            SELECT
                id,
                ticket_id,
                message,
                sender,
                created_at
            FROM support_replies
            WHERE ticket_id = $1
            ORDER BY created_at ASC
            `,
            [
                ticketId
            ]
        );


    return formatTicket(
        row,
        replies.rows.map(
            formatReply
        )
    );

}


async function addReply(
    ticketId,
    message
) {

    if (
        !ticketId ||
        typeof message !== "string"
    ) {
        return null;
    }


    const cleanMessage =
        message.trim();


    if (!cleanMessage) {
        return null;
    }


    const ticketCheck =
        await database.query(
            `
            SELECT id
            FROM support_tickets
            WHERE id = $1
            LIMIT 1
            `,
            [
                ticketId
            ]
        );


    if (
        ticketCheck.rows.length === 0
    ) {
        return null;
    }


    const reply = {

        id:
            "R-" +
            crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase(),

        message:
            cleanMessage,

        sender:
            "admin",

        createdAt:
            new Date().toISOString()

    };


    await database.transaction(
        async (client) => {

            await client.query(
                `
                INSERT INTO support_replies (
                    id,
                    ticket_id,
                    message,
                    sender,
                    created_at
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5
                )
                `,
                [
                    reply.id,
                    ticketId,
                    reply.message,
                    reply.sender,
                    reply.createdAt
                ]
            );


            await client.query(
                `
                UPDATE support_tickets
                SET
                    status = 'replied',
                    last_replied_at = $2
                WHERE id = $1
                `,
                [
                    ticketId,
                    reply.createdAt
                ]
            );

        }
    );


    return reply;

}


module.exports = {

    createSupportTicket,

    getAllSupportTickets,

    getSupportTicket,

    addReply

};
